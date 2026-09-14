// /all-ptest — the deep-review WORKER.
//
// Extracted verbatim from deep-review-document so that BOTH the direct endpoint
// and the job driver run byte-identical review logic. Nothing about the prompts,
// the byte caps, the two-provider isolation or the persistence shape changes.

import { fetchReviewDocument, type ReviewTool } from "./document-source.ts";
import { buildDeepReviewSystemPrompt, DEEP_REVIEW_PROMPT_VERSION } from "./prompts.ts";
import { callClaude, callOpenAI, parseJsonObject, type Effort } from "./model-calls.ts";
import { validateFindings } from "./validate.ts";
import { parseReportedScores, deriveScoreFromFindings, divergenceNote } from "./scores.ts";
import { REVIEW_JSON_SCHEMA } from "./json-schemas.ts";

// deno-lint-ignore no-explicit-any
type Admin = any;

export type Reviewer = "gpt" | "claude";

/**
 * The user turn. Everything that varies per document lives HERE, after the
 * cached static system prompt — the only ordering under which prompt caching
 * can hit on either provider.
 */
function buildUserTurn(doc: { tool: string; documentText: string; intakeJson: string; truncated: boolean }): string {
  return [
    `PRODUCT: ${doc.tool}`,
    "",
    "INTAKE (the facts the company supplied; the document may not go beyond these):",
    doc.intakeJson,
    "",
    "DOCUMENT (the exact customer-facing text under review):",
    doc.documentText,
    doc.truncated ? "\n[NOTE: the document was truncated for length. Do not report the truncation itself as a defect.]" : "",
    "",
    "Review this document now. Quote verbatim. Return JSON only.",
  ].join("\n");
}

async function runReviewer(
  reviewer: Reviewer,
  doc: { tool: string; id: string; documentText: string; intakeJson: string; truncated: boolean },
  effort: Effort,
) {
  const system = buildDeepReviewSystemPrompt(reviewer);
  const user = buildUserTurn(doc);
  const call = reviewer === "claude" ? callClaude : callOpenAI;
  const res = await call({
    system,
    user,
    effort,
    label: `deep-review-${reviewer}`,
    product: doc.tool,
    sourceRowId: doc.id,
    // FORCED VALID JSON: the provider validates the answer against the schema,
    // so a truncated or prose-wrapped answer cannot reach the parser.
    jsonSchema: REVIEW_JSON_SCHEMA,
  });
  const parsed = parseJsonObject(res.text);
  if (!parsed) throw new Error(`${reviewer} returned unparseable JSON (${res.text.length} chars)`);
  const validated = validateFindings(parsed.findings, doc.documentText);
  if (validated.droppedUnlocatable.length) {
    console.warn(`[deep-review] ${reviewer} dropped ${validated.droppedUnlocatable.length} unlocatable quote(s)`);
  }
  // SCORING. The reported verdict is the headline; the derived score is
  // computed from the VALIDATED findings only (a dropped, unlocatable finding
  // must not cost the document points).
  const reported = parseReportedScores(parsed);
  const derived = deriveScoreFromFindings(validated.findings);
  return {
    dimension_scores: reported.dimension_scores,
    overall_score: reported.overall_score,
    derived_score: derived,
    score_source: reported.overall_score === null ? "derived_only" : "reported",
    score_divergence: divergenceNote(reported.overall_score, derived),
    reviewer,
    model: res.model,
    effort: res.effort,
    fell_back: res.fellBack,
    note: res.note,
    findings: validated.findings,
    dropped_no_quote: validated.droppedNoQuote,
    dropped_unlocatable: validated.droppedUnlocatable,
    double_check: typeof parsed.double_check === "string" ? parsed.double_check : null,
    overall: typeof parsed.overall === "string" ? parsed.overall : null,
    usage: {
      input_tokens: res.inputTokens,
      output_tokens: res.outputTokens,
      cache_read_tokens: res.cacheReadTokens,
      cache_creation_tokens: res.cacheCreationTokens,
      elapsed_ms: res.elapsedMs,
    },
  };
}

// NO IN-JOB RETRY. A reviewer runs ONCE per job. A retry is a new job attempt
// (ptest_jobs.attempts, capped at max_attempts), so a retried call gets a fresh
// isolate and a fresh wall clock instead of a second call inside a window that
// is already half spent. The structured-output schema removes the unparseable-
// JSON failure that the in-call retry existed for.

export interface DeepReviewOutcome {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

export async function runDocumentReview(admin: Admin, opts: {
  tool: ReviewTool;
  assessmentId: string;
  batchId?: string | null;
  companyName?: string | null;
  effort: Effort;
  reviewers: Reviewer[];
  userId?: string | null;
}): Promise<DeepReviewOutcome> {
  const doc = await fetchReviewDocument(admin, opts.tool, opts.assessmentId);
  if ("error" in doc) return { ok: false, status: doc.status, body: { error: doc.error } };
  if (!doc.documentText.trim()) return { ok: false, status: 400, body: { error: "empty_document" } };

  // PERSIST AS IT LANDS. Each reviewer writes its OWN row the moment its call
  // returns — a fast reviewer's work can never be lost by a slow one, and a
  // later failure of this isolate cannot take a completed review with it.
  const results: Record<string, unknown> = {};
  let stored = 0;
  let anyOk = false;

  const runAndPersist = async (reviewer: Reviewer) => {
    const common = {
      batch_id: opts.batchId ?? null,
      tool_slug: opts.tool,
      assessment_id: doc.id,
      company_name: opts.companyName ?? null,
      reviewer,
      prompt_version: DEEP_REVIEW_PROMPT_VERSION,
      run_by: opts.userId ?? null,
    };
    let row: Record<string, unknown>;
    try {
      const v = await runReviewer(reviewer, doc, opts.effort);
      anyOk = true;
      results[reviewer] = v;
      row = {
        ...common,
        model: v.model,
        effort: v.effort,
        findings: v.findings,
        double_check: v.double_check,
        overall: v.overall,
        dimension_scores: v.dimension_scores,
        overall_score: v.overall_score,
        derived_score: v.derived_score,
        score_source: v.score_source,
        score_notes: v.score_divergence,
        usage: v.usage,
        dropped_unlocatable: v.dropped_unlocatable.length + v.dropped_no_quote,
        error: null,
      };
    } catch (err) {
      const msg = (err as Error)?.message ?? String(err);
      console.error(`[deep-review] ${reviewer} failed — ${msg}`);
      results[reviewer] = { reviewer, error: msg };
      row = {
        ...common,
        model: null,
        effort: opts.effort,
        findings: [],
        double_check: null,
        overall: null,
        usage: null,
        dropped_unlocatable: 0,
        error: msg,
      };
    }
    if (!opts.batchId) return;
    const { error: insErr } = await admin.from("ptest_reviews").insert(row);
    if (insErr) console.error(`[deep-review] review persist failed (${reviewer}) — ${insErr.message}`);
    else stored += 1;
  };

  // The two providers share no rate-limit budget, so reviewers run
  // concurrently when a caller asks for both. Neither can fail the other.
  await Promise.all(opts.reviewers.map((r) => runAndPersist(r)));

  return {
    ok: anyOk,
    status: anyOk ? 200 : 502,
    body: {
      ok: anyOk,
      assessment_id: doc.id,
      tool: opts.tool,
      document_field: doc.documentField,
      document_chars: doc.originalLength,
      document_truncated: doc.truncated,
      prompt_version: DEEP_REVIEW_PROMPT_VERSION,
      stored_reviews: stored,
      reviews: results,
    },
  };
}
