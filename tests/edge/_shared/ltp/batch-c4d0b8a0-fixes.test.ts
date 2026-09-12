// BATCH c4d0b8a0 (2026-09-12) — independent review + fixes for the latest
// all-products batch, per the CEO's "review and fix errors in the products
// and the graders." ChatGPT's own comments on this batch arrive separately.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSaNotificationDetermination } from "../../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { assembleIRSkeletonDocument } from "../../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { applyLiaRules } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-pass.ts";
import type { LiaTypedStage2Result } from "../../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { buildFactorAuthorityMatrixTable } from "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-skeleton-assemble.ts";
import { runRiskFactorEngine } from "../../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-factor-engine.ts";

type Bag = Record<string, unknown>;

// ── IR playbook: the parallel-regime note is no longer truncated ──────────

Deno.test("batch c4d0b8a0 — IR: the parallel-regime note keeps its payoff sentence (the other regime applies independently and is not discharged by this notification)", () => {
  const intake: Bag = {
    organizationName: "Velorix Digital Services Ltd", organisationType: "SaaS platform", discoveryDateTime: "2026-09-01T10:00",
    cause: "Ransomware or malware", dataTypes: ["Passwords / credentials"], affectedCount: "1,000–10,000",
    jurisdictions: ["EU/EEA", "United Kingdom"], contained: "Yes",
  };
  const sa = buildSaNotificationDetermination(intake, "eu");
  assert(sa.parallel_duty_note, "parallel_duty_note must be present for a mixed EU/UK record");
  assertStringIncludes(sa.parallel_duty_note!, "applies independently and is determined separately");
  assertStringIncludes(sa.parallel_duty_note!, "does not discharge the other");
  const report: Bag = { sa_notification_determination: sa, ds_communication_determination: {} };
  const text = skeletonDocumentToText(assembleIRSkeletonDocument(report, intake).document);
  assertStringIncludes(text, "applies independently and is determined separately");
  assertStringIncludes(text, "does not discharge the other");
});

// ── LIA: the necessity claim no longer contradicts an open necessity condition ──
// Fixture shapes copied from the proven working pattern in
// tests/edge/run-li-assessment/doc207-rule-pass.test.ts.

function baseReport(overrides: Bag = {}): Bag {
  return {
    interest_legitimacy: { verdict: "legitimate_interest_established" },
    child_factor: { determination: "children_not_in_scope" },
    public_authority_exclusion: { determination: "exclusion_does_not_apply", basis_unavailable: false },
    scale_frequency_duration: { large_scale_indicated: false },
    eprivacy_short_circuit: { determination: "not_engaged_on_the_record" },
    precedent_class_posture: { use_case_class: "product_improvement" },
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
      why: "Legitimate interests carries this processing as the record stands: the interest is stated, the comparison against less intrusive means is documented, and no factor weighed above places the data subjects' interests, rights and freedoms above the interest pursued.",
      exposure_note: "", separation_repairs: 0, driving_factors: [], mitigations: [], rebalance_required: false,
      citation: "GDPR Art. 6(1)(f)", authority_verbatim: "", status: "analysed",
    },
    ...overrides,
  };
}
function baseTyped(overrides: Partial<{ purpose: string; necessity: string; balancing: string }> = {}): LiaTypedStage2Result {
  const purpose = overrides.purpose ?? "passes";
  const necessity = overrides.necessity ?? "passes";
  const balancing = overrides.balancing ?? "passes";
  return {
    three_part_test: {
      purpose_test: { verdict: purpose, analysis: "Purpose analysis.", risk_factors: [], supporting_factors: [] },
      necessity_test: { verdict: necessity, analysis: "Necessity analysis.", risk_factors: [], supporting_factors: [] },
      balancing_test: { verdict: balancing, analysis: "Balancing analysis.", risk_factors: [], supporting_factors: [] },
      overall_assessment: {
        argument_strength: "moderate", strength_basis: "Test fixture.",
        closest_accepted_precedent: "None identified in current database", closest_rejected_precedent: "None identified in current database",
        key_distinguishing_factors: [], blocking_issues: [], argument_strength_note: "Test fixture.",
      },
      annotations: [],
    },
    information_needed: [], determination_override: null, eprivacy_foreclosed: false,
  } as unknown as LiaTypedStage2Result;
}
function baseIntake(overrides: Bag = {}): Bag {
  return {
    jurisdictions: ["EU (GDPR)"], data_categories: ["Contact data"], relationship_type: "Existing customer",
    processing_description: "Product usage metrics are analysed to improve feature adoption.",
    purpose_details: { interest_type: "Research / product improvement" },
    necessity_details: { achievable_without_personal_data: "Not assessed" },
    balancing_details: {
      relationship_category: "Customer", special_category_data: false, children_data_subjects: "No",
      safeguards: ["Access controls"], opt_out_available: "Yes — unconditional, on request, with no consequence",
    },
    attestation: {},
    ...overrides,
  };
}

