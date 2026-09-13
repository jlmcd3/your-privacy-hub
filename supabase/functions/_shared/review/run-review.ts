// /all-ptest — the deep-review WORKER.
//
// Extracted verbatim from deep-review-document so that BOTH the direct endpoint
// and the job driver run byte-identical review logic. Nothing about the prompts,
// the byte caps, the two-provider isolation or the persistence shape changes.

import { fetchReviewDocument, type ReviewTool } from "./document-source.ts";
import { buildDeepReviewSystemPrompt, DEEP_REVIEW_PROMPT_VERSION } from "./prompts.ts";
import { callClaude, callOpenAI, parseJsonObject, type Effort } from "./model-calls.ts";
import { validateFindings } from "./validate.ts";

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
  });
  const parsed = parseJsonObject(res.text);
  if (!parsed) throw new Error(`${reviewer} returned unparseable JSON (${res.text.length} chars)`);
  const validated = validateFindings(parsed.findings, doc.documentText);
  if (validated.droppedUnlocatable.length) {
    console.warn(`[deep-review] ${reviewer} dropped ${validated.droppedUnlocatable.length} unlocatable quote(s)`);
  }
  return {
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

  // The two providers share no rate-limit budget, so the reviews run
  // concurrently. Neither reviewer can fail the other: each is settled
  // independently and its error is reported in its own slot.
  const settled = await Promise.allSettled(opts.reviewers.map((r) => runReviewer(r, doc, opts.effort)));

  const results: Record<string, unknown> = {};
  const rows: Record<string, unknown>[] = [];
  let anyOk = false;
  settled.forEach((s, i) => {
    const reviewer = opts.reviewers[i];
    const common = {
      batch_id: opts.batchId ?? null,
      tool_slug: opts.tool,
      assessment_id: doc.id,
      company_name: opts.companyName ?? null,
      reviewer,
      prompt_version: DEEP_REVIEW_PROMPT_VERSION,
      run_by: opts.userId ?? null,
    };
    if (s.status === "fulfilled") {
      anyOk = true;
      results[reviewer] = s.value;
      rows.push({
        ...common,
        model: s.value.model,
        effort: s.value.effort,
        findings: s.value.findings,
        double_check: s.value.double_check,
        overall: s.value.overall,
        usage: s.value.usage,
        dropped_unlocatable: s.value.dropped_unlocatable.length + s.value.dropped_no_quote,
        error: null,
      });
    } else {
      const msg = (s.reason as Error)?.message ?? String(s.reason);
      console.error(`[deep-review] ${reviewer} failed — ${msg}`);
      results[reviewer] = { reviewer, error: msg };
      rows.push({
        ...common,
        model: null,
        effort: opts.effort,
        findings: [],
        double_check: null,
        overall: null,
        usage: null,
        dropped_unlocatable: 0,
        error: msg,
      });
    }
  });

  let stored = 0;
  if (opts.batchId) {
    const { error: insErr, data: ins } = await admin.from("ptest_reviews").insert(rows).select("id");
    if (insErr) console.error(`[deep-review] review persist failed — ${insErr.message}`);
    else stored = ins?.length ?? 0;
  }

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
