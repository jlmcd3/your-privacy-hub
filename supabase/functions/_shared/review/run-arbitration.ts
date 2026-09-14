// /all-ptest — the arbitration WORKER, in three scopes.
//
//   "document" — arbitrate ONE document's two review sets. Small, fast, and the
//                only scope whose input size is bounded by a single document.
//   "merge"    — take the per-document verdicts for one product and deduplicate
//                them into the single Agreed Fix List and CEO Decision Sheet.
//                Routing is not re-decided here.
//   "batch"    — the original single-pass scope: every document of one product
//                in one turn. Kept for small products and for reruns.
//
// The routing rules themselves live in prompts.ts and are unchanged.

import { ARBITRATION_SYSTEM, ARBITRATION_MERGE_SYSTEM, DEEP_REVIEW_PROMPT_VERSION } from "./prompts.ts";
import { callClaude, parseJsonObject, type Effort } from "./model-calls.ts";
import { deriveScoreFromFindings } from "./scores.ts";
import { ARBITRATION_JSON_SCHEMA } from "./json-schemas.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

export type ArbitrationScope = "document" | "merge" | "batch";

/** Hard cap on the arbitration input, mirroring the review byte discipline. */
export const ARBITRATION_INPUT_CAP = 400_000;
/** Per-quote cap inside the arbitration digest. */
const QUOTE_CAP = 400;

export interface ReviewRow {
  assessment_id: string;
  company_name: string | null;
  tool_slug: string;
  reviewer: string;
  findings: Array<Record<string, unknown>> | null;
  error: string | null;
}

const clip = (v: unknown, n: number) =>
  typeof v === "string" ? (v.length > n ? `${v.slice(0, n)}…` : v) : null;

function capped(text: string): { text: string; truncated: boolean } {
  if (text.length <= ARBITRATION_INPUT_CAP) return { text, truncated: false };
  return {
    text: `${text.slice(0, ARBITRATION_INPUT_CAP)}\n[...digest truncated at ${ARBITRATION_INPUT_CAP} characters...]\nArbitrate what you were given. Return JSON only.`,
    truncated: true,
  };
}

/** Compact digest of both review sets. Per-document, per-reviewer, in order. */
export function buildArbitrationTurn(tool: string, rows: ReviewRow[]): { text: string; truncated: boolean; findingCount: number } {
  const byDoc = new Map<string, ReviewRow[]>();
  for (const r of rows) {
    const k = r.assessment_id;
    if (!byDoc.has(k)) byDoc.set(k, []);
    byDoc.get(k)!.push(r);
  }
  const parts: string[] = [`PRODUCT: ${tool}`, `DOCUMENTS REVIEWED: ${byDoc.size}`, ""];
  let findingCount = 0;

  for (const [docId, docRows] of byDoc) {
    const company = docRows.find((r) => r.company_name)?.company_name ?? "(unnamed)";
    parts.push(`=== DOCUMENT ${docId} — ${company} ===`);
    for (const reviewer of ["gpt", "claude"]) {
      const row = docRows.find((r) => r.reviewer === reviewer);
      if (!row) { parts.push(`-- REVIEWER ${reviewer.toUpperCase()}: no review recorded --`); continue; }
      if (row.error) { parts.push(`-- REVIEWER ${reviewer.toUpperCase()}: FAILED (${row.error}) --`); continue; }
      const findings = Array.isArray(row.findings) ? row.findings : [];
      findingCount += findings.length;
      parts.push(`-- REVIEWER ${reviewer.toUpperCase()}: ${findings.length} finding(s) --`);
      for (const f of findings) {
        parts.push(JSON.stringify({
          id: f.id,
          section: clip(f.section, 160),
          defect_type: f.defect_type,
          severity: f.severity,
          confidence: f.confidence,
          quote: clip(f.quote, QUOTE_CAP),
          why: clip(f.why, 600),
          proposed_change: clip(f.proposed_change, 800),
          decision_required: clip(f.decision_required, 400),
          cause_layer: f.cause_layer,
          code_focus: clip(f.code_focus, 200),
          regression_test: clip(f.regression_test, 300),
        }));
      }
    }
    parts.push("");
  }
  parts.push("Arbitrate now. Deduplicate across documents. Return JSON only.");
  const { text, truncated } = capped(parts.join("\n"));
  return { text, truncated, findingCount };
}

