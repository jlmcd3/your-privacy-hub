// admin-fetch-assessment — quality-batch2 admin surface: fetch any assessment
// row by tool_type + id via service role, bypassing customer RLS/ownership
// gates. Admin-role-gated. Read-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TABLE_MAP: Record<string, string> = {
  li_assessment: "li_assessments",
  governance_assessment: "governance_assessments",
  dpia_framework: "dpia_frameworks",
  cppa_admt: "cppa_assessments",
  cppa_risk_assessment: "cppa_assessments",
  cppa_cybersecurity: "cppa_assessments",
};

const LI_INTAKE_COLS = [
  "organization_name", "subject_anchor", "processing_description",
  "data_categories", "relationship_type", "jurisdictions",
  "sector", "stated_purpose", "alternatives_considered",
  "purpose_details", "necessity_details", "balancing_details",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await verifyCaller(req, "admin");
  if (!auth.ok) return json({ error: auth.error }, auth.status ?? 401);

  let body: { tool_type?: string; assessment_id?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const tool_type = String(body.tool_type ?? "");
  const assessment_id = String(body.assessment_id ?? "");
  const table = TABLE_MAP[tool_type];
  if (!table || !assessment_id) return json({ error: "invalid_input" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const cols = tool_type === "li_assessment" ? LI_INTAKE_COLS : [];
  const selectExpr = [
    "id", "user_id", "status", "report_data",
    ...(cols.length ? cols : ["intake_data"]),
  ].join(",");

  const { data, error } = await admin.from(table).select(selectExpr).eq("id", assessment_id).maybeSingle();
  if (error) return json({ error: "fetch_failed", detail: error.message }, 500);
  if (!data) return json({ error: "not_found" }, 404);

  // Assemble intake for LI (dedicated columns) or return raw intake_data.
  let intake: Record<string, unknown> = {};
  if (cols.length) {
    for (const c of cols) intake[c] = (data as any)[c];
  } else {
    intake = ((data as any).intake_data ?? {}) as Record<string, unknown>;
  }

  const report_data = (data as any).report_data ?? null;
  const open_items = Array.isArray(report_data?.open_items) ? report_data.open_items : [];
  const info_needed = Array.isArray(report_data?.information_needed) ? report_data.information_needed : [];

  return json({
    id: (data as any).id,
    user_id: (data as any).user_id,
    status: (data as any).status,
    intake,
    report_data,
    open_items,
    info_needed,
  });
});
