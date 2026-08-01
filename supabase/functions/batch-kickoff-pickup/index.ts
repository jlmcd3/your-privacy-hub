// batch-kickoff-pickup — pg_cron picker for quality_batch_runs stuck in phase='kickoff'.
//
// Why this exists: courier sandboxes hold no SR key (ENA-1 lesson), so admin-JWT
// callers can insert a quality_batch_runs row (status='running' phase='kickoff')
// but cannot reliably fire the internal orchestrator kick. This cron watches for
// such rows and kicks quality-batch-orchestrator server-side via invoke-gated
// (SDK functions.invoke drops the SR Authorization header — INC-1/2/3 root cause).
//
// Guards (PDFEXPORT-1 Task 1):
//   (a) SINGLE-FLIGHT: skip if ANY other quality_batch_runs row is status='running'
//       AND phase != 'kickoff' (a live batch is already advancing).
//   (b) At most ONE kickoff row per invocation (oldest first).
//   (c) Kick orchestrator with x-internal-resume + SR bearer via invokeGated.
//   (d) STALE REAP: kickoff rows older than 30 minutes are marked
//       status='failed', phase='done' with a diagnostic note.
//   (e) EVERY invocation writes a function_runs row (metadata.event='kickoff_pickup')
//       including no-ops.
//
// Idempotency: verified against quality-batch-orchestrator/index.ts L260-266
// (case "advance_phase_running_tool"): the orchestrator updates phase→'running_tool'
// BEFORE it self-chains, so a successful kick moves the row out of the picker's
// filter on the very next invocation. A row still at phase='kickoff' two cron
// ticks later means either (i) the previous kick failed to reach the orchestrator
// or (ii) the orchestrator crashed before its first update — both cases are
// handled: at 2min the picker retries; at 30min the reaper closes it out.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { invokeGated } from "../_shared/invoke-gated.ts";
import { exportBatchPdfs, makeLiveDeps } from "../_shared/qa-pdf-export.ts";
import {
  assertStateMachineConformance,
  verifyStateMachine,
} from "./_local/harness/state-machine.ts";
import { assertLtpModeForTools } from "../_shared/ltp/mode-assert.ts";

export const BUILD_STAMP = "qbp28-corrections-bundle-mode-assert@2026-07-27T06:10:00Z";

// PROCESS-RETRO-WRITEBACK (2026-07-27, ledger item 165):
// Fail-loud state-machine conformance at boot. If a future edit removes a
// state's owner or cancel path, the module raises at import time and the
// deploy fails — no "silent unserved state" regression possible. Spec:
// docs/design/HARNESS-STATE-MACHINE.md §8; laws: LEGAL-TEST-PIPELINE.md §17/§18.
{
  const _report = verifyStateMachine();
  console.log(
    `[batch-kickoff-pickup] state-machine conformance: ok=${_report.ok} ` +
    `legal=${_report.summary.legal_states} owned=${_report.summary.owned_states} ` +
    `unowned=${_report.summary.unowned_non_terminal.length} missing_cancel=${_report.summary.missing_cancel_paths.length}`,
  );
  assertStateMachineConformance();
}

