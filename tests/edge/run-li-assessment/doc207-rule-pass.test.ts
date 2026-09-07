// DOC 207 TRACK 3a — THE RULE PASS. Pins `buildLiaRuleStates` (the LIA
// adapter onto the generic interpreter's TypedStateBag) and `applyLiaRules`
// (the LIA adapter over `applyRules`), against fixture `AuthorityRule`s
// built from the doc 206B W1-W7 worksheets. `LIA_RULES` itself stays `[]`
// in production — every rule here is injected through the `rules`
// parameter, never through `LIA_RULES` (doc 207 §4).
//
// The report/intake/typed fixtures below are hand-built Bags, not full
// production intakes run through attachLiaDeliverables/build-upgrade4/
// buildThreePartTestTyped — this file is testing the RULE-PASS MECHANISM in
// isolation (already covered end-to-end for the underlying typed builders
// by l1-l3-deterministic.test.ts), so each fixture states exactly the
// typed facts a worksheet's trigger and the B3-9 degradation ladder need,
// nothing else.

import { assert, assertEquals, assertStrictEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyLiaRules } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-pass.ts";
import { buildLiaRuleStates } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-states.ts";
import { LIA_RULES } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-rules.ts";
import { guardInformationNeeded } from "../../../supabase/functions/_shared/insufficient-info-guard.ts";
import type { AuthorityRule, RuleEffect } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import type { LiaTypedStage2Result } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";

type Bag = Record<string, unknown>;

// ── Fixtures ─────────────────────────────────────────────────────────────

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
    purpose_details: {
      interest_type: "Commercial / revenue-related",
    },
    balancing_details: {
      relationship_category: "Customer",
      special_category_data: false,
      children_data_subjects: "No",
      safeguards: ["Access controls"],
      opt_out_available: "Yes — unconditional, on request, with no consequence",
    },
    attestation: {},
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

// ── LIA_RULES stays empty in production ─────────────────────────────────

Deno.test("doc207 — LIA_RULES ships empty; the generator has not run yet", () => {
  assertEquals(LIA_RULES.length, 0);
});

// ── buildLiaRuleStates — the 206B0 vocabulary from a fixture record ─────

