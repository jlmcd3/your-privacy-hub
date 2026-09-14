// /all-ptest v2 (DOC 261, 2026-09-14) — THE GOLDEN PANEL: regeneration and
// the Stage 0 determinism check.
//
// A golden intake is regenerated through the PRODUCT FUNCTION ITSELF — the
// production path, with the report date injected (internal caller) and every
// model-backed layer dark by the production flags:
//   cppa-risk   POST run-cppa-risk-assessment-v2 { assessment_id, report_date }
//               — the panel's own cppa_assessments row, regenerated in place
//   cppa-cyber  POST run-cppa-cybersecurity      { assessment_id, report_date }
//   cppa-admt   POST run-admt-checker-v2         { intake_data, user_id, report_date }
//               — direct intake, no assessment_id, so the V3 hook-selection
//               layer plans no call (a fresh row per run)
//
// DETERMINISM: every golden is generated TWICE per batch and the two reviewer
// texts must hash identically. A mismatch fails the generate job with the
// first divergent line — a nondeterministic engine cannot be improved by
// testing, so its document is not reviewed.
//
// All I/O goes through `GenerateDeps` so the job runs hermetically in tests.

import { documentHash, firstDivergence, reviewTextOf } from "./determinism.ts";
import { documentJobRows } from "./job-rows.ts";
import type { Effort } from "./model-calls.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;
type Bag = Record<string, unknown>;

export interface GoldenRow {
  id: string;
  product: string;
  source: string;
  ref: string;
  label: string;
  intake_data: Bag;
  module: string | null;
  assessment_id: string | null;
  enabled: boolean;
}

export const GOLDEN_PRODUCTS: Readonly<Record<string, { module: string; fn: string; byAssessmentId: boolean }>> = {
  "cppa-risk": { module: "risk_assessment", fn: "run-cppa-risk-assessment-v2", byAssessmentId: true },
  "cppa-cyber": { module: "cybersecurity", fn: "run-cppa-cybersecurity", byAssessmentId: true },
  "cppa-admt": { module: "admt_v2", fn: "run-admt-checker-v2", byAssessmentId: false },
};

