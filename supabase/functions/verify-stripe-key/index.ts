// Admin-only: verifies STRIPE_SANDBOX_API_KEY (and optionally LIVE) by
// calling stripe.accounts.retrieve() through the connector gateway.
// Returns non-sensitive account info so an admin can confirm the key
// points at the expected Stripe account. Never returns the key itself.

import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Admin auth via shared admin token
  const adminToken = Deno.env.get("ADMIN_SECRET_TOKEN");
  const auth = req.headers.get("authorization") || "";
  if (!adminToken || auth !== `Bearer ${adminToken}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const envParam = (url.searchParams.get("env") || "sandbox") as StripeEnv;
  if (envParam !== "sandbox" && envParam !== "live") {
    return new Response(
      JSON.stringify({ error: "env must be 'sandbox' or 'live'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const stripe = createStripeClient(envParam);
    const account = await stripe.accounts.retrieve();
    // Also fetch a tiny piece of data to confirm read access works.
    const prices = await stripe.prices.list({ limit: 3, active: true });

    return new Response(
      JSON.stringify({
        ok: true,
        environment: envParam,
        account: {
          id: account.id,
          country: account.country,
          default_currency: account.default_currency,
          email: account.email,
          business_profile_name: account.business_profile?.name ?? null,
          charges_enabled: account.charges_enabled,
          payouts_enabled: account.payouts_enabled,
          details_submitted: account.details_submitted,
          livemode_account: !account.id?.startsWith("acct_") ? null : undefined,
        },
        sample_prices: prices.data.map((p) => ({
          id: p.id,
          lookup_key: p.lookup_key,
          unit_amount: p.unit_amount,
          currency: p.currency,
          recurring: p.recurring?.interval ?? null,
        })),
      }, null, 2),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        environment: envParam,
        error: (e as Error).message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
