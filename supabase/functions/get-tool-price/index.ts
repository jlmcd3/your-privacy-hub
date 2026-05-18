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
  // v7 fallback amounts. Standalone = full per-use price.
  // Subscriber = Professional rate (25% off). Intelligence-tier callers
  // get an additional client-side recompute (20% off standalone) via
  // ToolPricingCTA. Keep in sync with src/hooks/useToolPrice.ts FALLBACK
  // and src/config/pricing.ts PRICING.tools.
  healthcheck: {
    name: "Privacy Program Assessment Tool",
    standalone_lookup: "hc_standalone_v2",
    subscriber_lookup: "hc_subscriber_v2",
    fallback_standalone_cents: 5000,
    fallback_subscriber_cents: 3800,
  },
  li_analyzer: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    fallback_standalone_cents: 3000,
    fallback_subscriber_cents: 2300,
  },
  dpia_builder: {
    name: "Impact Assessment Builder",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    fallback_standalone_cents: 4000,
    fallback_subscriber_cents: 3000,
  },
  ropa_initial: {
    name: "RoPA Builder — Initial Generation",
    standalone_lookup: "ropa_initial_standalone",
    subscriber_lookup: "ropa_initial_subscriber",
    fallback_standalone_cents: 4000,
    fallback_subscriber_cents: 3000,
  },
  ropa_refresh: {
    name: "RoPA Builder — Annual Refresh",
    standalone_lookup: "ropa_refresh_standalone",
    subscriber_lookup: "ropa_refresh_subscriber",
    fallback_standalone_cents: 4000,
    fallback_subscriber_cents: 3000,
  },
  us_notice_single: {
    name: "US Privacy Notice — Single State",
    standalone_lookup: "us_notice_single_standalone",
    subscriber_lookup: "us_notice_single_subscriber",
    fallback_standalone_cents: 3000,
    fallback_subscriber_cents: 2300,
  },
  us_notice_all_states: {
    name: "US Privacy Notice — All States Suite",
    standalone_lookup: "us_notice_all_standalone",
    subscriber_lookup: "us_notice_all_subscriber",
    fallback_standalone_cents: 3000,
    fallback_subscriber_cents: 2300,
  },
  us_notice_refresh: {
    name: "US Notice — Annual Refresh",
    standalone_lookup: "us_notice_refresh_standalone",
    subscriber_lookup: "us_notice_refresh_subscriber",
    fallback_standalone_cents: 3000,
    fallback_subscriber_cents: 2300,
  },
  eu_notice_single: {
    name: "EU & Global Notice — Single Framework",
    standalone_lookup: "eu_notice_single_standalone",
    subscriber_lookup: "eu_notice_single_subscriber",
    fallback_standalone_cents: 5000,
    fallback_subscriber_cents: 3800,
  },
  eu_notice_suite: {
    name: "EU Notice Suite",
    standalone_lookup: "eu_notice_suite_standalone",
    subscriber_lookup: "eu_notice_suite_subscriber",
    fallback_standalone_cents: 5000,
    fallback_subscriber_cents: 3800,
  },
  eu_notice_full_international: {
    name: "EU & Global Notice — Full International",
    standalone_lookup: "eu_notice_intl_standalone",
    subscriber_lookup: "eu_notice_intl_subscriber",
    fallback_standalone_cents: 5000,
    fallback_subscriber_cents: 3800,
  },
  eu_notice_refresh: {
    name: "EU Notice — Annual Refresh",
    standalone_lookup: "eu_notice_refresh_standalone",
    subscriber_lookup: "eu_notice_refresh_subscriber",
    fallback_standalone_cents: 5000,
    fallback_subscriber_cents: 3800,
  },
  cppa_risk_assessment: {
    name: "CPPA Risk Assessment — Module 1",
    standalone_lookup: "cppa_risk_standalone",
    subscriber_lookup: "cppa_risk_subscriber",
    fallback_standalone_cents: 6000,
    fallback_subscriber_cents: 4500,
  },
  cppa_cybersecurity: {
    name: "CPPA Cybersecurity Readiness — Module 2",
    standalone_lookup: "cppa_cyber_standalone",
    subscriber_lookup: "cppa_cyber_subscriber",
    fallback_standalone_cents: 8000,
    fallback_subscriber_cents: 6000,
  },
  cppa_suite: {
    name: "CPPA Full Audit Suite",
    standalone_lookup: "cppa_suite_standalone",
    subscriber_lookup: "cppa_suite_subscriber",
    fallback_standalone_cents: 14000,
    fallback_subscriber_cents: 10500,
  },
  dpa_generator: {
    name: "Your Custom DPA",
    standalone_lookup: "dpa_standalone_v2",
    subscriber_lookup: "dpa_subscriber_v2",
    fallback_standalone_cents: 4000,
    fallback_subscriber_cents: 3000,
  },
  ir_playbook: {
    name: "Breach Response Playbook",
    standalone_lookup: "ir_playbook_standalone",
    subscriber_lookup: "ir_playbook_subscriber",
    fallback_standalone_cents: 2000,
    fallback_subscriber_cents: 1500,
  },
  biometric_checker: {
    name: "Biometric Privacy Compliance Assessment",
    standalone_lookup: "biometric_checker_standalone",
    subscriber_lookup: "biometric_checker_subscriber",
    fallback_standalone_cents: 1000,
    fallback_subscriber_cents: 800,
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

    // v7 model: every tool is per-use. Professional subscribers get the
    // subscriber rate (25% off). Intelligence subscribers get a separate
    // 20%-off rate computed client-side. Anonymous / free users pay
    // standalone. CPPA tools follow the same per-use rules.
    const CPPA_TOOLS = new Set([
      "cppa_risk_assessment",
      "cppa_cybersecurity",
      "cppa_suite",
    ]);
    const isCppa = CPPA_TOOLS.has(tool_slug);

    // Determine subscription tier.
    let subscriptionType: string | null = null;
    let isProfessionalSubscriber = false; // annual/annual_founding → 25% off
    let isIntelligenceSubscriber = false; // monthly → 20% off
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
            isProfessionalSubscriber = true;
          } else if (subscriptionType === "monthly") {
            isIntelligenceSubscriber = true;
          } else if (!subscriptionType && (profile?.is_premium || (profile as any)?.is_pro)) {
            // Legacy premium without subscription_type — grandfather as Professional.
            isProfessionalSubscriber = true;
            subscriptionType = "annual";
          }
        }
      } catch (_) {
        // ignore
      }
    }

    // Resolve BOTH standalone and subscriber prices from Stripe so the
    // client can render the v7 model accurately.
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

    // v7 effective price:
    //   Professional (annual / annual_founding) → 25% off (subscriberCents)
    //   Intelligence (monthly)                  → 20% off (computed)
    //   Free / anonymous                        → standalone
    const intelligenceCents = Math.round(standaloneCents * 0.8);
    let effectiveCents: number;
    if (isProfessionalSubscriber) effectiveCents = subscriberCents;
    else if (isIntelligenceSubscriber) effectiveCents = intelligenceCents;
    else effectiveCents = standaloneCents;

    return new Response(
      JSON.stringify({
        tool_slug,
        tool_name: tool.name,
        tier: isProfessionalSubscriber
          ? "professional"
          : isIntelligenceSubscriber
            ? "intelligence"
            : "standalone",
        subscription_type: subscriptionType,
        is_cppa: isCppa,
        is_included: false,
        amount_cents: effectiveCents,
        standalone_amount_cents: standaloneCents,
        subscriber_amount_cents: subscriberCents,
        stripe_price_id: null, // resolved server-side at checkout
        stripe_configured: stripeConfigured || tool.fallback_standalone_cents > 0,
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
