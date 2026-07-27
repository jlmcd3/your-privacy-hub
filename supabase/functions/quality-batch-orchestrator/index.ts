// quality-batch-orchestrator — server-side multi-tool run-quality-batch driver.
//
// QB-P7: parallel tool WAVES.
// Prior architecture ran tools strictly one-at-a-time (concurrency = 1). QB-P7
// keeps every wedge-guard, resume, and self-chain invariant but launches each
// wave of tools concurrently — up to `concurrency` children (default 3, max 5),
// each dispatched with a 10-second stagger. The next wave begins only when
// every child in the current wave has reached a terminal status (or been
// advanced past a wedge). concurrency=1 preserves the pre-QB-P7 sequential
// behavior byte-for-byte.
//
// Architecture is a deliberate copy of ql2-orchestrator: return 202 immediately,
// do ONE bounded unit of work per invocation, persist progress in
// quality_batch_runs, self-chain via EdgeRuntime.waitUntil + fetch back with
// x-internal-resume: 1 and the service-role bearer.
//
// Child dispatch: we do NOT call run-quality-batch's normal start path (that path
// requires an admin USER JWT — auth.getClaims + has_role check at
// run-quality-batch/index.ts ~L2255–2267, and the service-role key has no
// `sub`). Instead we pre-seed a `quality_runs` row exactly the way
// run-quality-batch's own start-path insert does (~L2544–2553), then POST
// { resume_run_id } with `x-internal-resume: 1` + service-role bearer to the
// internal-resume acceptance path (~L2218–2225) which fires `runBatch(resumeId)`
// with no JWT. run-quality-batch itself is not modified.
//
// Active children are tracked as in-flight sentinels inside tool_results
// (final_status: "in_flight"). Terminations rewrite the sentinel in place with
// the completed result. This avoids a second schema addition; the only new
// column is `concurrency` (QB-P7 migration).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { exportBatchPdfs, makeLiveDeps, writeExportDoneMarker } from "../_shared/qa-pdf-export.ts";
import { GRADER_CONTEXT_VERSION } from "../_shared/grader/context.ts";
import { goldenIntakes, GOLDEN_BY_TOOL } from "../_shared/golden/registry.ts";
import {
  createContract as _dcCreate,
  heartbeatContract as _dcHb,
  terminateContract as _dcTerm,
} from "../_shared/delivery-contract.ts";
import {
  dcCreateBatchContract, dcHeartbeatBatchContract, dcTerminateBatchContract,
  type ContractDeps,
} from "./_contract_hooks.ts";
import { assertLtpModeForTools } from "../_shared/ltp/mode-assert.ts";


export const BUILD_STAMP = "qbo-corrections-bundle-mode-assert@2026-07-27T06:10:00Z";

// DS-T2b live deps: fail-open subject-keyed thin wrappers over delivery-contract.
// Any DB failure here is swallowed by the hooks in _contract_hooks.ts.
const CONTRACT_DEPS: ContractDeps = {
  create: (input) => _dcCreate({
    runClass: input.runClass, tool: input.tool,
    subjectTable: input.subjectTable, subjectId: input.subjectId,
    userId: input.userId ?? null, checkpointRef: input.checkpointRef,
  }),
  heartbeatBySubject: async (subjectTable, subjectId) => {
    const db = admin();
    const { data, error } = await db.from("delivery_contracts")
      .select("id").eq("subject_table", subjectTable)
      .eq("subject_id", subjectId).is("terminal_state", null).maybeSingle();
    if (error) {
      console.log(JSON.stringify({
        evt: "dc_heartbeat_lookup_failed",
        subject_table: subjectTable, subject_id: subjectId, err: error.message,
      }));
      return;
    }
    if (!data?.id) {
      console.log(JSON.stringify({
        evt: "dc_heartbeat_no_live_contract",
        subject_table: subjectTable, subject_id: subjectId,
      }));
      return;
    }
    try {
      await _dcHb({ contractId: data.id });
    } catch (e) {
      console.log(JSON.stringify({
        evt: "dc_heartbeat_write_failed",
        contract_id: data.id, subject_id: subjectId, err: (e as Error).message,
      }));
    }
  },
  terminateBySubject: async (subjectTable, subjectId, terminalState, lastError) => {
    const db = admin();
    const { data } = await db.from("delivery_contracts")
      .select("id").eq("subject_table", subjectTable)
      .eq("subject_id", subjectId).is("terminal_state", null).maybeSingle();
    if (data?.id) await _dcTerm({ contractId: data.id, terminalState, lastError });
  },
};

// QB-P9 — Campaign mode constants.
// QB-P17 item 7 — cost basis corrected to the Claude grader model actually
// in production: claude-opus-4-6. Historical estimates used Sonnet pricing
// (~$0.10/doc) and materially UNDERCOUNT actual burn (~5×). Per doc:
//   generator ≈ 4k input / 3k output; Claude grader ≈ 5k input / 2k output.
//   Total Claude tokens per doc ≈ 9k input + 5k output.
//   Opus pricing (2026): $15 / 1M input, $75 / 1M output.
//     9k × $15/M + 5k × $75/M = $0.135 + $0.375 = $0.51 per doc.
// GPT-4o grader is OpenAI-priced (not Anthropic) — excluded from budget cap.
export const CAMPAIGN_EST_CENTS_PER_DOC = 51;
export const CAMPAIGN_TOKEN_BASIS = "estimate:claude-opus-4-6@9k_in+5k_out_per_doc@$15/M_in+$75/M_out";
export const CAMPAIGN_BUDGET_CAP_CENTS_DEFAULT = 60000; // $600
export const CAMPAIGN_CERTIFIED_STREAK = 2;
export const CAMPAIGN_MAX_RUNS = 10;

// QB-P17 item 3 — GPT disagreement gates certification.
// A completed run is INELIGIBLE for the consecutive_ge98 streak when
// |claude_overall − gpt_overall| > GPT_DISAGREEMENT_MAX or any GPT-only
// finding with severity ∈ {high, critical} exists. The run still counts
// against runs_completed (real work occurred; costs incurred).
export const GPT_DISAGREEMENT_MAX = 10;

export type CampaignToolState = {
  batch_size: number;
  max_runs: number;
  runs_completed: number;
  consecutive_ge98: number;
  active: boolean;
  retired_reason: null | "certified" | "max_runs";
};


const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const ADMIN_SECRET_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Exact slug set accepted by run-quality-batch's normal-path dispatcher.
// Keep in sync with apply-quality-fix.TOOL_FILE_PATH and run-quality-batch
// tool switch. Order here is purely alphabetical for readability; the caller
// supplies the ordered queue.
export const RUN_QUALITY_BATCH_SLUGS = new Set<string>([
  "cppa-admt", "cppa-risk", "cppa-cyber",
  "governance", "dpia", "lia",
  "dpa-generator", "ir-playbook", "biometric-checker",
  // QB-P10 — registration slug added so campaign_tick can dispatch it.
  // run-quality-batch already lists "registration" in POLL_TOOLS and provides
  // an intake description; no other special-casing.
  "registration",
]);

