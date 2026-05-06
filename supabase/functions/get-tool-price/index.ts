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
    name: "Privacy Program Assessment Tool",
    standalone_lookup: "hc_standalone_v2",
    subscriber_lookup: "hc_subscriber_v2",
    fallback_standalone_cents: 4900,
    fallback_subscriber_cents: 2500,
  },
  li_analyzer: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    fallback_standalone_cents: 6900,
    fallback_subscriber_cents: 3500,
  },
  dpia_builder: {
    name: "Impact Assessment Builder",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 4900,
  },
  ropa_initial: {
    name: "RoPA Builder — Initial Generation",
    standalone_lookup: "ropa_initial_standalone",
    subscriber_lookup: "ropa_initial_subscriber",
    fallback_standalone_cents: 7900,
    fallback_subscriber_cents: 3500,
  },
  ropa_refresh: {
    name: "RoPA Builder — Annual Refresh",
    standalone_lookup: "ropa_refresh_standalone",
    subscriber_lookup: "ropa_refresh_subscriber",
    fallback_standalone_cents: 3500,
    fallback_subscriber_cents: 1500,
  },
  us_notice_single: {
    name: "US Privacy Notice — Single State",
    standalone_lookup: "us_notice_single_standalone",
    subscriber_lookup: "us_notice_single_subscriber",
    fallback_standalone_cents: 2500,
    fallback_subscriber_cents: 1200,
  },
  us_notice_all_states: {
    name: "US Privacy Notice — All States Suite",
    standalone_lookup: "us_notice_all_standalone",
    subscriber_lookup: "us_notice_all_subscriber",
    fallback_standalone_cents: 5900,
    fallback_subscriber_cents: 2900,
  },
  us_notice_refresh: {
    name: "US Notice — Annual Refresh",
    standalone_lookup: "us_notice_refresh_standalone",
    subscriber_lookup: "us_notice_refresh_subscriber",
    fallback_standalone_cents: 2500,
    fallback_subscriber_cents: 1200,
  },
  eu_notice_single: {
    name: "EU & Global Notice — Single Framework",
    standalone_lookup: "eu_notice_single_standalone",
    subscriber_lookup: "eu_notice_single_subscriber",
    fallback_standalone_cents: 4500,
    fallback_subscriber_cents: 1900,
  },
  eu_notice_suite: {
    name: "EU Notice Suite",
    standalone_lookup: "eu_notice_suite_standalone",
    subscriber_lookup: "eu_notice_suite_subscriber",
    fallback_standalone_cents: 14900,
    fallback_subscriber_cents: 6500,
  },
  eu_notice_full_international: {
    name: "EU & Global Notice — Full International",
    standalone_lookup: "eu_notice_intl_standalone",
    subscriber_lookup: "eu_notice_intl_subscriber",
    fallback_standalone_cents: 22900,
    fallback_subscriber_cents: 9900,
  },
  eu_notice_refresh: {
    name: "EU Notice — Annual Refresh",
    standalone_lookup: "eu_notice_refresh_standalone",
    subscriber_lookup: "eu_notice_refresh_subscriber",
    fallback_standalone_cents: 3500,
    fallback_subscriber_cents: 1900,
  },
  cppa_risk_assessment: {
    name: "CPPA Risk Assessment — Module 1",
    standalone_lookup: "cppa_risk_standalone",
    subscriber_lookup: "cppa_risk_subscriber",
    fallback_standalone_cents: 14900,
    fallback_subscriber_cents: 7900,
  },
  cppa_cybersecurity: {
    name: "CPPA Cybersecurity Readiness — Module 2",
    standalone_lookup: "cppa_cyber_standalone",
    subscriber_lookup: "cppa_cyber_subscriber",
    fallback_standalone_cents: 19900,
    fallback_subscriber_cents: 9900,
  },
  cppa_suite: {
    name: "CPPA Full Audit Suite",
    standalone_lookup: "cppa_suite_standalone",
    subscriber_lookup: "cppa_suite_subscriber",
    fallback_standalone_cents: 29900,
    fallback_subscriber_cents: 14900,
  },
  dpa_generator: {
    name: "Your Custom DPA",
    standalone_lookup: "dpa_standalone_v2",
    subscriber_lookup: "dpa_subscriber_v2",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 4900,
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

    // CPPA tools remain paid for everyone (annual gets a discount).
    // All other tools are FREE (included) for annual subscribers under the
    // New Model. Monthly Intelligence subscribers do NOT get tool access.
    const CPPA_TOOLS = new Set([
      "cppa_risk_assessment",
      "cppa_cybersecurity",
      "cppa_suite",
    ]);
    const isCppa = CPPA_TOOLS.has(tool_slug);

    // Determine subscription tier (anonymous / monthly = standalone)
    let subscriptionType: string | null = null;
    let isAnnualSubscriber = false;
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
            .select("is_premium, is_pro, subscription_type, founding_subscriber")
            .eq("id", user.id)
            .single();
          subscriptionType = (profile as any)?.subscription_type ?? null;
          if (subscriptionType === "annual" || subscriptionType === "annual_founding") {
            isAnnualSubscriber = true;
          } else if (!subscriptionType && (profile?.is_premium || (profile as any)?.is_pro)) {
            // Legacy premium without subscription_type — grandfather as annual.
            isAnnualSubscriber = true;
            subscriptionType = "annual";
          }
        }
      } catch (_) {
        // ignore
      }
    }

    // Resolve BOTH standalone and subscriber prices from Stripe so the
    // client can render the New Model accurately.
    let standaloneCents = tool.fallback_standalone_cents;
    let subscriberCents = tool.fallback_subscriber_cents;
    let stripeConfigured = false;
    try {
      const stripe = createStripeClient(detectEnv());
      const standalonePrice = await resolvePriceId(stripe, tool.standalone_lookup);
      if (standalonePrice) {
        standaloneCents = standalonePrice.unit_amount ?? standaloneCents;
        stripeConfigured = true;
      }
      if (tool.subscriber_lookup) {
        const subPrice = await resolvePriceId(stripe, tool.subscriber_lookup);
        if (subPrice) subscriberCents = subPrice.unit_amount ?? subscriberCents;
      }
    } catch (e) {
      console.warn("get-tool-price: gateway lookup failed, using fallback:", (e as Error).message);
    }

    // New Model effective price:
    //   annual + standard tool → 0 (included)
    //   annual + CPPA tool     → subscriber rate
    //   monthly / free         → standalone
    let effectiveCents: number;
    if (isAnnualSubscriber) {
      effectiveCents = isCppa ? subscriberCents : 0;
    } else {
      effectiveCents = standaloneCents;
    }

    return new Response(
      JSON.stringify({
        tool_slug,
        tool_name: tool.name,
        tier: isAnnualSubscriber ? "subscriber" : "standalone",
        subscription_type: subscriptionType,
        is_cppa: isCppa,
        is_included: isAnnualSubscriber && !isCppa,
        amount_cents: effectiveCents,
        standalone_amount_cents: standaloneCents,
        subscriber_amount_cents: subscriberCents,
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