// LTP §18 — Launch-state equivalence law.
// Two canonical pre-execution states are treated identically by the picker:
//   (A) status='running',  phase='kickoff'   — the "born-served" canonical form
//   (B) status='queued',   phase='starting'  — the controller/query_database
//                                              external-insert form
// Either shape is valid and MUST be picked up equivalently. The prior stall
// (Wave-C batch 2a3c07a2, zombie 9c1e3a8f) was caused by inserts landing in
// shape (B) while the picker only served shape (A). Cancel handling already
// covers every non-terminal phase via §17.
export const KICKOFF_ELIGIBLE: Array<{ status: string; phase: string }> = [
  { status: "running", phase: "kickoff" },
  { status: "queued", phase: "starting" },
];
export function isKickoffEligible(status: string, phase: string): boolean {
  return KICKOFF_ELIGIBLE.some((s) => s.status === status && s.phase === phase);
}
export const BRIEF_CHAIN_TIMEOUT_MS = 10 * 60_000; // 10 min: brief_chain rows past this → generate_timeout
export const EXPORT_RETRY_WINDOW_MS = 72 * 60 * 60_000; // 72h
export const EXPORT_RETRY_MAX_ATTEMPTS = 3;
// TRANSLATE-2 — sweep as resumer, not just reaper.
export const TRANSLATION_STALL_MS = 4 * 60_000;              // no progress in 4 min → re-kick
export const TRANSLATION_MAX_CONSECUTIVE_STALL_KICKS = 3;    // only consecutive no-progress re-kicks count
export const TRANSLATION_HARD_FAIL_MS = 45 * 60_000;         // absolute wall-clock ceiling
// Total-resume ceiling scales with document size — a 49-chunk doc legitimately
// needs many slices. Formula: max(20, ceil(chunks_total * 1.5)).
export function translationTotalResumeCeiling(chunksTotal: number | null | undefined): number {
  const n = Math.max(0, Number(chunksTotal ?? 0));
  return Math.max(20, Math.ceil(n * 1.5));
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export const PICKUP_STALE_MS = 2 * 60_000;   // 2 min: heartbeat older than this → eligible
export const REAP_STALE_MS   = 30 * 60_000;  // 30 min: never picked up → mark failed

export type KickoffRow = {
  id: string;
  status: string;
  phase: string;
  last_heartbeat_at: string | null;
  started_at: string | null;
  cancel_requested?: boolean | null;
};

export type PickupDecision =
  | { kind: "single_flight_skip"; live_run_id: string }
  | { kind: "cancel_finalize"; run_id: string; phase: string; status: string }
  | { kind: "reap"; run_id: string; age_ms: number }
  | { kind: "kick"; run_id: string; age_ms: number }
  | { kind: "noop"; reason: string };

// Terminal statuses — cancel_requested on a terminal row is a no-op.
const TERMINAL_STATUSES = new Set(["complete", "failed", "cancelled"]);

/**
 * Pure decision function — chosen so unit tests can exercise the guard matrix
 * without a database. Rules (in priority order):
 *   - CANCEL-ANY-PRE-EXECUTION (LTP §17): any non-terminal row with
 *     cancel_requested=true whose phase has NOT reached 'running_tool' is
 *     finalized to cancelled/done on sight. Cancel requests are honored in
 *     EVERY pre-execution state (queued/starting, running/kickoff, etc.),
 *     not only mid-loop. Zombies (rows that never enter the orchestrator
 *     loop) would otherwise never observe their cancel flag.
 *   - If any row is running with phase != 'kickoff' → single_flight_skip
 *     (never kick when a live batch is already advancing).
 *   - Else pick the oldest running+kickoff row whose heartbeat is stale > 2min.
 *     - If age > 30min → reap
 *     - Else → kick
 *   - Otherwise noop.
 */
export function decidePickup(rows: KickoffRow[], nowMs: number): PickupDecision {
  // Highest priority: honor cancel_requested on any pre-execution row.
  const zombieCancel = rows.find((r) =>
    r.cancel_requested === true &&
    !TERMINAL_STATUSES.has(r.status) &&
    r.phase !== "running_tool"
  );
  if (zombieCancel) {
    return {
      kind: "cancel_finalize",
      run_id: zombieCancel.id,
      phase: zombieCancel.phase,
      status: zombieCancel.status,
    };
  }

  // §18 launch-state equivalence: 'live' = anything running with an advanced
  // phase (i.e. past kickoff). queued/starting is NOT live — it is pre-execution.
  const live = rows.find((r) =>
    r.status === "running" &&
    r.phase !== "kickoff" &&
    r.phase !== "starting"
  );
  if (live) return { kind: "single_flight_skip", live_run_id: live.id };

  const kickoffs = rows
    .filter((r) => isKickoffEligible(r.status, r.phase))
    .map((r) => {
      const t = r.last_heartbeat_at
        ? new Date(r.last_heartbeat_at).getTime()
        : (r.started_at ? new Date(r.started_at).getTime() : 0);
      return { row: r, ageMs: t ? nowMs - t : Number.POSITIVE_INFINITY };
    })
    .filter((x) => x.ageMs >= PICKUP_STALE_MS)
    .sort((a, b) => b.ageMs - a.ageMs); // oldest first

  if (kickoffs.length === 0) return { kind: "noop", reason: "no eligible kickoff rows" };
  const oldest = kickoffs[0];
  if (oldest.ageMs >= REAP_STALE_MS) {
    return { kind: "reap", run_id: oldest.row.id, age_ms: oldest.ageMs };
  }
  return { kind: "kick", run_id: oldest.row.id, age_ms: oldest.ageMs };
}

async function logRun(metadata: Record<string, unknown>, status: "success" | "error" = "success") {
  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const now = new Date().toISOString();
    await admin.from("function_runs").insert({
      function_name: "batch-kickoff-pickup",
      status,
      started_at: now,
      finished_at: now,
      duration_ms: 0,
      metadata: { event: "kickoff_pickup", ...metadata },
    });
  } catch (e) {
    console.error("[batch-kickoff-pickup] function_runs insert failed", (e as Error).message);
  }
}

