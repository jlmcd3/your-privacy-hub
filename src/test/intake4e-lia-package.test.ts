// INTAKE-4e — LIA intake package stability battery.
//
// The proposed merges on the three rows were REJECTED. This battery pins that
// the rows stay separate, keys and option strings are byte-identical, and the
// only new behaviour is click-gated prefill-as-confirmation.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liAssessmentStageBContract } from "../../supabase/functions/_shared/intake-contracts/li-assessment";
import { HARM_PREFILL } from "../pages/LIAssessmentIntake";

const page = readFileSync("src/pages/LIAssessmentIntake.tsx", "utf8");
const keys = liAssessmentStageBContract.fields.map((f) => f.key);

describe("INTAKE-4e — LIA intake package", () => {
  it("keeps the three rows on their original keys — no merges", () => {
    for (const k of [
      "balancing_details.vulnerable_subjects",
      "balancing_details.vulnerable_subjects_other",
      "balancing_details.potential_harms",
      "balancing_details.opt_out_mechanism",
    ]) {
      expect(keys).toContain(k);
    }
    expect(page).toContain("value={vulnerableSubjects}");
    expect(page).toContain("value={potentialHarms}");
    expect(page).toContain("value={optOutMechanism}");
  });

  it("keeps the stored option strings byte-identical", () => {
    for (const opt of [
      "Children under 16",
      "Financially vulnerable",
      "Loss of autonomy or control over data",
      "Identity theft or fraud exposure",
    ]) {
      expect(page).toContain(`"${opt}"`);
    }
  });

  it("offers prefill as confirmation, never a silent copy", () => {
    expect(page).toContain("Use my earlier answer");
    expect(page).toContain("Start from my earlier answer");
  });

  it("prefills harms only from the customer's own narrative, verbatim options", () => {
    expect(HARM_PREFILL("")).toEqual([]);
    expect(HARM_PREFILL("minor")).toEqual([]);
    const out = HARM_PREFILL(
      "Individuals could suffer financial loss and reputational damage if the data leaked.",
    );
    expect(out).toEqual(["Financial loss", "Reputational damage"]);
  });
});