Deno.test("buildLiaRuleStates — every closed-list intake path and typed-finding path is present, atoms match 206B0 §0/§4", () => {
  const report = baseReport({
    child_factor: { determination: "children_in_scope" },
    public_authority_exclusion: { determination: "exclusion_applies", basis_unavailable: true },
    scale_frequency_duration: { large_scale_indicated: true },
    eprivacy_short_circuit: { determination: "consent_requirement_engaged" },
    precedent_class_posture: { use_case_class: "employee_monitoring" },
    reasonable_expectations: { verdict: "not_reasonably_expected" },
    potential_harms: { material_weight_against_controller: true, worst_case_severity: "severe" },
    opt_out_feasibility: { feasibility: "no_opt_out_available" },
    relationship_with_individual: { category: "employee" },
    automated_decision_analysis: { regime: "eu" },
    alternatives_considered: { alternatives: [] },
  });
  const intake = baseIntake({
    relationship_type: "Employee",
    data_categories: ["Health or medical data"],
    purpose_details: {
      controller_is_public_authority: "Yes",
      public_task_processing: "No",
      device_access: "Yes",
      device_access_strictly_necessary: "Yes — all of it is strictly necessary",
      interest_holder: "Our business",
      interest_type: "Security / fraud prevention",
      beneficiary: "Our business",
    },
    balancing_details: {
      reasonable_expectation: "No",
      vulnerable_subjects: ["Children"],
      children_data_subjects: "Yes",
      potential_harm: "Severe",
      safeguards: [],
      opt_out_mechanism: "None recorded.",
      special_category_data: true,
      relationship_category: "Employee",
      opt_out_available: "No opt-out is available",
    },
    attestation: { dpo_reviewed: "Yes", review_triggers: ["A material change"] },
    stage: "submitted",
    preview_assessment_id: "test-0001",
  });
  const typed = baseTyped({ purpose: "fails", necessity: "uncertain", balancing: "likely_fails" });

  const states = buildLiaRuleStates(report, intake, typed);

  // instrument / use_case_class / relationship / data_categories / flags —
  // reused verbatim from buildLiaRelevanceQuery, not re-derived here.
  assertEquals(states.instrument, "EU GDPR");
  assertEquals(states.use_case_class, "employee_monitoring");
  assertEquals(states.relationship, "employee");
  assert(states.data_categories.includes("Health or medical data"));
  assert(states.flags.includes("special_category"), JSON.stringify(states.flags));
  assert(states.flags.includes("children"), JSON.stringify(states.flags));
  assert(states.flags.includes("large_scale"), JSON.stringify(states.flags));
  assert(states.flags.includes("public_authority"), JSON.stringify(states.flags)); // B3-6 fix
  assert(states.flags.includes("automated_decision"), JSON.stringify(states.flags)); // B3-7 fix

  // verdicts — from the typed result passed in, not report.three_part_test.
  assertEquals(states.verdicts, { purpose: "fails", necessity: "uncertain", balancing: "likely_fails" });

  // typed-finding state: paths (206B0 §3).
  assertEquals(states.states["interest_legitimacy.verdict"], "legitimate_interest_established");
  assertEquals(states.states["child_factor.determination"], "children_in_scope");
  assertEquals(states.states["public_authority_exclusion.determination"], "exclusion_applies");
  assertEquals(states.states["public_authority_exclusion.basis_unavailable"], true);
  assertEquals(states.states["scale_frequency_duration.large_scale_indicated"], true);
  assertEquals(states.states["eprivacy_short_circuit.determination"], "consent_requirement_engaged");
  assertEquals(states.states["precedent_class_posture.use_case_class"], "employee_monitoring");
  assertEquals(states.states["reasonable_expectations.verdict"], "not_reasonably_expected");
  assertEquals(states.states["potential_harms.material_weight_against_controller"], true);
  assertEquals(states.states["potential_harms.worst_case_severity"], "severe");
  assertEquals(states.states["opt_out_feasibility.feasibility"], "no_opt_out_available");
  assertEquals(states.states["relationship_with_individual.category"], "employee");
  assertEquals(states.states["automated_decision_analysis.regime"], "eu");
  assertEquals(states.states["alternatives_considered.alternatives_recorded"], false);

  // intake.* closed-list state: paths (206B0 §4).
  assertEquals(states.states["intake.jurisdictions"], "EU (GDPR)");
  assertEquals(states.states["intake.data_categories"], "Health or medical data");
  assertEquals(states.states["intake.relationship_type"], "Employee");
  assertEquals(states.states["intake.purpose_details.controller_is_public_authority"], "Yes");
  assertEquals(states.states["intake.purpose_details.public_task_processing"], "No");
  assertEquals(states.states["intake.purpose_details.device_access"], "Yes");
  assertEquals(states.states["intake.purpose_details.device_access_strictly_necessary"], "Yes — all of it is strictly necessary");
  assertEquals(states.states["intake.purpose_details.interest_holder"], "Our business");
  assertEquals(states.states["intake.purpose_details.interest_type"], "Security / fraud prevention");
  assertEquals(states.states["intake.purpose_details.beneficiary"], "Our business");
  assertEquals(states.states["intake.balancing_details.reasonable_expectation"], "No");
  assertEquals(states.states["intake.balancing_details.vulnerable_subjects"], "Children");
  assertEquals(states.states["intake.balancing_details.children_data_subjects"], "Yes");
  assertEquals(states.states["intake.balancing_details.potential_harm"], "Severe");
  assertEquals(states.states["intake.balancing_details.safeguards"], "");
  assertEquals(states.states["intake.balancing_details.opt_out_mechanism"], "None recorded.");
  assertEquals(states.states["intake.balancing_details.special_category_data"], true);
  assertEquals(states.states["intake.balancing_details.relationship_category"], "Employee");
  assertEquals(states.states["intake.balancing_details.opt_out_available"], "No opt-out is available");
  assertEquals(states.states["intake.attestation.dpo_reviewed"], "Yes");
  assertEquals(states.states["intake.attestation.review_triggers"], "A material change");
  assertEquals(states.states["intake.stage"], "submitted");
  assertEquals(states.states["intake.preview_assessment_id"], "test-0001");
});

Deno.test("buildLiaRuleStates — a missing intake/report path is null, never throws (Law B2's absent-path contract)", () => {
  const states = buildLiaRuleStates(baseReport(), {}, baseTyped());
  assertEquals(states.states["intake.purpose_details.interest_holder"], null);
  assertEquals(states.states["intake.jurisdictions"], null);
});

// ── applyLiaRules — zero rules is the identity ──────────────────────────

Deno.test("applyLiaRules — zero rules (LIA_RULES today): typed unchanged (same reference), rule_applications empty", () => {
  const typed = baseTyped();
  const result = applyLiaRules(typed, baseReport(), baseIntake(), []);
  assertStrictEquals(result.typed, typed);
  assertEquals(result.applications, []);
  assertEquals(result.invariant_violations, []);
});

