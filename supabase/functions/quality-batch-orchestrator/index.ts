// quality-batch-orchestrator — server-side sequential multi-tool run-quality-batch driver.
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { exportBatchPdfs, makeLiveDeps, writeExportDoneMarker } from "../_shared/qa-pdf-export.ts";
import { GRADER_CONTEXT_VERSION } from "../_shared/grader/context.ts";


export const BUILD_STAMP = "pdfexport-1-qb-orchestrator@2026-07-17";


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
};
export type ChildSnapshot = {
  status: string | null;
  last_heartbeat_at: string | null;
  score_overall: number | null;
  gpt_score_overall: number | null;
  error: string | null;
  run_number: number | null;
};

export type Decision =
  | { kind: "noop" }
  | { kind: "cancel_terminal" }
  | { kind: "advance_phase_running_tool" }
  | { kind: "dispatch_child"; tool: string }
  | { kind: "child_terminal"; snapshot: ChildSnapshot; moreTools: boolean }
  | { kind: "child_stalled"; moreTools: boolean }
  | { kind: "child_wait" };

export function decide(row: BatchRow, child: ChildSnapshot | null, now: number): Decision {
  if (row.status !== "running") return { kind: "noop" };
  if (row.cancel_requested) return { kind: "cancel_terminal" };
  if (row.phase === "kickoff") return { kind: "advance_phase_running_tool" };
  if (row.phase !== "running_tool") return { kind: "noop" };

  if (!row.current_quality_run_id) {
    const tool = row.tools[row.current_tool_index];
    return { kind: "dispatch_child", tool };
  }

  if (!child) return { kind: "child_wait" };

  if (child.status && RUN_QUALITY_BATCH_TERMINAL.has(child.status)) {
    const moreTools = row.current_tool_index + 1 < row.tools.length;
    return { kind: "child_terminal", snapshot: child, moreTools };
  }

  const hbMs = child.last_heartbeat_at ? new Date(child.last_heartbeat_at).getTime() : 0;
  if (hbMs && now - hbMs > CHILD_STALL_MS) {
    const moreTools = row.current_tool_index + 1 < row.tools.length;
    return { kind: "child_stalled", moreTools };
  }
  return { kind: "child_wait" };
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
  await heartbeat(runId);

  // Fetch child snapshot only when there is one to fetch.
  let child: ChildSnapshot | null = null;
  if (run.current_quality_run_id) {
    const { data: c } = await db.from("quality_runs")
      .select("status, last_heartbeat_at, score_overall, gpt_score_overall, error, run_number")
      .eq("id", run.current_quality_run_id)
      .maybeSingle();
    child = c ? {
      status: (c as any).status ?? null,
      last_heartbeat_at: (c as any).last_heartbeat_at ?? null,
      score_overall: (c as any).score_overall ?? null,
      gpt_score_overall: (c as any).gpt_score_overall ?? null,
      error: (c as any).error ?? null,
      run_number: (c as any).run_number ?? null,
    } : null;
  }


  const d = decide(run as any as BatchRow, child, Date.now());

  switch (d.kind) {
    case "noop": return;

    case "cancel_terminal": {
      await markTerminalAll(runId, { status: "cancelled", phase: "done" });
      await log(runId, "Batch cancelled by user");
      return;
    }

    case "advance_phase_running_tool": {
      await db.from("quality_batch_runs").update({ phase: "running_tool" }).eq("id", runId);
      await log(runId, `Batch kickoff: ${run.tools.length} tool(s), batch_size=${run.batch_size} — [${run.tools.join(", ")}]`);
      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }

    case "dispatch_child": {
      const inv = await seedAndResume(d.tool, run.batch_size, run.created_by);
      if (!inv.ok) {
        // Record failure for this tool and advance.
        const results = Array.isArray(run.tool_results) ? [...run.tool_results] : [];
        results.push({
          tool: d.tool, quality_run_id: null, run_number: null,
          final_status: "dispatch_failed", score_overall: null,
          gpt_score_overall: null, error: inv.err,
        });
        const nextIdx = run.current_tool_index + 1;
        const done = nextIdx >= run.tools.length;
        await db.from("quality_batch_runs").update({
          tool_results: results,
          current_tool_index: nextIdx,
          current_quality_run_id: null,
          ...(done ? { phase: "done" } : {}),
        }).eq("id", runId);
        await log(runId, `Dispatch failed for ${d.tool}: ${inv.err}`, { level: "error", tool: d.tool });
        if (done) {
          await finalizeIfDone(runId);
        } else {
          // @ts-ignore
          EdgeRuntime.waitUntil(selfInvoke(runId));
        }
        return;
      }
      await db.from("quality_batch_runs").update({
        current_quality_run_id: inv.runId,
      }).eq("id", runId);
      await log(runId, `Dispatched ${d.tool} → quality_runs=${inv.runId} (run #${inv.runNumber})`, { tool: d.tool });
      // @ts-ignore
      EdgeRuntime.waitUntil(selfInvoke(runId));
      return;
    }


    case "child_terminal": {
      const tool = run.tools[run.current_tool_index];
      const results = Array.isArray(run.tool_results) ? [...run.tool_results] : [];
      results.push({
        tool,
        quality_run_id: run.current_quality_run_id,
        run_number: d.snapshot.run_number,
        final_status: d.snapshot.status,
        score_overall: d.snapshot.score_overall,
        gpt_score_overall: d.snapshot.gpt_score_overall,
        error: d.snapshot.error,
      });

      const nextIdx = run.current_tool_index + 1;
      await db.from("quality_batch_runs").update({
        tool_results: results,
        current_tool_index: nextIdx,
        current_quality_run_id: null,
      }).eq("id", runId);
      await log(runId,
        `${tool} finished: status=${d.snapshot.status} score=${d.snapshot.score_overall ?? "—"} gpt=${d.snapshot.gpt_score_overall ?? "—"}${d.snapshot.error ? ` err=${d.snapshot.error}` : ""}`,
        { level: d.snapshot.status === "complete" ? "info" : "warn", tool });
      if (d.moreTools) {
        // @ts-ignore
        EdgeRuntime.waitUntil(selfInvoke(runId));
      } else {
        await finalizeIfDone(runId);
      }
      return;
    }

    case "child_stalled": {
      const tool = run.tools[run.current_tool_index];
      const results = Array.isArray(run.tool_results) ? [...run.tool_results] : [];
      results.push({
        tool,
        quality_run_id: run.current_quality_run_id,
        run_number: child?.run_number ?? null,
        final_status: "stalled",
        score_overall: null,
        gpt_score_overall: null,
        error: `child heartbeat stale > ${CHILD_STALL_MS / 60000}min`,
      });

      const nextIdx = run.current_tool_index + 1;
      await db.from("quality_batch_runs").update({
        tool_results: results,
        current_tool_index: nextIdx,
        current_quality_run_id: null,
      }).eq("id", runId);
      await log(runId, `${tool} stalled — advancing to next tool`, { level: "warn", tool });
      if (d.moreTools) {
        // @ts-ignore
        EdgeRuntime.waitUntil(selfInvoke(runId));
      } else {
        await finalizeIfDone(runId);
      }
      return;
    }

    case "child_wait": {
      await heartbeat(runId);
      // @ts-ignore
      EdgeRuntime.waitUntil((async () => {
        await new Promise((r) => setTimeout(r, 15_000));
        await selfInvoke(runId);
      })());
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

  // PDFEXPORT-1 Task 2: fire-and-forget PDF auto-export. Per-doc failures are
  // logged into function_runs (event='pdf_export') and NEVER block completion.
  // @ts-ignore
  EdgeRuntime.waitUntil((async () => {
    try {
      const out = await exportBatchPdfs(runId, makeLiveDeps(db));
      await log(runId, `PDF export: attempted=${out.attempted} inserted=${out.inserted} failed=${out.failed}`);
      // FF-2 T3 — done marker on any successful insertion so the sweep skips
      // this batch even after ratified cleanup deletes qa_pdf_exports rows.
      if (out.inserted > 0 && out.failed === 0) {
        await writeExportDoneMarker(db, runId, out.inserted);
      }
    } catch (e) {
      console.error("[qb-orchestrator] pdf export threw", (e as Error).message);
    }
  })());
}

async function startRun(userId: string, tools: string[], batchSizeRaw: number)
  : Promise<{ ok: true; runId: string } | { ok: false; status: number; err: string }> {
  if (!Array.isArray(tools) || tools.length === 0) {
    return { ok: false, status: 400, err: "tools array required and non-empty" };
  }
  const bad = tools.filter((t) => !RUN_QUALITY_BATCH_SLUGS.has(t));
  if (bad.length) return { ok: false, status: 400, err: `unknown tool slug(s): ${bad.join(", ")}` };
  const batchSize = Math.max(1, Math.min(50, Math.floor(Number(batchSizeRaw) || 0) || 5));

  const db = admin();
  const { data: row, error } = await db.from("quality_batch_runs").insert({
    tools, batch_size: batchSize, status: "running", phase: "kickoff",
    current_tool_index: 0, tool_results: [], created_by: userId,
  }).select("id").single();
  if (error || !row) return { ok: false, status: 500, err: `insert failed: ${error?.message}` };
  await log(row.id, `Batch created: ${tools.length} tool(s), batch_size=${batchSize}`);
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
    const res = await startRun(userId, body?.tools, body?.batch_size);
    if (!res.ok) return json({ error: res.err, build_stamp: BUILD_STAMP }, res.status);
    return json({ run_id: res.runId, build_stamp: BUILD_STAMP }, 202);
  }

  if (body?.action === "cancel" && body?.run_id) {
    const db = admin();
    const { data: existing } = await db.from("quality_batch_runs")
      .select("current_quality_run_id").eq("id", body.run_id).maybeSingle();
    await db.from("quality_batch_runs").update({ cancel_requested: true }).eq("id", body.run_id);
    if ((existing as any)?.current_quality_run_id) {
      await db.from("quality_runs").update({ cancel_requested: true })
        .eq("id", (existing as any).current_quality_run_id);
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