export interface GenerateDeps {
  admin: Admin;
  /** POST a product function with the service key; resolves with the JSON body (202/200). */
  invoke: (fn: string, body: Bag) => Promise<Bag>;
  sleep: (ms: number) => Promise<void>;
  now: () => number;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

export interface GenerationResult {
  assessmentId: string;
  reportData: Bag;
  hash: string;
  chars: number;
  elapsedMs: number;
}

/** Ensure the panel's own cppa_assessments row exists for a by-id product. */
async function ensurePanelRow(deps: GenerateDeps, golden: GoldenRow, userId: string | null): Promise<string> {
  const spec = GOLDEN_PRODUCTS[golden.product];
  if (golden.assessment_id) {
    const { data } = await deps.admin.from("cppa_assessments").select("id").eq("id", golden.assessment_id).maybeSingle();
    if (data?.id) return golden.assessment_id;
  }
  const { data, error } = await deps.admin.from("cppa_assessments").insert({
    user_id: userId, module: spec.module, status: "pending", intake_data: golden.intake_data,
  }).select("id").single();
  if (error || !data?.id) throw new Error(`panel row insert failed: ${error?.message ?? "no id"}`);
  await deps.admin.from("ptest_golden_intakes").update({ assessment_id: data.id, module: spec.module }).eq("id", golden.id);
  return data.id as string;
}

async function waitForComplete(deps: GenerateDeps, assessmentId: string, since: string | null): Promise<Bag> {
  const interval = deps.pollIntervalMs ?? 3_000;
  const timeout = deps.pollTimeoutMs ?? 240_000;
  const started = deps.now();
  for (;;) {
    const { data, error } = await deps.admin.from("cppa_assessments").select("id, status, updated_at, report_data, error_message").eq("id", assessmentId).maybeSingle();
    if (error) throw new Error(`poll failed: ${error.message}`);
    const row = (data ?? {}) as Bag;
    const status = String(row.status ?? "");
    const fresh = !since || String(row.updated_at ?? "") > since;
    if (status === "complete" && fresh && row.report_data) return row.report_data as Bag;
    if (status === "error" && fresh) throw new Error(`generation error: ${String(row.error_message ?? "unknown")}`);
    if (deps.now() - started > timeout) throw new Error(`generation did not complete within ${timeout} ms (status ${status})`);
    await deps.sleep(interval);
  }
}

/** One regeneration of a golden intake through the production function. */
export async function generateGoldenOnce(deps: GenerateDeps, golden: GoldenRow, opts: { userId: string | null; reportDate: string }): Promise<GenerationResult> {
  const spec = GOLDEN_PRODUCTS[golden.product];
  if (!spec) throw new Error(`no golden generation spec for ${golden.product}`);
  const started = deps.now();
  let assessmentId: string;
  let reportData: Bag;
  if (spec.byAssessmentId) {
    assessmentId = await ensurePanelRow(deps, golden, opts.userId);
    const { data: before } = await deps.admin.from("cppa_assessments").select("updated_at").eq("id", assessmentId).maybeSingle();
    const since = (before?.updated_at as string | undefined) ?? null;
    await deps.invoke(spec.fn, { assessment_id: assessmentId, report_date: opts.reportDate });
    reportData = await waitForComplete(deps, assessmentId, since);
  } else {
    const res = await deps.invoke(spec.fn, { intake_data: golden.intake_data, user_id: opts.userId, report_date: opts.reportDate });
    assessmentId = String(res.assessment_id ?? "");
    if (!assessmentId) throw new Error(`${spec.fn} returned no assessment_id`);
    reportData = (res.report_data && typeof res.report_data === "object") ? res.report_data as Bag : await waitForComplete(deps, assessmentId, null);
  }
  const h = await documentHash(reportData);
  return { assessmentId, reportData, hash: h.hash, chars: h.chars, elapsedMs: deps.now() - started };
}

export interface GenerateJobOutcome {
  ok: boolean;
  assessmentId?: string;
  determinism?: { ok: boolean; hash1: string; hash2: string; divergence?: { line: number; a: string; b: string } | null };
  enqueued?: number;
  error?: string;
}

/**
 * The `generate` job: regenerate twice, compare, record both generations,
 * and — only when identical — enqueue the document's review jobs.
 */
export async function runGenerateJob(deps: GenerateDeps, opts: {
  batchId: string; jobId: string | null; golden: GoldenRow; userId: string | null; reportDate: string;
  reviewEffort: Effort; classifyEffort: Effort; settings?: Bag | null;
}): Promise<GenerateJobOutcome> {
  const record = async (runNo: number, g: GenerationResult | null, error: string | null) => {
    const { error: e } = await deps.admin.from("ptest_generations").insert({
      batch_id: opts.batchId, golden_id: opts.golden.id, product: opts.golden.product,
      assessment_id: g?.assessmentId ?? null, run_no: runNo, document_hash: g?.hash ?? null, document_chars: g?.chars ?? null,
      report_date: opts.reportDate, settings: opts.settings ?? null, elapsed_ms: g?.elapsedMs ?? null, error,
    });
    if (e) console.warn(`[ptest-generate] generation record failed — ${e.message}`);
  };

  let first: GenerationResult;
  try {
    first = await generateGoldenOnce(deps, opts.golden, { userId: opts.userId, reportDate: opts.reportDate });
    await record(1, first, null);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    await record(1, null, msg);
    return { ok: false, error: `generation_failed: ${msg}` };
  }
  let second: GenerationResult;
  try {
    second = await generateGoldenOnce(deps, opts.golden, { userId: opts.userId, reportDate: opts.reportDate });
    await record(2, second, null);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    await record(2, null, msg);
    return { ok: false, assessmentId: first.assessmentId, error: `second_generation_failed: ${msg}` };
  }

  const identical = first.hash === second.hash;
  const divergence = identical ? null : firstDivergence(reviewTextOf(first.reportData).text, reviewTextOf(second.reportData).text);
  const determinism = { ok: identical, hash1: first.hash, hash2: second.hash, divergence };
  if (!identical) {
    return {
      ok: false, assessmentId: second.assessmentId, determinism,
      error: `determinism_mismatch: line ${divergence?.line}: "${(divergence?.a ?? "").slice(0, 120)}" vs "${(divergence?.b ?? "").slice(0, 120)}"`,
    };
  }

  const rows = documentJobRows({
    batchId: opts.batchId, userId: opts.userId, tool: opts.golden.product, assessmentId: second.assessmentId,
    companyName: opts.golden.label, goldenId: opts.golden.id, reviewEffort: opts.reviewEffort, classifyEffort: opts.classifyEffort,
  });
  const { error } = await deps.admin.from("ptest_jobs").insert(rows);
  if (error) return { ok: false, assessmentId: second.assessmentId, determinism, error: `enqueue_failed: ${error.message}` };
  return { ok: true, assessmentId: second.assessmentId, determinism, enqueued: rows.length };
}
