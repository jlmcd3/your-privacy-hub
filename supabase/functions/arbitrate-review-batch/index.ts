// arbitrate-review-batch — /all-ptest stage 3.
//
// Claude arbitrates the review sets and returns the Agreed Fix List, the CEO
// Decision Sheet and the dropped log. Routing is the CEO's and is restated
// verbatim in ARBITRATION_SYSTEM:
//   both raised it            -> fix list
//   GPT only                  -> arbiter decides; rejection goes to the CEO
//                                sheet with GPT's fix quoted
//   Claude only               -> arbiter double-checks; sure -> fix list,
//                                unsure -> CEO sheet
//   anything CEO-shaped       -> CEO sheet regardless of who raised it
//
// Scopes (see _shared/review/run-arbitration.ts):
//   "document" — one document's two review sets
//   "merge"    — the per-document verdicts of one product, deduplicated
//   "batch"    — the original single-pass scope (default; small products)
//
// Read-only over every product table. Writes only to ptest_arbitrations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { runArbitration, type ArbitrationScope } from "../_shared/review/run-arbitration.ts";
import { type Effort } from "../_shared/review/model-calls.ts";
import { cors, json, requireAdmin, isResponse, SUPABASE_URL, SERVICE_KEY } from "../_shared/review/auth.ts";

export const BUILD_STAMP = "all-ptest-arbitrate-v2@2026-09-13";
console.log(`[arbitrate-review-batch] boot ${BUILD_STAMP}`);

const SCOPES: ArbitrationScope[] = ["document", "merge", "batch"];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;

  let body: { batch_id?: string; tool?: string; effort?: string; scope?: string; assessment_id?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  if (!body.batch_id) return json({ error: "missing_batch_id" }, 400);
  if (!body.tool) return json({ error: "missing_tool" }, 400);
  const effort: Effort = (["low", "medium", "high", "max"] as Effort[]).includes(body.effort as Effort)
    ? body.effort as Effort
    : "high";
  const scope: ArbitrationScope = SCOPES.includes(body.scope as ArbitrationScope)
    ? body.scope as ArbitrationScope
    : "batch";

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const out = await runArbitration(admin, {
    batchId: body.batch_id,
    tool: body.tool,
    scope,
    assessmentId: body.assessment_id ?? null,
    effort,
    userId: auth.userId,
  });

  return json({ ...out.body, build_stamp: BUILD_STAMP }, out.status);
};

export { handler };
if (import.meta.main) Deno.serve(handler);
