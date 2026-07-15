// ql3-batch-orchestrator — server-side QL3 batch driver.
//
// Same proven anti-hang pattern as quality-batch-orchestrator:
//   * batch_start returns 202 immediately with a batch_id
//   * one bounded unit per resume invocation (kickoff one QL3 run OR poll
//     the current one), then persist, self-chain via EdgeRuntime.waitUntil
//     + fetch with x-internal-resume:1 + service-role bearer.
//   * batch_cancel flips a flag consulted between docs (never mid-run).
//
// Admin-gated (has_role admin) on external actions; internal resume is
// SR-bearer + x-internal-resume:1 only. Never edits any *_assessments row
// — QL3 revisions still flow exclusively through ql3-orchestrator → the
// audited run-quality-batch/revision_dispatch path.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const BUILD_STAMP = "ql3-p1-batch@2026-07-15";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const admin = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Kept in sync with ql3-orchestrator's TOOL_TABLE keys. Presence check only.
const KNOWN_TOOL_SLUGS = new Set([
  "governance", "cppa-risk", "cppa-cyber", "cppa-admt",
  "dpia", "lia", "ir-playbook", "biometric", "dpa",
]);

const STALL_MS = 10 * 60 * 1000; // 10 minutes
const POLL_DELAY_MS = 15_000;    // ~15s self-chain while a run is in-flight

// ---- pure decision function (exported for tests) ----
export type DocRef = { doc_number: number; source_row_id: string };
export type BatchDecision =
  | { kind: "cancel" }
  | { kind: "finalize"; status: "complete" | "failed" }
  | { kind: "kickoff"; doc: DocRef; index: number }
  | { kind: "poll"; ql3_run_id: string }
  | { kind: "stalled"; ql3_run_id: string }
  | { kind: "advance"; final_phase: string; ql3_run_id: string | null };

export interface DecideInput {
  cancel_requested: boolean;
  current_index: number;
  docs: DocRef[];
  current_ql3_run_id: string | null;
  current_phase: string | null; // ql3_run.phase (revise_dummy|dispatching|review2|finalizing|done|failed|null)
  last_phase_change_ms: number; // ms since last observed change of run row
}

export function decideBatchStep(inp: DecideInput): BatchDecision {
  if (inp.cancel_requested) return { kind: "cancel" };
  if (inp.current_index >= inp.docs.length) {
    return { kind: "finalize", status: "complete" };
  }
  const doc = inp.docs[inp.current_index];
  if (!inp.current_ql3_run_id) {
    return { kind: "kickoff", doc, index: inp.current_index };
  }
  const p = inp.current_phase ?? "";
  if (p === "done" || p === "failed") {
    return { kind: "advance", final_phase: p, ql3_run_id: inp.current_ql3_run_id };
  }
  if (inp.last_phase_change_ms > STALL_MS) {
    return { kind: "stalled", ql3_run_id: inp.current_ql3_run_id };
  }
  return { kind: "poll", ql3_run_id: inp.current_ql3_run_id };
}

// ---- doc snapshot filter (pure, exported for tests) ----
export interface DocRow { doc_number: number; source_row_id: string | null; status: string }
export function snapshotDocs(rows: DocRow[], docFilter?: { doc_number?: number }): DocRef[] {
  const eligible = rows
    .filter((r) => r.status === "complete" && r.source_row_id)
    .sort((a, b) => a.doc_number - b.doc_number)
    .map((r) => ({ doc_number: r.doc_number, source_row_id: r.source_row_id as string }));
  if (docFilter?.doc_number != null) {
    return eligible.filter((r) => r.doc_number === docFilter.doc_number);
  }
  return eligible;
}

async function logBatch(
  batchId: string | null,
  runId: string | null,
  level: "info" | "warn" | "error",
  message: string,
) {
  try {
    await admin().from("quality_loop3_log").insert({
      batch_id: batchId,
      ql3_run_id: runId,
      level,
      message: message.slice(0, 2000),
    });
  } catch (e) {
    console.error("[ql3-batch] log insert failed", (e as Error).message);
  }
}

