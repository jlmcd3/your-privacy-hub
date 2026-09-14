// ptest-run-driver — the /all-ptest job queue.
//
// WHY THIS EXISTS. Deep review and arbitration are model calls that routinely
// run for minutes. Holding a browser request open for them means the request
// window — not the model — decides whether the work survives, and that ceiling
// gets lower as documents get longer and more products join the harness.
//
// So no caller ever waits. Work is enqueued as rows in ptest_jobs; each tick
// claims ONE job, returns immediately, and runs the job as a background task.
// When the job lands the driver writes the result and kicks the next tick, but
// only while unprocessed work remains. The page polls ptest_jobs.
//
// PROTECTIONS CARRIED FORWARD from the batch harness:
//   * bounded work per invocation (exactly one job)
//   * atomic single-flight claim in SQL (claim_ptest_job, FOR UPDATE SKIP LOCKED)
//   * idempotent progress: a job is marked done in the same step that finishes it
//   * attempt cap (max_attempts); a stale heartbeat re-queues a job once, never twice
//   * a gated next hop: the idle path stops the chain instead of kicking it
//   * cancellation is honoured before the work starts
//   * truncation is recorded on the job, never silent
//
// Actions: enqueue | tick | status | cancel

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { isReviewTool, type ReviewTool } from "../_shared/review/document-source.ts";
import { runDocumentReview } from "../_shared/review/run-review.ts";
import { runArbitration } from "../_shared/review/run-arbitration.ts";
import { type Effort } from "../_shared/review/model-calls.ts";
import { cors, json, requireAdmin, isResponse, SUPABASE_URL, SERVICE_KEY } from "../_shared/review/auth.ts";

export const BUILD_STAMP = "all-ptest-driver-v1@2026-09-13";
console.log(`[ptest-run-driver] boot ${BUILD_STAMP}`);

// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

const EFFORTS: Effort[] = ["low", "medium", "high", "max"];
const effortOf = (v: unknown, fallback: Effort): Effort =>
  EFFORTS.includes(v as Effort) ? v as Effort : fallback;

/** Runs the background task where the platform supports it, inline otherwise. */
function background(p: Promise<unknown>) {
  const safe = p.catch((e) => console.error(`[ptest-run-driver] background task threw — ${(e as Error)?.message ?? e}`));
  try {
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(safe);
  } catch { /* fall through: the promise is already running */ }
  return safe;
}

