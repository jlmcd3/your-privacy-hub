import { describe, it, expect } from "vitest";
import { entitlementFor, describeClientAccess, type PlanKey } from "@/lib/entitlements";
import { ANNUAL_CREDIT, INCLUDED_TOOL_KEYS, ANNUAL_CREDIT_ELIGIBLE_KEYS } from "@/config/pricing";

// Table-driven entitlement matrix. Copy drift trips these tests.
const CASES: Array<{
  plan: PlanKey;
  isSubscriber: boolean;
  isAnnual: boolean;
  clients: boolean;
  credits: number;
}> = [
  { plan: "anonymous",              isSubscriber: false, isAnnual: false, clients: false, credits: 0 },
  { plan: "intelligence_monthly",   isSubscriber: true,  isAnnual: false, clients: false, credits: 0 },
  { plan: "intelligence_annual",    isSubscriber: true,  isAnnual: true,  clients: false, credits: ANNUAL_CREDIT.intelligenceAnnual },
  // Professional MONTHLY: no client workspaces, no annual credit.
  { plan: "professional_monthly",   isSubscriber: true,  isAnnual: false, clients: false, credits: 0 },
  { plan: "professional_annual",    isSubscriber: true,  isAnnual: true,  clients: true,  credits: ANNUAL_CREDIT.professionalAnnualPerClient },
];

describe("entitlements", () => {
  for (const c of CASES) {
    it(`${c.plan} matrix is correct`, () => {
      const e = entitlementFor(c.plan);
      expect(e.isSubscriber).toBe(c.isSubscriber);
      expect(e.isAnnual).toBe(c.isAnnual);
      expect(e.clientWorkspacesUnlocked).toBe(c.clients);
      expect(e.annualCreditCount).toBe(c.credits);
    });
  }

  it("Professional monthly never implies client management", () => {
    const e = entitlementFor("professional_monthly");
    expect(e.clientWorkspacesUnlocked).toBe(false);
    expect(e.perClientAddonDisplay).toBeNull();
    expect(describeClientAccess("professional_monthly")).toMatch(/annual/i);
  });

  it("Professional annual unlocks clients and exposes add-on price", () => {
    const e = entitlementFor("professional_annual");
    expect(e.clientWorkspacesUnlocked).toBe(true);
    expect(e.perClientAddonDisplay).toBeTruthy();
    expect(describeClientAccess("professional_annual")).toMatch(/unlocked/i);
  });

  it("Included-tools list agrees with pricing.ts across all subscriber plans", () => {
    for (const p of ["intelligence_monthly","intelligence_annual","professional_monthly","professional_annual"] as PlanKey[]) {
      expect(entitlementFor(p).includedTools).toEqual(INCLUDED_TOOL_KEYS);
    }
  });

  it("Annual credits redeemable only on Governance/LIA/DPIA", () => {
    for (const p of ["intelligence_annual","professional_annual"] as PlanKey[]) {
      expect(entitlementFor(p).annualCreditEligibleTools).toEqual(ANNUAL_CREDIT_ELIGIBLE_KEYS);
    }
  });
});
