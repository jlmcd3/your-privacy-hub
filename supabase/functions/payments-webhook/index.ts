// Unified payments webhook for gateway-registered Stripe events.
// Both sandbox (?env=sandbox) and live (?env=live) point here.
// Handles: tool one-time purchases, premium subscription, report-credit bundles.
//
// ENT-1: Entitlement writes are environment-scoped.
//   - Writes to public.user_entitlements keyed on (user_id, environment).
//   - Live events ALSO dual-write the existing profiles row (server-side
//     consumers keep working unchanged).
//   - Sandbox events NEVER touch profiles — this closes the preview-URL
//     contamination hole where a test-card checkout could grant real
//     production entitlement.

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

// Lazy so importing this module in tests (which do not set SUPABASE_URL)
// does not crash at load time.
let _supabase: SupabaseClient | null = null;
function supabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}
// Backwards-compat alias for the inline call sites below.
const supabase = new Proxy({} as SupabaseClient, {
  get(_t, prop) {
    const c = supabaseClient() as any;
    const v = c[prop];
    return typeof v === "function" ? v.bind(c) : v;
  },
});

/**
 * Upsert the env-scoped entitlement row. `patch` carries only the fields
 * the caller wants to change. Existing values for unspecified fields are
 * preserved via an explicit merge (Postgres upsert would otherwise reset
 * DEFAULTed columns).
 */
