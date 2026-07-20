// verify-purchase — server-side verification that a Stripe Checkout Session
// belongs to the authenticated user and is paid. Writes an idempotent row
// to `purchase_ledger` on success. This is the ONLY path that should feed
// the `purchase_verified` analytics event.
//
// Auth: verify_jwt is off; we validate the bearer in-code via getClaims.
// Stripe access: routed through the shared gateway client (never direct SDK).
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const anon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const token = authHeader.slice(7).trim();
  const { data: claimsRes, error: claimsErr } = await anon.auth.getClaims(token);
  if (claimsErr || !claimsRes?.claims?.sub) return json({ error: "unauthorized" }, 401);
  const userId = claimsRes.claims.sub as string;
  const userEmail = (claimsRes.claims as Record<string, unknown>).email as string | undefined;

  let body: { session_id?: string; environment?: StripeEnv };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return json({ error: "invalid_session_id" }, 400);
  }
  const environment: StripeEnv = body.environment === "live" ? "live" : "sandbox";

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Idempotency: if we already recorded this session, return the ledger row.
  {
    const { data: existing } = await service
      .from("purchase_ledger")
      .select("user_id, plan, verified_at")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();
    if (existing) {
      if (existing.user_id !== userId) return json({ error: "session_owner_mismatch" }, 403);
      return json({ verified: true, plan: existing.plan, idempotent: true });
    }
  }

  let stripe: ReturnType<typeof createStripeClient>;
  try {
    stripe = createStripeClient(environment);
  } catch (e) {
    console.error("[verify-purchase] stripe client init failed", String(e));
    return json({ error: "stripe_unavailable" }, 503);
  }

  let session: any;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "line_items.data.price"],
    });
  } catch (e) {
    console.error("[verify-purchase] retrieve failed", String(e));
    return json({ error: "session_not_found" }, 404);
  }

  if (session.payment_status !== "paid") {
    return json({ verified: false, reason: `payment_status:${session.payment_status}` }, 409);
  }

  // Ownership check: the Stripe customer email OR the session client_reference_id
  // OR metadata.user_id must match the authenticated user. client_reference_id is
  // preferred; metadata.user_id is the SWEEP-2 T8 fallback for tool-checkout
  // flows that predate the client_reference_id anchor; email is the last resort.
  const clientRef = typeof session.client_reference_id === "string" ? session.client_reference_id : null;
  const metaUserId = typeof session.metadata?.user_id === "string" && session.metadata.user_id.length > 0
    ? session.metadata.user_id
    : null;
  const customerEmail = (typeof session.customer === "object" && session.customer)
    ? (session.customer as any).email
    : session.customer_details?.email;
  const emailMatch = !!(userEmail && customerEmail &&
    userEmail.toLowerCase() === String(customerEmail).toLowerCase());
  const refMatch = clientRef === userId || metaUserId === userId;
  if (!emailMatch && !refMatch) {
    return json({ error: "session_owner_mismatch" }, 403);
  }

  const firstLine = session.line_items?.data?.[0];
  const price = firstLine?.price ?? null;
  const plan = price?.lookup_key ?? price?.metadata?.lovable_external_id ?? null;

  const { error: insErr } = await service.from("purchase_ledger").insert({
    user_id: userId,
    stripe_session_id: sessionId,
    plan,
    amount_cents: session.amount_total ?? null,
    currency: session.currency ?? null,
  });
  if (insErr && !String(insErr.message).includes("duplicate")) {
    console.error("[verify-purchase] ledger insert failed", insErr);
    return json({ error: "ledger_write_failed" }, 500);
  }

  return json({ verified: true, plan });
});
