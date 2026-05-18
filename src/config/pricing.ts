/**
 * ============================================================================
 *  PRICING REGISTRY — Single Source of Truth
 * ============================================================================
 *
 *  Every price displayed on the site OR charged by Stripe MUST originate
 *  from this file. No hardcoded "$39" strings anywhere else in the codebase.
 *
 *  ─── How to change a price ────────────────────────────────────────────────
 *  1. Edit the `amountCents` (and `displayPrice` if formatting changes) for
 *     the relevant entry below.
 *  2. The website updates instantly — every component imports from here.
 *  3. Run the `sync-pricing` edge function (Admin → Pricing → Sync) to push
 *     the change to Stripe. It creates a new Stripe Price with the same
 *     `lookupKey` and Stripe automatically migrates checkout to it.
 *
 *  ─── How to add a NEW product ─────────────────────────────────────────────
 *  Just add a new entry to PRICING_REGISTRY below. It must have a unique
 *  `lookupKey` (used by Stripe + checkout code) and a `kind`. That's it —
 *  the scanner, sync function, admin UI, and pricing helpers all pick it up
 *  automatically.
 *
 *  ─── Kinds (extensible) ───────────────────────────────────────────────────
 *    "subscription"   — recurring (monthly/yearly)
 *    "one_time"       — one-time charge (assessment tools, reports)
 *    "tiered"         — quantity-bracket pricing (registration jurisdictions)
 *    "addon"          — companion to another product (subscriber discount)
 *
 *  Add new kinds as needed; downstream consumers should pattern-match
 *  defensively (`switch(kind) { default: ... }`).
 * ============================================================================
 */

export type PriceKind = "subscription" | "one_time" | "tiered" | "addon";
export type RecurringInterval = "month" | "year";

/** Common fields shared by every price entry. */
interface PriceEntryBase {
  /** Stable, human-readable identifier. Used as Stripe `lookup_key` and in checkout code. snake_case. */
  lookupKey: string;
  /** Product family this entry belongs to (e.g. "intelligence", "registration", "biometric_checker"). */
  productKey: string;
  /** Display name shown in receipts, admin UI, Stripe dashboard. */
  productName: string;
  /** Short description for Stripe + admin UI. */
  description: string;
  /** Amount in the smallest currency unit (cents for USD). */
  amountCents: number;
  /** ISO 4217 currency code, lowercased. */
  currency: "usd";
  /** Pre-formatted display string (e.g. "$39"). Keep in sync with amountCents. */
  displayPrice: string;
  /** Optional unit suffix used by some UIs (e.g. "/month", "/year", " flat"). */
  displaySuffix?: string;
  /** If true, this entry is shown to users. Set false to deprecate without deleting. */
  active: boolean;
}

export interface SubscriptionPrice extends PriceEntryBase {
  kind: "subscription";
  recurringInterval: RecurringInterval;
}

export interface OneTimePrice extends PriceEntryBase {
  kind: "one_time";
}

export interface TieredPrice extends PriceEntryBase {
  kind: "tiered";
  /** Inclusive upper bound for this tier (e.g. 3 = "up to 3 jurisdictions"). null = unlimited. */
  maxQuantity: number | null;
  /** What's being counted (e.g. "jurisdictions", "seats"). */
  unitLabel: string;
}

export interface AddonPrice extends PriceEntryBase {
  kind: "addon";
  /** lookupKey of the parent product this addon attaches to. */
  parentLookupKey: string;
  /** Why this addon exists (e.g. "subscriber_discount", "expedited"). */
  addonReason: string;
}

export type PriceEntry =
  | SubscriptionPrice
  | OneTimePrice
  | TieredPrice
  | AddonPrice;

// ============================================================================
//  THE REGISTRY — edit this block to change prices
// ============================================================================

