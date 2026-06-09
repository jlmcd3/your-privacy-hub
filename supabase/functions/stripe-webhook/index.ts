// LEGACY STUB — superseded by `payments-webhook` (v9 audit, Prompt 1.2).
// All Stripe events are now handled by payments-webhook (which writes is_pro,
// recognises professional plans, and grants annual_tool_credits). This stub
// stays so any straggling dashboard-registered endpoint pointing at
// /functions/v1/stripe-webhook receives 200 OK and never re-applies the
// older, divergent logic. Logs the event type for visibility.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.text();
    let eventType = "unknown";
    try {
      const parsed = JSON.parse(body);
      eventType = parsed?.type ?? "unknown";
    } catch {
      // ignore — body might not be JSON
    }
    console.log(
      `[stripe-webhook stub] received event ${eventType}; processing happens in payments-webhook`,
    );
    return new Response(
      JSON.stringify({ received: true, handled_by: "payments-webhook" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[stripe-webhook stub] error:", e);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
