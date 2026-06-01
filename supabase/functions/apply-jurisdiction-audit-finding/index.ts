// Apply an accepted audit finding to public.jurisdiction_requirements,
// mark the finding row as accepted, and log to jurisdiction_monitoring_log.
// Admin-only.
//
// Body: { finding_id: string, action: "accept" | "reject", note?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") || "";

// Whitelist of fields safe to update via this endpoint.
const ALLOWED_FIELDS = new Set([
  "authority_name",
  "authority_url",
  "law_name",
  "registration_required",
  "registration_threshold",
  "dpo_required",
  "dpo_threshold",
  "ai_registration_required",
  "ai_threshold",
  "representative_required",
  "filing_fee_cents",
  "filing_currency",
  "renewal_period_months",
  "language_requirements",
  "notes",
]);

async function getAdminUser(req: Request): Promise<{ id: string | null; ok: boolean }> {
  const adminHeader = req.headers.get("x-admin-token");
  if (adminHeader && ADMIN_TOKEN && adminHeader === ADMIN_TOKEN) return { id: null, ok: true };
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return { id: null, ok: false };
  const { data: { user } } = await supabase.auth.getUser(auth.slice(7));
  if (!user) return { id: null, ok: false };
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  return { id: user.id, ok: !!data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = await getAdminUser(req);
    if (!admin.ok) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { finding_id, action, note } = await req.json();
    if (!finding_id || !["accept", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "finding_id and action (accept|reject) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: finding, error: findErr } = await supabase
      .from("jurisdiction_requirement_audits")
      .select("*")
      .eq("id", finding_id)
      .single();
    if (findErr || !finding) throw findErr || new Error("finding not found");

    if (action === "reject") {
      await supabase.from("jurisdiction_requirement_audits").update({
        status: "rejected",
        reviewed_by: admin.id,
        reviewed_at: new Date().toISOString(),
        reviewer_note: note || null,
      }).eq("id", finding_id);
      return new Response(JSON.stringify({ ok: true, applied: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept: write suggested_value into jurisdiction_requirements
    if (!ALLOWED_FIELDS.has(finding.field_name)) {
      return new Response(JSON.stringify({ error: `field ${finding.field_name} not updatable` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const patch: Record<string, any> = {
      [finding.field_name]: finding.suggested_value,
      last_verified_at: new Date().toISOString(),
    };

    const { error: updErr } = await supabase
      .from("jurisdiction_requirements")
      .update(patch)
      .eq("jurisdiction_code", finding.jurisdiction_code);
    if (updErr) throw updErr;

    await supabase.from("jurisdiction_monitoring_log").insert({
      jurisdiction_code: finding.jurisdiction_code,
      check_type: `audit_accepted:${finding.field_name}`,
      previous_value: JSON.stringify(finding.current_value),
      new_value: JSON.stringify(finding.suggested_value),
      source_url: finding.source_url,
    });

    await supabase.from("jurisdiction_requirement_audits").update({
      status: "accepted",
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      reviewer_note: note || null,
    }).eq("id", finding_id);

    // Supersede any other open findings for the same (jurisdiction, field)
    await supabase.from("jurisdiction_requirement_audits").update({
      status: "superseded",
    })
      .eq("jurisdiction_code", finding.jurisdiction_code)
      .eq("field_name", finding.field_name)
      .eq("status", "open")
      .neq("id", finding_id);

    return new Response(JSON.stringify({ ok: true, applied: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("apply-jurisdiction-audit-finding error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
