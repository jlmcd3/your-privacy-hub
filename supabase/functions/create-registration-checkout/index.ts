// Create a Stripe checkout session for the Registration Manager.
// Uses inline price_data so the feature works without pre-provisioned Stripe products.
//
// Tiers (we never submit filings on the user's behalf):
//   "diy"             — one-time $49 flat (regardless of jurisdiction count)
//   "counsel_review"  — one-time $299 flat (Counsel-Ready Pack: enhanced docs + handoff)
//   "renewal"         — recurring $199/yr × N jurisdictions (renewal monitoring + regenerated docs)
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

function detectEnv(): StripeEnv {
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

// DIY pricing is tiered by jurisdiction count:
//   1 jurisdiction         = $49
//   2-3 jurisdictions      = $89
//   4+ jurisdictions       = $149
function diyPriceCents(numJurisdictions: number): number {
  if (numJurisdictions <= 1) return 4900;
  if (numJurisdictions <= 3) return 8900;
  return 14900;
}
function diyPriceLabel(numJurisdictions: number): string {
  if (numJurisdictions <= 1) return "Registration Manager — DIY Toolkit (1 jurisdiction)";
  if (numJurisdictions <= 3) return `Registration Manager — DIY Toolkit (${numJurisdictions} jurisdictions)`;
  return `Registration Manager — DIY Toolkit (${numJurisdictions} jurisdictions)`;
}

const PRICING = {
  diy: { unit_amount: 0 /* dynamic */, name: "Registration Manager — DIY Toolkit", recurring: false, per_jurisdiction: false },
  counsel_review: { unit_amount: 29900, name: "Registration Manager — Counsel-Ready Pack", recurring: false, per_jurisdiction: false },
  renewal: { unit_amount: 19900, name: "Registration Manager — Annual Renewal Monitoring", recurring: true, per_jurisdiction: true },
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
    const { jurisdictions, assessment_id, organization_snapshot } = raw;
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
    // Pricing rules:
    //   diy            -> tiered flat fee based on jurisdiction count (qty 1)
    //   counsel_review -> flat $299 (qty 1)
    //   renewal        -> $199/yr × N jurisdictions
    let unitAmount = cfg.unit_amount;
    let quantity = 1;
    let productName = cfg.name;
    if (tier === "diy") {
      unitAmount = diyPriceCents(codes.length);
      productName = diyPriceLabel(codes.length);
    } else if (cfg.per_jurisdiction) {
      quantity = Math.max(1, codes.length);
    }
    const totalCents = unitAmount * quantity;

    // Use service role for the order insert so RLS doesn't block
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const env = detectEnv();
    const stripe = createStripeClient(env);
    const origin = req.headers.get("origin") || "http://localhost:5173";

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
      success_url: `${origin}/registration-manager/order/${order.id}?status=success`,
      cancel_url: `${origin}/registration-manager/order/${order.id}?status=cancelled`,
      customer_email: user.email!,
      metadata: {
        product: "registration_manager",
        order_id: order.id,
        user_id: user.id,
        tier,
        jurisdictions: codes.join(","),
      },
      ...(cfg.recurring && {
        subscription_data: {
          metadata: {
            product: "registration_manager",
            order_id: order.id,
            user_id: user.id,
          },
        },
      }),
    });

    await adminClient
      .from("registration_orders")
      .update({ stripe_session_id: session.id })
      .eq("id", order.id);

    return new Response(JSON.stringify({ url: session.url, order_id: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-registration-checkout error", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
