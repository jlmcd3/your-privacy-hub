// Fetch an assessment by shareable_token (anonymous-friendly) OR by id+user_id.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { shareable_token, assessment_id } = await req.json();
    if (!shareable_token && !assessment_id) {
      return new Response(JSON.stringify({ error: "Provide shareable_token or assessment_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let q = supabase.from("registration_assessments").select("*").limit(1);
    if (shareable_token) q = q.eq("shareable_token", shareable_token);
    else q = q.eq("id", assessment_id);
    const { data, error } = await q.maybeSingle();
    if (error) throw error;
    if (!data) {
      return new Response(JSON.stringify({ error: "Assessment not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ assessment: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
