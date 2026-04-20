import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Verify authenticated user via JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const jwt = authHeader.slice(7).trim();
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Premium-only: subscriber-discounted brief generation. No per-month credit cap.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();

  if (!profile?.is_premium) {
    return new Response(JSON.stringify({ error: "Premium subscription required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Call generate-custom-brief internally with admin token
  const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN");
  if (!ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-custom-brief`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({ user_id: user.id }),
      signal: AbortSignal.timeout(90000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("generate-custom-brief error:", errText);
      return new Response(JSON.stringify({ error: "Brief generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await resp.json();

    // Fetch the newly generated brief to return it
    const { data: newBrief } = await adminClient
      .from("custom_briefs")
      .select("*")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    return new Response(JSON.stringify({
      success: true,
      brief: newBrief,
      ...result,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("on-demand brief error:", e);
    return new Response(JSON.stringify({ error: "Brief generation timed out. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
