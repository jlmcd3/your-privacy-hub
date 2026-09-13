/**
 * /all-ptest — deep review, arbitration and export.
 *
 * This is the /all-products-test loop with the rubric grader replaced by two
 * independent deep reviews, plus an arbitration stage the grader never had.
 *
 * CARRIED FORWARD from gradeRun (do not relax any of these):
 *   * Every model-backed call is bounded client-side. A hung connection is a
 *     failure of THIS call, never of the batch.
 *   * Transport failures and cold-start BOOT_ERROR/503 are retried twice with
 *     backoff; a timeout or a real function error is NEVER retried.
 *   * A failed review is recorded against its document and the batch continues.
 */
import { invokeWithTimeout } from "@/lib/sampleGenerators";
import { supabase } from "@/integrations/supabase/client";

export type PtestEffort = "low" | "medium" | "high" | "max";

/** Deep review runs two model calls server-side; 6 minutes of silence is a
 *  failure of this review. Arbitration reads a whole product slice at higher
 *  effort and is given longer. */
const REVIEW_TIMEOUT_MS = 360_000;
const ARBITRATION_TIMEOUT_MS = 420_000;

const isBootError = (msg: string) =>
  /BOOT_ERROR/i.test(msg) || /\b503\b/.test(msg) || /failed to start/i.test(msg);

async function invokeResilient(fn: string, body: unknown, timeoutMs: number) {
  let data: unknown = null;
  let error: { message: string } | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await invokeWithTimeout(fn, body, timeoutMs);
    data = r.data;
    error = r.error;
    const msg = error?.message ?? "";
    const transient = !!error && !r.timedOut && (/failed to send a request/i.test(msg) || isBootError(msg));
    if (!transient || attempt === 3) break;
    await new Promise((resolve) => setTimeout(resolve, 4_000 * attempt));
  }
  return { data, error };
}

export interface ReviewFinding {
  id: string;
  section: string | null;
  defect_type: string;
  severity: string;
  confidence: string | null;
  quote: string;
  why: string;
  proposed_change: string | null;
  decision_required: string | null;
  cause_layer: string | null;
  code_focus: string | null;
  regression_test: string | null;
}

export interface ReviewerResult {
  reviewer: string;
  model?: string;
  effort?: string | null;
  findings?: ReviewFinding[];
  dropped_unlocatable?: string[];
  dropped_no_quote?: number;
  double_check?: string | null;
  overall?: string | null;
  note?: string | null;
  error?: string;
  /** Reviewer's own six-dimension verdict (the headline score). */
  dimension_scores?: Record<string, number> | null;
  overall_score?: number | null;
  /** Deterministic cross-check computed from the validated findings. */
  derived_score?: number | null;
  score_source?: string | null;
  score_notes?: string | null;
}

export interface DeepReviewResult {
  ok: boolean;
  tool: string;
  assessmentId: string;
  companyName: string;
  documentChars?: number;
  documentTruncated?: boolean;
  reviews: Record<string, ReviewerResult>;
  error?: string;
}

export async function deepReviewDocument(opts: {
  tool: string;
  assessmentId: string;
  batchId: string;
  companyName: string;
  effort: PtestEffort;
}): Promise<DeepReviewResult> {
  const base = { ok: false, tool: opts.tool, assessmentId: opts.assessmentId, companyName: opts.companyName, reviews: {} };
  try {
    const { data, error } = await invokeResilient(
      "deep-review-document",
      {
        tool: opts.tool,
        assessment_id: opts.assessmentId,
        batch_id: opts.batchId,
        company_name: opts.companyName,
        effort: opts.effort,
      },
      REVIEW_TIMEOUT_MS,
    );
    if (error) return { ...base, error: error.message };
    const d = data as Record<string, unknown> | null;
    if (!d) return { ...base, error: "no response" };
    if (d.error && !d.reviews) return { ...base, error: String(d.error) };
    return {
      ok: !!d.ok,
      tool: opts.tool,
      assessmentId: opts.assessmentId,
      companyName: opts.companyName,
      documentChars: typeof d.document_chars === "number" ? d.document_chars : undefined,
      documentTruncated: !!d.document_truncated,
      reviews: (d.reviews ?? {}) as Record<string, ReviewerResult>,
    };
  } catch (e) {
    return { ...base, error: (e as Error).message };
  }
}

