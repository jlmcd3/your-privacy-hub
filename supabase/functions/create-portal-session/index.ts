import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function detectEnv(): StripeEnv {
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client to read stripe_customer_id even if RLS hides it
    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: profile, error: profErr } = await adminSupabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profErr) {
      console.error("profile lookup error:", profErr);
      return new Response(JSON.stringify({ error: "Could not look up customer" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let customerId = profile?.stripe_customer_id as string | undefined;
    const env = detectEnv();
    const stripe = createStripeClient(env);

    // Fallback: find customer by email (handles users whose profile row
    // was never updated with their Stripe customer id).
    if (!customerId && user.email) {
      const found = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = found.data[0]?.id;
      if (customerId) {
        await adminSupabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }
    }

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: "No billing account found for this user" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const { return_url } = (await req.json().catch(() => ({}))) as { return_url?: string };

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: return_url || `${origin}/account`,
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-portal-session error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
