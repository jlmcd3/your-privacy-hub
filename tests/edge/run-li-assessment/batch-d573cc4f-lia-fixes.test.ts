// BATCH d573cc4f (2026-09-12) — ChatGPT's "Report Prose Review v6" plus
// Claude's independent code check agreed on three real LIA defects.
//
// LIA6-01 — a recognise_interest rule (e.g. lia/rule/recognised-interest-
// security-fraud, keyed only on purpose_details.interest_type) recognizes
// that the INTEREST CATEGORY is one GDPR contemplates; it says nothing about
// whether the record's own statement of that interest is clearly and
// precisely articulated — the SEPARATE second sub-test build-upgrade4.ts's
// interest_legitimacy already resolves. Applying the rule's raise
// unconditionally overwrote an already-correct "undetermined" purpose
// verdict with "passes", while the generated Section II prose (sourced from
// interest_legitimacy directly, never touched by the rule pass) kept
// correctly saying "not yet determined" — a customer-visible, internally
// contradictory report.
//
// LIA6-02 — the pv === "uncertain" generic-ask branch (three-part-test-
// typed.ts) always emitted a generic "state the interest pursued" ask, even
// when interest_legitimacy.information_needed already carries a specific,
// record-tailored ask (e.g. naming which of two bundled interests is the
// operative one).
//
// LIA6-04 — the "open" determination's rawWhy sentence had a subject-verb
// agreement bug: "N of the elements ... is not established" read wrong for
// N > 1 (and vice versa for N === 1).

import { assert, assertEquals, assertStrictEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyLiaRules } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-pass.ts";
import { buildDetermination } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { buildThreePartTestTyped, type LiaTypedStage2Result } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";
import type { AuthorityRule, RuleEffect } from "../../../supabase/functions/_shared/corpus/rule-types.ts";

type Bag = Record<string, unknown>;

// ── shared fixtures (mirrors doc207-rule-pass.test.ts) ──────────────────

function baseReport(overrides: Bag = {}): Bag {
  return {
    interest_legitimacy: { verdict: "legitimate_interest_established" },
    child_factor: { determination: "children_not_in_scope" },
    public_authority_exclusion: { determination: "exclusion_does_not_apply", basis_unavailable: false },
    scale_frequency_duration: { large_scale_indicated: false },
    eprivacy_short_circuit: { determination: "not_engaged_on_the_record" },
    precedent_class_posture: { use_case_class: "contractual_administration" },
    reasonable_expectations: { verdict: "reasonably_expected" },
    potential_harms: { material_weight_against_controller: false, worst_case_severity: "limited" },
    opt_out_feasibility: { feasibility: "unconditional_opt_out_available" },
    relationship_with_individual: { category: "customer" },
    automated_decision_analysis: { regime: "not_engaged" },
    alternatives_considered: {
      alternatives: [{ alternative: "Consent", why_inadequate: "Would not scale.", rationale_recorded: true }],
    },
    lia_determination: {
      outcome: "legitimate_interests_available",
      why: "Baseline determination.",
      exposure_note: "",
      separation_repairs: 0,
      driving_factors: [],
      mitigations: [],
      rebalance_required: false,
      citation: "",
      authority_verbatim: "",
      status: "analysed",
    },
    ...overrides,
  };
}

function baseIntake(overrides: Bag = {}): Bag {
  return {
    jurisdictions: ["EU (GDPR)"],
    data_categories: ["Contact data"],
    relationship_type: "Existing customer",
    processing_description: "Routine account administration for existing customers.",
    purpose_details: { interest_type: "Security / fraud prevention" },
    balancing_details: { relationship_category: "Customer" },
    ...overrides,
  };
}