export interface FixListEntry {
  id: string;
  title: string;
  status: string;
  raised_by: string;
  severity: string;
  defect_type: string;
  occurrences: Array<{ document_id?: string; product?: string; section?: string; quote?: string }>;
  cause: string;
  cause_layer: string;
  code_focus: string;
  change: string;
  regression_test: string;
  boundary_cases?: string[];
}

export interface CeoEntry {
  id: string;
  question: string;
  status: string;
  raised_by: string;
  context: string;
  gpt_proposed_fix: string | null;
  arbiter_reason: string;
  options?: Array<{ option: string; consequence: string }>;
}

export interface ArbitrationResult {
  ok: boolean;
  tool: string;
  model?: string;
  findingsIn?: number;
  inputTruncated?: boolean;
  fixList: FixListEntry[];
  ceoSheet: CeoEntry[];
  dropped: Array<{ id: string; reason: string }>;
  doubleCheck: string | null;
  summary: string | null;
  error?: string;
}

export async function arbitrateProduct(opts: {
  batchId: string;
  tool: string;
  effort: PtestEffort;
}): Promise<ArbitrationResult> {
  const base: ArbitrationResult = {
    ok: false, tool: opts.tool, fixList: [], ceoSheet: [], dropped: [], doubleCheck: null, summary: null,
  };
  try {
    const { data, error } = await invokeResilient(
      "arbitrate-review-batch",
      { batch_id: opts.batchId, tool: opts.tool, effort: opts.effort },
      ARBITRATION_TIMEOUT_MS,
    );
    if (error) return { ...base, error: error.message };
    const d = data as Record<string, unknown> | null;
    if (!d) return { ...base, error: "no response" };
    if (d.error) return { ...base, error: String(d.error) + (d.detail ? ` — ${d.detail}` : "") };
    const a = (d.arbitration ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      tool: opts.tool,
      model: typeof d.model === "string" ? d.model : undefined,
      findingsIn: typeof d.findings_in === "number" ? d.findings_in : undefined,
      inputTruncated: !!d.input_truncated,
      fixList: (a.fix_list ?? []) as unknown as FixListEntry[],
      ceoSheet: (a.ceo_sheet ?? []) as unknown as CeoEntry[],
      dropped: (a.dropped ?? []) as unknown as Array<{ id: string; reason: string }>,
      doubleCheck: (a.double_check ?? null) as string | null,
      summary: (a.summary ?? null) as string | null,
    };
  } catch (e) {
    return { ...base, error: (e as Error).message };
  }
}

// ── Job queue (ptest-run-driver) ────────────────────────────────────────────
// NO CALLER WAITS ON A MODEL CALL. Review and arbitration are enqueued as jobs
// and run as background tasks server-side; the page polls ptest_jobs. This is
// what removes the request-window ceiling on long documents — see
// supabase/functions/ptest-run-driver/index.ts.

/** Queue calls are short control-plane calls, never model calls. */
const DRIVER_TIMEOUT_MS = 30_000;

export interface PtestJobRow {
  id: string;
  tool_slug: string;
  kind: "review" | "arb_document" | "arb_merge";
  assessment_id: string | null;
  company_name: string | null;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  attempts: number;
  error: string | null;
  note: string | null;
  input_truncated: boolean;
  finished_at: string | null;
}

async function driver(action: string, body: Record<string, unknown>) {
  const { data, error } = await invokeResilient(
    "ptest-run-driver",
    { action, ...body },
    DRIVER_TIMEOUT_MS,
  );
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Record<string, unknown>;
  if (d.error) throw new Error(`${d.error}${d.detail ? ` — ${d.detail}` : ""}`);
  return d;
}

export async function enqueuePtestJobs(opts: {
  batchId: string;
  documents: Array<{ tool: string; assessment_id: string; company_name: string }>;
  reviewEffort: PtestEffort;
  arbitrationEffort: PtestEffort;
}): Promise<number> {
  const d = await driver("enqueue", {
    batch_id: opts.batchId,
    documents: opts.documents,
    review_effort: opts.reviewEffort,
    arbitration_effort: opts.arbitrationEffort,
  });
  return typeof d.enqueued === "number" ? d.enqueued : 0;
}

/** Keeps the chain alive. Idle-safe: claims at most one job, never duplicates. */
export async function tickPtestDriver(batchId: string): Promise<void> {
  try {
    await driver("tick", { batch_id: batchId });
  } catch {
    // A failed tick is not fatal: the next poll ticks again, and a job whose
    // worker died is re-queued by the stale-heartbeat rule.
  }
}

