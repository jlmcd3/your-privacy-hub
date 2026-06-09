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
      "Monthly Intelligence subscription. Daily privacy intelligence feed, weekly Intelligence Brief, AI investigation prompts. Compliance tools sold separately at standalone rates.",
    amountCents: 2000,
    currency: "usd",
    displayPrice: "$20",
    displaySuffix: "/month",
    recurringInterval: "month",
    active: true,
  },
  intelligence_annual: {
    kind: "subscription",
    lookupKey: "intelligence_annual",
    productKey: "intelligence",
    productName: "Intelligence — Annual",
    description:
      "Annual Intelligence subscription. Save $40 — pay for 10 months, get 12.",
    amountCents: 20000,
    currency: "usd",
    displayPrice: "$200",
    displaySuffix: "/year",
    recurringInterval: "year",
    active: true,
  },
  // Legacy alias retained so existing edge functions / Stripe lookup keys keep resolving.
  intelligence_yearly: {
    kind: "subscription",
    lookupKey: "intelligence_yearly",
    productKey: "intelligence",
    productName: "Intelligence — Annual (legacy alias)",
    description:
      "Legacy lookup key. Mirrors intelligence_annual at the new $200/yr price.",
    amountCents: 20000,
    currency: "usd",
    displayPrice: "$200",
    displaySuffix: "/year",
    recurringInterval: "year",
    active: true,
  },
  intelligence_yearly_founding: {
    kind: "subscription",
    lookupKey: "intelligence_yearly_founding",
    productKey: "intelligence",
    productName: "Intelligence — Annual (Founding alias)",
    description:
      "Retained for backwards-compatibility. Founding subscriber discount is now applied at tool checkout, not on the subscription.",
    amountCents: 20000,
    currency: "usd",
    displayPrice: "$200",
    displaySuffix: "/year",
    recurringInterval: "year",
    active: false,
  },
  professional_monthly: {
    kind: "subscription",
    lookupKey: "professional_monthly",
    productKey: "professional",
    productName: "Professional — Monthly",
    description:
      "Monthly Professional subscription. Everything in Intelligence plus 3 seats. Annual subscription required to activate client management.",
    amountCents: 3500,
    currency: "usd",
    displayPrice: "$35",
    displaySuffix: "/month",
    recurringInterval: "month",
    active: true,
  },
  professional_annual: {
    kind: "subscription",
    lookupKey: "professional_annual",
    productKey: "professional",
    productName: "Professional — Annual",
    description:
      "Annual Professional subscription. Save $70 — pay for 10 months, get 12. Unlocks client/matter workspace, branded outputs, and 1 free Convenience Tool run per client per month.",
    amountCents: 35000,
    currency: "usd",
    displayPrice: "$350",
    displaySuffix: "/year",
    recurringInterval: "year",
    active: true,
  },
  professional_client: {
    kind: "addon",
    lookupKey: "professional_client",
    productKey: "professional",
    productName: "Professional — Per-Client (Annual)",
    description:
      "Additional client workspace for Professional annual subscribers.",
    amountCents: 15000,
    currency: "usd",
    displayPrice: "$150",
    displaySuffix: "/client/year",
    parentLookupKey: "professional_annual",
    addonReason: "multi_client",
    active: true,
  },
  per_client_addon: {
    kind: "addon",
    lookupKey: "per_client_addon",
    productKey: "professional",
    productName: "Per-Client Add-On (legacy alias)",
    description:
      "Legacy alias for professional_client. Annual Professional subscription required.",
    amountCents: 15000,
    currency: "usd",
    displayPrice: "$150",
    displaySuffix: "/client/year",
    parentLookupKey: "professional_annual",
    addonReason: "multi_client",
    active: true,
  },

  // ── US Privacy Notice — per-state ──────────────────────────────────────
  // NOTE: The legacy v7-and-earlier per-variant lookup keys
  // (us_notice_single_*, us_notice_all_*, eu_notice_single_*, eu_notice_suite_*,
  // eu_notice_full_international_*, eu_notice_refresh_*, ir_playbook_standalone,
  // biometric_checker_standalone, governance_assessment_standalone,
  // li_assessment_standalone, dpia_framework_standalone, dpa_generator_standalone,
  // rofa_initial_standalone, rofa_refresh_standalone, cppa_cybersecurity_standalone,
  // intelligence_only_yearly) have been removed. The v8 model uses a single
  // uniform lookup key per tool (see the v8 block below) and the sync-pricing
  // edge function's REGISTRY_SNAPSHOT is the source of truth for Stripe.

  // ── v8 per-use tool prices (May 2026 pricing memo) ────────────────────
  // Standalone = full per-use price for every tier. There is NO permanent
  // structural subscriber discount under the v8 model. The only discount
  // is the founding-subscriber promotion (20% off Smart Tools, 15% off
  // Convenience Tools) — applied in-app via foundingPrice() at checkout
  // for users with profiles.founding_subscriber = true.
  //
  // The "_subscriber" entries below are retained as Stripe lookup keys so
  // that founding subscribers can be billed via a pre-resolved Price
  // object; their amounts mirror the founding rate, not the deprecated
  // 25% Professional rate.
  hc_standalone_v2: {
    kind: "one_time",
    lookupKey: "hc_standalone_v2",
    productKey: "governance_v8",
    productName: "Privacy Program Assessment (Standalone)",
    description: "Standalone per-use price for the Privacy Program Assessment Tool.",
    amountCents: 8900,
    currency: "usd",
    displayPrice: "$89",
    displaySuffix: " flat",
    active: true,
  },
  hc_subscriber_v2: {
    kind: "addon",
    lookupKey: "hc_subscriber_v2",
    productKey: "governance_v8",
    productName: "Privacy Program Assessment (Subscriber)",
    description: "Subscriber per-use price for the Privacy Program Assessment Tool.",
    amountCents: 2500,
    currency: "usd",
    displayPrice: "$25",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_discount",
    active: true,
  },
  li_standalone_v2: {
    kind: "one_time",
    lookupKey: "li_standalone_v2",
    productKey: "lia_v8",
    productName: "Legitimate Interest Assessment (Standalone)",
    description: "Standalone per-use price for the LIA Tool.",
    amountCents: 6900,
    currency: "usd",
    displayPrice: "$69",
    displaySuffix: " flat",
    active: true,
  },
  li_subscriber_v2: {
    kind: "addon",
    lookupKey: "li_subscriber_v2",
    productKey: "lia_v8",
    productName: "Legitimate Interest Assessment (Subscriber)",
    description: "Subscriber per-use price for the LIA Tool.",
    amountCents: 3500,
    currency: "usd",
    displayPrice: "$35",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_discount",
    active: true,
  },
  dpia_standalone_v2: {
    kind: "one_time",
    lookupKey: "dpia_standalone_v2",
    productKey: "dpia_v8",
    productName: "Impact Assessment Builder (Standalone)",
    description: "Standalone per-use price for the DPIA Tool.",
    amountCents: 7900,
    currency: "usd",
    displayPrice: "$79",
    displaySuffix: " flat",
    active: true,
  },
  dpia_subscriber_v2: {
    kind: "addon",
    lookupKey: "dpia_subscriber_v2",
    productKey: "dpia_v8",
    productName: "Impact Assessment Builder (Subscriber)",
    description: "Subscriber per-use price for the DPIA Tool.",
    amountCents: 4900,
    currency: "usd",
    displayPrice: "$49",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_discount",
    active: true,
  },
  dpa_standalone_v2: {
    kind: "one_time",
    lookupKey: "dpa_standalone_v2",
    productKey: "dpa_v8",
    productName: "Custom DPA Generator (Standalone)",
    description: "Standalone per-use price for the DPA Generator.",
    amountCents: 4900,
    currency: "usd",
    displayPrice: "$49",
    displaySuffix: " flat",
    active: true,
  },
  dpa_subscriber_v2: {
    kind: "addon",
    lookupKey: "dpa_subscriber_v2",
    productKey: "dpa_v8",
    productName: "Custom DPA Generator (Subscriber)",
    description: "Free for subscribers — bypasses Stripe checkout.",
    amountCents: 0,
    currency: "usd",
    displayPrice: "Free",
    displaySuffix: "",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_free",
    active: true,
  },
  ir_standalone_v2: {
    kind: "one_time",
    lookupKey: "ir_standalone_v2",
    productKey: "ir_v8",
    productName: "Incident Response Playbook (Standalone)",
    description: "Standalone per-use price for the Incident Response Playbook.",
    amountCents: 5900,
    currency: "usd",
    displayPrice: "$59",
    displaySuffix: " flat",
    active: true,
  },
  ir_subscriber_v2: {
    kind: "addon",
    lookupKey: "ir_subscriber_v2",
    productKey: "ir_v8",
    productName: "Incident Response Playbook (Subscriber)",
    description: "Free for subscribers — bypasses Stripe checkout.",
    amountCents: 0,
    currency: "usd",
    displayPrice: "Free",
    displaySuffix: "",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_free",
    active: true,
  },
  biometric_standalone_v2: {
    kind: "one_time",
    lookupKey: "biometric_standalone_v2",
    productKey: "biometric_v8",
    productName: "Biometric Compliance Check (Standalone)",
    description: "Standalone per-use price for the Biometric Compliance Check.",
    amountCents: 4900,
    currency: "usd",
    displayPrice: "$49",
    displaySuffix: " flat",
    active: true,
  },
  biometric_subscriber_v2: {
    kind: "addon",
    lookupKey: "biometric_subscriber_v2",
    productKey: "biometric_v8",
    productName: "Biometric Compliance Check (Subscriber)",
    description: "Free for subscribers — bypasses Stripe checkout.",
    amountCents: 0,
    currency: "usd",
    displayPrice: "Free",
    displaySuffix: "",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_free",
    active: true,
  },
  ropa_initial_standalone: {
    kind: "one_time",
    lookupKey: "ropa_initial_standalone",
    productKey: "rofa",
    productName: "RoPA Builder — Initial Generation (Standalone — RETIRED)",
    description: "Retired: RoPA Builder is subscriber-only. Not sold standalone.",
    amountCents: 7900,
    currency: "usd",
    displayPrice: "$79",
    displaySuffix: " flat",
    active: false,
  },
  ropa_refresh_standalone: {
    kind: "one_time",
    lookupKey: "ropa_refresh_standalone",
    productKey: "rofa",
    productName: "RoPA Builder — Annual Refresh (Standalone — RETIRED)",
    description: "Retired: RoPA Builder is subscriber-only. Not sold standalone.",
    amountCents: 7900,
    currency: "usd",
    displayPrice: "$79",
    displaySuffix: " flat",
    active: false,
  },
  ropa_initial_subscriber: {
    kind: "addon",
    lookupKey: "ropa_initial_subscriber",
    productKey: "rofa",
    productName: "RoPA Builder — Initial (Subscriber)",
    description: "Free for subscribers (monthly + annual) — bypasses Stripe checkout.",
    amountCents: 0,
    currency: "usd",
    displayPrice: "Free",
    displaySuffix: "",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_free",
    active: true,
  },
  ropa_refresh_subscriber: {
    kind: "addon",
    lookupKey: "ropa_refresh_subscriber",
    productKey: "rofa",
    productName: "RoPA Builder — Annual Refresh (Subscriber)",
    description: "Free for subscribers (monthly + annual) — bypasses Stripe checkout.",
    amountCents: 0,
    currency: "usd",
    displayPrice: "Free",
    displaySuffix: "",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_free",
    active: true,
  },
  us_notice_v7_standalone: {
    kind: "one_time",
    lookupKey: "us_notice_v7_standalone",
    productKey: "us_notice_v8",
    productName: "US Privacy Notice Builder (Standalone — RETIRED)",
    description: "Retired: US Privacy Notice Builder is subscriber-only. Not sold standalone.",
    amountCents: 2500,
    currency: "usd",
    displayPrice: "$25",
    displaySuffix: " flat",
    active: false,
  },
  us_notice_v7_subscriber: {
    kind: "addon",
    lookupKey: "us_notice_v7_subscriber",
    productKey: "us_notice_v8",
    productName: "US Privacy Notice Builder (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for any US notice variant.",
    amountCents: 2000,
    currency: "usd",
    displayPrice: "$20",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: false,
  },
  eu_notice_v7_standalone: {
    kind: "one_time",
    lookupKey: "eu_notice_v7_standalone",
    productKey: "eu_notice_v8",
    productName: "EU & Global Privacy Notice Builder (Standalone — RETIRED)",
    description: "Retired: EU & Global Privacy Notice Builder is subscriber-only. Not sold standalone.",
    amountCents: 4000,
    currency: "usd",
    displayPrice: "$40",
    displaySuffix: " flat",
    active: false,
  },
  eu_notice_v7_subscriber: {
    kind: "addon",
    lookupKey: "eu_notice_v7_subscriber",
    productKey: "eu_notice_v8",
    productName: "EU & Global Privacy Notice Builder (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for any EU/global notice variant.",
    amountCents: 3000,
    currency: "usd",
    displayPrice: "$30",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: false,
  },
  cppa_risk_subscriber: {
    kind: "addon",
    lookupKey: "cppa_risk_subscriber",
    productKey: "cppa_risk",
    productName: "CPPA Risk Assessment — Module 1 (Subscriber)",
    description: "Subscriber per-use price for the CPPA Risk Assessment.",
    amountCents: 7900,
    currency: "usd",
    displayPrice: "$79",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_discount",
    active: true,
  },
  cppa_risk_standalone: {
    kind: "one_time",
    lookupKey: "cppa_risk_standalone",
    productKey: "cppa_risk",
    productName: "CPPA Risk Assessment — Module 1 (Standalone)",
    description: "Standalone per-use price for the CPPA Risk Assessment.",
    amountCents: 8900,
    currency: "usd",
    displayPrice: "$89",
    displaySuffix: " flat",
    active: true,
  },
  cppa_suite_standalone: {
    kind: "one_time",
    lookupKey: "cppa_suite_standalone",
    productKey: "cppa_suite",
    productName: "CPPA Full Audit Suite — Modules 1 & 2 (Standalone)",
    description: "Complete CPPA audit readiness bundle. Save $19 vs buying modules separately.",
    amountCents: 16900,
    currency: "usd",
    displayPrice: "$169",
    displaySuffix: " flat",
    active: true,
  },
  cppa_cyber_standalone: {
    kind: "one_time",
    lookupKey: "cppa_cyber_standalone",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (Standalone)",
    description: "Standalone per-use price for the CPPA Cybersecurity Readiness assessment.",
    amountCents: 9900,
    currency: "usd",
    displayPrice: "$99",
    displaySuffix: " flat",
    active: true,
  },
  cppa_cyber_subscriber: {
    kind: "addon",
    lookupKey: "cppa_cyber_subscriber",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (Subscriber)",
    description: "Subscriber per-use price for the CPPA Cybersecurity Readiness assessment.",
    amountCents: 8900,
    currency: "usd",
    displayPrice: "$89",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_discount",
    active: true,
  },
  cppa_suite_subscriber: {
    kind: "addon",
    lookupKey: "cppa_suite_subscriber",
    productKey: "cppa_suite",
    productName: "CPPA Full Audit Suite — Modules 1 & 2 (Subscriber)",
    description: "Subscriber per-use price for the CPPA Full Audit Suite.",
    amountCents: 14900,
    currency: "usd",
    displayPrice: "$149",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_discount",
    active: true,
  },
  registration_standalone: {
    kind: "one_time",
    lookupKey: "registration_standalone",
    productKey: "registration",
    productName: "Registration Filings — DIY Toolkit (Standalone)",
    description: "Flat per-filing price for the DPO / DPA / AI Act registration document pack. One price regardless of jurisdiction count.",
    amountCents: 4500,
    currency: "usd",
    displayPrice: "$45",
    displaySuffix: " flat",
    active: true,
  },
  registration_subscriber: {
    kind: "addon",
    lookupKey: "registration_subscriber",
    productKey: "registration",
    productName: "Registration Filings — DIY Toolkit (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the DPO / DPA / AI Act registration document pack.",
    amountCents: 4500,
    currency: "usd",
    displayPrice: "$45",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
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
  monthly: () => formatPrice("intelligence_monthly"),                              // "$20/month"
  yearly: () => formatPrice("intelligence_yearly"),                                // "$200/year"
  combined: () =>
    `${formatPrice("intelligence_monthly")} or ${formatPrice("intelligence_yearly")}`,
  monthlyShort: () => `${getPrice("intelligence_monthly").displayPrice}/mo`,
  yearlyShort: () => `${getPrice("intelligence_yearly").displayPrice}/yr`,
} as const;

