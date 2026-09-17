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
// DOC 261 (2026-09-14) — v2 JOB SET. Per document: `lint` (no model) and the
// four evidence-scoped workers (`review_record`, `review_law_claude`,
// `review_law_gpt`, `review_reason`), then `classify` (one small model call +
// the deterministic queue gate); per product: `arb_merge` (deterministic union,
// no model). The legacy kinds (`review_gpt`, `review_claude`, `arb_document`)
// still run so an in-flight batch is never stranded; a batch's `arb_merge`
// picks the v2 merge when the batch ran v2 jobs.
//
// Actions: enqueue | tick | status | cancel

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { isReviewTool, type ReviewTool } from "../_shared/review/document-source.ts";
import { runDocumentReview, type Reviewer } from "../_shared/review/run-review.ts";
import { runArbitration } from "../_shared/review/run-arbitration.ts";
import { type Effort } from "../_shared/review/model-calls.ts";
import { cors, json, requireAdmin, isResponse, SUPABASE_URL, SERVICE_KEY } from "../_shared/review/auth.ts";
import { runWorkerJob, workerOfKind, WORKER_KIND_LIST } from "./_local/review/workers.ts";
import { runLintJob } from "./_local/review/lint-job.ts";
import { mergeProductV2, runClassifyJob } from "./_local/review/classify.ts";
import { PTEST_V2_PROMPT_VERSION, WORKER_VENDORS } from "./_local/review/prompts-v2.ts";
import { DETERMINISM_SETTINGS, todayIso } from "./_local/review/determinism.ts";
import { documentJobRows, mergeJobRow } from "./_local/review/job-rows.ts";
import { GOLDEN_PRODUCTS, runGenerateJob, type GoldenRow } from "./_local/review/golden.ts";
import { computeBatchDiff } from "./_local/review/diff.ts";
import { GOLDEN_PANEL } from "./_local/review/packs/index.ts";
import { isIsoDate } from "../_shared/report-date.ts";

export const BUILD_STAMP = "all-ptest-driver-v3-workers@2026-09-14";
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
  golden_id?: string | null;
  payload?: Record<string, unknown> | null;
  /** claim_ptest_job returns the whole row; carried through to a W-LAW
   *  continuation job so its attempt cap matches (doc 263). */
  max_attempts?: number;
}

