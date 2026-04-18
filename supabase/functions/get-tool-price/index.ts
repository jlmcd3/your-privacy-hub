import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOOLS: Record<
  string,
  {
    name: string;
    standalone_lookup: string;
    subscriber_lookup: string | null;
    fallback_standalone_cents: number;
    fallback_subscriber_cents: number;
  }
> = {
  healthcheck: {
    name: "Data Privacy Healthcheck",
    standalone_lookup: "hc_standalone",
    subscriber_lookup: "hc_subscriber",
    fallback_standalone_cents: 2900,
    fallback_subscriber_cents: 1500,
  },
  li_analyzer: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone",
    subscriber_lookup: "li_subscriber",
    fallback_standalone_cents: 3900,
    fallback_subscriber_cents: 1900,
  },
  dpia_builder: {
    name: "DPIA Builder",
    standalone_lookup: "dpia_standalone",
    subscriber_lookup: "dpia_subscriber",
    fallback_standalone_cents: 6900,
    fallback_subscriber_cents: 3900,
  },
};

function detectEnv(): StripeEnv {
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const tool_slug = url.searchParams.get("tool_slug") || "";
    const tool = TOOLS[tool_slug];
    if (!tool) {
      return new Response(JSON.stringify({ error: "Unknown tool_slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine subscriber status (anonymous = standalone)
    let isSubscriber = false;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await userClient.auth.getUser();
        if (user) {
          const admin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const { data: profile } = await admin
            .from("profiles")
            .select("is_premium")
            .eq("id", user.id)
            .single();
          isSubscriber = !!profile?.is_premium;
        }
      } catch (_) {
        // ignore
      }
    }

    const lookupKey =
      isSubscriber && tool.subscriber_lookup ? tool.subscriber_lookup : tool.standalone_lookup;
    const fallbackCents =
      isSubscriber && tool.subscriber_lookup
        ? tool.fallback_subscriber_cents
        : tool.fallback_standalone_cents;

    let amountCents = fallbackCents;
    let stripeConfigured = false;
    try {
      const stripe = createStripeClient(detectEnv());
      const stripePrice = await resolvePriceId(stripe, lookupKey);
      if (stripePrice) {
        amountCents = stripePrice.unit_amount ?? fallbackCents;
        stripeConfigured = true;
      }
    } catch (e) {
      console.warn("get-tool-price: gateway lookup failed, using fallback:", (e as Error).message);
    }

    return new Response(
      JSON.stringify({
        tool_slug,
        tool_name: tool.name,
        tier: isSubscriber ? "subscriber" : "standalone",
        amount_cents: amountCents,
        stripe_price_id: null, // resolved server-side at checkout
        stripe_configured: stripeConfigured,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-tool-price error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
