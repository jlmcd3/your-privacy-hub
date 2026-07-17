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

export const BUILD_STAMP = "ff-1-kickoff-pickup+export-retry@2026-07-17";
export const EXPORT_RETRY_WINDOW_MS = 72 * 60 * 60_000; // 72h
export const EXPORT_RETRY_MAX_ATTEMPTS = 3;

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
};

export type PickupDecision =
  | { kind: "single_flight_skip"; live_run_id: string }
  | { kind: "reap"; run_id: string; age_ms: number }
  | { kind: "kick"; run_id: string; age_ms: number }
  | { kind: "noop"; reason: string };

/**
 * Pure decision function — chosen so unit tests can exercise the guard matrix
 * without a database. Rules:
 *   - If any row is running with phase != 'kickoff' → single_flight_skip
 *     (never kick when a live batch is already advancing).
 *   - Else pick the oldest running+kickoff row whose heartbeat is stale > 2min.
 *     - If age > 30min → reap
 *     - Else → kick
 *   - Otherwise noop.
 */
export function decidePickup(rows: KickoffRow[], nowMs: number): PickupDecision {
  const live = rows.find((r) => r.status === "running" && r.phase !== "kickoff");
  if (live) return { kind: "single_flight_skip", live_run_id: live.id };

  const kickoffs = rows
    .filter((r) => r.status === "running" && r.phase === "kickoff")
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
    // Skip if any qa_pdf_exports row exists for this batch.
    const { count: exportCount } = await admin
      .from("qa_pdf_exports").select("id", { count: "exact", head: true }).eq("batch_id", b.id);
    if ((exportCount ?? 0) > 0) continue;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: rows, error } = await admin
    .from("quality_batch_runs")
    .select("id, status, phase, last_heartbeat_at, started_at")
    .eq("status", "running");

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
  } else if (decision.kind === "reap") {
    const note = `[kickoff-pickup: never picked up within ${Math.round(decision.age_ms / 60000)}min; reaped]`;
    await admin.from("quality_batch_runs").update({
      status: "failed",
      phase: "done",
      last_error: note,
      completed_at: new Date().toISOString(),
    }).eq("id", decision.run_id).eq("status", "running").eq("phase", "kickoff");
    await logRun({ decision: "reap", run_id: decision.run_id, age_ms: decision.age_ms });
  } else {
    // decision.kind === "kick"
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

  return new Response(JSON.stringify({ decision, kick_ok: kickOk, kick_status: kickStatus, export_sweep: sweep, build_stamp: BUILD_STAMP }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
