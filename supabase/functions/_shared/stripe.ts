// Shared Stripe gateway utility.
// Routes all api.stripe.com calls through the Lovable connector gateway.
// NEVER instantiate `new Stripe(...)` directly with these env vars — they are
// gateway connection identifiers, not real Stripe secret keys.

import Stripe from "https://esm.sh/stripe@18.5.0";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

export type StripeEnv = "sandbox" | "live";

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

export function getConnectionApiKey(env: StripeEnv): string {
  const key =
    env === "sandbox"
      ? Deno.env.get("STRIPE_SANDBOX_API_KEY")
      : Deno.env.get("STRIPE_LIVE_API_KEY");
  if (!key) throw new Error(`STRIPE_${env.toUpperCase()}_API_KEY is not configured`);
  return key;
}

export function createStripeClient(env: StripeEnv): Stripe {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableApiKey) throw new Error("LOVABLE_API_KEY is not configured");

  return new Stripe(connectionApiKey, {
    httpClient: Stripe.createFetchHttpClient((url: string | URL, init?: RequestInit) => {
      const gatewayUrl = url.toString().replace("https://api.stripe.com", GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init?.headers).entries()),
          "X-Connection-Api-Key": connectionApiKey,
          "Lovable-API-Key": lovableApiKey,
        },
      });
    }),
  });
}

/**
 * Resolve a human-readable price ID (e.g. "li_standalone") to the real
 * Stripe price ID via Stripe's native lookup_keys feature.
 */
export async function resolvePriceId(
  stripe: Stripe,
  lookupKey: string
): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 });
  return prices.data[0] ?? null;
}

/**
 * Resolve or create a Stripe Customer keyed by our internal userId.
 * Search order:
 *   1. metadata['userId'] exact match (Stripe Search API)
 *   2. email match (customers.list) — backfill metadata.userId if missing
 *   3. create new customer with { email, metadata: { userId } }
 * Prevents duplicate customer creation when a user re-checkouts
 * (CUSTOMER-1 fix). Callers should pass `customer: customerId` to
 * `checkout.sessions.create` instead of `customer_email`.
 */
export async function resolveOrCreateCustomer(
  stripe: Stripe,
  opts: { userId: string; email?: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(opts.userId)) throw new Error("Invalid userId");

  // 1) Search by metadata.userId — authoritative.
  try {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${opts.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  } catch (_) {
    // search index may lag; fall through to email match.
  }

  // 2) Fallback: email match. Backfill userId metadata on hit.
  if (opts.email) {
    const existing = await stripe.customers.list({ email: opts.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (customer.metadata?.userId !== opts.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: opts.userId },
        });
      }
      return customer.id;
    }
  }

  // 3) Create.
  const created = await stripe.customers.create({
    ...(opts.email && { email: opts.email }),
    metadata: { userId: opts.userId },
  });
  return created.id;
}

/**
 * Verify a Stripe webhook signature using HMAC-SHA256 without the SDK.
 * Reads the secret from PAYMENTS_SANDBOX_WEBHOOK_SECRET / PAYMENTS_LIVE_WEBHOOK_SECRET.
 */
export async function verifyWebhook(
  req: Request,
  env: StripeEnv
): Promise<{ type: string; data: { object: any } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret =
    env === "sandbox"
      ? Deno.env.get("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
      : Deno.env.get("PAYMENTS_LIVE_WEBHOOK_SECRET");

  if (!secret) throw new Error("Webhook secret env var is not configured");
  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = v;
    if (k === "v1") v1Signatures.push(v);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`)
  );
  const expected = new TextDecoder().decode(encodeHex(new Uint8Array(signed)));
  if (!v1Signatures.includes(expected)) throw new Error("Invalid webhook signature");

  return JSON.parse(body);
}
