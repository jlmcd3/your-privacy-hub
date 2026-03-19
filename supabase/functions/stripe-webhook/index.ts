import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const cryptoProvider = {
  async computeHMACSignature(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  },
};

async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const parts = signature.split(",");
  const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
  const sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1];

  if (!timestamp || !sig) return false;

  const payload = `${timestamp}.${body}`;
  const expected = await cryptoProvider.computeHMACSignature(payload, secret);
  return expected === sig;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response("No signature", { status: 400 });
    }

    const valid = await verifyStripeSignature(body, signature, webhookSecret);
    if (!valid) {
      return new Response("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(body);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        if (userId) {
          // Fetch subscription to determine price_id for Pro detection
          const subId = session.subscription;
          let priceId: string | null = null;
          let isPro = false;
          if (subId) {
            const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;
            const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subId}`, {
              headers: { Authorization: `Bearer ${stripeKey}` },
            });
            const subData = await subRes.json();
            priceId = subData?.items?.data?.[0]?.price?.id ?? null;
            const proPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");
            isPro = !!(proPriceId && priceId === proPriceId);
          }

          await supabase
            .from("profiles")
            .update({
              is_premium: true,
              is_pro: isPro,
              stripe_customer_id: session.customer,
              stripe_price_id: priceId,
              payment_failed: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer;
        await supabase
          .from("profiles")
          .update({
            is_premium: false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        await supabase
          .from("profiles")
          .update({
            payment_failed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_customer_id", customerId);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stripe-webhook error:", err);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
