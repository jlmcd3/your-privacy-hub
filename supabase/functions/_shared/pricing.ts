// SHARED TOOL PRICE CATALOG — the edge-side view of the master price list.
//
// QA batch 2026-09-05 (Codex purchase-flow review): create-tool-checkout,
// get-tool-price and sync-pricing each carried a HAND-COPIED cents table and
// two of them were still on v11 (2026-06-11). Seven checkouts therefore
// charged amounts that disagreed with the site. Every cents figure now comes
// from pricing-snapshot.ts, a GENERATED projection of src/config/pricing.ts
// (regenerate: `deno run --allow-read --allow-write
// scripts/pricing/generate-pricing-snapshot.ts`; guarded by
// src/test/pricingSnapshot.test.ts). This module adds only the slug → lookup
// key / table / classification wiring — no amounts live here.

import { registryCents } from "./pricing-snapshot.ts";

export interface ToolCatalogEntry {
  /** Customer-facing line-item name (Stripe receipt, get-tool-price tool_name). */
  name: string;
  standalone_lookup: string;
  subscriber_lookup: string | null;
  /** Table the purchase row lives on. */
  table: string;
  classification: "smart" | "convenience";
  /**
   * Included with any active subscription and never sold standalone (RoPA,
   * US/EU Notice variants). Their retired registry entries still carry the
   * old amounts, so the catalog reports $0 for them rather than reading a
   * retired price.
   */
  subscription_only?: true;
}

export const TOOL_CATALOG: Record<string, ToolCatalogEntry> = {
  li_assessment: {
    name: "Legitimate Interests Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    table: "li_assessments",
    classification: "smart",
  },
  governance_assessment: {
    name: "Privacy Program Assessment Tool",
    standalone_lookup: "hc_standalone_v2",
    subscriber_lookup: "hc_subscriber_v2",
    table: "governance_assessments",
    classification: "smart",
  },
  dpia_framework: {
    name: "Data Protection Impact Assessment (DPIA)",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    table: "dpia_frameworks",
    classification: "smart",
  },
  dpa_generator: {
    name: "Your Custom DPA",
    standalone_lookup: "dpa_standalone_v2",
    subscriber_lookup: "dpa_subscriber_v2",
    table: "dpa_documents",
    classification: "smart",
  },
  ir_playbook: {
    name: "Your Incident Response Playbook",
    standalone_lookup: "ir_standalone_v2",
    subscriber_lookup: "ir_subscriber_v2",
    table: "ir_playbooks",
    classification: "convenience",
  },
  biometric_checker: {
    name: "Biometric Privacy Compliance Checker",
    standalone_lookup: "biometric_standalone_v2",
    subscriber_lookup: "biometric_subscriber_v2",
    table: "biometric_assessments",
    classification: "smart",
  },
  ropa_initial: {
    name: "Record of Processing Activities (RoPA) — Initial Generation",
    standalone_lookup: "ropa_initial_standalone",
    subscriber_lookup: "ropa_initial_subscriber",
    table: "ropa_sessions",
    classification: "convenience",
    subscription_only: true,
  },
  ropa_refresh: {
    name: "Record of Processing Activities (RoPA) — Annual Refresh",
    standalone_lookup: "ropa_refresh_standalone",
    subscriber_lookup: "ropa_refresh_subscriber",
    table: "ropa_sessions",
    classification: "convenience",
    subscription_only: true,
  },
  us_notice_single: {
    name: "US Privacy Notice — Single State",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    table: "us_notice_sessions",
    classification: "convenience",
    subscription_only: true,
  },
  us_notice_all_states: {
    name: "US Privacy Notice — All States Suite",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    table: "us_notice_sessions",
    classification: "convenience",
    subscription_only: true,
  },
  us_notice_refresh: {
    name: "US Notice — Annual Refresh",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    table: "us_notice_sessions",
    classification: "convenience",
    subscription_only: true,
  },
  eu_notice_single: {
    name: "EU & Global Notice — Single Framework",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    classification: "convenience",
    subscription_only: true,
  },
  eu_notice_suite: {
    name: "EU Notice Suite — GDPR + UK GDPR + FADP",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    classification: "convenience",
    subscription_only: true,
  },
  eu_notice_full_international: {
    name: "EU & Global Notice — Full International",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    classification: "convenience",
    subscription_only: true,
  },
  eu_notice_refresh: {
    name: "EU & Global Notice — Annual Refresh",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    classification: "convenience",
    subscription_only: true,
  },
  cppa_risk_assessment: {
    name: "CPPA Risk Assessment — Module 1",
    standalone_lookup: "cppa_risk_standalone",
    subscriber_lookup: "cppa_risk_subscriber",
    table: "cppa_assessments",
    classification: "smart",
  },
  cppa_cybersecurity: {
    name: "CPPA Cybersecurity Readiness — Module 2",
    standalone_lookup: "cppa_cyber_standalone",
    subscriber_lookup: "cppa_cyber_subscriber",
    table: "cppa_assessments",
    classification: "smart",
  },
  cppa_suite: {
    name: "CPPA Full Audit Suite",
    standalone_lookup: "cppa_suite_standalone",
    subscriber_lookup: "cppa_suite_subscriber",
    table: "cppa_assessments",
    classification: "smart",
  },
  cppa_admt: {
    name: "ADMT Compliance Assessment — Module 3",
    standalone_lookup: "cppa_admt_standalone",
    subscriber_lookup: "cppa_admt_subscriber",
    table: "cppa_assessments",
    classification: "smart",
  },
};