Deno.test("applyLiaRules — called with LIA_RULES's own default (no 4th argument) is also the identity, since LIA_RULES is []", () => {
  const typed = baseTyped();
  const result = applyLiaRules(typed, baseReport(), baseIntake());
  assertStrictEquals(result.typed, typed);
  assertEquals(result.applications, []);
});

// ── W1 — recognised-interest-security-fraud (favorable, R1) ────────────

const W1: AuthorityRule = makeRule({
  rule_id: "lia/rule/recognised-interest-security-fraud",
  bears_on_element: "purpose",
  trigger: { all_of: ["state:intake.purpose_details.interest_type=Security / fraud prevention"] },
  effect: { kind: "recognise_interest", element: "purpose", value: "passes" },
  reason_sentence:
    "Preventing fraud and securing networks and information are recognised as legitimate interests (GDPR Recitals 47 and 49); the necessity of this processing and the balance against the individuals' rights remain to be shown.",
  authority_citation: "GDPR, Recitals 47 and 49 — determinative authority (interest recognised)",
});

Deno.test("W1 fixture_fires — Security / fraud prevention raises purpose uncertain -> passes; necessity/balancing/outcome untouched", () => {
  const typed = baseTyped({ purpose: "uncertain" });
  const intake = baseIntake({ purpose_details: { interest_type: "Security / fraud prevention" } });
  const result = applyLiaRules(typed, baseReport(), intake, [W1]);
  assertEquals(result.invariant_violations, []);
  const tpt = result.typed.three_part_test as Bag;
  assertEquals((tpt.purpose_test as Bag).verdict, "passes");
  assertEquals((tpt.necessity_test as Bag).verdict, "passes");
  assertEquals((tpt.balancing_test as Bag).verdict, "likely_passes");
  assert(((tpt.purpose_test as Bag).supporting_factors as string[]).includes(W1.reason_sentence));
  assertEquals(result.typed.determination_override, null); // outcome untouched — no determination_override written
  assertEquals(result.applications.length, 1);
  assertEquals(result.applications[0].changed, true);
});

Deno.test("W1 fixture_silent — Commercial / revenue-related does not fire", () => {
  const typed = baseTyped({ purpose: "uncertain" });
  const intake = baseIntake({ purpose_details: { interest_type: "Commercial / revenue-related" } });
  const result = applyLiaRules(typed, baseReport(), intake, [W1]);
  assertEquals(result.applications, []);
  assertStrictEquals(result.typed, typed);
});

// ── W2/W3 — direct marketing recognition + no-opt-out cap ───────────────

const W2: AuthorityRule = makeRule({
  rule_id: "lia/rule/recognised-interest-direct-marketing",
  bears_on_element: "purpose",
  trigger: { all_of: ["class:direct_marketing"] },
  effect: { kind: "recognise_interest", element: "purpose", value: "passes" },
  reason_sentence:
    "Direct marketing may be carried out for a legitimate interest (GDPR Recital 47); the individual's absolute right to object to direct marketing (Article 21(2)) and the balance against their reasonable expectations remain to be shown.",
  authority_citation: "GDPR, Recital 47 and Article 21(2) — determinative authority (interest recognised)",
});

const W3: AuthorityRule = makeRule({
  rule_id: "lia/rule/direct-marketing-no-opt-out",
  bears_on_element: "balancing",
  trigger: {
    all_of: ["class:direct_marketing", "state:intake.balancing_details.opt_out_available=No opt-out is available"],
  },
  effect: { kind: "cap_verdict", element: "balancing", max: "likely_fails" },
  reason_sentence:
    "Individuals have an absolute right to object to direct marketing (Article 21(2)-(3)); direct marketing with no available opt-out cannot satisfy the balancing test on the facts recorded.",
  authority_citation: "GDPR, Article 21(2)-(3); EDPB Guidelines 3/2019 P108 — determinative authority",
});

Deno.test("W2 fixture_fires — class direct_marketing raises purpose; W2 fixture_silent — contractual_administration does not fire", () => {
  const typed = baseTyped({ purpose: "uncertain" });
  const firing = applyLiaRules(
    typed,
    baseReport({ precedent_class_posture: { use_case_class: "direct_marketing" } }),
    baseIntake(),
    [W2],
  );
  assertEquals(((firing.typed.three_part_test as Bag).purpose_test as Bag).verdict, "passes");

  const silent = applyLiaRules(
    typed,
    baseReport({ precedent_class_posture: { use_case_class: "contractual_administration" } }),
    baseIntake(),
    [W2],
  );
  assertEquals(silent.applications, []);
});

