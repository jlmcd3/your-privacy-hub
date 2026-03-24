import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Bundle pricing
const BUNDLES: Record<string, { credits: number; price_cents: number; label: string }> = {
  "1": { credits: 1, price_cents: 500, label: "1 Additional Report" },
  "5": { credits: 5, price_cents: 1500, label: "5 Additional Reports" },
  "10": { credits: 10, price_cents: 2000, label: "10 Additional Reports" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: "Stripe is not configured" }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Verify user
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

  // Check premium status
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();

  if (!profile?.is_premium) {
    return new Response(JSON.stringify({ error: "Premium subscription required to purchase report credits" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const { bundle } = await req.json();
    const bundleConfig = BUNDLES[String(bundle)];

    if (!bundleConfig) {
      return new Response(JSON.stringify({ error: "Invalid bundle. Choose 1, 5, or 10." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create one-time Stripe checkout session
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        mode: "payment",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][unit_amount]": String(bundleConfig.price_cents),
        "line_items[0][price_data][product_data][name]": bundleConfig.label,
        "line_items[0][price_data][product_data][description]": `${bundleConfig.credits} additional analyst report credit${bundleConfig.credits > 1 ? "s" : ""} for EndUserPrivacy Premium`,
        "line_items[0][quantity]": "1",
        success_url: `${origin}/dashboard?credits_purchased=${bundleConfig.credits}`,
        cancel_url: `${origin}/dashboard`,
        customer_email: user.email!,
        "metadata[user_id]": user.id,
        "metadata[credits]": String(bundleConfig.credits),
        "metadata[type]": "report_credits",
      }),
    });

    const session = await stripeRes.json();
    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("purchase-report-credits error:", err);
    return new Response(JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