export async function upsertEntitlement(
  sb: SupabaseClient,
  userId: string,
  env: StripeEnv,
  patch: Record<string, unknown>,
) {
  const { data: existing } = await sb
    .from("user_entitlements")
    .select("*")
    .eq("user_id", userId)
    .eq("environment", env)
    .maybeSingle();

  const merged = {
    user_id: userId,
    environment: env,
    is_premium: false,
    is_pro: false,
    payment_failed: false,
    cancel_at_period_end: false,
    ...(existing ?? {}),
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { error } = await sb
    .from("user_entitlements")
    .upsert(merged, { onConflict: "user_id,environment" });
  if (error) console.error("user_entitlements upsert failed:", error.message);
}

/**
 * Look up the profile id for a given stripe_customer_id. Only used on the
 * live path where dual-writing to profiles is required.
 */
export async function profileIdForCustomer(
  sb: SupabaseClient,
  customerId: string,
): Promise<string | null> {
  const { data } = await sb
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Testable subscription upsert handler. Exported so ENT-1 tests can
 * exercise the env-gating rules without going through verifyWebhook.
 */
export async function handleSubscriptionEvent(
  sb: SupabaseClient,
  sub: any,
  env: StripeEnv,
) {
  const item = sub.items?.data?.[0];
  const periodStart =
    item?.current_period_start ?? sub.current_period_start ?? null;
  const periodEnd =
    item?.current_period_end ?? sub.current_period_end ?? null;
  const isActive = ["active", "trialing", "past_due"].includes(sub.status);

  const lookupKey: string | null =
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    null;

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

  const userId = await profileIdForCustomer(sb, sub.customer);

  const entPatch: Record<string, unknown> = {
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
  };

  if (userId) {
    await upsertEntitlement(sb, userId, env, entPatch);
  }

  // Dual-write to profiles ONLY on live. Sandbox never touches profiles.
  if (env === "live") {
    await sb
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
      .eq("stripe_customer_id", sub.customer);
  }

  // Layer 3 — annual Smart Tool credits. Env-scoped.
  if (isActive && isAnnualTier && userId && periodStart) {
    const cycleStart = new Date(periodStart * 1000)
      .toISOString()
      .split("T")[0];
    const creditsToGrant = subscriptionType === "pro_annual" ? 3 : 1;
    const rows = Array.from({ length: creditsToGrant }, (_, i) => ({
      user_id: userId,
      client_id: null,
      cycle_start: cycleStart,
      credit_index: i + 1,
      environment: env,
    }));
    const { error: creditErr } = await sb
      .from("annual_tool_credits")
      .insert(rows);
    if (creditErr && (creditErr as any).code !== "23505") {
      console.error("annual_tool_credits insert failed:", creditErr.message);
    }
  }
}

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
        await handleSubscriptionEvent(supabase, event.data.object, env);
        break;
      }
      case "customer.subscription.deleted":
      case "subscription.canceled": {
        const sub = event.data.object;
        const userId = await profileIdForCustomer(supabase, sub.customer);
        if (userId) {
          await upsertEntitlement(supabase, userId, env, {
            is_premium: false,
            cancel_at_period_end: false,
            stripe_trial_end: null,
          });
        }
        if (env === "live") {
          await supabase
            .from("profiles")
            .update({
              is_premium: false,
              cancel_at_period_end: false,
              stripe_trial_end: null,
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_customer_id", sub.customer);
        }
        break;
      }
      case "invoice.payment_failed":
      case "transaction.payment_failed": {
        const inv = event.data.object;
        const userId = await profileIdForCustomer(supabase, inv.customer);
        if (userId) {
          await upsertEntitlement(supabase, userId, env, { payment_failed: true });
        }
        if (env === "live") {
          await supabase
            .from("profiles")
            .update({ payment_failed: true, updated_at: new Date().toISOString() })
            .eq("stripe_customer_id", inv.customer);
        }
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
    return new Response(JSON.stringify({ received: true, warning: (err as Error).message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const userId = session.metadata?.user_id || session.metadata?.userId;

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
      environment: env,
    });
    return;
  }

  if (session.metadata?.topup === "true") {
    const { tool_type, assessment_id } = session.metadata;
    const { data: m } = await supabase
      .from("tool_run_meter")
      .select("id, runs_allowed, extension_count")
      .eq("tool_type", tool_type)
      .eq("assessment_id", assessment_id)
      .maybeSingle();
    if (m) {
      await supabase.from("tool_run_meter").update({
        runs_allowed: (m.runs_allowed as number) + 4,
        extension_count: (m.extension_count as number) + 1,
        updated_at: new Date().toISOString(),
      }).eq("id", m.id as string);
    }
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
      environment: env,
    });

    const tableMap: Record<string, string> = {
      li_assessment: "li_assessments",
      governance_assessment: "governance_assessments",
      dpia_framework: "dpia_frameworks",
      dpa_generator: "dpa_documents",
      ir_playbook: "ir_playbooks",
      biometric_checker: "biometric_assessments",
      cppa_admt: "cppa_assessments",
      cppa_risk_assessment: "cppa_assessments",
      cppa_cybersecurity: "cppa_assessments",
      cppa_suite: "cppa_assessments",
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
        cppa_admt: "run-admt-checker",
        cppa_risk_assessment: "run-cppa-risk-assessment",
        cppa_cybersecurity: "run-cppa-cybersecurity",
        cppa_suite: "run-cppa-risk-assessment",
      };
      const fn = fnMap[tool_type];
      if (fn) {
        const bodyKey = tool_type === "dpia_framework" ? "dpia_id" : "assessment_id";
        EdgeRuntime.waitUntil(
          supabase.functions.invoke(fn, { body: { [bodyKey]: assessment_id } })
        );

        if (tool_type === "cppa_suite" && session.metadata?.suite_cyber_id) {
          const suiteCyberId = session.metadata.suite_cyber_id as string;
          await supabase
            .from("cppa_assessments")
            .update({
              stripe_payment_intent_id: (session.payment_intent as string) || session.id,
            })
            .eq("id", suiteCyberId);
          EdgeRuntime.waitUntil(
            supabase.functions.invoke("run-cppa-cybersecurity", {
              body: { assessment_id: suiteCyberId },
            })
          );
        }
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

    await supabase.from("registration_audit_log").insert({
      action: "order_paid",
      order_id: orderId,
      user_id: userId || null,
      metadata: { env, embedded, tier, amount_cents: session.amount_total || 0, stripe_session_id: session.id },
    });
    return;
  }

  if (!userId) return;

  // Premium subscription (checkout.session.completed side)
  // Env-scoped entitlement write; dual-write profiles only on live.
  await upsertEntitlement(supabase, userId, env, {
    is_premium: true,
    payment_failed: false,
  });
  if (env === "live") {
    await supabase
      .from("profiles")
      .update({
        is_premium: true,
        stripe_customer_id: session.customer,
        payment_failed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  } else {
    // Sandbox: we still need to know which stripe customer maps to which
    // user for follow-up subscription.* events, but that mapping lives on
    // the profile row and must not encode entitlement. Only set the
    // customer id if it isn't already present, and never touch entitlement
    // fields here.
    const { data: prof } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (!prof?.stripe_customer_id && session.customer) {
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: session.customer })
        .eq("id", userId);
    }
  }
}

async function handleCheckoutFailed(session: any, eventType: string, env: StripeEnv) {
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