/** Kick the next tick. GATED: only called when queued work remains. */
async function kickNext(batchId: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/ptest-run-driver`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ action: "tick", batch_id: batchId }),
    });
  } catch (e) {
    // A failed kick is not silent: the stale-heartbeat rule re-queues the work
    // and the page's poll keeps ticking, so the batch still drains.
    console.error(`[ptest-run-driver] next-hop kick failed — ${(e as Error)?.message ?? e}`);
  }
}

interface JobRow {
  id: string;
  batch_id: string;
  tool_slug: string;
  kind: string;
  assessment_id: string | null;
  company_name: string | null;
  effort: string;
  run_by: string | null;
}

/** ONE JOB PER REVIEWER. A legacy 'review' row (queued before the split) still
 *  runs both reviewers, so an in-flight batch is never stranded. */
function reviewersOf(kind: string): Reviewer[] | null {
  if (kind === "review_gpt") return ["gpt"];
  if (kind === "review_claude") return ["claude"];
  if (kind === "review") return ["gpt", "claude"];
  return null;
}

/**
 * HEARTBEAT. A model call can legitimately run for minutes with nothing to
 * report; the stale-heartbeat rule must be able to tell that silence apart from
 * a dead worker. The beat is refreshed every 30 seconds while the call is in
 * flight and stopped the moment the job settles.
 */
// deno-lint-ignore no-explicit-any
function startHeartbeat(admin: any, jobId: string): () => void {
  const timer = setInterval(() => {
    admin.from("ptest_jobs")
      .update({ heartbeat_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "running")
      .then(
        // deno-lint-ignore no-explicit-any
        (r: any) => { if (r?.error) console.warn(`[ptest-run-driver] heartbeat failed — ${r.error.message}`); },
        (e: unknown) => console.warn(`[ptest-run-driver] heartbeat threw — ${(e as Error)?.message ?? e}`),
      );
  }, 30_000);
  return () => clearInterval(timer);
}

// deno-lint-ignore no-explicit-any
async function runJob(admin: any, job: JobRow) {
  const stopHeartbeat = startHeartbeat(admin, job.id);
  const finish = async (patch: Record<string, unknown>) => {
    stopHeartbeat();
    await admin.from("ptest_jobs").update({ finished_at: new Date().toISOString(), ...patch }).eq("id", job.id);
  };

  try {
    // Cancellation is checked at the last moment before any spend.
    const { data: fresh } = await admin.from("ptest_jobs").select("status").eq("id", job.id).single();
    if (fresh?.status === "cancelled") { stopHeartbeat(); return; }

    const reviewers = reviewersOf(job.kind);
    if (reviewers) {
      if (!isReviewTool(job.tool_slug) || !job.assessment_id) {
        await finish({ status: "failed", error: `unreviewable job (${job.tool_slug}/${job.assessment_id})` });
        return;
      }
      const out = await runDocumentReview(admin, {
        tool: job.tool_slug as ReviewTool,
        assessmentId: job.assessment_id,
        batchId: job.batch_id,
        companyName: job.company_name,
        effort: job.effort as Effort,
        reviewers,
        userId: job.run_by,
      });
      await finish({
        status: out.ok ? "done" : "failed",
        error: out.ok ? null : String(out.body.error ?? "review_failed"),
        input_truncated: !!out.body.document_truncated,
        note: out.body.document_truncated ? `document truncated at the review cap (${out.body.document_chars} chars)` : null,
      });
      return;
    }

    const scope = job.kind === "arb_merge" ? "merge" : "document";
    const out = await runArbitration(admin, {
      batchId: job.batch_id,
      tool: job.tool_slug,
      scope,
      assessmentId: job.assessment_id,
      effort: job.effort as Effort,
      userId: job.run_by,
      parentJobId: job.id,
    });
    await finish({
      status: out.ok ? "done" : "failed",
      error: out.ok ? null : String(out.body.error ?? "arbitration_failed"),
      result_id: out.rowId ?? null,
      input_truncated: !!out.inputTruncated,
      note: out.inputTruncated ? "arbitration input hit the size cap; later findings were not seen" : null,
    });
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(`[ptest-run-driver] job ${job.id} threw — ${msg}`);
    await finish({ status: "failed", error: msg });
  }
}

/**
 * BATCH SCORE ROLLUP. Written once, on the last job of a batch, from rows that
 * are already persisted — so it is a report, never a second source of truth.
 * A failure here is logged and swallowed: scoring must never fail a batch.
 */
// deno-lint-ignore no-explicit-any
async function writeBatchRollup(admin: any, batchId: string) {
  try {
    const [{ data: reviews }, { data: arbs }] = await Promise.all([
      admin.from("ptest_reviews")
        .select("tool_slug, assessment_id, reviewer, overall_score, derived_score, error")
        .eq("batch_id", batchId),
      admin.from("ptest_arbitrations")
        .select("tool_slug, agreed_score, error")
        .eq("batch_id", batchId).eq("arbitration_scope", "merge"),
    ]);

    const byTool = new Map<string, {
      claude: number[]; gpt: number[]; derived: number[]; docs: Set<string>;
    }>();
    for (const r of reviews ?? []) {
      if (r.error) continue;
      const slot = byTool.get(r.tool_slug) ??
        { claude: [], gpt: [], derived: [], docs: new Set<string>() };
      byTool.set(r.tool_slug, slot);
      if (r.assessment_id) slot.docs.add(String(r.assessment_id));
      const score = r.overall_score === null ? null : Number(r.overall_score);
      if (score !== null && Number.isFinite(score)) {
        (r.reviewer === "claude" ? slot.claude : slot.gpt).push(score);
      }
      if (r.derived_score !== null && Number.isFinite(Number(r.derived_score))) {
        slot.derived.push(Number(r.derived_score));
      }
    }

    const arbByTool = new Map<string, number>();
    for (const a of arbs ?? []) {
      if (a.error || a.agreed_score === null) continue;
      arbByTool.set(a.tool_slug, Number(a.agreed_score));
    }

    const scores: Record<string, unknown> = {};
    const combinedAll: number[] = [];
    for (const [tool, s] of byTool) {
      const claude = mean(s.claude);
      const gpt = mean(s.gpt);
      const combined = mean([...s.claude, ...s.gpt]);
      if (combined !== null) combinedAll.push(combined);
      scores[tool] = {
        claude, gpt, combined,
        derived: mean(s.derived),
        arbitration: arbByTool.has(tool) ? arbByTool.get(tool) : null,
        documents: s.docs.size,
      };
    }
    const batchMean = mean(combinedAll);
    if (!Object.keys(scores).length) return;
    await admin.from("ptest_batches")
      .update({ scores, batch_mean: batchMean })
      .eq("batch_id", batchId);
  } catch (e) {
    console.error(`[ptest-run-driver] score rollup failed — ${(e as Error)?.message ?? e}`);
  }
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const action = String(body.action ?? "tick");
  const batchId = typeof body.batch_id === "string" ? body.batch_id : null;
  if (!batchId) return json({ error: "missing_batch_id" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  // ── enqueue ──────────────────────────────────────────────────────────────
  if (action === "enqueue") {
    const docs = Array.isArray(body.documents) ? body.documents as Array<Record<string, unknown>> : [];
    if (!docs.length) return json({ error: "no_documents" }, 400);
    const reviewEffort = effortOf(body.review_effort, "high");
    const arbEffort = effortOf(body.arbitration_effort, "high");

    const rows: Record<string, unknown>[] = [];
    const tools = new Set<string>();
    for (const d of docs) {
      const tool = String(d.tool ?? "");
      const assessmentId = typeof d.assessment_id === "string" ? d.assessment_id : null;
      if (!isReviewTool(tool) || !assessmentId) {
        return json({ error: "bad_document", detail: `${tool}/${assessmentId}` }, 400);
      }
      tools.add(tool);
      const common = {
        batch_id: batchId,
        tool_slug: tool,
        assessment_id: assessmentId,
        company_name: typeof d.company_name === "string" ? d.company_name : null,
        run_by: auth.userId,
      };
      rows.push({ ...common, kind: "review", effort: reviewEffort });
      rows.push({ ...common, kind: "arb_document", effort: arbEffort });
    }
    // One merge per product. Two-pass arbitration is the default here: a single
    // turn over every document of a product is exactly the input that grows
    // without bound as products are added.
    for (const tool of tools) {
      rows.push({
        batch_id: batchId, tool_slug: tool, assessment_id: null, company_name: null,
        kind: "arb_merge", effort: arbEffort, run_by: auth.userId,
      });
    }

    const { error: insErr, data: ins } = await admin.from("ptest_jobs").insert(rows).select("id");
    if (insErr) return json({ error: "enqueue_failed", detail: insErr.message }, 500);

    // Start as many parallel workers as the harness's proven concurrency.
    const starters = Math.min(3, docs.length);
    for (let i = 0; i < starters; i++) background(kickNext(batchId));

    return json({ ok: true, batch_id: batchId, enqueued: ins?.length ?? rows.length, workers: starters, build_stamp: BUILD_STAMP });
  }

  // ── cancel ───────────────────────────────────────────────────────────────
  if (action === "cancel") {
    const { error } = await admin.from("ptest_jobs")
      .update({ status: "cancelled", finished_at: new Date().toISOString(), note: "cancelled by operator" })
      .eq("batch_id", batchId)
      .in("status", ["queued", "running"]);
    if (error) return json({ error: "cancel_failed", detail: error.message }, 500);
    return json({ ok: true, cancelled: true, build_stamp: BUILD_STAMP });
  }

  // ── status ───────────────────────────────────────────────────────────────
  if (action === "status") {
    const { data, error } = await admin.from("ptest_jobs")
      .select("id, tool_slug, kind, assessment_id, company_name, status, attempts, error, note, input_truncated, created_at, finished_at")
      .eq("batch_id", batchId)
      .order("created_at", { ascending: true });
    if (error) return json({ error: "status_failed", detail: error.message }, 500);
    return json({ ok: true, jobs: data ?? [], build_stamp: BUILD_STAMP });
  }

  // ── tick: claim exactly one job and run it in the background ─────────────
  if (action !== "tick") return json({ error: "unknown_action", detail: action }, 400);

  const { data: claimed, error: claimErr } = await admin.rpc("claim_ptest_job", { _batch_id: batchId });
  if (claimErr) return json({ error: "claim_failed", detail: claimErr.message }, 500);
  const job = Array.isArray(claimed) ? claimed[0] as JobRow | undefined : undefined;
  if (!job) {
    // IDLE PATH: nothing claimable. Stop the chain — never kick a next hop here.
    // A batch can also reach this path without a last worker (its worker was
    // killed and the reaper failed the job), so the rollup is written here too;
    // writeBatchRollup is idempotent and swallows its own failures.
    const { count: busyIdle } = await admin.from("ptest_jobs")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .in("status", ["queued", "running"]);
    if ((busyIdle ?? 0) === 0) await writeBatchRollup(admin, batchId);
    return json({ ok: true, idle: true, build_stamp: BUILD_STAMP });
  }


  background((async () => {
    await runJob(admin, job);
    // GATED NEXT HOP: only when unprocessed work actually remains.
    const { count } = await admin.from("ptest_jobs")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .eq("status", "queued");
    if ((count ?? 0) > 0) { await kickNext(batchId); return; }
    // Last worker out writes the batch score rollup.
    const { count: busyCount } = await admin.from("ptest_jobs")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .in("status", ["queued", "running"]);
    if ((busyCount ?? 0) === 0) await writeBatchRollup(admin, batchId);
  })());

  return json({
    ok: true,
    claimed: { id: job.id, kind: job.kind, tool: job.tool_slug, assessment_id: job.assessment_id },
    build_stamp: BUILD_STAMP,
  }, 202);
};

export { handler };
if (import.meta.main) Deno.serve(handler);