export const PRICING_REGISTRY = {
  // ── Intelligence subscription ──────────────────────────────────────────
  intelligence_monthly: {
    kind: "subscription",
    lookupKey: "intelligence_monthly",
    productKey: "intelligence",
    productName: "Intelligence — Monthly",
    description:
      "Monthly Intelligence subscription. Weekly Intelligence Brief, full enforcement archive, and watchlists. Compliance tools sold separately at standalone rates.",
    amountCents: 2900,
    currency: "usd",
    displayPrice: "$29",
    displaySuffix: "/month",
    recurringInterval: "month",
    active: true,
  },
  intelligence_yearly: {
    kind: "subscription",
    lookupKey: "intelligence_yearly",
    productKey: "intelligence",
    productName: "Platform — Annual",
    description:
      "Annual Platform subscription. All compliance tools included. $33.25/mo equivalent.",
    amountCents: 39900,
    currency: "usd",
    displayPrice: "$399",
    displaySuffix: "/year",
    recurringInterval: "year",
    active: true,
  },
  intelligence_yearly_founding: {
    kind: "subscription",
    lookupKey: "intelligence_yearly_founding",
    productKey: "intelligence",
    productName: "Platform — Annual (Founding Rate)",
    description:
      "Founding subscriber annual platform subscription. All compliance tools included free. First 500 subscribers only. $369/yr — $30.75/mo equivalent.",
    amountCents: 36900,
    currency: "usd",
    displayPrice: "$369",
    displaySuffix: "/year",
    recurringInterval: "year",
    active: false,
  },
  per_client_addon: {
    kind: "addon",
    lookupKey: "per_client_addon",
    productKey: "intelligence",
    productName: "Per-Client Add-On",
    description:
      "Additional client workspace for annual Platform subscribers. $199/yr per additional client. Annual Platform subscription required.",
    amountCents: 19900,
    currency: "usd",
    displayPrice: "$199",
    displaySuffix: "/year per client",
    parentLookupKey: "intelligence_yearly",
    addonReason: "multi_client",
    active: true,
  },

  // ── US Privacy Notice — per-state ──────────────────────────────────────
  us_notice_single_standalone: {
    kind: "one_time",
    lookupKey: "us_notice_single_standalone",
    productKey: "us_notice",
    productName: "US Privacy Notice — Single State (Standalone)",
    description:
      "One state-specific US privacy notice (CCPA/CPRA, Virginia model, MODPA, or FDBR). Standalone price.",
    amountCents: 2500,
    currency: "usd",
    displayPrice: "$25",
    displaySuffix: " per state",
    active: true,
  },
  us_notice_single_subscriber: {
    kind: "addon",
    lookupKey: "us_notice_single_subscriber",
    productKey: "us_notice",
    productName: "US Privacy Notice — Single State (Intelligence subscriber)",
    description:
      "Subscriber rate for one state-specific US privacy notice. Requires active Intelligence subscription.",
    amountCents: 1200,
    currency: "usd",
    displayPrice: "$12",
    displaySuffix: " per state",
    parentLookupKey: "intelligence_monthly",
    addonReason: "subscriber_discount",
    active: true,
  },
  us_notice_all_standalone: {
    kind: "one_time",
    lookupKey: "us_notice_all_standalone",
    productKey: "us_notice",
    productName: "US Privacy Notice — All States Suite (Standalone)",
    description:
      "Complete suite covering every US state with active privacy law. Standalone price.",
    amountCents: 5900,
    currency: "usd",
    displayPrice: "$59",
    displaySuffix: " flat",
    active: true,
  },
  us_notice_all_subscriber: {
    kind: "addon",
    lookupKey: "us_notice_all_subscriber",
    productKey: "us_notice",
    productName: "US Privacy Notice — All States Suite (Intelligence subscriber)",
    description:
      "Subscriber rate for the all-states suite. Requires active Intelligence subscription.",
    amountCents: 2900,
    currency: "usd",
    displayPrice: "$29",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_monthly",
    addonReason: "subscriber_discount",
    active: true,
  },

  // ── EU & Global Privacy Notice ─────────────────────────────────────────
  eu_notice_single_standalone: {
    kind: "one_time",
    lookupKey: "eu_notice_single_standalone",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Single Framework (Standalone)",
    description:
      "One framework-specific privacy notice (GDPR, UK GDPR, FADP, LGPD, APPI, DPDPA, POPIA, PIPEDA, AU Privacy, PIPA, PDPA, or PDPL).",
    amountCents: 4500,
    currency: "usd",
    displayPrice: "$45",
    displaySuffix: " per framework",
    active: true,
  },
  eu_notice_single_subscriber: {
    kind: "addon",
    lookupKey: "eu_notice_single_subscriber",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Single Framework (Intelligence subscriber)",
    description:
      "Subscriber rate for one framework-specific privacy notice. Requires active Intelligence subscription.",
    amountCents: 1900,
    currency: "usd",
    displayPrice: "$19",
    displaySuffix: " per framework",
    parentLookupKey: "intelligence_monthly",
    addonReason: "subscriber_discount",
    active: true,
  },
  eu_notice_suite_standalone: {
    kind: "one_time",
    lookupKey: "eu_notice_suite_standalone",
    productKey: "eu_notice",
    productName: "EU Notice Suite — GDPR + UK GDPR + Swiss FADP (Standalone)",
    description:
      "EU GDPR, UK GDPR, and Swiss FADP — three notices covering most EU-facing businesses.",
    amountCents: 11900,
    currency: "usd",
    displayPrice: "$119",
    displaySuffix: " flat",
    active: true,
  },
  eu_notice_suite_subscriber: {
    kind: "addon",
    lookupKey: "eu_notice_suite_subscriber",
    productKey: "eu_notice",
    productName: "EU Notice Suite (Intelligence subscriber)",
    description:
      "Subscriber rate for the EU + UK + Swiss notice suite. Requires active Intelligence subscription.",
    amountCents: 6500,
    currency: "usd",
    displayPrice: "$65",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_monthly",
    addonReason: "subscriber_discount",
    active: true,
  },
  eu_notice_full_international_standalone: {
    kind: "one_time",
    lookupKey: "eu_notice_full_international_standalone",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Full International (Standalone)",
    description:
      "All 12 supported global frameworks. One session, 12 notices, plus a combined international notice.",
    amountCents: 22900,
    currency: "usd",
    displayPrice: "$229",
    displaySuffix: " flat",
    active: true,
  },
  eu_notice_full_international_subscriber: {
    kind: "addon",
    lookupKey: "eu_notice_full_international_subscriber",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Full International (Intelligence subscriber)",
    description:
      "Subscriber rate for the full international suite. Requires active Intelligence subscription.",
    amountCents: 9900,
    currency: "usd",
    displayPrice: "$99",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_monthly",
    addonReason: "subscriber_discount",
    active: true,
  },
  eu_notice_refresh_standalone: {
    kind: "one_time",
    lookupKey: "eu_notice_refresh_standalone",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Annual Refresh (Standalone)",
    description: "Annual refresh of an existing EU/global notice set.",
    amountCents: 3500,
    currency: "usd",
    displayPrice: "$35",
    displaySuffix: " flat",
    active: true,
  },
  eu_notice_refresh_subscriber: {
    kind: "addon",
    lookupKey: "eu_notice_refresh_subscriber",
    productKey: "eu_notice",
    productName: "EU & Global Notice — Annual Refresh (Intelligence subscriber)",
    description:
      "Subscriber rate for an annual EU/global notice refresh. Requires active Intelligence subscription.",
    amountCents: 1900,
    currency: "usd",
    displayPrice: "$19",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_monthly",
    addonReason: "subscriber_discount",
    active: true,
  },

  // ── Standalone tools (subscriber rate = included free with Annual Platform) ──
  ir_playbook_standalone: {
    kind: "one_time",
    lookupKey: "ir_playbook_standalone",
    productKey: "ir_playbook",
    productName: "Breach Response Playbook (Standalone)",
    description:
      "AI-generated incident response playbook tailored to your organisation. Standalone price; included with Annual Platform.",
    amountCents: 5900,
    currency: "usd",
    displayPrice: "$59",
    displaySuffix: " flat",
    active: true,
  },
  biometric_checker_standalone: {
    kind: "one_time",
    lookupKey: "biometric_checker_standalone",
    productKey: "biometric_checker",
    productName: "Biometric Privacy Compliance Assessment (Standalone)",
    description:
      "Per-jurisdiction biometric data processing compliance assessment. Standalone price; included with Annual Platform.",
    amountCents: 4900,
    currency: "usd",
    displayPrice: "$49",
    displaySuffix: " flat",
    active: true,
  },
  governance_assessment_standalone: {
    kind: "one_time",
    lookupKey: "governance_assessment_standalone",
    productKey: "governance_assessment",
    productName: "Privacy Programme Assessment (Standalone)",
    description: "Full 10-domain privacy programme assessment, enforcement-calibrated.",
    amountCents: 4900,
    currency: "usd",
    displayPrice: "$49",
    displaySuffix: " flat",
    active: true,
  },
  li_assessment_standalone: {
    kind: "one_time",
    lookupKey: "li_assessment_standalone",
    productKey: "li_assessment",
    productName: "Legitimate Interest Assessment (Standalone)",
    description: "Full three-part LIA with enforcement calibration.",
    amountCents: 6900,
    currency: "usd",
    displayPrice: "$69",
    displaySuffix: " flat",
    active: true,
  },
  dpia_framework_standalone: {
    kind: "one_time",
    lookupKey: "dpia_framework_standalone",
    productKey: "dpia_framework",
    productName: "Impact Assessment Builder (Standalone)",
    description: "DPIA framework document for Article 35 processing.",
    amountCents: 9900,
    currency: "usd",
    displayPrice: "$99",
    displaySuffix: " flat",
    active: true,
  },
  dpa_generator_standalone: {
    kind: "one_time",
    lookupKey: "dpa_generator_standalone",
    productKey: "dpa_generator",
    productName: "Custom DPA Generator (Standalone)",
    description: "GDPR Article 28 DPA template, enforcement-calibrated.",
    amountCents: 4900,
    currency: "usd",
    displayPrice: "$49",
    displaySuffix: " flat",
    active: true,
  },
  rofa_initial_standalone: {
    kind: "one_time",
    lookupKey: "rofa_initial_standalone",
    productKey: "rofa",
    productName: "RoFA Article 30 Record — Initial Generation (Standalone)",
    description: "Populated Article 30 Record of Processing Activities.",
    amountCents: 7900,
    currency: "usd",
    displayPrice: "$79",
    displaySuffix: " flat",
    active: true,
  },
  rofa_refresh_standalone: {
    kind: "one_time",
    lookupKey: "rofa_refresh_standalone",
    productKey: "rofa",
    productName: "RoFA Article 30 Record — Annual Refresh (Standalone)",
    description: "Annual refresh of an existing Article 30 record.",
    amountCents: 3500,
    currency: "usd",
    displayPrice: "$35",
    displaySuffix: " flat",
    active: true,
  },
  cppa_risk_standalone: {
    kind: "one_time",
    lookupKey: "cppa_risk_standalone",
    productKey: "cppa_risk",
    productName: "CPPA Risk Assessment — Module 1 (Standalone)",
    description: "CPPA audit readiness risk assessment.",
    amountCents: 14900,
    currency: "usd",
    displayPrice: "$149",
    displaySuffix: " flat",
    active: true,
  },
  cppa_cybersecurity_standalone: {
    kind: "one_time",
    lookupKey: "cppa_cybersecurity_standalone",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (Standalone)",
    description: "CPPA cybersecurity audit gap analysis.",
    amountCents: 19900,
    currency: "usd",
    displayPrice: "$199",
    displaySuffix: " flat",
    active: true,
  },
  cppa_suite_standalone: {
    kind: "one_time",
    lookupKey: "cppa_suite_standalone",
    productKey: "cppa_suite",
    productName: "CPPA Full Audit Suite — Modules 1 & 2 (Standalone)",
    description: "Complete CPPA audit readiness bundle.",
    amountCents: 29900,
    currency: "usd",
    displayPrice: "$299",
    displaySuffix: " flat",
    active: true,
  },
  intelligence_only_yearly: {
    kind: "subscription",
    lookupKey: "intelligence_only_yearly",
    productKey: "intelligence",
    productName: "Intelligence — Annual",
    description: "Annual Intelligence subscription. Weekly brief, enforcement archive, watchlists. Compliance tools sold separately at standalone rates.",
    amountCents: 24900,
    currency: "usd",
    displayPrice: "$249",
    displaySuffix: "/year",
    recurringInterval: "year",
    active: true,
  },
} as const satisfies Record<string, PriceEntry>;

