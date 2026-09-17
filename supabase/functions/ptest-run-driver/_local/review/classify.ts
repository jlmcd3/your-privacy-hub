// /all-ptest v2 (DOC 261, 2026-09-14) — STAGE 4: CLASSIFY, DEDUPE, GATE, ROUTE.
//
// There is no arbiter that re-judges merits. Per document:
//   1. read the validated worker findings and the lint hits;
//   2. DEDUPE deterministically by (block key, normalised quote), merging who
//      raised each (worker/vendor);
//   3. ONE small model pass assigns a fix class to each deduped finding
//      (rule_bug | clause_defect | missing_structured_input | presentation |
//      judgment | intake_artifact) with the rule/clause it binds to;
//   4. the QUEUE GATE (Rev 2 §0A V8), in code:
//        queued  = class ∈ {rule_bug, clause_defect, missing_structured_input}
//                  AND (severity critical|high OR ≥2 workers/vendors OR persists
//                  on the same document from an earlier batch)
//               OR class = presentation AND no lint rule covers it
//        judgment → CEO sheet; intake_artifact → intake list;
//        everything else → observed, not queued (visible, promotable by hand)
//   5. persist the document verdict as a ptest_arbitrations row
//      (scope "document") in the shape the page already reads, plus the
//      per-finding classification on ptest_findings.
// Per product, mergeProductV2 unions the document verdicts deterministically
// (scope "merge") — again no model.

import { CLASSIFY_SYSTEM, buildClassifyUserTurn, PTEST_V2_PROMPT_VERSION, type ClassifyInputFinding } from "./prompts-v2.ts";
import { CLASSIFY_JSON_SCHEMA, FIX_CLASSES, type FixClass } from "./json-schemas-v2.ts";
import { callClaude, parseJsonObject, type Effort } from "../../../_shared/review/model-calls.ts";
import { normalise } from "./validate-v2.ts";
import { SEVERITY_WEIGHTS } from "../../../_shared/review/scores.ts";
import { blockCatalogueFor, registryPackFor, registryRowById } from "./packs/index.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;
type Bag = Record<string, unknown>;

export const QUEUEABLE_CLASSES: readonly FixClass[] = ["rule_bug", "clause_defect", "missing_structured_input"];

export interface FindingRow {
  id: string;
  finding_id: string;
  worker: string;
  vendor: string | null;
  status: string;
  kind: string | null;
  severity: string | null;
  confidence: string | null;
  block_key: string | null;
  block_key_b: string | null;
  quote: string | null;
  quote_b: string | null;
  why: string | null;
  intake_key: string | null;
  intake_value: string | null;
  registry_row_id: string | null;
  registry_quote: string | null;
  binding: string | null;
  rule_ref: string | null;
  fix_class: string | null;
}

export interface DedupedFinding {
  readonly key: string;
  readonly id: string;
  readonly row_ids: string[];
  readonly workers: string[];
  readonly vendors: string[];
  readonly raised_by: string[];
  readonly block_key: string;
  readonly block_key_b: string | null;
  readonly quote: string;
  readonly quote_b: string | null;
  readonly severity: "critical" | "high" | "editorial";
  readonly kind: string | null;
  readonly why: string;
  readonly intake_key: string | null;
  readonly intake_value: string | null;
  readonly registry_row_id: string | null;
  readonly registry_quote: string | null;
  readonly binding: string | null;
  readonly is_lint: boolean;
  readonly lint_rule: string | null;
}

const SEV_RANK: Record<string, number> = { critical: 3, high: 2, editorial: 1 };
const higher = (a: string, b: string): "critical" | "high" | "editorial" =>
  ((SEV_RANK[a] ?? 0) >= (SEV_RANK[b] ?? 0) ? a : b) as "critical" | "high" | "editorial";

export function dedupeKey(blockKey: string, quote: string): string {
  return `${blockKey}|${normalise(quote).slice(0, 160)}`;
}

