// Force-delete a report (and its blocking child rows) as an admin.
// Bypasses owner-only RLS and FK NO ACTION constraints by deleting children
// in the right order using the service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Map a "tool" key (from MyReports) -> primary table + child tables that must
// be cleared first (children whose FK is NO ACTION / RESTRICT, not CASCADE).
const PLAN: Record<
  string,
  { table: string; children?: { table: string; column: string }[] }
> = {
  li: { table: "li_assessments" },
  dpia: { table: "dpia_frameworks" },
  governance: {
    table: "governance_assessments",
    // dpia_frameworks.source_assessment_id is ON DELETE SET NULL, no manual clear needed
  },
  dpa: { table: "dpa_documents" },
  ir: { table: "ir_playbooks" },
  biometric: { table: "biometric_assessments" },
  registration: { table: "registration_orders" }, // all children CASCADE
  ropa: {
    table: "ropa_sessions",
    children: [
      { table: "ropa_answers", column: "session_id" },
      { table: "ropa_document_versions", column: "session_id" },
      { table: "ropa_refresh_cycles", column: "source_session_id" },
      { table: "ropa_refresh_cycles", column: "new_session_id" },
      { table: "ropa_sessions", column: "parent_session_id" },
      { table: "us_notice_sessions", column: "ropa_session_id" },
      { table: "eu_notice_sessions", column: "ropa_session_id" },
    ],
  },
  us_notice: {
    table: "us_notice_sessions",
    children: [
      { table: "us_notice_documents", column: "session_id" },
      { table: "us_notice_sessions", column: "parent_session_id" },
    ],
  },
  eu_notice: {
    table: "eu_notice_sessions",
    children: [
      { table: "eu_notice_documents", column: "session_id" },
      { table: "eu_notice_sessions", column: "parent_session_id" },
    ],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid user" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    const { tool, id } = (await req.json().catch(() => ({}))) as {
      tool?: string;
      id?: string;
    };
    if (!tool || !id) return json({ error: "tool and id required" }, 400);

    const plan = PLAN[tool];
    if (!plan) return json({ error: `Unknown tool: ${tool}` }, 400);

    // Clear blocking children first.
    for (const child of plan.children || []) {
      const { error } = await admin
        .from(child.table)
        .delete()
        .eq(child.column, id);
      if (error) {
        return json(
          {
            error: `Failed clearing ${child.table}.${child.column}: ${error.message}`,
          },
          500,
        );
      }
    }

    const { error: delErr } = await admin.from(plan.table).delete().eq("id", id);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ ok: true, tool, id });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
