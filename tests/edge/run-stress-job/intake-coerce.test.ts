// Guard for the harness contract-coercion net (2026-08-31). Every value below
// was observed as a real INTAKE_CONTRACT_GATE rejection in batch
// 55ae5688-8785-438f-ab84-45872fca18ad; none of them may fail the gate again.
//
// PANEL FIX 11 follow-on (2026-08-31): moved here from
// supabase/functions/run-stress-job/_local/ — that directory is in NONE of
// the three battery Deno trees (tests/edge/, supabase/functions/_tests/,
// the ADMT-v1 file), so as authored the test never ran in the standing full
// battery. Also adds the required-always clearing guard (the class behind
// batch b8c21317's biometric 400).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { coerceIntakeToContract } from "../../../supabase/functions/run-stress-job/_local/intake-coerce.ts";
import { blockingContractViolations } from "../../../supabase/functions/run-stress-job/_local/intake-gate.ts";
import { biometricContract } from "../../../supabase/functions/_shared/intake-contracts/biometric.ts";
import { governanceContract } from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaAdmtContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";
import { dpaGeneratorContract } from "../../../supabase/functions/_shared/intake-contracts/dpa-generator.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { liAssessmentStageBContract } from "../../../supabase/functions/_shared/intake-contracts/li-assessment.ts";

const CASES: Array<[string, unknown, Record<string, unknown>]> = [
  ["biometric", biometricContract, {
    biometricTypes: ["none currently deployed", "Facial recognition"],
    orgType: "Children & EdTech organisation",
    purpose: "None — no biometric systems currently in use",
    jurisdictions: ["European Union", "United Kingdom", "GB", "California (US)"],
  }],
  ["governance", governanceContract, {
    sector: "Children & EdTech", org_size: "Large Enterprise",
    jurisdictions: ["European Union", "United Kingdom", "GB"],
    tools: ["OneTrust", "Google Analytics"],
  }],
  ["cppa-risk", cppaRiskContract, {
    q3_sector: "Children & EdTech",
    q4_pi_categories: ["identifiers", "internet activity", "commercial information"],
    q5_sell_share: "Yes",
    q6_right_know_multi: ["categories", "specific pieces"],
  }],
  ["cppa-admt", cppaAdmtContract, {
    decision_domains: ["service_eligibility", "hiring"],
    human_review: "No — fully automated; opt-out suppresses scoring immediately",
    notice_delivery: ["privacy_policy", "just_in_time"],
    notice_has_opt_out_desc: "Yes",
  }],
  ["dpa", dpaGeneratorContract, {
    controllerJurisdiction: "GB",
    dataCategories: ["account identifiers", "contact details", "usage logs"],
  }],
  ["dpia", dpiaFrameworkContract, {
    data_categories: ["educational records", "usage logs", "contact details"],
    existing_safeguards: ["encryption", "access control"],
  }],
  ["lia", liAssessmentStageBContract, { jurisdictions: ["EU", "UK"] }],
];

for (const [tool, contract, intake] of CASES) {
  Deno.test(`coercion clears the gate — ${tool}`, () => {
    // deno-lint-ignore no-explicit-any
    const { intake: out } = coerceIntakeToContract(contract as any, intake);
    assertEquals(blockingContractViolations(tool, out), []);
  });
}

Deno.test("a genuinely wrong value is left for the gate to refuse", () => {
  const { intake } = coerceIntakeToContract(cppaRiskContract, { q1_revenue: "about seventeen bananas" });
  assertEquals(intake.q1_revenue, "about seventeen bananas");
});

// PANEL FIX 11 follow-on — the empty-fatal guard. Clearing an all-unmatched
// list to [] let the job sail past the gate (missing-required is advisory)
// and detonate inside the product with an opaque 400 for the fields whose
// emptiness the endpoint hard-rejects (batch b8c21317: biometricTypes
// ["none currently deployed"] → [] → check-biometric-compliance 400 "At
// least one biometric type required"). For EMPTY_FATAL_FIELDS the coercer
// now snaps the list onto the contract's own catch-all option — the answer
// the form itself offers — so the run proceeds and the PRODUCT is measured.
// Every other field keeps the clearing behavior (tolerant products run
// degraded-but-honest — see the dpa dataCategories replay case above).
Deno.test("empty-fatal field (biometricTypes) with no resolvable element falls back to the contract catch-all", () => {
  const raw = { biometricTypes: ["quantum aura scanning"] };
  const { intake } = coerceIntakeToContract(biometricContract, raw);
  assertEquals(intake.biometricTypes, ["Other biometric identifier"]);
  assertEquals(blockingContractViolations("biometric", intake), []);
});


Deno.test("non-fatal list with no resolvable element is still cleared (absence is legitimate product input)", () => {
  // governance.special_categories_list — no endpoint 400s on its absence.
  const { intake } = coerceIntakeToContract(governanceContract, {
    special_categories_list: ["thermal signature data"],
  });
  assertEquals(intake.special_categories_list, []);
});
