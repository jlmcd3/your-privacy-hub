// INTAKE-4c — ADMT intake package.
//
// The item was a wording pass plus prefill-as-confirmation wiring. No intake
// key was added, removed, or renamed, and no option list changed. These tests
// hold that line: the contract keys and the page's option lists stay exactly
// where they were, so stored drafts and golden fixtures keep resolving.

import { describe, it, expect } from "vitest";
import { cppaAdmtContract } from "../../supabase/functions/_shared/intake-contracts/cppa-admt";
import { ADMT_AFFECTED_POPULATION_BAND_OPTS } from "../pages/admt/ADMTChecker.enums";

const keys = new Set(cppaAdmtContract.fields.map((f) => f.key));

describe("INTAKE-4c — ADMT contract stability", () => {
  it("keeps every prefill-touched row as its own intake key", () => {
    for (const k of [
      "affected_population_band",
      "notice_full_text",
      "access_logic_disclosure",
      "access_outcome_disclosure",
      "training_data_use",
    ]) {
      expect(keys.has(k)).toBe(true);
    }
  });

  it("keeps the affected-population band optional and its options unchanged", () => {
    const field = cppaAdmtContract.fields.find((f) => f.key === "affected_population_band")!;
    expect(field.required).toBe("optional");
    expect(field.options).toEqual([...ADMT_AFFECTED_POPULATION_BAND_OPTS]);
  });
});
