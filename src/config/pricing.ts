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
      "Weekly Intelligence Brief, full enforcement archive, watchlists, and subscriber rates on every assessment tool.",
    amountCents: 3900,
    currency: "usd",
    displayPrice: "$39",
    displaySuffix: "/month",
    recurringInterval: "month",
    active: true,
  },
  intelligence_yearly: {
    kind: "subscription",
    lookupKey: "intelligence_yearly",
    productKey: "intelligence",
    productName: "Intelligence — Yearly",
    description:
      "Annual Intelligence subscription. Same as monthly, billed once per year (~17% savings).",
    amountCents: 39000,
    currency: "usd",
    displayPrice: "$390",
    displaySuffix: "/year",
    recurringInterval: "year",
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
  monthly: () => formatPrice("intelligence_monthly"),                       // "$39/month"
  yearly: () => formatPrice("intelligence_yearly"),                         // "$390/year"
  combined: () =>
    `${formatPrice("intelligence_monthly")} or ${formatPrice("intelligence_yearly")}`,
  monthlyShort: () => `${getPrice("intelligence_monthly").displayPrice}/mo`,
  yearlyShort: () => `${getPrice("intelligence_yearly").displayPrice}/yr`,
} as const;

/** US Notice price helpers — derived from the registry, never hardcode. */
export const US_NOTICE_PRICING = {
  singleStandalone: () => getPrice("us_notice_single_standalone").displayPrice,   // "$25"
  singleSubscriber: () => getPrice("us_notice_single_subscriber").displayPrice,   // "$12"
  allStatesStandalone: () => getPrice("us_notice_all_standalone").displayPrice,   // "$59"
  allStatesSubscriber: () => getPrice("us_notice_all_subscriber").displayPrice,   // "$29"
} as const;
