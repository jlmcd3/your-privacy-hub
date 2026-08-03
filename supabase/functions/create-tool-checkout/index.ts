import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId, resolveOrCreateCustomer } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PRICE MIRROR — these cents MUST mirror src/config/pricing.ts (v11). (v11 deployed 2026-06-11)
// Any price change updates BOTH files in the same commit. Verify with
// /admin/pricing-reconciliation.
const ANNUAL_GATED_TOOLS = new Set([
  "li_assessment",
  "governance_assessment",
  "dpia_framework",
  "cppa_risk_assessment",
  "cppa_cybersecurity",
  "cppa_suite",
  "cppa_admt",
]);
const TOOLS: Record<
  string,
  {
    name: string;
    standalone_lookup: string;
    subscriber_lookup: string | null;
    table: string;
    fallback_standalone_cents: number;
    fallback_subscriber_cents: number;
  }
> = {
  li_assessment: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    table: "li_assessments",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 4900,
  },
  governance_assessment: {
    name: "Privacy Program Assessment Tool",
    standalone_lookup: "hc_standalone_v2",
    subscriber_lookup: "hc_subscriber_v2",
    table: "governance_assessments",
    fallback_standalone_cents: 8900,
    fallback_subscriber_cents: 4900,
  },
  dpia_framework: {
    name: "Impact Assessment Builder",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    table: "dpia_frameworks",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 4900,
  },
  dpa_generator: {
    name: "Your Custom DPA",
    standalone_lookup: "dpa_standalone_v2",
    subscriber_lookup: "dpa_subscriber_v2",
    table: "dpa_documents",
    fallback_standalone_cents: 4900,
    fallback_subscriber_cents: 0,
  },
  ir_playbook: {
    name: "Your Incident Response Playbook",
    standalone_lookup: "ir_standalone_v2",
    subscriber_lookup: "ir_subscriber_v2",
    table: "ir_playbooks",
    fallback_standalone_cents: 5900,
    fallback_subscriber_cents: 5900,
  },
  biometric_checker: {
    name: "Biometric Privacy Compliance Checker",
    standalone_lookup: "biometric_standalone_v2",
    subscriber_lookup: "biometric_subscriber_v2",
    table: "biometric_assessments",
    fallback_standalone_cents: 4900,
    fallback_subscriber_cents: 4900,
  },

  ropa_initial: {
    name: "RoPA Builder — Initial Generation",
    standalone_lookup: "ropa_initial_standalone",
    subscriber_lookup: "ropa_initial_subscriber",
    table: "ropa_sessions",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
  },
  ropa_refresh: {
    name: "RoPA Builder — Annual Refresh",
    standalone_lookup: "ropa_refresh_standalone",
    subscriber_lookup: "ropa_refresh_subscriber",
    table: "ropa_sessions",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
  },
  us_notice_single: {
    name: "US Privacy Notice — Single State",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    table: "us_notice_sessions",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
  },
  us_notice_all_states: {
    name: "US Privacy Notice — All States Suite",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    table: "us_notice_sessions",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
  },
  us_notice_refresh: {
    name: "US Notice — Annual Refresh",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    table: "us_notice_sessions",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
  },
  eu_notice_single: {
    name: "EU & Global Notice — Single Framework",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
  },
  eu_notice_suite: {
    name: "EU Notice Suite — GDPR + UK GDPR + FADP",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
  },
  eu_notice_full_international: {
    name: "EU & Global Notice — Full International",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
  },
  eu_notice_refresh: {
    name: "EU & Global Notice — Annual Refresh",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    fallback_standalone_cents: 0,
    fallback_subscriber_cents: 0,
  },
  cppa_risk_assessment: {
    name: "CPPA Risk Assessment — Module 1",
    standalone_lookup: "cppa_risk_standalone",
    subscriber_lookup: "cppa_risk_subscriber",
    table: "cppa_assessments",
    fallback_standalone_cents: 22900,
    fallback_subscriber_cents: 12900,
  },
  cppa_cybersecurity: {
    name: "CPPA Cybersecurity Readiness — Module 2",
    standalone_lookup: "cppa_cyber_standalone",
    subscriber_lookup: "cppa_cyber_subscriber",
    table: "cppa_assessments",
    fallback_standalone_cents: 29900,
    fallback_subscriber_cents: 16900,
  },
  cppa_suite: {
    name: "CPPA Full Audit Suite",
    standalone_lookup: "cppa_suite_standalone",
    subscriber_lookup: "cppa_suite_subscriber",
    table: "cppa_assessments",
    fallback_standalone_cents: 44900,
    fallback_subscriber_cents: 24900,
  },
  cppa_admt: {
    name: "ADMT Compliance Assessment — Module 3",
    standalone_lookup: "cppa_admt_standalone",
    subscriber_lookup: "cppa_admt_subscriber",
    table: "cppa_assessments",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 4900,
  },

};

