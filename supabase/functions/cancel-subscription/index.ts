// Cancel-at-period-end (or resume) the current user's Stripe subscription.
// User retains access until current_period_end; webhook updates the profile.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function detectEnv(): StripeEnv {
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
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
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { resume?: boolean } = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }
    const resume = body.resume === true;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profErr) {
      console.error("profile lookup error:", profErr);
      return new Response(JSON.stringify({ error: "Could not look up subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = detectEnv();
    const stripe = createStripeClient(env);

    // Resolve subscription id: stored on profile, else look up via customer.
    let subscriptionId = profile?.stripe_subscription_id as string | undefined;
    let customerId = profile?.stripe_customer_id as string | undefined;

    if (!customerId && user.email) {
      const found = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = found.data[0]?.id;
    }

    if (!subscriptionId && customerId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });
      // Prefer an active/trialing/past_due sub; otherwise most recent.
      const live = subs.data.find((s) =>
        ["active", "trialing", "past_due"].includes(s.status)
      );
      subscriptionId = (live ?? subs.data[0])?.id;
    }

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: "No active subscription found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const updated = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !resume,
    });

    // Reflect in profile immediately (webhook will also fire).
    const periodEnd =
      (updated as any).current_period_end ??
      (updated as any).items?.data?.[0]?.current_period_end ??
      null;
    await admin
      .from("profiles")
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId ?? null,
        cancel_at_period_end: !resume,
        subscription_end_date: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({
        ok: true,
        cancel_at_period_end: !resume,
        current_period_end: periodEnd,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("cancel-subscription error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
