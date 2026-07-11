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
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";

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
 * WEBHOOK-3: guard that decides whether an incoming subscription event
 * should be allowed to overwrite the current entitlement row. Prevents
 * a late-arriving event from an OLDER, now-canceled subscription from
 * clobbering the row for a NEWER active subscription that already won
 * the seat. Rules, in order:
 *   1. If existing row's stripe_subscription_id matches → always accept.
 *   2. If existing row has no subscription attached → accept.
 *   3. If incoming is inactive (canceled / incomplete_expired / unpaid)
 *      AND existing row has a different sub AND that different sub is
 *      still marked premium/non-canceled → skip. Active always beats
 *      inactive from a stranger subscription.
 *   4. Tiebreaker (both look active-ish, different subs): compare
 *      Stripe `created` timestamps — newer wins. Skip if incoming is
 *      older.
 * Skip decisions are logged with scope="webhook3_skip" for observability.
 */
export function decideSubscriptionWrite(
  existing: {
    stripe_subscription_id: string | null;
    stripe_subscription_created_at: string | null;
    is_premium: boolean | null;
    cancel_at_period_end: boolean | null;
  } | null,
  incoming: { id: string; status: string; created: number | null },
): { accept: boolean; reason: string } {
  if (!existing || !existing.stripe_subscription_id) {
    return { accept: true, reason: "no_existing_sub" };
  }
  if (existing.stripe_subscription_id === incoming.id) {
    return { accept: true, reason: "same_sub" };
  }
  const incomingActive = ["active", "trialing", "past_due"].includes(incoming.status);
  const existingLive =
    existing.is_premium === true && existing.cancel_at_period_end !== true;
  if (!incomingActive && existingLive) {
    return { accept: false, reason: "incoming_inactive_existing_live" };
  }
  // Tiebreaker: newer created wins.
  if (existing.stripe_subscription_created_at && incoming.created != null) {
    const existingCreatedMs = Date.parse(existing.stripe_subscription_created_at);
    const incomingCreatedMs = incoming.created * 1000;
    if (Number.isFinite(existingCreatedMs) && incomingCreatedMs < existingCreatedMs) {
      return { accept: false, reason: "incoming_older_than_existing" };
    }
  }
  return { accept: true, reason: "accept_default" };
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

  const userId =
    (sub.metadata?.user_id as string | undefined) ??
    (sub.metadata?.userId as string | undefined) ??
    (await profileIdForCustomer(sb, sub.customer));

  // WEBHOOK-3 guard — read the existing entitlement row and decide
  // whether to accept this event, before we compute the patch.
  if (userId) {
    const { data: existingRow } = await sb
      .from("user_entitlements")
      .select(
        "stripe_subscription_id, stripe_subscription_created_at, is_premium, cancel_at_period_end",
      )
      .eq("user_id", userId)
      .eq("environment", env)
      .maybeSingle();
    const decision = decideSubscriptionWrite(existingRow as any, {
      id: sub.id,
      status: sub.status,
      created: typeof sub.created === "number" ? sub.created : null,
    });
    if (!decision.accept) {
      console.log(
        JSON.stringify({
          scope: "webhook3_skip",
          env,
          user_id: userId,
          incoming_sub: sub.id,
          incoming_status: sub.status,
          incoming_created: sub.created,
          existing_sub: (existingRow as any)?.stripe_subscription_id ?? null,
          existing_created_at:
            (existingRow as any)?.stripe_subscription_created_at ?? null,
          reason: decision.reason,
        }),
      );
      return;
    }
  }

  const entPatch: Record<string, unknown> = {
    stripe_subscription_id: sub.id,
    stripe_subscription_created_at: typeof sub.created === "number"
      ? new Date(sub.created * 1000).toISOString()
      : null,
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

/**
 * REVOKE-1: on customer.subscription.deleted, immediately revoke
 * entitlement regardless of subscription_end_date. Stripe fires the
 * delete only when the subscription is genuinely over — either a
 * period-end cancel completing (revoke correct) or an immediate
 * cancel for refund/chargeback/fraud/support (continued access wrong).
 * The graceful cancel-at-period-end path is handled by
 * handleSubscriptionEvent while the sub is still active.
 */
export async function handleSubscriptionDeleted(
  sb: SupabaseClient,
  sub: any,
  env: StripeEnv,
) {
  const userId =
    (sub.metadata?.user_id as string | undefined) ??
    (sub.metadata?.userId as string | undefined) ??
    (await profileIdForCustomer(sb, sub.customer));
  if (userId) {
    await upsertEntitlement(sb, userId, env, {
      is_premium: false,
      is_pro: false,
      cancel_at_period_end: false,
      stripe_trial_end: null,
      subscription_end_date: null,
      subscription_type: null,
    });
    console.log(
      JSON.stringify({
        scope: "revoke1_immediate",
        env,
        user_id: userId,
        stripe_subscription_id: sub.id,
        stripe_customer_id: sub.customer,
      }),
    );
  }
  if (env === "live") {
    await sb
      .from("profiles")
      .update({
        is_premium: false,
        is_pro: false,
        cancel_at_period_end: false,
        stripe_trial_end: null,
        subscription_end_date: null,
        subscription_type: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", sub.customer);
  }
}

/**
 * WEBHOOK-1: checkout.session.completed handler dispatches through this
 * helper so the race-heal path is testable without a real Stripe client.
 * The caller supplies `retrieveSubscription`, which the tests stub.
 */
export async function dispatchCheckoutSubscription(
  sb: SupabaseClient,
  session: any,
  env: StripeEnv,
  retrieveSubscription: (id: string) => Promise<any>,
) {
  if (!session?.subscription) return;
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
  const fullSub = await retrieveSubscription(subId);
  await handleSubscriptionEvent(sb, fullSub, env);
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
        await handleSubscriptionDeleted(supabase, event.data.object, env);
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
      // Align with the sessionTable branch above (line 472): checkout emits
      // tier ∈ {"professional","intelligence","standalone"} — never "subscriber".
      // Subscriber pricing is applied whenever tier !== "standalone".
      subscriber_at_time: session.metadata?.tier !== "standalone",
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
      await lifecycleUpdate(supabase, table, assessment_id, {
        stripe_payment_intent_id: (session.payment_intent as string) || session.id,
        purchase_price_cents: session.amount_total || 0,
      }, { fn: "payments-webhook", phase: "payment_evidence" });


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
          await lifecycleUpdate(supabase, "cppa_assessments", suiteCyberId, {
            stripe_payment_intent_id: (session.payment_intent as string) || session.id,
          }, { fn: "payments-webhook", phase: "payment_evidence" });
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

    const orderWrite = await lifecycleUpdate(supabase, "registration_orders", orderId, {
      payment_status: "paid",
      fulfillment_status: "documents_pending",
      stripe_payment_intent_id: (session.payment_intent as string) || session.id,
      stripe_session_id: session.id,
      updated_at: new Date().toISOString(),
    }, { fn: "payments-webhook", phase: "payment_evidence" });

    if (!orderWrite.ok) {
      console.error(
        JSON.stringify({
          scope: "registration_checkout",
          event: "order_update_failed",
          order_id: orderId,
          error: orderWrite.message,
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
  // WEBHOOK-1: write the customer mapping FIRST so a subsequent
  // profileIdForCustomer lookup succeeds, then — if this session created a
  // subscription — retrieve it and run through the SAME full-fidelity
  // handleSubscriptionEvent path. This heals the ordering race for any
  // in-flight or legacy session regardless of subscription metadata,
  // populating subscription_type / trial_end / period_end / subscription_id
  // instead of leaving a partial row.
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
    // Sandbox: never touch entitlement fields on profiles; only backfill
    // stripe_customer_id when missing so follow-up subscription.* events
    // can resolve the user via profileIdForCustomer.
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

  if (session.subscription) {
    try {
      const stripe = createStripeClient(env);
      await dispatchCheckoutSubscription(
        supabase,
        session,
        env,
        (subId) =>
          stripe.subscriptions.retrieve(subId, {
            expand: ["items.data.price"],
          }) as unknown as Promise<any>,
      );
    } catch (e) {
      console.error(
        "checkout.session.completed subscription retrieve/dispatch failed:",
        (e as Error).message,
      );
      // Fall back to the bare entitlement write so we don't regress.
      await upsertEntitlement(supabase, userId, env, {
        is_premium: true,
        payment_failed: false,
      });
    }
  } else {
    // Non-subscription completions (should be rare on this branch — most
    // one-time paths return earlier) still get the minimal entitlement.
    await upsertEntitlement(supabase, userId, env, {
      is_premium: true,
      payment_failed: false,
    });
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
