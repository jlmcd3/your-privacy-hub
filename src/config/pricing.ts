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
    amountCents: 6500,
    currency: "usd",
    displayPrice: "$65",
    displaySuffix: " flat",
    active: true,
  },
  hc_subscriber_v2: {
    kind: "addon",
    lookupKey: "hc_subscriber_v2",
    productKey: "governance_v8",
    productName: "Privacy Program Assessment (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the Privacy Program Assessment Tool.",
    amountCents: 6500,
    currency: "usd",
    displayPrice: "$65",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  li_standalone_v2: {
    kind: "one_time",
    lookupKey: "li_standalone_v2",
    productKey: "lia_v8",
    productName: "Legitimate Interest Assessment (Standalone)",
    description: "Standalone per-use price for the LIA Tool.",
    amountCents: 4500,
    currency: "usd",
    displayPrice: "$45",
    displaySuffix: " flat",
    active: true,
  },
  li_subscriber_v2: {
    kind: "addon",
    lookupKey: "li_subscriber_v2",
    productKey: "lia_v8",
    productName: "Legitimate Interest Assessment (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the LIA Tool.",
    amountCents: 4500,
    currency: "usd",
    displayPrice: "$45",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  dpia_standalone_v2: {
    kind: "one_time",
    lookupKey: "dpia_standalone_v2",
    productKey: "dpia_v8",
    productName: "Impact Assessment Builder (Standalone)",
    description: "Standalone per-use price for the DPIA Tool.",
    amountCents: 5500,
    currency: "usd",
    displayPrice: "$55",
    displaySuffix: " flat",
    active: true,
  },
  dpia_subscriber_v2: {
    kind: "addon",
    lookupKey: "dpia_subscriber_v2",
    productKey: "dpia_v8",
    productName: "Impact Assessment Builder (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the DPIA Tool.",
    amountCents: 5500,
    currency: "usd",
    displayPrice: "$55",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  dpa_standalone_v2: {
    kind: "one_time",
    lookupKey: "dpa_standalone_v2",
    productKey: "dpa_v8",
    productName: "Custom DPA Generator (Standalone)",
    description: "Standalone per-use price for the DPA Generator.",
    amountCents: 3000,
    currency: "usd",
    displayPrice: "$30",
    displaySuffix: " flat",
    active: true,
  },
  dpa_subscriber_v2: {
    kind: "addon",
    lookupKey: "dpa_subscriber_v2",
    productKey: "dpa_v8",
    productName: "Custom DPA Generator (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the DPA Generator.",
    amountCents: 2500,
    currency: "usd",
    displayPrice: "$25",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  ir_standalone_v2: {
    kind: "one_time",
    lookupKey: "ir_standalone_v2",
    productKey: "ir_v8",
    productName: "Breach Response Playbook (Standalone)",
    description: "Standalone per-use price for the Breach Response Playbook.",
    amountCents: 3000,
    currency: "usd",
    displayPrice: "$30",
    displaySuffix: " flat",
    active: true,
  },
  ir_subscriber_v2: {
    kind: "addon",
    lookupKey: "ir_subscriber_v2",
    productKey: "ir_v8",
    productName: "Breach Response Playbook (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the Breach Response Playbook.",
    amountCents: 3000,
    currency: "usd",
    displayPrice: "$30",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  biometric_standalone_v2: {
    kind: "one_time",
    lookupKey: "biometric_standalone_v2",
    productKey: "biometric_v8",
    productName: "Biometric Compliance Check (Standalone)",
    description: "Standalone per-use price for the Biometric Compliance Check.",
    amountCents: 2500,
    currency: "usd",
    displayPrice: "$25",
    displaySuffix: " flat",
    active: true,
  },
  biometric_subscriber_v2: {
    kind: "addon",
    lookupKey: "biometric_subscriber_v2",
    productKey: "biometric_v8",
    productName: "Biometric Compliance Check (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the Biometric Compliance Check.",
    amountCents: 2500,
    currency: "usd",
    displayPrice: "$25",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  ropa_initial_standalone: {
    kind: "one_time",
    lookupKey: "ropa_initial_standalone",
    productKey: "rofa",
    productName: "RoPA Builder — Initial Generation (Standalone)",
    description: "Standalone per-use price for RoPA initial generation.",
    amountCents: 4000,
    currency: "usd",
    displayPrice: "$40",
    displaySuffix: " flat",
    active: true,
  },
  ropa_refresh_standalone: {
    kind: "one_time",
    lookupKey: "ropa_refresh_standalone",
    productKey: "rofa",
    productName: "RoPA Builder — Annual Refresh (Standalone)",
    description: "Standalone per-use price for RoPA annual refresh.",
    amountCents: 4000,
    currency: "usd",
    displayPrice: "$40",
    displaySuffix: " flat",
    active: true,
  },
  ropa_initial_subscriber: {
    kind: "addon",
    lookupKey: "ropa_initial_subscriber",
    productKey: "rofa",
    productName: "RoPA Builder — Initial (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for RoPA initial generation.",
    amountCents: 4000,
    currency: "usd",
    displayPrice: "$40",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  ropa_refresh_subscriber: {
    kind: "addon",
    lookupKey: "ropa_refresh_subscriber",
    productKey: "rofa",
    productName: "RoPA Builder — Annual Refresh (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for RoPA annual refresh.",
    amountCents: 4000,
    currency: "usd",
    displayPrice: "$40",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  us_notice_v7_standalone: {
    kind: "one_time",
    lookupKey: "us_notice_v7_standalone",
    productKey: "us_notice_v8",
    productName: "US Privacy Notice Builder (Standalone)",
    description: "Uniform per-use price for any US notice variant (single state, all-states, refresh).",
    amountCents: 2500,
    currency: "usd",
    displayPrice: "$25",
    displaySuffix: " flat",
    active: true,
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
    active: true,
  },
  eu_notice_v7_standalone: {
    kind: "one_time",
    lookupKey: "eu_notice_v7_standalone",
    productKey: "eu_notice_v8",
    productName: "EU & Global Privacy Notice Builder (Standalone)",
    description: "Uniform per-use price for any EU/global notice variant.",
    amountCents: 4000,
    currency: "usd",
    displayPrice: "$40",
    displaySuffix: " flat",
    active: true,
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
    active: true,
  },
  cppa_risk_subscriber: {
    kind: "addon",
    lookupKey: "cppa_risk_subscriber",
    productKey: "cppa_risk",
    productName: "CPPA Risk Assessment — Module 1 (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the CPPA Risk Assessment.",
    amountCents: 5500,
    currency: "usd",
    displayPrice: "$55",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  cppa_risk_standalone: {
    kind: "one_time",
    lookupKey: "cppa_risk_standalone",
    productKey: "cppa_risk",
    productName: "CPPA Risk Assessment — Module 1 (Standalone)",
    description: "Standalone per-use price for the CPPA Risk Assessment.",
    amountCents: 5500,
    currency: "usd",
    displayPrice: "$55",
    displaySuffix: " flat",
    active: true,
  },
  cppa_suite_standalone: {
    kind: "one_time",
    lookupKey: "cppa_suite_standalone",
    productKey: "cppa_suite",
    productName: "CPPA Full Audit Suite — Modules 1 & 2 (Standalone)",
    description: "Complete CPPA audit readiness bundle.",
    amountCents: 11000,
    currency: "usd",
    displayPrice: "$110",
    displaySuffix: " flat",
    active: true,
  },
  cppa_cyber_standalone: {
    kind: "one_time",
    lookupKey: "cppa_cyber_standalone",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (Standalone)",
    description: "Standalone per-use price for the CPPA Cybersecurity Readiness assessment.",
    amountCents: 7000,
    currency: "usd",
    displayPrice: "$70",
    displaySuffix: " flat",
    active: true,
  },
  cppa_cyber_subscriber: {
    kind: "addon",
    lookupKey: "cppa_cyber_subscriber",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the CPPA Cybersecurity Readiness assessment.",
    amountCents: 7000,
    currency: "usd",
    displayPrice: "$70",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
    active: true,
  },
  cppa_suite_subscriber: {
    kind: "addon",
    lookupKey: "cppa_suite_subscriber",
    productKey: "cppa_suite",
    productName: "CPPA Full Audit Suite — Modules 1 & 2 (Subscriber alias)",
    description: "Subscriber-rate alias (mirrors standalone — no longer discounted) for the CPPA Full Audit Suite.",
    amountCents: 11000,
    currency: "usd",
    displayPrice: "$110",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_annual",
    addonReason: "subscriber_alias",
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
  monthly: () => formatPrice("intelligence_monthly"),                              // "$29/month"
  yearly: () => formatPrice("intelligence_yearly"),                                // "$200/year"
  combined: () =>
    `${formatPrice("intelligence_monthly")} or ${formatPrice("intelligence_yearly")}`,
  monthlyShort: () => `${getPrice("intelligence_monthly").displayPrice}/mo`,
  yearlyShort: () => `${getPrice("intelligence_yearly").displayPrice}/yr`,
} as const;

/** Platform pricing helpers (annual subscriptions). */
export const PLATFORM_PRICING = {
  standard: () => formatPrice("professional_annual"),                              // "$300/year"
  standardMonthly: () => formatPrice("professional_monthly"),                      // "$30/month"
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
    biometric:    { name: 'Biometric Compliance Check',         dollars: 35,  display: '$35',  stripePriceId: 'biometric_standalone_v2' },
    ir_playbook:  { name: 'Breach IR Playbook',                 dollars: 30,  display: '$30',  stripePriceId: 'ir_standalone_v2' },
    lia:          { name: 'Legitimate Interest Assessment',     dollars: 69,  display: '$69',  stripePriceId: 'li_standalone_v2' },
    us_notice:    { name: 'US Privacy Notice Builder',          dollars: 25,  display: '$25',  stripePriceId: 'us_notice_v7_standalone' },
    dpia:         { name: 'Data Protection Impact Assessment',  dollars: 79,  display: '$79',  stripePriceId: 'dpia_standalone_v2' },
    dpa:          { name: 'Custom DPA Generator',               dollars: 49,  display: '$49',  stripePriceId: 'dpa_standalone_v2' },
    ropa:         { name: 'RoPA Builder',                       dollars: 40,  display: '$40',  stripePriceId: 'ropa_initial_standalone' },
    eu_notice:    { name: 'EU / Global Privacy Notice Builder', dollars: 40,  display: '$40',  stripePriceId: 'eu_notice_v7_standalone' },
    registration: { name: 'Registration Filings',               dollars: 45,  display: '$45',  stripePriceId: 'registration_standalone' },
    governance:   { name: 'Privacy Program Assessment',         dollars: 89,  display: '$89',  stripePriceId: 'hc_standalone_v2' },
    cppa_risk:    { name: 'CPPA Risk Assessment',               dollars: 89,  display: '$89',  stripePriceId: 'cppa_risk_standalone' },
    cppa_cyber:   { name: 'CPPA Cybersecurity Readiness',       dollars: 99,  display: '$99',  stripePriceId: 'cppa_cyber_standalone' },
    cppa_suite:   { name: 'CPPA Full Audit Suite',              dollars: 159, display: '$159', stripePriceId: 'cppa_suite_standalone' },

    // ── Legacy camelCase aliases (kept so existing imports keep compiling) ──
    cppaScope:    { name: 'CPPA Scope Checker',                 dollars: 0,   display: 'Free', stripePriceId: null },
    irPlaybook:   { name: 'Breach IR Playbook',                 dollars: 30,  display: '$30',  stripePriceId: 'ir_standalone_v2' },
    usNotice:     { name: 'US Privacy Notice Builder',          dollars: 25,  display: '$25',  stripePriceId: 'us_notice_v7_standalone' },
    euNotice:     { name: 'EU / Global Privacy Notice Builder', dollars: 40,  display: '$40',  stripePriceId: 'eu_notice_v7_standalone' },
    cppaRisk:     { name: 'CPPA Risk Assessment',               dollars: 89,  display: '$89',  stripePriceId: 'cppa_risk_standalone' },
    cppaCyber:    { name: 'CPPA Cybersecurity Readiness',       dollars: 99,  display: '$99',  stripePriceId: 'cppa_cyber_standalone' },
    cppaSuite:    { name: 'CPPA Full Audit Suite',              dollars: 159, display: '$159', stripePriceId: 'cppa_suite_standalone' },
  },
} as const;

export type ToolKey = keyof typeof PRICING.tools;
export type SubscriptionTier = 'anonymous' | 'free' | 'intelligence' | 'professional';

/**
 * Per-tier subscriber pricing for tools that have differentiated rates.
 * "free" means no Stripe charge — the checkout gate checks this before
 * invoking Stripe. monthlyCapLimit is the abuse cap (calendar-month reset).
 * Tools not listed here charge the standalone rate for all tiers.
 */
export const SUBSCRIBER_PRICING: Record<string, Record<string, {
  dollars: number;
  display: string;
  free: boolean;
  monthlyCapLimit: number | null;
}>> = {
  biometric: {
    intelligence_monthly: { dollars: 0,  display: 'Free', free: true, monthlyCapLimit: 5  },
    intelligence_annual:  { dollars: 0,  display: 'Free', free: true, monthlyCapLimit: 5  },
    professional_monthly: { dollars: 0,  display: 'Free', free: true, monthlyCapLimit: 5  },
    professional_annual:  { dollars: 0,  display: 'Free', free: true, monthlyCapLimit: 5  },
  },
  ir_playbook: {
    intelligence_monthly: { dollars: 30, display: '$30',  free: false, monthlyCapLimit: null },
    intelligence_annual:  { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 1  },
    professional_monthly: { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 1  },
    professional_annual:  { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
  },
  dpa: {
    intelligence_monthly: { dollars: 25, display: '$25',  free: false, monthlyCapLimit: null },
    intelligence_annual:  { dollars: 25, display: '$25',  free: false, monthlyCapLimit: null },
    professional_monthly: { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 1  },
    professional_annual:  { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
  },
  us_notice: {
    intelligence_monthly: { dollars: 20, display: '$20',  free: false, monthlyCapLimit: null },
    intelligence_annual:  { dollars: 20, display: '$20',  free: false, monthlyCapLimit: null },
    professional_monthly: { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
    professional_annual:  { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
  },
  eu_notice: {
    intelligence_monthly: { dollars: 30, display: '$30',  free: false, monthlyCapLimit: null },
    intelligence_annual:  { dollars: 30, display: '$30',  free: false, monthlyCapLimit: null },
    professional_monthly: { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
    professional_annual:  { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
  },
  // camelCase aliases
  irPlaybook: {
    intelligence_monthly: { dollars: 30, display: '$30',  free: false, monthlyCapLimit: null },
    intelligence_annual:  { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 1  },
    professional_monthly: { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 1  },
    professional_annual:  { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
  },
  usNotice: {
    intelligence_monthly: { dollars: 20, display: '$20',  free: false, monthlyCapLimit: null },
    intelligence_annual:  { dollars: 20, display: '$20',  free: false, monthlyCapLimit: null },
    professional_monthly: { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
    professional_annual:  { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
  },
  euNotice: {
    intelligence_monthly: { dollars: 30, display: '$30',  free: false, monthlyCapLimit: null },
    intelligence_annual:  { dollars: 30, display: '$30',  free: false, monthlyCapLimit: null },
    professional_monthly: { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
    professional_annual:  { dollars: 0,  display: 'Free', free: true,  monthlyCapLimit: 3  },
  },
};

/**
 * Returns the effective price in dollars for a tool at a given subscription
 * tier. Checks SUBSCRIBER_PRICING first; falls back to standalone.
 *
 * tier values:
 *   'anonymous' | 'free'               → standalone price
 *   'intelligence_monthly'             → Intel Monthly rate
 *   'intelligence_annual'              → Intel Annual rate
 *   'professional_monthly'             → Pro Monthly rate
 *   'professional_annual'              → Pro Annual rate
 *
 * Legacy single-value tier aliases still accepted:
 *   'intelligence'  → maps to 'intelligence_monthly'
 *   'professional'  → maps to 'professional_annual'
 */
export function getToolPrice(toolKey: ToolKey, tier?: string): number {
  const normalisedTier = normaliseTier(tier);
  const subscriberEntry = SUBSCRIBER_PRICING[toolKey]?.[normalisedTier];
  if (subscriberEntry) return subscriberEntry.dollars;
  const tool = PRICING.tools[toolKey];
  return tool.dollars;
}

export function getToolPriceDisplay(toolKey: ToolKey, tier?: string): string {
  const normalisedTier = normaliseTier(tier);
  const subscriberEntry = SUBSCRIBER_PRICING[toolKey]?.[normalisedTier];
  if (subscriberEntry) return subscriberEntry.display;
  const price = PRICING.tools[toolKey].dollars;
  return price === 0 ? 'Free' : `$${price}`;
}

/** Returns true if the tool is free for this subscriber tier (no Stripe charge). */
export function isToolFreeForTier(toolKey: string, tier?: string): boolean {
  const normalisedTier = normaliseTier(tier);
  return SUBSCRIBER_PRICING[toolKey]?.[normalisedTier]?.free === true;
}

/** Returns the monthly abuse cap for a tool at a tier, or null if uncapped. */
export function getToolMonthlyCapLimit(toolKey: string, tier?: string): number | null {
  const normalisedTier = normaliseTier(tier);
  return SUBSCRIBER_PRICING[toolKey]?.[normalisedTier]?.monthlyCapLimit ?? null;
}

function normaliseTier(tier?: string): string {
  if (!tier) return 'anonymous';
  if (tier === 'intelligence') return 'intelligence_monthly';
  if (tier === 'professional') return 'professional_annual';
  return tier;
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
  'dpa',          // DPA Generator — jurisdiction-specific enforcement calibration
  'biometric',    // Biometric Check — BIPA calculator + enforcement patterns
] as const;

export type SmartToolKey = typeof SMART_TOOL_KEYS[number];

/**
 * CONVENIENCE TOOLS — document generators. Valuable time-savers.
 * Professional annual subscribers receive 1 free run per client per month.
 */
export const CONVENIENCE_TOOL_KEYS = [
  'ir_playbook',  // IR Playbook — structured notification timelines
  'us_notice',    // US Privacy Notice — state-specific generation
  'eu_notice',    // EU/Global Notice — multi-jurisdiction generation
  'ropa',         // RoPA Builder — Article 30 structured record
  'registration', // Registration Filings — DPO/AI Act registration docs
] as const;

export type ConvenienceToolKey = typeof CONVENIENCE_TOOL_KEYS[number];

/** Always free — CPPA Scope Checker */
export const FREE_TOOL_KEYS = ['cppa_scope'] as const;

// camelCase aliases for the same tool keys (so callers using either form work)
const SMART_TOOL_CAMEL = new Set(['governance','lia','dpia','cppaRisk','cppaCyber','dpa','biometric']);
const CONVENIENCE_TOOL_CAMEL = new Set(['irPlaybook','usNotice','euNotice','ropa','registration']);

/** Returns true if the tool uses multi-stage enforcement-corpus reasoning */
export function isSmartTool(toolKey: string): boolean {
  return (SMART_TOOL_KEYS as readonly string[]).includes(toolKey) || SMART_TOOL_CAMEL.has(toolKey);
}

/** Returns true if the tool is eligible for the Professional free monthly run */
export function isConvenienceTool(toolKey: string): boolean {
  return (CONVENIENCE_TOOL_KEYS as readonly string[]).includes(toolKey) || CONVENIENCE_TOOL_CAMEL.has(toolKey);
}

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
