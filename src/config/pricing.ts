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
    amountCents: 3900,
    currency: "usd",
    displayPrice: "$39",
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
  suiteStandalone: () => getPrice("eu_notice_suite_standalone").displayPrice,                         // "$149"
  suiteSubscriber: () => getPrice("eu_notice_suite_subscriber").displayPrice,                         // "$65"
  fullInternationalStandalone: () => getPrice("eu_notice_full_international_standalone").displayPrice, // "$229"
  fullInternationalSubscriber: () => getPrice("eu_notice_full_international_subscriber").displayPrice, // "$99"
  refreshStandalone: () => getPrice("eu_notice_refresh_standalone").displayPrice,                     // "$35"
  refreshSubscriber: () => getPrice("eu_notice_refresh_subscriber").displayPrice,                     // "$19"
} as const;
