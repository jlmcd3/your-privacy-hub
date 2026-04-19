// Sets next_renewal_at on a registration_order based on the longest
// renewal_period_months across its jurisdictions. Called from
// generate-registration-docs after documents are ready.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order } = await supabase
      .from("registration_orders").select("*").eq("id", order_id).single();
    if (!order) throw new Error("Order not found");

    const { data: reqs } = await supabase
      .from("jurisdiction_requirements")
      .select("jurisdiction_code, renewal_period_months")
      .in("jurisdiction_code", order.jurisdictions);

    // Pick the SHORTEST nonzero period — first renewal driven by earliest expiry
    const periods = (reqs || [])
      .map((r) => r.renewal_period_months)
      .filter((m): m is number => typeof m === "number" && m > 0);

    if (periods.length === 0) {
      return new Response(JSON.stringify({ scheduled: false, reason: "no renewal periods" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shortest = Math.min(...periods);
    const nextRenewal = new Date();
    nextRenewal.setMonth(nextRenewal.getMonth() + shortest);

    await supabase.from("registration_orders")
      .update({ next_renewal_at: nextRenewal.toISOString() })
      .eq("id", order_id);

    return new Response(JSON.stringify({
      scheduled: true,
      next_renewal_at: nextRenewal.toISOString(),
      months: shortest,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("schedule-registration-renewals error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