function selfInvoke(batchId: string, delayMs = 0) {
  const fire = () => fetch(`${SUPABASE_URL}/functions/v1/ql3-batch-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ action: "resume", batch_id: batchId }),
  }).catch((e) => console.error("[ql3-batch] self-invoke failed", e));
  if (delayMs > 0) return new Promise((r) => setTimeout(r, delayMs)).then(fire);
  return fire();
}

async function kickoffQL3(toolSlug: string, assessmentId: string, notes: string): Promise<string | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/ql3-orchestrator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "apikey": SERVICE_KEY,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ action: "kickoff", tool_slug: toolSlug, assessment_id: assessmentId, notes }),
    });
    if (!r.ok) {
      console.error("[ql3-batch] kickoff non-2xx", r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const j: any = await r.json().catch(() => null);
    return j?.run_id ?? null;
  } catch (e) {
    console.error("[ql3-batch] kickoff threw", (e as Error).message);
    return null;
  }
}

async function readRunPhase(runId: string): Promise<{ phase: string | null; updated_at: string | null; assessment_id: string | null; pre_score: number | null; post_score: number | null; items_before: number | null; items_after: number | null; items_resolved: number | null; pre_claude_score: number | null; pre_gpt_score: number | null; post_claude_score: number | null; post_gpt_score: number | null; qc_result: any } | null> {
  const { data } = await admin()
    .from("quality_loop3_runs")
    .select("phase, updated_at, assessment_id, pre_score, post_score, items_before, items_after, items_resolved, pre_claude_score, pre_gpt_score, post_claude_score, post_gpt_score, qc_result")
    .eq("id", runId)
    .maybeSingle();
  return (data as any) ?? null;
}

async function runOneUnit(batchId: string) {
  const db = admin();
  const { data: batch } = await db
    .from("quality_loop3_batches")
    .select("*")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) { console.error("[ql3-batch] batch not found", batchId); return; }
  const b: any = batch;
  if (b.status !== "running") return;

  await db.from("quality_loop3_batches").update({ last_heartbeat_at: new Date().toISOString() }).eq("id", batchId);

  const docs: DocRef[] = Array.isArray(b.doc_ids) ? b.doc_ids : [];

  // Observe current run state (if any).
  let currentPhase: string | null = null;
  let lastPhaseChangeMs = 0;
  let currentRunSnapshot: any = null;
  if (b.current_ql3_run_id) {
    currentRunSnapshot = await readRunPhase(b.current_ql3_run_id);
    currentPhase = currentRunSnapshot?.phase ?? null;
    const upd = currentRunSnapshot?.updated_at ? Date.parse(currentRunSnapshot.updated_at) : Date.now();
    lastPhaseChangeMs = Date.now() - upd;
  }

  const decision = decideBatchStep({
    cancel_requested: !!b.cancel_requested,
    current_index: Number(b.current_index ?? 0),
    docs,
    current_ql3_run_id: b.current_ql3_run_id ?? null,
    current_phase: currentPhase,
    last_phase_change_ms: lastPhaseChangeMs,
  });

  switch (decision.kind) {
    case "cancel": {
      await db.from("quality_loop3_batches").update({
        status: "cancelled",
        phase: "cancelled",
        completed_at: new Date().toISOString(),
      }).eq("id", batchId);
      await logBatch(batchId, null, "info", `batch cancelled at doc index ${b.current_index}`);
      return;
    }
    case "finalize": {
      const results = Array.isArray(b.results) ? b.results : [];
      const anyDone = results.some((r: any) => r?.final_phase === "done");
      const finalStatus = anyDone ? "complete" : "failed";
      await db.from("quality_loop3_batches").update({
        status: finalStatus,
        phase: "finalized",
        completed_at: new Date().toISOString(),
      }).eq("id", batchId);
      await logBatch(batchId, null, "info", `batch finalized: ${finalStatus} (docs=${docs.length}, done_count=${results.filter((r: any) => r?.final_phase === "done").length})`);
      return;
    }
    case "kickoff": {
      const doc = decision.doc;
      const notes = `batch ${batchId.slice(0, 8)} · doc #${doc.doc_number}`;
      await logBatch(batchId, null, "info", `kickoff QL3 tool=${b.tool_slug} doc=#${doc.doc_number} assessment=${doc.source_row_id}`);
      const runId = await kickoffQL3(b.tool_slug, doc.source_row_id, notes);
      if (!runId) {
        // Record failure for this doc and advance.
        const results = Array.isArray(b.results) ? [...b.results] : [];
        results.push({
          doc_number: doc.doc_number,
          source_row_id: doc.source_row_id,
          ql3_run_id: null,
          final_phase: "kickoff_failed",
          pre_score: null, post_score: null,
          pre_claude_score: null, pre_gpt_score: null,
          post_claude_score: null, post_gpt_score: null,
          items_before: null, items_after: null, items_resolved: null,
          incorporation_pass: null,
        });
        await db.from("quality_loop3_batches").update({
          results,
          current_index: Number(b.current_index) + 1,
          current_ql3_run_id: null,
          phase: "kickoff",
          last_error: `kickoff_failed doc #${doc.doc_number}`,
        }).eq("id", batchId);
        await logBatch(batchId, null, "error", `kickoff failed doc #${doc.doc_number}`);
        // Immediate self-chain (no delay) — next doc.
        // deno-lint-ignore no-explicit-any
        (globalThis as any).EdgeRuntime?.waitUntil(selfInvoke(batchId));
        return;
      }
      await db.from("quality_loop3_batches").update({
        current_ql3_run_id: runId,
        phase: "polling",
      }).eq("id", batchId);
      await logBatch(batchId, runId, "info", `QL3 run ${runId} started for doc #${doc.doc_number}`);
      // deno-lint-ignore no-explicit-any
      (globalThis as any).EdgeRuntime?.waitUntil(selfInvoke(batchId, POLL_DELAY_MS));
      return;
    }
    case "poll": {
      // Still in-flight — just re-schedule.
      // deno-lint-ignore no-explicit-any
      (globalThis as any).EdgeRuntime?.waitUntil(selfInvoke(batchId, POLL_DELAY_MS));
      return;
    }
    case "stalled":
    case "advance": {
      const finalPhase = decision.kind === "stalled" ? "stalled" : decision.final_phase;
      const doc = docs[Number(b.current_index)];
      const snap = currentRunSnapshot;
      const incorporation = snap?.qc_result?.incorporation ?? null;
      const results = Array.isArray(b.results) ? [...b.results] : [];
      results.push({
        doc_number: doc?.doc_number,
        source_row_id: doc?.source_row_id,
        ql3_run_id: decision.ql3_run_id,
        final_phase: finalPhase,
        pre_score: snap?.pre_score ?? null,
        post_score: snap?.post_score ?? null,
        pre_claude_score: snap?.pre_claude_score ?? null,
        pre_gpt_score: snap?.pre_gpt_score ?? null,
        post_claude_score: snap?.post_claude_score ?? null,
        post_gpt_score: snap?.post_gpt_score ?? null,
        items_before: snap?.items_before ?? null,
        items_after: snap?.items_after ?? null,
        items_resolved: snap?.items_resolved ?? null,
        incorporation_pass: incorporation ? !!incorporation?.pass : null,
      });
      await db.from("quality_loop3_batches").update({
        results,
        current_index: Number(b.current_index) + 1,
        current_ql3_run_id: null,
        phase: "advancing",
        ...(decision.kind === "stalled" ? { last_error: `stalled doc #${doc?.doc_number}` } : {}),
      }).eq("id", batchId);
      if (decision.kind === "stalled") {
        await logBatch(batchId, decision.ql3_run_id, "warn", `stalled >10min — advancing (doc #${doc?.doc_number})`);
      } else {
        await logBatch(batchId, decision.ql3_run_id, "info", `doc #${doc?.doc_number} terminal=${finalPhase}`);
      }
      // Cancel is not honoured mid-run (short-lived QL3 runs) — but between
      // docs we re-check at the top of the next tick.
      // deno-lint-ignore no-explicit-any
      (globalThis as any).EdgeRuntime?.waitUntil(selfInvoke(batchId));
      return;
    }
  }
}