// Terminal statuses written by run-quality-batch's runBatch. Extracted verbatim
// from supabase/functions/run-quality-batch/index.ts:
//   L1541  status="error"     — intake generation reject / fatal early
//   L1578  status="error"     — intake generation exception
//   L1615  status="cancelled" — cancel_requested honored
//   L1941  status="error"     — "No documents completed"
//   L2153  status="complete"  — success terminal
//   L2200  status="error"     — outer catch
// Nothing else transitions the run into a terminal state.
export const RUN_QUALITY_BATCH_TERMINAL = new Set<string>([
  "complete", "error", "cancelled",
]);

// Child-run stall threshold. run-quality-batch heartbeats every ~10s while
// alive (index.ts L1454), so > 6 minutes with no update means the child is
// wedged — advance the batch instead of hanging the whole queue.
export const CHILD_STALL_MS = 6 * 60_000;

// QB-P7 wave sizing bounds.
export const DEFAULT_CONCURRENCY = 3;
export const MAX_CONCURRENCY = 5;
// Intra-wave stagger between successive child dispatches, per QB-P7.
export const WAVE_STAGGER_MS = 10_000;

// QB-P14 item 5 — pure helper for wave dispatch to select the batch size for
// a given tool. Prefers the campaign's per-tool tool_state.batch_size and
// falls back to the batch-level batch_size (which for campaign waves is the
// MAX-over-eligible-tools value stored on quality_batch_runs). Exported for
// unit tests.
export function resolveToolBatchSize(
  tool: string,
  toolState: Record<string, { batch_size?: number } | undefined> | null | undefined,
  batchLevel: number | null | undefined,
): number {
  const perTool = Number(toolState?.[tool]?.batch_size ?? NaN);
  if (Number.isFinite(perTool) && perTool > 0) return Math.max(1, Math.floor(perTool));
  const fb = Number(batchLevel ?? NaN);
  if (Number.isFinite(fb) && fb > 0) return Math.max(1, Math.floor(fb));
  return 3;
}


export function clampConcurrency(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_CONCURRENCY;
  return Math.min(MAX_CONCURRENCY, n);
}

async function log(runId: string, message: string, opts: { level?: string; tool?: string } = {}) {
  try {
    await admin().from("quality_batch_log").insert({
      run_id: runId, message, level: opts.level ?? "info", tool: opts.tool ?? null,
    });
  } catch (e) {
    console.error("[qb-orchestrator] log insert failed", (e as Error).message);
  }
}

async function heartbeat(runId: string) {
  await admin().from("quality_batch_runs")
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq("id", runId);
  // DS-T2b: piggyback contract heartbeat (fail-open, no new cadence).
  await dcHeartbeatBatchContract(CONTRACT_DEPS, runId);
}