/** Platform pricing helpers (annual subscriptions). */
export const PLATFORM_PRICING = {
  standard: () => formatPrice("professional_annual"),                              // "$350/year"
  standardMonthly: () => formatPrice("professional_monthly"),                      // "$35/month"
  clientAddon: () => formatPrice("professional_client"),                           // "$150/client/year"
} as const;

/** US Notice price helpers — v8 model uses uniform pricing across all variants. */
export const US_NOTICE_PRICING = {
  singleStandalone: () => getPrice("us_notice_v7_standalone").displayPrice,
  singleSubscriber: () => getPrice("us_notice_v7_subscriber").displayPrice,
  allStatesStandalone: () => getPrice("us_notice_v7_standalone").displayPrice,
  allStatesSubscriber: () => getPrice("us_notice_v7_subscriber").displayPrice,
} as const;

/** EU & Global Notice price helpers — v8 model uses uniform pricing across all variants. */
export const EU_NOTICE_PRICING = {
  singleStandalone: () => getPrice("eu_notice_v7_standalone").displayPrice,
  singleSubscriber: () => getPrice("eu_notice_v7_subscriber").displayPrice,
  suiteStandalone: () => getPrice("eu_notice_v7_standalone").displayPrice,
  suiteSubscriber: () => getPrice("eu_notice_v7_subscriber").displayPrice,
  fullInternationalStandalone: () => getPrice("eu_notice_v7_standalone").displayPrice,
  fullInternationalSubscriber: () => getPrice("eu_notice_v7_subscriber").displayPrice,
  refreshStandalone: () => getPrice("eu_notice_v7_standalone").displayPrice,
  refreshSubscriber: () => getPrice("eu_notice_v7_subscriber").displayPrice,
} as const;

