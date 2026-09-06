import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId, resolveOrCreateCustomer } from "../_shared/stripe.ts";
import {
  ANNUAL_GATED_TOOLS,
  PROFESSIONAL_INCLUDED_TOOLS,
  SUBSCRIPTION_ONLY_TOOLS,
  TOOL_CATALOG,
  describePriceDrift,
  toolStandaloneCents,
  toolSubscriberCents,
} from "../_shared/pricing.ts";
import { registryCents } from "../_shared/pricing-snapshot.ts";
import { REVISIONS_ENABLED } from "../regenerate-assessment/_local/revision-gate.ts";
import { missingSuiteModules, readSuiteModules } from "../_shared/suite-intake.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// QA batch 2026-09-05 — the hand-copied TOOLS cents table that used to live
// here is gone. Slug → lookup key / table wiring comes from
// _shared/pricing.ts; every amount comes from _shared/pricing-snapshot.ts,
// the GENERATED projection of src/config/pricing.ts (regenerate with
// scripts/pricing/generate-pricing-snapshot.ts; guarded by
// src/test/pricingSnapshot.test.ts). Verify with /admin/pricing-reconciliation.
const TOOLS = TOOL_CATALOG;

// v13 (2026-08-29, LAUNCH REPRICING): tools that bypass Stripe entirely for
// PROFESSIONAL subscribers (any cadence). Intelligence subscribers pay the
// standalone rate on these three — the tier split that closes the
// $20-month → generate-everything → cancel arbitrage. (v9 granted these to
// ANY active subscriber.)
const SUBSCRIBER_FREE_TOOLS = PROFESSIONAL_INCLUDED_TOOLS;