// FF-1 T2 — EXPORT RETRY SWEEP.
// After each kickoff tick, look for ONE quality_batch_runs row completed within
// the last 72h whose docs have zero qa_pdf_exports rows and have not exceeded
// EXPORT_RETRY_MAX_ATTEMPTS (tracked via quality_batch_log 'pdf_export_retry'
// entries). Runs exportBatchPdfs for that single batch. Bounded to ONE batch
// per tick. Never blocks kickoff. Never throws.
export type ExportSweepDecision =
  | { kind: "noop"; reason: string }
  | { kind: "give_up"; run_id: string; attempts: number }
  | { kind: "attempt"; run_id: string; attempts_before: number };

async function runExportRetrySweep(admin: any): Promise<ExportSweepDecision> {
  const cutoff = new Date(Date.now() - EXPORT_RETRY_WINDOW_MS).toISOString();
  // Fetch candidate completed batches within window (bounded small).
  const { data: batches, error: bErr } = await admin
    .from("quality_batch_runs")
    .select("id, completed_at, status, tool_results")
    .eq("status", "complete")
    .gte("completed_at", cutoff)
    .order("completed_at", { ascending: true })
    .limit(20);
  if (bErr) return { kind: "noop", reason: `query_err: ${bErr.message}` };
  const rows: any[] = Array.isArray(batches) ? batches : [];
  if (rows.length === 0) return { kind: "noop", reason: "no_recent_complete_batches" };

  for (const b of rows) {
    // FF-2 T3 — done-marker gate. Skip batches with a pdf_export_done log row
    // regardless of qa_pdf_exports row presence (cleanup DELETEs remove rows
    // and previously caused re-exports up to the 3-attempt cap).
    const { data: doneRows } = await admin
      .from("quality_batch_log").select("id, message")
      .eq("run_id", b.id).ilike("message", "pdf_export_done%").limit(1);
    if (Array.isArray(doneRows) && doneRows.length > 0) continue;

    // Fallback pre-marker guard: skip if any qa_pdf_exports row exists for
    // this batch (legacy path — write a done marker so future ticks short-
    // circuit above without re-querying qa_pdf_exports).
    //
    // FF-3-HF1 (PDF-partial guard): never write a done-marker when this
    // batch has any prior log line recording a partial export
    // (`failed=N` where N>0). A backfilled done-marker on a partial export
    // strands PAID docs (batch 3abe5259 docs 2/3 lived here) because the
    // retry sweep short-circuits above and never re-attempts them.
    const { count: exportCount } = await admin
      .from("qa_pdf_exports").select("id", { count: "exact", head: true }).eq("batch_id", b.id);
    if ((exportCount ?? 0) > 0) {
      const { data: failLogs } = await admin
        .from("quality_batch_log").select("id, message")
        .eq("run_id", b.id).ilike("message", "%failed=%");
      const hadFailure = Array.isArray(failLogs) && failLogs.some((r: any) => {
        const m = /failed=(\d+)/.exec(String(r?.message ?? ""));
        return !!m && Number(m[1]) > 0;
      });
      if (hadFailure) {
        // Partial export — allow the retry sweep below to attempt again.
        // Do NOT continue; fall through so this batch is considered for retry.
      } else {
        await admin.from("quality_batch_log").insert({
          run_id: b.id, level: "info",
          message: `pdf_export_done: ${b.id} inserted=${exportCount} (backfilled_from_row_presence)`,
        });
        continue;
      }
    }
    // Skip if this batch has no runs/docs (nothing to export).
    const results: any[] = Array.isArray(b.tool_results) ? b.tool_results : [];
    const runIds = results.map((r) => r?.quality_run_id).filter(Boolean);
    if (runIds.length === 0) continue;

    // Count prior retry attempts from quality_batch_log.
    const { data: attemptRows } = await admin
      .from("quality_batch_log").select("id, message")
      .eq("run_id", b.id).ilike("message", "pdf_export_retry%");
    const attempts = Array.isArray(attemptRows) ? attemptRows.length : 0;
    if (attempts >= EXPORT_RETRY_MAX_ATTEMPTS) {
      // Log final error once (idempotent-ish: only if no give_up marker yet).
      const alreadyGaveUp = (attemptRows ?? []).some((r: any) => (r.message ?? "").includes("give_up"));
      if (!alreadyGaveUp) {
        await admin.from("quality_batch_log").insert({
          run_id: b.id, level: "error",
          message: `pdf_export_retry: give_up after ${attempts} attempts`,
        });
      }
      return { kind: "give_up", run_id: b.id, attempts };
    }

    // Attempt one export pass for this batch.
    const deps = makeLiveDeps(admin);
    await admin.from("quality_batch_log").insert({
      run_id: b.id, level: "info",
      message: `pdf_export_retry: attempt ${attempts + 1}/${EXPORT_RETRY_MAX_ATTEMPTS}`,
    });
    try {
      const counts = await exportBatchPdfs(b.id, deps);
      await admin.from("quality_batch_log").insert({
        run_id: b.id, level: counts.failed > 0 ? "warn" : "info",
        message: `pdf_export_retry: result attempted=${counts.attempted} inserted=${counts.inserted} failed=${counts.failed}`,
      });
      // FF-2 T3 — successful export writes a done marker so subsequent ticks
      // skip regardless of qa_pdf_exports row presence.
      if (counts.inserted > 0 && counts.failed === 0) {
        await admin.from("quality_batch_log").insert({
          run_id: b.id, level: "info",
          message: `pdf_export_done: ${b.id} inserted=${counts.inserted}`,
        });
      }
    } catch (e) {
      await admin.from("quality_batch_log").insert({
        run_id: b.id, level: "error",
        message: `pdf_export_retry: threw ${(e as Error).message}`,
      });
    }
    return { kind: "attempt", run_id: b.id, attempts_before: attempts };
  }
  return { kind: "noop", reason: "no_eligible_batch" };
}

