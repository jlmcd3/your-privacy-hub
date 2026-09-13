// arbitrate-review-batch — /all-ptest stage 3.
//
// Claude arbitrates BOTH review sets for one product's slice of a batch and
// returns the Agreed Fix List, the CEO Decision Sheet and the dropped log.
// Routing is the CEO's, restated verbatim in ARBITRATION_SYSTEM:
//   both raised it            -> fix list
//   GPT only                  -> arbiter decides; rejection goes to the CEO
//                                sheet with GPT's fix quoted
//   Claude only               -> arbiter double-checks; sure -> fix list,
//                                unsure -> CEO sheet
//   anything CEO-shaped       -> CEO sheet regardless of who raised it
//
// One call per product, not per batch: three products' findings in one turn
// would blow the input window and blur the cause analysis.
//
// Read-only over every product table. Writes only to ptest_arbitrations.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { ARBITRATION_SYSTEM, DEEP_REVIEW_PROMPT_VERSION } from "../_shared/review/prompts.ts";
import { callClaude, parseJsonObject, type Effort } from "../_shared/review/model-calls.ts";

export const BUILD_STAMP = "all-ptest-arbitrate-v1@2026-09-13";
console.log(`[arbitrate-review-batch] boot ${BUILD_STAMP}`);

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Hard cap on the arbitration input, mirroring the review byte discipline. */
const ARBITRATION_INPUT_CAP = 400_000;
/** Per-quote cap inside the arbitration digest. */
const QUOTE_CAP = 400;

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

interface ReviewRow {
  assessment_id: string;
  company_name: string | null;
  tool_slug: string;
  reviewer: string;
  findings: Array<Record<string, unknown>> | null;
  error: string | null;
}

const clip = (v: unknown, n: number) =>
  typeof v === "string" ? (v.length > n ? `${v.slice(0, n)}…` : v) : null;

/** Compact digest of both review sets. Per-document, per-reviewer, in order. */
function buildArbitrationTurn(tool: string, rows: ReviewRow[]): { text: string; truncated: boolean; findingCount: number } {
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
  let text = parts.join("\n");
  const truncated = text.length > ARBITRATION_INPUT_CAP;
  if (truncated) {
    text = `${text.slice(0, ARBITRATION_INPUT_CAP)}\n[...review digest truncated at ${ARBITRATION_INPUT_CAP} characters; later documents not arbitrated...]\nArbitrate what you were given. Return JSON only.`;
  }
  return { text, truncated, findingCount };
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

  let body: { batch_id?: string; tool?: string; effort?: string } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  if (!body.batch_id) return json({ error: "missing_batch_id" }, 400);
  if (!body.tool) return json({ error: "missing_tool" }, 400);
  const effort: Effort = (["low", "medium", "high", "max"] as Effort[]).includes(body.effort as Effort)
    ? body.effort as Effort
    : "high";

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: rows, error: readErr } = await admin
    .from("ptest_reviews")
    .select("assessment_id, company_name, tool_slug, reviewer, findings, error")
    .eq("batch_id", body.batch_id)
    .eq("tool_slug", body.tool)
    .order("created_at", { ascending: true });
  if (readErr) return json({ error: "review_read_failed", detail: readErr.message }, 500);
  if (!rows || rows.length === 0) return json({ error: "no_reviews_for_batch" }, 404);

  const digest = buildArbitrationTurn(body.tool, rows as ReviewRow[]);
  if (digest.findingCount === 0) {
    // Nothing to arbitrate is a real, reportable outcome — not a failure, and
    // not a reason to spend an arbitration call.
    const empty = { fix_list: [], ceo_sheet: [], dropped: [], double_check: null, summary: "No findings were raised for this product; nothing to arbitrate." };
    await admin.from("ptest_arbitrations").insert({
      batch_id: body.batch_id, tool_slug: body.tool, model: null, effort,
      fix_list: [], ceo_sheet: [], dropped: [], double_check: null,
      summary: empty.summary, findings_in: 0, input_truncated: false,
      prompt_version: DEEP_REVIEW_PROMPT_VERSION, usage: null, error: null, run_by: userId,
    });
    return json({ ok: true, tool: body.tool, batch_id: body.batch_id, findings_in: 0, build_stamp: BUILD_STAMP, arbitration: empty });
  }

  let res;
  try {
    res = await callClaude({
      system: ARBITRATION_SYSTEM,
      user: digest.text,
      effort,
      maxTokens: 24_000,
      label: "arbitrate-review-batch",
      product: body.tool,
    });
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error(`[arbitrate-review-batch] arbitration failed — ${msg}`);
    await admin.from("ptest_arbitrations").insert({
      batch_id: body.batch_id, tool_slug: body.tool, model: null, effort,
      fix_list: [], ceo_sheet: [], dropped: [], double_check: null, summary: null,
      findings_in: digest.findingCount, input_truncated: digest.truncated,
      prompt_version: DEEP_REVIEW_PROMPT_VERSION, usage: null, error: msg, run_by: userId,
    });
    return json({ error: "arbitration_failed", detail: msg }, 502);
  }

  const parsed = parseJsonObject(res.text);
  if (!parsed) {
    await admin.from("ptest_arbitrations").insert({
      batch_id: body.batch_id, tool_slug: body.tool, model: res.model, effort: res.effort,
      fix_list: [], ceo_sheet: [], dropped: [], double_check: null, summary: null,
      findings_in: digest.findingCount, input_truncated: digest.truncated,
      prompt_version: DEEP_REVIEW_PROMPT_VERSION, usage: null,
      error: `unparseable_json (${res.text.length} chars)`, run_by: userId,
    });
    return json({ error: "unparseable_arbitration_json", chars: res.text.length }, 502);
  }

  const arr = (v: unknown) => (Array.isArray(v) ? v : []);
  const record = {
    batch_id: body.batch_id,
    tool_slug: body.tool,
    model: res.model,
    effort: res.effort,
    fix_list: arr(parsed.fix_list),
    ceo_sheet: arr(parsed.ceo_sheet),
    dropped: arr(parsed.dropped),
    double_check: typeof parsed.double_check === "string" ? parsed.double_check : null,
    summary: typeof parsed.summary === "string" ? parsed.summary : null,
    findings_in: digest.findingCount,
    input_truncated: digest.truncated,
    prompt_version: DEEP_REVIEW_PROMPT_VERSION,
    usage: {
      input_tokens: res.inputTokens,
      output_tokens: res.outputTokens,
      cache_read_tokens: res.cacheReadTokens,
      cache_creation_tokens: res.cacheCreationTokens,
      elapsed_ms: res.elapsedMs,
    },
    error: null as string | null,
    run_by: userId,
  };
  const { error: insErr } = await admin.from("ptest_arbitrations").insert(record);
  if (insErr) console.error(`[arbitrate-review-batch] persist failed — ${insErr.message}`);

  return json({
    ok: true,
    batch_id: body.batch_id,
    tool: body.tool,
    model: res.model,
    effort: res.effort,
    findings_in: digest.findingCount,
    input_truncated: digest.truncated,
    build_stamp: BUILD_STAMP,
    model_note: res.note,
    arbitration: {
      fix_list: record.fix_list,
      ceo_sheet: record.ceo_sheet,
      dropped: record.dropped,
      double_check: record.double_check,
      summary: record.summary,
    },
  });
};

export { handler };
if (import.meta.main) Deno.serve(handler);
