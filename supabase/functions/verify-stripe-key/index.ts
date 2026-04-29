// Admin-only: verifies STRIPE_SANDBOX_API_KEY / STRIPE_LIVE_API_KEY by
// calling stripe.accounts.retrieve() through the connector gateway.
// Returns non-sensitive account info so an admin can confirm the key
// points at the expected Stripe account. Never returns the key itself.
//
// Auth: requires a logged-in user with the 'admin' role in user_roles.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

  // Verify caller is a logged-in admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userErr } = await userClient.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: roleRow } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Admins only" }), {
      status: 403,
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
    const prices = await stripe.prices.list({ limit: 5, active: true });

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
