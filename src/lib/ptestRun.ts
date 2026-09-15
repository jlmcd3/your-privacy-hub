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
import { panelCatalogue } from "@/lib/ptestPanels/index.ts";
import { fromFixturesBody, planLaunch, resolvePanelTools } from "@/lib/ptestPanels/launch.ts";

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
  occurrences: Array<{ document_id?: string; product?: string; section?: string; quote?: string; block_key?: string; company_name?: string | null }>;
  cause: string;
  cause_layer: string;
  code_focus: string;
  change: string | null;
  regression_test: string;
  boundary_cases?: string[];
  // ── DOC 261 v2 fields (present on v2 verdicts) ──
  fix_class?: string | null;
  rule_ref?: string | null;
  class_reason?: string | null;
  gate_reason?: string | null;
  intake_facts?: Array<{ key: string; value: string | null }>;
  registry_rows?: Array<{ id: string; subsection: string; verbatim_quote: string | null }>;
  block?: { kind: string; factor_ids: string[]; sources: string[]; authorities: string[] } | null;
  second_block?: { block_key: string; quote: string | null } | null;
  source_ids?: string[];
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
  fix_class?: string | null;
  rule_ref?: string | null;
  registry_rows?: Array<{ id: string; subsection: string; verbatim_quote: string | null }>;
  intake_facts?: Array<{ key: string; value: string | null }>;
  source_ids?: string[];
}

/** DOC 261 v2 — the per-product verdict metrics (the table is the gate; the number is the trend). */
export interface VerdictMetrics {
  documents?: number;
  queued?: number;
  ceo?: number;
  observed?: number;
  by_class?: Record<string, number>;
  by_route?: Record<string, number>;
  composite_mean?: number | null;
  partial_coverage?: number;
}

export interface ArbitrationResult {
  ok: boolean;
  tool: string;
  model?: string;
  findingsIn?: number;
  inputTruncated?: boolean;
  fixList: FixListEntry[];
  ceoSheet: CeoEntry[];
  dropped: Array<{ id: string; reason: string; kind?: string; block_key?: string; quote?: string; fix_class?: string }>;
  doubleCheck: string | null;
  summary: string | null;
  /** Post-arbitration score: 100 minus the severity weight of each agreed fix (v2: composite mean). */
  agreedScore?: number | null;
  /** True when at least one contributing document was arbitrated on one reviewer (v2: a worker failed). */
  singleReviewer?: boolean;
  /** v2 only. */
  metrics?: VerdictMetrics | null;
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

/** Job kinds. v2 (DOC 261): generate · lint · review_record · review_law_claude ·
 *  review_law_gpt · review_reason · classify · arb_merge. Legacy: review ·
 *  review_gpt · review_claude · arb_document. */
export type PtestJobKind =
  | "generate" | "lint" | "review_record" | "review_law_claude" | "review_law_gpt" | "review_reason" | "classify"
  | "review" | "review_gpt" | "review_claude" | "arb_document" | "arb_merge";

export const JOB_KIND_LABELS: Record<PtestJobKind, string> = {
  generate: "generate (golden, ×2 determinism)",
  lint: "lint",
  review_record: "W-RECORD (Claude)",
  review_law_claude: "W-LAW (Claude)",
  review_law_gpt: "W-LAW (GPT)",
  review_reason: "W-REASON (GPT)",
  classify: "classify + gate",
  review: "review (both)",
  review_gpt: "review (GPT)",
  review_claude: "review (Claude)",
  arb_document: "arbitration document",
  arb_merge: "merge",
};

export function jobKindLabel(kind: string): string {
  return JOB_KIND_LABELS[kind as PtestJobKind] ?? kind;
}

/** True for a kind that runs before the per-document classification. */
export function isReviewPhaseKind(kind: string): boolean {
  return kind === "generate" || kind === "lint" || kind.startsWith("review");
}

export interface PtestJobRow {
  id: string;
  tool_slug: string;
  kind: PtestJobKind | string;
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
  /** DOC 261 — also regenerate and review the golden panel for these products. */
  golden?: boolean;
  products?: string[];
  /** YYYY-MM-DD injected as the report date (defaults to today server-side). */
  reportDate?: string;
  mode?: "v2" | "legacy";
}): Promise<{ enqueued: number; goldens: number }> {
  const d = await driver("enqueue", {
    batch_id: opts.batchId,
    documents: opts.documents,
    review_effort: opts.reviewEffort,
    arbitration_effort: opts.arbitrationEffort,
    golden: opts.golden === true,
    products: opts.products ?? [],
    report_date: opts.reportDate,
    mode: opts.mode ?? "v2",
  });
  return { enqueued: typeof d.enqueued === "number" ? d.enqueued : 0, goldens: typeof d.goldens === "number" ? d.goldens : 0 };
}