export async function cancelPtestJobs(batchId: string): Promise<void> {
  await driver("cancel", { batch_id: batchId });
}

export async function fetchPtestJobs(batchId: string): Promise<PtestJobRow[]> {
  const { data, error } = await supabase
    .from("ptest_jobs")
    .select("id, tool_slug, kind, assessment_id, company_name, status, attempts, error, note, input_truncated, finished_at")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as PtestJobRow[];
}

/** Reads the persisted reviews and the per-product merged verdicts. */
export async function fetchPtestResults(batchId: string): Promise<{
  reviews: DeepReviewResult[];
  arbitrations: ArbitrationResult[];
}> {
  const [rev, arb] = await Promise.all([
    supabase.from("ptest_reviews")
      .select("assessment_id, tool_slug, company_name, reviewer, model, effort, findings, double_check, overall, dropped_unlocatable, error")
      .eq("batch_id", batchId).order("created_at", { ascending: true }),
    supabase.from("ptest_arbitrations")
      .select("tool_slug, model, fix_list, ceo_sheet, dropped, double_check, summary, findings_in, input_truncated, error, arbitration_scope")
      .eq("batch_id", batchId).eq("arbitration_scope", "merge").order("created_at", { ascending: true }),
  ]);
  if (rev.error) throw new Error(rev.error.message);
  if (arb.error) throw new Error(arb.error.message);

  const byDoc = new Map<string, DeepReviewResult>();
  for (const r of rev.data ?? []) {
    const key = String(r.assessment_id);
    if (!byDoc.has(key)) {
      byDoc.set(key, {
        ok: true, tool: r.tool_slug, assessmentId: key,
        companyName: r.company_name ?? "(unnamed)", reviews: {},
      });
    }
    byDoc.get(key)!.reviews[r.reviewer] = {
      reviewer: r.reviewer,
      model: r.model ?? undefined,
      effort: r.effort,
      findings: (r.findings ?? []) as unknown as ReviewFinding[],
      double_check: r.double_check,
      overall: r.overall,
      error: r.error ?? undefined,
    };
  }

  const arbitrations: ArbitrationResult[] = (arb.data ?? []).map((a) => ({
    ok: !a.error,
    tool: a.tool_slug,
    model: a.model ?? undefined,
    findingsIn: a.findings_in ?? undefined,
    inputTruncated: !!a.input_truncated,
    fixList: (a.fix_list ?? []) as unknown as FixListEntry[],
    ceoSheet: (a.ceo_sheet ?? []) as unknown as CeoEntry[],
    dropped: (a.dropped ?? []) as unknown as Array<{ id: string; reason: string }>,
    doubleCheck: a.double_check,
    summary: a.summary,
    error: a.error ?? undefined,
  }));

  return { reviews: Array.from(byDoc.values()), arbitrations };
}

/** Bounded-concurrency map. Three in flight matches the harness's proven
 *  concurrency: enough to keep the batch moving, low enough that the two
 *  providers are never rate-limited into failures. */
export async function mapLimited<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// ── Markdown export ─────────────────────────────────────────────────────────
// FULL TEXT ONLY: no comment, quote or reason is ever truncated in an export.

function fence(s: string | null | undefined): string {
  return (s ?? "").toString().trim() || "—";
}

