/**
 * Item 6 — Typed entitlement helper.
 *
 * SOURCE OF TRUTH: src/config/pricing.ts (PRICING_REGISTRY,
 * INCLUDED_TOOL_KEYS, ANNUAL_CREDIT_ELIGIBLE_KEYS, ANNUAL_CREDIT).
 *
 * This helper flattens the plan/tier matrix into a single typed object per
 * subscription state so UI copy stops re-deriving the same facts (and
 * drifting). All fields are DERIVED — nothing here is hardcoded copy that
 * duplicates pricing.ts.
 *
 * KEY POLICY BEING ENCODED (v13, LAUNCH REPRICING 2026-08-29):
 *  - Client / matter workspace management is an ANNUAL-Professional feature.
 *    The $150/client/year add-on is annual-only; monthly Professional does
 *    NOT unlock client management.
 *  - v13: the Layer-1 bundle is SPLIT BY TIER. Intelligence (any cadence)
 *    includes the two notice builders only. DPA, IR Playbook and Biometric
 *    are PROFESSIONAL benefits (any cadence) — Intelligence subscribers pay
 *    the standalone rate for them. This closes the $20-month →
 *    generate-everything → cancel arbitrage.
 *  - v12 (2026-08-11): RoPA is NOT in the flat Layer-1 bundle. Annual
 *    subscribers get the first generation free plus one free update per
 *    subscription year (own credit pool, 1/yr both tiers); further annual
 *    actions are $39 (ropa_annual_additional) and every monthly-subscriber
 *    RoPA action is $49 (ropa_paid_generation).
 *  - Annual credits: Intelligence annual = 1/yr, Professional annual = 3/yr.
 *    Redeemable on Governance / LIA / DPIA. RoPA is credit-eligible but draws
 *    on its own separate 1/yr pool, not this one.
 */

import {
  PRICING,
  INCLUDED_TOOL_KEYS,
  INTELLIGENCE_INCLUDED_TOOL_KEYS,
  ANNUAL_CREDIT_ELIGIBLE_KEYS,
  ANNUAL_CREDIT,
} from "@/config/pricing";

export type PlanKey =
  | "anonymous"
  | "intelligence_monthly"
  | "intelligence_annual"
  | "professional_monthly"
  | "professional_annual";

export interface Entitlement {
  planKey: PlanKey;
  planLabel: string;
  isSubscriber: boolean;
  isAnnual: boolean;
  /** Layer 1 — tools bundled at no extra charge. */
  includedTools: readonly string[];
  /** Layer 3 — tools redeemable with the annual credit. */
  annualCreditEligibleTools: readonly string[];
  annualCreditCount: number;
  /** True only for Professional ANNUAL. Monthly Professional does not
   *  unlock client management (the $150/client/year add-on is annual-only). */
  clientWorkspacesUnlocked: boolean;
  /** Optional per-client add-on price string (annual only). */
  perClientAddonDisplay: string | null;
}

// v13 split: Intelligence = notice builders only; Professional = full Layer-1.
const INTELLIGENCE_INCLUDED = INTELLIGENCE_INCLUDED_TOOL_KEYS as readonly string[];
const PROFESSIONAL_INCLUDED = INCLUDED_TOOL_KEYS as readonly string[];

export function entitlementFor(planKey: PlanKey): Entitlement {
  const perClient = PRICING.professional.perClient?.display ?? "$150";
  const base = {
    includedTools: [] as readonly string[],
    annualCreditEligibleTools: ANNUAL_CREDIT_ELIGIBLE_KEYS as readonly string[],
    annualCreditCount: 0,
    clientWorkspacesUnlocked: false,
    perClientAddonDisplay: null as string | null,
  };
  switch (planKey) {
    case "anonymous":
      return {
        planKey,
        planLabel: "Anonymous",
        isSubscriber: false,
        isAnnual: false,
        ...base,
        annualCreditEligibleTools: [],
      };
    case "intelligence_monthly":
      return {
        planKey,
        planLabel: "Intelligence — Monthly",
        isSubscriber: true,
        isAnnual: false,
        ...base,
        includedTools: INTELLIGENCE_INCLUDED,
      };
    case "intelligence_annual":
      return {
        planKey,
        planLabel: "Intelligence — Annual",
        isSubscriber: true,
        isAnnual: true,
        ...base,
        includedTools: INTELLIGENCE_INCLUDED,
        annualCreditCount: ANNUAL_CREDIT.intelligenceAnnual,
      };
    case "professional_monthly":
      return {
        planKey,
        planLabel: "Professional — Monthly",
        isSubscriber: true,
        isAnnual: false,
        ...base,
        includedTools: PROFESSIONAL_INCLUDED,
        // Deliberate: monthly Professional does NOT unlock client mgmt.
        clientWorkspacesUnlocked: false,
      };
    case "professional_annual":
      return {
        planKey,
        planLabel: "Professional — Annual",
        isSubscriber: true,
        isAnnual: true,
        includedTools: PROFESSIONAL_INCLUDED,
        annualCreditEligibleTools: ANNUAL_CREDIT_ELIGIBLE_KEYS as readonly string[],
        annualCreditCount: ANNUAL_CREDIT.professionalAnnualPerClient,
        clientWorkspacesUnlocked: true,
        perClientAddonDisplay: perClient,
      };
  }
}

/** Copy-safe single-sentence descriptor of what a plan unlocks re: clients. */
export function describeClientAccess(planKey: PlanKey): string {
  const e = entitlementFor(planKey);
  if (e.planKey === "professional_annual") {
    return `Client / matter workspaces unlocked. Add clients at ${e.perClientAddonDisplay}/client/year.`;
  }
  if (e.planKey === "professional_monthly") {
    return "Client / matter workspace management requires the annual Professional plan.";
  }
  return "Client / matter workspace management is a Professional (annual) feature.";
}