// ============================================================================
//  v8 DRIFT LOG — subscriber-only tools (2026-06-05)
//  ──────────────────────────────────────────────────────────────────────────
//  RoPA Builder, US Privacy Notice Builder, and EU & Global Privacy Notice
//  Builder are SUBSCRIBER-ONLY. They are included with any active Intelligence
//  or Professional subscription (monthly or annual) and are NEVER sold
//  standalone. In this file:
//    - PRICING.tools.ropa / us_notice / eu_notice → dollars: 0,
//      display: "Included with subscription", stripePriceId: null
//    - PRICING_REGISTRY.ropa_initial_standalone / ropa_refresh_standalone /
//      us_notice_v7_standalone / eu_notice_v7_standalone → active: false
//    - SUBSCRIBER_ONLY_TOOL_KEYS lists them; they are excluded from
//      CONVENIENCE_TOOL_KEYS and from the free-run pool accounting.
//    - isToolFreeForTier() returns true for these tools for any active
//      subscription tier; false for free / anonymous users.
// ============================================================================

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
//  ── UI MIGRATION STATUS (as of 2026-05-18) ───────────────────────────────
//  Migrated to v7 strings: Subscribe, SubscribeSuccess, Index, Login, FAQ,
//    About, BiometricChecker, HomepagePricingStrip, SearchFirstHero,
//    Tools (PRICING_GRID + per-tool subscriberPrice/standalonePrice),
//    ProToolsBanner, GovernanceAssessment header CTA,
//    RegistrationLanding (flat $50/filing replaces $59/$149/$275/$499 +
//    $399 Counsel-Ready + EU/AI bundles + $79 renewal monitoring),
//    Dashboard (10-day trial countdown banner added),
//    useToolPrice (drives every tool intake page header/CTA price label —
//    LIA, DPIA, DPA, IR Playbook, RoPA, EU/US Notice reviews, Governance,
//    CPPA Risk/Cyber/Suite). Hook now reads PRICING.tools as the single
//    source of truth and applies tier discounts via getToolPrice:
//      Professional (annual / annual_founding) → 25% off (subscriberPrice).
//      Intelligence (monthly)                  → 20% off.
//      Free / anonymous                        → standalone.
//    No tool is "included free" under v7 — every intake page charges
//    per-use. Free monthly run is handled separately by ToolPricingCTA /
//    checkFreeToolRun.
//  Reconciled to v7 fallback (2026-05-18): create-tool-checkout and
//    get-tool-price edge functions now carry v7 cents in their TOOLS
//    fallback tables AND apply per-tier discounts directly:
//      Professional (annual/annual_founding) → subscriber rate (25% off).
//      Intelligence (monthly)                → 20% off standalone (computed).
//      Free / anonymous                      → standalone.
//    The "tool_included" 409 gate is removed — every tool is per-use under
//    v7. Stripe Price IDs at the lookup keys below are still legacy until
//    Katherine creates the v7 Price objects; until then the edge functions
//    will charge the v7 fallback cents via price_data fallback. Once the
//    new Stripe prices are in place at the same lookup keys, resolved
//    Stripe prices will take precedence automatically.
//  Still references legacy registry: create-checkout-session, sync-pricing,
//    ToolSampleOverlay, ToolCheckoutModal, useToolAccess — these read the
//    legacy subscription/per-tool prices and must still be migrated before
//    flipping the new Stripe Price IDs live for subscription products.
//  ─────────────────────────────────────────────────────────────────────────
//  UI (v7 PRICING)                       vs.  Legacy registry / backend
//  -------------------------------------------------------------------------
//  Intelligence monthly      $20/mo
//  Intelligence annual       $200/yr
//  Professional base         $30/mo
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
      stripePriceId: 'intelligence_monthly',
    },
    annual: {
      display: '$200',
      dollars: 200,
      cents: 20000,
      label: 'year',
      savingDisplay: 'Save $40 — pay for 10 months, get 12',
      stripePriceId: 'intelligence_annual',
    },
    trialDays: 10,
    freeToolRunsPerMonth: 0,
  },
  professional: {
    monthly: {
      display: '$35',
      dollars: 35,
      cents: 3500,
      label: 'month',
      stripePriceId: 'professional_monthly',
    },
    annual: {
      display: '$350',
      dollars: 350,
      cents: 35000,
      label: 'year',
      savingDisplay: 'Save $70 — pay for 10 months, get 12',
      note: 'Annual subscription required to activate client management',
      stripePriceId: 'professional_annual',
    },
    perClient: {
      display: '$150',
      dollars: 150,
      cents: 15000,
      label: 'client/year',
      stripePriceId: 'professional_client',
    },
    // Legacy alias — some UI still reads `.base`.
    base: {
      display: '$35',
      dollars: 35,
      cents: 3500,
      label: 'month',
      stripePriceId: 'professional_monthly',
    },
    freeToolRunsPerMonth: 1, // annual only — see freeConvenienceRun.ts
    teamLoginsIncluded: 3,
    additionalLoginMonthly: 10,
  },
  tools: {
    cppa_scope:   { name: 'CPPA Scope Checker',                 dollars: 0,   display: 'Free', stripePriceId: null },
    biometric:    { name: 'Biometric Compliance Check',         dollars: 49,  display: '$49',  stripePriceId: 'biometric_standalone_v2' },
    ir_playbook:  { name: 'Breach IR Playbook',                 dollars: 59,  display: '$59',  stripePriceId: 'ir_standalone_v2' },
    lia:          { name: 'Legitimate Interest Assessment',     dollars: 69,  display: '$69',  stripePriceId: 'li_standalone_v2' },
    us_notice:    { name: 'US Privacy Notice Builder',          dollars: 0,   display: 'Included with subscription', stripePriceId: null },
    dpia:         { name: 'Data Protection Impact Assessment',  dollars: 79,  display: '$79',  stripePriceId: 'dpia_standalone_v2' },
    dpa:          { name: 'Custom DPA Generator',               dollars: 49,  display: '$49',  stripePriceId: 'dpa_standalone_v2' },
    ropa:         { name: 'RoPA Builder',                       dollars: 0,   display: 'Included with subscription', stripePriceId: null },
    eu_notice:    { name: 'EU / Global Privacy Notice Builder', dollars: 0,   display: 'Included with subscription', stripePriceId: null },
    registration: { name: 'Registration Filings',               dollars: 45,  display: '$45',  stripePriceId: 'registration_standalone' },
    governance:   { name: 'Privacy Program Assessment',         dollars: 89,  display: '$89',  stripePriceId: 'hc_standalone_v2' },
    cppa_risk:    { name: 'CPPA Risk Assessment',               dollars: 89,  display: '$89',  stripePriceId: 'cppa_risk_standalone' },
    cppa_cyber:   { name: 'CPPA Cybersecurity Readiness',       dollars: 99,  display: '$99',  stripePriceId: 'cppa_cyber_standalone' },
    cppa_suite:   { name: 'CPPA Full Audit Suite',              dollars: 169, display: '$169', stripePriceId: 'cppa_suite_standalone' },

    // ── Legacy camelCase aliases (kept so existing imports keep compiling) ──
    cppaScope:    { name: 'CPPA Scope Checker',                 dollars: 0,   display: 'Free', stripePriceId: null },
    irPlaybook:   { name: 'Breach IR Playbook',                 dollars: 59,  display: '$59',  stripePriceId: 'ir_standalone_v2' },
    usNotice:     { name: 'US Privacy Notice Builder',          dollars: 0,   display: 'Included with subscription', stripePriceId: null },
    euNotice:     { name: 'EU / Global Privacy Notice Builder', dollars: 0,   display: 'Included with subscription', stripePriceId: null },
    cppaRisk:     { name: 'CPPA Risk Assessment',               dollars: 89,  display: '$89',  stripePriceId: 'cppa_risk_standalone' },
    cppaCyber:    { name: 'CPPA Cybersecurity Readiness',       dollars: 99,  display: '$99',  stripePriceId: 'cppa_cyber_standalone' },
    cppaSuite:    { name: 'CPPA Full Audit Suite',              dollars: 169, display: '$169', stripePriceId: 'cppa_suite_standalone' },
  },
} as const;

