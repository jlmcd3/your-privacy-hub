// product-test-grade — doc 272 §6. Two POST actions, admin-only, no model
// call anywhere in this function or anything it imports (see
// tests/edge/product-test/no-model-import.test.ts).
//
// Auth pattern copied from supabase/functions/apply-quality-fix/index.ts
// lines 70-80: anon client validates the caller's JWT via getClaims; a
// service-role client then checks has_role(admin) via RPC. Table writes use
// the service-role client throughout.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildVariants } from "./_local/variants/index.ts";
import { gradeDocument } from "./_local/grade/index.ts";
import type { ProductTestTool, VariantExpectations } from "./_local/types.ts";
import { PRODUCT_TEST_TOOLS } from "./_local/types.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

function isProductTestTool(x: unknown): x is ProductTestTool {
  return typeof x === "string" && (PRODUCT_TEST_TOOLS as readonly string[]).includes(x);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Auth (mirrors apply-quality-fix/index.ts:70-80).
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } =
    await createClient(SUPABASE_URL, ANON_KEY).auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return json({ error: "Unauthorized", detail: claimsErr?.message ?? "no claims" }, 401);
  }
  const userId = claimsData.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (roleErr) return json({ error: "Role check failed", detail: roleErr.message }, 500);
  if (!isAdmin) return json({ error: "Admin only" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = body.action;

  if (action === "variants") {
    const tool = body.tool;
    const fixtureId = body.fixture_id;
    const intake = body.intake;
    if (!isProductTestTool(tool)) return json({ error: `Unknown tool: ${String(tool)}` }, 400);
    if (typeof fixtureId !== "string" || !fixtureId) return json({ error: "fixture_id required" }, 400);
    if (!intake || typeof intake !== "object") return json({ error: "intake required" }, 400);

    try {
      const variants = buildVariants(tool, fixtureId, intake as Record<string, unknown>);
      return json({ variants });
    } catch (e) {
      return json({ error: "variants failed", detail: (e as Error).message }, 500);
    }
  }

  if (action === "grade") {
    const tool = body.tool;
    const fixtureId = body.fixture_id;
    const variantId = body.variant_id;
    const intake = body.intake;
    const output = body.output;
    const runId = body.run_id;
    const documentId = body.document_id;
    if (!isProductTestTool(tool)) return json({ error: `Unknown tool: ${String(tool)}` }, 400);
    if (typeof fixtureId !== "string" || !fixtureId) return json({ error: "fixture_id required" }, 400);
    if (typeof variantId !== "string" || !variantId) return json({ error: "variant_id required" }, 400);
    if (typeof runId !== "string" || !runId) return json({ error: "run_id required" }, 400);
    if (typeof documentId !== "string" || !documentId) return json({ error: "document_id required" }, 400);
    if (!intake || typeof intake !== "object") return json({ error: "intake required" }, 400);
    if (!output || typeof output !== "object") return json({ error: "output required" }, 400);

    let result;
    try {
      result = await gradeDocument({
        run_id: runId,
        document_id: documentId,
        tool,
        fixture_id: fixtureId,
        variant_id: variantId,
        intake: intake as Record<string, unknown>,
        output: output as Record<string, unknown>,
        expectations: body.expectations as VariantExpectations | undefined,
        panel_companies: Array.isArray(body.panel_companies) ? body.panel_companies as string[] : undefined,
      });
    } catch (e) {
      return json({ error: "grade failed", detail: (e as Error).message }, 500);
    }

    let persistError: string | undefined;
    try {
      const rows = result.checks.map((c) => ({
        run_id: runId,
        document_id: documentId,
        tool,
        fixture_id: fixtureId,
        variant_id: variantId,
        check_id: c.check_id,
        family: c.family,
        severity: c.severity,
        passed: c.passed,
        block_key: c.block_key ?? null,
        quote: c.quote ?? null,
        expected: c.expected ?? null,
        actual: c.actual ?? null,
        rule_ref: c.rule_ref ?? null,
        status: "open",
      }));
      if (rows.length) {
        const { error: insErr } = await admin.from("product_test_checks").insert(rows);
        if (insErr) persistError = `product_test_checks insert: ${insErr.message}`;
      }
      if (!persistError) {
        const { error: updErr } = await admin.from("product_test_documents").update({
          document_hash: result.summary.document_hash,
          checks_total: result.summary.total,
          checks_failed: result.summary.failed,
          critical: result.summary.critical,
          high: result.summary.high,
          editorial: result.summary.editorial,
          document_pass: result.summary.document_pass,
          status: "graded",
          completed_at: new Date().toISOString(),
        }).eq("id", documentId);
        if (updErr) persistError = `product_test_documents update: ${updErr.message}`;
      }
    } catch (e) {
      persistError = (e as Error).message;
    }

    // HARD RULE (doc 272 §6): "If the insert fails, still return the checks
    // with persist_error in the response" — the grade result itself is
    // always returned, persistence failure or not.
    return json(persistError ? { ...result, persist_error: persistError } : result);
  }

  return json({ error: `Unknown action: ${String(action)}` }, 400);
});