Deno.test("W3 fixture_fires — direct marketing with no opt-out caps balancing to likely_fails; outcome degrades to available_only_with_mitigations (B3-9)", () => {
  const typed = baseTyped({ balancing: "likely_passes" });
  const report = baseReport({ precedent_class_posture: { use_case_class: "direct_marketing" } });
  const intake = baseIntake({ balancing_details: { opt_out_available: "No opt-out is available" } });
  const result = applyLiaRules(typed, report, intake, [W3]);
  assertEquals(result.invariant_violations, []);
  assertEquals(((result.typed.three_part_test as Bag).balancing_test as Bag).verdict, "likely_fails");
  assert((((result.typed.three_part_test as Bag).balancing_test as Bag).risk_factors as string[]).includes(W3.reason_sentence));
  const override = result.typed.determination_override as unknown as Bag;
  assert(override, "expected a determination_override from the B3-9 degradation ladder");
  assertEquals(override.outcome, "available_only_with_mitigations");
  assertEquals(override.status, "analysed");
  assertEquals(override.rebalance_required, false);
  assert(String(override.why).startsWith(W3.reason_sentence.replace(/\.$/, "") + "."), String(override.why));
});

Deno.test("W3 fixture_silent — an unconditional opt-out does not fire", () => {
  const typed = baseTyped({ balancing: "likely_passes" });
  const report = baseReport({ precedent_class_posture: { use_case_class: "direct_marketing" } });
  const intake = baseIntake({
    balancing_details: { opt_out_available: "Yes — unconditional, on request, with no consequence" },
  });
  const result = applyLiaRules(typed, report, intake, [W3]);
  assertEquals(result.applications, []);
});

// ── W4a/W4b — special-category requires an Art. 9(2) condition ─────────

const W4A: AuthorityRule = makeRule({
  rule_id: "lia/rule/special-category-requires-art9-condition",
  bears_on_element: "purpose",
  trigger: { all_of: ["flag:special_category"] },
  effect: { kind: "cap_verdict", element: "purpose", max: "uncertain" },
  reason_sentence:
    "Special-category data may only be processed where an Article 9(2) condition applies in addition to a lawful basis; legitimate interests under Article 6(1)(f) cannot on its own authorise it.",
  authority_citation: "GDPR, Article 9; EDPB Guidelines 3/2019 P68 — determinative authority",
});

const W4B: AuthorityRule = makeRule({
  rule_id: "lia/rule/special-category-requires-art9-condition-condition",
  bears_on_element: "purpose",
  trigger: { all_of: ["flag:special_category"] },
  effect: {
    kind: "require_condition",
    text: "Identify the Article 9(2) condition relied on for the special-category data; Article 6(1)(f) alone cannot authorise its processing.",
  },
  reason_sentence:
    "Special-category data may only be processed where an Article 9(2) condition applies in addition to a lawful basis; legitimate interests under Article 6(1)(f) cannot on its own authorise it.",
  authority_citation: "GDPR, Article 9; EDPB Guidelines 3/2019 P68 — determinative authority",
});

Deno.test("W4a/W4b fixture_fires — special-category data caps purpose passes -> uncertain, adds the Art 9(2) condition, outcome degrades to undetermined_on_the_record (B3-9)", () => {
  const typed = baseTyped({ purpose: "passes" });
  const intake = baseIntake({ data_categories: ["Health or medical data"] });
  const result = applyLiaRules(typed, baseReport(), intake, [W4A, W4B]);
  assertEquals(result.invariant_violations, []);
  assertEquals(((result.typed.three_part_test as Bag).purpose_test as Bag).verdict, "uncertain");
  assertEquals(result.typed.information_needed.length, 1);
  assertEquals(
    (result.typed.information_needed[0] as Bag).field,
    "balancing_details.additional_mitigations",
  );
  assertEquals((result.typed.information_needed[0] as Bag).enables, "the purpose test");
  const override = result.typed.determination_override as unknown as Bag;
  assert(override);
  assertEquals(override.outcome, "undetermined_on_the_record");
});

Deno.test("W4a/W4b fixture_silent — no special-category data does not fire", () => {
  const typed = baseTyped({ purpose: "passes" });
  const intake = baseIntake({ data_categories: ["Contact data"] });
  const result = applyLiaRules(typed, baseReport(), intake, [W4A, W4B]);
  assertEquals(result.applications, []);
});

// ── W5 — children + personalisation/advertising/analytics ──────────────

