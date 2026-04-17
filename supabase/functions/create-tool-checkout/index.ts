import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TOOL_PRICES: Record<string, { amount: number; name: string; description: string }> = {
  li_assessment: {
    amount: 19900,
    name: "Legitimate Interest Assessment",
    description: "Single Legitimate Interest Assessment report — compliance framework tool, not legal advice.",
  },
  governance_assessment: {
    amount: 14900,
    name: "Governance Readiness Assessment",
    description: "Single Data Governance Readiness Assessment report — compliance framework tool, not legal advice.",
  },
  dpia_framework: {
    amount: 24900,
    name: "DPIA Framework",
    description: "Single DPIA Framework document — compliance framework tool, not legal advice.",
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool_type, user_id, intake_data, return_url } = await req.json();

    const priceConfig = TOOL_PRICES[tool_type];
    if (!priceConfig) {
      return new Response(JSON.stringify({ error: "Invalid tool type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let tableName: string;
    let assessmentData: Record<string, unknown> = {};

    if (tool_type === "li_assessment") {
      tableName = "li_assessments";
      assessmentData = {
        user_id,
        status: "pending",
        processing_description: intake_data?.processing_description || "",
        purchased_as_standalone: true,
        purchase_price_cents: priceConfig.amount,
        ...(intake_data || {}),
      };
    } else if (tool_type === "governance_assessment") {
      tableName = "governance_assessments";
      assessmentData = {
        user_id,
        status: "pending",
        intake_data: intake_data || {},
        purchased_as_standalone: true,
        purchase_price_cents: priceConfig.amount,
      };
    } else {
      tableName = "dpia_frameworks";
      assessmentData = {
        user_id,
        status: "pending",
        intake_data: intake_data || {},
        purchased_as_standalone: true,
        purchase_price_cents: priceConfig.amount,
      };
    }

    const { data: record, error } = await supabase.from(tableName).insert(assessmentData).select().single();
    if (error || !record) {
      console.error("Insert error:", error);
      throw new Error("Failed to create assessment record");
    }

    const origin = return_url || Deno.env.get("SITE_URL") || "";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: { name: priceConfig.name, description: priceConfig.description },
          unit_amount: priceConfig.amount,
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/${tool_type.replace(/_/g, "-")}/result/${record.id}?purchased=true`,
      cancel_url: `${origin}/${tool_type.replace(/_/g, "-")}`,
      metadata: { tool_type, assessment_id: record.id, user_id: user_id || "" },
    });

    return new Response(JSON.stringify({ url: session.url, assessment_id: record.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("create-tool-checkout error:", e);
    return new Response(JSON.stringify({ error: "Failed to create checkout session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