// BRIEF-MODEL-1-HF4 — BRIEF-CHAIN SWEEP.
// Complete the cron-tick pattern for the weekly brief chain. cron-generate-briefs
// fires generate-weekly-brief and leaves a function_runs row with
// status='running', metadata.event='brief_chain', target='weekly', carrying
// t0 (ISO) and generate_only. This sweep resolves those rows every tick:
//   - weekly_briefs row created_at > t0 exists → mark 'generated' (or call
//     send-weekly-brief and mark 'sent'/'send_failed' when generate_only=false).
//   - Age past BRIEF_CHAIN_TIMEOUT_MS (10 min) with no row → 'generate_timeout'.
//   - Otherwise: leave running for the next tick.
// Bounded to processing ALL currently-pending rows per tick (typically 0-1).
// Never throws; every terminal transition writes durable metadata.
export type BriefChainSweepResult = {
  processed: number;
  generated: number;
  sent: number;
  send_failed: number;
  timed_out: number;
  pending: number;
  errors: string[];
};

async function runBriefChainSweep(admin: any): Promise<BriefChainSweepResult> {
  const result: BriefChainSweepResult = {
    processed: 0, generated: 0, sent: 0, send_failed: 0, timed_out: 0, pending: 0, errors: [],
  };
  const { data: pending, error } = await admin
    .from("function_runs")
    .select("id, started_at, metadata")
    .eq("function_name", "cron-generate-briefs")
    .eq("status", "running")
    .contains("metadata", { event: "brief_chain", target: "weekly" })
    .order("started_at", { ascending: true })
    .limit(10);
  if (error) {
    result.errors.push(`query: ${error.message}`);
    return result;
  }
  const rows: any[] = Array.isArray(pending) ? pending : [];
  const nowMs = Date.now();
  const adminSecret = Deno.env.get("ADMIN_SECRET_TOKEN");
  for (const r of rows) {
    result.processed++;
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    const t0 = String(meta.t0 ?? r.started_at ?? new Date().toISOString());
    const generateOnly = meta.generate_only === true;
    const ageMs = nowMs - new Date(t0).getTime();

    // Look for a weekly_briefs row created after t0.
    const { data: briefs, error: bErr } = await admin
      .from("weekly_briefs")
      .select("id, created_at")
      .gt("created_at", t0)
      .order("created_at", { ascending: false })
      .limit(1);
    if (bErr) {
      result.errors.push(`brief_query ${r.id}: ${bErr.message}`);
      result.pending++;
      continue;
    }
    const briefRow = Array.isArray(briefs) && briefs.length > 0 ? briefs[0] : null;

    if (briefRow) {
      // Terminal: generated or sent.
      if (generateOnly) {
        await admin.from("function_runs").update({
          status: "success",
          finished_at: new Date().toISOString(),
          duration_ms: nowMs - new Date(r.started_at).getTime(),
          source_table: "weekly_briefs",
          source_row_id: briefRow.id,
          metadata: {
            ...meta,
            event: "brief_chain",
            outcome: "generated",
            target: "weekly",
            brief_id: briefRow.id,
            resolved_by: "batch-kickoff-pickup",
          },
        }).eq("id", r.id).eq("status", "running");
        result.generated++;
        continue;
      }
      // Send path — call send-weekly-brief.
      if (!adminSecret) {
        result.errors.push(`send ${r.id}: ADMIN_SECRET_TOKEN not set`);
        result.pending++;
        continue;
      }
      let sendStatus = 0;
      let sendBodyText = "";
      try {
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-weekly-brief`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminSecret}` },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(60_000),
        });
        sendStatus = resp.status;
        sendBodyText = (await resp.text()).slice(0, 300);
      } catch (e) {
        sendBodyText = `fetch_threw: ${(e as Error).message}`;
      }
      const sendOk = sendStatus === 200 || sendStatus === 202;
      await admin.from("function_runs").update({
        status: sendOk ? "success" : "error",
        finished_at: new Date().toISOString(),
        duration_ms: nowMs - new Date(r.started_at).getTime(),
        source_table: "weekly_briefs",
        source_row_id: briefRow.id,
        error_message: sendOk ? null : `send-weekly-brief HTTP ${sendStatus}`,
        metadata: {
          ...meta,
          event: "brief_chain",
          outcome: sendOk ? "sent" : "send_failed",
          target: "weekly",
          brief_id: briefRow.id,
          send_status: sendStatus,
          send_body: sendBodyText,
          resolved_by: "batch-kickoff-pickup",
        },
      }).eq("id", r.id).eq("status", "running");
      if (sendOk) result.sent++;
      else result.send_failed++;
      continue;
    }

    if (ageMs >= BRIEF_CHAIN_TIMEOUT_MS) {
      await admin.from("function_runs").update({
        status: "error",
        finished_at: new Date().toISOString(),
        duration_ms: ageMs,
        error_message: `brief_chain: weekly_briefs row did not appear within ${Math.round(ageMs / 60000)}min`,
        metadata: {
          ...meta,
          event: "brief_chain",
          outcome: "generate_timeout",
          target: "weekly",
          age_ms: ageMs,
          resolved_by: "batch-kickoff-pickup",
        },
      }).eq("id", r.id).eq("status", "running");
      result.timed_out++;
      continue;
    }
    result.pending++;
  }
  return result;
}