const W5: AuthorityRule = makeRule({
  rule_id: "lia/rule/children-personalisation-balancing",
  bears_on_element: "balancing",
  trigger: {
    all_of: ["flag:children"],
    any_of: ["class:product_improvement", "class:behavioral_advertising", "class:research_analytics"],
  },
  effect: { kind: "cap_verdict", element: "balancing", max: "uncertain" },
  reason_sentence:
    "Where children's data is used to improve products or personalise advertising, the Court of Justice has held it doubtful that the controller's interest can override the child's rights; the balance cannot be recorded as favourable on these facts.",
  authority_citation: "CJEU, Meta Platforms v Bundeskartellamt, C-252/21; EDPB Opinion 28/2024 P96 — determinative authority",
});

Deno.test("W5 fixture_fires — children + behavioral_advertising caps balancing likely_passes -> uncertain, outcome degrades to undetermined_on_the_record", () => {
  const typed = baseTyped({ balancing: "likely_passes" });
  const report = baseReport({
    precedent_class_posture: { use_case_class: "behavioral_advertising" },
    child_factor: { determination: "undetermined_on_the_record" }, // flag comes from the intake answer instead
  });
  const intake = baseIntake({ balancing_details: { children_data_subjects: "Yes" } });
  const result = applyLiaRules(typed, report, intake, [W5]);
  assertEquals(result.invariant_violations, []);
  assertEquals(((result.typed.three_part_test as Bag).balancing_test as Bag).verdict, "uncertain");
  const override = result.typed.determination_override as unknown as Bag;
  assert(override);
  assertEquals(override.outcome, "undetermined_on_the_record");
});

Deno.test("W5 fixture_silent — same facts with children_data_subjects=No does not fire", () => {
  const typed = baseTyped({ balancing: "likely_passes" });
  const report = baseReport({ precedent_class_posture: { use_case_class: "behavioral_advertising" } });
  const intake = baseIntake({ balancing_details: { children_data_subjects: "No" } });
  const result = applyLiaRules(typed, report, intake, [W5]);
  assertEquals(result.applications, []);
});

// ── W6a/W6b — employee monitoring: least-intrusive-means + expectations ─

const W6A: AuthorityRule = makeRule({
  rule_id: "lia/rule/employee-monitoring-least-intrusive-condition",
  settledness: "R3",
  bears_on_element: "necessity",
  trigger: { all_of: ["relationship:employee", "class:employee_monitoring"] },
  effect: {
    kind: "require_condition",
    text:
      "Record the less intrusive alternatives to monitoring that were considered (blocking or filtering rather than monitoring; targeted rather than continuous) and why each was insufficient.",
  },
  reason_sentence: "Subsidiarity requires that less intrusive means were considered before monitoring.",
  authority_citation: "WP29 Opinion 2/2017 S5.3, S6.4 (persuasive, not EDPB-endorsed) — determinative authority (condition)",
});

const W6B: AuthorityRule = makeRule({
  rule_id: "lia/rule/employee-monitoring-least-intrusive-risk",
  settledness: "R1",
  bears_on_element: "balancing",
  trigger: { all_of: ["relationship:employee", "class:employee_monitoring"] },
  effect: {
    kind: "flag_risk",
    element: "balancing",
    text:
      "Employees do not in most cases expect to be monitored by their employer (EDPB Guidelines 3/2019 P37); a recorded expectation of monitoring must rest on clear, prior, specific notice.",
  },
  reason_sentence: "Employees do not in most cases expect to be monitored by their employer.",
  authority_citation: "EDPB Guidelines 3/2019 P37 — determinative authority",
});

Deno.test("W6a/W6b fixture_fires — employee + employee_monitoring adds the condition and the risk; verdicts unchanged", () => {
  const typed = baseTyped();
  const report = baseReport({ precedent_class_posture: { use_case_class: "employee_monitoring" } });
  // balancing_details.relationship_category is tried BEFORE relationship_type
  // (lia-persuasive-authority.ts RELATIONSHIP_CATEGORY lookup) — override both
  // so the record actually resolves to "employee".
  const intake = baseIntake({
    relationship_type: "Employee",
    balancing_details: { relationship_category: "Employee" },
  });
  const result = applyLiaRules(typed, report, intake, [W6A, W6B]);
  assertEquals(result.invariant_violations, []);
  assertEquals(result.typed.information_needed.length, 1);
  assertEquals((result.typed.information_needed[0] as Bag).enables, "the necessity test");
  // flag_risk pushes the rule's own reason_sentence onto risk_factors — the
  // same field cap_verdict/precedent_verdict/recognise_interest push
  // (doc 207 §2.3), not the effect's own `text` (that is the intake-facing
  // condition text used only for require_condition entries).
  assert(
    (((result.typed.three_part_test as Bag).balancing_test as Bag).risk_factors as string[]).includes(W6B.reason_sentence),
  );
  // Verdicts are byte-identical to the baseline — neither rule touches one.
  assertEquals(((result.typed.three_part_test as Bag).purpose_test as Bag).verdict, "uncertain");
  assertEquals(((result.typed.three_part_test as Bag).necessity_test as Bag).verdict, "passes");
  assertEquals(((result.typed.three_part_test as Bag).balancing_test as Bag).verdict, "likely_passes");
  assertEquals(result.typed.determination_override, null);
});

