// Guard for the harness contract-coercion net (2026-08-31). Every value below
// was observed as a real INTAKE_CONTRACT_GATE rejection in batch
// 55ae5688-8785-438f-ab84-45872fca18ad; none of them may fail the gate again.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { coerceIntakeToContract } from "./intake-coerce.ts";
import { blockingContractViolations } from "./intake-gate.ts";
import { biometricContract } from "../../_shared/intake-contracts/biometric.ts";
import { governanceContract } from "../../_shared/intake-contracts/governance-assessment.ts";
import { cppaRiskContract } from "../../_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaAdmtContract } from "../../_shared/intake-contracts/cppa-admt.ts";
import { dpaGeneratorContract } from "../../_shared/intake-contracts/dpa-generator.ts";
import { dpiaFrameworkContract } from "../../_shared/intake-contracts/dpia-framework.ts";
import { liAssessmentStageBContract } from "../../_shared/intake-contracts/li-assessment.ts";

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
