import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool catalog. Display amounts are the source of truth for UI fallback when
// Stripe price IDs are not yet configured. Once the user adds the matching
// secret, the Stripe price ID is returned and used by checkout.
const TOOLS: Record<
  string,
  {
    name: string;
    standalone_cents: number;
    subscriber_cents: number;
    standalone_secret: string;
    subscriber_secret: string;
  }
> = {
  healthcheck: {
    name: "Data Privacy Healthcheck",
    standalone_cents: 2900,
    subscriber_cents: 1500,
    standalone_secret: "STRIPE_HC_STANDALONE_PRICE_ID",
    subscriber_secret: "STRIPE_HC_SUBSCRIBER_PRICE_ID",
  },
  li_analyzer: {
    name: "Legitimate Interest Analyzer",
    standalone_cents: 3900,
    subscriber_cents: 1900,
    standalone_secret: "STRIPE_LI_STANDALONE_PRICE_ID",
    subscriber_secret: "STRIPE_LI_SUBSCRIBER_PRICE_ID",
  },
  dpia_builder: {
    name: "DPIA Builder",
    standalone_cents: 6900,
    subscriber_cents: 3900,
    standalone_secret: "STRIPE_DPIA_STANDALONE_PRICE_ID",
    subscriber_secret: "STRIPE_DPIA_SUBSCRIBER_PRICE_ID",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const tool_slug = url.searchParams.get("tool_slug") || "";
    const tool = TOOLS[tool_slug];

    if (!tool) {
      return new Response(JSON.stringify({ error: "Unknown tool_slug" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine subscriber status (best-effort — anonymous = standalone).
    let isSubscriber = false;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const admin = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
          );
          const { data: profile } = await admin
            .from("profiles")
            .select("is_premium")
            .eq("id", user.id)
            .single();
          isSubscriber = !!profile?.is_premium;
        }
      } catch (_) {
        // fall through as non-subscriber
      }
    }

    const tier = isSubscriber ? "subscriber" : "standalone";
    const amount_cents = isSubscriber ? tool.subscriber_cents : tool.standalone_cents;
    const secretName = isSubscriber ? tool.subscriber_secret : tool.standalone_secret;
    const stripe_price_id = Deno.env.get(secretName) || null;

    return new Response(
      JSON.stringify({
        tool_slug,
        tool_name: tool.name,
        tier,
        amount_cents,
        stripe_price_id,
        stripe_configured: !!stripe_price_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-tool-price error:", err);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