// v9: Tools that bypass Stripe entirely for ANY active subscriber (FREE).
const SUBSCRIBER_FREE_TOOLS = new Set(["ir_playbook", "biometric_checker", "dpa_generator"]);

// Tools that are subscription-only (never sold standalone). Active monthly
// or annual subscription required; free / unauthenticated users are blocked.
const SUBSCRIPTION_ONLY_TOOLS = new Set([
  "ropa_initial",
  "ropa_refresh",
  "us_notice_single",
  "us_notice_all_states",
  "us_notice_refresh",
  "eu_notice_single",
  "eu_notice_suite",
  "eu_notice_full_international",
  "eu_notice_refresh",
]);

// Tools whose row insert needs a `module` discriminator (CPPA family).
const MODULE_FOR_TOOL: Record<string, string> = {
  cppa_risk_assessment: "risk_assessment",
  cppa_cybersecurity: "cybersecurity",
  cppa_suite: "suite",
  cppa_admt: "admt",
};

const SESSION_TABLES = new Set([
  "ropa_sessions",
  "us_notice_sessions",
  "eu_notice_sessions",
]);

const DEFAULT_REVIEW_PATHS: Record<string, string> = {
  ropa_sessions: "/ropa/review",
  us_notice_sessions: "/us-notices/review",
  eu_notice_sessions: "/eu-notices/review",
};