/** Legacy slug aliases accepted by get-tool-price. */
export const TOOL_SLUG_ALIASES: Record<string, string> = {
  healthcheck: "governance_assessment",
  li_analyzer: "li_assessment",
  dpia_builder: "dpia_framework",
};

export function resolveToolSlug(slug: string): string {
  return TOOL_SLUG_ALIASES[slug] ?? slug;
}

/** Standalone (non-subscriber) cents for a catalog slug, from the snapshot. */
export function toolStandaloneCents(slug: string): number {
  const tool = TOOL_CATALOG[resolveToolSlug(slug)];
  if (!tool) throw new Error(`pricing: unknown tool slug "${slug}"`);
  if (tool.subscription_only) return 0;
  return registryCents(tool.standalone_lookup);
}

/** Subscriber per-use cents for a catalog slug, from the snapshot ($0 = included). */
export function toolSubscriberCents(slug: string): number {
  const tool = TOOL_CATALOG[resolveToolSlug(slug)];
  if (!tool) throw new Error(`pricing: unknown tool slug "${slug}"`);
  if (tool.subscription_only) return 0;
  if (!tool.subscriber_lookup) return toolStandaloneCents(slug);
  return registryCents(tool.subscriber_lookup);
}

// v10: Layer-2 subscriber rates require an ANNUAL subscription; monthly
// subscribers pay the standalone rate. Mirrors ANNUAL_GATED_SUBSCRIBER_RATE_KEYS
// in src/config/pricing.ts.
export const ANNUAL_GATED_TOOLS = new Set([
  "li_assessment",
  "governance_assessment",
  "dpia_framework",
  "cppa_risk_assessment",
  "cppa_cybersecurity",
  "cppa_suite",
  "cppa_admt",
]);

// v13 (2026-08-29, LAUNCH REPRICING): included ($0) for PROFESSIONAL
// subscribers only. Intelligence subscribers pay the standalone rate on these
// three. Mirrors PROFESSIONAL_ONLY_INCLUDED_TOOL_KEYS in src/config/pricing.ts.
export const PROFESSIONAL_INCLUDED_TOOLS = new Set(["ir_playbook", "biometric_checker", "dpa_generator"]);

// Included with ANY active subscription; never sold standalone.
export const SUBSCRIPTION_ONLY_TOOLS = new Set(
  Object.entries(TOOL_CATALOG).filter(([, t]) => t.subscription_only).map(([slug]) => slug),
);

/**
 * Compare the registry amount with what Stripe currently holds under the
 * lookup key. Amounts are ALWAYS charged from the registry (line items use
 * price_data); this only reports drift so the operator knows to run
 * sync-pricing. Returns the log record, or null when they agree.
 */
export function describePriceDrift(
  lookupKey: string,
  registryAmountCents: number,
  stripeUnitAmount: number | null | undefined,
): Record<string, unknown> | null {
  if (typeof stripeUnitAmount !== "number") {
    return { evt: "pricing_drift", lookup_key: lookupKey, registry_cents: registryAmountCents, stripe_cents: null, note: "no Stripe price under this lookup key — run sync-pricing" };
  }
  if (stripeUnitAmount === registryAmountCents) return null;
  return { evt: "pricing_drift", lookup_key: lookupKey, registry_cents: registryAmountCents, stripe_cents: stripeUnitAmount, note: "Stripe Price object is stale — customer charged the registry amount; run sync-pricing" };
}