function selfInvoke(runId: string) {
  return fetch(`${SUPABASE_URL}/functions/v1/quality-batch-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ run_id: runId }),
  }).catch((e) => console.error("[qb-orchestrator] self-invoke failed", e));
}

// Pure phase transition: given a loaded row, decide the next action.
// Extracted so unit tests can exercise the decision matrix without a DB.
export type BatchRow = {
  status: string;
  phase: string;
  cancel_requested: boolean;
  tools: string[];
  current_tool_index: number;
  current_quality_run_id: string | null;
  tool_results: unknown[];
  concurrency?: number | null;
};
export type ChildSnapshot = {
  status: string | null;
  last_heartbeat_at: string | null;
  score_overall: number | null;
  gpt_score_overall: number | null;
  error: string | null;
  run_number: number | null;
};

export type InFlightEntry = {
  tool: string;
  quality_run_id: string;
  final_status: "in_flight";
  run_number?: number | null;
  dispatched_at?: string;
};

export type Termination = {
  runId: string;
  tool: string;
  snapshot: ChildSnapshot;
  stalled: boolean;
};

export type Decision =
  | { kind: "noop" }
  | { kind: "cancel_terminal" }
  | { kind: "advance_phase_running_tool" }
  | { kind: "dispatch_wave"; tools: string[]; startIndex: number }
  | { kind: "process_terminations"; terminations: Termination[] }
  | { kind: "wait" }
  | { kind: "finalize" };

export function inFlightEntries(row: BatchRow): InFlightEntry[] {
  return (row.tool_results as any[])
    .filter((e) => e && e.final_status === "in_flight" && typeof e.quality_run_id === "string")
    .map((e) => e as InFlightEntry);
}

export function decide(
  row: BatchRow,
  snapshots: Map<string, ChildSnapshot>,
  now: number,
): Decision {
  if (row.status !== "running") return { kind: "noop" };
  if (row.cancel_requested) return { kind: "cancel_terminal" };
  if (row.phase === "kickoff") return { kind: "advance_phase_running_tool" };
  if (row.phase !== "running_tool") return { kind: "noop" };

  const active = inFlightEntries(row);
  const terminations: Termination[] = [];
  let liveCount = 0;
  for (const e of active) {
    const snap = snapshots.get(e.quality_run_id);
    if (!snap) { liveCount++; continue; }
    if (snap.status && RUN_QUALITY_BATCH_TERMINAL.has(snap.status)) {
      terminations.push({ runId: e.quality_run_id, tool: e.tool, snapshot: snap, stalled: false });
      continue;
    }
    const hbMs = snap.last_heartbeat_at ? new Date(snap.last_heartbeat_at).getTime() : 0;
    if (hbMs && now - hbMs > CHILD_STALL_MS) {
      terminations.push({ runId: e.quality_run_id, tool: e.tool, snapshot: snap, stalled: true });
      continue;
    }
    liveCount++;
  }
  if (terminations.length) return { kind: "process_terminations", terminations };

  if (liveCount === 0) {
    if (row.current_tool_index >= row.tools.length) return { kind: "finalize" };
    const conc = clampConcurrency(row.concurrency ?? 1);
    const remaining = row.tools.length - row.current_tool_index;
    const size = Math.min(conc, remaining);
    const nextTools = row.tools.slice(row.current_tool_index, row.current_tool_index + size);
    return { kind: "dispatch_wave", tools: nextTools, startIndex: row.current_tool_index };
  }

  return { kind: "wait" };
}

// QB-P9 — pure stop-rule reducer. Given the current tool_state and the
// score of a just-completed campaign child run, return the updated state.
// QB-P13 changes:
//   (a) When claudeOverall is null (errored/stalled — no grading occurred),
//       DO NOT increment runs_completed. Failed runs must not consume the
//       tool's authorized run budget. Streak still resets.
//   (b) Honor per-tool tool_state.max_runs; fall back to CAMPAIGN_MAX_RUNS
//       only when the per-tool value is absent.
// - consecutive_ge98 increments when claude overall >= 98, else resets to 0.
// - retire with 'certified' when the streak reaches CAMPAIGN_CERTIFIED_STREAK.
// - retire with 'max_runs' when runs_completed reaches the effective cap.
// Retirement is sticky: once inactive, subsequent calls are no-ops.
export function applyStopRule(
  prev: CampaignToolState,
  claudeOverall: number | null,
  // QB-P17 item 3 — when false, the completed run is graded (runs_completed++)
  // but the consecutive_ge98 streak is FORCED to 0 (no certification credit).
  // Default true preserves prior behavior for callers that don't opt in.
  certificationEligible: boolean = true,
): CampaignToolState {
  if (!prev.active) return prev;
  const graded = typeof claudeOverall === "number";
  const runs_completed = graded ? prev.runs_completed + 1 : prev.runs_completed;
  const passed = graded && certificationEligible && (claudeOverall as number) >= 98;
  const consecutive_ge98 = passed ? prev.consecutive_ge98 + 1 : 0;
  const effectiveMax =
    typeof prev.max_runs === "number" && prev.max_runs > 0 ? prev.max_runs : CAMPAIGN_MAX_RUNS;
  if (consecutive_ge98 >= CAMPAIGN_CERTIFIED_STREAK) {
    return { ...prev, runs_completed, consecutive_ge98, active: false, retired_reason: "certified" };
  }
  if (runs_completed >= effectiveMax) {
    return { ...prev, runs_completed, consecutive_ge98, active: false, retired_reason: "max_runs" };
  }
  return { ...prev, runs_completed, consecutive_ge98 };
}

// Pure row-builder mirroring run-quality-batch/index.ts ~L2547–2552's insert
// payload — exposed so unit tests can assert the exact key set/values with no
// DB, no network. `createdBy` MUST be the admin who started the batch so the
// audit trail attributes child runs to that admin (never null).
export { buildSeedRow } from "../_shared/quality/seed-row.ts";
import { buildSeedRow } from "../_shared/quality/seed-row.ts";

async function seedAndResume(tool: string, batchSize: number, createdBy: string, campaignId: string | null = null, opts: { noPins?: boolean; pinsOverride?: unknown[] | null } = {})
  : Promise<{ ok: true; runId: string; runNumber: number } | { ok: false; err: string }> {
  const db = admin();
  // (a) Compute run_number the same way run-quality-batch does at ~L2544.
  const { count } = await db.from("quality_runs")
    .select("id", { count: "exact", head: true }).eq("tool", tool);
  const runNumber = (count ?? 0) + 1;

  // (b) Insert the pending row — same field set as run-quality-batch's own insert.
  const nowIso = new Date().toISOString();
  // QB-P20 item 2 — pin the tool's golden intakes unless explicitly opted out.
  const pins = opts.pinsOverride !== undefined
    ? opts.pinsOverride
    : (opts.noPins ? null : goldenIntakes(tool));
  const seed: Record<string, unknown> = buildSeedRow(tool, batchSize, runNumber, createdBy, nowIso, { pins });
  if (campaignId) seed.campaign_id = campaignId; // QB-P9 linkage
  const { data: run, error: iErr } = await db.from("quality_runs")
    .insert(seed).select("id").single();
  if (iErr || !run) return { ok: false, err: `seed insert: ${iErr?.message ?? "no row"}` };
  const runId = run.id as string;

  // (c) POST to run-quality-batch's internal-resume path (~L2218–2225).
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/run-quality-batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ resume_run_id: runId }),
    });
    const txt = await r.text();
    if (!r.ok) {
      // (d) Mark seeded row error so no orphan pending row is left behind.
      const detail = `HTTP ${r.status}: ${txt.slice(0, 200)}`;
      await db.from("quality_runs").update({
        status: "error",
        error: `orchestrator resume dispatch failed: ${detail}`.slice(0, 500),
      }).eq("id", runId);
      return { ok: false, err: detail };
    }
    return { ok: true, runId, runNumber };
  } catch (e) {
    const detail = (e as Error).message;
    await db.from("quality_runs").update({
      status: "error",
      error: `orchestrator resume dispatch failed: ${detail}`.slice(0, 500),
    }).eq("id", runId);
    return { ok: false, err: detail };
  }
}



async function markTerminalAll(runId: string, patch: Record<string, unknown>) {
  await admin().from("quality_batch_runs").update({
    ...patch,
    completed_at: new Date().toISOString(),
  }).eq("id", runId);
  // DS-T2b: terminate the paired contract (fail-open).
  const status = String((patch as any).status ?? "error") as
    "complete" | "failed" | "cancelled" | "error";
  const lastError = (patch as any).last_error as string | undefined;
  await dcTerminateBatchContract(CONTRACT_DEPS, runId, status, lastError);
}

async function runUnit(runId: string) {
  const db = admin();
  const { data: run } = await db.from("quality_batch_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) return;
  // IR-HF1 T3 — F2 EPOCH STAMP AT PICKUP.
  if (!(run as any).instrument_version) {
    await db.from("quality_batch_runs")
      .update({ instrument_version: GRADER_CONTEXT_VERSION })
      .eq("id", runId)
      .is("instrument_version", null);
    (run as any).instrument_version = GRADER_CONTEXT_VERSION;
  }
  await heartbeat(runId);

  const row = run as any as BatchRow;
  const active = inFlightEntries(row);

  // Fetch every in-flight child snapshot in parallel.
  const snapshots = new Map<string, ChildSnapshot>();
  if (active.length) {
    const ids = active.map((e) => e.quality_run_id);
    const { data: rows } = await db.from("quality_runs")
      .select("id, status, last_heartbeat_at, score_overall, gpt_score_overall, error, run_number")
      .in("id", ids);
    for (const c of (rows ?? [])) {
      snapshots.set((c as any).id, {
        status: (c as any).status ?? null,
        last_heartbeat_at: (c as any).last_heartbeat_at ?? null,
        score_overall: (c as any).score_overall ?? null,
        gpt_score_overall: (c as any).gpt_score_overall ?? null,
        error: (c as any).error ?? null,
        run_number: (c as any).run_number ?? null,
      });
    }
  }

  const d = decide(row, snapshots, Date.now());

  switch (d.kind) {
    case "noop": return;

    case "cancel_terminal": {
      await markTerminalAll(runId, { status: "cancelled", phase: "done" });
      await log(runId, "Batch cancelled by user");
      return;
    }

    case "advance_phase_running_tool": {
      const conc = clampConcurrency((row as any).concurrency ?? 1);
      await db.from("quality_batch_runs").update({ phase: "running_tool" }).eq("id", runId);
      await log(
        runId,
        `Batch kickoff: ${row.tools.length} tool(s), batch_size=${(run as any).batch_size}, concurrency=${conc} — [${row.tools.join(", ")}]`,
      );
      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }

    case "dispatch_wave": {
      // Wave dispatch: seed+resume each tool sequentially with WAVE_STAGGER_MS
      // spacing so run-quality-batch's own intake-generation isolates do not
      // land in the same runtime tick. `current_tool_index` is advanced per
      // dispatch, and each new in-flight sentinel is appended to tool_results.
      const results: any[] = Array.isArray(row.tool_results) ? [...(row.tool_results as any[])] : [];
      let nextIdx = row.current_tool_index;
      // QB-P14 item 5 — per-tool batch_size. Campaign waves stored a single
      // MAX-over-eligible batch_size on quality_batch_runs (see startCampaignWave).
      // Read the campaign's per-tool tool_state.batch_size and pass it through
      // to seedAndResume so each tool actually runs the count its own state
      // requested (falling back to the batch-level value when tool_state has
      // no override, e.g. non-campaign batches).
      const campaignIdForBatch = (run as any).campaign_id as string | null;
      let toolStateForBatch: Record<string, { batch_size?: number }> = {};
      if (campaignIdForBatch) {
        const { data: camp } = await db.from("quality_campaigns")
          .select("tool_state").eq("id", campaignIdForBatch).maybeSingle();
        toolStateForBatch = ((camp as any)?.tool_state ?? {}) as Record<string, { batch_size?: number }>;
      }
      const perToolSizes: Record<string, number> = {};
      for (let i = 0; i < d.tools.length; i++) {
        const tool = d.tools[i];
        if (i > 0) await new Promise((r) => setTimeout(r, WAVE_STAGGER_MS));
        await heartbeat(runId);
        const size = resolveToolBatchSize(tool, toolStateForBatch, (run as any).batch_size);
        perToolSizes[tool] = size;
        const inv = await seedAndResume(tool, size, (run as any).created_by, campaignIdForBatch);
        if (!inv.ok) {
          results.push({
            tool, quality_run_id: null, run_number: null,
            final_status: "dispatch_failed", score_overall: null,
            gpt_score_overall: null, error: inv.err, batch_size: size,
          });
          await log(runId, `Dispatch failed for ${tool} (batch_size=${size}): ${inv.err}`, { level: "error", tool });
        } else {
          results.push({
            tool,
            quality_run_id: inv.runId,
            run_number: inv.runNumber,
            final_status: "in_flight",
            score_overall: null,
            gpt_score_overall: null,
            error: null,
            dispatched_at: new Date().toISOString(),
            batch_size: size,
          } as InFlightEntry & Record<string, unknown>);
          await log(runId, `Dispatched ${tool} (batch_size=${size}) → quality_runs=${inv.runId} (run #${inv.runNumber})`, { tool });
        }
        nextIdx += 1;
        await db.from("quality_batch_runs").update({
          tool_results: results,
          current_tool_index: nextIdx,
          current_quality_run_id: inv.ok ? inv.runId : (run as any).current_quality_run_id,
        }).eq("id", runId);
      }
      // QB-P12 — if every dispatch in this wave failed, refund the wave's
      // pre-accrued estimated spend. QB-P14 item 5 — refund uses the actual
      // per-tool batch sizes we just seeded, not the batch-level MAX.
      const allFailed = results.length > 0 && results.every((r) => r?.final_status === "dispatch_failed");
      if (allFailed && campaignIdForBatch) {
        const refund = d.tools.reduce((sum, t) => sum + (perToolSizes[t] ?? 0) * CAMPAIGN_EST_CENTS_PER_DOC, 0);
        const { data: camp } = await db.from("quality_campaigns")
          .select("estimated_spend_cents").eq("id", campaignIdForBatch).maybeSingle();
        const cur = (camp as any)?.estimated_spend_cents ?? 0;
        const next = Math.max(0, cur - refund);
        await db.from("quality_campaigns")
          .update({ estimated_spend_cents: next }).eq("id", campaignIdForBatch);
        await logCampaign(campaignIdForBatch, `Wave dispatch total-failure: refunded ${refund}¢ (spend ${cur}¢ → ${next}¢)`, "warn");
      }

      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }

    case "process_terminations": {
      // Rewrite each in-flight sentinel in place with the completed result.
      const results: any[] = Array.isArray(row.tool_results) ? [...(row.tool_results as any[])] : [];
      const termByRun = new Map(d.terminations.map((t) => [t.runId, t]));
      for (let i = 0; i < results.length; i++) {
        const e = results[i];
        if (!e || e.final_status !== "in_flight") continue;
        const t = termByRun.get(e.quality_run_id);
        if (!t) continue;
        if (t.stalled) {
          results[i] = {
            tool: t.tool,
            quality_run_id: t.runId,
            run_number: t.snapshot.run_number ?? e.run_number ?? null,
            final_status: "stalled",
            score_overall: null,
            gpt_score_overall: null,
            error: `child heartbeat stale > ${CHILD_STALL_MS / 60000}min`,
          };
          await log(runId, `${t.tool} stalled — advancing`, { level: "warn", tool: t.tool });
        } else {
          results[i] = {
            tool: t.tool,
            quality_run_id: t.runId,
            run_number: t.snapshot.run_number ?? e.run_number ?? null,
            final_status: t.snapshot.status,
            score_overall: t.snapshot.score_overall,
            gpt_score_overall: t.snapshot.gpt_score_overall,
            error: t.snapshot.error,
          };
          await log(
            runId,
            `${t.tool} finished: status=${t.snapshot.status} score=${t.snapshot.score_overall ?? "—"} gpt=${t.snapshot.gpt_score_overall ?? "—"}${t.snapshot.error ? ` err=${t.snapshot.error}` : ""}`,
            { level: t.snapshot.status === "complete" ? "info" : "warn", tool: t.tool },
          );
        }
      }
      const stillActive = results.some((e) => e?.final_status === "in_flight");
      await db.from("quality_batch_runs").update({
        tool_results: results,
        current_quality_run_id: stillActive ? (run as any).current_quality_run_id : null,
      }).eq("id", runId);

      // QB-P9 — stop-rule + budget accounting for campaign-initiated waves.
      const campaignId = (run as any).campaign_id as string | null;
      if (campaignId) {
        for (const t of d.terminations) {
          await applyCampaignTermination(campaignId, t.tool, t.runId, t.snapshot.score_overall, t.snapshot.gpt_score_overall, (run as any).batch_size ?? 0);
        }
      }
      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }

    case "wait": {
      await heartbeat(runId);
      // @ts-ignore
      EdgeRuntime.waitUntil((async () => {
        await new Promise((r) => setTimeout(r, 15_000));
        await selfInvoke(runId);
      })());
      return;
    }

    case "finalize": {
      await finalizeIfDone(runId);
      return;
    }
  }
}

