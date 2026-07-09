// One-off diagnostic for WEBHOOK-3 / CUSTOMER-1.
// Gated to a single known admin user id.
import { createClient } from "npm:@supabase/supabase-js@2";
import { createStripeClient } from "../_shared/stripe.ts";

const ADMIN_UID = "02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authHeader = req.headers.get("Authorization")?.replace("Bearer ", "") ?? "";
    const { data: { user } } = await sb.auth.getUser(authHeader);
    if (!user || user.id !== ADMIN_UID) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const stripe = createStripeClient("sandbox");
    const out: any = {};

    // 1) Retrieve sub_1Tr75A
    try {
      const s = await stripe.subscriptions.retrieve("sub_1Tr75AGzUSp13bnTn1TSI9d8");
      out.sub_1Tr75A = {
        id: s.id, status: s.status, customer: s.customer,
        created: s.created, canceled_at: s.canceled_at,
        cancellation_details: (s as any).cancellation_details,
        cancel_at_period_end: s.cancel_at_period_end,
        current_period_end: (s.items?.data?.[0] as any)?.current_period_end ?? (s as any).current_period_end,
        latest_invoice: s.latest_invoice,
        metadata: s.metadata,
      };
    } catch (e) { out.sub_1Tr75A_error = String(e); }

    // 1b) Retrieve sub_1Tr64M for cross-ref
    try {
      const s = await stripe.subscriptions.retrieve("sub_1Tr64MGzUSp13bnT" + (new URL(req.url).searchParams.get("s2suffix") ?? ""));
      out.sub_1Tr64M = { id: s.id, status: s.status, customer: s.customer, created: s.created, canceled_at: s.canceled_at, metadata: s.metadata };
    } catch (e) { out.sub_1Tr64M_error = String(e); }

    // 2) All customers for the email
    const email = "john.mcd.3@gmail.com";
    const list = await stripe.customers.list({ email, limit: 100 });
    out.customers = [];
    for (const c of list.data) {
      const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 100 });
      out.customers.push({
        id: c.id, created: c.created, email: c.email,
        metadata: c.metadata,
        subscriptions: subs.data.map((s: any) => ({
          id: s.id, status: s.status, created: s.created, canceled_at: s.canceled_at,
          cancel_at_period_end: s.cancel_at_period_end,
          price_lookup: s.items?.data?.[0]?.price?.lookup_key,
          price_id: s.items?.data?.[0]?.price?.id,
        })),
      });
    }

    // 3) DB row(s)
    const { data: entRows } = await sb.from("user_entitlements").select("*").eq("user_id", ADMIN_UID);
    out.user_entitlements = entRows;
    const { data: purchases } = await sb.from("assessment_purchases").select("*").eq("user_id", ADMIN_UID).order("created_at", { ascending: false }).limit(10);
    out.assessment_purchases = purchases;

    return new Response(JSON.stringify(out, null, 2), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), stack: (e as any)?.stack }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