Deno.test("W6a/W6b fixture_silent — a customer relationship does not fire", () => {
  const typed = baseTyped();
  const report = baseReport({ precedent_class_posture: { use_case_class: "employee_monitoring" } });
  const intake = baseIntake({ relationship_type: "Existing customer" });
  const result = applyLiaRules(typed, report, intake, [W6A, W6B]);
  assertEquals(result.applications, []);
});

// ── W7 — necessity: an anonymised/less-intrusive alternative ────────────

const W7: AuthorityRule = makeRule({
  rule_id: "lia/rule/necessity-anonymised-alternative",
  bears_on_element: "necessity",
  trigger: { any_of: ["class:product_improvement", "class:research_analytics"] },
  effect: {
    kind: "require_condition",
    text:
      "Record whether the purpose could be achieved with anonymised or synthetic data or a less intrusive method; if it could, the processing of personal data is not necessary.",
  },
  reason_sentence: "Processing is not necessary where an anonymised or less intrusive alternative would serve the purpose.",
  authority_citation: "EDPB Opinion 28/2024 P73-74; EDPB Guidelines 3/2019 P24 — determinative authority (condition)",
});

Deno.test("W7 fixture_fires — product_improvement adds the necessity condition; fixture_silent — fraud_prevention does not fire", () => {
  const typed = baseTyped();
  const firing = applyLiaRules(
    typed,
    baseReport({ precedent_class_posture: { use_case_class: "product_improvement" } }),
    baseIntake(),
    [W7],
  );
  assertEquals(firing.typed.information_needed.length, 1);
  assertEquals((firing.typed.information_needed[0] as Bag).enables, "the necessity test");

  const silent = applyLiaRules(
    typed,
    baseReport({ precedent_class_posture: { use_case_class: "fraud_prevention" } }),
    baseIntake(),
    [W7],
  );
  assertEquals(silent.applications, []);
});

// ── require_condition survives guardInformationNeeded ───────────────────
// `dedupeInformationNeeded` (index.ts) merges report.three_part_test.
// information_needed into report.information_needed — on the deterministic
// path that nested array is never populated (206B0 §5.2: the typed
// builder's information_needed is a SIBLING top-level array, not nested
// under three_part_test), so dedupeInformationNeeded is a documented no-op
// on this path and cannot be exercised against a rule-pass entry; the
// guard below is the gate that actually decides whether the entry ships.

Deno.test("require_condition entry survives guardInformationNeeded when the intake roster carries the field's root", () => {
  const typed = baseTyped();
  const result = applyLiaRules(
    typed,
    baseReport({ precedent_class_posture: { use_case_class: "product_improvement" } }),
    baseIntake(),
    [W7],
  );
  assertEquals(result.typed.information_needed.length, 1);

  // Mirrors index.ts's liaIntakeObject PLUS the doc 207 §2.4 addition
  // (balancing_details), without which the entry's default field
  // ("balancing_details.additional_mitigations") would not resolve as a
  // nested intake path and would be stripped.
  const intakeRoster = {
    organization_name: "Test Org",
    subject_anchor: null,
    relationship_type: "Existing customer",
    jurisdictions: ["EU (GDPR)"],
    data_categories: ["Contact data"],
    processing_description: "Test.",
    stated_purpose: null,
    sector: null,
    alternatives_considered: null,
    balancing_details: { additional_mitigations: "" },
  };
  const reportLike = { information_needed: result.typed.information_needed as unknown[] };
  const guarded = guardInformationNeeded(reportLike, intakeRoster, "li_assessment");
  assertEquals(guarded.report.information_needed.length, 1, JSON.stringify(guarded.report.information_needed));
  assertEquals(guarded.strippedCount, 0);
});

