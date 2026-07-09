// Admin: retrieve a Stripe checkout session with expanded subscription for debugging
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;
    const sessionId = url.searchParams.get("session_id");
    const stripe = createStripeClient(env);
    if (!sessionId) return new Response(JSON.stringify({error:"session_id required"}), { status:400, headers: corsHeaders });
    const s = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "subscription.items.data.price", "line_items", "customer"],
    });
    return new Response(JSON.stringify(s, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
