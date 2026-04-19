// Create a Stripe checkout session for the Registration Manager.
// Uses inline price_data (DIY $49, Done-for-You $299/jurisdiction, Renewal $199/yr/jurisdiction)
// so the feature works without pre-provisioned Stripe products.
//
// Tiers:
//   "diy"           — one-time $49 flat (regardless of jurisdiction count)
//   "done_for_you"  — one-time $299 × N jurisdictions
//   "renewal"       — recurring $199/yr × N jurisdictions
//
// Persists a registration_orders row in pending state, then returns checkout URL.
// The payments-webhook handler (existing) can be extended later to mark orders paid.

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

const PRICING = {
  diy: { unit_amount: 4900, name: "Registration Manager — DIY Toolkit", recurring: false },
  done_for_you: { unit_amount: 29900, name: "Registration Manager — Done-for-You", recurring: false },
  renewal: { unit_amount: 19900, name: "Registration Manager — Annual Renewal", recurring: true },
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

    const { tier, jurisdictions, assessment_id, organization_snapshot } = await req.json();
    if (!tier || !PRICING[tier as keyof typeof PRICING]) {
      return new Response(JSON.stringify({ error: "Invalid tier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const codes: string[] = Array.isArray(jurisdictions) ? jurisdictions : [];
    if (tier !== "diy" && codes.length === 0) {
      return new Response(JSON.stringify({ error: "Select at least one jurisdiction" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cfg = PRICING[tier as keyof typeof PRICING];
    const quantity = tier === "diy" ? 1 : Math.max(1, codes.length);
    const totalCents = cfg.unit_amount * quantity;

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
            product_data: { name: cfg.name },
            unit_amount: cfg.unit_amount,
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