export type PriceLookupKey = keyof typeof PRICING_REGISTRY;

// ============================================================================
//  Helpers — use these everywhere instead of hardcoding strings
// ============================================================================

/** Get a price entry by its lookup key. Throws if missing — fail loud. */
export function getPrice<K extends PriceLookupKey>(key: K): typeof PRICING_REGISTRY[K] {
  const entry = PRICING_REGISTRY[key];
  if (!entry) throw new Error(`Unknown price lookup key: ${key}`);
  return entry;
}

/** Format an entry as a user-facing string, e.g. "$39/month". */
export function formatPrice(key: PriceLookupKey): string {
  const p = getPrice(key);
  return `${p.displayPrice}${p.displaySuffix ?? ""}`;
}

/** All entries in a product family (e.g. all "intelligence" prices). */
export function getProductPrices(productKey: string): PriceEntry[] {
  return Object.values(PRICING_REGISTRY).filter((p) => p.productKey === productKey);
}

/** All active entries — used by sync-pricing edge function. */
export function getActivePrices(): PriceEntry[] {
  return Object.values(PRICING_REGISTRY).filter((p) => p.active);
}

/** Convenience accessors for the most common copy patterns. */
export const INTELLIGENCE_PRICING = {
  monthly: () => formatPrice("intelligence_monthly"),                              // "$29/month"
  yearly: () => formatPrice("intelligence_yearly"),                                // "$399/year"
  combined: () =>
    `${formatPrice("intelligence_monthly")} or ${formatPrice("intelligence_yearly")}`,
  monthlyShort: () => `${getPrice("intelligence_monthly").displayPrice}/mo`,
  yearlyShort: () => `${getPrice("intelligence_yearly").displayPrice}/yr`,
} as const;

