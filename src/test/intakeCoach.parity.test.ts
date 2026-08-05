// ITEM 381 — PARITY GUARD.
//
// The coach's browser-side asked-key mirror must agree with the item380r5 gate
// EXACTLY. If the gate changes (or a contract gains a trigger, a SYSTEM_KEY, or
// an emptyIsAnswer marker) and the mirror does not, this test fails.

import { describe, expect, it } from "vitest";
import { coachEmptyAskedKeys, type CoachContract } from "@/lib/intakeCoach/askedKeys";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import { emptyAskedKeys } from "../../supabase/functions/_shared/ltp/record-complete";
import { DPIA_GOLDEN, DPIA_PERFECT } from "../../supabase/functions/_shared/golden/dpia";
import { CPPA_RISK_GOLDEN, CPPA_RISK_PERFECT } from "../../supabase/functions/_shared/golden/cppa-risk";

type Fx = { id: string; intake: Record<string, unknown> };

const cases: Array<{ product: "dpia" | "cppa_risk"; fixtures: readonly Fx[] }> = [
  { product: "dpia", fixtures: [...(DPIA_GOLDEN as unknown as Fx[]), ...(DPIA_PERFECT as unknown as Fx[])] },
  { product: "cppa_risk", fixtures: [...(CPPA_RISK_GOLDEN as unknown as Fx[]), ...(CPPA_RISK_PERFECT as unknown as Fx[])] },
];

describe("intake coach — parity with the record-complete gate", () => {
  for (const { product, fixtures } of cases) {
    const contract = COACH_CONTRACTS[product] as CoachContract;
    for (const fx of fixtures) {
      it(`${product}/${fx.id}: mirror matches emptyAskedKeys`, () => {
        const gate = [...emptyAskedKeys(contract as never, fx.intake ?? {})].sort();
        const mirror = [...coachEmptyAskedKeys(contract, fx.intake ?? {})].sort();
        expect(mirror).toEqual(gate);
      });
    }
  }

  it("perfect fixtures leave nothing unanswered on either side", () => {
    for (const fx of DPIA_PERFECT as unknown as Fx[]) {
      expect(coachEmptyAskedKeys(COACH_CONTRACTS.dpia as CoachContract, fx.intake)).toEqual([]);
    }
    for (const fx of CPPA_RISK_PERFECT as unknown as Fx[]) {
      expect(coachEmptyAskedKeys(COACH_CONTRACTS.cppa_risk as CoachContract, fx.intake)).toEqual([]);
    }
  });
});