export type ToolKey = keyof typeof PRICING.tools;
export type SubscriptionTier = 'anonymous' | 'free' | 'intelligence' | 'professional';

/**
 * Monthly free Convenience Tool run pool sizes by subscription tier.
 * Pools reset on the 1st of each calendar month. No carry-over.
 * Smart Tools are NEVER pool-eligible — isConvenienceTool() gates eligibility.
 *
 * Canonical tier keys: free | intel_monthly | intel_annual | pro_monthly | pro_annual.
 * Legacy single-value aliases (monthly / annual / annual_founding / intelligence /
 * professional / *_monthly / *_annual longhand) are mapped here so older callers
 * keep resolving without conditional logic at every call site.
 */
export const FREE_RUN_POOL_SIZES: Record<string, number> = {
  free:                 0,
  intel_monthly:        1,
  intel_annual:         5,
  pro_monthly:          3,
  pro_annual:          10,
  // ── Legacy aliases ───────────────────────────────────────────────────
  annual:               5,   // → intel_annual
  annual_founding:      5,   // → intel_annual
  monthly:              1,   // → intel_monthly
  intelligence:         1,   // → intel_monthly
  professional:        10,   // → pro_annual
  intelligence_monthly: 1,
  intelligence_annual:  5,
  professional_monthly: 3,
  professional_annual: 10,
};