function baseTyped(overrides: Partial<{ purpose: string; necessity: string; balancing: string }> = {}): LiaTypedStage2Result {
  const purpose = overrides.purpose ?? "uncertain";
  const necessity = overrides.necessity ?? "passes";
  const balancing = overrides.balancing ?? "likely_passes";
  return {
    three_part_test: {
      purpose_test: { verdict: purpose, analysis: "Purpose analysis.", risk_factors: [], supporting_factors: [] },
      necessity_test: { verdict: necessity, analysis: "Necessity analysis.", risk_factors: [], supporting_factors: [] },
      balancing_test: { verdict: balancing, analysis: "Balancing analysis.", risk_factors: [], supporting_factors: [] },
      overall_assessment: {
        argument_strength: "moderate",
        strength_basis: "Test fixture.",
        closest_accepted_precedent: "None identified in current database",
        closest_rejected_precedent: "None identified in current database",
        key_distinguishing_factors: [],
        blocking_issues: [],
        argument_strength_note: "Test fixture.",
      },
      annotations: [],
    },
    information_needed: [],
    determination_override: null,
    eprivacy_foreclosed: false,
  } as unknown as LiaTypedStage2Result;
}

function makeRule(overrides: Partial<AuthorityRule> & { rule_id: string; effect: RuleEffect }): AuthorityRule {
  return {
    product: "lia",
    settledness: "R1",
    instrument_scope: ["EU GDPR", "UK GDPR"],
    regulator_scope: null,
    bears_on_element: "purpose",
    trigger: { all_of: ["flag:__never__"] },
    reason_sentence: "Test reason sentence.",
    authority_citation: "Test Authority Citation",
    sources: [{ table: "regulatory_guidance", row_id: "test-row" }],
    retired_at: null,
    ...overrides,
  };
}

const W1: AuthorityRule = makeRule({
  rule_id: "lia/rule/recognised-interest-security-fraud",
  bears_on_element: "purpose",
  trigger: { all_of: ["state:intake.purpose_details.interest_type=Security / fraud prevention"] },
  effect: { kind: "recognise_interest", element: "purpose", value: "passes" },
  reason_sentence:
    "Preventing fraud and securing networks and information are recognised as legitimate interests (GDPR Recitals 47 and 49); the necessity of this processing and the balance against the individuals' rights remain to be shown.",
  authority_citation: "GDPR, Recitals 47 and 49 — determinative authority (interest recognised)",
});

// ── LIA6-01 ──────────────────────────────────────────────────────────────

Deno.test("LIA6-01 — a recognise_interest rule cannot raise 'purpose' past interest_legitimacy's own undetermined verdict", () => {
  const typed = baseTyped({ purpose: "uncertain" });
  const report = baseReport({ interest_legitimacy: { verdict: "undetermined_on_the_record" } });
  const result = applyLiaRules(typed, report, baseIntake(), [W1]);
  const tpt = result.typed.three_part_test as Bag;
  assertEquals((tpt.purpose_test as Bag).verdict, "uncertain", "the raise must be blocked when interest_legitimacy is itself undetermined");
});

Deno.test("LIA6-01 — the raise is also blocked when interest_legitimacy affirmatively found the interest not established", () => {
  const typed = baseTyped({ purpose: "uncertain" });
  const report = baseReport({ interest_legitimacy: { verdict: "legitimate_interest_not_established" } });
  const result = applyLiaRules(typed, report, baseIntake(), [W1]);
  const tpt = result.typed.three_part_test as Bag;
  assertEquals((tpt.purpose_test as Bag).verdict, "uncertain");
});

Deno.test("LIA6-01 — the raise still fires normally when interest_legitimacy has established the interest (no regression, mirrors doc207's W1 fixture_fires)", () => {
  const typed = baseTyped({ purpose: "uncertain" });
  const report = baseReport({ interest_legitimacy: { verdict: "legitimate_interest_established" } });
  const result = applyLiaRules(typed, report, baseIntake(), [W1]);
  const tpt = result.typed.three_part_test as Bag;
  assertEquals((tpt.purpose_test as Bag).verdict, "passes");
});

