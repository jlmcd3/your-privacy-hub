import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// v8 pricing model (May 2026 memo):
//   Standalone = the per-use price for every tier — Intelligence and
//   Professional subscribers pay the SAME standalone price. The only
//   discount is the founding-subscriber promotion (20% off Smart Tools,
//   15% off Convenience Tools), applied to founding_subscriber = true.
//
//   `subscriber_lookup` is retained as the Stripe lookup key for the
//   founding-rate Price object; `fallback_subscriber_cents` is the
//   founding-rate fallback used when Stripe lookup fails.
//
//   Keep in sync with src/config/pricing.ts PRICING.tools and the
//   PRICING_REGISTRY v8 entries.
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
    fallback_subscriber_cents: 2500,
    classification: "smart",
  },
  governance_assessment: {
    name: "Privacy Program Assessment Tool",
    standalone_lookup: "hc_standalone_v2",
    subscriber_lookup: "hc_subscriber_v2",
    fallback_standalone_cents: 8900,
    fallback_subscriber_cents: 2500,
    classification: "smart",
  },
  li_analyzer: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    fallback_standalone_cents: 6900,
    fallback_subscriber_cents: 3500,
    classification: "smart",
  },
  li_assessment: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    fallback_standalone_cents: 6900,
    fallback_subscriber_cents: 3500,
    classification: "smart",
  },
  dpia_builder: {
    name: "Impact Assessment Builder",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    fallback_standalone_cents: 7900,
    fallback_subscriber_cents: 4900,
    classification: "smart",
  },
  dpia_framework: {
    name: "Impact Assessment Builder",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    fallback_standalone_cents: 7900,
    fallback_subscriber_cents: 4900,
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
    fallback_standalone_cents: 8900,
    fallback_subscriber_cents: 7900,
    classification: "smart",
  },
  cppa_cybersecurity: {
    name: "CPPA Cybersecurity Readiness — Module 2",
    standalone_lookup: "cppa_cyber_standalone",
    subscriber_lookup: "cppa_cyber_subscriber",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 8900,
    classification: "smart",
  },
  cppa_suite: {
    name: "CPPA Full Audit Suite",
    standalone_lookup: "cppa_suite_standalone",
    subscriber_lookup: "cppa_suite_subscriber",
    fallback_standalone_cents: 16900,
    fallback_subscriber_cents: 14900,
    classification: "smart",
  },
  dpa_generator: {
    name: "Your Custom DPA",
    standalone_lookup: "dpa_standalone_v2",
    subscriber_lookup: "dpa_subscriber_v2",
    fallback_standalone_cents: 4900,
    fallback_subscriber_cents: 4900,

    classification: "smart",
  },
  ir_playbook: {
    name: "Incident Response Playbook",
    standalone_lookup: "ir_standalone_v2",
    subscriber_lookup: "ir_subscriber_v2",
    fallback_standalone_cents: 5900,
    fallback_subscriber_cents: 5900,
    classification: "convenience",
  },
  biometric_checker: {
    name: "Biometric Privacy Compliance Assessment",
    standalone_lookup: "biometric_standalone_v2",
    subscriber_lookup: "biometric_subscriber_v2",
    fallback_standalone_cents: 4900,
    fallback_subscriber_cents: 4900,
    classification: "smart",
  },
};

// Tools that bypass Stripe entirely for is_pro subscribers (FREE).
const SUBSCRIBER_FREE_TOOLS = new Set(["ir_playbook", "biometric_checker"]);

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

    // Resolve subscriber identity. `is_pro` users on the SUBSCRIBER_FREE_TOOLS
    // list (IR Playbook, Biometric Checker) bypass Stripe entirely.
    let subscriptionType: string | null = null;
    let isPro = false;
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
            .select("subscription_type, is_pro")
            .eq("id", user.id)
            .single();
          subscriptionType = (profile as any)?.subscription_type ?? null;
          isPro = (profile as any)?.is_pro === true;
        }
      } catch (_) {
        // ignore
      }
    }

    // Canonical PRICING (src/config/pricing.ts) is the source of truth.
    // We use the in-file fallbacks (which are kept in sync by
    // scripts/check-pricing-drift.mjs) rather than reading from Stripe — Stripe
    // is the destination for sync-pricing, not a source we trust at runtime.
    const standaloneCents = tool.fallback_standalone_cents;
    const subscriberCents = tool.fallback_subscriber_cents;
    const stripeConfigured = tool.fallback_standalone_cents > 0;

    const subscriberFree = SUBSCRIBER_FREE_TOOLS.has(tool_slug);
    const isSubscriberFree = subscriberFree && isPro;
    // `effectiveCents` is what we'd charge THIS caller right now. Subscriber-
    // free tools resolve to 0 only for the active subscriber; everyone else
    // pays the canonical standalone price.
    const effectiveCents = isPro ? (subscriberFree ? 0 : subscriberCents) : standaloneCents;

    return new Response(
      JSON.stringify({
        tier: isPro ? "subscriber" : "standalone",
        tool_slug,
        tool_name: tool.name,
        subscription_type: subscriptionType,
        is_pro: isPro,
        is_subscriber_free: isSubscriberFree,
        is_cppa: isCppa,
        is_included: isSubscriberFree,
        classification: tool.classification,
        amount_cents: effectiveCents,
        standalone_amount_cents: standaloneCents,
        // Report the canonical subscriber price; `is_subscriber_free` separately
        // tells callers when this caller will be charged 0.
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