/** Deterministic dedupe of validated rows by (block key, normalised quote). */
export function dedupeFindings(rows: readonly FindingRow[]): DedupedFinding[] {
  const map = new Map<string, DedupedFinding>();
  let n = 0;
  for (const r of rows) {
    if (r.status !== "validated" || !r.block_key || !r.quote) continue;
    const key = dedupeKey(r.block_key, r.quote);
    const label = r.vendor ? `${r.worker}/${r.vendor}` : r.worker;
    const isLint = r.worker === "LINT";
    const cur = map.get(key);
    if (!cur) {
      n += 1;
      map.set(key, {
        key, id: `f${n}`, row_ids: [r.id], workers: [r.worker], vendors: r.vendor ? [r.vendor] : [], raised_by: [label],
        block_key: r.block_key, block_key_b: r.block_key_b, quote: r.quote, quote_b: r.quote_b,
        severity: (SEV_RANK[r.severity ?? ""] ? r.severity : "editorial") as "critical" | "high" | "editorial",
        kind: r.kind, why: r.why ?? "", intake_key: r.intake_key, intake_value: r.intake_value,
        registry_row_id: r.registry_row_id, registry_quote: r.registry_quote, binding: r.binding,
        is_lint: isLint, lint_rule: isLint ? r.rule_ref : null,
      });
      continue;
    }
    const merged: DedupedFinding = {
      ...cur,
      row_ids: [...cur.row_ids, r.id],
      workers: [...new Set([...cur.workers, r.worker])],
      vendors: [...new Set([...cur.vendors, ...(r.vendor ? [r.vendor] : [])])],
      raised_by: [...new Set([...cur.raised_by, label])],
      severity: higher(cur.severity, r.severity ?? "editorial"),
      why: cur.why || (r.why ?? ""),
      intake_key: cur.intake_key ?? r.intake_key,
      intake_value: cur.intake_value ?? r.intake_value,
      registry_row_id: cur.registry_row_id ?? r.registry_row_id,
      registry_quote: cur.registry_quote ?? r.registry_quote,
      binding: cur.binding ?? r.binding,
      block_key_b: cur.block_key_b ?? r.block_key_b,
      quote_b: cur.quote_b ?? r.quote_b,
      is_lint: cur.is_lint && isLint,
      lint_rule: cur.lint_rule ?? (isLint ? r.rule_ref : null),
    };
    map.set(key, merged);
  }
  return [...map.values()];
}

export interface Classification { fix_class: FixClass; rule_ref: string | null; reason: string }

export interface GateDecision {
  readonly route: "fix_list" | "ceo_sheet" | "intake_list" | "observed" | "lint_backlog";
  readonly queued: boolean;
  readonly reason: string;
}

/** The queue gate, in code (Rev 2 §0A V8). */
export function gate(
  f: DedupedFinding,
  c: Classification,
  ctx: { persists: boolean; lintCovered: boolean },
): GateDecision {
  const multi = f.workers.length >= 2 || f.vendors.length >= 2;
  if (c.fix_class === "judgment") return { route: "ceo_sheet", queued: false, reason: "judgment — a human decides" };
  if (c.fix_class === "intake_artifact") return { route: "intake_list", queued: false, reason: "intake artifact — the defect is in the synthetic intake, not the engine" };
  if (c.fix_class === "presentation") {
    if (f.is_lint) return { route: "fix_list", queued: true, reason: `lint ${f.lint_rule ?? ""} — class (d), fixed without model review` };
    if (ctx.lintCovered) return { route: "lint_backlog", queued: false, reason: "a lint rule already covers this block; fix the rule, not the document" };
    return { route: "fix_list", queued: true, reason: "presentation defect no lint rule covers" };
  }
  if (QUEUEABLE_CLASSES.includes(c.fix_class)) {
    if (f.severity === "critical" || f.severity === "high") return { route: "fix_list", queued: true, reason: `${c.fix_class}, severity ${f.severity}` };
    if (multi) return { route: "fix_list", queued: true, reason: `${c.fix_class}, raised by ${f.raised_by.join(" + ")}` };
    if (ctx.persists) return { route: "fix_list", queued: true, reason: `${c.fix_class}, persists from an earlier batch on this document` };
    return { route: "observed", queued: false, reason: `${c.fix_class}, editorial severity, single raiser, not previously seen` };
  }
  return { route: "observed", queued: false, reason: `unclassified (${c.fix_class})` };
}

/** A W-LAW finding that says the pack has no row for the provision a block
 *  cites. It is a registry-coverage gap, never a document defect (doc 263
 *  run 1, 2026-09-17): it is scored nowhere and classified by code. */