Deno.test("LIA6-01 — the block is scoped to a 'purpose' raise only: a rule with no fixture rules is still the identity (no regression)", () => {
  const typed = baseTyped();
  const report = baseReport({ interest_legitimacy: { verdict: "undetermined_on_the_record" } });
  const result = applyLiaRules(typed, report, baseIntake(), []);
  assertStrictEquals(result.typed, typed);
});

// ── LIA6-02 ──────────────────────────────────────────────────────────────

Deno.test("LIA6-02 — the generic purpose ask uses interest_legitimacy's own specific information_needed when present", () => {
  const report = baseReport({
    interest_legitimacy: {
      verdict: "undetermined_on_the_record",
      information_needed: "Which of the two bundled interests (fraud prevention or marketing analytics) is the interest actually relied on for this processing.",
    },
  });
  const result = buildThreePartTestTyped(report as never, baseIntake() as never) as unknown as Bag;
  const info = result.information_needed as Array<Bag>;
  const row = info.find((r) => r.field === "stated_purpose");
  assert(row, "expected a stated_purpose information_needed row");
  assertEquals(row!.dimensions, "Which of the two bundled interests (fraud prevention or marketing analytics) is the interest actually relied on for this processing.");
});

Deno.test("LIA6-02 — the generic fallback ask text is unchanged when interest_legitimacy carries no specific ask (no regression)", () => {
  const report = baseReport({
    interest_legitimacy: { verdict: "undetermined_on_the_record", information_needed: "" },
  });
  const result = buildThreePartTestTyped(report as never, baseIntake() as never) as unknown as Bag;
  const info = result.information_needed as Array<Bag>;
  const row = info.find((r) => r.field === "stated_purpose");
  assert(row, "expected a stated_purpose information_needed row");
  assertEquals(row!.dimensions, "the interest pursued, stated precisely enough to be weighed");
});

// ── LIA6-04 ──────────────────────────────────────────────────────────────

const GOLDEN_INTAKE = LIA_PERFECT_PINNED[0].intake as Bag;

const EXPECTATIONS_OPEN = { verdict: "undetermined_on_the_record", information_needed: "state whether the use falls within what the data subjects would expect" } as never;
const CHILD_OK = { determination: "children_not_in_scope", information_needed: undefined } as never;
const PA_OK = { determination: "exclusion_does_not_apply", basis_unavailable: false, information_needed: undefined } as never;

Deno.test("LIA6-04 — exactly one open element uses singular 'is'", () => {
  const intake: Bag = {
    ...GOLDEN_INTAKE,
    balancing_details: { ...(GOLDEN_INTAKE.balancing_details as Bag ?? {}), potential_harm: "Minor inconvenience to the individual." },
  };
  const result = buildDetermination(intake as never, EXPECTATIONS_OPEN, CHILD_OK, PA_OK) as unknown as Bag;
  assertEquals(result.driving_factors, ["reasonable_expectations"]);
  assertStringIncludes(String(result.why), "1 of the elements the assessment turns on — what the people affected would reasonably expect — is not established on the information provided");
});

Deno.test("LIA6-04 — more than one open element uses plural 'are' (no regression)", () => {
  const intake: Bag = {
    ...GOLDEN_INTAKE,
    purpose_details: { interest_statement: "", interest_type: "" },
    stated_purpose: "",
    alternatives_considered: "",
    necessity_details: { alternatives: "", alternatives_rationale: "", why_consent_not_used: "" },
    balancing_details: { ...(GOLDEN_INTAKE.balancing_details as Bag ?? {}), potential_harm: "Minor inconvenience to the individual." },
  };
  const result = buildDetermination(intake as never, EXPECTATIONS_OPEN, CHILD_OK, PA_OK) as unknown as Bag;
  assertEquals(result.driving_factors, ["legitimacy", "necessity", "reasonable_expectations"]);
  assertStringIncludes(
    String(result.why),
    "3 of the elements the assessment turns on — the legitimacy of the interest, necessity, what the people affected would reasonably expect — are not established on the information provided",
  );
});
