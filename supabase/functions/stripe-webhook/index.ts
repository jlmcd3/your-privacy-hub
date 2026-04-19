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

        // Handle tool purchase completions (standalone, non-subscriber)
        if (session.metadata?.tool_type && session.metadata?.assessment_id) {
          const { tool_type, assessment_id } = session.metadata;

          await supabase.from("assessment_purchases").insert({
            user_id: userId || null,
            tool_type,
            assessment_id,
            amount_cents: session.amount_total || 0,
            stripe_payment_intent_id: session.payment_intent as string,
            status: "paid",
            subscriber_at_time: false,
          });

          const tableMap: Record<string, string> = {
            li_assessment: "li_assessments",
            governance_assessment: "governance_assessments",
            dpia_framework: "dpia_frameworks",
          };
          const table = tableMap[tool_type];
          if (table) {
            await supabase.from(table).update({
              stripe_payment_intent_id: session.payment_intent as string,
              purchase_price_cents: session.amount_total || 0,
            }).eq("id", assessment_id);

            const fnMap: Record<string, string> = {
              li_assessment: "run-li-assessment",
              governance_assessment: "run-governance-assessment",
              dpia_framework: "run-dpia-framework",
            };
            const fn = fnMap[tool_type];
            const bodyKey = tool_type === "dpia_framework" ? "dpia_id" : "assessment_id";
            await supabase.functions.invoke(fn, { body: { [bodyKey]: assessment_id } });
          }
          break;
        }

        if (!userId) break;

        // Check if this is a report credit purchase
        if (session.metadata?.type === "report_credits") {
          const credits = parseInt(session.metadata.credits, 10);
          if (credits > 0) {
            // Fetch current credits and add
            const { data: profile } = await supabase
              .from("profiles")
              .select("bonus_report_credits")
              .eq("id", userId)
              .single();
            const current = (profile as any)?.bonus_report_credits ?? 0;
            await supabase
              .from("profiles")
              .update({
                bonus_report_credits: current + credits,
                updated_at: new Date().toISOString(),
              })
              .eq("id", userId);
          }
          break;
        }

        // Subscription checkout
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

        // Resolve subscription tier + interval from session metadata (set in
        // create-checkout-session) with safe fallbacks.
        const tier = session.metadata?.subscription_tier || "professional";
        const intervalMeta = session.metadata?.subscription_interval || "month";

        await supabase
          .from("profiles")
          .update({
            is_premium: true,
            is_pro: isPro,
            subscription_tier: tier,
            subscription_interval: intervalMeta,
            subscription_plan: tier,
            stripe_customer_id: session.customer,
            stripe_price_id: priceId,
            payment_failed: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer;
        await supabase
          .from("profiles")
          .update({
            is_premium: false,
            subscription_tier: "free",
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
