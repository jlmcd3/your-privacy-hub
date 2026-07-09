// One-shot true-up for sub_1Tr75A. Sandbox only. Deleted after use.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient } from "../_shared/stripe.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

const USER_ID = "02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122";
const SUB_ID = "sub_1Tr75AGzUSp13bnTn1TSI9d8";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const stripe = createStripeClient("sandbox");
    const s: any = await stripe.subscriptions.retrieve(SUB_ID);
    const item = s.items?.data?.[0];
    const periodEnd = item?.current_period_end ?? s.current_period_end;
    const trialEnd = s.trial_end;
    const priceLookup = item?.price?.lookup_key;
    // REVOKE-1: canceled subscriptions never grant premium, even if
    // current_period_end is still in the future. Stripe fires the
    // canceled status only when the subscription is genuinely over
    // (period-end cancel completing OR immediate cancel for
    // refund/chargeback/fraud/support). Continued access on any of
    // those is wrong. cancel_at_period_end=true on a still-active
    // sub is handled elsewhere (subscription.updated path) and keeps
    // access until the delete event fires.
    const isPremium = ["active","trialing","past_due"].includes(s.status);

    const row = {
      user_id: USER_ID,
      environment: "sandbox",
      stripe_subscription_id: s.id,
      is_premium: !!isPremium,
      is_pro: false,
      subscription_type: priceLookup ?? null,
      subscription_end_date: periodEnd ? new Date(periodEnd*1000).toISOString() : null,
      stripe_trial_end: trialEnd ? new Date(trialEnd*1000).toISOString() : null,
      cancel_at_period_end: !!s.cancel_at_period_end,
      payment_failed: s.status === "past_due",
      stripe_subscription_created_at: s.created ? new Date(s.created*1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await sb.from("user_entitlements").upsert(row, { onConflict: "user_id,environment" });
    if (error) throw error;
    return new Response(JSON.stringify({
      ok: true,
      subscription: {
        id: s.id, status: s.status, customer: s.customer,
        created: s.created, current_period_end: periodEnd,
        cancel_at_period_end: s.cancel_at_period_end,
        price_lookup: priceLookup, metadata: s.metadata,
      },
      row,
    }, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), stack: (e as any)?.stack }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