/** Digest of the per-document verdicts feeding the merge pass. */
export function buildMergeTurn(tool: string, verdicts: Array<{ assessment_id: string | null; fix_list: unknown[]; ceo_sheet: unknown[] }>) {
  const parts: string[] = [`PRODUCT: ${tool}`, `DOCUMENT VERDICTS: ${verdicts.length}`, ""];
  let entryCount = 0;
  for (const v of verdicts) {
    parts.push(`=== DOCUMENT ${v.assessment_id ?? "(unknown)"} ===`);
    parts.push(`FIX LIST (${v.fix_list.length}):`);
    for (const f of v.fix_list) { parts.push(JSON.stringify(f)); entryCount++; }
    parts.push(`CEO SHEET (${v.ceo_sheet.length}):`);
    for (const c of v.ceo_sheet) { parts.push(JSON.stringify(c)); entryCount++; }
    parts.push("");
  }
  parts.push("Merge now. Deduplicate across documents. Change no routing. Return JSON only.");
  const { text, truncated } = capped(parts.join("\n"));
  return { text, truncated, entryCount };
}

export interface ArbitrationOutcome {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
  rowId?: string;
  inputTruncated?: boolean;
}

const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/**
 * POST-ARBITRATION SCORE. Deterministic, no model call: 100 minus the same
 * severity weights the review scores use, applied to the AGREED fix list only
 * — items routed to the CEO sheet or dropped cost nothing, because they are
 * not (yet) defects the product owns. One deduction per entry, however many
 * documents it occurred in: the entry is one underlying cause.
 */
function agreedScoreOf(fixList: unknown[]): number {
  return deriveScoreFromFindings(
    fixList.map((f) => ({ severity: (f as Record<string, unknown>)?.severity as string | undefined })),
  );
}

async function persist(admin: Admin, record: Record<string, unknown>): Promise<string | undefined> {
  if (record.agreed_score === undefined) {
    record.agreed_score = record.error ? null : agreedScoreOf(arr(record.fix_list));
  }
  const { data, error } = await admin.from("ptest_arbitrations").insert(record).select("id").single();
  if (error) {
    console.error(`[arbitrate] persist failed — ${error.message}`);
    return undefined;
  }
  return data?.id as string | undefined;
}