if (import.meta.main) Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const isInternal = bearer && bearer === SERVICE_KEY && req.headers.get("x-internal-resume") === "1";

  let body: any = null;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const action = body?.action ?? "";

  if (action === "resume") {
    if (!isInternal) return json({ error: "internal_only" }, 401);
    const id = String(body?.batch_id ?? "");
    if (!id) return json({ error: "missing batch_id" }, 400);
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil(runOneUnit(id));
    return json({ accepted: true, batch_id: id }, 202);
  }

  // External actions require admin JWT.
  let userId: string | null = null;
  if (!bearer) return json({ error: "missing_authorization" }, 401);
  if (bearer === SERVICE_KEY) {
    // Programmatic admin start via SR bearer allowed only for batch_start too.
    userId = null;
  } else {
    const supabase = createClient(SUPABASE_URL, ANON_KEY);
    const { data: u, error: uErr } = await supabase.auth.getUser(bearer);
    if (uErr || !u?.user) return json({ error: "invalid_token" }, 401);
    userId = u.user.id;
    const { data: isAdmin } = await admin().rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "admin_only" }, 403);
  }

  if (action === "batch_start") {
    const toolSlug = String(body?.tool_slug ?? "");
    const sourceRunId = String(body?.source_quality_run_id ?? "");
    const docFilter = body?.doc_filter ?? undefined;
    if (!KNOWN_TOOL_SLUGS.has(toolSlug)) return json({ error: "unknown_tool_slug", detail: toolSlug }, 400);
    if (!sourceRunId) return json({ error: "missing source_quality_run_id" }, 400);
    if (!userId) return json({ error: "batch_start requires admin JWT (not SR)" }, 403);

    const { data: docs, error: dErr } = await admin()
      .from("quality_run_documents")
      .select("doc_number, source_row_id, status")
      .eq("run_id", sourceRunId);
    if (dErr) return json({ error: "docs_query_failed", detail: dErr.message }, 500);
    const snapshot = snapshotDocs((docs as any[]) ?? [], docFilter);
    if (snapshot.length === 0) {
      return json({ error: "no_eligible_documents", detail: "status=complete + source_row_id required" }, 400);
    }

    const { data: ins, error: insErr } = await admin()
      .from("quality_loop3_batches")
      .insert({
        tool_slug: toolSlug,
        source_quality_run_id: sourceRunId,
        doc_ids: snapshot,
        created_by: userId,
        started_at: new Date().toISOString(),
        status: "running",
        phase: "kickoff",
      })
      .select("id")
      .single();
    if (insErr || !ins) return json({ error: "insert_failed", detail: insErr?.message }, 500);
    const batchId = (ins as any).id as string;
    await logBatch(batchId, null, "info", `batch_start tool=${toolSlug} source_run=${sourceRunId} docs=${snapshot.length}`);
    // deno-lint-ignore no-explicit-any
    (globalThis as any).EdgeRuntime?.waitUntil(selfInvoke(batchId));
    return json({ batch_id: batchId, docs: snapshot.length }, 202);
  }

  if (action === "batch_cancel") {
    const id = String(body?.batch_id ?? "");
    if (!id) return json({ error: "missing batch_id" }, 400);
    // NOTE: cancel takes effect BETWEEN docs — an in-flight QL3 run is
    // short-lived and finishes; we never kill it mid-flight. See runOneUnit.
    await admin().from("quality_loop3_batches").update({ cancel_requested: true }).eq("id", id);
    await logBatch(id, null, "info", "cancel_requested set");
    return json({ ok: true }, 200);
  }

  return json({ error: "unknown_action", detail: action }, 400);
});
