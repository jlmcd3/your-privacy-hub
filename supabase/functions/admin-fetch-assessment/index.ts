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

  let body: { tool_type?: string; assessment_id?: string; mode?: string; limit?: number };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const tool_type = String(body.tool_type ?? "");
  const table = TABLE_MAP[tool_type];
  if (!table) return json({ error: "invalid_input" }, 400);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Listing mode — return recent rows for the tool with open_items count.
  if (body.mode === "list") {
    const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 200);
    const cols = "id, user_id, status, created_at, updated_at, report_data";
    let q = admin.from(table).select(cols).order("created_at", { ascending: false }).limit(limit);
    if (tool_type === "cppa_risk_assessment") q = q.eq("module", "risk_assessment");
    else if (tool_type === "cppa_admt") q = q.eq("module", "admt");
    else if (tool_type === "cppa_cybersecurity") q = q.eq("module", "cybersecurity");
    const { data: rows, error: lErr } = await q;
    if (lErr) return json({ error: "list_failed", detail: lErr.message }, 500);
    const items = (rows ?? []).map((r: any) => {
      const rd = r.report_data ?? {};
      const oi = Array.isArray(rd.open_items) ? rd.open_items : [];
      const open = oi.filter((x: any) => x?.status === "open").length;
      return {
        id: r.id, user_id: r.user_id, status: r.status,
        created_at: r.created_at, updated_at: r.updated_at,
        open_items_total: oi.length,
        open_items_open: open,
      };
    });
    return json({ items });
  }

  const assessment_id = String(body.assessment_id ?? "");
  if (!assessment_id) return json({ error: "invalid_input" }, 400);

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
