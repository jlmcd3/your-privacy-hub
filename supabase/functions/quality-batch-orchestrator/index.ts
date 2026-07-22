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


export const BUILD_STAMP = "qbp9-campaign@2026-07-22";

// QB-P9 — Campaign mode constants.
// Anthropic Claude Sonnet spend estimate basis (per doc, single run):
//   generator prompt ≈ 4k input / 3k output,
//   Claude grader   ≈ 5k input / 2k output,
//   GPT grader is OpenAI-priced (not Anthropic) — excluded from budget cap.
// Total Claude tokens per doc ≈ 9k input + 5k output.
// Sonnet pricing (2026-07): $3 / 1M input, $15 / 1M output.
//   → 9k × $3/M + 5k × $15/M = $0.027 + $0.075 = $0.102 per doc.
// Rounded to $0.10/doc for the budget-cap heuristic; adjust here if pricing moves.
export const CAMPAIGN_EST_CENTS_PER_DOC = 10;
export const CAMPAIGN_TOKEN_BASIS = "estimate:claude-sonnet@9k_in+5k_out_per_doc";
export const CAMPAIGN_BUDGET_CAP_CENTS_DEFAULT = 60000; // $600
export const CAMPAIGN_CERTIFIED_STREAK = 2;
export const CAMPAIGN_MAX_RUNS = 10;

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

// Pure row-builder mirroring run-quality-batch/index.ts ~L2547–2552's insert
// payload — exposed so unit tests can assert the exact key set/values with no
// DB, no network. `createdBy` MUST be the admin who started the batch so the
// audit trail attributes child runs to that admin (never null).
export function buildSeedRow(
  tool: string, batchSize: number, runNumber: number, createdBy: string, nowIso: string,
) {
  return {
    tool,
    status: "pending" as const,
    batch_size: batchSize,
    run_number: runNumber,
    created_by: createdBy,
    user_id: createdBy,
    started_at: nowIso,
    last_heartbeat_at: nowIso,
    next_doc_index: 0,
    grader_context_version: GRADER_CONTEXT_VERSION, // HOUSEKEEPING-1 T2
  };
}

async function seedAndResume(tool: string, batchSize: number, createdBy: string)
  : Promise<{ ok: true; runId: string; runNumber: number } | { ok: false; err: string }> {
  const db = admin();
  // (a) Compute run_number the same way run-quality-batch does at ~L2544.
  const { count } = await db.from("quality_runs")
    .select("id", { count: "exact", head: true }).eq("tool", tool);
  const runNumber = (count ?? 0) + 1;

  // (b) Insert the pending row — same field set as run-quality-batch's own insert.
  const nowIso = new Date().toISOString();
  const seed = buildSeedRow(tool, batchSize, runNumber, createdBy, nowIso);
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
      for (let i = 0; i < d.tools.length; i++) {
        const tool = d.tools[i];
        if (i > 0) await new Promise((r) => setTimeout(r, WAVE_STAGGER_MS));
        // Heartbeat between staggers so the wave-in-progress isn't itself
        // reaped by any batch-level watchdog.
        await heartbeat(runId);
        const inv = await seedAndResume(tool, (run as any).batch_size, (run as any).created_by);
        if (!inv.ok) {
          results.push({
            tool, quality_run_id: null, run_number: null,
            final_status: "dispatch_failed", score_overall: null,
            gpt_score_overall: null, error: inv.err,
          });
          await log(runId, `Dispatch failed for ${tool}: ${inv.err}`, { level: "error", tool });
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
          } as InFlightEntry & Record<string, unknown>);
          await log(runId, `Dispatched ${tool} → quality_runs=${inv.runId} (run #${inv.runNumber})`, { tool });
        }
        nextIdx += 1;
        // Persist incrementally so a crash mid-wave still leaves a coherent
        // picture of what has been launched.
        await db.from("quality_batch_runs").update({
          tool_results: results,
          current_tool_index: nextIdx,
          // Keep legacy column populated with the most recent in-flight id
          // (best-effort; UI can still show a "current" child for compat).
          current_quality_run_id: inv.ok ? inv.runId : (run as any).current_quality_run_id,
        }).eq("id", runId);
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

  const db = admin();
  const { data: row, error } = await db.from("quality_batch_runs").insert({
    tools, batch_size: batchSize, status: "running", phase: "kickoff",
    current_tool_index: 0, tool_results: [], created_by: userId,
    instrument_version: GRADER_CONTEXT_VERSION, // MC-S1b Task 4
    concurrency, // QB-P7
  }).select("id").single();

  if (error || !row) return { ok: false, status: 500, err: `insert failed: ${error?.message}` };
  await log(row.id, `Batch created: ${tools.length} tool(s), batch_size=${batchSize}, concurrency=${concurrency}`);
  // @ts-ignore
  EdgeRuntime.waitUntil(selfInvoke(row.id));
  return { ok: true, runId: row.id };
}

Deno.serve(async (req) => {
  console.log(`[qb-orchestrator] boot ${BUILD_STAMP}`);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const isInternal = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;

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
      } catch { /* */ }
    }));
    return json({ ok: true, build_stamp: BUILD_STAMP }, 202);
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

  if (body?.run_id) {
    const { data } = await admin().from("quality_batch_runs").select("*").eq("id", body.run_id).maybeSingle();
    return json({ run: data, build_stamp: BUILD_STAMP });
  }

  return json({ error: "Unknown action" }, 400);
});
