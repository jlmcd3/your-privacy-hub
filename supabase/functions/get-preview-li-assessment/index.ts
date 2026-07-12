// Returns a single preview-stage li_assessments row by id.
// Public (no JWT required): preview rows are unclaimed (user_id IS NULL),
// but access requires knowing the row's UUID. RLS no longer exposes
// preview rows to anon SELECT, so this function is the sole read path.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { id } = await req.json().catch(() => ({}));
    if (!id || typeof id !== "string" || !UUID_RE.test(id)) {
      return new Response(JSON.stringify({ error: "invalid id" }), { status: 400, headers: corsHeaders });
    }

    const { data, error } = await supabase
      .from("li_assessments")
      .select("id, user_id, organization_name, subject_anchor, processing_description, data_categories, relationship_type, jurisdictions, preview_signal, stage")
      .eq("id", id)
      .eq("stage", "preview")
      .is("user_id", null)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: "lookup failed" }), { status: 500, headers: corsHeaders });
    }
    if (!data) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ row: data }), { headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: corsHeaders });
  }
});