/** Platform pricing helpers (annual subscriptions with tool access included). */
export const PLATFORM_PRICING = {
  standard: () => formatPrice("intelligence_yearly"),                              // "$399/year"
  standardMonthly: () => "$33.25/mo",
  clientAddon: () => formatPrice("per_client_addon"),                              // "$199/year per client"
} as const;

/** US Notice price helpers — derived from the registry, never hardcode. */
export const US_NOTICE_PRICING = {
  singleStandalone: () => getPrice("us_notice_single_standalone").displayPrice,   // "$25"
  singleSubscriber: () => getPrice("us_notice_single_subscriber").displayPrice,   // "$12"
  allStatesStandalone: () => getPrice("us_notice_all_standalone").displayPrice,   // "$59"
  allStatesSubscriber: () => getPrice("us_notice_all_subscriber").displayPrice,   // "$29"
} as const;

/** EU & Global Notice price helpers — derived from the registry, never hardcode. */
export const EU_NOTICE_PRICING = {
  singleStandalone: () => getPrice("eu_notice_single_standalone").displayPrice,                       // "$45"
  singleSubscriber: () => getPrice("eu_notice_single_subscriber").displayPrice,                       // "$19"
  suiteStandalone: () => getPrice("eu_notice_suite_standalone").displayPrice,                         // "$119"
  suiteSubscriber: () => getPrice("eu_notice_suite_subscriber").displayPrice,                         // "$65"
  fullInternationalStandalone: () => getPrice("eu_notice_full_international_standalone").displayPrice, // "$229"
  fullInternationalSubscriber: () => getPrice("eu_notice_full_international_subscriber").displayPrice, // "$99"
  refreshStandalone: () => getPrice("eu_notice_refresh_standalone").displayPrice,                     // "$35"
  refreshSubscriber: () => getPrice("eu_notice_refresh_subscriber").displayPrice,                     // "$19"
} as const;

