// deep-review-document — /all-ptest stage 2.
//
// One generated document, two independent deep reviews (OpenAI + Claude), each
// performing its own double-check pass, each returning quoted, cause-traced
// findings. This REPLACES the rubric grader on the /all-ptest harness.
//
// The review logic itself lives in _shared/review/run-review.ts so that this
// endpoint and ptest-run-driver run byte-identical work. This endpoint remains
// the direct, synchronous path: it is bounded by the request window, so long
// documents should go through the driver's job queue instead.
//
// CONSTRAINTS
//   1. Admin-gated via has_role, or an internal service-role caller.
//   2. Read-only over the assessment. Writes only to ptest_reviews.
//   3. Never used by run-quality-batch, ql3-orchestrator or run-stress-job.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { isReviewTool, type ReviewTool } from "../_shared/review/document-source.ts";
import { runDocumentReview, type Reviewer } from "../_shared/review/run-review.ts";
import { type Effort } from "../_shared/review/model-calls.ts";
import { cors, json, requireAdmin, isResponse, SUPABASE_URL, SERVICE_KEY } from "../_shared/review/auth.ts";

export const BUILD_STAMP = "all-ptest-deep-review-v2@2026-09-13";
console.log(`[deep-review-document] boot ${BUILD_STAMP}`);

const ALLOWED_EFFORT: Effort[] = ["low", "medium", "high", "max"];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;

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
  const reviewers = (body.reviewers && body.reviewers.length ? body.reviewers : ["gpt", "claude"])
    .filter((r): r is Reviewer => r === "gpt" || r === "claude");
  if (!reviewers.length) return json({ error: "no_reviewers" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const out = await runDocumentReview(admin, {
    tool,
    assessmentId: body.assessment_id,
    batchId: body.batch_id ?? null,
    companyName: body.company_name ?? null,
    effort,
    reviewers,
    userId: auth.userId,
  });

  return json({ ...out.body, build_stamp: BUILD_STAMP }, out.status);
};

export { handler };
if (import.meta.main) Deno.serve(handler);