// ────────────────────────────────────────────────────────────────────────
// TRANSLATE-2 — Translation sweep: RESUMER, not just reaper.
//
// Decision matrix (per row in status='translating'):
//   • age since last_progress_at < TRANSLATION_STALL_MS → leave alone
//   • stalled >= TRANSLATION_STALL_MS AND resume_count < TRANSLATION_MAX_RESUMES
//         → re-kick translate-report (internal-resume) and bump resume_count
//   • stalled after re-kicks are exhausted, OR wall-clock > TRANSLATION_HARD_FAIL_MS
//         → mark failed with a diagnostic error_message
//
// Every action is logged; sweep never throws.
// ────────────────────────────────────────────────────────────────────────
export type TranslationSweepDecision =
  | { kind: "resume"; row_id: string; stall_ms: number; resume_count_before: number; progressed: boolean }
  | { kind: "fail"; row_id: string; reason: string; resume_count: number };

export type TranslationSweepResult = {
  processed: number;
  resumed: number;
  failed: number;
  skipped: number;
  decisions: TranslationSweepDecision[];
  errors: string[];
};

/** Pure decision for one row — unit-testable without a database.
 *  TRANSLATE-2-HF1: progress-aware. A re-kick where chunks_done advanced since
 *  the previous re-kick is HEALTHY and does not count toward the consecutive
 *  stall ceiling. Only consecutive no-progress kicks count.
 */