export function isRegistryGap(f: { binding?: string | null; why?: string | null; workers?: readonly string[]; worker?: string | null }): boolean {
  const fromLaw = f.workers ? f.workers.includes("W-LAW") : f.worker === "W-LAW";
  return fromLaw && ((f.binding ?? "") === "no_row" || /^\s*NO ROW\b/i.test(f.why ?? ""));
}

export function compositeScore(deduped: readonly DedupedFinding[]): number {
  let deduction = 0;
  for (const f of deduped) {
    if (isRegistryGap(f)) continue;
    deduction += f.is_lint ? 2 : (SEVERITY_WEIGHTS[f.severity] ?? 3);
  }
  return Math.max(0, Math.min(100, Math.round((100 - deduction) * 10) / 10));
}

// ── Fix brief fields (Stage 5) ──────────────────────────────────────────────

function registryRowsFor(tool: string, f: DedupedFinding): Array<{ id: string; subsection: string; verbatim_quote: string | null }> {
  const pack = registryPackFor(tool);
  if (!pack) return [];
  const ids = new Set<string>();
  if (f.registry_row_id) ids.add(f.registry_row_id);
  return [...ids].map((id) => registryRowById(pack, id)).filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => ({ id: r.proposition_key, subsection: r.subsection, verbatim_quote: r.verbatim_quote }));
}

function catalogueEntryFor(tool: string, blockKey: string) {
  const cat = blockCatalogueFor(tool);
  return cat?.entries.find((e) => e.block_key === blockKey) ?? null;
}

function acceptanceTest(f: DedupedFinding, c: Classification, assessmentId: string): string {
  const what = f.kind ? ` (${f.kind})` : "";
  return `Regenerate assessment ${assessmentId} from its stored intake; block ${f.block_key} must no longer read "${f.quote.slice(0, 120)}"${what}; the surrounding blocks must be unchanged; add the case to the golden tests for ${c.rule_ref ?? f.block_key}.`;
}

export function fixListEntry(tool: string, assessmentId: string, f: DedupedFinding, c: Classification, g: GateDecision, companyName: string | null): Bag {
  const cat = catalogueEntryFor(tool, f.block_key);
  return {
    id: f.id,
    title: `${c.fix_class} @ ${f.block_key}: ${f.why.slice(0, 90)}`,
    status: g.queued ? "queued" : "observed",
    raised_by: f.raised_by.join(" + "),
    severity: f.severity,
    defect_type: f.is_lint ? "editorial" : (f.kind ?? "factual"),
    fix_class: c.fix_class,
    rule_ref: c.rule_ref,
    class_reason: c.reason,
    gate_reason: g.reason,
    occurrences: [{ document_id: assessmentId, product: tool, section: f.block_key, quote: f.quote, block_key: f.block_key, company_name: companyName }],
    cause: f.why,
    cause_layer: c.fix_class,
    code_focus: c.rule_ref ?? (cat?.factor_ids.join(", ") || f.block_key),
    change: null,
    regression_test: acceptanceTest(f, c, assessmentId),
    boundary_cases: [],
    intake_facts: f.intake_key ? [{ key: f.intake_key, value: f.intake_value }] : [],
    registry_rows: registryRowsFor(tool, f),
    block: cat ? { kind: cat.kind, factor_ids: cat.factor_ids, sources: cat.sources, authorities: cat.authorities } : null,
    second_block: f.block_key_b ? { block_key: f.block_key_b, quote: f.quote_b } : null,
  };
}

export function ceoEntry(tool: string, assessmentId: string, f: DedupedFinding, c: Classification, companyName: string | null): Bag {
  return {
    id: f.id,
    question: `Is this a defect the engine should own? ${f.why.slice(0, 200)}`,
    status: "judgment",
    raised_by: f.raised_by.join(" + "),
    context: `${tool} · ${companyName ?? assessmentId} · block ${f.block_key}: "${f.quote.slice(0, 300)}"`,
    gpt_proposed_fix: null,
    arbiter_reason: c.reason,
    fix_class: c.fix_class,
    rule_ref: c.rule_ref,
    registry_rows: registryRowsFor(tool, f),
    intake_facts: f.intake_key ? [{ key: f.intake_key, value: f.intake_value }] : [],
    options: [
      { option: "Adopt as a clause defect", consequence: "the fixed clause is changed against the registry text; no new field" },
      { option: "Adopt as a missing structured input", consequence: "a typed intake field and a rule that reads it; the document says 'not recorded' until it exists" },
      { option: "Decline", consequence: "the document stands as generated; recorded as a ruling so the finding does not recur" },
    ],
  };
}

