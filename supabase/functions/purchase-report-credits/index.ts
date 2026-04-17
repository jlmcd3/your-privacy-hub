import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Bundle definitions — lookup keys correspond to prices created via batch_create_product
const BUNDLES: Record<string, { credits: number; lookup_key: string; fallback_cents: number; label: string }> = {
  "1": { credits: 1, lookup_key: "credits_1", fallback_cents: 500, label: "1 Additional Report" },
  "5": { credits: 5, lookup_key: "credits_5", fallback_cents: 1500, label: "5 Additional Reports" },
  "10": { credits: 10, lookup_key: "credits_10", fallback_cents: 2000, label: "10 Additional Reports" },
};

function detectEnv(): StripeEnv {
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Verify user
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Premium-only
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();
  if (!profile?.is_premium) {
    return new Response(
      JSON.stringify({ error: "Premium subscription required to purchase report credits" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { bundle } = await req.json();
    const bundleConfig = BUNDLES[String(bundle)];
    if (!bundleConfig) {
      return new Response(JSON.stringify({ error: "Invalid bundle. Choose 1, 5, or 10." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = detectEnv();
    const stripe = createStripeClient(env);
    const stripePrice = await resolvePriceId(stripe, bundleConfig.lookup_key);

    const origin = req.headers.get("origin") || "http://localhost:5173";

    const lineItem = stripePrice
      ? { price: stripePrice.id, quantity: 1 }
      : {
          price_data: {
            currency: "usd" as const,
            product_data: {
              name: bundleConfig.label,
              description: `${bundleConfig.credits} additional analyst report credit${
                bundleConfig.credits > 1 ? "s" : ""
              } for EndUserPrivacy Premium`,
            },
            unit_amount: bundleConfig.fallback_cents,
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem as any],
      success_url: `${origin}/dashboard?credits_purchased=${bundleConfig.credits}`,
      cancel_url: `${origin}/dashboard`,
      customer_email: user.email!,
      metadata: {
        user_id: user.id,
        credits: String(bundleConfig.credits),
        type: "report_credits",
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("purchase-report-credits error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
