import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Subscription plans → human-readable lookup keys
// Professional = the new $19/mo or $190/yr tier (full archive, weekly brief,
// watchlists, 2 tool credits/month). Legacy "premium_monthly" lookup key is
// kept as a fallback for any in-flight links.
const PLAN_LOOKUPS: Record<string, string> = {
  professional_monthly: "professional_monthly_v2",
  professional_yearly: "professional_yearly_v2",
  // Legacy aliases — all map to the new monthly Professional price.
  pro: "professional_monthly_v2",
  premium: "professional_monthly_v2",
  standard: "professional_monthly_v2",
  monthly: "professional_monthly_v2",
  yearly: "professional_yearly_v2",
  annual: "professional_yearly_v2",
};

// Tool one-time purchases via tool_slug
const TOOL_LOOKUPS: Record<string, { standalone: string; subscriber: string }> = {
  healthcheck: { standalone: "hc_standalone_v2", subscriber: "hc_subscriber_v2" },
  li_analyzer: { standalone: "li_standalone_v2", subscriber: "li_subscriber_v2" },
  dpia_builder: { standalone: "dpia_standalone_v2", subscriber: "dpia_subscriber_v2" },
};

function detectEnv(): StripeEnv {
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
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

    const { plan, tool_slug, interval } = (await req.json().catch(() => ({}))) as {
      plan?: string;
      tool_slug?: string;
      interval?: "month" | "year";
    };

    let lookupKey: string | undefined;
    let mode: "subscription" | "payment" = "subscription";
    const metadata: Record<string, string> = { user_id: user.id };

    if (tool_slug) {
      const lookups = TOOL_LOOKUPS[tool_slug];
      if (!lookups) {
        return new Response(JSON.stringify({ error: "Unknown tool_slug" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();
      const isSubscriber = !!profile?.is_premium;
      lookupKey = isSubscriber ? lookups.subscriber : lookups.standalone;
      mode = "payment";
      metadata.tool_slug = tool_slug;
      metadata.tier = isSubscriber ? "subscriber" : "standalone";
    } else {
      // Resolve interval-aware plan key. If caller passes interval=year, prefer yearly.
      const requestedKey = interval === "year"
        ? "professional_yearly"
        : (plan || "professional_monthly");
      lookupKey = PLAN_LOOKUPS[requestedKey] || PLAN_LOOKUPS.professional_monthly;
      metadata.subscription_tier = "professional";
      metadata.subscription_interval = lookupKey === "professional_yearly_v2" ? "year" : "month";
    }

    const env = detectEnv();
    const stripe = createStripeClient(env);
    const stripePrice = await resolvePriceId(stripe, lookupKey!);
    if (!stripePrice) {
      return new Response(
        JSON.stringify({ error: "Price not found in payment system", lookup_key: lookupKey }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const successPath = tool_slug ? `/${tool_slug.replace(/_/g, "-")}/success` : "/subscribe/success";
    const cancelPath = tool_slug ? `/${tool_slug.replace(/_/g, "-")}` : "/subscribe";

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      success_url: `${origin}${successPath}`,
      cancel_url: `${origin}${cancelPath}`,
      customer_email: user.email!,
      metadata,
      ...(mode === "subscription" && { subscription_data: { metadata } }),
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