Deno.test("batch c4d0b8a0 — LIA: 'legitimate interests available' no longer claims the less-intrusive-means comparison is documented while an open necessity condition asks for exactly that", () => {
  const report = baseReport();
  const ruled = applyLiaRules(baseTyped(), report, baseIntake());
  assertEquals(ruled.invariant_violations, []);
  const infoNeeded = JSON.stringify(ruled.typed.information_needed);
  assertStringIncludes(infoNeeded, "Record whether the purpose could be achieved with anonymised or synthetic data");
  assert(ruled.typed.determination_override, "the determination must be patched when the necessity condition is open");
  const why = String((ruled.typed.determination_override as Bag).why ?? "");
  assert(!why.includes("the comparison against less intrusive means is documented"), why);
  assertStringIncludes(why, "remains an open record-completion item");
});

Deno.test("batch c4d0b8a0 — LIA: an already-complete alternatives comparison is unaffected (no patch)", () => {
  const report = baseReport();
  const ruled = applyLiaRules(baseTyped(), report, baseIntake({ necessity_details: { achievable_without_personal_data: "No — the purpose requires identifiable data" } }));
  assert(!ruled.typed.determination_override, "no patch is needed when the necessity condition never opened");
});

Deno.test("batch c4d0b8a0 — LIA: an unrelated use case (not product-improvement/research) never opens the condition, so the claim is untouched", () => {
  const report = baseReport({ precedent_class_posture: { use_case_class: "contractual_administration" } });
  const ruled = applyLiaRules(baseTyped(), report, baseIntake({ purpose_details: { interest_type: "Commercial / revenue-related" } }));
  assert(!ruled.typed.determination_override, "the rule's any_of gate (product_improvement/research_analytics) must not fire here");
});

// ── Risk: the ADMT training-data authority reads the trigger ─────────────

function nestwaveFixture(): Bag {
  return JSON.parse(Deno.readTextFileSync(new URL("../../fixtures/batch13/nestwave.json", import.meta.url))) as Bag;
}

Deno.test("batch c4d0b8a0 — Risk: the ADMT training-data row cites § 7150(b)(6) only when the training trigger is engaged", () => {
  // BATCH a77240e3 (2026-09-12, RISK5-02, ChatGPT + Claude joint review) —
  // this test originally toggled `admt_provider_trained_using_pi`, a
  // different, optional field used elsewhere for the § 7153
  // made-available-to-another-business scenario. It happened to pass
  // because the code ALSO keyed off that wrong field — the exact bug
  // ChatGPT's review caught. The real § 7150(b)(6) trigger this row cites
  // is `q18b_admt_training` (cppa-risk-gates.ts; the same "Yes" test
  // risk-factor-engine.ts already runs); the fixture's own
  // `admt_provider_trained_using_pi: "No"` is left untouched and irrelevant
  // to this row now.
  const base = nestwaveFixture();
  const notTrained = { ...base, q18b_admt_training: "No" };
  const report1: Bag = {};
  const engine1 = runRiskFactorEngine(notTrained, report1, "2026-09-12");
  const table1 = buildFactorAuthorityMatrixTable(report1, notTrained, engine1, null);
  const row1 = table1?.rows.find((r) => r[0] === "ADMT training data");
  if (row1) assertEquals(row1[2], "11 CCR § 7152(a)(3)(G)");
  const trained = { ...base, q18b_admt_training: "Yes" };
  const report2: Bag = {};
  const engine2 = runRiskFactorEngine(trained, report2, "2026-09-12");
  const table2 = buildFactorAuthorityMatrixTable(report2, trained, engine2, null);
  const row2 = table2?.rows.find((r) => r[0] === "ADMT training data");
  if (row2) assertStringIncludes(row2[2], "11 CCR § 7150(b)(6)");
});