export function decideTranslationRow(
  row: {
    id: string;
    started_at: string | null;
    last_progress_at: string | null;
    resume_count: number | null;
    chunks_done: number | null;
    chunks_total: number | null;
    consecutive_stall_kicks: number | null;
    last_kick_chunks_done: number | null;
  },
  nowMs: number,
): TranslationSweepDecision | { kind: "skip"; row_id: string; reason: string } {
  const started = row.started_at ? new Date(row.started_at).getTime() : nowMs;
  const lastProgress = row.last_progress_at
    ? new Date(row.last_progress_at).getTime()
    : started;
  const stallMs = nowMs - lastProgress;
  const totalMs = nowMs - started;
  const resumeCount = row.resume_count ?? 0;
  const chunksDone = row.chunks_done ?? 0;
  const lastKickAt = row.last_kick_chunks_done ?? 0;
  const progressed = chunksDone > lastKickAt;
  const consecutiveKicks = progressed ? 0 : (row.consecutive_stall_kicks ?? 0);
  const totalCeiling = translationTotalResumeCeiling(row.chunks_total);

  if (stallMs < TRANSLATION_STALL_MS && totalMs < TRANSLATION_HARD_FAIL_MS) {
    return { kind: "skip", row_id: row.id, reason: `progressing (stall=${Math.round(stallMs/1000)}s)` };
  }
  if (totalMs >= TRANSLATION_HARD_FAIL_MS) {
    return { kind: "fail", row_id: row.id, reason: `hard_fail_ceiling ${Math.round(totalMs/60_000)}min`, resume_count: resumeCount };
  }
  if (consecutiveKicks >= TRANSLATION_MAX_CONSECUTIVE_STALL_KICKS) {
    return { kind: "fail", row_id: row.id, reason: `no_progress after ${consecutiveKicks} consecutive re-kicks (${chunksDone}/${row.chunks_total ?? "?"} chunks)`, resume_count: resumeCount };
  }
  if (resumeCount >= totalCeiling) {
    return { kind: "fail", row_id: row.id, reason: `total_resume_ceiling ${resumeCount}/${totalCeiling}`, resume_count: resumeCount };
  }
  return { kind: "resume", row_id: row.id, stall_ms: stallMs, resume_count_before: resumeCount, progressed };
}

async function finalizeOrphanRunningRows(admin: any, translationRowId: string): Promise<number> {
  // TASK 3: killed slice bodies can leave function_runs rows stuck in
  // 'running' for this translation. Finalize them to 'error' with a
  // diagnostic outcome so telemetry isn't permanently poisoned.
  const { data, error } = await admin
    .from("function_runs")
    .update({
      status: "error",
      finished_at: new Date().toISOString(),
      metadata: { event: "translate_slice", outcome: "orphaned_killed" },
    })
    .eq("function_name", "translate-report")
    .eq("source_row_id", translationRowId)
    .eq("status", "running")
    .select("id");
  if (error) return 0;
  return (data ?? []).length;
}

