// Retrieve a checkout session by id (sandbox). One-shot verification.
import { createStripeClient } from "../_shared/stripe.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const sid = url.searchParams.get("session_id");
    if (!sid) return new Response(JSON.stringify({ error: "session_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    const stripe = createStripeClient("sandbox");
    const s: any = await stripe.checkout.sessions.retrieve(sid);
    return new Response(JSON.stringify({
      id: s.id,
      customer: s.customer,
      customer_email: s.customer_email,
      mode: s.mode,
      amount_total: s.amount_total,
      currency: s.currency,
      payment_status: s.payment_status,
      status: s.status,
      metadata: s.metadata,
      url: s.url,
    }, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
