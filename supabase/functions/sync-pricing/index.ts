/**
 * sync-pricing
 * ============
 * Reads the canonical pricing registry from src/config/pricing.ts — via the
 * GENERATED projection in _shared/pricing-snapshot.ts — and ensures Stripe
 * has a matching Price for every active entry.
 *
 * For each entry:
 *   • Look up an existing Stripe Price by `lookup_key`.
 *   • If amount/currency/interval match → no-op.
 *   • Otherwise → create a new Price with the same `lookup_key`. Stripe
 *     automatically transfers the lookup key from the old Price to the new
 *     one, so checkout code (which resolves prices via `lookup_keys`) keeps
 *     working with zero changes. The old Price is then archived.
 *
 * Auth: requires `Authorization: Bearer <ADMIN_SECRET_TOKEN>`. This is an
 * operator-only endpoint, not user-facing.
 *
 * Body: { environment: "sandbox" | "live" }
 *
 * To add or change a price: edit PRICING_REGISTRY in src/config/pricing.ts,
 * run `deno run --allow-read --allow-write scripts/pricing/generate-pricing-snapshot.ts`
 * (src/test/pricingSnapshot.test.ts fails until you do), deploy, then run
 * this function once per Stripe environment. No per-product code and NO
 * amounts live here (QA batch 2026-09-05 — the hand-copied mirror this file
 * used to carry was still on v11 when the site was on v13).
 */

import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
//  REGISTRY SOURCE — the generated snapshot of src/config/pricing.ts.
//  QA batch 2026-09-05: this file used to carry its own REGISTRY_SNAPSHOT
//  array, hand-copied at v11 (2026-06-11) and never updated for the v13
//  launch repricing, so a "Sync" pushed stale amounts into Stripe. Amounts,
//  names and descriptions now come from _shared/pricing-snapshot.ts only.
//  Regenerate: deno run --allow-read --allow-write scripts/pricing/generate-pricing-snapshot.ts
// ---------------------------------------------------------------------------
import { registryEntries, type SnapshotRegistryEntry } from "../_shared/pricing-snapshot.ts";

type PriceKind = "subscription" | "one_time" | "tiered" | "addon";
interface RegistryEntry {
  lookupKey: string;
  productKey: string;
  productName: string;
  description: string;
  amountCents: number;
  currency: string;
  kind: PriceKind;
  recurringInterval?: "month" | "year";
  active: boolean;
  /** Optional extra price metadata pushed into Stripe alongside lovable_external_id. */
  extraMetadata?: Record<string, string>;
}

// Stripe-only metadata that has no home in the registry (annual Smart Tool
// credits advertised on the subscription price objects).
const EXTRA_METADATA: Record<string, Record<string, string>> = {
  intelligence_annual: { smart_tool_credits: "1", smart_tool_eligible_tools: "governance,lia,dpia" },
  professional_annual: { smart_tool_credits: "3", smart_tool_eligible_tools: "governance,lia,dpia" },
};

// $0 entries are never synced — Stripe cannot price $0; the bypass in
// create-tool-checkout handles inclusion. Inactive entries are skipped by the
// loop below exactly as before.
function registrySnapshotEntries(): RegistryEntry[] {
  return registryEntries()
    .filter((e: SnapshotRegistryEntry) => e.amountCents > 0)
    .map((e: SnapshotRegistryEntry) => ({
      lookupKey: e.lookupKey,
      productKey: e.productKey,
      productName: e.productName,
      description: e.description,
      amountCents: e.amountCents,
      currency: e.currency,
      kind: e.kind as PriceKind,
      recurringInterval: e.recurringInterval,
      active: e.active,
      extraMetadata: EXTRA_METADATA[e.lookupKey],
    }));
}

interface SyncResult {
  lookupKey: string;
  action: "noop" | "created" | "created_and_archived_old";
  oldPriceId?: string;
  newPriceId?: string;
  reason?: string;
}

