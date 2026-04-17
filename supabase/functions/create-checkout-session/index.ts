import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured yet" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { plan, tool_slug, interval } = body as {
      plan?: string;
      tool_slug?: string;
      interval?: "month" | "year";
    };

    // Tool one-time checkout via tool_slug.
    // Maps to subscriber/standalone Stripe price secrets configured later.
    const TOOL_SECRETS: Record<string, { standalone: string; subscriber: string }> = {
      healthcheck: {
        standalone: "STRIPE_HC_STANDALONE_PRICE_ID",
        subscriber: "STRIPE_HC_SUBSCRIBER_PRICE_ID",
      },
      li_analyzer: {
        standalone: "STRIPE_LI_STANDALONE_PRICE_ID",
        subscriber: "STRIPE_LI_SUBSCRIBER_PRICE_ID",
      },
      dpia_builder: {
        standalone: "STRIPE_DPIA_STANDALONE_PRICE_ID",
        subscriber: "STRIPE_DPIA_SUBSCRIBER_PRICE_ID",
      },
    };

    let priceId: string | undefined;
    let mode: "subscription" | "payment" = "subscription";
    const metadata: Record<string, string> = { user_id: user.id };

    if (tool_slug) {
      const secrets = TOOL_SECRETS[tool_slug];
      if (!secrets) {
        return new Response(
          JSON.stringify({ error: "Unknown tool_slug" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();
      const isSubscriber = !!profile?.is_premium;
      priceId = Deno.env.get(isSubscriber ? secrets.subscriber : secrets.standalone) || undefined;
      mode = "payment";
      metadata.tool_slug = tool_slug;
      metadata.tier = isSubscriber ? "subscriber" : "standalone";
    } else {
      // Subscription plan flow
      if (interval === "year" || plan === "annual") {
        priceId = Deno.env.get("STRIPE_ANNUAL_PRICE_ID");
      } else if (plan === "pro") {
        priceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
      } else if (plan === "founding") {
        priceId = Deno.env.get("STRIPE_FOUNDING_PRICE_ID");
      } else {
        priceId = Deno.env.get("STRIPE_STANDARD_PRICE_ID");
      }
    }

    if (!priceId) {
      return new Response(
        JSON.stringify({
          error: "Payments are not configured yet. Please check back soon.",
          code: "stripe_not_configured",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const successPath = tool_slug ? `/${tool_slug.replace(/_/g, "-")}/success` : "/subscribe/success";
    const cancelPath = tool_slug ? `/${tool_slug.replace(/_/g, "-")}` : "/subscribe";

    const formBody: Record<string, string> = {
      mode,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${origin}${successPath}`,
      cancel_url: `${origin}${cancelPath}`,
      customer_email: user.email!,
    };
    for (const [k, v] of Object.entries(metadata)) {
      formBody[`metadata[${k}]`] = v;
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(formBody),
    });

    const session = await stripeRes.json();

    if (session.error) {
      return new Response(JSON.stringify({ error: session.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
