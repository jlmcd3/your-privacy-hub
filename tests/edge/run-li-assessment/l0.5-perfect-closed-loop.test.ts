// LIA L0.5 D1 — closed-loop perfect fixture checker.
//
// Pins the two LIA_PERFECT_PINNED fixtures, the automated_decision_analysis
// mandatory-degradation carve-out, and the mutation battery proving the
// checker actually bites. Analogous to rk0.5-perfect-closed-loop.test.ts.
//
// D-disciplines satisfied here:
//   D1 — fixtures proved against the checker (both LIA_PERFECT_PINNED pass);
//        mutation battery proves the checker rejects a real regression.
//   D2 — every core acceptance-predicate branch reachable as a distinct
//        deficiency, enumerated from build.ts/build-upgrade4.ts directly
//        (not imagined): reasonable_expectations, child_factor,
//        public_authority_exclusion, lia_determination, and all eight
//        UPGRADE-4 surfaces.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  checkPerfectLiaIntake,
  deficiencyLines,
  PERFECT_LIA_CLOSED_LOOP_VERSION,
} from "../../../supabase/functions/_tests/quality/perfect-closed-loop-lia.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/lia-perfect-pinned.ts";

// deno-lint-ignore no-explicit-any
function clone(o: unknown): any {
  return JSON.parse(JSON.stringify(o));
}

const REFERENCE_INTAKE = LIA_PERFECT_PINNED[0].intake as Record<string, unknown>;

Deno.test("L0.5 — version stamp is pinned", () => {
  assertEquals(PERFECT_LIA_CLOSED_LOOP_VERSION, "perfect-lia-closed-loop@l0.5-2026-08-25");
});

// Both pinned fixtures must pass the closed-loop check, with the expected
// (not accidental) automated_decision_analysis degradation.
for (const c of LIA_PERFECT_PINNED) {
  Deno.test(`L0.5 — ${c.id} passes the closed-loop check`, () => {
    const res = checkPerfectLiaIntake(c.intake);
    assertEquals(res.ok, true, `${c.id} deficiencies: ${deficiencyLines(res.deficiencies).join(" | ")}`);
  });

  Deno.test(`L0.5 — ${c.id} carries the expected EU automated_decision_analysis degradation`, () => {
    const res = checkPerfectLiaIntake(c.intake);
    assertEquals(res.ok, true);
    assertEquals(res.admRegime, "eu");
  });
}

Deno.test("L0.5 — a minimal/thin intake is rejected", () => {
  const res = checkPerfectLiaIntake({ organization_name: "Thin Co" });
  assertEquals(res.ok, false);
  assert(res.deficiencies.length > 0);
});

Deno.test("L0.5 — a build error yields a build deficiency, not a throw", () => {
  const res = checkPerfectLiaIntake(null);
  assertEquals(res.ok, false);
  assert(res.deficiencies.length > 0);
});

// ── Mutation battery — one deletion per acceptance-predicate branch,
// proving the checker actually detects the SPECIFIC gap it claims to. ──────

Deno.test("L0.5 mutation — dropping balancing_details.collection_context reopens reasonable_expectations", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.balancing_details.collection_context = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("reasonable_expectations:")),
    `Expected reasonable_expectations deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping balancing_details.children_data_subjects reopens child_factor", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.balancing_details.children_data_subjects = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("child_factor:")),
    `Expected child_factor deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping purpose_details.controller_is_public_authority reopens public_authority_exclusion", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.purpose_details.controller_is_public_authority = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("public_authority_exclusion:")),
    `Expected public_authority_exclusion deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping stated_purpose AND purpose_details.interest_statement reopens lia_determination", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.stated_purpose = "";
  intake.purpose_details.interest_statement = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("lia_determination:")),
    `Expected lia_determination deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping purpose_details.interest_type reopens interest_legitimacy", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.purpose_details.interest_type = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("interest_legitimacy:")),
    `Expected interest_legitimacy deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping purpose_details.specific_benefit reopens benefit_and_beneficiary", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.purpose_details.specific_benefit = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("benefit_and_beneficiary:")),
    `Expected benefit_and_beneficiary deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping necessity_details.alternatives AND alternatives_considered reopens alternatives_considered", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.necessity_details.alternatives = "";
  intake.alternatives_considered = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("alternatives_considered:")),
    `Expected alternatives_considered deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping balancing_details.relationship_category AND relationship_type reopens relationship_with_individual", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.balancing_details.relationship_category = "";
  intake.relationship_type = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("relationship_with_individual:")),
    `Expected relationship_with_individual deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping all three scale/frequency/duration fields reopens scale_frequency_duration", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.balancing_details.scale_approx = "";
  intake.balancing_details.frequency = "";
  intake.balancing_details.duration = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("scale_frequency_duration:")),
    `Expected scale_frequency_duration deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping potential_harm AND potential_harms reopens potential_harms", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.balancing_details.potential_harm = "";
  intake.balancing_details.potential_harms = [];
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("potential_harms:")),
    `Expected potential_harms deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping opt_out_available AND opt_out_mechanism reopens opt_out_feasibility", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.balancing_details.opt_out_available = "";
  intake.balancing_details.opt_out_mechanism = "";
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("opt_out_feasibility:")),
    `Expected opt_out_feasibility deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping the attestation block reopens attestation_block", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.attestation = {};
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("attestation_block:")),
    `Expected attestation_block deficiency. Got: ${deficiencyLines(res.deficiencies).join(" | ")}`,
  );
});

Deno.test("L0.5 mutation — dropping jurisdictions entirely surfaces the REAL automated_decision_analysis gap", () => {
  const intake = clone(REFERENCE_INTAKE);
  intake.jurisdictions = [];
  const res = checkPerfectLiaIntake(intake);
  assertEquals(res.ok, false);
  assert(
    res.deficiencies.some((d) => d.detail.startsWith("automated_decision_analysis:")),
    `Expected automated_decision_analysis deficiency (regime not_engaged, no jurisdictions). Got: ${
      deficiencyLines(res.deficiencies).join(" | ")
    }`,
  );
});

// ── Negative control: the EU automated_decision_analysis degradation must
// NEVER be reported as a deficiency on an otherwise-complete EU record —
// this is the carve-out's whole point. ────────────────────────────────────
Deno.test("L0.5 — automated_decision_analysis's mandatory EU degradation never gates the checker", () => {
  for (const c of LIA_PERFECT_PINNED) {
    const res = checkPerfectLiaIntake(c.intake);
    assert(
      !res.deficiencies.some((d) => d.kind === "insufficient" && d.detail.startsWith("automated_decision_analysis:")),
      `${c.id} should not report automated_decision_analysis as a deficiency (mandatory EU degradation is expected). Got: ${
        deficiencyLines(res.deficiencies).join(" | ")
      }`,
    );
  }
});
