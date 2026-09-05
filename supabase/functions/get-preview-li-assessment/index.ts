// Returns a single preview-stage li_assessments row by id.
// Anonymous preview rows (user_id IS NULL) are reachable by UUID alone.
// Rows created while signed in carry user_id and are returned only when the
// caller's JWT matches that owner. RLS no longer exposes preview rows to anon
// SELECT, so this function is the sole read path.
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
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: "lookup failed" }), { status: 500, headers: corsHeaders });
    }
    if (!data) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
    }

    // Claimed preview rows (created while signed in) are readable only by their
    // owner; unclaimed rows stay reachable by UUID alone.
    if (data.user_id) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const token = authHeader.replace(/^Bearer\s+/i, "");
      const { data: userRes } = token
        ? await supabase.auth.getUser(token)
        : { data: { user: null } as { user: null } };
      if (userRes?.user?.id !== data.user_id) {
        return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ row: data }), { headers: corsHeaders });
  } catch {
    return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: corsHeaders });
  }
});
