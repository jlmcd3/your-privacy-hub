// Create a Stripe checkout session for the Registration Manager.
// Uses inline price_data so the feature works without pre-provisioned Stripe products.
//
// Tiers (we never submit filings on the user's behalf):
//   "diy"             — one-time tiered fee by jurisdiction count
//                       1 jurisdiction        = $59
//                       up to 3 jurisdictions = $149
//                       up to 7 jurisdictions = $275
//                       8+ (unlimited)        = $499
//   "counsel_review"  — one-time $399 flat (Counsel-Ready Pack: enhanced docs + handoff)
//   "renewal"         — recurring $79/yr × N jurisdictions (renewal monitoring + regenerated docs)
//
// Subscriber discounts (Professional plan):
//   - 20% off all DIY packages
//   - $75 off the Counsel-Ready Pack
//   - Renewal monitoring is unchanged
//
// Backwards-compat: legacy "done_for_you" tier is silently mapped to "counsel_review".
//
// Persists a registration_orders row in pending state, then returns checkout URL.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Resolve the Stripe environment. Always prefer the explicit value the
// client sends (derived from the publishable token prefix), so test cards
// from the preview never land in live mode.
function detectEnv(override?: string): StripeEnv {
  if (override === "sandbox" || override === "live") return override;
  if (Deno.env.get("STRIPE_SANDBOX_API_KEY")) return "sandbox";
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

// DIY pricing — flat per-filing price (May 2026 memo). One price regardless
// of jurisdiction count. Founding subscribers get a 15% Convenience-Tools
// discount. Mirror this in src/pages/RegistrationAssessmentResult.tsx and
// src/config/pricing.ts (registration_standalone / registration_subscriber).
const DIY_STANDALONE_CENTS = 4500;   // $45
const DIY_SUBSCRIBER_CENTS = 3800;   // $38 (founding subscriber)
function diyPriceCents(_numJurisdictions: number, isSubscriber: boolean): number {
  return isSubscriber ? DIY_SUBSCRIBER_CENTS : DIY_STANDALONE_CENTS;
}
function diyPriceLabel(numJurisdictions: number): string {
  const suffix = numJurisdictions === 1
    ? "1 jurisdiction"
    : `${numJurisdictions} jurisdictions`;
  return `Registration Manager — DIY Toolkit (${suffix})`;
}

const COUNSEL_REVIEW_CENTS = 39900; // $399 flat
const COUNSEL_REVIEW_SUBSCRIBER_DISCOUNT_CENTS = 7500; // -$75 for Pro
const RENEWAL_PER_JURISDICTION_CENTS = 7900; // $79/yr

const PRICING = {
  diy: { unit_amount: 0 /* dynamic */, name: "Registration Manager — DIY Toolkit", recurring: false, per_jurisdiction: false },
  counsel_review: { unit_amount: COUNSEL_REVIEW_CENTS, name: "Registration Manager — Counsel-Ready Pack", recurring: false, per_jurisdiction: false },
  renewal: { unit_amount: RENEWAL_PER_JURISDICTION_CENTS, name: "Registration Manager — Annual Renewal Monitoring", recurring: true, per_jurisdiction: true },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const raw = await req.json();
    // Backwards-compat: map legacy tier name
    const tier = raw.tier === "done_for_you" ? "counsel_review" : raw.tier;
    const { jurisdictions, assessment_id, organization_snapshot, environment, embedded, return_url } = raw;
    if (!tier || !PRICING[tier as keyof typeof PRICING]) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const codes: string[] = Array.isArray(jurisdictions) ? jurisdictions : [];
    if (codes.length === 0) {
      return new Response(JSON.stringify({ error: "Select at least one jurisdiction" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = PRICING[tier as keyof typeof PRICING];

    // Look up subscriber status for promotional discounts.
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_premium, is_pro, founding_subscriber")
      .eq("id", user.id)
      .single();
    const isSubscriber = !!(profile?.is_premium || profile?.is_pro);
    const isFoundingSubscriber = !!profile?.founding_subscriber;

    // Pricing rules (must match src/pages/RegistrationAssessmentResult.tsx):
    //   diy            -> flat $45, $38 for founding subscribers (May 2026 memo)
    //   counsel_review -> flat $399, -$75 for subscribers
    //   renewal        -> $79/yr × N jurisdictions (no subscriber discount)
    let unitAmount: number = cfg.unit_amount;
    let quantity = 1;
    let productName: string = cfg.name;
    if (tier === "diy") {
      unitAmount = diyPriceCents(codes.length, isFoundingSubscriber);
      productName = diyPriceLabel(codes.length);
      if (isFoundingSubscriber) {
        productName = `${productName} — Founding Subscriber 15% off`;
      }
    } else if (tier === "counsel_review" && isSubscriber) {
      unitAmount = Math.max(0, unitAmount - COUNSEL_REVIEW_SUBSCRIBER_DISCOUNT_CENTS);
      productName = `${productName} — Professional $75 off`;
    }
    // Per-jurisdiction quantities apply to all per_jurisdiction tiers (e.g. renewal).
    if (cfg.per_jurisdiction) {
      quantity = Math.max(1, codes.length);
    }
    const totalCents = unitAmount * quantity;

    const { data: order, error: orderErr } = await adminClient
      .from("registration_orders")
      .insert({
        user_id: user.id,
        assessment_id: assessment_id || null,
        tier,
        jurisdictions: codes,
        organization_snapshot: organization_snapshot || {},
        amount_cents: totalCents,
        currency: "usd",
        payment_status: "pending",
        fulfillment_status: tier === "diy" ? "documents_ready" : "awaiting_payment",
      })
      .select()
      .single();
    if (orderErr || !order) throw orderErr || new Error("Failed to create order");

    const env = detectEnv(environment);
    const stripe = createStripeClient(env);
    const rawOrigin = return_url || req.headers.get("origin") || "";
    const origin = /^https?:\/\//i.test(rawOrigin)
      ? rawOrigin.replace(/\/$/, "")
      : "https://www.enduserprivacy.com";

    const session = await stripe.checkout.sessions.create({
      mode: cfg.recurring ? "subscription" : "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: productName },
            unit_amount: unitAmount,
            ...(cfg.recurring ? { recurring: { interval: "year" as const } } : {}),
          },
          quantity,
        },
      ],
      customer_email: user.email!,
      metadata: {
        // NOTE: webhook keys off `type === "registration_order"` — keep both
        // for forward-compat with existing dashboards / queries.
        type: "registration_order",
        product: "registration_manager",
        order_id: order.id,
        user_id: user.id,
        tier,
        embedded: embedded ? "true" : "false",
        jurisdictions: codes.join(","),
      },
      ...(cfg.recurring && {
        subscription_data: {
          metadata: {
            type: "registration_order",
            product: "registration_manager",
            order_id: order.id,
            user_id: user.id,
          },
        },
      }),
      ...(embedded
        ? {
            ui_mode: "embedded",
            return_url: `${origin}/registration-manager/order/${order.id}?status=success&session_id={CHECKOUT_SESSION_ID}`,
          }
        : {
            success_url: `${origin}/registration-manager/order/${order.id}?status=success`,
            cancel_url: `${origin}/registration-manager/order/${order.id}?status=cancelled`,
          }),
    });

    await adminClient
      .from("registration_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    // Structured server log — searchable in Edge Function logs.
    console.log(
      JSON.stringify({
        scope: "registration_checkout",
        event: "session_created",
        env,
        embedded: !!embedded,
        order_id: order.id,
        user_id: user.id,
        tier,
        jurisdiction_count: codes.length,
        amount_cents: totalCents,
        is_subscriber: isSubscriber,
        stripe_session_id: session.id,
        recurring: !!cfg.recurring,
      })
    );

    // Audit log row — survives function log retention, queryable from SQL.
    await adminClient.from("registration_audit_log").insert({
      action: "checkout_session_created",
      order_id: order.id,
      user_id: user.id,
      metadata: {
        env,
        embedded: !!embedded,
        tier,
        amount_cents: totalCents,
        jurisdiction_count: codes.length,
        is_subscriber: isSubscriber,
        stripe_session_id: session.id,
      },
    });

    return new Response(
      JSON.stringify(
        embedded
          ? { client_secret: session.client_secret, order_id: order.id }
          : { url: session.url, order_id: order.id }
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = (e as Error).message || "Internal error";
    console.error(
      JSON.stringify({
        scope: "registration_checkout",
        event: "session_create_failed",
        error: msg,
        stack: (e as Error).stack?.split("\n").slice(0, 4).join(" | "),
      })
    );
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
