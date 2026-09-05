import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ANNUAL_GATED_TOOLS,
  PROFESSIONAL_INCLUDED_TOOLS,
  TOOL_CATALOG,
  resolveToolSlug,
  toolStandaloneCents,
  toolSubscriberCents,
} from "../_shared/pricing.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// QA batch 2026-09-05 — this function used to carry its own hand-copied cents
// table (still on v10 when the site was on v13). Every amount now comes from
// _shared/pricing.ts → _shared/pricing-snapshot.ts, the generated projection
// of src/config/pricing.ts. Verify with /admin/pricing-reconciliation.

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const requestedSlug = url.searchParams.get("tool_slug") || "";
    const tool_slug = resolveToolSlug(requestedSlug);
    const tool = TOOL_CATALOG[tool_slug];
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
      "cppa_admt",
    ]);
    const isCppa = CPPA_TOOLS.has(tool_slug);

    // Resolve subscriber identity. Any active subscription (is_premium OR
    // is_pro) qualifies for subscriber pricing on Layer-2 tools; the three
    // Professional-included tools require is_pro (v13).
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

    // Canonical amounts — src/config/pricing.ts via the generated snapshot.
    const standaloneCents = toolStandaloneCents(tool_slug);
    const subscriberCents = toolSubscriberCents(tool_slug);
    const stripeConfigured = standaloneCents > 0;

    // v13: DPA / IR Playbook / Biometric are included for PROFESSIONAL
    // subscribers only. QA batch 2026-09-05 (DPA 01 / BIO 01 / IR 02): this
    // flag used to say "included" for ANY subscriber, so an Intelligence
    // annual account saw "Included with your plan" and then met a $49 Stripe
    // checkout. `is_included` now matches create-tool-checkout's bypass rule.
    const professionalIncluded = PROFESSIONAL_INCLUDED_TOOLS.has(tool_slug);
    const isSubscriberFree = professionalIncluded && isPro;
    const gated = ANNUAL_GATED_TOOLS.has(tool_slug);
    const effectiveCents = isPremium
      ? (professionalIncluded
          ? (isPro ? 0 : standaloneCents)
          : (gated && !isAnnual ? standaloneCents : subscriberCents))
      : standaloneCents;

    return new Response(
      JSON.stringify({
        tier: isPremium ? "subscriber" : "standalone",
        tool_slug: requestedSlug,
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