/** Returns the free-run pool size for a tier string. 0 = not eligible. */
export function getFreeRunPoolSize(tier: string | null | undefined): number {
  if (!tier) return 0;
  return FREE_RUN_POOL_SIZES[tier] ?? 0;
}

/**
 * v8 model — every tier pays the standalone per-use tool price.
 * Subscriber discounts no longer exist; Convenience-Tool affordability is
 * delivered via the monthly free-run pool (see FREE_RUN_POOL_SIZES).
 */
export function getToolPrice(toolKey: ToolKey, _tier?: string): number {
  return PRICING.tools[toolKey].dollars;
}

export function getToolPriceDisplay(toolKey: ToolKey, _tier?: string): string {
  const price = PRICING.tools[toolKey].dollars;
  return price === 0 ? 'Free' : `$${price}`;
}

/**
 * A tool is "free" for a tier iff:
 *  - it is a Subscriber-Only tool (RoPA / US Notice / EU Notice) AND the
 *    tier is any active subscription (non-zero free-run pool), OR
 *  - it is a Convenience Tool AND the tier has a non-zero free-run pool.
 * Smart Tools are never pool-eligible. Free / anonymous users get nothing.
 *
 * IMPORTANT: This function has no knowledge of trial status. Callers that
 * need to enforce trial restrictions should read `granularTier` from
 * `useSubscriptionTier` — it already collapses to `"free"` during a trial,
 * so passing it here yields the correct (no-access) result automatically.
 * Do not pass a raw `subscription_type` string from `profiles` without
 * the trial override applied.
 */
