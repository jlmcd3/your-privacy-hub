// admin-refund-order — issue a Stripe refund against a paid order row.
//
// CRITICAL FIX vs. earlier drafts: environment is resolved from the ORDER ROW
// (registration_orders.stripe_env / cppa_assessments.stripe_env), not from
// runtime key-presence. Reading env from "which key is set" is wrong when both
// sandbox and live keys are configured (as in a launch-week environment): the
// refund would be issued against the wrong Stripe account.
//
// Fallback resolution when the row has no stripe_env: derive from the
// stripe_session_id prefix (cs_test_* = sandbox, cs_live_* = live). If neither
// signal is available we FAIL — we never guess.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { writeActionLog } from "../_shared/write-action-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type OrderTable = "registration_orders" | "cppa_assessments";

function envFromRow(row: {
  stripe_env?: string | null;
  stripe_session_id?: string | null;
}): StripeEnv | null {
  const explicit = row.stripe_env;
  if (explicit === "sandbox" || explicit === "live") return explicit;
  const sess = row.stripe_session_id ?? "";
  if (sess.startsWith("cs_test_")) return "sandbox";
  if (sess.startsWith("cs_live_")) return "live";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const auth = await verifyCaller(req, "admin");
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status ?? 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { table?: OrderTable; row_id?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { table, row_id, reason } = body ?? {};
  if (!row_id || (table !== "registration_orders" && table !== "cppa_assessments")) {
    return new Response(JSON.stringify({ error: "bad_request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: row, error: selErr } = await supabase
    .from(table)
    .select("id, stripe_env, stripe_session_id, stripe_payment_intent_id, status, payment_status, fulfillment_status")
    .eq("id", row_id)
    .maybeSingle();
  if (selErr || !row) {
    return new Response(JSON.stringify({ error: "row_not_found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!row.stripe_payment_intent_id) {
    return new Response(JSON.stringify({ error: "no_payment_intent" }), {
      status: 422,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // *** THE FIX ***
  const env = envFromRow(row);
  if (!env) {
    await writeActionLog(supabase, {
      actor_user_id: auth.userId!,
      action: "refund_order.env_unresolved",
      target_table: table,
      target_id: row_id,
      payload: { reason: reason ?? null },
      result: { error: "env_unresolved" },
      ok: false,
    });
    return new Response(
      JSON.stringify({ error: "env_unresolved", detail: "stripe_env missing on row and session id has no test/live prefix" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const stripe = createStripeClient(env);
    const refund = await stripe.refunds.create({
      payment_intent: row.stripe_payment_intent_id,
      reason: "requested_by_customer",
      metadata: { admin_actor: auth.userId ?? "", refund_reason: reason ?? "" },
    });

    // Status update — cppa_assessments uses `status`, registration_orders uses `payment_status`.
    const patch = table === "cppa_assessments"
      ? { status: "refunded" }
      : { payment_status: "refunded", fulfillment_status: "refunded" };
    const { error: updErr } = await supabase.from(table).update(patch).eq("id", row_id);
    if (updErr) {
      console.error(JSON.stringify({ evt: "refund_row_update_failed", table, row_id, message: updErr.message }));
    }

    await writeActionLog(supabase, {
      actor_user_id: auth.userId!,
      action: "refund_order",
      target_table: table,
      target_id: row_id,
      payload: { reason: reason ?? null, env },
      result: { refund_id: refund.id, amount: refund.amount, status: refund.status },
      ok: true,
    });

    return new Response(JSON.stringify({
      ok: true,
      env,
      refund: { id: refund.id, status: refund.status, amount: refund.amount },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await writeActionLog(supabase, {
      actor_user_id: auth.userId!,
      action: "refund_order",
      target_table: table,
      target_id: row_id,
      payload: { reason: reason ?? null, env },
      result: { error: message },
      ok: false,
    });
    return new Response(JSON.stringify({ error: "refund_failed", message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