// ── The document classify job ───────────────────────────────────────────────

export interface ClassifyOutcome { ok: boolean; status: number; body: Bag; rowId?: string }

async function classifyWithModel(tool: string, deduped: readonly DedupedFinding[], effort: Effort, sourceRowId: string) {
  const input: ClassifyInputFinding[] = deduped.map((f) => {
    const cat = catalogueEntryFor(tool, f.block_key);
    return {
      id: f.id, worker: f.workers.join("+"), raised_by: f.raised_by, block_key: f.block_key,
      block_kind: cat?.kind ?? null, factor_ids: cat?.factor_ids ?? [], kind: f.kind, severity: f.severity,
      quote: f.quote.slice(0, 400), why: f.why.slice(0, 600),
      intake_key: f.intake_key, intake_value: f.intake_value?.slice(0, 200) ?? null,
      registry_row_id: f.registry_row_id, binding: f.binding, block_key_b: f.block_key_b, quote_b: f.quote_b?.slice(0, 300) ?? null,
    };
  });
  const res = await callClaude({
    system: CLASSIFY_SYSTEM,
    user: buildClassifyUserTurn(tool, input),
    effort,
    maxTokens: 16_000,
    label: "ptest-classify",
    product: tool,
    sourceRowId,
    jsonSchema: CLASSIFY_JSON_SCHEMA,
  });
  const parsed = parseJsonObject(res.text);
  if (!parsed) throw new Error(`classifier returned unparseable JSON (${res.text.length} chars)`);
  const out = new Map<string, Classification>();
  for (const c of Array.isArray(parsed.classifications) ? parsed.classifications as Bag[] : []) {
    const id = String(c.finding_id ?? "");
    const cls = String(c.fix_class ?? "");
    if (!id || !(FIX_CLASSES as readonly string[]).includes(cls)) continue;
    out.set(id, { fix_class: cls as FixClass, rule_ref: typeof c.rule_ref === "string" && c.rule_ref.trim() ? c.rule_ref.trim() : null, reason: String(c.reason ?? "") });
  }
  return { classifications: out, res };
}

/** Test seam: the classification call, injectable so the gate/route path runs hermetically. */
export type Classifier = (tool: string, deduped: readonly DedupedFinding[]) => Promise<{ classifications: Map<string, Classification>; model: string | null; usage: Bag | null }>;

const defaultClassifier = (effort: Effort, sourceRowId: string): Classifier => async (tool, deduped) => {
  const out = await classifyWithModel(tool, deduped, effort, sourceRowId);
  return {
    classifications: out.classifications,
    model: out.res.model,
    usage: { input_tokens: out.res.inputTokens, output_tokens: out.res.outputTokens, cache_read_tokens: out.res.cacheReadTokens, cache_creation_tokens: out.res.cacheCreationTokens, elapsed_ms: out.res.elapsedMs },
  };
};