export async function runArbitration(admin: Admin, opts: {
  batchId: string;
  tool: string;
  scope: ArbitrationScope;
  assessmentId?: string | null;
  effort: Effort;
  userId?: string | null;
  parentJobId?: string | null;
}): Promise<ArbitrationOutcome> {
  const scope = opts.scope;
  const base = {
    batch_id: opts.batchId,
    tool_slug: opts.tool,
    arbitration_scope: scope,
    assessment_id: opts.assessmentId ?? null,
    parent_job_id: opts.parentJobId ?? null,
    prompt_version: DEEP_REVIEW_PROMPT_VERSION,
    run_by: opts.userId ?? null,
  };

  let system: string;
  let turn: { text: string; truncated: boolean };
  let findingsIn: number;

  if (scope === "merge") {
    const { data: verdicts, error } = await admin
      .from("ptest_arbitrations")
      .select("assessment_id, fix_list, ceo_sheet")
      .eq("batch_id", opts.batchId)
      .eq("tool_slug", opts.tool)
      .eq("arbitration_scope", "document")
      .is("error", null)
      .order("created_at", { ascending: true });
    if (error) return { ok: false, status: 500, body: { error: "verdict_read_failed", detail: error.message } };
    const rows = (verdicts ?? []).map((v: Record<string, unknown>) => ({
      assessment_id: (v.assessment_id ?? null) as string | null,
      fix_list: arr(v.fix_list),
      ceo_sheet: arr(v.ceo_sheet),
    }));
    if (!rows.length) return { ok: false, status: 404, body: { error: "no_document_arbitrations" } };
    const merged = buildMergeTurn(opts.tool, rows);
    // A single document needs no merge call: its verdict IS the product verdict.
    if (rows.length === 1) {
      const record = {
        ...base,
        model: null,
        effort: opts.effort,
        fix_list: rows[0].fix_list,
        ceo_sheet: rows[0].ceo_sheet,
        dropped: [],
        double_check: "Single document in this product; the per-document verdict is the product verdict, carried through unchanged.",
        summary: "One document arbitrated; no cross-document deduplication was required.",
        findings_in: merged.entryCount,
        input_truncated: false,
        usage: null,
        error: null,
      };
      const rowId = await persist(admin, record);
      return { ok: true, status: 200, body: { ok: true, scope, arbitration: record }, rowId, inputTruncated: false };
    }
    system = ARBITRATION_MERGE_SYSTEM;
    turn = merged;
    findingsIn = merged.entryCount;
  } else {
    let q = admin
      .from("ptest_reviews")
      .select("assessment_id, company_name, tool_slug, reviewer, findings, error")
      .eq("batch_id", opts.batchId)
      .eq("tool_slug", opts.tool);
    if (scope === "document") {
      if (!opts.assessmentId) return { ok: false, status: 400, body: { error: "missing_assessment_id" } };
      q = q.eq("assessment_id", opts.assessmentId);
    }
    const { data: rows, error: readErr } = await q.order("created_at", { ascending: true });
    if (readErr) return { ok: false, status: 500, body: { error: "review_read_failed", detail: readErr.message } };
    if (!rows || rows.length === 0) return { ok: false, status: 404, body: { error: "no_reviews_for_batch" } };

    const digest = buildArbitrationTurn(opts.tool, rows as ReviewRow[]);
    if (digest.findingCount === 0) {
      // Nothing to arbitrate is a real, reportable outcome — not a failure, and
      // not a reason to spend an arbitration call.
      const record = {
        ...base,
        model: null,
        effort: opts.effort,
        fix_list: [],
        ceo_sheet: [],
        dropped: [],
        double_check: null,
        summary: "No findings were raised; nothing to arbitrate.",
        findings_in: 0,
        input_truncated: false,
        usage: null,
        error: null,
      };
      const rowId = await persist(admin, record);
      return { ok: true, status: 200, body: { ok: true, scope, findings_in: 0, arbitration: record }, rowId, inputTruncated: false };
    }
    system = ARBITRATION_SYSTEM;
    turn = digest;
    findingsIn = digest.findingCount;
  }

  let res;
  try {
    res = await callClaude({
      system,
      user: turn.text,
      effort: opts.effort,
      maxTokens: 24_000,
      label: `arbitrate-${scope}`,
      product: opts.tool,
      // FORCED VALID JSON — same discipline as the review call.
      jsonSchema: ARBITRATION_JSON_SCHEMA,
    });
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(`[arbitrate] ${scope} failed — ${msg}`);
    await persist(admin, {
      ...base, model: null, effort: opts.effort, fix_list: [], ceo_sheet: [], dropped: [],
      double_check: null, summary: null, findings_in: findingsIn, input_truncated: turn.truncated,
      usage: null, error: msg,
    });
    return { ok: false, status: 502, body: { error: "arbitration_failed", detail: msg } };
  }

  const parsed = parseJsonObject(res.text);
  if (!parsed) {
    await persist(admin, {
      ...base, model: res.model, effort: res.effort, fix_list: [], ceo_sheet: [], dropped: [],
      double_check: null, summary: null, findings_in: findingsIn, input_truncated: turn.truncated,
      usage: null, error: `unparseable_json (${res.text.length} chars)`,
    });
    return { ok: false, status: 502, body: { error: "unparseable_arbitration_json", chars: res.text.length } };
  }

  const record = {
    ...base,
    model: res.model,
    effort: res.effort,
    fix_list: arr(parsed.fix_list),
    ceo_sheet: arr(parsed.ceo_sheet),
    dropped: arr(parsed.dropped),
    double_check: typeof parsed.double_check === "string" ? parsed.double_check : null,
    summary: typeof parsed.summary === "string" ? parsed.summary : null,
    findings_in: findingsIn,
    input_truncated: turn.truncated,
    usage: {
      input_tokens: res.inputTokens,
      output_tokens: res.outputTokens,
      cache_read_tokens: res.cacheReadTokens,
      cache_creation_tokens: res.cacheCreationTokens,
      elapsed_ms: res.elapsedMs,
    },
    error: null as string | null,
  };
  const rowId = await persist(admin, record);

  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      batch_id: opts.batchId,
      tool: opts.tool,
      scope,
      model: res.model,
      effort: res.effort,
      findings_in: findingsIn,
      input_truncated: turn.truncated,
      model_note: res.note,
      arbitration: {
        fix_list: record.fix_list,
        ceo_sheet: record.ceo_sheet,
        dropped: record.dropped,
        double_check: record.double_check,
        summary: record.summary,
      },
    },
    rowId,
    inputTruncated: turn.truncated,
  };
}
