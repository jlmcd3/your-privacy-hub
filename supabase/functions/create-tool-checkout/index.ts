import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool catalog. Lookup keys map to prices created in the payment system
// (see payments--batch_create_product results). Subscriber tier optional —
// if not set, falls back to the standalone price.
const TOOLS: Record<
  string,
  {
    name: string;
    standalone_lookup: string;
    subscriber_lookup: string | null;
    table: string;
    fallback_standalone_cents: number;
    fallback_subscriber_cents: number;
  }
> = {
  li_assessment: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    table: "li_assessments",
    fallback_standalone_cents: 7900,
    fallback_subscriber_cents: 3500,
  },
  governance_assessment: {
    name: "Privacy Program Assessment Tool",
    standalone_lookup: "hc_standalone_v2",
    subscriber_lookup: "hc_subscriber_v2",
    table: "governance_assessments",
    fallback_standalone_cents: 4900,
    fallback_subscriber_cents: 2500,
  },
  dpia_framework: {
    name: "Impact Assessment Builder",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    table: "dpia_frameworks",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 4900,
  },
  dpa_generator: {
    name: "Your Custom DPA",
    standalone_lookup: "dpa_standalone_v2",
    subscriber_lookup: "dpa_subscriber_v2",
    table: "dpa_documents",
    fallback_standalone_cents: 9900,
    fallback_subscriber_cents: 4900,
  },
  ir_playbook: {
    name: "Your Breach Response Playbook",
    standalone_lookup: "ir_standalone_v2",
    subscriber_lookup: null,
    table: "ir_playbooks",
    fallback_standalone_cents: 5900,
    fallback_subscriber_cents: 0,
  },
  biometric_checker: {
    name: "Biometric Privacy Compliance Checker",
    standalone_lookup: "biometric_standalone_v2",
    subscriber_lookup: null,
    table: "biometric_assessments",
    fallback_standalone_cents: 4900,
    fallback_subscriber_cents: 0,
  },
};

// Derive sandbox vs live from which gateway key is configured. Sandbox is
// always configured first; live appears after the user claims the account.
function detectEnv(): StripeEnv {
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool_type, user_id, intake_data, return_url } = await req.json();
    const tool = TOOLS[tool_type];
    if (!tool) {
      return new Response(JSON.stringify({ error: "Invalid tool type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let isSubscriber = false;
    if (user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user_id)
        .single();
      isSubscriber = !!profile?.is_premium;
    }

    const lookupKey =
      isSubscriber && tool.subscriber_lookup ? tool.subscriber_lookup : tool.standalone_lookup;
    const fallbackCents =
      isSubscriber && tool.subscriber_lookup
        ? tool.fallback_subscriber_cents
        : tool.fallback_standalone_cents;

    const env = detectEnv();
    const stripe = createStripeClient(env);

    // Resolve the human-readable price ID to Stripe's internal price ID.
    const stripePrice = await resolvePriceId(stripe, lookupKey);
    const amountCents = stripePrice?.unit_amount ?? fallbackCents;

    // Insert pending assessment record (price stored for accounting).
    let assessmentData: Record<string, unknown> = {};
    if (tool_type === "li_assessment") {
      assessmentData = {
        user_id,
        status: "pending",
        processing_description: intake_data?.processing_description || "",
        purchased_as_standalone: !isSubscriber,
        purchase_price_cents: amountCents,
        ...(intake_data || {}),
      };
    } else {
      assessmentData = {
        user_id,
        status: "pending",
        intake_data: intake_data || {},
        purchased_as_standalone: !isSubscriber,
        purchase_price_cents: amountCents,
      };
    }

    const { data: record, error } = await supabase
      .from(tool.table)
      .insert(assessmentData)
      .select()
      .single();
    if (error || !record) {
      console.error("Insert error:", error);
      throw new Error("Failed to create assessment record");
    }

    const origin = return_url || req.headers.get("origin") || Deno.env.get("SITE_URL") || "";

    const lineItem = stripePrice
      ? { price: stripePrice.id, quantity: 1 }
      : {
          // Fallback inline price if lookup_key not yet provisioned
          price_data: {
            currency: "usd",
            product_data: { name: tool.name },
            unit_amount: amountCents,
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [lineItem as any],
      mode: "payment",
      success_url: `${origin}/${tool_type.replace(/_/g, "-")}/result/${record.id}?purchased=true`,
      cancel_url: `${origin}/${tool_type.replace(/_/g, "-")}`,
      metadata: {
        tool_type,
        assessment_id: record.id,
        user_id: user_id || "",
        tier: isSubscriber ? "subscriber" : "standalone",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, assessment_id: record.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-tool-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Failed to create checkout session" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
