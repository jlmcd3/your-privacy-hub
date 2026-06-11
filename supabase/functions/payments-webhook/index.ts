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
        await handleCheckoutCompleted(event.data.object, env);
        break;
      }
      case "checkout.session.expired":
      case "checkout.session.async_payment_failed": {
        await handleCheckoutFailed(event.data.object, event.type, env);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const item = sub.items?.data?.[0];
        const periodStart =
          item?.current_period_start ?? sub.current_period_start ?? null;
        const periodEnd =
          item?.current_period_end ?? sub.current_period_end ?? null;
        const isActive = ["active", "trialing", "past_due"].includes(sub.status);

        // Resolve the lookup key so we can derive subscription_type.
        // Prefer Stripe's native lookup_key on the Price; fall back to the
        // lovable_external_id metadata we stamp via sync-pricing.
        const lookupKey: string | null =
          item?.price?.lookup_key ||
          item?.price?.metadata?.lovable_external_id ||
          null;

        // v9: 4 subscription_type values — intelligence (monthly|annual) +
        // professional (pro_monthly|pro_annual). Annual variants make the
        // user eligible for the Layer-3 Smart Tool credit.
        let subscriptionType:
          | "monthly"
          | "annual"
          | "pro_monthly"
          | "pro_annual"
          | null = null;
        if (lookupKey === "intelligence_yearly" || lookupKey === "intelligence_annual") {
          subscriptionType = "annual";
        } else if (lookupKey === "intelligence_monthly") {
          subscriptionType = "monthly";
        } else if (lookupKey === "professional_annual" || lookupKey === "professional_yearly") {
          subscriptionType = "pro_annual";
        } else if (lookupKey === "professional_monthly") {
          subscriptionType = "pro_monthly";
        }

        const isProTier =
          subscriptionType === "pro_monthly" || subscriptionType === "pro_annual";
        const isAnnualTier =
          subscriptionType === "annual" || subscriptionType === "pro_annual";

        // Update the profile row (matched by stripe_customer_id).
        const { data: updatedProfile } = await supabase
          .from("profiles")
          .update({
            stripe_subscription_id: sub.id,
            cancel_at_period_end: !!sub.cancel_at_period_end,
            subscription_end_date: periodEnd
              ? new Date(periodEnd * 1000).toISOString()
              : null,
            stripe_trial_end: sub.trial_end
              ? new Date(sub.trial_end * 1000).toISOString()
              : null,
            ...(isActive
              ? {
                  is_premium: true,
                  payment_failed: false,
                  ...(isProTier ? { is_pro: true } : {}),
                }
              : {}),
            ...(subscriptionType ? { subscription_type: subscriptionType } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", sub.customer)
          .select("id")
          .maybeSingle();

        // v9 Layer 3 — Annual subscribers get 1 free Smart Tool run per
        // cycle. Idempotent: the (user_id, client_id, cycle_start) unique
        // index makes the insert a no-op when re-applied for the same cycle.
        if (isActive && isAnnualTier && updatedProfile?.id && periodStart) {
          const cycleStart = new Date(periodStart * 1000)
            .toISOString()
            .split("T")[0];
          const { error: creditErr } = await supabase
            .from("annual_tool_credits")
            .insert({
              user_id: updatedProfile.id,
              client_id: null,
              cycle_start: cycleStart,
            });
          // 23505 = unique_violation → expected on replay; everything else is real.
          if (creditErr && (creditErr as any).code !== "23505") {
            console.error("annual_tool_credits insert failed:", creditErr.message);
          }
        }
        break;
      }
      case "customer.subscription.deleted":
      case "subscription.canceled": {
        const sub = event.data.object;
        await supabase
          .from("profiles")
          .update({
            is_premium: false,
            cancel_at_period_end: false,
            // Clear stale trial timestamp so a re-subscribed user isn't
            // ghost-blocked by a future date left from a prior cycle.
            stripe_trial_end: null,
            updated_at: new Date().toISOString(),
          })
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

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const userId = session.metadata?.user_id || session.metadata?.userId;

  // Session-based tools (RoPA / US Notice / EU Notice) — mark the existing
  // session row as paid so the review page can advance to generation.
  const SESSION_TOOL_TABLES: Record<string, string> = {
    ropa_initial: "ropa_sessions",
    ropa_refresh: "ropa_sessions",
    us_notice_single: "us_notice_sessions",
    us_notice_all_states: "us_notice_sessions",
    eu_notice_single: "eu_notice_sessions",
    eu_notice_suite: "eu_notice_sessions",
    eu_notice_full_international: "eu_notice_sessions",
    eu_notice_refresh: "eu_notice_sessions",
  };
  const sessionToolType = session.metadata?.tool_type as string | undefined;
  const sessionTable = sessionToolType ? SESSION_TOOL_TABLES[sessionToolType] : undefined;
  if (sessionTable && session.metadata?.assessment_id) {
    const sessionRowId = session.metadata.assessment_id as string;
    const { error: payErr } = await supabase
      .from(sessionTable)
      .update({
        payment_confirmed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionRowId);
    if (payErr) {
      console.error(`Failed to mark ${sessionTable} paid:`, payErr.message);
    }
    await supabase.from("assessment_purchases").insert({
      user_id: userId || null,
      tool_type: sessionToolType,
      assessment_id: sessionRowId,
      amount_cents: session.amount_total || 0,
      stripe_payment_intent_id: (session.payment_intent as string) || session.id,
      status: "paid",
      subscriber_at_time: session.metadata?.tier !== "standalone",
    });
    return;
  }

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
        // Fire-and-forget: generators can run 2-3 minutes; awaiting them makes
        // Stripe time out this webhook delivery and retry it, risking duplicate
        // runs. waitUntil keeps the invoke alive after we respond to Stripe.
        EdgeRuntime.waitUntil(
          supabase.functions.invoke(fn, { body: { [bodyKey]: assessment_id } })
        );
      }
    }
    return;
  }


  // Registration Manager order
  if (session.metadata?.type === "registration_order" && session.metadata?.order_id) {
    const orderId = session.metadata.order_id;
    const tier = session.metadata.tier;
    const embedded = session.metadata.embedded === "true";

    console.log(
      JSON.stringify({
        scope: "registration_checkout",
        event: "payment_succeeded",
        env,
        embedded,
        order_id: orderId,
        user_id: userId || null,
        tier,
        amount_cents: session.amount_total || 0,
        stripe_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
      })
    );

    // Mark order as paid. Note: we never submit filings on the user's behalf, so
    // the fulfillment status only ever moves through document generation states.
    const { error: updateErr } = await supabase
      .from("registration_orders")
      .update({
        payment_status: "paid",
        fulfillment_status: "documents_pending",
        stripe_payment_intent_id: (session.payment_intent as string) || session.id,
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateErr) {
      console.error(
        JSON.stringify({
          scope: "registration_checkout",
          event: "order_update_failed",
          order_id: orderId,
          error: updateErr.message,
        })
      );
    }

    // Trigger document generation immediately for all paid one-time tiers
    if (tier === "diy" || tier === "counsel_review" || tier === "done_for_you") {
      const { error: invokeErr } = await supabase.functions.invoke("generate-registration-docs", {
        body: { order_id: orderId },
      });
      if (invokeErr) {
        console.error(
          JSON.stringify({
            scope: "registration_checkout",
            event: "docs_generation_invoke_failed",
            order_id: orderId,
            error: invokeErr.message,
          })
        );
      }
    }

    // Audit log
    await supabase.from("registration_audit_log").insert({
      action: "order_paid",
      order_id: orderId,
      user_id: userId || null,
      metadata: { env, embedded, tier, amount_cents: session.amount_total || 0, stripe_session_id: session.id },
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

async function handleCheckoutFailed(session: any, eventType: string, env: StripeEnv) {
  // Only act on registration orders here. Other flows can be added later.
  if (session.metadata?.type !== "registration_order" || !session.metadata?.order_id) {
    return;
  }
  const orderId = session.metadata.order_id;
  const userId = session.metadata.user_id || null;
  const tier = session.metadata.tier;
  const embedded = session.metadata.embedded === "true";

  console.log(
    JSON.stringify({
      scope: "registration_checkout",
      event: eventType === "checkout.session.expired" ? "session_expired" : "payment_failed",
      env,
      embedded,
      order_id: orderId,
      user_id: userId,
      tier,
      stripe_session_id: session.id,
    })
  );

  // Only mark canceled if still pending — never overwrite a paid order.
  await supabase
    .from("registration_orders")
    .update({ payment_status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("payment_status", "pending");

  await supabase.from("registration_audit_log").insert({
    action: eventType === "checkout.session.expired" ? "checkout_expired" : "checkout_payment_failed",
    order_id: orderId,
    user_id: userId,
    metadata: { env, embedded, tier, stripe_session_id: session.id, event_type: eventType },
  });
}