export function isToolFreeForTier(toolKey: string, tier?: string): boolean {
  if (!tier) return false;
  // v9: any active subscription gets Layer-1 included tools free.
  // Pool-size check kept until 0.6 cleanup so deprecated callers still compile.
  const hasSubscription = getFreeRunPoolSize(tier) > 0;
  if (!hasSubscription) return false;
  return isIncludedTool(toolKey) || isSubscriberOnlyTool(toolKey);
}

/**
 * The monthly free-run pool for the tier (replaces the legacy per-tool
 * "abuse cap"). Returns null for tiers with no pool.
 */
export function getToolMonthlyCapLimit(_toolKey: string, tier?: string): number | null {
  if (!tier) return null;
  const pool = getFreeRunPoolSize(tier);
  return pool > 0 ? pool : null;
}

// ── TOOL CLASSIFICATION ───────────────────────────────────────────────────

/**
 * SMART TOOLS — enforcement-calibrated, multi-stage reasoning against the
 * enforcement corpus. Methodology reviewed by qualified privacy counsel.
 * Cannot be replicated by prompting a general AI.
 * Never eligible for free monthly runs.
 */
export const SMART_TOOL_KEYS = [
  'governance',   // Privacy Program Assessment — 10-domain scoring
  'lia',          // Legitimate Interest Assessment — 3-part enforcement test
  'dpia',         // DPIA — necessity/proportionality vs enforcement corpus
  'cppa_risk',    // CPPA Risk Assessment — 5-stage CPPA analysis
  'cppa_cyber',   // CPPA Cybersecurity — 18-control gap analysis
  // v9: 'dpa' and 'biometric' moved to Layer 1 (included with subscription).
] as const;

