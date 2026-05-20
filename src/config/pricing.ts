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
    amountCents: 3000,
    currency: "usd",
    displayPrice: "$30",
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
      "Annual Professional subscription. Save $60. Unlocks client/matter workspace, branded outputs, and 1 free Convenience Tool run per client per month.",
    amountCents: 30000,
    currency: "usd",
    displayPrice: "$300",
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
    amountCents: 4000,
    currency: "usd",
    displayPrice: "$40",
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
    amountCents: 5500,
    currency: "usd",
    displayPrice: "$55",
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
    active: false,
  },

  // ── v7 per-use tool prices (uniform per category, replaces tier-based notice pricing) ──
  // Standalone = anonymous/free rate. Subscriber = Professional (25% off).
  // Intelligence-tier (20% off) is computed dynamically and uses standalone lookup.
  hc_standalone_v2: {
    kind: "one_time",
    lookupKey: "hc_standalone_v2",
    productKey: "governance_v7",
    productName: "Privacy Program Assessment (v7 Standalone)",
    description: "v7 per-use price for the Privacy Program Assessment Tool.",
    amountCents: 5500,
    currency: "usd",
    displayPrice: "$55",
    displaySuffix: " flat",
    active: true,
  },
  hc_subscriber_v2: {
    kind: "addon",
    lookupKey: "hc_subscriber_v2",
    productKey: "governance_v7",
    productName: "Privacy Program Assessment (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the Privacy Program Assessment Tool.",
    amountCents: 4125,
    currency: "usd",
    displayPrice: "$41",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  li_standalone_v2: {
    kind: "one_time",
    lookupKey: "li_standalone_v2",
    productKey: "lia_v7",
    productName: "Legitimate Interest Assessment (v7 Standalone)",
    description: "v7 per-use price for the LIA Tool.",
    amountCents: 3500,
    currency: "usd",
    displayPrice: "$35",
    displaySuffix: " flat",
    active: true,
  },
  li_subscriber_v2: {
    kind: "addon",
    lookupKey: "li_subscriber_v2",
    productKey: "lia_v7",
    productName: "Legitimate Interest Assessment (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the LIA Tool.",
    amountCents: 2625,
    currency: "usd",
    displayPrice: "$26",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  dpia_standalone_v2: {
    kind: "one_time",
    lookupKey: "dpia_standalone_v2",
    productKey: "dpia_v7",
    productName: "Impact Assessment Builder (v7 Standalone)",
    description: "v7 per-use price for the DPIA Tool.",
    amountCents: 4500,
    currency: "usd",
    displayPrice: "$45",
    displaySuffix: " flat",
    active: true,
  },
  dpia_subscriber_v2: {
    kind: "addon",
    lookupKey: "dpia_subscriber_v2",
    productKey: "dpia_v7",
    productName: "Impact Assessment Builder (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the DPIA Tool.",
    amountCents: 3375,
    currency: "usd",
    displayPrice: "$34",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  dpa_standalone_v2: {
    kind: "one_time",
    lookupKey: "dpa_standalone_v2",
    productKey: "dpa_v7",
    productName: "Custom DPA Generator (v7 Standalone)",
    description: "v7 per-use price for the DPA Generator.",
    amountCents: 4500,
    currency: "usd",
    displayPrice: "$45",
    displaySuffix: " flat",
    active: true,
  },
  dpa_subscriber_v2: {
    kind: "addon",
    lookupKey: "dpa_subscriber_v2",
    productKey: "dpa_v7",
    productName: "Custom DPA Generator (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the DPA Generator.",
    amountCents: 3375,
    currency: "usd",
    displayPrice: "$34",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  ir_standalone_v2: {
    kind: "one_time",
    lookupKey: "ir_standalone_v2",
    productKey: "ir_v7",
    productName: "Breach Response Playbook (v7 Standalone)",
    description: "v7 per-use price for the Breach Response Playbook.",
    amountCents: 2500,
    currency: "usd",
    displayPrice: "$25",
    displaySuffix: " flat",
    active: true,
  },
  ir_subscriber_v2: {
    kind: "addon",
    lookupKey: "ir_subscriber_v2",
    productKey: "ir_v7",
    productName: "Breach Response Playbook (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the Breach Response Playbook.",
    amountCents: 1875,
    currency: "usd",
    displayPrice: "$19",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  biometric_standalone_v2: {
    kind: "one_time",
    lookupKey: "biometric_standalone_v2",
    productKey: "biometric_v7",
    productName: "Biometric Compliance Check (v7 Standalone)",
    description: "v7 per-use price for the Biometric Compliance Check.",
    amountCents: 1500,
    currency: "usd",
    displayPrice: "$15",
    displaySuffix: " flat",
    active: true,
  },
  biometric_subscriber_v2: {
    kind: "addon",
    lookupKey: "biometric_subscriber_v2",
    productKey: "biometric_v7",
    productName: "Biometric Compliance Check (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the Biometric Compliance Check.",
    amountCents: 800,
    currency: "usd",
    displayPrice: "$8",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  ropa_initial_subscriber: {
    kind: "addon",
    lookupKey: "ropa_initial_subscriber",
    productKey: "rofa",
    productName: "RoPA Builder — Initial (v7 Professional)",
    description: "Professional subscriber rate (25% off) for RoPA initial generation.",
    amountCents: 3000,
    currency: "usd",
    displayPrice: "$30",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  ropa_refresh_subscriber: {
    kind: "addon",
    lookupKey: "ropa_refresh_subscriber",
    productKey: "rofa",
    productName: "RoPA Builder — Annual Refresh (v7 Professional)",
    description: "Professional subscriber rate (25% off) for RoPA annual refresh.",
    amountCents: 3000,
    currency: "usd",
    displayPrice: "$30",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  us_notice_v7_standalone: {
    kind: "one_time",
    lookupKey: "us_notice_v7_standalone",
    productKey: "us_notice_v7",
    productName: "US Privacy Notice Builder (v7 Standalone)",
    description: "v7 uniform per-use price for any US notice variant (single state, all-states, refresh).",
    amountCents: 3000,
    currency: "usd",
    displayPrice: "$30",
    displaySuffix: " flat",
    active: true,
  },
  us_notice_v7_subscriber: {
    kind: "addon",
    lookupKey: "us_notice_v7_subscriber",
    productKey: "us_notice_v7",
    productName: "US Privacy Notice Builder (v7 Professional)",
    description: "Professional subscriber rate (25% off) for any US notice variant.",
    amountCents: 2300,
    currency: "usd",
    displayPrice: "$23",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  eu_notice_v7_standalone: {
    kind: "one_time",
    lookupKey: "eu_notice_v7_standalone",
    productKey: "eu_notice_v7",
    productName: "EU & Global Privacy Notice Builder (v7 Standalone)",
    description: "v7 uniform per-use price for any EU/global notice variant.",
    amountCents: 5000,
    currency: "usd",
    displayPrice: "$50",
    displaySuffix: " flat",
    active: true,
  },
  eu_notice_v7_subscriber: {
    kind: "addon",
    lookupKey: "eu_notice_v7_subscriber",
    productKey: "eu_notice_v7",
    productName: "EU & Global Privacy Notice Builder (v7 Professional)",
    description: "Professional subscriber rate (25% off) for any EU/global notice variant.",
    amountCents: 3800,
    currency: "usd",
    displayPrice: "$38",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  cppa_risk_subscriber: {
    kind: "addon",
    lookupKey: "cppa_risk_subscriber",
    productKey: "cppa_risk",
    productName: "CPPA Risk Assessment — Module 1 (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the CPPA Risk Assessment.",
    amountCents: 4500,
    currency: "usd",
    displayPrice: "$45",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  cppa_cyber_standalone: {
    kind: "one_time",
    lookupKey: "cppa_cyber_standalone",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (v7 Standalone)",
    description: "v7 per-use price for the CPPA Cybersecurity Readiness assessment.",
    amountCents: 8000,
    currency: "usd",
    displayPrice: "$80",
    displaySuffix: " flat",
    active: true,
  },
  cppa_cyber_subscriber: {
    kind: "addon",
    lookupKey: "cppa_cyber_subscriber",
    productKey: "cppa_cybersecurity",
    productName: "CPPA Cybersecurity Readiness — Module 2 (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the CPPA Cybersecurity Readiness assessment.",
    amountCents: 6000,
    currency: "usd",
    displayPrice: "$60",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
    addonReason: "subscriber_discount",
    active: true,
  },
  cppa_suite_subscriber: {
    kind: "addon",
    lookupKey: "cppa_suite_subscriber",
    productKey: "cppa_suite",
    productName: "CPPA Full Audit Suite — Modules 1 & 2 (v7 Professional)",
    description: "Professional subscriber rate (25% off) for the CPPA Full Audit Suite.",
    amountCents: 10500,
    currency: "usd",
    displayPrice: "$105",
    displaySuffix: " flat",
    parentLookupKey: "intelligence_yearly",
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
  monthly: () => formatPrice("intelligence_monthly"),                              // "$29/month"
  yearly: () => formatPrice("intelligence_yearly"),                                // "$399/year"
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
      display: '$30',
      dollars: 30,
      cents: 3000,
      label: 'month',
      stripePriceId: 'professional_monthly',
    },
    annual: {
      display: '$300',
      dollars: 300,
      cents: 30000,
      label: 'year',
      savingDisplay: 'Save $60',
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
      display: '$30',
      dollars: 30,
      cents: 3000,
      label: 'month',
      stripePriceId: 'professional_monthly',
    },
    freeToolRunsPerMonth: 1, // annual only — see freeConvenienceRun.ts
    teamLoginsIncluded: 3,
    additionalLoginMonthly: 10,
  },
  tools: {
    cppa_scope:   { name: 'CPPA Scope Checker',                 dollars: 0,  display: 'Free', stripePriceId: null },
    biometric:    { name: 'Biometric Compliance Check',         dollars: 15, display: '$15',  stripePriceId: 'biometric_standalone_v2' },
    ir_playbook:  { name: 'Breach IR Playbook',                 dollars: 25, display: '$25',  stripePriceId: 'ir_standalone_v2' },
    lia:          { name: 'Legitimate Interest Assessment',     dollars: 35, display: '$35',  stripePriceId: 'li_standalone_v2' },
    us_notice:    { name: 'US Privacy Notice Builder',          dollars: 25, display: '$25',  stripePriceId: 'us_notice_v7_standalone' },
    dpia:         { name: 'Data Protection Impact Assessment',  dollars: 45, display: '$45',  stripePriceId: 'dpia_standalone_v2' },
    dpa:          { name: 'Custom DPA Generator',               dollars: 45, display: '$45',  stripePriceId: 'dpa_standalone_v2' },
    ropa:         { name: 'RoPA Builder',                       dollars: 40, display: '$40',  stripePriceId: 'ropa_initial_standalone' },
    eu_notice:    { name: 'EU / Global Privacy Notice Builder', dollars: 50, display: '$50',  stripePriceId: 'eu_notice_v7_standalone' },
    registration: { name: 'Registration Filings',               dollars: 45, display: '$45',  stripePriceId: 'registration_onetime' },
    governance:   { name: 'Privacy Program Assessment',         dollars: 55, display: '$55',  stripePriceId: 'hc_standalone_v2' },
    cppa_risk:    { name: 'CPPA Risk Assessment',               dollars: 55, display: '$55',  stripePriceId: 'cppa_risk_standalone' },
    cppa_cyber:   { name: 'CPPA Cybersecurity Readiness',       dollars: 70, display: '$70',  stripePriceId: 'cppa_cyber_standalone' },

    // ── Legacy camelCase aliases (kept so existing imports keep compiling) ──
    cppaScope:    { name: 'CPPA Scope Checker',                 dollars: 0,  display: 'Free', stripePriceId: null },
    irPlaybook:   { name: 'Breach IR Playbook',                 dollars: 25, display: '$25',  stripePriceId: 'ir_standalone_v2' },
    usNotice:     { name: 'US Privacy Notice Builder',          dollars: 25, display: '$25',  stripePriceId: 'us_notice_v7_standalone' },
    euNotice:     { name: 'EU / Global Privacy Notice Builder', dollars: 50, display: '$50',  stripePriceId: 'eu_notice_v7_standalone' },
    cppaRisk:     { name: 'CPPA Risk Assessment',               dollars: 55, display: '$55',  stripePriceId: 'cppa_risk_standalone' },
    cppaCyber:    { name: 'CPPA Cybersecurity Readiness',       dollars: 70, display: '$70',  stripePriceId: 'cppa_cyber_standalone' },
  },
} as const;

export type ToolKey = keyof typeof PRICING.tools;
export type SubscriptionTier = 'anonymous' | 'free' | 'intelligence' | 'professional';

/**
 * v2 model: no permanent structural subscriber discount on tools.
 * Returns the full standalone price for every tier. Founding subscriber
 * discount is applied separately by `getEffectiveToolPrice` (see
 * src/lib/foundingSubscriber.ts).
 */
export function getToolPrice(toolKey: ToolKey, _tier?: SubscriptionTier): number {
  const tool = PRICING.tools[toolKey];
  return tool.dollars;
}

export function getToolPriceDisplay(toolKey: ToolKey, _tier?: SubscriptionTier): string {
  const price = getToolPrice(toolKey);
  return price === 0 ? 'Free' : `$${price}`;
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

// ── FOUNDING SUBSCRIBER PROMOTION ────────────────────────────────────────

/**
 * Subscribers who join before FOUNDING_PROMO_END_DATE receive a permanent
 * discount on all tools. Tracked via the founding_subscriber flag in profiles.
 * Discount applied in-app at checkout — no Stripe coupon needed.
 */
export const FOUNDING_PROMO = {
  endDate:                    '2026-11-19',
  smartToolDiscountPct:       0.20,
  convenienceToolDiscountPct: 0.15,
  label:                      'Founding Subscriber',
  description:                'Permanent discount on all compliance tools.',
} as const;

/** Returns true if the founding subscriber window is still open */
export function isPromoOpen(): boolean {
  return new Date() <= new Date(FOUNDING_PROMO.endDate + 'T23:59:59Z');
}

/** Price in cents after founding subscriber discount */
export function foundingPrice(amountCents: number, smartTool: boolean): number {
  if (amountCents === 0) return 0;
  const disc = smartTool
    ? FOUNDING_PROMO.smartToolDiscountPct
    : FOUNDING_PROMO.convenienceToolDiscountPct;
  return Math.round(amountCents * (1 - disc));
}