/** POST a product function as the internal (service-key) caller. */
async function invokeProductFn(fn: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
  });
  let data: Record<string, unknown> = {};
  try { data = await r.json(); } catch { /* a 202 may carry no body */ }
  if (!r.ok) throw new Error(`${fn} ${r.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

/** LEGACY: one job per reviewer. A pre-split 'review' row still runs both. */
function legacyReviewersOf(kind: string): Reviewer[] | null {
  if (kind === "review_gpt") return ["gpt"];
  if (kind === "review_claude") return ["claude"];
  if (kind === "review") return ["gpt", "claude"];
  return null;
}

/** The v2 job kinds for one document, in the order they run. */
export const V2_DOCUMENT_KINDS = ["lint", ...WORKER_KIND_LIST, "classify"] as const;

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

/** A batch ran v2 when any of its jobs is a v2 kind. */
// deno-lint-ignore no-explicit-any
async function batchIsV2(admin: any, batchId: string): Promise<boolean> {
  const { count } = await admin.from("ptest_jobs")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .in("kind", ["classify", "lint", ...WORKER_KIND_LIST]);
  return (count ?? 0) > 0;
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

    // ── v2: regenerate a golden intake (twice), check determinism, enqueue its review ──
    if (job.kind === "generate") {
      const goldenId = job.golden_id ?? (job.payload?.golden_id as string | undefined) ?? null;
      const { data: golden, error: gErr } = goldenId
        ? await admin.from("ptest_golden_intakes").select("*").eq("id", goldenId).maybeSingle()
        : { data: null, error: null };
      if (gErr || !golden) { await finish({ status: "failed", error: `golden intake not found (${goldenId})` }); return; }
      const { data: batch } = await admin.from("ptest_batches").select("settings").eq("batch_id", job.batch_id).maybeSingle();
      const settings = ((batch?.settings ?? {}) as Record<string, unknown>);
      const reportDate = isIsoDate(settings.report_date) ? settings.report_date : todayIso();
      const out = await runGenerateJob(
        { admin, invoke: invokeProductFn, sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: () => Date.now() },
        {
          batchId: job.batch_id, jobId: job.id, golden: golden as GoldenRow, userId: job.run_by, reportDate,
          reviewEffort: effortOf(settings.review_effort, "high"), classifyEffort: effortOf(settings.classify_effort, "medium"),
          settings: { determinism: DETERMINISM_SETTINGS, report_date: reportDate },
        },
      );
      await finish({
        status: out.ok ? "done" : "failed",
        error: out.ok ? null : out.error ?? "generate_failed",
        assessment_id: out.assessmentId ?? null,
        note: out.ok ? `deterministic (hash ${out.determinism?.hash1.slice(0, 12)}); ${out.enqueued} review job(s) enqueued` : null,
      });
      return;
    }

    const needsDoc = job.kind !== "arb_merge";
    if (needsDoc && (!isReviewTool(job.tool_slug) || !job.assessment_id)) {
      await finish({ status: "failed", error: `unreviewable job (${job.tool_slug}/${job.assessment_id})` });
      return;
    }

    // ── v2: lint ────────────────────────────────────────────────────────────
    if (job.kind === "lint") {
      const out = await runLintJob(admin, {
        tool: job.tool_slug as ReviewTool, assessmentId: job.assessment_id!, batchId: job.batch_id,
        companyName: job.company_name, userId: job.run_by, jobId: job.id,
      });
      await finish({
        status: out.ok ? "done" : "failed",
        error: out.ok ? null : String(out.body.error ?? "lint_failed"),
        note: out.ok ? (out.body.skipped ? String(out.body.skipped) : `lint: ${out.body.defects ?? 0} defect(s), ${out.body.reviews ?? 0} review item(s)`) : null,
      });
      return;
    }

    // ── v2: one evidence-scoped worker ──────────────────────────────────────
    const wk = workerOfKind(job.kind);
    if (wk) {
      const out = await runWorkerJob(admin, {
        tool: job.tool_slug as ReviewTool, assessmentId: job.assessment_id!, batchId: job.batch_id,
        companyName: job.company_name, effort: job.effort as Effort, worker: wk.worker, vendor: wk.vendor,
        userId: job.run_by, jobId: job.id,
        payload: job.payload ?? null, kind: job.kind, goldenId: job.golden_id ?? null, maxAttempts: job.max_attempts,
      });
      // A W-LAW chunk left over when the job's own budget ran out (doc 263):
      // a continuation job is already queued, so this job is simply DONE —
      // never an error — and the existing gated next-hop below picks it up.
      if (out.ok && out.body.continued === true) {
        await finish({ status: "done", note: `continued: next chunk ${out.body.next_chunk} of ${out.body.chunks}` });
        return;
      }
      await finish({
        status: out.ok ? "done" : "failed",
        error: out.ok ? null : String(out.body.error ?? "worker_failed"),
        input_truncated: !!out.body.document_truncated,
        note: out.ok
          ? `${wk.worker}/${wk.vendor}: ${out.body.findings ?? 0} validated, ${out.body.dropped ?? 0} dropped${out.body.document_truncated ? ` (document truncated at ${out.body.document_chars} chars)` : ""}`
          : null,
      });
      return;
    }

    // ── v2: classify + gate + route (per document) ──────────────────────────
    if (job.kind === "classify") {
      const out = await runClassifyJob(admin, {
        batchId: job.batch_id, tool: job.tool_slug, assessmentId: job.assessment_id!, companyName: job.company_name,
        effort: job.effort as Effort, userId: job.run_by, parentJobId: job.id,
      });
      await finish({
        status: out.ok ? "done" : "failed",
        error: out.ok ? null : String(out.body.error ?? "classification_failed"),
        result_id: out.rowId ?? null,
        note: out.ok ? `queued ${out.body.fix_list ?? 0}, CEO ${out.body.ceo_sheet ?? 0}, observed ${out.body.dropped ?? 0}` : null,
      });
      return;
    }

    // ── legacy: omnibus reviewers ───────────────────────────────────────────
    const reviewers = legacyReviewersOf(job.kind);
    if (reviewers) {
      const out = await runDocumentReview(admin, {
        tool: job.tool_slug as ReviewTool,
        assessmentId: job.assessment_id!,
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

    // ── merge (v2 deterministic, or legacy model merge) / legacy arb_document ─
    if (job.kind === "arb_merge" && await batchIsV2(admin, job.batch_id)) {
      const out = await mergeProductV2(admin, { batchId: job.batch_id, tool: job.tool_slug, userId: job.run_by, parentJobId: job.id });
      await finish({
        status: out.ok ? "done" : "failed",
        error: out.ok ? null : String(out.body.error ?? "merge_failed"),
        result_id: out.rowId ?? null,
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
 * BATCH ROLLUP. Written once, on the last job of a batch, from rows that are
 * already persisted — so it is a report, never a second source of truth.
 * A failure here is logged and swallowed: scoring must never fail a batch.
 *
 * v2 batches report per product the composite score, the queued/CEO/observed
 * counts and the class breakdown (Rev 2 §0A V6 — the table is the gate, the
 * number is the trend). Legacy batches keep the reviewer means.
 */
// deno-lint-ignore no-explicit-any
async function writeBatchRollup(admin: any, batchId: string) {
  try {
    const v2 = await batchIsV2(admin, batchId);
    const scores: Record<string, unknown> = {};
    const combinedAll: number[] = [];

    if (v2) {
      const [{ data: docs }, { data: merges }] = await Promise.all([
        admin.from("ptest_arbitrations")
          .select("tool_slug, assessment_id, agreed_score, metrics, single_reviewer, error")
          .eq("batch_id", batchId).eq("arbitration_scope", "document"),
        admin.from("ptest_arbitrations")
          .select("tool_slug, agreed_score, metrics, error")
          .eq("batch_id", batchId).eq("arbitration_scope", "merge"),
      ]);
      const byTool = new Map<string, { composites: number[]; docs: Set<string>; by_class: Record<string, number>; queued: number; ceo: number; observed: number; partial: number }>();
      for (const d of docs ?? []) {
        if (d.error) continue;
        const slot = byTool.get(d.tool_slug) ?? { composites: [], docs: new Set<string>(), by_class: {}, queued: 0, ceo: 0, observed: 0, partial: 0 };
        byTool.set(d.tool_slug, slot);
        if (d.assessment_id) slot.docs.add(String(d.assessment_id));
        if (d.agreed_score !== null && Number.isFinite(Number(d.agreed_score))) slot.composites.push(Number(d.agreed_score));
        const m = (d.metrics ?? {}) as { by_class?: Record<string, number>; by_route?: Record<string, number> };
        for (const [k, v] of Object.entries(m.by_class ?? {})) slot.by_class[k] = (slot.by_class[k] ?? 0) + v;
        slot.queued += m.by_route?.fix_list ?? 0;
        slot.ceo += m.by_route?.ceo_sheet ?? 0;
        slot.observed += (m.by_route?.observed ?? 0) + (m.by_route?.intake_list ?? 0) + (m.by_route?.lint_backlog ?? 0);
        if (d.single_reviewer) slot.partial += 1;
      }
      const mergeByTool = new Map<string, number | null>();
      for (const m of merges ?? []) if (!m.error) mergeByTool.set(m.tool_slug, m.agreed_score === null ? null : Number(m.agreed_score));
      for (const [tool, s] of byTool) {
        const composite = mean(s.composites);
        if (composite !== null) combinedAll.push(composite);
        scores[tool] = {
          claude: null, gpt: null, combined: composite, derived: composite,
          arbitration: mergeByTool.has(tool) ? mergeByTool.get(tool) : null,
          documents: s.docs.size,
          queued: s.queued, ceo: s.ceo, observed: s.observed, by_class: s.by_class, partial_coverage: s.partial,
        };
      }
    } else {
      const [{ data: reviews }, { data: arbs }] = await Promise.all([
        admin.from("ptest_reviews")
          .select("tool_slug, assessment_id, reviewer, overall_score, derived_score, error")
          .eq("batch_id", batchId),
        admin.from("ptest_arbitrations")
          .select("tool_slug, agreed_score, error")
          .eq("batch_id", batchId).eq("arbitration_scope", "merge"),
      ]);
      const byTool = new Map<string, { claude: number[]; gpt: number[]; derived: number[]; docs: Set<string> }>();
      for (const r of reviews ?? []) {
        if (r.error) continue;
        const slot = byTool.get(r.tool_slug) ?? { claude: [], gpt: [], derived: [], docs: new Set<string>() };
        byTool.set(r.tool_slug, slot);
        if (r.assessment_id) slot.docs.add(String(r.assessment_id));
        const score = r.overall_score === null ? null : Number(r.overall_score);
        if (score !== null && Number.isFinite(score)) (r.reviewer === "claude" ? slot.claude : slot.gpt).push(score);
        if (r.derived_score !== null && Number.isFinite(Number(r.derived_score))) slot.derived.push(Number(r.derived_score));
      }
      const arbByTool = new Map<string, number>();
      for (const a of arbs ?? []) {
        if (a.error || a.agreed_score === null) continue;
        arbByTool.set(a.tool_slug, Number(a.agreed_score));
      }
      for (const [tool, s] of byTool) {
        const claude = mean(s.claude);
        const gpt = mean(s.gpt);
        const combined = mean([...s.claude, ...s.gpt]);
        if (combined !== null) combinedAll.push(combined);
        scores[tool] = { claude, gpt, combined, derived: mean(s.derived), arbitration: arbByTool.has(tool) ? arbByTool.get(tool) : null, documents: s.docs.size };
      }
    }
    const batchMean = mean(combinedAll);

    // A batch that lost a product is PARTIAL, never complete. The distinction
    // is the whole point: a mean over two of three products is not a batch
    // result, and must never read as one.
    const { count: badCount } = await admin.from("ptest_jobs")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .in("status", ["failed", "cancelled"]);
    const closedStatus = (badCount ?? 0) > 0 ? "partial" : "complete";

    const patch: Record<string, unknown> = { status: closedStatus };
    if ((badCount ?? 0) > 0) patch.note = `${badCount} job(s) failed or were cancelled; this batch is partial`;
    if (Object.keys(scores).length) { patch.scores = scores; patch.batch_mean = batchMean; }
    await admin.from("ptest_batches")
      .update(patch)
      .eq("batch_id", batchId)
      .in("status", ["running", "pending"]);
  } catch (e) {
    console.error(`[ptest-run-driver] score rollup failed — ${(e as Error)?.message ?? e}`);
  }
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/** The v2 job rows: per fresh document lint + workers + classify; per golden intake a
 *  `generate` job (which enqueues the document jobs itself once the regeneration lands);
 *  one merge per product. Exported for the enqueue test. */
export function v2JobRows(opts: {
  batchId: string; userId: string | null;
  documents: Array<{ tool: string; assessment_id: string; company_name: string | null }>;
  goldens?: Array<{ id: string; product: string; label: string }>;
  reviewEffort: Effort; classifyEffort: Effort;
}): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const tools = new Set<string>();
  for (const d of opts.documents) {
    tools.add(d.tool);
    rows.push(...documentJobRows({
      batchId: opts.batchId, userId: opts.userId, tool: d.tool, assessmentId: d.assessment_id, companyName: d.company_name,
      reviewEffort: opts.reviewEffort, classifyEffort: opts.classifyEffort,
    }));
  }
  for (const g of opts.goldens ?? []) {
    tools.add(g.product);
    rows.push({
      batch_id: opts.batchId, tool_slug: g.product, assessment_id: null, company_name: g.label, run_by: opts.userId,
      kind: "generate", effort: "low", golden_id: g.id, payload: { golden_id: g.id },
    });
  }
  for (const tool of tools) rows.push(mergeJobRow(opts.batchId, opts.userId, tool, opts.classifyEffort));
  return rows;
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

  // ── golden panel management ──────────────────────────────────────────────
  if (action === "golden_seed") {
    // Idempotent: (product, ref) is unique; existing rows are left as they are.
    const rows = GOLDEN_PANEL.entries.map((e) => ({
      product: e.product, source: "fixture", ref: e.ref, label: e.label, intake_data: e.intake_data,
      module: GOLDEN_PRODUCTS[e.product]?.module ?? null, created_by: auth.userId,
    }));
    const { error } = await admin.from("ptest_golden_intakes").upsert(rows, { onConflict: "product,ref", ignoreDuplicates: true });
    if (error) return json({ error: "seed_failed", detail: error.message }, 500);
    const { data } = await admin.from("ptest_golden_intakes").select("id, product, source, ref, label, enabled, assessment_id").order("product").order("ref");
    return json({ ok: true, seeded: rows.length, goldens: data ?? [], build_stamp: BUILD_STAMP });
  }
  if (action === "golden_list") {
    const { data, error } = await admin.from("ptest_golden_intakes").select("id, product, source, ref, label, enabled, assessment_id, created_at").order("product").order("ref");
    if (error) return json({ error: "list_failed", detail: error.message }, 500);
    return json({ ok: true, goldens: data ?? [], build_stamp: BUILD_STAMP });
  }
  if (action === "golden_add") {
    // A stored production intake joins the panel: its intake is COPIED so the
    // panel never drifts with the source row.
    const product = String(body.product ?? "");
    const assessmentId = typeof body.assessment_id === "string" ? body.assessment_id : null;
    if (!GOLDEN_PRODUCTS[product] || !assessmentId) return json({ error: "bad_request", detail: "product and assessment_id required" }, 400);
    const { data: src, error: sErr } = await admin.from("cppa_assessments").select("id, intake_data, module").eq("id", assessmentId).maybeSingle();
    if (sErr || !src) return json({ error: "assessment_not_found" }, 404);
    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : `assessment ${assessmentId.slice(0, 8)}`;
    const { data, error } = await admin.from("ptest_golden_intakes").upsert({
      product, source: "assessment", ref: assessmentId, label, intake_data: src.intake_data ?? {},
      module: GOLDEN_PRODUCTS[product].module, created_by: auth.userId,
    }, { onConflict: "product,ref" }).select("id, product, source, ref, label, enabled").single();
    if (error) return json({ error: "add_failed", detail: error.message }, 500);
    return json({ ok: true, golden: data, build_stamp: BUILD_STAMP });
  }
  if (action === "golden_toggle") {
    const id = typeof body.golden_id === "string" ? body.golden_id : null;
    if (!id) return json({ error: "missing_golden_id" }, 400);
    const { error } = await admin.from("ptest_golden_intakes").update({ enabled: body.enabled !== false }).eq("id", id);
    if (error) return json({ error: "toggle_failed", detail: error.message }, 500);
    return json({ ok: true, build_stamp: BUILD_STAMP });
  }

  // ── before/after diff on identical inputs (Stage 7) ─────────────────────
  if (action === "diff") {
    const before = typeof body.batch_before === "string" ? body.batch_before : null;
    if (!before) return json({ error: "missing_batch_before" }, 400);
    const diff = await computeBatchDiff(admin, before, batchId);
    return json({ ok: true, diff, build_stamp: BUILD_STAMP });
  }

  // ── implementer write-back (Stage 7) ─────────────────────────────────────
  if (action === "mark_item") {
    const itemId = typeof body.item_id === "string" ? body.item_id : null;
    const status = typeof body.status === "string" ? body.status : null;
    if (!itemId || !status || !["open", "in_progress", "fixed", "rejected", "deferred"].includes(status)) return json({ error: "bad_request" }, 400);
    const { error } = await admin.from("ptest_fix_items").update({
      fix_status: status,
      fix_reference: typeof body.reference === "string" ? body.reference : null,
      fix_notes: typeof body.notes === "string" ? body.notes : null,
      decided_at: new Date().toISOString(),
      decided_by: auth.userId,
    }).eq("id", itemId).eq("batch_id", batchId);
    if (error) return json({ error: "mark_failed", detail: error.message }, 500);
    return json({ ok: true, build_stamp: BUILD_STAMP });
  }

  // ── enqueue ──────────────────────────────────────────────────────────────
  if (action === "enqueue") {
    const docs = Array.isArray(body.documents) ? body.documents as Array<Record<string, unknown>> : [];
    const wantGolden = body.golden === true;
    const products = Array.isArray(body.products) ? body.products.map(String).filter((p) => !!GOLDEN_PRODUCTS[p]) : Object.keys(GOLDEN_PRODUCTS);
    if (!docs.length && !wantGolden) return json({ error: "no_documents" }, 400);
    const mode = body.mode === "legacy" ? "legacy" : "v2";
    const reportDate = isIsoDate(body.report_date) ? body.report_date : todayIso();
    const reviewEffort = effortOf(body.review_effort, "high");
    const arbEffort = effortOf(body.arbitration_effort, "high");
    // The classifier is a small call; "medium" is enough and caps its cost.
    const classifyEffort: Effort = arbEffort === "max" || arbEffort === "high" ? "medium" : arbEffort;

    const documents: Array<{ tool: string; assessment_id: string; company_name: string | null }> = [];
    for (const d of docs) {
      const tool = String(d.tool ?? "");
      const assessmentId = typeof d.assessment_id === "string" ? d.assessment_id : null;
      if (!isReviewTool(tool) || !assessmentId) return json({ error: "bad_document", detail: `${tool}/${assessmentId}` }, 400);
      documents.push({ tool, assessment_id: assessmentId, company_name: typeof d.company_name === "string" ? d.company_name : null });
    }

    let goldens: Array<{ id: string; product: string; label: string }> = [];
    if (wantGolden && mode === "v2") {
      const { data, error } = await admin.from("ptest_golden_intakes").select("id, product, label").eq("enabled", true).in("product", products);
      if (error) return json({ error: "golden_read_failed", detail: error.message }, 500);
      goldens = (data ?? []) as Array<{ id: string; product: string; label: string }>;
      if (!goldens.length && !documents.length) return json({ error: "golden_panel_empty", detail: "seed the golden panel first (golden_seed)" }, 400);
    }

    let rows: Record<string, unknown>[];
    if (mode === "v2") {
      rows = v2JobRows({ batchId, userId: auth.userId, documents, goldens, reviewEffort, classifyEffort });
    } else {
      rows = [];
      const tools = new Set<string>();
      for (const d of documents) {
        tools.add(d.tool);
        const common = { batch_id: batchId, tool_slug: d.tool, assessment_id: d.assessment_id, company_name: d.company_name, run_by: auth.userId };
        rows.push({ ...common, kind: "review_gpt", effort: reviewEffort });
        rows.push({ ...common, kind: "review_claude", effort: reviewEffort });
        rows.push({ ...common, kind: "arb_document", effort: arbEffort });
      }
      for (const tool of tools) {
        rows.push({ batch_id: batchId, tool_slug: tool, assessment_id: null, company_name: null, kind: "arb_merge", effort: arbEffort, run_by: auth.userId });
      }
    }

    const { error: insErr, data: ins } = await admin.from("ptest_jobs").insert(rows).select("id");
    if (insErr) return json({ error: "enqueue_failed", detail: insErr.message }, 500);

    // The settings this batch ran under — two batches with different settings
    // are never compared (Rev 2 §3.5). Best effort; a failure never blocks.
    try {
      await admin.from("ptest_batches").update({
        settings: {
          mode, prompt_version: PTEST_V2_PROMPT_VERSION, driver: BUILD_STAMP,
          review_effort: reviewEffort, classify_effort: classifyEffort,
          vendors: WORKER_VENDORS, determinism: DETERMINISM_SETTINGS,
          report_date: reportDate,
          golden_refs: goldens.map((g) => g.id),
          fresh_documents: documents.length,
        },
      }).eq("batch_id", batchId);
    } catch (e) {
      console.warn(`[ptest-run-driver] settings write failed — ${(e as Error)?.message ?? e}`);
    }

    // Start as many parallel workers as the harness's proven concurrency.
    const starters = Math.min(3, (documents.length + goldens.length) * 2);
    for (let i = 0; i < starters; i++) background(kickNext(batchId));

    return json({ ok: true, batch_id: batchId, mode, enqueued: ins?.length ?? rows.length, goldens: goldens.length, workers: starters, build_stamp: BUILD_STAMP });
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

  // The heartbeat beats every 30s, so a 4-minute silence is a dead worker;
  // the RPC's own default of 15 minutes let a dead W-LAW job sit that long
  // before the stale rule re-queued it (doc 263).
  const { data: claimed, error: claimErr } = await admin.rpc("claim_ptest_job", { _batch_id: batchId, _stale_after: "4 minutes" });
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
