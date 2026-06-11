import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PRICE MIRROR — these cents MUST mirror src/config/pricing.ts (v11). (v11 deployed 2026-06-11)
// Any price change updates BOTH files in the same commit. Verify with
// /admin/pricing-reconciliation.
const ANNUAL_GATED_TOOLS = new Set([
  "governance_assessment",
  "healthcheck",
  "li_assessment",
  "li_analyzer",
  "dpia_framework",
  "dpia_builder",
  "cppa_risk_assessment",
  "cppa_cybersecurity",
  "cppa_suite",
]);
const TOOLS: Record<
  string,
  {
    name: string;
    standalone_lookup: string;
    subscriber_lookup: string | null;
    fallback_standalone_cents: number;
    fallback_subscriber_cents: number;
    classification: "smart" | "convenience";
  }
> = {
  healthcheck: {
    name: "Privacy Program Assessment Tool",
    standalone_lookup: "hc_standalone_v2",
    subscriber_lookup: "hc_subscriber_v2",
    fallback_standalone_cents: 8900,
    fallback_subscriber_cents: 4900,
    classification: "smart",
  },
  governance_assessment: {
    name: "Privacy Program Assessment Tool",
    standalone_lookup: "hc_standalone_v2",
    subscriber_lookup: "hc_subscriber_v2",
    fallback_standalone_cents: 8900,
    fallback_subscriber_cents: 4900,
    classification: "smart",
  },
  li_analyzer: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 4900,
    classification: "smart",
  },
  li_assessment: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 4900,
    classification: "smart",
  },
  dpia_builder: {
    name: "Impact Assessment Builder",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    fallback_standalone_cents: 7900,
    fallback_subscriber_cents: 4500,
    classification: "smart",
  },
  dpia_framework: {
    name: "Impact Assessment Builder",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    fallback_standalone_cents: 7900,
    fallback_subscriber_cents: 4500,
    classification: "smart",
  },
  ropa_initial: {
    name: "RoPA Builder — Initial Generation",
    standalone_lookup: "ropa_initial_standalone",
    subscriber_lookup: "ropa_initial_subscriber",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  ropa_refresh: {
    name: "RoPA Builder — Annual Refresh",
    standalone_lookup: "ropa_refresh_standalone",
    subscriber_lookup: "ropa_refresh_subscriber",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  us_notice_single: {
    name: "US Privacy Notice — Single State",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  us_notice_all_states: {
    name: "US Privacy Notice — All States Suite",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  us_notice_refresh: {
    name: "US Notice — Annual Refresh",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  eu_notice_single: {
    name: "EU & Global Notice — Single Framework",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  eu_notice_suite: {
    name: "EU Notice Suite",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  eu_notice_full_international: {
    name: "EU & Global Notice — Full International",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  eu_notice_refresh: {
    name: "EU Notice — Annual Refresh",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  cppa_risk_assessment: {
    name: "CPPA Risk Assessment — Module 1",
    standalone_lookup: "cppa_risk_standalone",
    subscriber_lookup: "cppa_risk_subscriber",
    fallback_standalone_cents: 17900,
    fallback_subscriber_cents: 9900,
    classification: "smart",
  },
  cppa_cybersecurity: {
    name: "CPPA Cybersecurity Readiness — Module 2",
    standalone_lookup: "cppa_cyber_standalone",
    subscriber_lookup: "cppa_cyber_subscriber",
    fallback_standalone_cents: 24900,
    fallback_subscriber_cents: 13900,
    classification: "smart",
  },
  cppa_suite: {
    name: "CPPA Full Audit Suite",
    standalone_lookup: "cppa_suite_standalone",
    subscriber_lookup: "cppa_suite_subscriber",
    fallback_standalone_cents: 34900,
    fallback_subscriber_cents: 18900,
    classification: "smart",
  },
  dpa_generator: {
    name: "Your Custom DPA",
    standalone_lookup: "dpa_standalone_v2",
    subscriber_lookup: "dpa_subscriber_v2",
    fallback_standalone_cents: 4900,
    fallback_subscriber_cents: 0,

    classification: "smart",
  },
  ir_playbook: {
    name: "Incident Response Playbook",
    standalone_lookup: "ir_standalone_v2",
    subscriber_lookup: "ir_subscriber_v2",
    fallback_standalone_cents: 5900,
    fallback_subscriber_cents: 0,
    classification: "convenience",
  },
  biometric_checker: {
    name: "Biometric Privacy Compliance Assessment",
    standalone_lookup: "biometric_standalone_v2",
    subscriber_lookup: "biometric_subscriber_v2",
    fallback_standalone_cents: 4900,
    fallback_subscriber_cents: 0,
    classification: "smart",
  },
};

// v9: Tools that bypass Stripe entirely for ANY active subscriber (FREE).
const SUBSCRIBER_FREE_TOOLS = new Set(["ir_playbook", "biometric_checker", "dpa_generator"]);

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

    const CPPA_TOOLS = new Set([
      "cppa_risk_assessment",
      "cppa_cybersecurity",
      "cppa_suite",
    ]);
    const isCppa = CPPA_TOOLS.has(tool_slug);

    // v9: Resolve subscriber identity. Any active subscription (is_premium
    // OR is_pro) qualifies for subscriber-free Layer-1 tools and subscriber
    // pricing on Layer-2 tools.
    let subscriptionType: string | null = null;
    let isPro = false;
    let isPremium = false;
    let professionalAnnual = false;
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
            .select("subscription_type, is_pro, is_premium, professional_annual")
            .eq("id", user.id)
            .single();
          subscriptionType = (profile as any)?.subscription_type ?? null;
          isPro = (profile as any)?.is_pro === true;
          isPremium = (profile as any)?.is_premium === true || isPro;
          professionalAnnual = (profile as any)?.professional_annual === true;
        }
      } catch (_) {
        // ignore
      }
    }

    // v10: annual gating for Layer-2 subscriber rates.
    const isAnnual =
      professionalAnnual ||
      String(subscriptionType ?? "").toLowerCase().includes("annual");

    // Canonical PRICING (src/config/pricing.ts) is the source of truth.
    const standaloneCents = tool.fallback_standalone_cents;
    const subscriberCents = tool.fallback_subscriber_cents;
    const stripeConfigured = tool.fallback_standalone_cents > 0;

    const subscriberFree = SUBSCRIBER_FREE_TOOLS.has(tool_slug);
    const isSubscriberFree = subscriberFree && isPremium;
    // v10: Layer-2 subscriber rates require annual; monthly subs pay standalone.
    const gated = ANNUAL_GATED_TOOLS.has(tool_slug);
    const effectiveCents = isPremium
      ? (subscriberFree ? 0 : (gated && !isAnnual ? standaloneCents : subscriberCents))
      : standaloneCents;

    return new Response(
      JSON.stringify({
        tier: isPremium ? "subscriber" : "standalone",
        tool_slug,
        tool_name: tool.name,
        subscription_type: subscriptionType,
        is_pro: isPro,
        is_premium: isPremium,
        is_annual: isAnnual,
        is_subscriber_free: isSubscriberFree,
        is_cppa: isCppa,
        is_included: isSubscriberFree,
        classification: tool.classification,
        amount_cents: effectiveCents,
        standalone_amount_cents: standaloneCents,
        subscriber_amount_cents: subscriberCents,
        founding_amount_cents: subscriberCents,
        stripe_price_id: null,
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
