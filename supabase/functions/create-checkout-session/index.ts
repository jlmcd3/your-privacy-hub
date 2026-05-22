import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Subscription plans → human-readable lookup keys
// Intelligence = the $39/mo or $390/yr tier (full archive, weekly brief,
// watchlists, subscriber rates on every tool). Legacy "premium_monthly"
// lookup key is kept as a fallback for any in-flight links.
const PLAN_LOOKUPS: Record<string, string> = {
  intelligence_monthly: "intelligence_monthly",
  intelligence_yearly: "intelligence_yearly",
  intelligence_yearly_founding: "intelligence_yearly_founding",
  // Legacy aliases — all map to the new monthly Professional price.
  pro: "intelligence_monthly",
  premium: "intelligence_monthly",
  standard: "intelligence_monthly",
  monthly: "intelligence_monthly",
  yearly: "intelligence_yearly",
  annual: "intelligence_yearly",
};

// Tool one-time purchases via tool_slug
const TOOL_LOOKUPS: Record<string, { standalone: string; subscriber: string }> = {
  healthcheck: { standalone: "hc_standalone_v2", subscriber: "hc_subscriber_v2" },
  li_analyzer: { standalone: "li_standalone_v2", subscriber: "li_subscriber_v2" },
  dpia_builder: { standalone: "dpia_standalone_v2", subscriber: "dpia_subscriber_v2" },
};

function detectEnv(override?: string): StripeEnv {
  if (override === "sandbox" || override === "live") return override;
  // Fallback: prefer sandbox when its key exists. Live key alone is not
  // enough to assume live mode — the client is the source of truth.
  if (Deno.env.get("STRIPE_SANDBOX_API_KEY")) return "sandbox";
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { plan, tool_slug, interval, environment, embedded, addon } = (await req.json().catch(() => ({}))) as {
      plan?: string;
      tool_slug?: string;
      interval?: "month" | "year";
      environment?: string;
      embedded?: boolean;
      addon?: "per_client_addon";
    };
    const env = detectEnv(environment);

    let lookupKey: string | undefined;
    let mode: "subscription" | "payment" = "subscription";
    const metadata: Record<string, string> = { user_id: user.id };

    // Per-client add-on: requires an active annual Platform subscription.
    // Charged $199/yr as an additional recurring subscription.
    if (addon === "per_client_addon") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_type, is_premium, is_pro")
        .eq("id", user.id)
        .maybeSingle();
      const subType = (profile as any)?.subscription_type as string | null;
      const isAnnual = subType === "annual" || subType === "annual_founding";
      if (!isAnnual) {
        return new Response(
          JSON.stringify({
            error: "annual_required",
            message: "Per-client workspaces require an active annual Platform subscription.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      lookupKey = "per_client_addon";
      mode = "subscription";
      metadata.addon = "per_client_addon";
      metadata.parent_subscription_type = subType!;
    }

    // Guard: if this is a SUBSCRIPTION request and the user is already a
    // premium subscriber, route them to the Stripe Billing Portal instead
    // of attempting to create a duplicate subscription (Stripe would reject
    // it with "Customer already has an active subscription to this price").
    // SKIPPED for add-on subscriptions (the user IS already subscribed by design).
    if (!tool_slug && !addon) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("is_premium, is_pro, stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle();
      const alreadySubscribed = existing?.is_premium === true || existing?.is_pro === true;
      if (alreadySubscribed && existing?.stripe_customer_id) {
        try {
          const stripe = createStripeClient(env);
          const origin = req.headers.get("origin") || "http://localhost:5173";
          const portal = await stripe.billingPortal.sessions.create({
            customer: existing.stripe_customer_id as string,
            return_url: `${origin}/account`,
          });
          return new Response(
            JSON.stringify({
              url: portal.url,
              already_subscribed: true,
              message: "You already have an active subscription. Opening your billing portal.",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        } catch (portalErr) {
          console.error("portal fallback failed:", portalErr);
          return new Response(
            JSON.stringify({
              error: "You already have an active subscription. Please use Manage subscription to make changes.",
              already_subscribed: true,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }
    }

    if (!addon && tool_slug) {
      const lookups = TOOL_LOOKUPS[tool_slug];
      if (!lookups) {
        return new Response(JSON.stringify({ error: "Unknown tool_slug" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: profile } = await supabase.from("profiles").select("is_premium").eq("id", user.id).single();
      const isSubscriber = !!profile?.is_premium;
      lookupKey = isSubscriber ? lookups.subscriber : lookups.standalone;
      mode = "payment";
      metadata.tool_slug = tool_slug;
      metadata.tier = isSubscriber ? "subscriber" : "standalone";
    } else if (!addon) {
      // Resolve interval-aware plan key.
      if (interval === "year") {
        lookupKey = "intelligence_yearly";
        metadata.subscription_tier = "intelligence";
        metadata.subscription_interval = "year";
        metadata.subscription_type = "annual";
      } else {
        const requestedKey = plan || "intelligence_monthly";
        lookupKey = PLAN_LOOKUPS[requestedKey] || PLAN_LOOKUPS.intelligence_monthly;
        metadata.subscription_tier = "intelligence";
        metadata.subscription_interval = "month";
        metadata.subscription_type = "monthly";
      }
    }

    const stripe = createStripeClient(env);
    const stripePrice = await resolvePriceId(stripe, lookupKey!);
    if (!stripePrice) {
      return new Response(JSON.stringify({ error: "Price not found in payment system", lookup_key: lookupKey }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const successPath = addon
      ? "/account?addon=success"
      : tool_slug
      ? `/${tool_slug.replace(/_/g, "-")}/success`
      : "/subscribe/success";
    const cancelPath = addon ? "/account" : tool_slug ? `/${tool_slug.replace(/_/g, "-")}` : "/subscribe";

    // All Intelligence subscriptions (monthly + yearly + founding) get a
    // 10-day free trial. Per-client add-ons are excluded — they're added
    // to an existing paid subscription, not a new signup.
    const isIntelligenceSub =
      mode === "subscription" && metadata.subscription_tier === "intelligence";

    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      customer_email: user.email!,
      metadata,
      ...(mode === "subscription" && {
        subscription_data: {
          metadata: { ...metadata, ...(isIntelligenceSub && { plan: "intelligence", trial: "true" }) },
          ...(isIntelligenceSub && { trial_period_days: 10 }),
        },
      }),
      ...(embedded
        ? {
            ui_mode: "embedded",
            return_url: `${origin}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`,
          }
        : {
            success_url: `${origin}${successPath}`,
            cancel_url: `${origin}${cancelPath}`,
          }),
    });

    return new Response(
      JSON.stringify(embedded ? { client_secret: session.client_secret } : { url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
