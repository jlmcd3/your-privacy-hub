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
//  Registry snapshot — keep in sync with src/config/pricing.ts
//  (Edge functions can't import from src/. When you change a price in
//  pricing.ts, mirror the amountCents here, then call this function.)
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
}

const REGISTRY_SNAPSHOT: RegistryEntry[] = [
  {
    lookupKey: "intelligence_monthly",
    productKey: "intelligence",
    productName: "Intelligence — Monthly",
    description: "Monthly Intelligence subscription. Weekly Intelligence Brief, full enforcement archive, and watchlists. Compliance tools sold separately at standalone rates.",
    amountCents: 2900,
    currency: "usd",
    kind: "subscription",
    recurringInterval: "month",
    active: true,
  },
  {
    lookupKey: "intelligence_yearly",
    productKey: "intelligence",
    productName: "Platform — Annual",
    description: "Annual Platform subscription. All compliance tools included. $33.25/mo equivalent.",
    amountCents: 39900,
    currency: "usd",
    kind: "subscription",
    recurringInterval: "year",
    active: true,
  },
  {
    lookupKey: "intelligence_yearly_founding",
    productKey: "intelligence",
    productName: "Platform — Annual (Founding Rate)",
    description: "Founding subscriber annual platform subscription. All compliance tools included free. First 500 subscribers only. $369/yr — $30.75/mo equivalent.",
    amountCents: 36900,
    currency: "usd",
    kind: "subscription",
    recurringInterval: "year",
    active: true,
  },
  {
    lookupKey: "per_client_addon",
    productKey: "intelligence",
    productName: "Per-Client Add-On",
    description: "Additional client workspace for annual Platform subscribers. $199/yr per additional client. Annual Platform subscription required.",
    amountCents: 19900,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "us_notice_single_standalone",
    productKey: "us_notice",
    productName: "US Privacy Notice — Single State (Standalone)",
    description: "One state-specific US privacy notice (CCPA/CPRA, Virginia model, MODPA, or FDBR). Standalone price.",
    amountCents: 2500,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "us_notice_single_subscriber",
    productKey: "us_notice",
    productName: "US Privacy Notice — Single State (Intelligence subscriber)",
    description: "Subscriber rate for one state-specific US privacy notice. Requires active Intelligence subscription.",
    amountCents: 1200,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "us_notice_all_standalone",
    productKey: "us_notice",
    productName: "US Privacy Notice — All States Suite (Standalone)",
    description: "Complete suite covering every US state with active privacy law. Standalone price.",
    amountCents: 5900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "us_notice_all_subscriber",
    productKey: "us_notice",
    productName: "US Privacy Notice — All States Suite (Intelligence subscriber)",
    description: "Subscriber rate for the all-states suite. Requires active Intelligence subscription.",
    amountCents: 2900,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "eu_notice_single_standalone",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Single Framework (Standalone)",
    description: "One framework-specific privacy notice (GDPR, UK GDPR, FADP, LGPD, APPI, DPDPA, POPIA, PIPEDA, AU Privacy, PIPA, PDPA, or PDPL).",
    amountCents: 4500,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "eu_notice_single_subscriber",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Single Framework (Intelligence subscriber)",
    description: "Subscriber rate for one framework-specific privacy notice. Requires active Intelligence subscription.",
    amountCents: 1900,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "eu_notice_suite_standalone",
    productKey: "eu_notice",
    productName: "EU Notice Suite — GDPR + UK GDPR + Swiss FADP (Standalone)",
    description: "EU GDPR, UK GDPR, and Swiss FADP — three notices covering most EU-facing businesses.",
    amountCents: 11900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "eu_notice_suite_subscriber",
    productKey: "eu_notice",
    productName: "EU Notice Suite (Intelligence subscriber)",
    description: "Subscriber rate for the EU + UK + Swiss notice suite. Requires active Intelligence subscription.",
    amountCents: 6500,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "eu_notice_full_international_standalone",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Full International (Standalone)",
    description: "All 12 supported global frameworks. One session, 12 notices, plus a combined international notice.",
    amountCents: 22900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "eu_notice_full_international_subscriber",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Full International (Intelligence subscriber)",
    description: "Subscriber rate for the full international suite. Requires active Intelligence subscription.",
    amountCents: 9900,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "eu_notice_refresh_standalone",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Annual Refresh (Standalone)",
    description: "Annual refresh of an existing EU/global notice set.",
    amountCents: 3500,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "eu_notice_refresh_subscriber",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Annual Refresh (Intelligence subscriber)",
    description: "Subscriber rate for an annual EU/global notice refresh. Requires active Intelligence subscription.",
    amountCents: 1900,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "ir_playbook_standalone",
    productKey: "ir_playbook",
    productName: "Breach Response Playbook (Standalone)",
    description: "AI-generated incident response playbook tailored to your organisation. Standalone price; included with Annual Platform.",
    amountCents: 5900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "biometric_checker_standalone",
    productKey: "biometric_checker",
    productName: "Biometric Privacy Compliance Assessment (Standalone)",
    description: "Per-jurisdiction biometric data processing compliance assessment. Standalone price; included with Annual Platform.",
    amountCents: 4900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "governance_assessment_standalone",
    productKey: "governance_assessment",
    productName: "Privacy Programme Assessment (Standalone)",
    description: "Full 10-domain privacy programme assessment, enforcement-calibrated.",
    amountCents: 4900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "li_assessment_standalone",
    productKey: "li_assessment",
    productName: "Legitimate Interest Assessment (Standalone)",
    description: "Full three-part LIA with enforcement calibration.",
    amountCents: 6900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "dpia_framework_standalone",
    productKey: "dpia_framework",
    productName: "Impact Assessment Builder (Standalone)",
    description: "DPIA framework document for Article 35 processing.",
    amountCents: 9900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "dpa_generator_standalone",
    productKey: "dpa_generator",
    productName: "Custom DPA Generator (Standalone)",
    description: "GDPR Article 28 DPA template, enforcement-calibrated.",
    amountCents: 4900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "rofa_initial_standalone",
    productKey: "rofa",
    productName: "RoFA Article 30 Record — Initial Generation (Standalone)",
    description: "Populated Article 30 Record of Processing Activities.",
    amountCents: 7900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "rofa_refresh_standalone",
    productKey: "rofa",
    productName: "RoFA Article 30 Record — Annual Refresh (Standalone)",
    description: "Annual refresh of an existing Article 30 record.",
    amountCents: 3500,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "cppa_risk_standalone",
    productKey: "cppa_risk",
    productName: "CPPA Risk Assessment — Module 1 (Standalone)",
    description: "CPPA audit readiness risk assessment.",
    amountCents: 14900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "cppa_cybersecurity_standalone",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (Standalone)",
    description: "CPPA cybersecurity audit gap analysis.",
    amountCents: 19900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "cppa_suite_standalone",
    productKey: "cppa_suite",
    productName: "CPPA Full Audit Suite — Modules 1 & 2 (Standalone)",
    description: "Complete CPPA audit readiness bundle.",
    amountCents: 29900,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "intelligence_only_yearly",
    productKey: "intelligence",
    productName: "Intelligence — Annual",
    description: "Annual Intelligence subscription. Weekly brief, enforcement archive, watchlists. Compliance tools sold separately at standalone rates.",
    amountCents: 24900,
    currency: "usd",
    kind: "subscription",
    recurringInterval: "year",
    active: true,
  },
  {
    lookupKey: "hc_standalone_v2",
    productKey: "governance_v7",
    productName: "Privacy Program Assessment (v7 Standalone)",
    description: "v7 per-use price for the Privacy Program Assessment Tool.",
    amountCents: 5000,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "hc_subscriber_v2",
    productKey: "governance_v7",
    productName: "Privacy Program Assessment (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the Privacy Program Assessment Tool.",
    amountCents: 3800,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "li_standalone_v2",
    productKey: "lia_v7",
    productName: "Legitimate Interest Assessment (v7 Standalone)",
    description: "v7 per-use price for the LIA Tool.",
    amountCents: 3000,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "li_subscriber_v2",
    productKey: "lia_v7",
    productName: "Legitimate Interest Assessment (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the LIA Tool.",
    amountCents: 2300,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "dpia_standalone_v2",
    productKey: "dpia_v7",
    productName: "Impact Assessment Builder (v7 Standalone)",
    description: "v7 per-use price for the DPIA Tool.",
    amountCents: 4000,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "dpia_subscriber_v2",
    productKey: "dpia_v7",
    productName: "Impact Assessment Builder (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the DPIA Tool.",
    amountCents: 3000,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "dpa_standalone_v2",
    productKey: "dpa_v7",
    productName: "Custom DPA Generator (v7 Standalone)",
    description: "v7 per-use price for the DPA Generator.",
    amountCents: 4000,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "dpa_subscriber_v2",
    productKey: "dpa_v7",
    productName: "Custom DPA Generator (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the DPA Generator.",
    amountCents: 3000,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "ir_standalone_v2",
    productKey: "ir_v7",
    productName: "Breach Response Playbook (v7 Standalone)",
    description: "v7 per-use price for the Breach Response Playbook.",
    amountCents: 2000,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "ir_subscriber_v2",
    productKey: "ir_v7",
    productName: "Breach Response Playbook (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the Breach Response Playbook.",
    amountCents: 1500,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "biometric_standalone_v2",
    productKey: "biometric_v7",
    productName: "Biometric Compliance Check (v7 Standalone)",
    description: "v7 per-use price for the Biometric Compliance Check.",
    amountCents: 1000,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "biometric_subscriber_v2",
    productKey: "biometric_v7",
    productName: "Biometric Compliance Check (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the Biometric Compliance Check.",
    amountCents: 800,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "ropa_initial_subscriber",
    productKey: "rofa",
    productName: "RoPA Builder — Initial (v7 Professional)",
    description: "Professional subscriber rate (25% off) for RoPA initial generation.",
    amountCents: 3000,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "ropa_refresh_subscriber",
    productKey: "rofa",
    productName: "RoPA Builder — Annual Refresh (v7 Professional)",
    description: "Professional subscriber rate (25% off) for RoPA annual refresh.",
    amountCents: 3000,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "us_notice_v7_standalone",
    productKey: "us_notice_v7",
    productName: "US Privacy Notice Builder (v7 Standalone)",
    description: "v7 uniform per-use price for any US notice variant (single state, all-states, refresh).",
    amountCents: 3000,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "us_notice_v7_subscriber",
    productKey: "us_notice_v7",
    productName: "US Privacy Notice Builder (v7 Professional)",
    description: "Professional subscriber rate (25% off) for any US notice variant.",
    amountCents: 2300,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "eu_notice_v7_standalone",
    productKey: "eu_notice_v7",
    productName: "EU & Global Privacy Notice Builder (v7 Standalone)",
    description: "v7 uniform per-use price for any EU/global notice variant.",
    amountCents: 5000,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "eu_notice_v7_subscriber",
    productKey: "eu_notice_v7",
    productName: "EU & Global Privacy Notice Builder (v7 Professional)",
    description: "Professional subscriber rate (25% off) for any EU/global notice variant.",
    amountCents: 3800,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "cppa_risk_subscriber",
    productKey: "cppa_risk",
    productName: "CPPA Risk Assessment — Module 1 (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the CPPA Risk Assessment.",
    amountCents: 4500,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "cppa_cyber_standalone",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (v7 Standalone)",
    description: "v7 per-use price for the CPPA Cybersecurity Readiness assessment.",
    amountCents: 8000,
    currency: "usd",
    kind: "one_time",
    active: true,
  },
  {
    lookupKey: "cppa_cyber_subscriber",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the CPPA Cybersecurity Readiness assessment.",
    amountCents: 6000,
    currency: "usd",
    kind: "addon",
    active: true,
  },
  {
    lookupKey: "cppa_suite_subscriber",
    productKey: "cppa_suite",
    productName: "CPPA Full Audit Suite — Modules 1 & 2 (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the CPPA Full Audit Suite.",
    amountCents: 10500,
    currency: "usd",
    kind: "addon",
    active: true,
  },
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
    metadata: { lovable_external_id: entry.lookupKey },
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
