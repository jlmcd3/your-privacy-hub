// DOC 206E — N1/N4/N4b/N6 rule-facing states.
//
// Pins buildLiaRuleStates's §2 additions: the three absent-answer sentinels
// (Law B2 — records made before these fields existed, which revisions
// re-run) and the per-option booleans for the two multi-selects
// (balancing_details.safeguards, purpose_details.marketing_channels).
//
// Minimal hand-built Bags, in the same spirit as doc207-rule-pass.test.ts —
// this file tests buildLiaRuleStates in isolation, not the full pipeline.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildLiaRuleStates } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-states.ts";
import type { LiaTypedStage2Result } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";

type Bag = Record<string, unknown>;

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
    alternatives_considered: { alternatives: [] },
    ...overrides,
  };
}

function baseIntake(overrides: Bag = {}): Bag {
  return {
    jurisdictions: ["EU (GDPR)"],
    data_categories: ["Contact data"],
    relationship_type: "Existing customer",
    purpose_details: {},
    balancing_details: {},
    necessity_details: {},
    attestation: {},
    ...overrides,
  };
}

function baseTyped(): LiaTypedStage2Result {
  return {
    three_part_test: {
      purpose_test: { verdict: "uncertain", analysis: "", risk_factors: [], supporting_factors: [] },
      necessity_test: { verdict: "passes", analysis: "", risk_factors: [], supporting_factors: [] },
      balancing_test: { verdict: "likely_passes", analysis: "", risk_factors: [], supporting_factors: [] },
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

// ── Sentinels ────────────────────────────────────────────────────────────

Deno.test("206E sentinel — special-category true + art9_condition absent -> 'Not yet assessed'", () => {
  const intake = baseIntake({ balancing_details: { special_category_data: true } });
  const states = buildLiaRuleStates(baseReport(), intake, baseTyped());
  assertEquals(states.states["intake.balancing_details.art9_condition"], "Not yet assessed");
});

Deno.test("206E sentinel — special-category true + art9_condition ANSWERED is left alone", () => {
  const intake = baseIntake({
    balancing_details: { special_category_data: true, art9_condition: "None identified" },
  });
  const states = buildLiaRuleStates(baseReport(), intake, baseTyped());
  assertEquals(states.states["intake.balancing_details.art9_condition"], "None identified");
});

Deno.test("206E sentinel — special-category NOT true: art9_condition state stays null (no sentinel)", () => {
  const falseCase = buildLiaRuleStates(
    baseReport(),
    baseIntake({ balancing_details: { special_category_data: false } }),
    baseTyped(),
  );
  assertEquals(falseCase.states["intake.balancing_details.art9_condition"], null);

  const absentCase = buildLiaRuleStates(baseReport(), baseIntake(), baseTyped());
  assertEquals(absentCase.states["intake.balancing_details.art9_condition"], null);
});

Deno.test("206E sentinel — necessity_details.achievable_without_personal_data absent -> 'Not assessed'", () => {
  const states = buildLiaRuleStates(baseReport(), baseIntake(), baseTyped());
  assertEquals(states.states["intake.necessity_details.achievable_without_personal_data"], "Not assessed");
});

Deno.test("206E sentinel — achievable_without_personal_data ANSWERED is left alone", () => {
  const intake = baseIntake({
    necessity_details: { achievable_without_personal_data: "Not assessed" },
  });
  const states = buildLiaRuleStates(baseReport(), intake, baseTyped());
  assertEquals(states.states["intake.necessity_details.achievable_without_personal_data"], "Not assessed");

  const answered = buildLiaRuleStates(
    baseReport(),
    baseIntake({
      necessity_details: {
        achievable_without_personal_data:
          "Yes — the purpose could be achieved without personal data, or with anonymised or synthetic data",
      },
    }),
    baseTyped(),
  );
  assertEquals(
    answered.states["intake.necessity_details.achievable_without_personal_data"],
    "Yes — the purpose could be achieved without personal data, or with anonymised or synthetic data",
  );
});

Deno.test("206E sentinel — marketing_channels includes email/SMS + marketing_consent_basis absent -> 'Not yet assessed'", () => {
  const intake = baseIntake({
    purpose_details: { marketing_channels: ["Email or SMS to individuals", "Post"] },
  });
  const states = buildLiaRuleStates(baseReport(), intake, baseTyped());
  assertEquals(states.states["intake.purpose_details.marketing_consent_basis"], "Not yet assessed");
});

Deno.test("206E sentinel — marketing_channels WITHOUT email/SMS: marketing_consent_basis state stays null", () => {
  const intake = baseIntake({ purpose_details: { marketing_channels: ["Post"] } });
  const states = buildLiaRuleStates(baseReport(), intake, baseTyped());
  assertEquals(states.states["intake.purpose_details.marketing_consent_basis"], null);
});

Deno.test("206E sentinel — marketing_channels absent entirely: marketing_consent_basis state stays null", () => {
  const states = buildLiaRuleStates(baseReport(), baseIntake(), baseTyped());
  assertEquals(states.states["intake.purpose_details.marketing_consent_basis"], null);
});

// ── Per-option booleans — balancing_details.safeguards ─────────────────

Deno.test("206E safeguards — every fixed-map slug is true when its option is recorded, false otherwise, plus .recorded", () => {
  const intake = baseIntake({
    balancing_details: {
      safeguards: [
        "Retention limits",
        "Notice at collection (privacy information given when the data is collected)",
      ],
    },
  });
  const states = buildLiaRuleStates(baseReport(), intake, baseTyped()).states;
  assertEquals(states["intake.balancing_details.safeguards.retention_limits"], true);
  assertEquals(states["intake.balancing_details.safeguards.notice_at_collection"], true);
  assertEquals(states["intake.balancing_details.safeguards.recorded"], true);
  // Not selected -> false.
  assertEquals(states["intake.balancing_details.safeguards.pseudonymisation"], false);
  assertEquals(states["intake.balancing_details.safeguards.access_controls"], false);
  assertEquals(states["intake.balancing_details.safeguards.independent_oversight"], false);
  assertEquals(states["intake.balancing_details.safeguards.dpia_completed"], false);
  assertEquals(states["intake.balancing_details.safeguards.vendor_due_diligence"], false);
  assertEquals(states["intake.balancing_details.safeguards.opt_out_offered"], false);
  assertEquals(states["intake.balancing_details.safeguards.other"], false);
  // Pre-existing form option not named in doc 206E §2's fixed map — added
  // with an obvious slug per the spec's own instruction.
  assertEquals(states["intake.balancing_details.safeguards.encryption"], false);
});

Deno.test("206E safeguards — empty/absent array: every slug false, .recorded false", () => {
  const states = buildLiaRuleStates(baseReport(), baseIntake(), baseTyped()).states;
  assertEquals(states["intake.balancing_details.safeguards.recorded"], false);
  assertEquals(states["intake.balancing_details.safeguards.retention_limits"], false);
  assertEquals(states["intake.balancing_details.safeguards.other"], false);
});

Deno.test("206E safeguards — an unrecognised string sets nothing for itself but does not block the rest", () => {
  const intake = baseIntake({
    balancing_details: { safeguards: ["Retention limits", "Some future option not yet mapped"] },
  });
  const states = buildLiaRuleStates(baseReport(), intake, baseTyped()).states;
  assertEquals(states["intake.balancing_details.safeguards.retention_limits"], true);
  assertEquals(states["intake.balancing_details.safeguards.recorded"], true);
});

// ── Per-option booleans — purpose_details.marketing_channels ────────────

Deno.test("206E marketing_channels — every slug is true when its option is recorded, false otherwise, plus .recorded", () => {
  const intake = baseIntake({
    purpose_details: { marketing_channels: ["Email or SMS to individuals", "Online advertising"] },
  });
  const states = buildLiaRuleStates(baseReport(), intake, baseTyped()).states;
  assertEquals(states["intake.purpose_details.marketing_channels.email_sms"], true);
  assertEquals(states["intake.purpose_details.marketing_channels.online_advertising"], true);
  assertEquals(states["intake.purpose_details.marketing_channels.recorded"], true);
  assertEquals(states["intake.purpose_details.marketing_channels.automated_calls"], false);
  assertEquals(states["intake.purpose_details.marketing_channels.live_calls"], false);
  assertEquals(states["intake.purpose_details.marketing_channels.post"], false);
  assertEquals(states["intake.purpose_details.marketing_channels.none"], false);
});

Deno.test("206E marketing_channels — empty/absent array: every slug false, .recorded false", () => {
  const states = buildLiaRuleStates(baseReport(), baseIntake(), baseTyped()).states;
  assertEquals(states["intake.purpose_details.marketing_channels.recorded"], false);
  assertEquals(states["intake.purpose_details.marketing_channels.email_sms"], false);
});

// ── Existing tests untouched — spot-check that adding these paths did not
// disturb the pre-existing intake.* state coercion for an unrelated path. ──

Deno.test("206E — pre-existing intake state coercion (jurisdictions) is unaffected", () => {
  const states = buildLiaRuleStates(baseReport(), baseIntake(), baseTyped()).states;
  assertEquals(states["intake.jurisdictions"], "EU (GDPR)");
});