// ============================================================================
//  NEW PRICING MODEL (v7) — Coexists with legacy registry above.
//  Source of truth for the v7 redesign (Intelligence $20/mo, Professional
//  $35/mo base + $150/client/yr, per-use tools with subscriber discounts,
//  10-day Intelligence trial, 1 free tool run/month for paid tiers).
//
//  ── Migration plan ────────────────────────────────────────────────────────
//  Legacy exports above (INTELLIGENCE_PRICING, PLATFORM_PRICING, formatPrice,
//  getPrice, PRICING_REGISTRY) remain active so existing pages and edge
//  functions keep compiling. UI surfaces are being migrated to PRICING +
//  getToolPrice below over Prompts 2–5. Backend/Stripe/sync-pricing code
//  still reads the legacy registry — see "Drift log" for what is out of
//  sync and what must change before going live.
//
//  ── DRIFT LOG (v7) — must reconcile before live Stripe go-live ────────────
//  UI (v7 PRICING)                       vs.  Legacy registry / backend
//  -------------------------------------------------------------------------
//  Intelligence monthly      $20/mo      vs.  intelligence_monthly      $29
//  Intelligence annual       $180/yr     vs.  intelligence_only_yearly  $249
//  Professional base         $35/mo      vs.  (no legacy equivalent — was Platform $399/yr)
//  Professional per-client   $150/yr     vs.  per_client_addon          $199
//  Intelligence trial        10 days     vs.  (none — Stripe checkout has no trial)
//  Free tool run / month     1 (paid)    vs.  (none — no usage tracking)
//  Tool: Biometric           $10         vs.  biometric_checker_standalone  $49
//  Tool: IR Playbook         $20         vs.  ir_playbook_standalone        $59
//  Tool: LIA                 $30         vs.  li_assessment_standalone      $69
//  Tool: US Notice (single)  $30         vs.  us_notice_single_standalone   $25
//  Tool: DPIA                $40         vs.  dpia_framework_standalone     $99
//  Tool: DPA                 $40         vs.  dpa_generator_standalone      $49
//  Tool: RoPA/RoFA           $40         vs.  rofa_initial_standalone       $79
//  Tool: EU Notice (single)  $50         vs.  eu_notice_single_standalone   $45
//  Tool: Registration        $50         vs.  (no legacy equivalent)
//  Tool: Governance          $50         vs.  governance_assessment_standalone $49
//  Tool: CPPA Risk           $60         vs.  cppa_risk_standalone          $149
//  Tool: CPPA Cyber          $80         vs.  cppa_cybersecurity_standalone $199
//  Tool: CPPA Scope          Free        vs.  (no legacy entry)
//
//  Subscriber-tier tool discounts: legacy registry has per-tool subscriber
//  prices (e.g. us_notice_single_subscriber $12). v7 replaces these with
//  uniform percentage discounts (Intelligence 20%, Professional 25%).
//
//  Stripe Price IDs in v7 are placeholders. Katherine must create new
//  Stripe Price objects (see "STRIPE NOTE" in the v7 spec doc) and replace
//  every REPLACE_WITH_STRIPE_PRICE_ID_* below before going live. Archive,
//  do not delete, the legacy $29 / $399 / $249 / $199 Stripe prices.
// ============================================================================

