/**
 * sync-pricing
 * ============
 * Reads the canonical pricing registry from src/config/pricing.ts (mirrored
 * here as a JSON snapshot at deploy time) and ensures Stripe has a matching
 * Price for every active entry.
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
 * To add a new product: add it to PRICING_REGISTRY in src/config/pricing.ts
 * AND mirror the change into REGISTRY_SNAPSHOT below (or, in a future
 * iteration, generate this snapshot at build time). The function is
 * intentionally registry-driven — no per-product code lives here.
 */

import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
//  PRICE MIRROR — MUST mirror src/config/pricing.ts PRICING_REGISTRY exactly. (v11 deployed 2026-06-11)
//  Update both in the same commit.
// ---------------------------------------------------------------------------
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

// Full mirror of PRICING_REGISTRY in src/config/pricing.ts. Keep in sync
// entry-for-entry; the reconciliation UI compares Stripe against this list,
// so anything omitted here is silently never synced.
const REGISTRY_SNAPSHOT: RegistryEntry[] = [
  // ── Subscriptions ─────────────────────────────────────────────────────
  { lookupKey: "intelligence_monthly", productKey: "intelligence", productName: "Intelligence — Monthly", description: "Monthly Intelligence subscription. Daily privacy intelligence feed, weekly Intelligence Brief, AI investigation prompts. Compliance tools sold separately at standalone rates.", amountCents: 2000, currency: "usd", kind: "subscription", recurringInterval: "month", active: true },
  { lookupKey: "intelligence_annual", productKey: "intelligence", productName: "Intelligence — Annual", description: "Annual Intelligence subscription. Save $40 — pay for 10 months, get 12. Includes 1 free Smart Tool run per year (Governance, LIA, or DPIA).", amountCents: 20000, currency: "usd", kind: "subscription", recurringInterval: "year", active: true, extraMetadata: { smart_tool_credits: "1", smart_tool_eligible_tools: "governance,lia,dpia" } },
  { lookupKey: "intelligence_yearly", productKey: "intelligence", productName: "Intelligence — Annual (legacy alias)", description: "Legacy lookup key. Mirrors intelligence_annual at the $200/yr price.", amountCents: 20000, currency: "usd", kind: "subscription", recurringInterval: "year", active: true },
  { lookupKey: "intelligence_yearly_founding", productKey: "intelligence", productName: "Intelligence — Annual (Founding alias)", description: "Retired founding-subscriber alias. Founding discounts now applied at tool checkout.", amountCents: 20000, currency: "usd", kind: "subscription", recurringInterval: "year", active: false },
  { lookupKey: "professional_monthly", productKey: "professional", productName: "Professional — Monthly", description: "Monthly Professional subscription. Everything in Intelligence plus the client/matter workspace. Annual subscription required to activate client management.", amountCents: 4900, currency: "usd", kind: "subscription", recurringInterval: "month", active: true },
  { lookupKey: "professional_annual", productKey: "professional", productName: "Professional — Annual", description: "Annual Professional subscription. Save $98 — pay for 10 months, get 12. Unlocks client/matter workspace, every Layer-1 tool, and 3 free Smart Tool runs per year (Governance, LIA, or DPIA).", amountCents: 49000, currency: "usd", kind: "subscription", recurringInterval: "year", active: true, extraMetadata: { smart_tool_credits: "3", smart_tool_eligible_tools: "governance,lia,dpia" } },
  { lookupKey: "professional_client", productKey: "professional", productName: "Professional — Per-Client (Annual)", description: "Additional client workspace for Professional annual subscribers. $150/client/year.", amountCents: 15000, currency: "usd", kind: "addon", active: true },
  { lookupKey: "per_client_addon", productKey: "professional", productName: "Per-Client Add-On (legacy alias)", description: "Legacy alias for professional_client. Annual Professional subscription required.", amountCents: 15000, currency: "usd", kind: "addon", active: true },

  // ── v8 per-use tool prices ────────────────────────────────────────────
  { lookupKey: "hc_standalone_v2",        productKey: "governance_v8", productName: "GDPR Governance Assessment (Standalone)",       description: "Standalone per-use price for the GDPR Governance Assessment.", amountCents: 8900, currency: "usd", kind: "one_time", active: true },
  { lookupKey: "hc_subscriber_v2",        productKey: "governance_v8", productName: "GDPR Governance Assessment (Subscriber)",       description: "Subscriber per-use price for the GDPR Governance Assessment.", amountCents: 4900, currency: "usd", kind: "addon",    active: true },
  { lookupKey: "li_standalone_v2",        productKey: "lia_v8",        productName: "Legitimate Interest Assessment (Standalone)",   description: "Standalone per-use price for the LIA Tool.", amountCents: 10900, currency: "usd", kind: "one_time", active: true },
  { lookupKey: "li_subscriber_v2",        productKey: "lia_v8",        productName: "Legitimate Interest Assessment (Subscriber)",   description: "Subscriber per-use price for the LIA Tool.", amountCents: 5900, currency: "usd", kind: "addon",    active: true },
  { lookupKey: "dpia_standalone_v2",      productKey: "dpia_v8",       productName: "Impact Assessment Builder (Standalone)",        description: "Standalone per-use price for the DPIA Tool.", amountCents: 10900, currency: "usd", kind: "one_time", active: true },
  { lookupKey: "dpia_subscriber_v2",      productKey: "dpia_v8",       productName: "Impact Assessment Builder (Subscriber)",        description: "Subscriber per-use price for the DPIA Tool.", amountCents: 5900, currency: "usd", kind: "addon",    active: true },
  { lookupKey: "dpa_standalone_v2",       productKey: "dpa_v8",        productName: "Custom DPA Generator (Standalone)",             description: "Standalone per-use price for the DPA Generator.", amountCents: 4900, currency: "usd", kind: "one_time", active: true },
  // dpa_subscriber_v2 is FREE for subscribers — Stripe cannot price $0, so checkout is bypassed in create-tool-checkout. Not synced to Stripe.
  { lookupKey: "dpa_subscriber_v2",       productKey: "dpa_v8",        productName: "Custom DPA Generator (Subscriber)",             description: "Free for subscribers — bypasses Stripe checkout.", amountCents: 0, currency: "usd", kind: "addon", active: false },
  { lookupKey: "ir_standalone_v2",        productKey: "ir_v8",         productName: "Incident Response Playbook (Standalone)",       description: "Standalone per-use price for the Incident Response Playbook.", amountCents: 5900, currency: "usd", kind: "one_time", active: true },
  // ir_subscriber_v2 / biometric_subscriber_v2 are FREE for subscribers — not synced to Stripe.
  { lookupKey: "ir_subscriber_v2",        productKey: "ir_v8",         productName: "Incident Response Playbook (Subscriber)",       description: "Free for subscribers — bypasses Stripe checkout.", amountCents: 0, currency: "usd", kind: "addon", active: false },
  { lookupKey: "biometric_standalone_v2", productKey: "biometric_v8",  productName: "Biometric Compliance Check (Standalone)",       description: "Standalone per-use price for the Biometric Compliance Check.", amountCents: 4900, currency: "usd", kind: "one_time", active: true },
  { lookupKey: "biometric_subscriber_v2", productKey: "biometric_v8",  productName: "Biometric Compliance Check (Subscriber)",       description: "Free for subscribers — bypasses Stripe checkout.", amountCents: 0, currency: "usd", kind: "addon", active: false },

  // ── RoPA / Notice builders — subscriber-only (standalones RETIRED) ────
  { lookupKey: "ropa_initial_standalone", productKey: "rofa",          productName: "RoPA Builder — Initial Generation (Standalone — RETIRED)", description: "Retired: RoPA Builder is subscriber-only.", amountCents: 9900, currency: "usd", kind: "one_time", active: false },
  { lookupKey: "ropa_refresh_standalone", productKey: "rofa",          productName: "RoPA Builder — Annual Refresh (Standalone — RETIRED)",     description: "Retired: RoPA Builder is subscriber-only.", amountCents: 7900, currency: "usd", kind: "one_time", active: false },
  { lookupKey: "ropa_initial_subscriber", productKey: "rofa",          productName: "RoPA Builder — Initial (Subscriber)",           description: "Free for subscribers — bypasses Stripe checkout.", amountCents: 0, currency: "usd", kind: "addon", active: true },
  { lookupKey: "ropa_refresh_subscriber", productKey: "rofa",          productName: "RoPA Builder — Annual Refresh (Subscriber)",    description: "Free for subscribers — bypasses Stripe checkout.", amountCents: 0, currency: "usd", kind: "addon", active: true },
  { lookupKey: "us_notice_v7_standalone", productKey: "us_notice_v8",  productName: "US Privacy Notice Builder (Standalone — RETIRED)", description: "Retired: US Privacy Notice Builder is subscriber-only.", amountCents: 2500, currency: "usd", kind: "one_time", active: false },
  { lookupKey: "us_notice_v7_subscriber", productKey: "us_notice_v8",  productName: "US Privacy Notice Builder (Subscriber alias)",  description: "Subscriber-rate alias for any US notice variant.", amountCents: 2000, currency: "usd", kind: "addon", active: false },
  { lookupKey: "eu_notice_v7_standalone", productKey: "eu_notice_v8",  productName: "EU & Global Privacy Notice Builder (Standalone — RETIRED)", description: "Retired: EU & Global Privacy Notice Builder is subscriber-only.", amountCents: 4000, currency: "usd", kind: "one_time", active: false },
  { lookupKey: "eu_notice_v7_subscriber", productKey: "eu_notice_v8",  productName: "EU & Global Privacy Notice Builder (Subscriber alias)", description: "Subscriber-rate alias for any EU/global notice variant.", amountCents: 3000, currency: "usd", kind: "addon", active: false },

  // ── CPPA Modules 1/2/3 + Suite ───────────────────────────────────────
  { lookupKey: "cppa_risk_standalone",    productKey: "cppa_risk",         productName: "CPPA Risk Assessment — Module 1 (Standalone)",           description: "Standalone per-use price for the CPPA Risk Assessment.", amountCents: 23900, currency: "usd", kind: "one_time", active: true },
  { lookupKey: "cppa_risk_subscriber",    productKey: "cppa_risk",         productName: "CPPA Risk Assessment — Module 1 (Subscriber)",           description: "Subscriber per-use price for the CPPA Risk Assessment.", amountCents: 13900, currency: "usd", kind: "addon",    active: true },
  { lookupKey: "cppa_cyber_standalone",   productKey: "cppa_cybersecurity", productName: "CPPA Cybersecurity Readiness — Module 2 (Standalone)",  description: "Standalone per-use price for the CPPA Cybersecurity Readiness assessment.", amountCents: 29900, currency: "usd", kind: "one_time", active: true },
  { lookupKey: "cppa_cyber_subscriber",   productKey: "cppa_cybersecurity", productName: "CPPA Cybersecurity Readiness — Module 2 (Subscriber)",  description: "Subscriber per-use price for the CPPA Cybersecurity Readiness assessment.", amountCents: 16900, currency: "usd", kind: "addon",    active: true },
  { lookupKey: "cppa_suite_standalone",   productKey: "cppa_suite",        productName: "CPPA Full Audit Suite — Modules 1 & 2 (Standalone)",     description: "Complete CPPA audit readiness bundle. Save $79 vs buying modules separately.", amountCents: 44900, currency: "usd", kind: "one_time", active: true },
  { lookupKey: "cppa_suite_subscriber",   productKey: "cppa_suite",        productName: "CPPA Full Audit Suite — Modules 1 & 2 (Subscriber)",     description: "Subscriber per-use price for the CPPA Full Audit Suite.", amountCents: 24900, currency: "usd", kind: "addon",    active: true },
  { lookupKey: "cppa_admt_standalone",    productKey: "cppa_admt",         productName: "ADMT Compliance Assessment — Module 3 (Standalone)",     description: "Standalone per-use price for the ADMT Compliance Assessment (pre-use notice, opt-out, access rights gap analysis).", amountCents: 10900, currency: "usd", kind: "one_time", active: true },
  { lookupKey: "cppa_admt_subscriber",    productKey: "cppa_admt",         productName: "ADMT Compliance Assessment — Module 3 (Subscriber)",     description: "Subscriber per-use price for the ADMT Compliance Assessment.", amountCents: 5900, currency: "usd", kind: "addon",    active: true },

  // ── Registration Manager ─────────────────────────────────────────────
  { lookupKey: "registration_standalone",     productKey: "registration", productName: "Registration Filings — DIY Toolkit (Standalone)",        description: "Flat per-filing price for the DPO / DPA / AI Act registration document pack. One price regardless of jurisdiction count.", amountCents: 5900, currency: "usd", kind: "one_time", active: true },
  { lookupKey: "registration_subscriber",     productKey: "registration", productName: "Registration Filings — DIY Toolkit (Subscriber alias)",  description: "Subscriber-rate alias for the DPO / DPA / AI Act registration document pack.", amountCents: 5900, currency: "usd", kind: "addon",    active: true },
  { lookupKey: "registration_counsel_review", productKey: "registration", productName: "Registration Manager — Counsel-Ready Pack",              description: "Counsel-ready bundle of jurisdiction-specific registration documents with attorney review notes.", amountCents: 29900, currency: "usd", kind: "one_time", active: true },

  // ── Smart Tool meter top-ups (+4 generations, half of standalone) ────
  { lookupKey: "li_topup_v1",                 productKey: "lia_v8",             productName: "Legitimate Interest Assessment — 4 additional generations",  description: "Meter top-up: adds 4 additional generations on an existing LIA. Half-price policy.",                                 amountCents: 5450,  currency: "usd", kind: "addon", active: true },
  { lookupKey: "governance_topup_v1",         productKey: "governance_v8",      productName: "GDPR Governance Assessment — 4 additional generations",      description: "Meter top-up: adds 4 additional generations on an existing Governance Assessment. Half-price policy.",              amountCents: 4450,  currency: "usd", kind: "addon", active: true },
  { lookupKey: "dpia_topup_v1",               productKey: "dpia_v8",            productName: "Impact Assessment Builder — 4 additional generations",       description: "Meter top-up: adds 4 additional generations on an existing DPIA. Half-price policy.",                                amountCents: 5450,  currency: "usd", kind: "addon", active: true },
  { lookupKey: "dpa_topup_v1",                productKey: "dpa_v8",             productName: "Custom DPA Generator — 4 additional generations",            description: "Meter top-up: adds 4 additional generations on an existing DPA. Half-price policy.",                                 amountCents: 2450,  currency: "usd", kind: "addon", active: true },
  { lookupKey: "ir_topup_v1",                 productKey: "ir_v8",              productName: "Incident Response Playbook — 4 additional generations",      description: "Meter top-up: adds 4 additional generations on an existing IR Playbook. Half-price policy.",                         amountCents: 2950,  currency: "usd", kind: "addon", active: true },
  { lookupKey: "biometric_topup_v1",          productKey: "biometric_v8",       productName: "Biometric Compliance Check — 4 additional generations",      description: "Meter top-up: adds 4 additional generations on an existing Biometric Compliance Check. Half-price policy.",          amountCents: 2450,  currency: "usd", kind: "addon", active: true },
  { lookupKey: "cppa_admt_topup_v1",          productKey: "cppa_admt",          productName: "ADMT Compliance Assessment — 4 additional generations",      description: "Meter top-up: adds 4 additional generations on an existing ADMT Compliance Assessment. Half-price policy.",          amountCents: 5450,  currency: "usd", kind: "addon", active: true },
  { lookupKey: "cppa_risk_topup_v1",          productKey: "cppa_risk",          productName: "CPPA Risk Assessment — 4 additional generations",            description: "Meter top-up: adds 4 additional generations on an existing CPPA Risk Assessment. Half-price policy.",                amountCents: 11950, currency: "usd", kind: "addon", active: true },
  { lookupKey: "cppa_cybersecurity_topup_v1", productKey: "cppa_cybersecurity", productName: "CPPA Cybersecurity Readiness — 4 additional generations",    description: "Meter top-up: adds 4 additional generations on an existing CPPA Cybersecurity Readiness assessment. Half-price policy.", amountCents: 14950, currency: "usd", kind: "addon", active: true },
];

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
    (p) => p.metadata?.lovable_product_key === entry.productKey
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
    for (const entry of REGISTRY_SNAPSHOT) {
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
