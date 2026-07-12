// admin-tiles — read-only aggregate stats for the /admin hub tiles.
// Cheap COUNT/SELECT queries only; heavier drill-downs live on their own pages.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = await verifyCaller(req, "admin");
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status ?? 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    ordersPaid,
    ordersRefunded,
    cppaComplete,
    cppaFailed,
    events24h,
    actions24h,
  ] = await Promise.all([
    supabase.from("registration_orders").select("id", { count: "exact", head: true }).eq("payment_status", "paid"),
    supabase.from("registration_orders").select("id", { count: "exact", head: true }).eq("payment_status", "refunded"),
    supabase.from("cppa_assessments").select("id", { count: "exact", head: true }).eq("status", "complete"),
    supabase.from("cppa_assessments").select("id", { count: "exact", head: true }).in("status", ["failed", "error"]),
    supabase.from("user_events").select("id", { count: "exact", head: true }).gte("created_at", since24h),
    supabase.from("admin_action_log").select("id", { count: "exact", head: true }).gte("created_at", since24h),
  ]);

  return new Response(JSON.stringify({
    orders: {
      paid: ordersPaid.count ?? 0,
      refunded: ordersRefunded.count ?? 0,
    },
    cppa: {
      complete: cppaComplete.count ?? 0,
      failed_or_error: cppaFailed.count ?? 0,
    },
    traffic_24h: events24h.count ?? 0,
    admin_actions_24h: actions24h.count ?? 0,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