export async function runClassifyJob(admin: Admin, opts: {
  batchId: string; tool: string; assessmentId: string; companyName?: string | null; effort: Effort; userId?: string | null; parentJobId?: string | null;
  classifier?: Classifier;
}): Promise<ClassifyOutcome> {
  const base = {
    batch_id: opts.batchId, tool_slug: opts.tool, arbitration_scope: "document", assessment_id: opts.assessmentId,
    parent_job_id: opts.parentJobId ?? null, prompt_version: PTEST_V2_PROMPT_VERSION, run_by: opts.userId ?? null,
  };

  // 1. Coverage: every worker of this document must have a review row.
  const { data: reviews, error: rErr } = await admin.from("ptest_reviews")
    .select("id, worker, vendor, error").eq("batch_id", opts.batchId).eq("tool_slug", opts.tool).eq("assessment_id", opts.assessmentId);
  if (rErr) return { ok: false, status: 500, body: { error: "review_read_failed", detail: rErr.message } };
  const workerRows = ((reviews ?? []) as Array<{ worker: string | null; vendor: string | null; error: string | null }>).filter((r) => r.worker && r.worker !== "LINT");
  const failed = workerRows.filter((r) => r.error).map((r) => `${r.worker}/${r.vendor}: ${r.error}`);
  const succeeded = workerRows.filter((r) => !r.error);
  if (!succeeded.length) return { ok: false, status: 502, body: { error: "reviews_failed", detail: failed.join("; ") || "no worker rows" } };

  // 2. Findings (validated) for the document, this batch.
  const { data: fRows, error: fErr } = await admin.from("ptest_findings")
    .select("id, finding_id, worker, vendor, status, kind, severity, confidence, block_key, block_key_b, quote, quote_b, why, intake_key, intake_value, registry_row_id, registry_quote, binding, rule_ref, fix_class")
    .eq("batch_id", opts.batchId).eq("tool_slug", opts.tool).eq("assessment_id", opts.assessmentId).eq("status", "validated");
  if (fErr) return { ok: false, status: 500, body: { error: "findings_read_failed", detail: fErr.message } };
  const rows = (fRows ?? []) as FindingRow[];
  const deduped = dedupeFindings(rows);
  const lintKeys = new Set(deduped.filter((f) => f.is_lint).map((f) => f.block_key));
  // Registry gaps never reach the classifier: they are not defects to class.
  const workerFindings = deduped.filter((f) => !f.is_lint && !isRegistryGap(f));

  // 3. Persistence: the same dedupe key seen on this document in an earlier batch.
  const persisting = new Set<string>();
  try {
    const { data: prior } = await admin.from("ptest_findings")
      .select("block_key, quote, batch_id").eq("tool_slug", opts.tool).eq("assessment_id", opts.assessmentId)
      .eq("status", "validated").neq("batch_id", opts.batchId).limit(2000);
    for (const p of (prior ?? []) as Array<{ block_key: string | null; quote: string | null }>) {
      if (p.block_key && p.quote) persisting.add(dedupeKey(p.block_key, p.quote));
    }
  } catch { /* first batch on this document */ }

  // 4. Classification (one small model call) — lint hits are presentation by construction.
  let classifications = new Map<string, Classification>();
  let usage: Bag | null = null;
  let model: string | null = null;
  if (workerFindings.length) {
    try {
      const classify = opts.classifier ?? defaultClassifier(opts.effort, opts.assessmentId);
      const out = await classify(opts.tool, workerFindings);
      classifications = out.classifications;
      model = out.model;
      usage = out.usage;
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      await admin.from("ptest_arbitrations").insert({ ...base, model: null, effort: opts.effort, fix_list: [], ceo_sheet: [], dropped: [], double_check: null, summary: null, findings_in: deduped.length, input_truncated: false, usage: null, single_reviewer: failed.length > 0, error: msg, agreed_score: null });
      return { ok: false, status: 502, body: { error: "classification_failed", detail: msg } };
    }
  }

  // 5. Gate + route.
  const fix_list: Bag[] = [];
  const ceo_sheet: Bag[] = [];
  const dropped: Bag[] = [];
  const byClass: Record<string, number> = {};
  const byRoute: Record<string, number> = {};
  const updates: Array<{ ids: string[]; patch: Bag }> = [];
  let registryGaps = 0;
  for (const f of deduped) {
    if (isRegistryGap(f)) {
      registryGaps += 1;
      byClass["registry_gap"] = (byClass["registry_gap"] ?? 0) + 1;
      byRoute["registry_backlog"] = (byRoute["registry_backlog"] ?? 0) + 1;
      dropped.push({ id: f.id, kind: "registry_backlog", reason: "registry_backlog: the pack has no row for the provision this block cites — a registry-coverage gap, not scored", block_key: f.block_key, quote: f.quote.slice(0, 200), fix_class: "registry_gap", raised_by: f.raised_by.join(" + "), why: f.why.slice(0, 400) });
      updates.push({ ids: f.row_ids, patch: { fix_class: "registry_gap", class_reason: "registry-coverage gap (NO ROW); excluded from the score", dedupe_key: f.key, route: "registry_backlog", queued: false } });
      continue;
    }
    const c: Classification = f.is_lint
      ? { fix_class: "presentation", rule_ref: f.lint_rule, reason: "deterministic lint hit" }
      : classifications.get(f.id) ?? { fix_class: "judgment", rule_ref: null, reason: "unclassified by the model — routed to the CEO sheet conservatively" };
    const g = gate(f, c, { persists: persisting.has(f.key), lintCovered: !f.is_lint && lintKeys.has(f.block_key) && c.fix_class === "presentation" });
    byClass[c.fix_class] = (byClass[c.fix_class] ?? 0) + 1;
    byRoute[g.route] = (byRoute[g.route] ?? 0) + 1;
    if (g.route === "fix_list") fix_list.push(fixListEntry(opts.tool, opts.assessmentId, f, c, g, opts.companyName ?? null));
    else if (g.route === "ceo_sheet") ceo_sheet.push(ceoEntry(opts.tool, opts.assessmentId, f, c, opts.companyName ?? null));
    else dropped.push({ id: f.id, kind: g.route, reason: `${g.route}: ${g.reason}`, block_key: f.block_key, quote: f.quote.slice(0, 200), fix_class: c.fix_class, raised_by: f.raised_by.join(" + ") });
    updates.push({ ids: f.row_ids, patch: { fix_class: c.fix_class, rule_ref: c.rule_ref ?? undefined, class_reason: c.reason, dedupe_key: f.key, route: g.route, queued: g.queued, gate_reason: g.reason, merged_id: f.id } });
  }
  for (const u of updates) {
    const { error } = await admin.from("ptest_findings").update(u.patch).in("id", u.ids);
    if (error) console.warn(`[ptest-classify] finding update failed — ${error.message}`);
  }

  const composite = compositeScore(deduped);
  const workerCounts: Record<string, number> = {};
  for (const f of deduped) for (const w of f.raised_by) workerCounts[w] = (workerCounts[w] ?? 0) + 1;
  const metrics = { deduped: deduped.length, raw: rows.length, registry_gaps: registryGaps, lint: deduped.filter((f) => f.is_lint).length, by_class: byClass, by_route: byRoute, by_raiser: workerCounts, failed_workers: failed, composite };
  const coverage = failed.length ? `PARTIAL COVERAGE (${failed.join("; ")}). ` : "";
  const summary = `${coverage}${deduped.length} finding(s) after dedupe (${rows.length} raw): ${fix_list.length} queued, ${ceo_sheet.length} for the CEO, ${dropped.length} observed/intake/lint-backlog. Classes: ${Object.entries(byClass).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}.`;

  const record = {
    ...base, model, effort: opts.effort, fix_list, ceo_sheet, dropped,
    double_check: null, summary, findings_in: rows.length, input_truncated: false, usage,
    single_reviewer: failed.length > 0, error: null, agreed_score: composite, metrics,
  };
  const { data, error } = await admin.from("ptest_arbitrations").insert(record).select("id").single();
  if (error) console.error(`[ptest-classify] persist failed — ${error.message}`);
  return { ok: true, status: 200, body: { ok: true, scope: "document", metrics, fix_list: fix_list.length, ceo_sheet: ceo_sheet.length, dropped: dropped.length }, rowId: data?.id as string | undefined };
}