// ── Fixture panel (CEO 2026-09-14): one committed fixture per product, at random ──

export interface PanelPickRow {
  tool: string;
  id: string;
  label: string;
  company: string;
  sector: string;
  geo: string;
}

export interface PanelCatalogueRow {
  tool: string;
  size: number;
  expected: number;
  fixtures: Array<{ id: string; label: string; company: string; sector: string; geo: string }>;
}

/**
 * The panel catalogue (ids/labels only, no intakes) — read straight out of
 * the panel module now that it ships in the app bundle instead of behind a
 * dedicated edge function (removed — its panel fixtures could not ship
 * inside an edge function bundle). Kept async so callers written against the
 * old network call keep working unchanged.
 */
export async function fetchPanelCatalogue(): Promise<PanelCatalogueRow[]> {
  return panelCatalogue();
}

/**
 * Launch a stress batch on randomly picked panel fixtures (per_product each,
 * 1–8). Returns the stress batch id (polled exactly like the Claude-intake
 * batch) and the picks, with the seed that reproduces them.
 *
 * Picking used to happen inside a dedicated edge function (removed — its
 * ~2 MB of panel fixtures could not ship inside an edge function bundle).
 * The pick is now made here, in the browser, with the same pure helpers
 * (`resolvePanelTools` / `planLaunch` / `fromFixturesBody`) the old function
 * called; only the `start-stress-batch` `action: "from_fixtures"` call still
 * crosses the network, exactly as the old function made it — except now with
 * the caller's own session token (AUTH-GATE, mirroring launchClaudeIntakeBatch
 * in src/lib/claudeIntake.ts) instead of a service key.
 */
export async function launchFixtureBatch(opts: {
  userId: string;
  products: string[];
  perProduct: number;
  seed?: string | number;
  label?: string;
}): Promise<{ batchId: string; seed: number; picks: PanelPickRow[]; emptyPanels: string[] }> {
  // AUTH-GATE (mirrors launchClaudeIntakeBatch, src/lib/claudeIntake.ts ~106-113):
  // start-stress-batch is admin-only. When the browser session has lapsed,
  // supabase-js falls back to the publishable key as the bearer, which the
  // auth server rejects (bad_jwt) and the function answers 403 forbidden —
  // check first and fail with a clear message instead.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    throw new Error("Your session has expired — sign in again to start a batch.");
  }

  const tools = resolvePanelTools(opts.products);
  if (!tools.length) throw new Error("no_products: products[] must name at least one known product");

  const plan = planLaunch(tools, opts.perProduct, opts.seed);
  if (!plan.picks.length) {
    throw new Error(`empty_panels: no fixtures on the panel for ${plan.empty.join(", ")}`);
  }

  const body = fromFixturesBody(opts.userId, plan, opts.label);
  // Same call the old edge function made to start-stress-batch, just from
  // here: invokeResilient uses supabase.functions.invoke, which sends the
  // caller's own session token — never a service key.
  const { data, error } = await invokeResilient("start-stress-batch", body, DRIVER_TIMEOUT_MS * 3);
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Record<string, unknown>;
  if (d.error) throw new Error(`${d.error}${d.detail ? ` — ${d.detail}` : ""}`);
  if (!d.batch_id) throw new Error("launch_failed: start-stress-batch returned no batch_id");

  const picks: PanelPickRow[] = plan.picks.map(({ tool, fixture }) => ({
    tool, id: fixture.id, label: fixture.label, company: fixture.company, sector: fixture.sector, geo: fixture.geo,
  }));
  return {
    batchId: String(d.batch_id),
    seed: plan.seed,
    picks,
    emptyPanels: [...plan.empty],
  };
}