async function syncOne(
  stripe: ReturnType<typeof createStripeClient>,
  entry: RegistryEntry
): Promise<SyncResult> {
  // 1. Resolve or create the Product. Use productKey as a stable identifier.
  let product;
  const products = await stripe.products.list({ limit: 100, active: true });
  product = products.data.find(
    (p: { metadata?: Record<string, string> | null }) => p.metadata?.lovable_product_key === entry.productKey
  );
  if (!product) {
    product = await stripe.products.create({
      name: entry.productName,
      description: entry.description,
      metadata: { lovable_product_key: entry.productKey },
    });
  } else if (
    product.name !== entry.productName ||
    product.description !== entry.description
  ) {
    product = await stripe.products.update(product.id, {
      name: entry.productName,
      description: entry.description,
    });
  }

  // 2. Look up existing Price by lookup_key.
  const existing = await stripe.prices.list({
    lookup_keys: [entry.lookupKey],
    limit: 1,
    active: true,
  });
  const current = existing.data[0];

  // 3. Compare. If amount + currency + interval match, no-op.
  const intervalMatches =
    entry.kind !== "subscription" ||
    current?.recurring?.interval === entry.recurringInterval;
  if (
    current &&
    current.unit_amount === entry.amountCents &&
    current.currency === entry.currency &&
    intervalMatches
  ) {
    return { lookupKey: entry.lookupKey, action: "noop", newPriceId: current.id };
  }

  // 4. Create a new Price with the same lookup_key. Setting
  //    `transfer_lookup_key: true` on a NEW price tells Stripe to move the
  //    lookup key from any existing price that holds it.
  const newPrice = await stripe.prices.create({
    product: product.id,
    unit_amount: entry.amountCents,
    currency: entry.currency,
    lookup_key: entry.lookupKey,
    transfer_lookup_key: true,
    metadata: { lovable_external_id: entry.lookupKey, ...(entry.extraMetadata ?? {}) },
    ...(entry.kind === "subscription" && entry.recurringInterval
      ? { recurring: { interval: entry.recurringInterval } }
      : {}),
  });

  // 5. Archive the old price (it has lost its lookup_key already).
  if (current && current.id !== newPrice.id) {
    await stripe.prices.update(current.id, { active: false });
    return {
      lookupKey: entry.lookupKey,
      action: "created_and_archived_old",
      oldPriceId: current.id,
      newPriceId: newPrice.id,
      reason: `amount changed: ${current.unit_amount} → ${entry.amountCents}`,
    };
  }

  return {
    lookupKey: entry.lookupKey,
    action: "created",
    newPriceId: newPrice.id,
    reason: "no prior price for this lookup_key",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  // Admin auth via Supabase JWT + has_role('admin'). Also supports the legacy
  // ADMIN_SECRET_TOKEN for back-compat with scripted callers.
  const auth = req.headers.get("authorization") || "";
  const adminToken = Deno.env.get("ADMIN_SECRET_TOKEN");
  let authorized = false;

  if (adminToken && auth === `Bearer ${adminToken}`) {
    authorized = true;
  } else if (auth.startsWith("Bearer ")) {
    try {
      const { createClient } = await import(
        "https://esm.sh/@supabase/supabase-js@2.45.0"
      );
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } }
      );
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (userId) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userId,
          _role: "admin",
        });
        if (isAdmin === true) authorized = true;
      }
    } catch (e) {
      console.error("auth check failed", e);
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { environment?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  // Default to the environment that matches the deployed Stripe keys.
  // Frontend may still pass an explicit value.
  const env = body.environment ?? (Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox");
  if (env !== "sandbox" && env !== "live") {
    return new Response(
      JSON.stringify({ error: "environment must be 'sandbox' or 'live'" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const stripe = createStripeClient(env as StripeEnv);
    const results: SyncResult[] = [];
    for (const entry of registrySnapshotEntries()) {
      if (!entry.active) continue;
      try {
        results.push(await syncOne(stripe, entry));
      } catch (e) {
        results.push({
          lookupKey: entry.lookupKey,
          action: "noop",
          reason: `ERROR: ${(e as Error).message}`,
        });
      }
    }

    const summary = {
      total: results.length,
      created: results.filter((r) => r.action.startsWith("created")).length,
      noop: results.filter((r) => r.action === "noop").length,
      errors: results.filter((r) => r.reason?.startsWith("ERROR:")).length,
    };

    return new Response(JSON.stringify({ environment: env, summary, results }, null, 2), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("sync-pricing error:", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
