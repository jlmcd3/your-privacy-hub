// deep-review-document — /all-ptest stage 2.
//
// One generated document, two independent deep reviews (OpenAI + Claude), each
// performing its own double-check pass, each returning quoted, cause-traced
// findings. This REPLACES the rubric grader on the /all-ptest harness: the
// grader scored six dimensions against five fixed checks, the deep review reads
// the report as a connected argument and locates the actual defects.
//
// CONSTRAINTS
//   1. Admin-gated via has_role, or an internal service-role caller.
//   2. Read-only over the assessment. Writes only to ptest_reviews.
//   3. Never used by run-quality-batch, ql3-orchestrator or run-stress-job.
//
// CARRIED FORWARD from the grading path: bounded per-call aborts, all-text-block
// extraction, textless-response-is-an-error, byte caps on the payload, and
// per-call spend metering.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { fetchReviewDocument, isReviewTool, type ReviewTool } from "../_shared/review/document-source.ts";
import { buildDeepReviewSystemPrompt, DEEP_REVIEW_PROMPT_VERSION } from "../_shared/review/prompts.ts";
import { callClaude, callOpenAI, parseJsonObject, type Effort } from "../_shared/review/model-calls.ts";
import { validateFindings } from "../_shared/review/validate.ts";

export const BUILD_STAMP = "all-ptest-deep-review-v1@2026-09-13";
console.log(`[deep-review-document] boot ${BUILD_STAMP}`);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

const ALLOWED_EFFORT: Effort[] = ["low", "medium", "high", "max"];

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
  reviewer: "gpt" | "claude",
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
    console.warn(`[deep-review-document] ${reviewer} dropped ${validated.droppedUnlocatable.length} unlocatable quote(s)`);
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "missing_authorization" }, 401);
  const token = authHeader.slice(7).trim();
  const isInternalSR = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;

  let userId: string | null = null;
  if (!isInternalSR) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid_jwt" }, 401);
    userId = userData.user.id;
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "admin_only" }, 403);
  }

  let body: {
    tool?: string;
    assessment_id?: string;
    batch_id?: string;
    company_name?: string;
    effort?: string;
    reviewers?: string[];
  } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  if (!body.assessment_id) return json({ error: "missing_assessment_id" }, 400);
  if (!isReviewTool(body.tool)) return json({ error: "unknown_tool", detail: String(body.tool) }, 400);
  const tool = body.tool as ReviewTool;
  const effort: Effort = ALLOWED_EFFORT.includes(body.effort as Effort) ? body.effort as Effort : "medium";
  const reviewers = (body.reviewers && body.reviewers.length
    ? body.reviewers
    : ["gpt", "claude"]).filter((r): r is "gpt" | "claude" => r === "gpt" || r === "claude");
  if (!reviewers.length) return json({ error: "no_reviewers" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const doc = await fetchReviewDocument(admin, tool, body.assessment_id);
  if ("error" in doc) return json({ error: doc.error }, doc.status);
  if (!doc.documentText.trim()) return json({ error: "empty_document" }, 400);

  // The two providers share no rate-limit budget, so the reviews run
  // concurrently. Neither reviewer can fail the other: each is settled
  // independently and its error is reported in its own slot.
  const settled = await Promise.allSettled(
    reviewers.map((r) => runReviewer(r, doc, effort)),
  );

  const results: Record<string, unknown> = {};
  const rows: Record<string, unknown>[] = [];
  let anyOk = false;
  settled.forEach((s, i) => {
    const reviewer = reviewers[i];
    if (s.status === "fulfilled") {
      anyOk = true;
      results[reviewer] = s.value;
      rows.push({
        batch_id: body.batch_id ?? null,
        tool_slug: tool,
        assessment_id: doc.id,
        company_name: body.company_name ?? null,
        reviewer,
        model: s.value.model,
        effort: s.value.effort,
        findings: s.value.findings,
        double_check: s.value.double_check,
        overall: s.value.overall,
        usage: s.value.usage,
        dropped_unlocatable: s.value.dropped_unlocatable.length + s.value.dropped_no_quote,
        error: null,
        prompt_version: DEEP_REVIEW_PROMPT_VERSION,
        run_by: userId,
      });
    } else {
      const msg = (s.reason as Error)?.message ?? String(s.reason);
      console.error(`[deep-review-document] ${reviewer} failed — ${msg}`);
      results[reviewer] = { reviewer, error: msg };
      rows.push({
        batch_id: body.batch_id ?? null,
        tool_slug: tool,
        assessment_id: doc.id,
        company_name: body.company_name ?? null,
        reviewer,
        model: null,
        effort,
        findings: [],
        double_check: null,
        overall: null,
        usage: null,
        dropped_unlocatable: 0,
        error: msg,
        prompt_version: DEEP_REVIEW_PROMPT_VERSION,
        run_by: userId,
      });
    }
  });

  let stored = 0;
  if (body.batch_id) {
    const { error: insErr, data: ins } = await admin.from("ptest_reviews").insert(rows).select("id");
    if (insErr) console.error(`[deep-review-document] review persist failed — ${insErr.message}`);
    else stored = ins?.length ?? 0;
  }

  return json({
    ok: anyOk,
    assessment_id: doc.id,
    tool,
    document_field: doc.documentField,
    document_chars: doc.originalLength,
    document_truncated: doc.truncated,
    prompt_version: DEEP_REVIEW_PROMPT_VERSION,
    build_stamp: BUILD_STAMP,
    stored_reviews: stored,
    reviews: results,
  }, anyOk ? 200 : 502);
};

export { handler };
if (import.meta.main) Deno.serve(handler);