async function runTranslationSweep(admin: any): Promise<TranslationSweepResult> {
  const result: TranslationSweepResult = {
    processed: 0, resumed: 0, failed: 0, skipped: 0, decisions: [], errors: [],
  };
  const { data: stuck, error } = await admin
    .from("report_translations")
    .select("id, report_type, report_id, target_lang, started_at, last_progress_at, chunks_done, chunks_total, resume_count, slice_count, consecutive_stall_kicks, last_kick_chunks_done")
    .eq("status", "translating")
    .order("started_at", { ascending: true })
    .limit(25);
  if (error) { result.errors.push(`query: ${error.message}`); return result; }
  const rows: any[] = Array.isArray(stuck) ? stuck : [];
  const nowMs = Date.now();

  for (const r of rows) {
    result.processed++;
    const decision = decideTranslationRow(r, nowMs);
    if (decision.kind === "skip") { result.skipped++; continue; }
    result.decisions.push(decision);

    if (decision.kind === "fail") {
      const note = `[translation-sweep: ${decision.reason}; ${r.chunks_done ?? 0}/${r.chunks_total ?? "?"} chunks]`;
      const { error: upErr } = await admin.from("report_translations")
        .update({ status: "failed", error_message: note, last_progress_at: new Date().toISOString() })
        .eq("id", r.id).eq("status", "translating");
      if (upErr) result.errors.push(`fail_update ${r.id}: ${upErr.message}`);
      else result.failed++;
      await finalizeOrphanRunningRows(admin, r.id);
      continue;
    }

    // decision.kind === "resume" — bump counters, then fire internal-resume kick.
    const chunksDoneNow = r.chunks_done ?? 0;
    const lastKickAt = r.last_kick_chunks_done ?? 0;
    const progressed = chunksDoneNow > lastKickAt;
    const nextResumeCount = (r.resume_count ?? 0) + 1;
    const nextConsecutive = progressed ? 0 : (r.consecutive_stall_kicks ?? 0) + 1;

    const { error: bumpErr } = await admin.from("report_translations")
      .update({
        resume_count: nextResumeCount,
        consecutive_stall_kicks: nextConsecutive,
        last_kick_chunks_done: chunksDoneNow,
        last_progress_at: new Date().toISOString(),
      })
      .eq("id", r.id).eq("status", "translating");
    if (bumpErr) {
      result.errors.push(`bump ${r.id}: ${bumpErr.message}`);
      continue;
    }
    // Also finalize any orphaned 'running' function_runs from prior killed slices.
    const orphanCount = await finalizeOrphanRunningRows(admin, r.id);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/translate-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "x-internal-resume": "1",
        },
        body: JSON.stringify({ resume: true, translation_row_id: r.id }),
      });
      const text = (await resp.text().catch(() => "")).slice(0, 200);
      result.resumed++;
      await admin.from("function_runs").insert({
        function_name: "batch-kickoff-pickup",
        status: resp.ok ? "success" : "error",
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: 0,
        source_table: "report_translations",
        source_row_id: r.id,
        metadata: {
          event: "translation_sweep_resume",
          translation_row_id: r.id,
          resume_count: nextResumeCount,
          consecutive_stall_kicks: nextConsecutive,
          progressed_since_last_kick: progressed,
          chunks_done: chunksDoneNow,
          chunks_total: r.chunks_total,
          orphan_runs_finalized: orphanCount,
          stall_ms: decision.stall_ms,
          kick_status: resp.status,
          kick_body: text,
        },
      });
    } catch (e) {
      result.errors.push(`resume ${r.id}: ${(e as Error).message}`);
    }
  }
  return result;
}




Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Widen fetch so cancel_requested on non-'running' rows (e.g. status='queued'
  // zombies that never entered the orchestrator loop) is observable.
  // CORRECTIONS-BUNDLE 2026-07-27 — include `tools` so §16 measurement-validity
  // can be asserted against every LTP-managed generator BEFORE the kick.
  const { data: rows, error } = await admin
    .from("quality_batch_runs")
    .select("id, status, phase, last_heartbeat_at, started_at, cancel_requested, tools")
    .not("status", "in", "(complete,failed,cancelled)");

  if (error) {
    await logRun({ error: error.message }, "error");
    return new Response(JSON.stringify({ error: error.message, build_stamp: BUILD_STAMP }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const decision = decidePickup((rows ?? []) as KickoffRow[], Date.now());

  let kickOk: boolean | undefined;
  let kickStatus: number | undefined;

  if (decision.kind === "single_flight_skip") {
    await logRun({ decision: "single_flight_skip", live_run_id: decision.live_run_id });
  } else if (decision.kind === "noop") {
    await logRun({ decision: "noop", reason: decision.reason });
  } else if (decision.kind === "cancel_finalize") {
    const note = `[kickoff-pickup: cancel_requested honored in pre-execution phase='${decision.phase}' status='${decision.status}' (LTP §17)]`;
    await admin.from("quality_batch_runs").update({
      status: "cancelled",
      phase: "done",
      last_error: note,
      completed_at: new Date().toISOString(),
    }).eq("id", decision.run_id).eq("cancel_requested", true)
      .not("status", "in", "(complete,failed,cancelled)");
    await logRun({ decision: "cancel_finalize", run_id: decision.run_id, phase: decision.phase, status: decision.status });
  } else if (decision.kind === "reap") {
    const note = `[kickoff-pickup: never picked up within ${Math.round(decision.age_ms / 60000)}min; reaped]`;
    // §18 launch-state equivalence: reap either canonical pre-execution shape.
    await admin.from("quality_batch_runs").update({
      status: "failed",
      phase: "done",
      last_error: note,
      completed_at: new Date().toISOString(),
    }).eq("id", decision.run_id)
      .in("status", ["running", "queued"])
      .in("phase", ["kickoff", "starting"]);
    await logRun({ decision: "reap", run_id: decision.run_id, age_ms: decision.age_ms });
  } else {
    // decision.kind === "kick" — §18: normalize queued/starting → running/kickoff
    // before invoking the orchestrator, which expects the canonical shape.
    await admin.from("quality_batch_runs").update({
      status: "running",
      phase: "kickoff",
    }).eq("id", decision.run_id)
      .in("status", ["running", "queued"])
      .in("phase", ["kickoff", "starting"]);

    // §16 MEASUREMENT-VALIDITY (fail-loud pre-kick).
    // Look up the row's declared tools; assert every LTP-managed tool reports
    // the fleet-expected mode. On mismatch, mark the batch failed with the
    // check payload recorded to `last_error`. NEVER kick a mismatched generator.
    const rowForKick = (rows ?? []).find((r) => r.id === decision.run_id) as { tools?: string[] } | undefined;
    const toolsForKick: string[] = Array.isArray(rowForKick?.tools) ? rowForKick!.tools : [];
    const modeCheck = await assertLtpModeForTools(toolsForKick);
    if (!modeCheck.ok) {
      const note = `[kickoff-pickup: §16 mode-assert abort tool=${modeCheck.aborted_tool} checks=${JSON.stringify(modeCheck.checks)}]`;
      await admin.from("quality_batch_runs").update({
        status: "failed",
        phase: "done",
        last_error: note,
        completed_at: new Date().toISOString(),
      }).eq("id", decision.run_id).not("status", "in", "(complete,failed,cancelled)");
      await logRun({
        decision: "mode_assert_abort", run_id: decision.run_id,
        tools: toolsForKick, mode_check: modeCheck,
      }, "error");
      return new Response(JSON.stringify({
        decision, aborted: "ltp_mode_mismatch",
        law: "LEGAL-TEST-PIPELINE.md §16 measurement-validity",
        mode_check: modeCheck, build_stamp: BUILD_STAMP,
      }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const result = await invokeGated("quality-batch-orchestrator", { run_id: decision.run_id }, { timeoutMs: 15_000 });
    const kickRes = await fetch(`${SUPABASE_URL}/functions/v1/quality-batch-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ run_id: decision.run_id }),
    }).catch((e) => ({ ok: false, status: 0, text: async () => (e as Error).message } as any));

    kickOk = (kickRes as Response).ok === true;
    kickStatus = (kickRes as Response).status ?? 0;
    await logRun({
      decision: "kick",
      run_id: decision.run_id,
      age_ms: decision.age_ms,
      kick_ok: kickOk,
      kick_status: kickStatus,
      invoke_gated_probe: { ok: result.ok, status: result.status },
      mode_check: modeCheck,
    }, kickOk ? "success" : "error");
  }

  // FF-1 T2 — always attempt one export-retry sweep per tick. Never throws.
  let sweep: ExportSweepDecision;
  try {
    sweep = await runExportRetrySweep(admin);
  } catch (e) {
    sweep = { kind: "noop", reason: `threw:${(e as Error).message}` };
  }
  await logRun({ event: "export_retry_sweep", sweep });

  // BRIEF-MODEL-1-HF4 — brief_chain sweep. Never throws.
  let briefSweep: BriefChainSweepResult;
  try {
    briefSweep = await runBriefChainSweep(admin);
  } catch (e) {
    briefSweep = { processed: 0, generated: 0, sent: 0, send_failed: 0, timed_out: 0, pending: 0, errors: [`threw:${(e as Error).message}`] };
  }
  await logRun({ event: "brief_chain_sweep", brief_sweep: briefSweep });

  // TRANSLATE-1 — translation sweep. Never throws.
  let translationSweep: TranslationSweepResult;
  try {
    translationSweep = await runTranslationSweep(admin);
  } catch (e) {
    translationSweep = { processed: 0, resumed: 0, failed: 0, skipped: 0, decisions: [], errors: [`threw:${(e as Error).message}`] };
  }
  await logRun({ event: "translation_sweep", translation_sweep: translationSweep });

  return new Response(JSON.stringify({ decision, kick_ok: kickOk, kick_status: kickStatus, export_sweep: sweep, brief_chain_sweep: briefSweep, translation_sweep: translationSweep, build_stamp: BUILD_STAMP }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