export function buildPtestMarkdown(opts: {
  batchId: string;
  industry: string;
  effortReview: PtestEffort;
  effortArbitration: PtestEffort;
  reviews: DeepReviewResult[];
  arbitrations: ArbitrationResult[];
}): string {
  const L: string[] = [];
  L.push(`# /all-ptest — deep review & arbitration`);
  L.push("");
  L.push(`- Batch: \`${opts.batchId}\``);
  L.push(`- Industry: ${opts.industry}`);
  L.push(`- Review effort: ${opts.effortReview} · Arbitration effort: ${opts.effortArbitration}`);
  L.push(`- Generated: ${new Date().toISOString()}`);
  L.push("");

  for (const arb of opts.arbitrations) {
    L.push(`## ${arb.tool.toUpperCase()} — arbitration`);
    if (arb.error) { L.push(`**Arbitration failed:** ${arb.error}`); L.push(""); continue; }
    L.push(`Findings arbitrated: ${arb.findingsIn ?? 0}${arb.inputTruncated ? " (input truncated)" : ""} · arbiter: ${arb.model ?? "—"}`);
    L.push("");
    L.push(`**Summary.** ${fence(arb.summary)}`);
    L.push("");
    L.push(`### Agreed fix list (${arb.fixList.length})`);
    if (!arb.fixList.length) L.push("_None._");
    arb.fixList.forEach((f, i) => {
      L.push(`#### ${i + 1}. ${f.title} \`${f.id}\``);
      L.push(`- Status: ${f.status} · raised by: ${f.raised_by} · severity: ${f.severity} · type: ${f.defect_type}`);
      L.push(`- Cause: ${fence(f.cause)} (layer: ${fence(f.cause_layer)})`);
      L.push(`- Code focus: ${fence(f.code_focus)}`);
      L.push(`- Change: ${fence(f.change)}`);
      L.push(`- Regression test: ${fence(f.regression_test)}`);
      if (f.boundary_cases?.length) L.push(`- Boundary cases: ${f.boundary_cases.join("; ")}`);
      (f.occurrences ?? []).forEach((o) => {
        L.push(`  - ${o.product ?? arb.tool} · ${o.document_id ?? "?"} · ${o.section ?? "—"}`);
        L.push(`    > ${fence(o.quote)}`);
      });
      L.push("");
    });
    L.push(`### CEO decision sheet (${arb.ceoSheet.length})`);
    if (!arb.ceoSheet.length) L.push("_None._");
    arb.ceoSheet.forEach((c, i) => {
      L.push(`#### ${i + 1}. ${c.question} \`${c.id}\``);
      L.push(`- Status: ${c.status} · raised by: ${c.raised_by}`);
      L.push(`- Context: ${fence(c.context)}`);
      L.push(`- GPT proposed fix: ${fence(c.gpt_proposed_fix)}`);
      L.push(`- Arbiter reason: ${fence(c.arbiter_reason)}`);
      (c.options ?? []).forEach((o) => L.push(`  - **${o.option}** — ${o.consequence}`));
      L.push("");
    });
    if (arb.dropped.length) {
      L.push(`### Dropped (${arb.dropped.length})`);
      arb.dropped.forEach((d) => L.push(`- \`${d.id}\` — ${d.reason}`));
      L.push("");
    }
    L.push(`**Arbiter double-check.** ${fence(arb.doubleCheck)}`);
    L.push("");
  }

  L.push(`## Raw reviews`);
  for (const r of opts.reviews) {
    L.push(`### ${r.tool} — ${r.companyName} \`${r.assessmentId}\``);
    if (r.error) { L.push(`**Review failed:** ${r.error}`); L.push(""); continue; }
    L.push(`Document: ${r.documentChars ?? "?"} chars${r.documentTruncated ? " (truncated)" : ""}`);
    for (const key of Object.keys(r.reviews)) {
      const rev = r.reviews[key];
      L.push(`#### Reviewer ${key.toUpperCase()} — ${rev.model ?? "—"} (${rev.effort ?? "—"})`);
      if (rev.error) { L.push(`**Failed:** ${rev.error}`); continue; }
      if (rev.note) L.push(`_Note: ${rev.note}_`);
      L.push(`Overall: ${fence(rev.overall)}`);
      L.push(`Double-check: ${fence(rev.double_check)}`);
      const findings = rev.findings ?? [];
      L.push(`Findings: ${findings.length}${rev.dropped_unlocatable?.length ? ` (dropped, unlocatable quote: ${rev.dropped_unlocatable.length})` : ""}`);
      findings.forEach((f, i) => {
        L.push(`${i + 1}. **${f.severity}/${f.defect_type}** — ${f.section ?? "—"} \`${f.id}\``);
        L.push(`   > ${fence(f.quote)}`);
        L.push(`   - Why: ${fence(f.why)}`);
        L.push(`   - Proposed change: ${fence(f.proposed_change)}`);
        L.push(`   - Decision required: ${fence(f.decision_required)}`);
        L.push(`   - Cause layer: ${fence(f.cause_layer)} · code focus: ${fence(f.code_focus)}`);
        L.push(`   - Regression test: ${fence(f.regression_test)}`);
      });
      L.push("");
    }
  }
  return L.join("\n");
}

export function downloadMarkdown(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

/** Session guard mirroring the batch launcher: an expired browser session
 *  makes every admin function answer 403, which reads as a product failure. */
export async function assertAdminSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.access_token) {
    throw new Error("Your session has expired — sign in again to run a batch.");
  }
}