Deno.test("require_condition entry is stripped by guardInformationNeeded WITHOUT the balancing_details root on the roster (documents the pre-fix gap)", () => {
  const typed = baseTyped();
  const result = applyLiaRules(
    typed,
    baseReport({ precedent_class_posture: { use_case_class: "product_improvement" } }),
    baseIntake(),
    [W7],
  );
  const trimmedRoster = {
    organization_name: "Test Org",
    subject_anchor: null,
    relationship_type: "Existing customer",
    jurisdictions: ["EU (GDPR)"],
    data_categories: ["Contact data"],
    processing_description: "Test.",
    stated_purpose: null,
    sector: null,
    alternatives_considered: null,
  };
  const reportLike = { information_needed: result.typed.information_needed as unknown[] };
  const guarded = guardInformationNeeded(reportLike, trimmedRoster, "li_assessment");
  assertEquals(guarded.report.information_needed.length, 0);
  assertEquals(guarded.strippedCount, 1);
});

// ── ePrivacy override + rule override compose `why` ─────────────────────
//
// "If the ePrivacy override already exists, keep its outcome and append the
// reason to `why`" (doc 207 §2.3) sits under the `override_outcome` bullet
// specifically — a degradation-ladder branch's own outcome guard already
// reads `current.outcome`, which IS the ePrivacy override's outcome once it
// exists (bullet 1: `current.outcome = (typed.determination_override ??
// report.lia_determination).outcome`), so none of the three B3-9 branches
// can fire once ePrivacy has already set it to "not_available" — there is
// nothing further to degrade. The composition rule this test pins is for
// an `override_outcome`-kind rule specifically.

Deno.test("ePrivacy override already present — an override_outcome rule keeps its outcome and prepends the reason to `why`", () => {
  const typed = baseTyped({ balancing: "likely_passes" });
  (typed as unknown as Bag).determination_override = {
    outcome: "legitimate_interests_not_available",
    why: "The ePrivacy consent requirement forecloses this processing.",
    exposure_note: "",
    separation_repairs: 0,
    driving_factors: [],
    mitigations: [],
    rebalance_required: false,
    citation: "",
    authority_verbatim: "",
    status: "analysed",
  };
  const overrideRule: AuthorityRule = makeRule({
    rule_id: "test/override-outcome-with-existing-eprivacy",
    trigger: { all_of: ["flag:large_scale"] },
    effect: { kind: "override_outcome", outcome: "legitimate_interests_not_available" },
    reason_sentence: "A separate adverse rule also forecloses this processing.",
  });
  const report = baseReport({ scale_frequency_duration: { large_scale_indicated: true } });
  const result = applyLiaRules(typed, report, baseIntake(), [overrideRule]);
  assertEquals(result.invariant_violations, []);
  const override = result.typed.determination_override as unknown as Bag;
  assertEquals(override.outcome, "legitimate_interests_not_available"); // kept, not overwritten
  assertEquals(
    override.why,
    "A separate adverse rule also forecloses this processing. The ePrivacy consent requirement forecloses this processing.",
  );
});

Deno.test("B3-9 — a cap_verdict degradation branch cannot fire once ePrivacy has already foreclosed the outcome (nothing left to degrade)", () => {
  const typed = baseTyped({ balancing: "likely_passes" });
  (typed as unknown as Bag).determination_override = {
    outcome: "legitimate_interests_not_available",
    why: "The ePrivacy consent requirement forecloses this processing.",
    exposure_note: "",
    separation_repairs: 0,
    driving_factors: [],
    mitigations: [],
    rebalance_required: false,
    citation: "",
    authority_verbatim: "",
    status: "analysed",
  };
  const report = baseReport({ precedent_class_posture: { use_case_class: "direct_marketing" } });
  const intake = baseIntake({ balancing_details: { opt_out_available: "No opt-out is available" } });
  const result = applyLiaRules(typed, report, intake, [W3]);
  assertEquals(result.invariant_violations, []);
  // The cap itself still applies to the verdict (W3 fired and landed)...
  assertEquals(((result.typed.three_part_test as Bag).balancing_test as Bag).verdict, "likely_fails");
  // ...but the pre-existing ePrivacy override is untouched: current.outcome
  // was already "legitimate_interests_not_available", so none of the three
  // B3-9 branches (which all key off "legitimate_interests_available" or an
  // unconditional purpose-fails check that does not apply here) fire.
  const override = result.typed.determination_override as unknown as Bag;
  assertEquals(override.outcome, "legitimate_interests_not_available");
  assertEquals(override.why, "The ePrivacy consent requirement forecloses this processing.");
});

