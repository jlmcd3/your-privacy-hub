// GENERATED FILE — DO NOT EDIT BY HAND.
//
// Source of truth: src/config/pricing.ts (PRICING_REGISTRY + PRICING.tools).
// Regenerate after ANY price change:
//   deno run --allow-read --allow-write scripts/pricing/generate-pricing-snapshot.ts
// Guarded by src/test/pricingSnapshot.test.ts — the vitest battery fails when
// this file is stale, so a price change cannot ship without its mirror.
//
// Consumers: supabase/functions/_shared/pricing.ts (tool catalog), and through
// it create-tool-checkout, get-tool-price, create-registration-checkout and
// sync-pricing. None of them carries its own cents.

export interface SnapshotRegistryEntry {
  lookupKey: string;
  productKey: string;
  productName: string;
  description: string;
  amountCents: number;
  currency: string;
  displayPrice: string;
  displaySuffix?: string;
  kind: string;
  recurringInterval?: "month" | "year";
  active: boolean;
  parentLookupKey?: string;
  addonReason?: string;
  maxQuantity?: number | null;
  unitLabel?: string;
}

export interface SnapshotToolEntry {
  name: string;
  dollars: number;
  cents: number;
  display: string;
  stripePriceId: string | null;
}

/** SHA-256 of the canonical JSON of the master projection at generation time. */
export const PRICING_SNAPSHOT_SOURCE_HASH = "4c36efcbe3b4998806461958e0011a9ef21569b42cad83d76adc7af196e5f380";

