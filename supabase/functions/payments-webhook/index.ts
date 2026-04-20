// Unified payments webhook for gateway-registered Stripe events.
// Both sandbox (?env=sandbox) and live (?env=live) point here.
// Handles: tool one-time purchases, premium subscription, report-credit bundles.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const url = new URL(req.url);
  const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;

  let event: { type: string; data: { object: any } };
  try {
    event = await verifyWebhook(req, env);
  } catch (e) {
    console.error("Webhook verify failed:", (e as Error).message);
    return new Response("Webhook verify failed", { status: 400 });
  }

  console.log("payments-webhook event:", event.type, "env:", env);

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "transaction.completed": {
        await handleCheckoutCompleted(event.data.object);
        break;
      }
      case "customer.subscription.deleted":
      case "subscription.canceled": {
        const sub = event.data.object;
        await supabase
          .from("profiles")
          .update({ is_premium: false, updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", sub.customer);
        break;
      }
      case "invoice.payment_failed":
      case "transaction.payment_failed": {
        const inv = event.data.object;
        await supabase
          .from("profiles")
          .update({ payment_failed: true, updated_at: new Date().toISOString() })
          .eq("stripe_customer_id", inv.customer);
        break;
      }
      default:
        console.log("Unhandled event:", event.type);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("payments-webhook handler error:", err);
    // Return 200 anyway to avoid retries on logic errors. Stripe will retry on 5xx.
    return new Response(JSON.stringify({ received: true, warning: (err as Error).message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function handleCheckoutCompleted(session: any) {
  const userId = session.metadata?.user_id || session.metadata?.userId;

  // Tool purchase
  if (session.metadata?.tool_type && session.metadata?.assessment_id) {
    const { tool_type, assessment_id } = session.metadata;

    await supabase.from("assessment_purchases").insert({
      user_id: userId || null,
      tool_type,
      assessment_id,
      amount_cents: session.amount_total || 0,
      stripe_payment_intent_id: (session.payment_intent as string) || session.id,
      status: "paid",
      subscriber_at_time: session.metadata?.tier === "subscriber",
    });

    const tableMap: Record<string, string> = {
      li_assessment: "li_assessments",
      governance_assessment: "governance_assessments",
      dpia_framework: "dpia_frameworks",
      dpa_generator: "dpa_documents",
      ir_playbook: "ir_playbooks",
      biometric_checker: "biometric_assessments",
    };
    const table = tableMap[tool_type];
    if (table) {
      await supabase
        .from(table)
        .update({
          stripe_payment_intent_id: (session.payment_intent as string) || session.id,
          purchase_price_cents: session.amount_total || 0,
        })
        .eq("id", assessment_id);

      const fnMap: Record<string, string> = {
        li_assessment: "run-li-assessment",
        governance_assessment: "run-governance-assessment",
        dpia_framework: "run-dpia-framework",
        dpa_generator: "generate-dpa",
        ir_playbook: "generate-ir-playbook",
        biometric_checker: "check-biometric-compliance",
      };
      const fn = fnMap[tool_type];
      if (fn) {
        const bodyKey = tool_type === "dpia_framework" ? "dpia_id" : "assessment_id";
        await supabase.functions.invoke(fn, { body: { [bodyKey]: assessment_id } });
      }
    }
    return;
  }

  // Registration Manager order
  if (session.metadata?.type === "registration_order" && session.metadata?.order_id) {
    const orderId = session.metadata.order_id;
    const tier = session.metadata.tier;

    // Mark order as paid. Note: we never submit filings on the user's behalf, so
    // the fulfillment status only ever moves through document generation states.
    await supabase
      .from("registration_orders")
      .update({
        payment_status: "paid",
        fulfillment_status: "documents_pending",
        stripe_payment_intent_id: (session.payment_intent as string) || session.id,
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    // Trigger document generation immediately for all paid one-time tiers
    if (tier === "diy" || tier === "counsel_review" || tier === "done_for_you") {
      await supabase.functions.invoke("generate-registration-docs", {
        body: { order_id: orderId },
      });
    }

    // Audit log
    await supabase.from("registration_audit_log").insert({
      action: "order_paid",
      order_id: orderId,
      user_id: userId || null,
      metadata: { tier, amount_cents: session.amount_total || 0 },
    });
    return;
  }

  if (!userId) return;

  // Premium subscription
  await supabase
    .from("profiles")
    .update({
      is_premium: true,
      stripe_customer_id: session.customer,
      payment_failed: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
}