export type SmartToolKey = typeof SMART_TOOL_KEYS[number];

/**
 * @deprecated v9 — removed in cleanup; do not add callers.
 * CONVENIENCE TOOLS — document generators. Valuable time-savers.
 * Professional annual subscribers receive 1 free run per client per month.
 *
 * NOTE: RoPA Builder, US Privacy Notice Builder, and EU/Global Privacy
 * Notice Builder are SUBSCRIBER-ONLY (never sold standalone and never
 * eligible for the free-run pool — they are always included with any
 * active subscription). They are deliberately excluded from this list.
 */
export const CONVENIENCE_TOOL_KEYS = [
  'ir_playbook',  // IR Playbook — structured notification timelines
  'registration', // Registration Filings — DPO/AI Act registration docs
] as const;

export type ConvenienceToolKey = typeof CONVENIENCE_TOOL_KEYS[number];

/** Always free — CPPA Scope Checker */
export const FREE_TOOL_KEYS = ['cppa_scope'] as const;

/**
 * Subscriber-only tools: included with any active Intelligence/Professional
 * subscription (monthly or annual). Never sold standalone, never pool-eligible.
 * Free / anonymous users have no access.
 */
export const SUBSCRIBER_ONLY_TOOL_KEYS = [
  'ropa',
  'us_notice',
  'eu_notice',
] as const;
export type SubscriberOnlyToolKey = typeof SUBSCRIBER_ONLY_TOOL_KEYS[number];

// camelCase aliases for the same tool keys (so callers using either form work)
const SMART_TOOL_CAMEL = new Set(['governance','lia','dpia','cppaRisk','cppaCyber']);
/** @deprecated v9 — removed in cleanup; do not add callers */
const CONVENIENCE_TOOL_CAMEL = new Set(['irPlaybook','registration']);
const SUBSCRIBER_ONLY_TOOL_CAMEL = new Set(['ropa','usNotice','euNotice']);