const SNAPSHOT: { registry: Record<string, SnapshotRegistryEntry>; tools: Record<string, SnapshotToolEntry> } = /* SNAPSHOT-JSON-BEGIN */ {
  "registry": {
    "biometric_standalone_v2": {
      "lookupKey": "biometric_standalone_v2",
      "productKey": "biometric_v8",
      "productName": "Biometric Compliance Check (Standalone)",
      "description": "Standalone per-use price for the Biometric Compliance Check.",
      "amountCents": 7900,
      "currency": "usd",
      "displayPrice": "$79",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "biometric_subscriber_v2": {
      "lookupKey": "biometric_subscriber_v2",
      "productKey": "biometric_v8",
      "productName": "Biometric Compliance Check (Subscriber)",
      "description": "Free for subscribers — bypasses Stripe checkout.",
      "amountCents": 0,
      "currency": "usd",
      "displayPrice": "Free",
      "displaySuffix": "",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_free"
    },
    "biometric_topup_v1": {
      "lookupKey": "biometric_topup_v1",
      "productKey": "biometric_v8",
      "productName": "Biometric Compliance Check — 4 additional generations",
      "description": "Meter top-up: adds 4 additional generations on an existing Biometric Compliance Check. Half-price policy.",
      "amountCents": 3950,
      "currency": "usd",
      "displayPrice": "$39.50",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "biometric_standalone_v2",
      "addonReason": "meter_topup"
    },
    "cppa_admt_standalone": {
      "lookupKey": "cppa_admt_standalone",
      "productKey": "cppa_admt",
      "productName": "ADMT Compliance Assessment — Module 3 (Standalone)",
      "description": "Standalone per-use price for the ADMT Compliance Assessment (pre-use notice, opt-out, access rights gap analysis).",
      "amountCents": 14900,
      "currency": "usd",
      "displayPrice": "$149",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "cppa_admt_subscriber": {
      "lookupKey": "cppa_admt_subscriber",
      "productKey": "cppa_admt",
      "productName": "ADMT Compliance Assessment — Module 3 (Subscriber)",
      "description": "Subscriber per-use price for the ADMT Compliance Assessment.",
      "amountCents": 9900,
      "currency": "usd",
      "displayPrice": "$99",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_discount"
    },
    "cppa_admt_topup_v1": {
      "lookupKey": "cppa_admt_topup_v1",
      "productKey": "cppa_admt",
      "productName": "ADMT Compliance Assessment — 4 additional generations",
      "description": "Meter top-up: adds 4 additional generations on an existing ADMT Compliance Assessment. Half-price policy.",
      "amountCents": 7450,
      "currency": "usd",
      "displayPrice": "$74.50",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "cppa_admt_standalone",
      "addonReason": "meter_topup"
    },
    "cppa_cyber_standalone": {
      "lookupKey": "cppa_cyber_standalone",
      "productKey": "cppa_cybersecurity",
      "productName": "CPPA Cybersecurity Readiness — Module 2 (Standalone)",
      "description": "Standalone per-use price for the CPPA Cybersecurity Readiness assessment.",
      "amountCents": 39900,
      "currency": "usd",
      "displayPrice": "$399",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "cppa_cyber_subscriber": {
      "lookupKey": "cppa_cyber_subscriber",
      "productKey": "cppa_cybersecurity",
      "productName": "CPPA Cybersecurity Readiness — Module 2 (Subscriber)",
      "description": "Subscriber per-use price for the CPPA Cybersecurity Readiness assessment.",
      "amountCents": 23900,
      "currency": "usd",
      "displayPrice": "$239",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_discount"
    },
    "cppa_cybersecurity_topup_v1": {
      "lookupKey": "cppa_cybersecurity_topup_v1",
      "productKey": "cppa_cybersecurity",
      "productName": "CPPA Cybersecurity Readiness — 4 additional generations",
      "description": "Meter top-up: adds 4 additional generations on an existing CPPA Cybersecurity Readiness assessment. Half-price policy.",
      "amountCents": 19950,
      "currency": "usd",
      "displayPrice": "$199.50",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "cppa_cyber_standalone",
      "addonReason": "meter_topup"
    },
    "cppa_risk_standalone": {
      "lookupKey": "cppa_risk_standalone",
      "productKey": "cppa_risk",
      "productName": "CPPA Risk Assessment — Module 1 (Standalone)",
      "description": "Standalone per-use price for the CPPA Risk Assessment.",
      "amountCents": 29900,
      "currency": "usd",
      "displayPrice": "$299",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "cppa_risk_subscriber": {
      "lookupKey": "cppa_risk_subscriber",
      "productKey": "cppa_risk",
      "productName": "CPPA Risk Assessment — Module 1 (Subscriber)",
      "description": "Subscriber per-use price for the CPPA Risk Assessment.",
      "amountCents": 17900,
      "currency": "usd",
      "displayPrice": "$179",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_discount"
    },
    "cppa_risk_topup_v1": {
      "lookupKey": "cppa_risk_topup_v1",
      "productKey": "cppa_risk",
      "productName": "CPPA Risk Assessment — 4 additional generations",
      "description": "Meter top-up: adds 4 additional generations on an existing CPPA Risk Assessment. Half-price policy.",
      "amountCents": 14950,
      "currency": "usd",
      "displayPrice": "$149.50",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "cppa_risk_standalone",
      "addonReason": "meter_topup"
    },
    "cppa_suite_standalone": {
      "lookupKey": "cppa_suite_standalone",
      "productKey": "cppa_suite",
      "productName": "CPPA Full Audit Suite — Modules 1 & 2 (Standalone)",
      "description": "Complete CPPA audit readiness bundle. Save $99 vs buying modules separately.",
      "amountCents": 59900,
      "currency": "usd",
      "displayPrice": "$599",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "cppa_suite_subscriber": {
      "lookupKey": "cppa_suite_subscriber",
      "productKey": "cppa_suite",
      "productName": "CPPA Full Audit Suite — Modules 1 & 2 (Subscriber)",
      "description": "Subscriber per-use price for the CPPA Full Audit Suite.",
      "amountCents": 34900,
      "currency": "usd",
      "displayPrice": "$349",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_discount"
    },
    "dpa_standalone_v2": {
      "lookupKey": "dpa_standalone_v2",
      "productKey": "dpa_v8",
      "productName": "Custom DPA Generator (Standalone)",
      "description": "Standalone per-use price for the DPA Generator.",
      "amountCents": 6900,
      "currency": "usd",
      "displayPrice": "$69",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "dpa_subscriber_v2": {
      "lookupKey": "dpa_subscriber_v2",
      "productKey": "dpa_v8",
      "productName": "Custom DPA Generator (Subscriber)",
      "description": "Free for subscribers — bypasses Stripe checkout.",
      "amountCents": 0,
      "currency": "usd",
      "displayPrice": "Free",
      "displaySuffix": "",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_free"
    },
    "dpa_topup_v1": {
      "lookupKey": "dpa_topup_v1",
      "productKey": "dpa_v8",
      "productName": "Custom DPA Generator — 4 additional generations",
      "description": "Meter top-up: adds 4 additional generations on an existing DPA. Half-price policy.",
      "amountCents": 3450,
      "currency": "usd",
      "displayPrice": "$34.50",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "dpa_standalone_v2",
      "addonReason": "meter_topup"
    },
    "dpia_standalone_v2": {
      "lookupKey": "dpia_standalone_v2",
      "productKey": "dpia_v8",
      "productName": "DPIA Builder (Standalone)",
      "description": "Standalone per-use price for the DPIA Tool.",
      "amountCents": 14900,
      "currency": "usd",
      "displayPrice": "$149",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "dpia_subscriber_v2": {
      "lookupKey": "dpia_subscriber_v2",
      "productKey": "dpia_v8",
      "productName": "DPIA Builder (Subscriber)",
      "description": "Subscriber per-use price for the DPIA Tool.",
      "amountCents": 9900,
      "currency": "usd",
      "displayPrice": "$99",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_discount"
    },
    "dpia_topup_v1": {
      "lookupKey": "dpia_topup_v1",
      "productKey": "dpia_v8",
      "productName": "DPIA Builder — 4 additional generations",
      "description": "Meter top-up: adds 4 additional generations on an existing DPIA. Half-price policy.",
      "amountCents": 7450,
      "currency": "usd",
      "displayPrice": "$74.50",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "dpia_standalone_v2",
      "addonReason": "meter_topup"
    },
    "eu_notice_v7_standalone": {
      "lookupKey": "eu_notice_v7_standalone",
      "productKey": "eu_notice_v8",
      "productName": "EU & Global Privacy Notice Builder (Standalone — RETIRED)",
      "description": "Retired: EU & Global Privacy Notice Builder is subscriber-only. Not sold standalone.",
      "amountCents": 4000,
      "currency": "usd",
      "displayPrice": "$40",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": false
    },
    "eu_notice_v7_subscriber": {
      "lookupKey": "eu_notice_v7_subscriber",
      "productKey": "eu_notice_v8",
      "productName": "EU & Global Privacy Notice Builder (Subscriber alias)",
      "description": "Subscriber-rate alias (mirrors standalone — no longer discounted) for any EU/global notice variant.",
      "amountCents": 3000,
      "currency": "usd",
      "displayPrice": "$30",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": false,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_alias"
    },
    "governance_topup_v1": {
      "lookupKey": "governance_topup_v1",
      "productKey": "governance_v8",
      "productName": "GDPR Accountability Assessment — 4 additional generations",
      "description": "Meter top-up: adds 4 additional generations on an existing Accountability Assessment. Half-price policy.",
      "amountCents": 5950,
      "currency": "usd",
      "displayPrice": "$59.50",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "hc_standalone_v2",
      "addonReason": "meter_topup"
    },
    "hc_standalone_v2": {
      "lookupKey": "hc_standalone_v2",
      "productKey": "governance_v8",
      "productName": "GDPR Accountability Assessment (Standalone)",
      "description": "Standalone per-use price for the GDPR Accountability Assessment.",
      "amountCents": 11900,
      "currency": "usd",
      "displayPrice": "$119",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "hc_subscriber_v2": {
      "lookupKey": "hc_subscriber_v2",
      "productKey": "governance_v8",
      "productName": "GDPR Accountability Assessment (Subscriber)",
      "description": "Subscriber per-use price for the GDPR Accountability Assessment.",
      "amountCents": 7900,
      "currency": "usd",
      "displayPrice": "$79",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_discount"
    },
    "intelligence_annual": {
      "lookupKey": "intelligence_annual",
      "productKey": "intelligence",
      "productName": "Intelligence — Annual",
      "description": "Annual Intelligence subscription. Save $40 — pay for 10 months, get 12.",
      "amountCents": 20000,
      "currency": "usd",
      "displayPrice": "$200",
      "displaySuffix": "/year",
      "kind": "subscription",
      "recurringInterval": "year",
      "active": true
    },
    "intelligence_monthly": {
      "lookupKey": "intelligence_monthly",
      "productKey": "intelligence",
      "productName": "Intelligence — Monthly",
      "description": "Monthly Intelligence subscription. Daily privacy intelligence feed, weekly Intelligence Brief, AI investigation prompts. Compliance tools sold separately at standalone rates.",
      "amountCents": 2000,
      "currency": "usd",
      "displayPrice": "$20",
      "displaySuffix": "/month",
      "kind": "subscription",
      "recurringInterval": "month",
      "active": true
    },
    "intelligence_yearly": {
      "lookupKey": "intelligence_yearly",
      "productKey": "intelligence",
      "productName": "Intelligence — Annual (legacy alias)",
      "description": "Legacy lookup key. Mirrors intelligence_annual at the new $200/yr price.",
      "amountCents": 20000,
      "currency": "usd",
      "displayPrice": "$200",
      "displaySuffix": "/year",
      "kind": "subscription",
      "recurringInterval": "year",
      "active": true
    },
    "intelligence_yearly_founding": {
      "lookupKey": "intelligence_yearly_founding",
      "productKey": "intelligence",
      "productName": "Intelligence — Annual (Founding alias)",
      "description": "Retained for backwards-compatibility. Founding subscriber discount is now applied at tool checkout, not on the subscription.",
      "amountCents": 20000,
      "currency": "usd",
      "displayPrice": "$200",
      "displaySuffix": "/year",
      "kind": "subscription",
      "recurringInterval": "year",
      "active": false
    },
    "ir_standalone_v2": {
      "lookupKey": "ir_standalone_v2",
      "productKey": "ir_v8",
      "productName": "Incident Response Playbook (Standalone)",
      "description": "Standalone per-use price for the Incident Response Playbook.",
      "amountCents": 8900,
      "currency": "usd",
      "displayPrice": "$89",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "ir_subscriber_v2": {
      "lookupKey": "ir_subscriber_v2",
      "productKey": "ir_v8",
      "productName": "Incident Response Playbook (Subscriber)",
      "description": "Free for subscribers — bypasses Stripe checkout.",
      "amountCents": 0,
      "currency": "usd",
      "displayPrice": "Free",
      "displaySuffix": "",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_free"
    },
    "ir_topup_v1": {
      "lookupKey": "ir_topup_v1",
      "productKey": "ir_v8",
      "productName": "Incident Response Playbook — 4 additional generations",
      "description": "Meter top-up: adds 4 additional generations on an existing IR Playbook. Half-price policy.",
      "amountCents": 4450,
      "currency": "usd",
      "displayPrice": "$44.50",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "ir_standalone_v2",
      "addonReason": "meter_topup"
    },
    "li_standalone_v2": {
      "lookupKey": "li_standalone_v2",
      "productKey": "lia_v8",
      "productName": "Legitimate Interests Assessment (Standalone)",
      "description": "Standalone per-use price for the LIA Tool.",
      "amountCents": 13900,
      "currency": "usd",
      "displayPrice": "$139",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "li_subscriber_v2": {
      "lookupKey": "li_subscriber_v2",
      "productKey": "lia_v8",
      "productName": "Legitimate Interests Assessment (Subscriber)",
      "description": "Subscriber per-use price for the LIA Tool.",
      "amountCents": 8900,
      "currency": "usd",
      "displayPrice": "$89",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_discount"
    },
    "li_topup_v1": {
      "lookupKey": "li_topup_v1",
      "productKey": "lia_v8",
      "productName": "Legitimate Interests Assessment — 4 additional generations",
      "description": "Meter top-up: adds 4 additional generations on an existing LIA. Half-price policy.",
      "amountCents": 6950,
      "currency": "usd",
      "displayPrice": "$69.50",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "li_standalone_v2",
      "addonReason": "meter_topup"
    },
    "per_client_addon": {
      "lookupKey": "per_client_addon",
      "productKey": "professional",
      "productName": "Per-Client Add-On (legacy alias)",
      "description": "Legacy alias for professional_client. Annual Professional subscription required.",
      "amountCents": 15000,
      "currency": "usd",
      "displayPrice": "$150",
      "displaySuffix": "/client/year",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "professional_annual",
      "addonReason": "multi_client"
    },
    "professional_annual": {
      "lookupKey": "professional_annual",
      "productKey": "professional",
      "productName": "Professional — Annual",
      "description": "Annual Professional subscription. Save $118 — pay for 10 months, get 12. Unlocks client/matter workspace, every Layer-1 tool (Notice Builders, IR Playbook, Biometric, DPA), RoPA (first generation free, plus one free update each subscription year — $39 per additional update), and 3 free Smart Tool runs per year (Accountability, LIA, or DPIA — up to $447 value).",
      "amountCents": 59000,
      "currency": "usd",
      "displayPrice": "$590",
      "displaySuffix": "/year",
      "kind": "subscription",
      "recurringInterval": "year",
      "active": true
    },
    "professional_client": {
      "lookupKey": "professional_client",
      "productKey": "professional",
      "productName": "Professional — Per-Client (Annual)",
      "description": "Additional client workspace for Professional annual subscribers.",
      "amountCents": 15000,
      "currency": "usd",
      "displayPrice": "$150",
      "displaySuffix": "/client/year",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "professional_annual",
      "addonReason": "multi_client"
    },
    "professional_monthly": {
      "lookupKey": "professional_monthly",
      "productKey": "professional",
      "productName": "Professional — Monthly",
      "description": "Monthly Professional subscription. Everything in Intelligence plus the client/matter workspace. Annual subscription required to activate client management.",
      "amountCents": 5900,
      "currency": "usd",
      "displayPrice": "$59",
      "displaySuffix": "/month",
      "kind": "subscription",
      "recurringInterval": "month",
      "active": true
    },
    "registration_additional_filing": {
      "lookupKey": "registration_additional_filing",
      "productKey": "registration",
      "productName": "Registration Filings — Additional Concurrent Jurisdiction",
      "description": "$49 for each additional concurrent jurisdiction filed in the same order ($79 first filing).",
      "amountCents": 4900,
      "currency": "usd",
      "displayPrice": "$49",
      "displaySuffix": " per additional jurisdiction",
      "kind": "one_time",
      "active": true
    },
    "registration_counsel_review": {
      "lookupKey": "registration_counsel_review",
      "productKey": "registration",
      "productName": "Registration Manager — Counsel-Ready Pack",
      "description": "Counsel-ready bundle of jurisdiction-specific registration documents with attorney review notes.",
      "amountCents": 29900,
      "currency": "usd",
      "displayPrice": "$299",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "registration_standalone": {
      "lookupKey": "registration_standalone",
      "productKey": "registration",
      "productName": "Registration Filings — DIY Toolkit (Standalone)",
      "description": "Flat per-filing price for the DPO / DPA / AI Act registration document pack. One price regardless of jurisdiction count.",
      "amountCents": 7900,
      "currency": "usd",
      "displayPrice": "$79",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": true
    },
    "registration_subscriber": {
      "lookupKey": "registration_subscriber",
      "productKey": "registration",
      "productName": "Registration Filings — DIY Toolkit (Subscriber alias)",
      "description": "Subscriber-rate alias (mirrors standalone — no longer discounted) for the DPO / DPA / AI Act registration document pack.",
      "amountCents": 7900,
      "currency": "usd",
      "displayPrice": "$79",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_alias"
    },
    "ropa_annual_additional": {
      "lookupKey": "ropa_annual_additional",
      "productKey": "rofa",
      "productName": "RoPA Builder — Additional Generation (Annual Subscriber)",
      "description": "$39 additional RoPA generation/update for annual subscribers beyond the included initial generation and one update per subscription year.",
      "amountCents": 3900,
      "currency": "usd",
      "displayPrice": "$39",
      "displaySuffix": " per additional generation",
      "kind": "one_time",
      "active": true
    },
    "ropa_initial_standalone": {
      "lookupKey": "ropa_initial_standalone",
      "productKey": "rofa",
      "productName": "RoPA Builder — Initial Generation (Standalone — RETIRED)",
      "description": "Retired: RoPA Builder is subscriber-only. Not sold standalone.",
      "amountCents": 9900,
      "currency": "usd",
      "displayPrice": "$99",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": false
    },
    "ropa_initial_subscriber": {
      "lookupKey": "ropa_initial_subscriber",
      "productKey": "rofa",
      "productName": "RoPA Builder — Initial (Annual Subscriber)",
      "description": "Free for ANNUAL subscribers — the first RoPA generation, once, bypasses Stripe checkout. Monthly subscribers pay ropa_paid_generation ($49).",
      "amountCents": 0,
      "currency": "usd",
      "displayPrice": "Free",
      "displaySuffix": "",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_free"
    },
    "ropa_paid_generation": {
      "lookupKey": "ropa_paid_generation",
      "productKey": "rofa",
      "productName": "RoPA Builder — Generation or Update",
      "description": "$49 RoPA generation/update (monthly subscribers and non-entitled actions). Annual subscribers use ropa_annual_additional ($39) beyond the included initial + one yearly update. NOTE: one-time Stripe Prices with these lookup keys must exist in Stripe before go-live.",
      "amountCents": 4900,
      "currency": "usd",
      "displayPrice": "$49",
      "displaySuffix": "",
      "kind": "one_time",
      "active": true
    },
    "ropa_refresh_standalone": {
      "lookupKey": "ropa_refresh_standalone",
      "productKey": "rofa",
      "productName": "RoPA Builder — Annual Refresh (Standalone — RETIRED)",
      "description": "Retired: RoPA Builder is subscriber-only. Not sold standalone.",
      "amountCents": 7900,
      "currency": "usd",
      "displayPrice": "$79",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": false
    },
    "ropa_refresh_subscriber": {
      "lookupKey": "ropa_refresh_subscriber",
      "productKey": "rofa",
      "productName": "RoPA Builder — Annual Update (Annual Subscriber, credit)",
      "description": "Free for ANNUAL subscribers on the FIRST update of each subscription year, redeemed against the RoPA annual credit (1 per year, both tiers). Later updates in the same year cost ropa_annual_additional ($39).",
      "amountCents": 0,
      "currency": "usd",
      "displayPrice": "Free",
      "displaySuffix": "",
      "kind": "addon",
      "active": true,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_free"
    },
    "us_notice_v7_standalone": {
      "lookupKey": "us_notice_v7_standalone",
      "productKey": "us_notice_v8",
      "productName": "US Privacy Notice Builder (Standalone — RETIRED)",
      "description": "Retired: US Privacy Notice Builder is subscriber-only. Not sold standalone.",
      "amountCents": 2500,
      "currency": "usd",
      "displayPrice": "$25",
      "displaySuffix": " flat",
      "kind": "one_time",
      "active": false
    },
    "us_notice_v7_subscriber": {
      "lookupKey": "us_notice_v7_subscriber",
      "productKey": "us_notice_v8",
      "productName": "US Privacy Notice Builder (Subscriber alias)",
      "description": "Subscriber-rate alias (mirrors standalone — no longer discounted) for any US notice variant.",
      "amountCents": 2000,
      "currency": "usd",
      "displayPrice": "$20",
      "displaySuffix": " flat",
      "kind": "addon",
      "active": false,
      "parentLookupKey": "intelligence_annual",
      "addonReason": "subscriber_alias"
    }
  },
  "tools": {
    "biometric": {
      "name": "Biometric Compliance Check",
      "dollars": 79,
      "cents": 7900,
      "display": "$79",
      "stripePriceId": "biometric_standalone_v2"
    },
    "cppaAdmt": {
      "name": "ADMT Compliance Assessment",
      "dollars": 149,
      "cents": 14900,
      "display": "$149",
      "stripePriceId": "cppa_admt_standalone"
    },
    "cppaCyber": {
      "name": "CPPA Cybersecurity Readiness",
      "dollars": 399,
      "cents": 39900,
      "display": "$399",
      "stripePriceId": "cppa_cyber_standalone"
    },
    "cppaRisk": {
      "name": "CPPA Risk Assessment",
      "dollars": 299,
      "cents": 29900,
      "display": "$299",
      "stripePriceId": "cppa_risk_standalone"
    },
    "cppaScope": {
      "name": "CPPA Scope Checker",
      "dollars": 0,
      "cents": 0,
      "display": "Free",
      "stripePriceId": null
    },
    "cppaSuite": {
      "name": "CPPA Full Audit Suite",
      "dollars": 599,
      "cents": 59900,
      "display": "$599",
      "stripePriceId": "cppa_suite_standalone"
    },
    "cppa_admt": {
      "name": "ADMT Compliance Assessment",
      "dollars": 149,
      "cents": 14900,
      "display": "$149",
      "stripePriceId": "cppa_admt_standalone"
    },
    "cppa_cyber": {
      "name": "CPPA Cybersecurity Readiness",
      "dollars": 399,
      "cents": 39900,
      "display": "$399",
      "stripePriceId": "cppa_cyber_standalone"
    },
    "cppa_risk": {
      "name": "CPPA Risk Assessment",
      "dollars": 299,
      "cents": 29900,
      "display": "$299",
      "stripePriceId": "cppa_risk_standalone"
    },
    "cppa_scope": {
      "name": "CPPA Scope Checker",
      "dollars": 0,
      "cents": 0,
      "display": "Free",
      "stripePriceId": null
    },
    "cppa_suite": {
      "name": "CPPA Full Audit Suite",
      "dollars": 599,
      "cents": 59900,
      "display": "$599",
      "stripePriceId": "cppa_suite_standalone"
    },
    "dpa": {
      "name": "Custom DPA Generator",
      "dollars": 69,
      "cents": 6900,
      "display": "$69",
      "stripePriceId": "dpa_standalone_v2"
    },
    "dpia": {
      "name": "Data Protection Impact Assessment",
      "dollars": 149,
      "cents": 14900,
      "display": "$149",
      "stripePriceId": "dpia_standalone_v2"
    },
    "euNotice": {
      "name": "EU / Global Privacy Notice Builder",
      "dollars": 0,
      "cents": 0,
      "display": "Included with subscription",
      "stripePriceId": null
    },
    "eu_notice": {
      "name": "EU / Global Privacy Notice Builder",
      "dollars": 0,
      "cents": 0,
      "display": "Included with subscription",
      "stripePriceId": null
    },
    "governance": {
      "name": "GDPR Accountability Assessment",
      "dollars": 119,
      "cents": 11900,
      "display": "$119",
      "stripePriceId": "hc_standalone_v2"
    },
    "irPlaybook": {
      "name": "Breach IR Playbook",
      "dollars": 89,
      "cents": 8900,
      "display": "$89",
      "stripePriceId": "ir_standalone_v2"
    },
    "ir_playbook": {
      "name": "Breach IR Playbook",
      "dollars": 89,
      "cents": 8900,
      "display": "$89",
      "stripePriceId": "ir_standalone_v2"
    },
    "lia": {
      "name": "Legitimate Interests Assessment",
      "dollars": 139,
      "cents": 13900,
      "display": "$139",
      "stripePriceId": "li_standalone_v2"
    },
    "registration": {
      "name": "Registration Filings",
      "dollars": 79,
      "cents": 7900,
      "display": "$79",
      "stripePriceId": "registration_standalone"
    },
    "ropa": {
      "name": "RoPA Builder",
      "dollars": 49,
      "cents": 4900,
      "display": "Free (annual) · $49/generation ($39 additional for annual)",
      "stripePriceId": "ropa_paid_generation"
    },
    "usNotice": {
      "name": "US Privacy Notice Builder",
      "dollars": 0,
      "cents": 0,
      "display": "Included with subscription",
      "stripePriceId": null
    },
    "us_notice": {
      "name": "US Privacy Notice Builder",
      "dollars": 0,
      "cents": 0,
      "display": "Included with subscription",
      "stripePriceId": null
    }
  }
} /* SNAPSHOT-JSON-END */;

export const PRICING_REGISTRY_SNAPSHOT: Readonly<Record<string, SnapshotRegistryEntry>> = SNAPSHOT.registry;
export const TOOL_STANDALONE_SNAPSHOT: Readonly<Record<string, SnapshotToolEntry>> = SNAPSHOT.tools;

/** Cents for a registry lookup key. Throws on an unknown key — a typo must fail loudly, never charge $0. */
export function registryCents(lookupKey: string): number {
  const entry = PRICING_REGISTRY_SNAPSHOT[lookupKey];
  if (!entry) throw new Error(`pricing-snapshot: unknown lookup key "${lookupKey}"`);
  return entry.amountCents;
}

/** Every registry entry, in lookup-key order. */
export function registryEntries(): SnapshotRegistryEntry[] {
  return Object.values(PRICING_REGISTRY_SNAPSHOT);
}
