// Create a Stripe checkout session for the Registration Manager.
// Uses inline price_data so the feature works without pre-provisioned Stripe products.
//
// Tiers (we never submit filings on the user's behalf) — amounts come from
// src/config/pricing.ts via _shared/pricing-snapshot.ts:
//   "diy"             — one-time: registration_standalone for the first
//                       jurisdiction + registration_additional_filing for
//                       each additional jurisdiction in the same order
//   "counsel_review"  — one-time registration_counsel_review flat
//                       (Counsel-Ready Pack: enhanced docs + handoff)
//   "renewal"         — RETIRED (V7-B3): bundled with any active subscription
//
// Subscriber discounts (Professional plan only):
//   - $75 off the Counsel-Ready Pack
//
// Backwards-compat: legacy "done_for_you" tier is silently mapped to "counsel_review".
//
// Persists a registration_orders row in pending state, then returns checkout URL.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";
import { registryCents } from "../_shared/pricing-snapshot.ts";

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

// DIY pricing — v13 (2026-08-29) multi-jurisdiction ladder, read from the
// master price list through the generated snapshot (QA batch 2026-09-05,
// REG 01: this file charged a hand-copied $45 flat while the site said $79):
//   first jurisdiction            registration_standalone          ($79)
//   each additional jurisdiction  registration_additional_filing   ($49)
// src/pages/RegistrationAssessmentResult.tsx computes the same ladder from
// PRICING_REGISTRY for display.
export function diyPriceCents(numJurisdictions: number): number {
  const n = Math.max(1, numJurisdictions);
  return registryCents("registration_standalone") + (n - 1) * registryCents("registration_additional_filing");
}
function diyPriceLabel(numJurisdictions: number): string {
  const suffix = numJurisdictions === 1
    ? "1 jurisdiction"
    : `${numJurisdictions} jurisdictions`;
  return `Registration Manager — DIY Toolkit (${suffix})`;
}

const COUNSEL_REVIEW_CENTS = registryCents("registration_counsel_review"); // $299 flat
// -$75 off the Counsel-Ready Pack for PROFESSIONAL subscribers (header rule
// above; the line-item label says "Professional $75 off"). Not a registry
// entry — a discount, not a price.
const COUNSEL_REVIEW_SUBSCRIBER_DISCOUNT_CENTS = 7500;
// V7-B3: "renewal" tier retired — renewal tracking now bundled with any active subscription.

const PRICING = {
  diy: { unit_amount: 0 /* dynamic */, name: "Registration Manager — DIY Toolkit", recurring: false, per_jurisdiction: false },
  counsel_review: { unit_amount: COUNSEL_REVIEW_CENTS, name: "Registration Manager — Counsel-Ready Pack", recurring: false, per_jurisdiction: false },
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
    // V7-B3: renewal SKU retired — return 410 Gone with a clear message.
    if (tier === "renewal") {
      return new Response(
        JSON.stringify({ error: "tier_retired", message: "Renewal monitoring is now included with any active subscription." }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
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
      .select("is_premium, is_pro")
      .eq("id", user.id)
      .single();
    const isSubscriber = !!(profile?.is_premium || profile?.is_pro);
    // QA batch 2026-09-05 — the Counsel-Ready discount is labelled
    // "Professional $75 off" on the line item and in the header rule; it was
    // granted to ANY subscriber. Gate it on is_pro so label and charge agree.
    const isProfessional = profile?.is_pro === true;

    // Pricing rules (must match src/pages/RegistrationAssessmentResult.tsx):
    //   diy            -> $79 first jurisdiction + $49 each additional (registry)
    //   counsel_review -> flat $299 (registry), -$75 for Professional subscribers
    //   renewal        -> retired (410 above)
    let unitAmount: number = cfg.unit_amount;
    let quantity = 1;
    let productName: string = cfg.name;
    if (tier === "diy") {
      unitAmount = diyPriceCents(codes.length);
      productName = diyPriceLabel(codes.length);
    } else if (tier === "counsel_review" && isProfessional) {
      unitAmount = Math.max(0, unitAmount - COUNSEL_REVIEW_SUBSCRIBER_DISCOUNT_CENTS);
      productName = `${productName} — Professional $75 off`;
    }
    // Per-jurisdiction quantities apply to all per_jurisdiction tiers (e.g. renewal).
    if (cfg.per_jurisdiction) {
      quantity = Math.max(1, codes.length);
    }
    const totalCents = unitAmount * quantity;

    // Derive client_id from the linked assessment so the order is filed under
    // the same client subaccount the assessment was generated in.
    let derivedClientId: string | null = null;
    if (assessment_id) {
      const { data: a } = await adminClient
        .from("registration_assessments")
        .select("client_id")
        .eq("id", assessment_id)
        .maybeSingle();
      derivedClientId = (a as any)?.client_id ?? null;
    }

    const { data: order, error: orderErr } = await adminClient
      .from("registration_orders")
      .insert({
        user_id: user.id,
        client_id: derivedClientId,
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
      : "https://enduserprivacy.com";

    // CUSTOMER-1: canonical customer resolution by userId (metadata),
    // then email fallback with userId backfill.
    const customerId = await resolveOrCreateCustomer(stripe, {
      userId: user.id,
      email: user.email ?? undefined,
    });

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
      customer: customerId,
      // SWEEP-2 T8: ownership anchor for verify-purchase.
      client_reference_id: user.id,
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
      ...(cfg.recurring
        ? {
            subscription_data: {
              metadata: {
                type: "registration_order",
                product: "registration_manager",
                order_id: order.id,
                user_id: user.id,
              },
            },
          }
        : {}),
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