Deno.test("no existing override — an override_outcome rule composes why from the record's own determination", () => {
  const typed = baseTyped();
  const overrideRule: AuthorityRule = makeRule({
    rule_id: "test/override-outcome-fixture",
    trigger: { all_of: ["flag:large_scale"] },
    effect: { kind: "override_outcome", outcome: "legitimate_interests_not_available" },
    reason_sentence: "Test override reason.",
  });
  const report = baseReport({ scale_frequency_duration: { large_scale_indicated: true } });
  const intake = baseIntake();
  const result = applyLiaRules(typed, report, intake, [overrideRule]);
  assertEquals(result.invariant_violations, []);
  const override = result.typed.determination_override as unknown as Bag;
  assert(override);
  assertEquals(override.outcome, "legitimate_interests_not_available");
  assertEquals(override.why, "Test override reason. Baseline determination.");
  assertEquals(override.rebalance_required, false);
  assertEquals(override.status, "analysed");
});

// ── Outcome degradation table (B3-9), synthetic rules per branch ────────

Deno.test("B3-9 — purpose capped to fails overrides the outcome regardless of the pre-pass outcome", () => {
  const capToFails: AuthorityRule = makeRule({
    rule_id: "test/cap-purpose-fails",
    trigger: { all_of: ["flag:large_scale"] },
    effect: { kind: "cap_verdict", element: "purpose", max: "fails" },
  });
  const typed = baseTyped({ purpose: "passes" });
  const report = baseReport({
    scale_frequency_duration: { large_scale_indicated: true },
    lia_determination: { ...(baseReport().lia_determination as Bag), outcome: "available_only_with_mitigations" },
  });
  const result = applyLiaRules(typed, report, baseIntake(), [capToFails]);
  assertEquals(((result.typed.three_part_test as Bag).purpose_test as Bag).verdict, "fails");
  assertEquals((result.typed.determination_override as unknown as Bag).outcome, "legitimate_interests_not_available");
});

Deno.test("B3-9 — balancing capped to likely_fails degrades an available outcome to available_only_with_mitigations, but not an already-mitigated one", () => {
  const capBalancing: AuthorityRule = makeRule({
    rule_id: "test/cap-balancing-likely-fails",
    trigger: { all_of: ["flag:large_scale"] },
    effect: { kind: "cap_verdict", element: "balancing", max: "likely_fails" },
  });
  const typed = baseTyped({ balancing: "likely_passes" });
  const availableReport = baseReport({ scale_frequency_duration: { large_scale_indicated: true } });
  const r1 = applyLiaRules(typed, availableReport, baseIntake(), [capBalancing]);
  assertEquals((r1.typed.determination_override as unknown as Bag).outcome, "available_only_with_mitigations");

  const alreadyMitigated = baseReport({
    scale_frequency_duration: { large_scale_indicated: true },
    lia_determination: {
      ...(baseReport().lia_determination as Bag),
      outcome: "available_only_with_mitigations",
    },
  });
  const r2 = applyLiaRules(typed, alreadyMitigated, baseIntake(), [capBalancing]);
  // Not "legitimate_interests_available" pre-pass, so this branch of the
  // ladder does not fire — no determination_override is written.
  assertEquals(r2.typed.determination_override, null);
});

Deno.test("B3-9 — any element capped to uncertain degrades an available outcome to undetermined_on_the_record", () => {
  const capNecessityUncertain: AuthorityRule = makeRule({
    rule_id: "test/cap-necessity-uncertain",
    trigger: { all_of: ["flag:large_scale"] },
    effect: { kind: "cap_verdict", element: "necessity", max: "uncertain" },
  });
  const typed = baseTyped({ necessity: "passes" });
  const report = baseReport({ scale_frequency_duration: { large_scale_indicated: true } });
  const result = applyLiaRules(typed, report, baseIntake(), [capNecessityUncertain]);
  assertEquals(((result.typed.three_part_test as Bag).necessity_test as Bag).verdict, "uncertain");
  assertEquals((result.typed.determination_override as unknown as Bag).outcome, "undetermined_on_the_record");
});

Deno.test("B3-9 — favorable effects never change the outcome, even when they raise a verdict", () => {
  const typed = baseTyped({ purpose: "uncertain" });
  const report = baseReport({
    precedent_class_posture: { use_case_class: "direct_marketing" },
    lia_determination: { ...(baseReport().lia_determination as Bag), outcome: "undetermined_on_the_record" },
  });
  const result = applyLiaRules(typed, report, baseIntake(), [W2]);
  assertEquals(((result.typed.three_part_test as Bag).purpose_test as Bag).verdict, "passes");
  assertEquals(result.typed.determination_override, null); // outcome untouched
});