// ── The product merge (deterministic) ───────────────────────────────────────

export async function mergeProductV2(admin: Admin, opts: { batchId: string; tool: string; userId?: string | null; parentJobId?: string | null }): Promise<ClassifyOutcome> {
  const base = {
    batch_id: opts.batchId, tool_slug: opts.tool, arbitration_scope: "merge", assessment_id: null,
    parent_job_id: opts.parentJobId ?? null, prompt_version: PTEST_V2_PROMPT_VERSION, run_by: opts.userId ?? null,
  };
  const { data: verdicts, error } = await admin.from("ptest_arbitrations")
    .select("assessment_id, fix_list, ceo_sheet, dropped, single_reviewer, summary, agreed_score, metrics")
    .eq("batch_id", opts.batchId).eq("tool_slug", opts.tool).eq("arbitration_scope", "document").is("error", null)
    .order("created_at", { ascending: true });
  if (error) return { ok: false, status: 500, body: { error: "verdict_read_failed", detail: error.message } };
  const rows = (verdicts ?? []) as Array<{ assessment_id: string | null; fix_list: Bag[]; ceo_sheet: Bag[]; dropped: Bag[]; single_reviewer: boolean; summary: string | null; agreed_score: number | null; metrics: Bag | null }>;
  if (!rows.length) return { ok: false, status: 502, body: { error: "no_document_arbitrations" } };

  // Union, deduping fix entries across documents by (block key, quote) and
  // then by (fix class, rule ref, block key) — one underlying cause, every
  // occurrence listed.
  const fixByKey = new Map<string, Bag>();
  const droppedIds: Bag[] = [];
  let n = 0;
  const keyOf = (e: Bag) => {
    const occ = (Array.isArray(e.occurrences) ? e.occurrences : []) as Bag[];
    const first = occ[0] ?? {};
    return `${first.block_key ?? ""}|${normalise(String(first.quote ?? "")).slice(0, 160)}`;
  };
  const causeKey = (e: Bag) => e.rule_ref ? `${e.fix_class}|${e.rule_ref}|${(((e.occurrences as Bag[] | undefined)?.[0]) ?? {}).block_key ?? ""}` : null;
  const causeIndex = new Map<string, string>();
  for (const v of rows) {
    for (const e of v.fix_list) {
      const k = keyOf(e);
      const ck = causeKey(e);
      const existingKey = fixByKey.has(k) ? k : (ck && causeIndex.has(ck) ? causeIndex.get(ck)! : null);
      if (existingKey) {
        const cur = fixByKey.get(existingKey)!;
        cur.occurrences = [...(cur.occurrences as Bag[]), ...((e.occurrences as Bag[]) ?? [])];
        cur.raised_by = [...new Set(`${cur.raised_by} + ${e.raised_by}`.split(" + "))].join(" + ");
        if ((SEV_RANK[String(e.severity)] ?? 0) > (SEV_RANK[String(cur.severity)] ?? 0)) cur.severity = e.severity;
        droppedIds.push({ id: `${v.assessment_id}:${e.id}`, reason: `merged into ${cur.id}` });
        continue;
      }
      n += 1;
      const merged: Bag = { ...e, id: `m${n}`, source_ids: [`${v.assessment_id}:${e.id}`] };
      fixByKey.set(k, merged);
      if (ck) causeIndex.set(ck, k);
    }
  }
  const ceo: Bag[] = [];
  let c = 0;
  const seenCeo = new Set<string>();
  for (const v of rows) {
    for (const e of v.ceo_sheet) {
      const k = normalise(String(e.context ?? "")).slice(0, 200);
      if (seenCeo.has(k)) { droppedIds.push({ id: `${v.assessment_id}:${e.id}`, reason: "duplicate CEO question" }); continue; }
      seenCeo.add(k);
      c += 1;
      ceo.push({ ...e, id: `c${c}`, source_ids: [`${v.assessment_id}:${e.id}`] });
    }
  }
  const observed: Bag[] = rows.flatMap((v) => v.dropped.map((d) => ({ ...d, document_id: v.assessment_id })));
  const scores = rows.map((v) => v.agreed_score).filter((s): s is number => typeof s === "number");
  const agreed = scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
  const byClass: Record<string, number> = {};
  for (const v of rows) for (const [k, val] of Object.entries((v.metrics?.by_class ?? {}) as Record<string, number>)) byClass[k] = (byClass[k] ?? 0) + val;
  const metrics = { documents: rows.length, queued: fixByKey.size, ceo: ceo.length, observed: observed.length, by_class: byClass, composite_mean: agreed, partial_coverage: rows.filter((v) => v.single_reviewer).length };
  const summary = `${rows.length} document(s): ${fixByKey.size} queued fix(es) after cross-document dedupe, ${ceo.length} CEO question(s), ${observed.length} observed/intake/lint-backlog item(s).${rows.some((v) => v.single_reviewer) ? " PARTIAL COVERAGE on at least one document." : ""}`;
  const record = {
    ...base, model: null, effort: null, fix_list: [...fixByKey.values()], ceo_sheet: ceo, dropped: [...droppedIds, ...observed],
    double_check: "Deterministic merge: no model call; routing decided per document by the queue gate.", summary,
    findings_in: rows.reduce((s, v) => s + v.fix_list.length + v.ceo_sheet.length, 0), input_truncated: false, usage: null,
    single_reviewer: rows.some((v) => v.single_reviewer), error: null, agreed_score: agreed, metrics,
  };
  const { data, error: insErr } = await admin.from("ptest_arbitrations").insert(record).select("id").single();
  if (insErr) console.error(`[ptest-merge] persist failed — ${insErr.message}`);
  return { ok: true, status: 200, body: { ok: true, scope: "merge", metrics }, rowId: data?.id as string | undefined };
}