// ── Golden panel (DOC 261 Stage 0 / §3.5) ───────────────────────────────────

export interface PtestGoldenRow {
  id: string;
  product: string;
  source: "fixture" | "assessment" | string;
  ref: string;
  label: string;
  enabled: boolean;
  assessment_id: string | null;
  created_at?: string;
}

/** A batch id is required by the driver's auth wrapper; the panel actions ignore it. */
const PANEL_BATCH = "00000000-0000-0000-0000-000000000000";

export async function seedGoldenPanel(): Promise<PtestGoldenRow[]> {
  const d = await driver("golden_seed", { batch_id: PANEL_BATCH });
  return (d.goldens ?? []) as PtestGoldenRow[];
}

export async function listGoldenPanel(): Promise<PtestGoldenRow[]> {
  const d = await driver("golden_list", { batch_id: PANEL_BATCH });
  return (d.goldens ?? []) as PtestGoldenRow[];
}

export async function addGoldenFromAssessment(product: string, assessmentId: string, label?: string): Promise<PtestGoldenRow> {
  const d = await driver("golden_add", { batch_id: PANEL_BATCH, product, assessment_id: assessmentId, label });
  return d.golden as PtestGoldenRow;
}

export async function toggleGolden(goldenId: string, enabled: boolean): Promise<void> {
  await driver("golden_toggle", { batch_id: PANEL_BATCH, golden_id: goldenId, enabled });
}

// ── Before/after diff (DOC 261 Stage 7) ─────────────────────────────────────

export interface DiffFinding {
  key: string;
  block_key: string;
  quote: string;
  severity: string | null;
  fix_class: string | null;
  route: string | null;
  raised_by: string[];
}

export interface GoldenDiff {
  golden_ref: string;
  product: string;
  label: string | null;
  assessment_before: string | null;
  assessment_after: string | null;
  gone: DiffFinding[];
  persists: DiffFinding[];
  new: DiffFinding[];
  lint_before: Record<string, number>;
  lint_after: Record<string, number>;
  composite_before: number | null;
  composite_after: number | null;
  routes_before: Record<string, number>;
  routes_after: Record<string, number>;
}

export interface BatchDiff {
  batch_before: string;
  batch_after: string;
  comparable: boolean;
  settings_note: string | null;
  goldens: GoldenDiff[];
  accepted: boolean;
  acceptance_note: string;
}

export async function fetchBatchDiff(batchBefore: string, batchAfter: string): Promise<BatchDiff> {
  const d = await driver("diff", { batch_id: batchAfter, batch_before: batchBefore });
  return d.diff as BatchDiff;
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
      .select("assessment_id, tool_slug, company_name, reviewer, model, effort, findings, double_check, overall, dropped_unlocatable, error, dimension_scores, overall_score, derived_score, score_source, score_notes")
      .eq("batch_id", batchId).order("created_at", { ascending: true }),
    supabase.from("ptest_arbitrations")
      .select("tool_slug, model, fix_list, ceo_sheet, dropped, double_check, summary, findings_in, input_truncated, error, arbitration_scope, agreed_score, single_reviewer, metrics")
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
      dimension_scores: (r.dimension_scores ?? null) as unknown as Record<string, number> | null,
      overall_score: r.overall_score === null ? null : Number(r.overall_score),
      derived_score: r.derived_score === null ? null : Number(r.derived_score),
      score_source: r.score_source ?? null,
      score_notes: r.score_notes ?? null,
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
    agreedScore: a.agreed_score === null || a.agreed_score === undefined ? null : Number(a.agreed_score),
    singleReviewer: a.single_reviewer === true,
    metrics: (a.metrics ?? null) as unknown as VerdictMetrics | null,
    error: a.error ?? undefined,
  }));

  return { reviews: Array.from(byDoc.values()), arbitrations };
}