export const PRICING = {
  intelligence: {
    monthly: {
      display: '$20',
      dollars: 20,
      cents: 2000,
      label: 'month',
      stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_INTEL_MONTHLY',
    },
    annual: {
      display: '$180',
      dollars: 180,
      cents: 18000,
      label: 'year',
      savingDisplay: 'Save $60 — 3 months free',
      stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_INTEL_ANNUAL',
    },
    trialDays: 10,
    freeToolRunsPerMonth: 1,
    toolDiscount: 0.20,
  },
  professional: {
    base: {
      display: '$35',
      dollars: 35,
      cents: 3500,
      label: 'month',
      stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_PRO_MONTHLY',
    },
    perClient: {
      display: '$150',
      dollars: 150,
      cents: 15000,
      label: 'client/year',
      stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_PRO_CLIENT_ANNUAL',
    },
    freeToolRunsPerMonth: 1,
    toolDiscount: 0.25,
    teamLoginsIncluded: 3,
    additionalLoginMonthly: 10,
  },
  tools: {
    cppaScope:    { name: 'CPPA Scope Checker',                 dollars: 0,  display: 'Free', stripePriceId: null },
    biometric:    { name: 'Biometric Compliance Check',         dollars: 10, display: '$10',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_BIOMETRIC' },
    irPlaybook:   { name: 'Breach IR Playbook',                 dollars: 20, display: '$20',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_IR' },
    lia:          { name: 'Legitimate Interest Assessment',     dollars: 30, display: '$30',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_LIA' },
    usNotice:     { name: 'US Privacy Notice Builder',          dollars: 30, display: '$30',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_US_NOTICE' },
    dpia:         { name: 'Data Protection Impact Assessment',  dollars: 40, display: '$40',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_DPIA' },
    dpa:          { name: 'Custom DPA Generator',               dollars: 40, display: '$40',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_DPA' },
    ropa:         { name: 'RoPA Builder',                       dollars: 40, display: '$40',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_ROPA' },
    euNotice:     { name: 'EU / Global Privacy Notice Builder', dollars: 50, display: '$50',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_EU_NOTICE' },
    registration: { name: 'Registration Filings',               dollars: 50, display: '$50',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_REGISTRATION' },
    governance:   { name: 'Privacy Program Assessment',         dollars: 50, display: '$50',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_GOVERNANCE' },
    cppaRisk:     { name: 'CPPA Risk Assessment',               dollars: 60, display: '$60',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_CPPA_RISK' },
    cppaCyber:    { name: 'CPPA Cybersecurity Readiness',       dollars: 80, display: '$80',  stripePriceId: 'REPLACE_WITH_STRIPE_PRICE_ID_CPPA_CYBER' },
  },
} as const;

export type ToolKey = keyof typeof PRICING.tools;
export type SubscriptionTier = 'anonymous' | 'free' | 'intelligence' | 'professional';

export function getToolPrice(toolKey: ToolKey, tier: SubscriptionTier): number {
  const tool = PRICING.tools[toolKey];
  if (tool.dollars === 0) return 0;
  if (tier === 'intelligence') return Math.round(tool.dollars * (1 - PRICING.intelligence.toolDiscount));
  if (tier === 'professional') return Math.round(tool.dollars * (1 - PRICING.professional.toolDiscount));
  return tool.dollars;
}

export function getToolPriceDisplay(toolKey: ToolKey, tier: SubscriptionTier): string {
  const price = getToolPrice(toolKey, tier);
  return price === 0 ? 'Free' : `$${price}`;
}