async function finalizeIfDone(runId: string) {
  const db = admin();
  const { data: run } = await db.from("quality_batch_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) return;
  const results: any[] = Array.isArray(run.tool_results) ? run.tool_results : [];
  const anySuccess = results.some((r) => r?.final_status === "complete");
  const status = anySuccess ? "complete" : "failed";
  await markTerminalAll(runId, { status, phase: "done" });
  await log(runId, `Batch ${status} — ${results.length} tool(s); ${results.filter((r) => r?.final_status === "complete").length} succeeded`);

  // PDFEXPORT-1 Task 2: fire-and-forget PDF auto-export.
  // @ts-ignore
  EdgeRuntime.waitUntil((async () => {
    try {
      const out = await exportBatchPdfs(runId, makeLiveDeps(db));
      await log(runId, `PDF export: attempted=${out.attempted} inserted=${out.inserted} failed=${out.failed}`);
      if (out.inserted > 0 && out.failed === 0) {
        await writeExportDoneMarker(db, runId, out.inserted);
      }
    } catch (e) {
      console.error("[qb-orchestrator] pdf export threw", (e as Error).message);
    }
  })());
}

async function startRun(userId: string, tools: string[], batchSizeRaw: number, concurrencyRaw: unknown)
  : Promise<{ ok: true; runId: string } | { ok: false; status: number; err: string }> {
  if (!Array.isArray(tools) || tools.length === 0) {
    return { ok: false, status: 400, err: "tools array required and non-empty" };
  }
  const bad = tools.filter((t) => !RUN_QUALITY_BATCH_SLUGS.has(t));
  if (bad.length) return { ok: false, status: 400, err: `unknown tool slug(s): ${bad.join(", ")}` };
  const batchSize = Math.max(1, Math.min(50, Math.floor(Number(batchSizeRaw) || 0) || 5));
  const concurrency = concurrencyRaw == null ? DEFAULT_CONCURRENCY : clampConcurrency(concurrencyRaw);

  // §16 MEASUREMENT-VALIDITY (fail-loud pre-insert).
  const modeCheck = await assertLtpModeForTools(tools);
  if (!modeCheck.ok) {
    return {
      ok: false, status: 409,
      err: `ltp_mode_mismatch: tool=${modeCheck.aborted_tool} checks=${JSON.stringify(modeCheck.checks)}`,
    };
  }

  const db = admin();
  const { data: row, error } = await db.from("quality_batch_runs").insert({
    tools, batch_size: batchSize, status: "running", phase: "kickoff",
    current_tool_index: 0, tool_results: [], created_by: userId,
    instrument_version: GRADER_CONTEXT_VERSION, // MC-S1b Task 4
    concurrency, // QB-P7
  }).select("id").single();

  if (error || !row) return { ok: false, status: 500, err: `insert failed: ${error?.message}` };
  await log(row.id, `Batch created: ${tools.length} tool(s), batch_size=${batchSize}, concurrency=${concurrency}`);
  await dcCreateBatchContract(CONTRACT_DEPS, row.id, { origin: "startRun", tools, batch_size: batchSize, concurrency });
  // @ts-ignore
  EdgeRuntime.waitUntil(selfInvoke(row.id));
  return { ok: true, runId: row.id };
}

// QB-P25 Final-B R1 — single-tool pinned-rerun BATCH parent.
// Creates a real quality_batch_runs row (tools=[tool], batch_size=pins.length,
// concurrency=1) so the rerun renders on /admin/quality-batch, exports, and
// gets PDFs like any batch. The kickoff → dispatch_wave path calls
// seedAndResume which pins goldenIntakes(tool) by default, so no extra
// pins-override plumbing is required — a single-tool batch of size==pins.length
// IS a pinned rerun. Used by both the internal (service-role) and admin-JWT
// branches; `createdBy` MUST be a real admin UUID (schema is uuid NOT NULL).
async function startPinnedRerunBatch(tool: string, createdBy: string, sentinel: string | null)
  : Promise<{ ok: true; runId: string; pins: number } | { ok: false; status: number; err: string }> {
  if (!RUN_QUALITY_BATCH_SLUGS.has(tool)) return { ok: false, status: 400, err: `unknown tool slug: ${tool}` };
  const pins = goldenIntakes(tool);
  if (!pins.length) return { ok: false, status: 400, err: `no goldens for tool ${tool}` };
  // §16 MEASUREMENT-VALIDITY (fail-loud pre-insert).
  const modeCheck = await assertLtpModeForTools([tool]);
  if (!modeCheck.ok) {
    return {
      ok: false, status: 409,
      err: `ltp_mode_mismatch: tool=${modeCheck.aborted_tool} checks=${JSON.stringify(modeCheck.checks)}`,
    };
  }
  const db = admin();
  const { data: row, error } = await db.from("quality_batch_runs").insert({
    tools: [tool], batch_size: pins.length, status: "running", phase: "kickoff",
    current_tool_index: 0, tool_results: [], created_by: createdBy,
    instrument_version: GRADER_CONTEXT_VERSION,
    concurrency: 1,
  }).select("id").single();
  if (error || !row) return { ok: false, status: 500, err: `insert failed: ${error?.message}` };
  const attribution = sentinel ? ` (attribution=${sentinel})` : "";
  await log(row.id, `Pinned rerun batch created: tool=${tool}, pins=${pins.length}${attribution}`);
  await dcCreateBatchContract(CONTRACT_DEPS, row.id, { origin: "pinnedRerun", tool, pins: pins.length, sentinel });
  // @ts-ignore
  EdgeRuntime.waitUntil(selfInvoke(row.id));
  return { ok: true, runId: row.id, pins: pins.length };
}

// Resolve an admin owner UUID for internal-branch pinned reruns where the
// caller has no JWT (schema requires created_by NOT NULL uuid). Mirrors the
// fallback in startCampaignWave.
async function resolveAdminOwner(): Promise<string | null> {
  const { data } = await admin().from("user_roles")
    .select("user_id").eq("role", "admin").limit(1).maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

// ─── QB-P9 Campaign machinery ────────────────────────────────────────────────

async function loadCampaign(): Promise<any | null> {
  const { data } = await admin().from("quality_campaigns")
    .select("*").order("created_at", { ascending: true }).limit(1).maybeSingle();
  return data;
}

async function logCampaign(campaignId: string, message: string, level = "info") {
  try {
    const db = admin();
    const { data: c } = await db.from("quality_campaigns").select("progress_log").eq("id", campaignId).maybeSingle();
    const log = Array.isArray(c?.progress_log) ? (c!.progress_log as any[]) : [];
    log.push({ t: new Date().toISOString(), level, msg: message });
    // Keep the tail bounded to prevent the row from ballooning.
    const trimmed = log.slice(-500);
    await db.from("quality_campaigns").update({ progress_log: trimmed }).eq("id", campaignId);
  } catch (e) { console.error("[campaign] log failed", (e as Error).message); }
}

// Campaign-owned wave: creates a quality_batch_runs row tagged with campaign_id
// and returns immediately. The normal wave machinery takes over from there.
async function startCampaignWave(campaign: any): Promise<{ started: boolean; reason?: string; batchId?: string; tools?: string[] }> {
  const toolState = (campaign.tool_state ?? {}) as Record<string, CampaignToolState>;
  // Only dispatch tools that are (a) still active AND (b) recognised by run-quality-batch.
  const eligible: string[] = [];
  const skipped: string[] = [];
  for (const [tool, s] of Object.entries(toolState)) {
    if (!s?.active) continue;
    if (!RUN_QUALITY_BATCH_SLUGS.has(tool)) { skipped.push(tool); continue; }
    eligible.push(tool);
  }
  if (skipped.length) {
    await logCampaign(campaign.id, `Skipping unknown slug(s) this wave: ${skipped.join(", ")}`, "warn");
  }
  if (eligible.length === 0) return { started: false, reason: "no_active_tools" };

  // Since batch_size is per-tool but quality_batch_runs stores a single
  // batch_size, campaign waves use the MAX of eligible tool batch sizes so
  // no tool is short-changed. Individual tool_state.batch_size is still the
  // authoritative record. (Deviation from courier where each tool wants its
  // own size — see report.)
  const batchSize = Math.max(...eligible.map((t) => toolState[t].batch_size ?? 3));
  const concurrency = clampConcurrency(campaign.concurrency ?? DEFAULT_CONCURRENCY);
  const db = admin();
  let createdBy = campaign.created_by as string | null;
  if (!createdBy) {
    const { data: adminRole, error: ownerErr } = await db.from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    createdBy = (adminRole as { user_id?: string } | null)?.user_id ?? null;
    if (ownerErr || !createdBy) {
      await logCampaign(campaign.id, `Wave insert failed: no admin owner available${ownerErr?.message ? ` (${ownerErr.message})` : ""}`, "error");
      return { started: false, reason: "no_admin_owner" };
    }
  }
  const { data: row, error } = await db.from("quality_batch_runs").insert({
    tools: eligible, batch_size: batchSize, status: "running", phase: "kickoff",
    current_tool_index: 0, tool_results: [], created_by: createdBy,
    instrument_version: GRADER_CONTEXT_VERSION,
    concurrency,
    campaign_id: campaign.id,
  }).select("id").single();
  if (error || !row) {
    await logCampaign(campaign.id, `Wave insert failed: ${error?.message}`, "error");
    return { started: false, reason: `insert: ${error?.message}` };
  }

  const nextWave = (campaign.wave_number ?? 0) + 1;
  // Add estimated spend for the wave (Claude only — see CAMPAIGN_TOKEN_BASIS).
  const est = eligible.length * batchSize * CAMPAIGN_EST_CENTS_PER_DOC;
  const nowSpend = (campaign.estimated_spend_cents ?? 0) + est;
  await db.from("quality_campaigns").update({
    wave_number: nextWave,
    last_wave_started_at: new Date().toISOString(),
    estimated_spend_cents: nowSpend,
  }).eq("id", campaign.id);
  await log(row.id, `Campaign wave #${nextWave}: ${eligible.length} tool(s), concurrency=${concurrency}, batch_size=${batchSize}`);
  await logCampaign(campaign.id, `Wave #${nextWave} started → batch ${row.id} · tools=[${eligible.join(", ")}] · est +${(est / 100).toFixed(2)} USD (cumulative ${(nowSpend / 100).toFixed(2)}) · basis=${CAMPAIGN_TOKEN_BASIS}`);
  await logCampaign(campaign.id, `NOTE: cost basis corrected to Opus (~$0.51/doc, ${CAMPAIGN_EST_CENTS_PER_DOC}¢/doc). Historical estimated_spend_cents rows written before QB-P17 used Sonnet pricing (~$0.10/doc) and materially undercount actual burn (~5×).`, "warn");
  await dcCreateBatchContract(CONTRACT_DEPS, row.id, {
    origin: "campaignWave", campaign_id: campaign.id, wave_number: nextWave,
    tools: eligible, batch_size: batchSize, concurrency,
  });

  // @ts-ignore
  EdgeRuntime.waitUntil(selfInvoke(row.id));
  return { started: true, batchId: row.id, tools: eligible };
}

// QB-P9 — pure decision function for campaign_tick. Kept side-effect free so
// the orchestrator tests can drive it directly.
export type CampaignRowLite = {
  id: string;
  status: "paused" | "active" | "complete" | "killed";
  budget_cap_cents: number | null;
  estimated_spend_cents: number | null;
  wave_interval_minutes: number | null;
  last_wave_started_at: string | null;
  tool_state: Record<string, CampaignToolState> | null;
};

export type CampaignTickDecision =
  | { kind: "no_campaign" }
  | { kind: "budget_paused" }
  | { kind: "status_noop"; status: string }
  | { kind: "wave_in_flight" }
  | { kind: "resurrect"; batchId: string }
  | { kind: "interval_wait" }
  | { kind: "complete" }
  | { kind: "start_wave" };

// QB-P13 — stale-inflight resurrection threshold. If the campaign's live
// batch has not updated in > 10 minutes, its self-invoke chain is dead;
// campaignTick fires runUnit(batchId) so the child-stall wedge guard runs.
export const INFLIGHT_STALE_MS = 10 * 60_000;

export function decideCampaignTick(
  campaign: CampaignRowLite | null,
  ctx: {
    hasInflight: boolean;
    nowMs: number;
    // QB-P13 — optional in-flight batch metadata for resurrection.
    inflightBatchId?: string | null;
    inflightUpdatedAtMs?: number | null;
  },
): CampaignTickDecision {
  if (!campaign) return { kind: "no_campaign" };
  const cap = campaign.budget_cap_cents ?? CAMPAIGN_BUDGET_CAP_CENTS_DEFAULT;
  if ((campaign.estimated_spend_cents ?? 0) >= cap && campaign.status === "active") {
    return { kind: "budget_paused" };
  }
  if (campaign.status !== "active") return { kind: "status_noop", status: campaign.status };
  if (ctx.hasInflight) {
    const upd = ctx.inflightUpdatedAtMs ?? null;
    const id = ctx.inflightBatchId ?? null;
    if (id && upd !== null && ctx.nowMs - upd > INFLIGHT_STALE_MS) {
      return { kind: "resurrect", batchId: id };
    }
    return { kind: "wave_in_flight" };
  }
  const intervalMs = (campaign.wave_interval_minutes ?? 360) * 60_000;
  const lastMs = campaign.last_wave_started_at ? new Date(campaign.last_wave_started_at).getTime() : 0;
  if (lastMs && ctx.nowMs - lastMs < intervalMs) return { kind: "interval_wait" };
  const anyActive = Object.values(campaign.tool_state ?? {}).some((s) => s?.active);
  if (!anyActive) return { kind: "complete" };
  return { kind: "start_wave" };
}

async function campaignTick(): Promise<{ ok: true; action: string; detail?: unknown }> {
  const campaign = await loadCampaign();
  const db = admin();

  let hasInflight = false;
  let inflightBatchId: string | null = null;
  let inflightUpdatedAtMs: number | null = null;
  if (campaign) {
    // QB-P13 — fetch updated_at + last_heartbeat_at so we can resurrect a
    // batch whose self-invoke chain died mid-flight.
    const { data: inflight } = await db.from("quality_batch_runs")
      .select("id, status, updated_at, last_heartbeat_at")
      .eq("campaign_id", campaign.id)
      .not("status", "in", "(complete,failed,cancelled)")
      .order("updated_at", { ascending: false })
      .limit(1);
    const row = (inflight ?? [])[0] as any;
    if (row) {
      hasInflight = true;
      inflightBatchId = row.id as string;
      const hbIso = row.last_heartbeat_at ?? row.updated_at ?? null;
      inflightUpdatedAtMs = hbIso ? new Date(hbIso).getTime() : null;
    }
  }

  const decision = decideCampaignTick(campaign as CampaignRowLite | null, {
    hasInflight, nowMs: Date.now(), inflightBatchId, inflightUpdatedAtMs,
  });

  switch (decision.kind) {
    case "no_campaign": return { ok: true, action: "no_campaign" };
    case "budget_paused": {
      const cap = campaign!.budget_cap_cents ?? CAMPAIGN_BUDGET_CAP_CENTS_DEFAULT;
      await db.from("quality_campaigns").update({ status: "paused" }).eq("id", campaign!.id);
      await logCampaign(campaign!.id, `Budget cap reached ($${(cap / 100).toFixed(0)}) — campaign auto-paused`, "warn");
      return { ok: true, action: "budget_paused" };
    }
    case "status_noop": return { ok: true, action: `status_${decision.status}` };
    case "wave_in_flight": return { ok: true, action: "wave_in_flight" };
    case "resurrect": {
      // QB-P13 — self-invoke chain for the campaign batch died; drive one
      // unit here so decide() runs, stale children hit CHILD_STALL_MS, and
      // the wave advances. runUnit is idempotent.
      await logCampaign(campaign!.id, `In-flight batch ${decision.batchId} stale > ${INFLIGHT_STALE_MS / 60000}min — resurrecting`, "warn");
      // @ts-ignore
      EdgeRuntime.waitUntil(runUnit(decision.batchId).catch((e) =>
        console.error("[qb-orchestrator] resurrect runUnit error", e)));
      return { ok: true, action: "resurrect", detail: { batchId: decision.batchId } };
    }
    case "interval_wait": return { ok: true, action: "interval_wait" };
    case "complete": {
      await db.from("quality_campaigns")
        .update({ status: "complete", completed_at: new Date().toISOString() })
        .eq("id", campaign!.id);
      await logCampaign(campaign!.id, "No active tools remain — campaign complete");
      return { ok: true, action: "complete" };
    }
    case "start_wave": {
      const started = await startCampaignWave(campaign!);
      return { ok: true, action: started.started ? "wave_started" : `wave_skipped:${started.reason}` };
    }
  }
}

// Called from process_terminations when the batch is campaign-owned.
// Applies stop-rule to the tool_state jsonb and appends a progress-log entry.
export async function applyCampaignTermination(
  campaignId: string,
  tool: string,
  runId: string,
  claudeOverall: number | null,
  gptOverall: number | null,
  _batchSize: number,
): Promise<void> {
  const db = admin();
  const { data: c } = await db.from("quality_campaigns").select("*").eq("id", campaignId).maybeSingle();
  if (!c) return;
  const toolState = { ...(c.tool_state ?? {}) } as Record<string, CampaignToolState>;
  const prev = toolState[tool];
  if (!prev) {
    await logCampaign(campaignId, `Termination for tool "${tool}" not in tool_state — ignored`, "warn");
    return;
  }

  // QB-P17 item 3 — GPT disagreement gates certification.
  // A run is ineligible for the streak when
  //   (a) |claude − gpt| > GPT_DISAGREEMENT_MAX, OR
  //   (b) any gpt_only finding of severity high|critical exists.
  // The digest row (written by run-quality-batch at completion — see the
  // insert in run-quality-batch/index.ts ~L2615) carries failing_checks with
  // both severity and cross_category, which is exactly what we need. This
  // read is best-effort: if the digest hasn't landed yet, we default to
  // ELIGIBLE — the historical behavior — and log the ambiguity.
  let certificationEligible = true;
  const ineligibleReasons: string[] = [];
  if (typeof claudeOverall === "number" && typeof gptOverall === "number") {
    const diff = Math.abs(claudeOverall - gptOverall);
    if (diff > GPT_DISAGREEMENT_MAX) {
      certificationEligible = false;
      ineligibleReasons.push(`|claude−gpt|=${diff.toFixed(1)}>${GPT_DISAGREEMENT_MAX}`);
    }
  }
  try {
    const { data: dig } = await db.from("quality_campaign_digests")
      .select("failing_checks").eq("run_id", runId).maybeSingle();
    const failing: any[] = Array.isArray((dig as any)?.failing_checks) ? (dig as any).failing_checks : [];
    const gptOnlyHiCrit = failing.filter((f) =>
      f && f.cross_category === "gpt_only" &&
      (f.severity === "high" || f.severity === "critical")
    );
    if (gptOnlyHiCrit.length > 0) {
      certificationEligible = false;
      ineligibleReasons.push(`gpt_only_high_critical=${gptOnlyHiCrit.length}`);
    }
  } catch (e) {
    await logCampaign(campaignId, `${tool}: digest lookup for GPT-severity gate failed (${(e as Error).message}); defaulting to eligible`, "warn");
  }

  const next = applyStopRule(prev, claudeOverall, certificationEligible);
  toolState[tool] = next;
  await db.from("quality_campaigns").update({ tool_state: toolState }).eq("id", campaignId);
  if (next.retired_reason && !prev.retired_reason) {
    await logCampaign(campaignId, `${tool} retired — reason=${next.retired_reason} (runs=${next.runs_completed}, streak=${next.consecutive_ge98})`);
  } else {
    const eligibilityNote = certificationEligible
      ? ""
      : ` · certification INELIGIBLE (${ineligibleReasons.join(", ")}) — streak reset`;
    await logCampaign(campaignId, `${tool} run recorded — claude=${claudeOverall ?? "—"} gpt=${gptOverall ?? "—"} · runs=${next.runs_completed}/${prev.max_runs} · streak=${next.consecutive_ge98}/${CAMPAIGN_CERTIFIED_STREAK}${eligibilityNote}`);
  }
}


async function handler(req: Request) {
  console.log(`[qb-orchestrator] boot ${BUILD_STAMP}`);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const isInternal = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;
  // QB-P11 — pg_cron path: header `x-internal-cron: 1` plus an internal bearer.
  // Lovable Cloud does not expose the service-role key to database cron, so the
  // persisted cron registration uses the existing ADMIN_SECRET_TOKEN vault/env
  // secret while preserving service-role bearer compatibility.
  const isCron = req.headers.get("x-internal-cron") === "1" && (
    token === SERVICE_KEY || (!!ADMIN_SECRET_TOKEN && token === ADMIN_SECRET_TOKEN)
  );

  // Internal self-chain resume
  if (isInternal && body?.run_id) {
    // @ts-ignore
    EdgeRuntime.waitUntil(runUnit(body.run_id).catch(async (e) => {
      console.error("[qb-orchestrator] unit error", e);
      try {
        await admin().from("quality_batch_log").insert({
          run_id: body.run_id, level: "error",
          message: `Unit error: ${(e as Error).message}`.slice(0, 500),
        });
        await admin().from("quality_batch_runs").update({
          status: "failed", phase: "done",
          last_error: (e as Error).message?.slice(0, 300),
          completed_at: new Date().toISOString(),
        }).eq("id", body.run_id);
        await dcTerminateBatchContract(CONTRACT_DEPS, body.run_id, "failed", (e as Error).message);
      } catch { /* */ }
    }));
    return json({ ok: true, build_stamp: BUILD_STAMP }, 202);
  }

  // QB-P9 — campaign tick (pg_cron or admin-forced).
  if ((isCron || isInternal) && body?.action === "campaign_tick") {
    // @ts-ignore
    EdgeRuntime.waitUntil(campaignTick().catch((e) => console.error("[qb-orchestrator] campaign_tick error", e)));
    return json({ ok: true, build_stamp: BUILD_STAMP, action: "campaign_tick" }, 202);
  }

  // AUTOMATION-ENABLER — internal start path for automated boundary launches.
  // Gated on the SAME ADMIN_SECRET_TOKEN vault-bearer path the campaign_tick
  // cron already uses (isCron: x-internal-cron:1 header + ADMIN_SECRET_TOKEN
  // OR service-role). This is deliberately NOT gated on `isInternal` (bare
  // service-role bearer) because the caller runs from the same automation
  // surface as the cron and must not require an admin USER JWT. Mirrors the
  // pinned_rerun internal branch shape (~L998): resolve an admin owner UUID
  // for created_by, delegate to startRun, and record an audit line.
  if (isCron && body?.action === "start") {
    const owner = await resolveAdminOwner();
    if (!owner) return json({ error: "no admin owner available for internal start" }, 500);
    const res = await startRun(owner, body?.tools, body?.batch_size, body?.concurrency);
    if (!res.ok) return json({ error: res.err, build_stamp: BUILD_STAMP }, res.status);
    try {
      await admin().from("admin_action_log").insert({
        actor_user_id: owner,
        action: "system:automated-boundary-start",
        target_table: "quality_batch_runs",
        target_id: res.runId,
        payload: {
          tools: body?.tools ?? null,
          batch_size: body?.batch_size ?? null,
          concurrency: body?.concurrency ?? null,
        },
        result: { run_id: res.runId },
        ok: true,
      });
    } catch (e) {
      console.error("[qb-orchestrator] automation-enabler audit-log insert failed:", (e as Error).message);
    }
    return json({ ok: true, action: "start", run_id: res.runId, build_stamp: BUILD_STAMP, internal: true }, 202);
  }


  // QB-P25 Final-B R1 — internal-only pinned_rerun (service-role bearer).
  // Now creates a quality_batch_runs PARENT so the rerun appears on the admin
  // page, exports, and gets PDFs. created_by is a resolved admin UUID; the
  // sentinel string is logged for audit attribution.
  if (isInternal && body?.action === "pinned_rerun" && body?.tool) {
    const owner = await resolveAdminOwner();
    if (!owner) return json({ error: "no admin owner available for internal pinned_rerun" }, 500);
    const res = await startPinnedRerunBatch(String(body.tool), owner, "system:qbp25-pinned-rerun");
    if (!res.ok) return json({ error: res.err, build_stamp: BUILD_STAMP }, res.status);
    return json({ ok: true, action: "pinned_rerun", tool: body.tool, run_id: res.runId, pins: res.pins, build_stamp: BUILD_STAMP, internal: true }, 202);
  }

  // External admin call
  if (!token) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const userId = claims.claims.sub as string;
  const { data: isAdmin } = await admin().rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) return json({ error: "Admin only" }, 403);

  if (body?.action === "start") {
    const res = await startRun(userId, body?.tools, body?.batch_size, body?.concurrency);
    if (!res.ok) return json({ error: res.err, build_stamp: BUILD_STAMP }, res.status);
    return json({ run_id: res.runId, build_stamp: BUILD_STAMP }, 202);
  }

  if (body?.action === "cancel" && body?.run_id) {
    const db = admin();
    const { data: existing } = await db.from("quality_batch_runs")
      .select("current_quality_run_id, tool_results").eq("id", body.run_id).maybeSingle();
    await db.from("quality_batch_runs").update({ cancel_requested: true }).eq("id", body.run_id);
    // Cancel every currently in-flight child, not just the legacy singleton.
    const ids = new Set<string>();
    if ((existing as any)?.current_quality_run_id) ids.add((existing as any).current_quality_run_id);
    for (const e of ((existing as any)?.tool_results ?? []) as any[]) {
      if (e?.final_status === "in_flight" && typeof e.quality_run_id === "string") ids.add(e.quality_run_id);
    }
    if (ids.size) {
      await db.from("quality_runs").update({ cancel_requested: true })
        .in("id", [...ids]);
    }
    await log(body.run_id, "Cancel requested");
    return json({ ok: true, build_stamp: BUILD_STAMP }, 202);
  }

  if (body?.action === "kick" && body?.run_id) {
    // Admin-visible refresh/recovery path for a running batch whose self-chain
    // died after children completed. runUnit is idempotent: it reloads the row,
    // records terminal children, advances the next wave, or finalizes.
    // @ts-ignore
    EdgeRuntime.waitUntil(runUnit(body.run_id).catch(async (e) => {
      console.error("[qb-orchestrator] admin kick error", e);
      try {
        await admin().from("quality_batch_log").insert({
          run_id: body.run_id, level: "error",
          message: `Admin kick error: ${(e as Error).message}`.slice(0, 500),
        });
      } catch { /* */ }
    }));
    return json({ ok: true, action: "kick", build_stamp: BUILD_STAMP }, 202);
  }

  if (body?.run_id) {
    const { data } = await admin().from("quality_batch_runs").select("*").eq("id", body.run_id).maybeSingle();
    return json({ run: data, build_stamp: BUILD_STAMP });
  }

  // QB-P9 — admin campaign controls.
  if (body?.action === "campaign_status") {
    const c = await loadCampaign();
    return json({ campaign: c, build_stamp: BUILD_STAMP });
  }
  if (body?.action === "campaign_resume" || body?.action === "campaign_pause" || body?.action === "campaign_kill") {
    const target =
      body.action === "campaign_resume" ? "active" :
      body.action === "campaign_pause"  ? "paused" : "killed";
    const c = await loadCampaign();
    if (!c) return json({ error: "no campaign row" }, 404);
    await admin().from("quality_campaigns").update({ status: target }).eq("id", c.id);
    await logCampaign(c.id, `Status changed → ${target} (by ${userId})`);
    // If resumed, fire an immediate tick so the CEO doesn't wait 15 min.
    if (target === "active") {
      // @ts-ignore
      EdgeRuntime.waitUntil(campaignTick().catch((e) => console.error("[qb-orchestrator] resume-tick error", e)));
    }
    return json({ ok: true, status: target, build_stamp: BUILD_STAMP });
  }
  if (body?.action === "campaign_tick") {
    // Admin-forced tick (bypasses cron).
    // @ts-ignore
    EdgeRuntime.waitUntil(campaignTick().catch((e) => console.error("[qb-orchestrator] admin-tick error", e)));
    return json({ ok: true, action: "campaign_tick", build_stamp: BUILD_STAMP }, 202);
  }

  // QB-P25 Final-B R1 — admin pinned_rerun. Creates a single-tool
  // quality_batch_runs PARENT (created_by = admin userId) so the rerun
  // renders on /admin/quality-batch, exports, and gets PDFs like any batch.
  // Kickoff → dispatch_wave calls seedAndResume which pins goldens by default,
  // so batch_size == pins.length IS a pinned rerun.
  if (body?.action === "pinned_rerun" && body?.tool) {
    const res = await startPinnedRerunBatch(String(body.tool), userId, null);
    if (!res.ok) return json({ error: res.err, build_stamp: BUILD_STAMP }, res.status);
    return json({ ok: true, action: "pinned_rerun", tool: body.tool, run_id: res.runId, pins: res.pins, build_stamp: BUILD_STAMP }, 202);
  }

  // QB-P20 item 8 — regrade_frozen: re-grade a stored set of existing
  // documents with both judges; append per-dimension sigma and
  // Claude-GPT correlation to the digest.
  // Manual admin-only; NO schedule. Body: { document_ids: string[] }.
  if (body?.action === "regrade_frozen") {
    const ids = Array.isArray(body?.document_ids) ? body.document_ids.map(String) : [];
    if (ids.length < 5) return json({ error: "regrade_frozen requires >=5 document_ids" }, 400);
    // MVP: enqueue via a marker row in quality_batch_log; the follow-up
    // regrade worker (deferred) picks it up. Kept explicit so nothing
    // executes silently against production data before CEO sign-off on
    // the regrader worker itself.
    await admin().from("quality_batch_log").insert({
      run_id: null, level: "info",
      message: `regrade_frozen queued by ${userId} — ${ids.length} document ids: ${ids.slice(0,10).join(",")}${ids.length>10?"…":""}`.slice(0, 500),
    }).catch(() => {});
    return json({ ok: true, action: "regrade_frozen", queued: ids.length, build_stamp: BUILD_STAMP, note: "queued — worker not yet auto-scheduled" }, 202);
  }

  return json({ error: "Unknown action" }, 400);
}
// Deno edge functions execute this file as the entrypoint, so ensure
// the server actually starts in production too — import.meta.main is
// true when the runtime treats this file as the top-level module.
Deno.serve(handler);