// ── Scoring (read-only reporting) ───────────────────────────────────────────
// Scores are derived from rows that already exist. Nothing here changes what is
// reviewed, arbitrated or tracked; a missing score reads as "—", never as zero.

export interface ProductScoreRow {
  tool: string;
  claude: number | null;
  gpt: number | null;
  combined: number | null;
  derived: number | null;
  arbitration: number | null;
  documents: number;
  /** v2 (DOC 261): the class/route table beside the number. */
  queued?: number | null;
  ceo?: number | null;
  observed?: number | null;
  by_class?: Record<string, number> | null;
  partial_coverage?: number | null;
}

const meanOf = (xs: Array<number | null | undefined>): number | null => {
  const n = xs.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!n.length) return null;
  return Math.round((n.reduce((a, b) => a + b, 0) / n.length) * 10) / 10;
};

export function buildScoreMatrix(
  reviews: DeepReviewResult[],
  arbitrations: ArbitrationResult[],
): { rows: ProductScoreRow[]; batchMean: number | null } {
  const byTool = new Map<string, { claude: number[]; gpt: number[]; derived: number[]; docs: number }>();
  for (const doc of reviews) {
    const slot = byTool.get(doc.tool) ?? { claude: [], gpt: [], derived: [], docs: 0 };
    byTool.set(doc.tool, slot);
    slot.docs += 1;
    for (const key of Object.keys(doc.reviews)) {
      const r = doc.reviews[key];
      if (r.error) continue;
      if (typeof r.overall_score === "number") (key === "claude" ? slot.claude : slot.gpt).push(r.overall_score);
      if (typeof r.derived_score === "number") slot.derived.push(r.derived_score);
    }
  }
  const arbByTool = new Map(arbitrations.filter((a) => !a.error).map((a) => [a.tool, a]));
  // v2 verdicts carry metrics; the composite mean is the number, the route/class
  // counts are the table (DOC 261 Rev 2 §0A V6).
  for (const a of arbitrations) if (!a.error && !byTool.has(a.tool)) byTool.set(a.tool, { claude: [], gpt: [], derived: [], docs: a.metrics?.documents ?? 0 });
  const rows: ProductScoreRow[] = Array.from(byTool.entries()).map(([tool, s]) => {
    const a = arbByTool.get(tool);
    const m = a?.metrics ?? null;
    const legacyCombined = meanOf([...s.claude, ...s.gpt]);
    return {
      tool,
      claude: meanOf(s.claude),
      gpt: meanOf(s.gpt),
      combined: legacyCombined ?? (m ? (m.composite_mean ?? a?.agreedScore ?? null) : null),
      derived: meanOf(s.derived),
      arbitration: a?.agreedScore ?? null,
      documents: m?.documents ?? s.docs,
      queued: m?.queued ?? null,
      ceo: m?.ceo ?? null,
      observed: m?.observed ?? null,
      by_class: m?.by_class ?? null,
      partial_coverage: m?.partial_coverage ?? null,
    };
  });
  return { rows, batchMean: meanOf(rows.map((r) => r.combined)) };
}

export interface ReviewScoreRow {
  assessment_id: string;
  tool_slug: string;
  company_name: string | null;
  reviewer: string;
  overall_score: number | null;
  derived_score: number | null;
  error: string | null;
}

