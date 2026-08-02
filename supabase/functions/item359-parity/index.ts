/**
 * ITEM 359 — TEMPORARY ROUTE-FLIP SMOKE DRIVER (delete after the turn).
 *
 * Inserts a cppa_assessments row from a supplied intake and dispatches it
 * through the PRODUCTION dispatch map (`PRODUCT_DISPATCH.cppa_risk_assessment`)
 * — i.e. it exercises the flipped route, not a hard-coded function name — then
 * polls the persisted `report_data` and runs the shared conformance suite.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { PRODUCT_DISPATCH } from "../_shared/generation-policy.ts";
import { runConformanceChecks } from "../_shared/ltp/conformance/conformance-checks.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const j = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = await req.json().catch(() => ({}));
  const intake = (body as { intake?: Record<string, unknown> }).intake ?? {};
  const userId = (body as { user_id?: string }).user_id ?? null;
  const waitMs = Number((body as { wait_ms?: number }).wait_ms ?? 300_000);
  const existing = (body as { assessment_id?: string }).assessment_id;

  const dispatch = PRODUCT_DISPATCH.cppa_risk_assessment;

  let id = existing;
  if (!id) {
    const { data: rec, error } = await admin
      .from(dispatch.table)
      .insert({ user_id: userId, module: "risk_assessment", status: "pending", intake_data: intake })
      .select("id")
      .single();
    if (error || !rec) return j({ error: `insert: ${error?.message}` }, 500);
    id = (rec as { id: string }).id;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/${dispatch.fn}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ [dispatch.bodyKey]: id, service_call: true }),
    }).catch((e) => ({ status: 0, text: async () => String(e) } as unknown as Response));
    console.log(JSON.stringify({ evt: "dispatched", fn: dispatch.fn, id, status: (res as Response).status }));
  }

  const deadline = Date.now() + waitMs;
  let row: Record<string, unknown> | null = null;
  while (Date.now() < deadline) {
    const { data } = await admin.from(dispatch.table).select("id, status, report_data").eq("id", id).single();
    row = data as Record<string, unknown> | null;
    if (row && row.status === "complete" && row.report_data) break;
    if (row && row.status === "failed") break;
    await new Promise((r) => setTimeout(r, 5000));
  }

  const report = (row?.report_data ?? null) as Record<string, unknown> | null;
  const checks = report ? runConformanceChecks(report) : [];
  const failed = checks.filter((c) => !c.ok);

  return j({
    dispatch_fn: dispatch.fn,
    assessment_id: id,
    status: row?.status ?? null,
    keys: report ? Object.keys(report).length : 0,
    risk_level: report?.risk_level ?? null,
    overall_score: report?.overall_score ?? null,
    information_needed_len: Array.isArray(report?.information_needed) ? (report!.information_needed as unknown[]).length : null,
    shipped_surface: ((report?._meta as Record<string, unknown>)?.internal as Record<string, unknown>)?.shipped_surface ?? null,
    conformance: { passed: checks.length - failed.length, failed: failed.length, failures: failed },
  });
});
