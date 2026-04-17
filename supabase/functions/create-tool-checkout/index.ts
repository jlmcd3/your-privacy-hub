import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// New tiered pricing — every user pays per use. Subscribers get a discounted rate.
// Stripe price IDs are read from env at request time so the function can be deployed
// before Stripe is configured. When secrets are missing, returns 503 so UI can show
// a friendly "payments coming soon" message.
const TOOLS: Record<
  string,
  {
    name: string;
    description: string;
    standalone_cents: number;
    subscriber_cents: number;
    standalone_secret: string;
    subscriber_secret: string;
    table: string;
  }
> = {
  li_assessment: {
    name: "Legitimate Interest Analyzer",
    description: "Single Legitimate Interest Analyzer report — compliance framework tool, not legal advice.",
    standalone_cents: 3900,
    subscriber_cents: 1900,
    standalone_secret: "STRIPE_LI_STANDALONE_PRICE_ID",
    subscriber_secret: "STRIPE_LI_SUBSCRIBER_PRICE_ID",
    table: "li_assessments",
  },
  governance_assessment: {
    name: "Data Privacy Healthcheck",
    description: "Single Data Privacy Healthcheck report — compliance framework tool, not legal advice.",
    standalone_cents: 2900,
    subscriber_cents: 1500,
    standalone_secret: "STRIPE_HC_STANDALONE_PRICE_ID",
    subscriber_secret: "STRIPE_HC_SUBSCRIBER_PRICE_ID",
    table: "governance_assessments",
  },
  dpia_framework: {
    name: "DPIA Builder",
    description: "Single DPIA Builder document — compliance framework tool, not legal advice.",
    standalone_cents: 6900,
    subscriber_cents: 3900,
    standalone_secret: "STRIPE_DPIA_STANDALONE_PRICE_ID",
    subscriber_secret: "STRIPE_DPIA_SUBSCRIBER_PRICE_ID",
    table: "dpia_frameworks",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool_type, user_id, intake_data, return_url } = await req.json();

    const tool = TOOLS[tool_type];
    if (!tool) {
      return new Response(JSON.stringify({ error: "Invalid tool type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Determine subscriber tier
    let isSubscriber = false;
    if (user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user_id)
        .single();
      isSubscriber = !!profile?.is_premium;
    }

    const amount_cents = isSubscriber ? tool.subscriber_cents : tool.standalone_cents;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) {
      return new Response(
        JSON.stringify({
          error: "stripe_not_configured",
          message: "Payments are not yet configured. Please check back soon.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Insert pending assessment record
    let assessmentData: Record<string, unknown> = {};
    if (tool_type === "li_assessment") {
      assessmentData = {
        user_id,
        status: "pending",
        processing_description: intake_data?.processing_description || "",
        purchased_as_standalone: !isSubscriber,
        purchase_price_cents: amount_cents,
        ...(intake_data || {}),
      };
    } else {
      assessmentData = {
        user_id,
        status: "pending",
        intake_data: intake_data || {},
        purchased_as_standalone: !isSubscriber,
        purchase_price_cents: amount_cents,
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

    const origin = return_url || Deno.env.get("SITE_URL") || "";

    // Prefer pre-configured Stripe price ID; fall back to ad-hoc price_data
    const priceIdSecret = isSubscriber ? tool.subscriber_secret : tool.standalone_secret;
    const stripePriceId = Deno.env.get(priceIdSecret);

    const lineItem = stripePriceId
      ? { price: stripePriceId, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product_data: { name: tool.name, description: tool.description },
            unit_amount: amount_cents,
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
    return new Response(JSON.stringify({ error: "Failed to create checkout session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
