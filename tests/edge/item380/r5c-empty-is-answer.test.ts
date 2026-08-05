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
  "dpia-framework::transfer_flows",
  "dpia-framework::eu_decision_establishment_country",
  "cppa-risk::exceptions_intake",
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

// --- the flag is narrow ----------------------------------------------------

Deno.test("r5c: an UNFLAGGED optional empty key still counts (dpo_advice)", () => {
  assert(emptyAskedKeys(dpiaFrameworkContract, {}).includes("dpo_advice"));
});
