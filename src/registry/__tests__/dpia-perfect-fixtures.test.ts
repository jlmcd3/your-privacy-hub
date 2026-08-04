// TRULY-PERFECT DPIA FIXTURES — pin test.
//
// DPIA_PERFECT exists so that an A/B batch labelled "perfect" grades
// perfect-record WRITING. These tests assert (a) contract cleanliness,
// (b) completeness against every contract key, and (c) that the variant
// resolver routes "perfect" to the new set for dpia only, leaving every
// other tool and the legacy null path untouched.

import { describe, it, expect } from "vitest";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework";
import { DPIA_PERFECT, DPIA_GOLDEN } from "../../../supabase/functions/_shared/golden/dpia";
import { GOLDEN_BY_TOOL, casesForVariant } from "../../../supabase/functions/_shared/golden/registry";

const EXEMPT = new Set([
  "source_assessment_id",
  "controller_land",
  "eu_decision_establishment_country",
]);

function filled(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  return true;
}

describe("DPIA_PERFECT — truly-complete-record fixtures", () => {
  it("contains exactly the two authored cases", () => {
    expect(DPIA_PERFECT.map((c) => c.id)).toEqual([
      "dpia-perfect-eu-complete",
      "dpia-perfect-uk-complete",
    ]);
  });

  for (const c of DPIA_PERFECT) {
    it(`${c.id} validates against the DPIA contract with zero violations`, () => {
      const res = validateIntake(dpiaFrameworkContract, c.intake as Record<string, unknown>);
      const detail = res.ok ? "" : res.violations.map((v) => `${v.key}: ${v.reason}`).join("; ");
      expect(detail).toBe("");
      expect(res.ok).toBe(true);
    });

    it(`${c.id} fills every contract key except the documented exemptions`, () => {
      const intake = c.intake as Record<string, unknown>;
      const missing = dpiaFrameworkContract.fields
        .map((f) => f.key)
        .filter((k) => !EXEMPT.has(k) && !filled(intake[k]));
      expect(missing).toEqual([]);
    });
  }

  it("the DE case fills controller_land and eu_decision_establishment_country", () => {
    const de = DPIA_PERFECT[0].intake as Record<string, unknown>;
    expect(de.controller_land).toBe("Bavaria");
    expect(de.eu_decision_establishment_country).toBe("DE");
  });

  it("the GB case may leave those two blank", () => {
    const gb = DPIA_PERFECT[1].intake as Record<string, unknown>;
    expect(gb.controller_land).toBe("");
    expect(gb.eu_decision_establishment_country).toBe("");
  });
});

describe("casesForVariant — perfect routing", () => {
  it("dpia / perfect returns exactly the two new cases in order", () => {
    expect(casesForVariant("dpia", "perfect")).toEqual(DPIA_PERFECT);
  });

  it("governance / perfect still returns its GOLDEN_BY_TOOL set", () => {
    expect(casesForVariant("governance", "perfect")).toEqual(GOLDEN_BY_TOOL["governance"]);
  });

  it("dpia / null is unchanged (legacy golden set)", () => {
    expect(casesForVariant("dpia", null)).toEqual(DPIA_GOLDEN);
    expect(casesForVariant("dpia", null)).toBe(GOLDEN_BY_TOOL["dpia"]);
  });
});