/** Light poll read so the run log can report each document's score as it lands. */
export async function fetchReviewScores(batchId: string): Promise<ReviewScoreRow[]> {
  const { data, error } = await supabase
    .from("ptest_reviews")
    .select("assessment_id, tool_slug, company_name, reviewer, overall_score, derived_score, error")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    assessment_id: String(r.assessment_id),
    tool_slug: r.tool_slug,
    company_name: r.company_name,
    reviewer: r.reviewer,
    overall_score: r.overall_score === null ? null : Number(r.overall_score),
    derived_score: r.derived_score === null ? null : Number(r.derived_score),
    error: r.error,
  }));
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

  const { rows: scoreRows, batchMean } = buildScoreMatrix(opts.reviews, opts.arbitrations);
  if (scoreRows.length) {
    const n = (v: number | null) => (v === null ? "—" : v.toFixed(1));
    L.push(`## Batch scores (batch mean ${n(batchMean)})`);
    L.push("");
    const v2 = scoreRows.some((r) => r.queued !== null && r.queued !== undefined);
    if (v2) {
      L.push("| Product | Documents | Composite | Queued | CEO | Observed | Classes | Partial coverage |");
      L.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
      scoreRows.forEach((r) => {
        const classes = r.by_class ? Object.entries(r.by_class).map(([k, v]) => `${k} ${v}`).join(", ") : "—";
        L.push(`| ${r.tool} | ${r.documents} | ${n(r.combined)} | ${r.queued ?? "—"} | ${r.ceo ?? "—"} | ${r.observed ?? "—"} | ${classes} | ${r.partial_coverage ?? 0} |`);
      });
    } else {
      L.push("| Product | Documents | Claude | ChatGPT | Combined | Derived (cross-check) | Post-arbitration |");
      L.push("| --- | --- | --- | --- | --- | --- | --- | --- |".slice(0, 41));
      scoreRows.forEach((r) => {
        L.push(`| ${r.tool} | ${r.documents} | ${n(r.claude)} | ${n(r.gpt)} | ${n(r.combined)} | ${n(r.derived)} | ${n(r.arbitration)} |`);
      });
    }
    L.push("");
  }

  for (const arb of opts.arbitrations) {
    const isV2 = !!arb.metrics;
    L.push(`## ${arb.tool.toUpperCase()} — ${isV2 ? "verdict (deterministic merge)" : "arbitration"}${arb.singleReviewer ? (isV2 ? " (partial coverage)" : " (single reviewer)") : ""}`);
    if (arb.error) { L.push(`**${isV2 ? "Merge" : "Arbitration"} failed:** ${arb.error}`); L.push(""); continue; }
    L.push(`Findings ${isV2 ? "merged" : "arbitrated"}: ${arb.findingsIn ?? 0}${arb.inputTruncated ? " (input truncated)" : ""} · ${isV2 ? "no model call" : `arbiter: ${arb.model ?? "—"}`}`);
    L.push("");
    L.push(`**Summary.** ${fence(arb.summary)}`);
    L.push("");
    L.push(`### ${isV2 ? "Queued fix list" : "Agreed fix list"} (${arb.fixList.length})`);
    if (!arb.fixList.length) L.push("_None._");
    arb.fixList.forEach((f, i) => {
      L.push(`#### ${i + 1}. ${f.title} \`${f.id}\``);
      L.push(`- Status: ${f.status} · raised by: ${f.raised_by} · severity: ${f.severity} · type: ${f.defect_type}`);
      if (f.fix_class) L.push(`- Class: ${f.fix_class} · rule/clause: ${fence(f.rule_ref)} · gate: ${fence(f.gate_reason)}`);
      if (f.class_reason) L.push(`- Classifier reason: ${f.class_reason}`);
      L.push(`- Cause: ${fence(f.cause)} (layer: ${fence(f.cause_layer)})`);
      L.push(`- Code focus: ${fence(f.code_focus)}`);
      if (f.block) L.push(`- Block: ${f.block.kind} · factors ${f.block.factor_ids.join(", ") || "—"} · reads ${f.block.sources.join(", ") || "—"} · cites ${f.block.authorities.join("; ") || "—"}`);
      (f.intake_facts ?? []).forEach((x) => L.push(`- Intake: \`${x.key}\` = ${fence(x.value)}`));
      (f.registry_rows ?? []).forEach((r) => L.push(`- Registry ${r.id} (${r.subsection}): "${fence(r.verbatim_quote)}"`));
      L.push(`- Change: ${fence(f.change)}`);
      L.push(`- ${f.fix_class ? "Acceptance test" : "Regression test"}: ${fence(f.regression_test)}`);
      if (f.boundary_cases?.length) L.push(`- Boundary cases: ${f.boundary_cases.join("; ")}`);
      (f.occurrences ?? []).forEach((o) => {
        L.push(`  - ${o.product ?? arb.tool} · ${o.company_name ?? o.document_id ?? "?"} · ${o.block_key ?? o.section ?? "—"}`);
        L.push(`    > ${fence(o.quote)}`);
      });
      if (f.second_block) L.push(`  - second block ${f.second_block.block_key}: > ${fence(f.second_block.quote)}`);
      L.push("");
    });
    L.push(`### CEO decision sheet (${arb.ceoSheet.length})`);
    if (!arb.ceoSheet.length) L.push("_None._");
    arb.ceoSheet.forEach((c, i) => {
      L.push(`#### ${i + 1}. ${c.question} \`${c.id}\``);
      L.push(`- Status: ${c.status} · raised by: ${c.raised_by}`);
      if (c.fix_class) L.push(`- Class: ${c.fix_class} · rule/clause: ${fence(c.rule_ref)}`);
      L.push(`- Context: ${fence(c.context)}`);
      (c.intake_facts ?? []).forEach((x) => L.push(`- Intake: \`${x.key}\` = ${fence(x.value)}`));
      (c.registry_rows ?? []).forEach((r) => L.push(`- Registry ${r.id} (${r.subsection}): "${fence(r.verbatim_quote)}"`));
      if (!isV2) L.push(`- GPT proposed fix: ${fence(c.gpt_proposed_fix)}`);
      L.push(`- ${isV2 ? "Classifier" : "Arbiter"} reason: ${fence(c.arbiter_reason)}`);
      (c.options ?? []).forEach((o) => L.push(`  - **${o.option}** — ${o.consequence}`));
      L.push("");
    });
    if (arb.dropped.length) {
      L.push(`### ${isV2 ? "Observed, intake artifacts, lint backlog and merges" : "Dropped"} (${arb.dropped.length})`);
      arb.dropped.forEach((d) => L.push(`- \`${d.id}\`${d.block_key ? ` · ${d.block_key}` : ""} — ${d.reason}${d.quote ? `\n  > ${d.quote}` : ""}`));
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
      const isWorker = key.includes("/") || key === "LINT";
      L.push(`#### ${isWorker ? "Worker" : "Reviewer"} ${isWorker ? key : key.toUpperCase()} — ${rev.model ?? "—"} (${rev.effort ?? "—"})`);
      if (rev.error) { L.push(`**Failed:** ${rev.error}`); continue; }
      if (rev.note) L.push(`_Note: ${rev.note}_`);
      L.push(isWorker
        ? `Validated findings deduction: ${typeof rev.derived_score === "number" ? rev.derived_score.toFixed(1) : "—"}${rev.score_notes ? ` · ⚠ ${rev.score_notes}` : ""}`
        : `Score: ${typeof rev.overall_score === "number" ? rev.overall_score.toFixed(1) : "—"} (reported) · ${typeof rev.derived_score === "number" ? rev.derived_score.toFixed(1) : "—"} (derived from findings)${rev.score_notes ? ` · ⚠ ${rev.score_notes}` : ""}`);
      if (rev.dimension_scores) {
        L.push(`Dimensions: ${Object.entries(rev.dimension_scores).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
      }
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