// Resolve the Stripe environment. Always prefer the explicit value the
// client sends (derived from the publishable token prefix), so test cards
// from the preview never land in live mode.
function detectEnv(override?: string): StripeEnv {
  if (override === "sandbox" || override === "live") return override;
  if (Deno.env.get("STRIPE_SANDBOX_API_KEY")) return "sandbox";
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool_type, user_id, client_id, intake_data, return_url, environment, embedded, success_path, redeem_annual_credit, topup, assessment_id } = await req.json();
    const tool = TOOLS[tool_type];
    if (!tool) {
      return new Response(JSON.stringify({ error: "Invalid tool type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Stage 1 Prompt 1.7: half-price "top-up" — grants +4 generations on an
    // existing assessment's meter. Handled BEFORE the standard purchase flow
    // because it returns immediately with a hosted checkout URL.
    //
    // REV-2 PART A: (a) restricted to the nine metered Smart Tools — this
    // set is identical to regenerate-assessment's TABLE_MAP (L54–63) and
    // by construction excludes every TOOLS entry with
    // fallback_standalone_cents: 0 (RoPA, US/EU notice variants), so an
    // unguarded top-up on a non-metered tool can no longer attempt a
    // zero-amount checkout. (b) Price is sourced from the pricing
    // registry via lookup_key ("<tool>_topup_v1"), NOT computed from
    // fallback_standalone_cents / 2. Registry is the single source of
    // truth; policy is that each top-up is exactly half the tool's
    // current standalone price (see src/config/pricing.ts).
    if (topup === true && assessment_id) {
      const TOPUP_LOOKUPS: Record<string, string> = {
        li_assessment: "li_topup_v1",
        governance_assessment: "governance_topup_v1",
        dpia_framework: "dpia_topup_v1",
        dpa_generator: "dpa_topup_v1",
        ir_playbook: "ir_topup_v1",
        biometric_checker: "biometric_topup_v1",
        cppa_admt: "cppa_admt_topup_v1",
        cppa_risk_assessment: "cppa_risk_topup_v1",
        cppa_cybersecurity: "cppa_cybersecurity_topup_v1",
      };
      const topupLookup = TOPUP_LOOKUPS[tool_type];
      if (!topupLookup) {
        return new Response(
          JSON.stringify({
            error: "topup_not_available_for_tool",
            message: "Meter top-ups are only offered on the nine metered Smart Tools.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const topupEnv = detectEnv(environment);
      const topupStripe = createStripeClient(topupEnv);
      const topupPrice = await resolvePriceId(topupStripe, topupLookup);
      if (!topupPrice || typeof topupPrice.unit_amount !== "number") {
        return new Response(
          JSON.stringify({
            error: "topup_price_not_found",
            lookup_key: topupLookup,
            message: "Top-up price is not yet synced to Stripe. Run sync-pricing from Admin → Pricing.",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const rawOriginTop =
        return_url || req.headers.get("origin") || Deno.env.get("SITE_URL") || "";
      const originTop = /^https?:\/\//i.test(rawOriginTop)
        ? rawOriginTop.replace(/\/$/, "")
        : "https://enduserprivacy.com";
      const defaultPathTop = DEFAULT_REVIEW_PATHS[tool.table] || "/account";
      const returnPathTop = success_path || `${defaultPathTop}?topup_success=true`;
      const session = await topupStripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: { name: `${tool.name} — 4 additional generations` },
            unit_amount: topupPrice.unit_amount,
          },
          quantity: 1,
        }],
        // SWEEP-2 T8: ownership anchor for verify-purchase.
        ...(user_id ? { client_reference_id: String(user_id) } : {}),
        metadata: {
          tool_type,
          assessment_id,
          topup: "true",
          topup_lookup_key: topupLookup,
          user_id: user_id ?? "",
        },
        success_url: `${originTop}${returnPathTop}`,
        cancel_url: `${originTop}${defaultPathTop}`,
      } as any);
      return new Response(JSON.stringify({ url: session.url }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }



    // v8 gating:
    //   - Every tool is per-use (no "included free" tier).
    //   - Founding subscribers (founding_subscriber = true) get 20% off
    //     Smart Tools / 15% off Convenience Tools, applied to standalone.
    //   - Professional annual subscribers may use 1 free Convenience Tool
    //     run per client per month (free_run_used_this_month gate).
    const CPPA_TOOL_LOOKUPS = new Set([
      "cppa_risk_standalone", "cppa_risk_subscriber",
      "cppa_cyber_standalone", "cppa_cyber_subscriber",
      "cppa_suite_standalone", "cppa_suite_subscriber",
      "cppa_admt_standalone", "cppa_admt_subscriber",
    ]);
    const isCppa = !!(tool.standalone_lookup && CPPA_TOOL_LOOKUPS.has(tool.standalone_lookup));

    // Founding-subscriber discount has been retired. Every tier pays the
    // standalone price; we still surface `subscription_type` for downstream
    // routing (e.g. Professional free convenience runs are handled client-side).
    //
    // ENT-2: entitlement is environment-scoped, mirroring useSubscriptionTier
    // on the client. Read user_entitlements for THIS checkout's Stripe
    // environment. No row → in sandbox the user is FREE (never surface live
    // entitlement in sandbox); in live, fall back to profiles (rollout
    // safety for legacy users only).
    const checkoutEnv = detectEnv(environment);
    let isProfessionalAnnual = false;
    let isPro = false;
    let isPremium = false;
    let subscriptionType: string | null = null;
    if (user_id) {
      const { data: entRow } = await supabase
        .from("user_entitlements")
        .select("is_premium, is_pro, subscription_type")
        .eq("user_id", user_id)
        .eq("environment", checkoutEnv)
        .maybeSingle();
      if (entRow) {
        subscriptionType = (entRow as any)?.subscription_type ?? null;
        isPro = (entRow as any)?.is_pro === true;
        isPremium = (entRow as any)?.is_premium === true || isPro;
        isProfessionalAnnual =
          subscriptionType === "annual" ||
          subscriptionType === "annual_founding" ||
          subscriptionType === "pro_annual";
      } else if (checkoutEnv === "live") {
        // Fallback: rollout safety only. profiles is legacy live state.
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_premium, is_pro, subscription_type, professional_annual")
          .eq("id", user_id)
          .single();
        subscriptionType = (profile as any)?.subscription_type ?? null;
        isPro = (profile as any)?.is_pro === true;
        isPremium = (profile as any)?.is_premium === true || isPro;
        isProfessionalAnnual = (profile as any)?.professional_annual === true
          || subscriptionType === "annual" || subscriptionType === "annual_founding";
      }
      // checkoutEnv === "sandbox" with no entitlement row → FREE. Do NOT
      // read profiles here.
    }
    const isAnnualSubscriber =
      isProfessionalAnnual ||
      String(subscriptionType ?? "").toLowerCase().includes("annual");

    // ── Subscription-only tools (RoPA, US/EU Notice Builders) ──
    // These are included with any active subscription (monthly or annual)
    // and are not sold on a standalone basis. Reject free / unauthenticated
    // checkout attempts; subscribers bypass Stripe entirely via their
    // respective generate-* edge functions and never hit this code path.
    if (SUBSCRIPTION_ONLY_TOOLS.has(tool_type) && !isPremium) {
      return new Response(
        JSON.stringify({
          error: "subscription_required",
          message: "This tool is included with an Intelligence or Professional subscription and is not sold on a standalone basis.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Subscriber FREE bypass (IR Playbook, Biometric Checker, DPA) ──
    // v9: gated on isPremium (ANY active subscription), not isPro alone.
    // Stripe disallows $0 sessions; insert the assessment row directly
    // with is_subscriber_credit=true and return the success path so the
    // client navigates straight to the result page.
    if (isPremium && SUBSCRIBER_FREE_TOOLS.has(tool_type)) {
      const insertRow: Record<string, unknown> = {
        user_id,
        client_id: client_id || null,
        status: "pending",
        intake_data: intake_data || {},
        purchased_as_standalone: false,
        is_subscriber_credit: true,
        purchase_price_cents: 0,
      };
      const { data: row, error: insErr } = await supabase
        .from(tool.table)
        .insert(insertRow)
        .select("id")
        .single();
      if (insErr || !row) {
        console.error("Subscriber-free insert error:", insErr);
        return new Response(JSON.stringify({ error: "Failed to create assessment row" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const RESULT_PATH_OVERRIDES: Record<string, string> = { cppa_admt: "/cppa-admt-checker" };
      const toolPath = RESULT_PATH_OVERRIDES[tool_type] ?? `/${tool_type.replace(/_/g, "-")}`;
      const successPath = `${toolPath}/result/${row.id}?purchased=true&subscriber_free=true`;
      return new Response(
        JSON.stringify({
          bypassed: true,
          assessment_id: row.id,
          url: successPath,
          redirect_path: successPath,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── v9 Annual Credit redemption (Governance / LIA / DPIA only) ──
    // Server is authoritative. Verify an unredeemed credit row exists for
    // this user + scope (client_id or personal/null). Valid → mark
    // redeemed, insert assessment with purchase_price_cents=0, return
    // bypass response. Invalid → 409 no_credit_available.
    const ANNUAL_CREDIT_TOOL_MAP: Record<string, string> = {
      governance_assessment: "governance",
      li_assessment: "lia",
      dpia_framework: "dpia",
    };
    if (redeem_annual_credit === true && user_id && ANNUAL_CREDIT_TOOL_MAP[tool_type]) {
      // Annual credits exist only in live. A sandbox/preview checkout must
      // never consume (burn) a live credit. Reject and let the client fall
      // back to the ordinary paid sandbox checkout path.
      if (checkoutEnv !== "live") {
        return new Response(
          JSON.stringify({ error: "annual_credit_live_only" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const creditTool = ANNUAL_CREDIT_TOOL_MAP[tool_type];
      // ENT-1: server-side execution contexts always operate on live entitlement.
      let creditQ = supabase
        .from("annual_tool_credits")
        .select("id, cycle_start")
        .eq("user_id", user_id)
        .eq("environment", "live")
        .is("redeemed_at", null)
        .order("cycle_start", { ascending: false })
        .limit(1);
      if (client_id) creditQ = creditQ.eq("client_id", client_id);
      else creditQ = creditQ.is("client_id", null);
      const { data: creditRow } = await creditQ.maybeSingle();
      if (!creditRow) {
        return new Response(
          JSON.stringify({ error: "no_credit_available" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const insertRow: Record<string, unknown> = {
        user_id,
        client_id: client_id || null,
        status: "pending",
        intake_data: intake_data || {},
        purchased_as_standalone: false,
        is_subscriber_credit: true,
        purchase_price_cents: 0,
      };
      const { data: row, error: insErr } = await supabase
        .from(tool.table)
        .insert(insertRow)
        .select("id")
        .single();
      if (insErr || !row) {
        return new Response(JSON.stringify({ error: "Failed to create assessment row" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await supabase
        .from("annual_tool_credits")
        .update({
          redeemed_at: new Date().toISOString(),
          redeemed_tool: creditTool,
          redeemed_assessment_id: row.id,
        })
        .eq("id", creditRow.id);
      const RESULT_PATH_OVERRIDES: Record<string, string> = { cppa_admt: "/cppa-admt-checker" };
      const toolPath = RESULT_PATH_OVERRIDES[tool_type] ?? `/${tool_type.replace(/_/g, "-")}`;
      const successPath = `${toolPath}/result/${row.id}?purchased=true&annual_credit=true`;
      return new Response(
        JSON.stringify({
          bypassed: true,
          assessment_id: row.id,
          url: successPath,
          redirect_path: successPath,
          annual_credit_redeemed: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Subscribers (any active monthly/annual sub) pay the discounted
    // per-use subscriber price as an inducement to subscribe. Everyone
    // else pays the standalone price. SUBSCRIPTION_ONLY tools and
    // SUBSCRIBER_FREE tools are already short-circuited above.
    // v10: Layer-2 subscriber rates require an annual subscription. Monthly
    // subscribers pay the standalone price for gated tools.
    const gatedToolRequiresAnnual =
      ANNUAL_GATED_TOOLS.has(tool_type) && !isAnnualSubscriber;
    const useSubscriberPrice =
      isPremium && !!tool.subscriber_lookup && !gatedToolRequiresAnnual;
    const lookupKey = useSubscriberPrice ? tool.subscriber_lookup! : tool.standalone_lookup;
    const fallbackCents = useSubscriberPrice
      ? tool.fallback_subscriber_cents
      : tool.fallback_standalone_cents;

    const env = checkoutEnv;
    const stripe = createStripeClient(env);

    // CUSTOMER-1: canonical customer resolution keyed by user_id. When
    // no authenticated user_id is supplied (anonymous flow), fall back
    // to no customer attachment.
    let canonicalCustomerId: string | undefined;
    if (user_id) {
      const { data: userLookup } = await supabase.auth.admin.getUserById(user_id);
      const email = userLookup?.user?.email ?? undefined;
      canonicalCustomerId = await resolveOrCreateCustomer(stripe, { userId: user_id, email });
    }


    const standaloneCents = fallbackCents;

    // NOTE: free convenience-run consumption is enforced client-side via
    // checkFreeConvenienceRun()/consumeFreeConvenienceRun() in
    // src/lib/freeConvenienceRun.ts. Stripe disallows $0 sessions, so when
    // a free run is available the client should mark the row as paid
    // directly and skip create-tool-checkout entirely.

    const resolved = await resolvePriceId(stripe, lookupKey);
    const amountCents: number = resolved?.unit_amount ?? standaloneCents;


    // Preserve legacy variable names referenced later in the file.
    const stripePrice: { id: string; unit_amount?: number | null } | null = null;
    // Tier bookkeeping mirrors the entitlement read used for pricing: any
    // active subscription (monthly, annual, annual_founding) records its
    // real tier. "standalone" is reserved for non-premium buyers. Without
    // this alignment, intelligence-annual subscribers received subscriber
    // pricing but were tagged tier="standalone", reproducing the same
    // bookkeeping mismatch the payments-webhook subscriber_at_time fix
    // corrected.
    const isProfessionalSubscriber = isPremium && isPro;
    const isIntelligenceSubscriber = isPremium && !isPro;
    void stripePrice; void isIntelligenceSubscriber; void isProfessionalSubscriber;



    const rawOrigin = return_url || req.headers.get("origin") || Deno.env.get("SITE_URL") || "";
    const origin = /^https?:\/\//i.test(rawOrigin) ? rawOrigin.replace(/\/$/, "") : "https://enduserprivacy.com";

    const INCLUDED_GEN_TOOLS = new Set([
      "li_assessment",
      "governance_assessment",
      "dpia_framework",
      "dpa_generator",
      "ir_playbook",
      "biometric_checker",
      "cppa_risk_assessment",
      "cppa_cybersecurity",
      "cppa_admt",
    ]);
    const includedGenerationsDescription =
      "Includes 4 generations — refine your answers and regenerate up to 3 times at no extra cost.";
    const productDataWithDescription = INCLUDED_GEN_TOOLS.has(tool_type)
      ? { name: tool.name, description: includedGenerationsDescription }
      : { name: tool.name };

    const lineItemBase = stripePrice
      ? { price: stripePrice.id, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product_data: productDataWithDescription,
            unit_amount: amountCents,
          },
          quantity: 1,
        };

    // ── Session-based tools (RoPA / US Notice / EU Notice) ──
    // The session row already exists from the Q&A flow. Do NOT insert a new
    // row. Generation is triggered by the user from the review screen after
    // the webhook marks payment_confirmed.
    const isSessionTool = SESSION_TABLES.has(tool.table);
    if (isSessionTool) {
      const sessionId = (intake_data as any)?.session_id;
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "session_id required for this tool type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const defaultPath = DEFAULT_REVIEW_PATHS[tool.table] || "/account";
      const returnPath = success_path || `${defaultPath}?payment_success=true`;
      const joinChar = returnPath.includes("?") ? "&" : "?";

      const checkoutParams: Record<string, unknown> = {
        payment_method_types: ["card"],
        line_items: [lineItemBase as any],
        mode: "payment",
        ...(canonicalCustomerId && { customer: canonicalCustomerId }),
        // SWEEP-2 T8: ownership anchor for verify-purchase.
        ...(user_id ? { client_reference_id: String(user_id) } : {}),
        metadata: {
          tool_type,
          assessment_id: sessionId,
          user_id: user_id || "",
          tier: isProfessionalSubscriber ? "professional" : isIntelligenceSubscriber ? "intelligence" : "standalone",
        },
      };

      if (embedded) {
        checkoutParams.ui_mode = "embedded";
        checkoutParams.return_url = `${origin}${returnPath}${joinChar}session_id={CHECKOUT_SESSION_ID}`;
      } else {
        checkoutParams.success_url = `${origin}${returnPath}`;
        checkoutParams.cancel_url = `${origin}${defaultPath}`;
      }

      const sessionResp = await stripe.checkout.sessions.create(checkoutParams as any);

      return new Response(
        JSON.stringify(
          embedded
            ? { client_secret: sessionResp.client_secret, assessment_id: sessionId }
            : { url: sessionResp.url, assessment_id: sessionId },
        ),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── CPPA assessments — table uses a `module` discriminator ──
    let assessmentRecord: { id: string } | null = null;
    let suiteCyberId: string | null = null;
    if (MODULE_FOR_TOOL[tool_type]) {
      const baseRow = {
        user_id: user_id || null,
        client_id: client_id || null,
        status: "pending" as const,
        intake_data: intake_data || {},
        purchase_price_cents: amountCents,
      };

      if (tool_type === "cppa_suite") {
        // Suite purchase creates one row per module so each can be processed independently.
        const { data: riskRow, error: riskErr } = await supabase
          .from("cppa_assessments")
          .insert({ ...baseRow, module: "risk_assessment" })
          .select("id")
          .single();
        if (riskErr || !riskRow) {
          console.error("CPPA suite (risk) insert error:", riskErr);
          throw new Error("Failed to create CPPA suite assessment rows");
        }
        const { data: cyberRow, error: cyberErr } = await supabase
          .from("cppa_assessments")
          .insert({ ...baseRow, module: "cybersecurity" })
          .select("id")
          .single();
        if (cyberErr || !cyberRow) {
          console.error("CPPA suite (cyber) insert error:", cyberErr);
          throw new Error("Failed to create CPPA suite assessment rows");
        }
        assessmentRecord = riskRow;
        suiteCyberId = cyberRow.id;
      } else {
        const { data: row, error: insErr } = await supabase
          .from("cppa_assessments")
          .insert({ ...baseRow, module: MODULE_FOR_TOOL[tool_type] })
          .select("id")
          .single();
        if (insErr || !row) {
          console.error("CPPA insert error:", insErr);
          throw new Error("Failed to create CPPA assessment row");
        }
        assessmentRecord = row;
      }
    }

    // ── All other tools ──
    if (!assessmentRecord) {
      let assessmentData: Record<string, unknown> = {};
      if (tool_type === "li_assessment") {
        // Whitelist columns that actually exist on li_assessments. The
        // intake form passes extra analytics fields (e.g. preview_assessment_id)
        // that are not persisted columns — spreading them caused the insert
        // to fail with PGRST204 "column not found".
        const LI_ALLOWED_KEYS = new Set([
          "organization_name",
          "processing_description",
          "data_categories",
          "relationship_type",
          "jurisdictions",
          "sector",
          "stated_purpose",
          "alternatives_considered",
          "purpose_details",
          "necessity_details",
          "balancing_details",
          // UPGRADE-4 ITEM 2 — attestation block (who reviewed, who approved,
          // re-review triggers). Backed by li_assessments.attestation jsonb.
          "attestation",
          "stage",
          "client_id",
        ]);
        const filteredIntake: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(intake_data || {})) {
          if (LI_ALLOWED_KEYS.has(k)) filteredIntake[k] = v;
        }
        assessmentData = {
          user_id,
          status: "pending",
          processing_description: intake_data?.processing_description || "",
          purchased_as_standalone: true,
          purchase_price_cents: amountCents,
          ...filteredIntake,
          client_id: client_id ?? (filteredIntake as any).client_id ?? null,
        };
      } else {
        assessmentData = {
          user_id,
          client_id: client_id || null,
          status: "pending",
          intake_data: intake_data || {},
          purchased_as_standalone: true,
          purchase_price_cents: amountCents,
        };
      }

      const { data: record, error } = await supabase
        .from(tool.table)
        .insert(assessmentData)
        .select()
        .single();
      if (error || !record) {
        console.error("Insert error:", error);
        throw new Error("Failed to create assessment record");
      }
      assessmentRecord = record;
    }

    const record = assessmentRecord!;

    // Some tool_types have URL slugs that differ from tool_type.replace(/_/g, "-").
    // Override map handles those cases explicitly.
    const RESULT_PATH_OVERRIDES: Record<string, string> = {
      cppa_admt: "/cppa-admt-checker",
    };
    const CANCEL_PATH_OVERRIDES: Record<string, string> = {
      cppa_admt: "/cppa-admt-checker",
    };
    const toolPath = RESULT_PATH_OVERRIDES[tool_type] ?? `/${tool_type.replace(/_/g, "-")}`;
    const cancelToolPath = CANCEL_PATH_OVERRIDES[tool_type] ?? `/${tool_type.replace(/_/g, "-")}`;
    const successPath =
      tool_type === "cppa_suite"
        ? `/cppa-suite/result?risk_id=${record.id}&cyber_id=${suiteCyberId}&purchased=true`
        : `${toolPath}/result/${record.id}?purchased=true`;
    const cancelPath =
      tool_type === "cppa_suite" ? `/cppa-risk-assessment` : cancelToolPath;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [lineItemBase as any],
      mode: "payment",
      ...(canonicalCustomerId && { customer: canonicalCustomerId }),
      // SWEEP-2 T8: ownership anchor for verify-purchase.
      ...(user_id ? { client_reference_id: String(user_id) } : {}),
      metadata: {
        tool_type,
        assessment_id: record.id,
        // For suite purchases, also stash the second (cybersecurity) row so the
        // webhook can dispatch both edge functions after payment.
        ...(suiteCyberId ? { suite_cyber_id: suiteCyberId } : {}),
        user_id: user_id || "",
        tier: isProfessionalSubscriber ? "professional" : isIntelligenceSubscriber ? "intelligence" : "standalone",
      },
      ...(embedded
        ? {
            ui_mode: "embedded",
            return_url: `${origin}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
          }
        : {
            success_url: `${origin}${successPath}`,
            cancel_url: `${origin}${cancelPath}`,
          }),
    });

    return new Response(
      JSON.stringify(
        embedded
          ? {
              client_secret: session.client_secret,
              assessment_id: record.id,
              suite_cyber_id: suiteCyberId,
            }
          : {
              url: session.url,
              assessment_id: record.id,
              suite_cyber_id: suiteCyberId,
            },
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-tool-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Failed to create checkout session" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