// Tools whose row insert needs a `module` discriminator (CPPA family).
const MODULE_FOR_TOOL: Record<string, string> = {
  cppa_risk_assessment: "risk_assessment",
  cppa_cybersecurity: "cybersecurity",
  cppa_suite: "suite",
  // CONVERSION SWAP (2026-08-20): new cppa_admt purchases now run the v2
  // deterministic engine (run-admt-checker-v2), which filters its own reads
  // on module = "admt_v2". v1's ~267 existing "admt" rows are untouched and
  // continue to render exactly as before — this only changes what NEW rows
  // get stamped with.
  cppa_admt: "admt_v2",
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
      // QA batch 2026-09-05 — the registry is authoritative for the amount;
      // Stripe's Price object is consulted only to log drift.
      const topupCents = registryCents(topupLookup);
      const topupPrice = await resolvePriceId(topupStripe, topupLookup);
      const topupDrift = describePriceDrift(topupLookup, topupCents, topupPrice?.unit_amount);
      if (topupDrift) console.warn(JSON.stringify({ ...topupDrift, fn: "create-tool-checkout", tool_type, topup: true }));
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
            unit_amount: topupCents,
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

    // ── Subscription-only tools (RoPA, US/EU / Global Privacy Notices) ──
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

    // ── Professional FREE bypass (IR Playbook, Biometric Compliance Assessment, DPA) ──
    // v13: gated on isPro (Professional, any cadence). Intelligence
    // subscribers fall through to standard checkout at the standalone rate.
    // Stripe disallows $0 sessions; insert the assessment row directly
    // with is_subscriber_credit=true and return the success path so the
    // client navigates straight to the result page.
    if (isPro && SUBSCRIBER_FREE_TOOLS.has(tool_type)) {
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

    // ── v12 (2026-08-11) RoPA PRICING GATE ────────────────────────────────
    // Ratified policy, server-authoritative:
    //   ANNUAL subscribers (Intelligence annual and Professional annual are
    //   treated IDENTICALLY): the FIRST RoPA generation is free; each
    //   subscription year carries ONE free update, drawn from the RoPA credit
    //   pool (pool='ropa', flat 1/yr); a second or later update inside the
    //   same year is $39 (ropa_annual_additional, v13).
    //   MONTHLY subscribers: every RoPA action — initial or update — is $49.
    // Non-subscribers are already rejected by SUBSCRIPTION_ONLY_TOOLS above.
    const ROPA_TOOLS = new Set(["ropa_initial", "ropa_refresh"]);
    let ropaPaidCharge = false;
    if (isPremium && ROPA_TOOLS.has(tool_type) && user_id) {
      const ropaBypass = async (mode: "first_free" | "annual_credit", creditId?: string) => {
        const { data: row, error: insErr } = await supabase
          .from(tool.table)
          .insert({
            user_id,
            client_id: client_id || null,
            status: "pending",
            intake_data: intake_data || {},
            purchased_as_standalone: false,
            is_subscriber_credit: true,
            purchase_price_cents: 0,
          })
          .select("id")
          .single();
        if (insErr || !row) {
          return new Response(JSON.stringify({ error: "Failed to create assessment row" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (creditId) {
          await supabase
            .from("annual_tool_credits")
            .update({
              redeemed_at: new Date().toISOString(),
              redeemed_tool: "ropa",
              redeemed_assessment_id: row.id,
            })
            .eq("id", creditId);
        }
        const successPath = `/ropa/review/${row.id}?purchased=true&${mode === "first_free" ? "subscriber_free=true" : "annual_credit=true"}`;
        return new Response(
          JSON.stringify({
            bypassed: true,
            assessment_id: row.id,
            url: successPath,
            redirect_path: successPath,
            ropa_pricing_mode: mode,
            ...(creditId ? { annual_credit_redeemed: true } : {}),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      };

      if (!isAnnualSubscriber) {
        // Monthly subscriber → always $49, no free path, no credit.
        ropaPaidCharge = true;
      } else {
        // Has this user ever produced a RoPA before? The FIRST one is free.
        const { count: priorCount } = await supabase
          .from("ropa_sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user_id);
        if ((priorCount ?? 0) === 0) return await ropaBypass("first_free");

        // Otherwise it is an update: try the RoPA annual credit (live only —
        // a sandbox checkout must never burn a live credit).
        if (checkoutEnv === "live") {
          let rq = supabase
            .from("annual_tool_credits")
            .select("id")
            .eq("user_id", user_id)
            .eq("environment", "live")
            .eq("pool", "ropa")
            .is("redeemed_at", null)
            .order("cycle_start", { ascending: false })
            .limit(1);
          rq = client_id ? rq.eq("client_id", client_id) : rq.is("client_id", null);
          const { data: ropaCredit } = await rq.maybeSingle();
          if (ropaCredit) return await ropaBypass("annual_credit", (ropaCredit as any).id);
        }
        // Credit already spent this year → $39 (annual-additional rate).
        ropaPaidCharge = true;
      }
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
    // v13: the three Professional-included tools never use their $0
    // subscriber lookup here — Professional buyers were already bypassed
    // above, so anyone reaching this point pays the standalone rate.
    const useSubscriberPrice =
      isPremium && !!tool.subscriber_lookup && !gatedToolRequiresAnnual &&
      !SUBSCRIBER_FREE_TOOLS.has(tool_type);
    // v13: a chargeable RoPA action is $49 (ropa_paid_generation) for
    // monthly subscribers and non-entitled actions, and $39
    // (ropa_annual_additional) for ANNUAL subscribers beyond the included
    // initial generation + one yearly update.
    const ropaLookup = isAnnualSubscriber ? "ropa_annual_additional" : "ropa_paid_generation";
    const lookupKey = ropaPaidCharge
      ? ropaLookup
      : (useSubscriberPrice ? tool.subscriber_lookup! : tool.standalone_lookup);
    // QA batch 2026-09-05 — the REGISTRY amount is what the customer pays.
    // Before this change `resolved.unit_amount ?? fallback` let a stale Stripe
    // Price object (last synced at v11) override the v13 registry: seven
    // observed checkouts charged $139/$169/$59/$59/$59/$49/$45 against site
    // prices of $179/$239/$99/$99/$89/$69/$79.
    const registryAmountCents = ropaPaidCharge
      ? registryCents(ropaLookup)
      : (useSubscriberPrice ? toolSubscriberCents(tool_type) : toolStandaloneCents(tool_type));

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


    // NOTE: free convenience-run consumption is enforced client-side via
    // checkFreeConvenienceRun()/consumeFreeConvenienceRun() in
    // src/lib/freeConvenienceRun.ts. Stripe disallows $0 sessions, so when
    // a free run is available the client should mark the row as paid
    // directly and skip create-tool-checkout entirely.

    // Stripe's Price object under this lookup key is read ONLY to detect
    // drift; the line item below charges `amountCents` via price_data, so a
    // stale or missing Stripe price can never change what the customer pays.
    // Operators fix drift by running sync-pricing (Admin → Pricing).
    const amountCents: number = registryAmountCents;
    if (amountCents <= 0) {
      return new Response(
        JSON.stringify({ error: "zero_amount", message: "This product has no chargeable price for this tier." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    try {
      const resolved = await resolvePriceId(stripe, lookupKey);
      const drift = describePriceDrift(lookupKey, amountCents, resolved?.unit_amount);
      if (drift) console.warn(JSON.stringify({ ...drift, fn: "create-tool-checkout", tool_type, env }));
    } catch (driftErr) {
      console.warn(JSON.stringify({ evt: "pricing_drift_check_failed", fn: "create-tool-checkout", lookup_key: lookupKey, message: (driftErr as Error)?.message }));
    }


    // Tier bookkeeping mirrors the entitlement read used for pricing: any
    // active subscription (monthly, annual, annual_founding) records its
    // real tier. "standalone" is reserved for non-premium buyers. Without
    // this alignment, intelligence-annual subscribers received subscriber
    // pricing but were tagged tier="standalone", reproducing the same
    // bookkeeping mismatch the payments-webhook subscriber_at_time fix
    // corrected.
    const isProfessionalSubscriber = isPremium && isPro;
    const isIntelligenceSubscriber = isPremium && !isPro;
    void isIntelligenceSubscriber; void isProfessionalSubscriber;



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
    // QA batch 2026-09-05 (CY 02 / RA 04 / AD 01 / DPIA 01 / LIA 02): the
    // Stripe line item promised "4 generations … regenerate up to 3 times"
    // while the product page said revisions are disabled. The description now
    // follows the same REVISIONS_ENABLED gate as the site copy
    // (src/config/pricing.ts INCLUDED_GENERATIONS_COPY).
    const includedGenerationsDescription = REVISIONS_ENABLED
      ? "Includes 4 generations — refine your answers and regenerate up to 3 times at no extra cost."
      : "Includes your initial report generation.";
    const productDataWithDescription = INCLUDED_GEN_TOOLS.has(tool_type)
      ? { name: tool.name, description: includedGenerationsDescription }
      : { name: tool.name };

    // Always price_data: the amount is the registry amount resolved above. A
    // Stripe Price object is never placed on the line item, so Stripe-side
    // drift cannot change the charge.
    const lineItemBase = {
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
        // Suite purchase creates one row per module so each can be processed
        // independently.
        //
        // QA round two (SUITE-A-02 / SUITE-B03, High, 2026-09-06) — the Suite
        // has two entry points (/cppa-risk-assessment?suite=true and
        // /cppa-cybersecurity?suite=true) and each collects only its OWN
        // module's intake. Both rows were then written with that single
        // payload, so the Cybersecurity module ran against Risk answers and
        // produced a paid "Insufficient basis to assess, 0/100, all 18
        // controls not assessable" document. That 0 reflected that no answers
        // were ever collected, not that the customer has no controls — and
        // customer B had a complete standalone Cyber record sitting unused.
        //
        // The bundle now carries an explicit per-module envelope, and the
        // purchase is REFUSED unless both modules are genuinely answered. A
        // legacy single-module payload resolves to one module and is refused
        // here rather than being duplicated across both rows.
        const suiteModules = readSuiteModules(intake_data);
        const missingModules = missingSuiteModules(suiteModules);
        if (missingModules.length > 0) {
          console.warn(JSON.stringify({
            evt: "suite_intake_incomplete", fn: "create-tool-checkout",
            user_id: user_id || null, missing: missingModules,
          }));
          return new Response(
            JSON.stringify({
              error: "suite_intake_incomplete",
              missing_modules: missingModules,
              message:
                "The CPPA Suite covers two assessments, and both questionnaires have to be completed before it can be purchased. Still to complete: "
                + missingModules
                  .map((m) => (m === "cybersecurity" ? "Cybersecurity Audit Readiness (Module 2)" : "Risk Assessment (Module 1)"))
                  .join(" and ")
                + ".",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        // Each row carries its OWN module's answers.
        const { data: riskRow, error: riskErr } = await supabase
          .from("cppa_assessments")
          .insert({ ...baseRow, module: "risk_assessment", intake_data: suiteModules.risk_assessment ?? {} })
          .select("id")
          .single();
        if (riskErr || !riskRow) {
          console.error("CPPA suite (risk) insert error:", riskErr);
          throw new Error("Failed to create CPPA suite assessment rows");
        }
        const { data: cyberRow, error: cyberErr } = await supabase
          .from("cppa_assessments")
          .insert({ ...baseRow, module: "cybersecurity", intake_data: suiteModules.cybersecurity ?? {} })
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
