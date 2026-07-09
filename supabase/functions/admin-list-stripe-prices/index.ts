// Admin: dump Stripe catalog for an environment.
// GET ?env=sandbox|live
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
    const stripe = createStripeClient(env);

    const prices: any[] = [];
    let starting_after: string | undefined;
    // paginate up to 500
    for (let i = 0; i < 5; i++) {
      const page: any = await stripe.prices.list({ limit: 100, active: undefined, expand: ["data.product"], ...(starting_after && { starting_after }) });
      for (const p of page.data) {
        prices.push({
          id: p.id,
          lookup_key: p.lookup_key,
          active: p.active,
          unit_amount: p.unit_amount,
          currency: p.currency,
          type: p.type,
          interval: p.recurring?.interval ?? null,
          interval_count: p.recurring?.interval_count ?? null,
          nickname: p.nickname,
          product_id: typeof p.product === "string" ? p.product : p.product?.id,
          product_name: typeof p.product === "string" ? null : (p.product as any)?.name,
          product_active: typeof p.product === "string" ? null : (p.product as any)?.active,
        });
      }
      if (!page.has_more) break;
      starting_after = page.data[page.data.length - 1]?.id;
    }

    return new Response(JSON.stringify({ env, count: prices.length, prices }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
