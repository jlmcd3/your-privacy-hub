// ITEM 380 r5c — EMPTY IS A SUBSTANTIVE ANSWER (contract-borne marker).
//
// The marker lives on the IntakeField, never in a floating key-name set in
// record-complete.ts: a bare set would be product-blind and a same-named key
// in a future contract would silently inherit the exclusion.
//
// Authorized fields and their form citations:
//   dpia / transfer_flows                      DPIAFramework.tsx:752-756
//                                              "no cross-border transfer is on the record"
//   dpia / eu_decision_establishment_country   DPIAFramework.tsx:936-941
//                                              emptyLabel "No — decisions are made elsewhere"
//   cppa-risk / exceptions_intake              CPPARiskAssessment.tsx:1655-1710
//                                              "leave blank if none apply"
//   cppa-risk / recipients                     CPPARiskAssessment.tsx:1897-1906 (RK3-A1 g5)
//                                              checkbox "No service provider, contractor,
//                                              or third party receives or has access to
//                                              personal information in this activity."
//                                              emits [] + recipients_none_declared
//
// AUTHORIZED 2026-08-27 (Group 6 sweep) — the CEO-ratified Spine v5.2 / RK3
// landing (2026-08-26) added 26 more emptyIsAnswer fields to the CPPA Risk
// contract; each verified present in CPPARiskAssessment.tsx (grep, not
// assumed) before being added here, per this file's own discipline:
//   cppa-risk / processing_status, processing_start_date,
//     planned_start_date, prior_risk_assessment_date, material_change_date,
//     material_change_description                RK3-A2 g1 — conditional on
//                                              processing_status/material_change_since_prior;
//                                              blank is the valid state on the N/A branch
//   cppa-risk / admt_operational_role, admt_assumptions_limitations,
//     admt_output, admt_output_use, admt_consumer_effect  RK3-A2 g2 —
//                                              conditional on the ADMT trigger (q18); blank
//                                              when ADMT is not in use
//   cppa-risk / admt_made_available_to_other_business,
//     admt_provider_trained_using_pi,
//     recipient_business_uses_admt_for_significant_decision  RK3-A2 g3 —
//                                              § 7153 branch, blank when ADMT is not provided
//                                              to another business
//   cppa-risk / spi_employment_exception_facts  RK3-A2 g4 — blank when the SPI
//                                              employment exception does not apply
//   cppa-risk / harm_category_review_status     RK3-A3 g1 — CPPARiskAssessment.tsx:3021
//                                              "internal QA tracker (never printed)"; blank
//                                              means QA not yet run, never submitted
//   cppa-risk / out_of_scope_activities, comparable_processing_basis,
//     essential_vendors, compounding_pathways   RK3-D — each conditional on its own
//                                              trigger (out_of_scope_confirmation /
//                                              comparable_processing_status /
//                                              vendor_dependency / risk_interdependency_check);
//                                              blank on the branch where the trigger doesn't fire
//   cppa-risk / admt_role_type, admt_logic_documented, human_review_facts,
//     admt_testing_facts                        RK3-D Section V — same ADMT-conditional
//                                              posture as RK3-A2 g2 above
//   cppa-risk / a6_safeguards[].risk_pathway_ids, a6_safeguards[].planned_timeline
//                                              CPPARiskAssessment.tsx:921 — form validation
//                                              states "No committed timeline" is a complete
//                                              answer for a planned safeguard; the pathway
//                                              multi-select is optional per safeguard row
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaAdmtContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";
import { cppaCybersecurityContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-cybersecurity.ts";
import { governanceContract } from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import { liAssessmentStageBContract } from "../../../supabase/functions/_shared/intake-contracts/li-assessment.ts";
import { dpaGeneratorContract } from "../../../supabase/functions/_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract } from "../../../supabase/functions/_shared/intake-contracts/ir-playbook.ts";
import { emptyAskedKeys } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import type { IntakeContract } from "../../../supabase/functions/_shared/intake-contracts/types.ts";

const FLEET: IntakeContract[] = [
  dpiaFrameworkContract,
  cppaRiskContract,
  cppaAdmtContract,
  cppaCybersecurityContract,
  governanceContract,
  liAssessmentStageBContract,
  dpaGeneratorContract,
  irPlaybookContract,
];

/** Change this list only with authorization; each entry needs a form citation. */
const AUTHORIZED = [
  "dpia_framework::transfer_flows",
  "dpia_framework::eu_decision_establishment_country",
  "cppa_risk_assessment::exceptions_intake",
  "cppa_risk_assessment::recipients",
  "cppa_risk_assessment::processing_status",
  "cppa_risk_assessment::processing_start_date",
  "cppa_risk_assessment::planned_start_date",
  "cppa_risk_assessment::prior_risk_assessment_date",
  "cppa_risk_assessment::material_change_date",
  "cppa_risk_assessment::material_change_description",
  "cppa_risk_assessment::admt_operational_role",
  "cppa_risk_assessment::admt_assumptions_limitations",
  "cppa_risk_assessment::admt_output",
  "cppa_risk_assessment::admt_output_use",
  "cppa_risk_assessment::admt_consumer_effect",
  "cppa_risk_assessment::admt_made_available_to_other_business",
  "cppa_risk_assessment::admt_provider_trained_using_pi",
  "cppa_risk_assessment::recipient_business_uses_admt_for_significant_decision",
  "cppa_risk_assessment::spi_employment_exception_facts",
  "cppa_risk_assessment::harm_category_review_status",
  "cppa_risk_assessment::out_of_scope_activities",
  "cppa_risk_assessment::comparable_processing_basis",
  "cppa_risk_assessment::essential_vendors",
  "cppa_risk_assessment::compounding_pathways",
  "cppa_risk_assessment::admt_role_type",
  "cppa_risk_assessment::admt_logic_documented",
  "cppa_risk_assessment::human_review_facts",
  "cppa_risk_assessment::admt_testing_facts",
  "cppa_risk_assessment::a6_safeguards[].risk_pathway_ids",
  "cppa_risk_assessment::a6_safeguards[].planned_timeline",
  // DOC 157 (2026-09-03, CEO-ratified build) — § 7152(a)(7) decision fields.
  // Form citation: src/pages/CPPARiskAssessment.tsx "Finalization stage"
  // panel (final_processing_decision / _notes), completed AFTER the analysis
  // is reviewed; at intake, empty is the honest "not yet decided" state and
  // the report states it (doc-28 §4 reserved-decision carve-out).
  "cppa_risk_assessment::final_processing_decision",
  "cppa_risk_assessment::final_processing_decision_notes",
].sort();

Deno.test("r5c LINT: emptyIsAnswer appears on exactly the authorized fields fleet-wide", () => {
  const found: string[] = [];
  for (const c of FLEET) {
    for (const f of c.fields) {
      if (f.emptyIsAnswer === true) found.push(`${c.tool_type}::${f.key}`);
    }
  }
  assertEquals(found.sort(), AUTHORIZED);
});

// --- dpia / transfer_flows -------------------------------------------------

Deno.test("r5c: transfer_flows — empty is NOT counted", () => {
  assert(!emptyAskedKeys(dpiaFrameworkContract, { transfer_flows: [] }).includes("transfer_flows"));
  assert(!emptyAskedKeys(dpiaFrameworkContract, {}).includes("transfer_flows"));
});

Deno.test("r5c: transfer_flows — answered is NOT counted", () => {
  const empty = emptyAskedKeys(dpiaFrameworkContract, {
    transfer_flows: [{ destination: "US", mechanism: "SCCs" }],
  });
  assert(!empty.includes("transfer_flows"));
});

// --- dpia / eu_decision_establishment_country ------------------------------

Deno.test("r5c: eu_decision_establishment_country — empty is NOT counted", () => {
  assert(
    !emptyAskedKeys(dpiaFrameworkContract, { eu_decision_establishment_country: "" })
      .includes("eu_decision_establishment_country"),
  );
});

Deno.test("r5c: eu_decision_establishment_country — answered is NOT counted", () => {
  assert(
    !emptyAskedKeys(dpiaFrameworkContract, { eu_decision_establishment_country: "IE" })
      .includes("eu_decision_establishment_country"),
  );
});

// --- cppa-risk / exceptions_intake -----------------------------------------

Deno.test("r5c: exceptions_intake — empty is NOT counted", () => {
  assert(!emptyAskedKeys(cppaRiskContract, { exceptions_intake: {} }).includes("exceptions_intake"));
  assert(!emptyAskedKeys(cppaRiskContract, {}).includes("exceptions_intake"));
});

Deno.test("r5c: exceptions_intake — answered is NOT counted", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    exceptions_intake: { security_exception: "Fraud detection logs" },
  });
  assert(!empty.includes("exceptions_intake"));
});

// --- cppa-risk / recipients (RK3-A1 g5) ------------------------------------

Deno.test("r5c: recipients — empty is NOT counted (declared-None emits [])", () => {
  assert(!emptyAskedKeys(cppaRiskContract, { recipients: [] }).includes("recipients"));
  assert(!emptyAskedKeys(cppaRiskContract, {}).includes("recipients"));
});

Deno.test("r5c: recipients — answered is NOT counted", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    recipients: [{
      recipient_name_or_category: "AWS",
      recipient_type: "Service provider",
      pi_categories_made_available: ["Device identifiers (IP, cookies, device IDs)"],
      disclosure_purpose: "Cloud hosting",
    }],
  });
  assert(!empty.includes("recipients"));
});

// --- the flag is narrow ----------------------------------------------------

Deno.test("r5c: an UNFLAGGED optional empty key still counts (dpo_advice)", () => {
  assert(emptyAskedKeys(dpiaFrameworkContract, {}).includes("dpo_advice"));
});