/** Returns true if the tool requires a subscription (not sold standalone). */
export function isSubscriberOnlyTool(toolKey: string): boolean {
  return (SUBSCRIBER_ONLY_TOOL_KEYS as readonly string[]).includes(toolKey) || SUBSCRIBER_ONLY_TOOL_CAMEL.has(toolKey);
}

/** Returns true if the tool uses multi-stage enforcement-corpus reasoning */
export function isSmartTool(toolKey: string): boolean {
  return (SMART_TOOL_KEYS as readonly string[]).includes(toolKey) || SMART_TOOL_CAMEL.has(toolKey);
}

/** @deprecated v9 — removed in cleanup; do not add callers. Returns true if the tool is eligible for the Professional free monthly run */
export function isConvenienceTool(toolKey: string): boolean {
  return (CONVENIENCE_TOOL_KEYS as readonly string[]).includes(toolKey) || CONVENIENCE_TOOL_CAMEL.has(toolKey);
}

// ── v9 LAYER CLASSIFICATION (June 2026) ──────────────────────────────────

/** v9 Layer 1 — included with ANY active subscription (monthly or annual).
 *  IR, Biometric, and DPA remain purchasable standalone by non-subscribers. */
export const INCLUDED_TOOL_KEYS = [
  'ropa', 'us_notice', 'eu_notice', 'ir_playbook', 'biometric', 'dpa',
] as const;
const INCLUDED_TOOL_CAMEL = new Set(['ropa','usNotice','euNotice','irPlaybook','biometric','dpa']);
export function isIncludedTool(toolKey: string): boolean {
  return (INCLUDED_TOOL_KEYS as readonly string[]).includes(toolKey) || INCLUDED_TOOL_CAMEL.has(toolKey);
}

/** v9 Layer 3 — Smart Tools redeemable with the annual credit.
 *  CPPA tools and Registration are deliberately EXCLUDED. */
export const ANNUAL_CREDIT_ELIGIBLE_KEYS = ['governance','lia','dpia'] as const;

export const ANNUAL_CREDIT = {
  intelligenceAnnual: 1,          // credits per subscription year (personal)
  professionalAnnualPerClient: 1, // credits per non-personal client workspace per year
  maxValueCents: 8900,
  marketingLabel: 'Includes 1 free Smart Tool run per year (up to $89 value)',
} as const;

// ── SUBSCRIBER PRICING (no promotional discount) ─────────────────────────
//
// Earlier versions of the app offered a "founding subscriber" discount
// (20% off Smart Tools, 15% off Convenience Tools). That program has
// been retired. Every tier — anonymous, free, monthly, annual — pays
// the standalone per-use price. The helpers below remain as no-op
// shims so older call sites keep compiling; they always return the
// standalone amount.

export const FOUNDING_PROMO = {
  endDate:                    '2026-11-19',
  smartToolDiscountPct:       0,
  convenienceToolDiscountPct: 0,
  label:                      '',
  description:                '',
} as const;

/** Retired program — always returns false. */
export function isPromoOpen(): boolean {
  return false;
}

/** No-op: returns the standalone amount unchanged. */
export function foundingPrice(amountCents: number, _smartTool: boolean): number {
  return amountCents;
}

// ============================================================================
//  v9 DRIFT LOG — three-layer model (2026-06-09)
//  ──────────────────────────────────────────────────────────────────────────
//  The monthly free-run pool (FREE_RUN_POOL_SIZES / freeConvenienceRun.ts)
//  is RETIRED in favor of a three-layer model:
//    Layer 1 — Included with any active subscription (monthly or annual):
//              RoPA, US Notice, EU/Global Notice, IR Playbook, Biometric,
//              Custom DPA Generator. See INCLUDED_TOOL_KEYS / isIncludedTool.
//              IR, Biometric, DPA remain purchasable standalone by
//              non-subscribers at $59 / $49 / $49.
//    Layer 2 — Per-use tools at subscriber rates for any active subscription:
//              Governance, LIA, DPIA, CPPA Risk, CPPA Cybersecurity,
//              CPPA Full Audit Suite. Registration is flat $45 (no discount).
//    Layer 3 — Annual credit: 1 free Smart Tool run per subscription year
//              (Intelligence annual) or per non-personal active client
//              workspace per year (Professional annual). Redeemable on
//              Governance / LIA / DPIA only. See ANNUAL_CREDIT_ELIGIBLE_KEYS
//              and ANNUAL_CREDIT.
//
//  Pool symbols (FREE_RUN_POOL_SIZES, getFreeRunPoolSize, CONVENIENCE_TOOL_KEYS,
//  isConvenienceTool, getToolMonthlyCapLimit, PRICING.intelligence/professional
//  .freeToolRunsPerMonth) are marked @deprecated; they are deleted in
//  Prompt 0.6 after all callers are migrated.
// ============================================================================
