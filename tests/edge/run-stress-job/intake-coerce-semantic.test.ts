// PANEL FIX (2026-08-31) — SEMANTIC coercion passes.
//
// Every value below is a verbatim INTAKE_CONTRACT_GATE rejection from batch
// b8c21317 that the naming-level coercion could not resolve, because the
// generator answered the QUESTION rather than picking a LABEL:
//   • "Yes" against a Confirmed/gap pair, or against a list with no "Yes …"
//     label at all;
//   • "186,000" / "45 days" against band-shaped options;
//   • a containment narrative against Yes / No / Unknown;
//   • "Published and reviewed annually" against "reviewed in last 12 months";
//   • "…vendor credential…" against "Phishing / credential compromise".
// None of these may fail the gate again.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { coerceValue, coerceIntakeToContract } from "../../../supabase/functions/run-stress-job/_local/intake-coerce.ts";
import { blockingContractViolations } from "../../../supabase/functions/run-stress-job/_local/intake-gate.ts";
import { cppaAdmtContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { governanceContract } from "../../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import { irPlaybookContract } from "../../../supabase/functions/_shared/intake-contracts/ir-playbook.ts";
import { liAssessmentStageBContract } from "../../../supabase/functions/_shared/intake-contracts/li-assessment.ts";

const REPLAY: Array<[string, unknown, Record<string, unknown>]> = [
  ["cppa-admt", cppaAdmtContract, {
    opt_out_no_cookie_banner: "Yes",
    opt_out_no_account_required: "Yes",
    access_response_timeline: "45 days",
  }],
  ["cppa-risk", cppaRiskContract, {
    q7_right_delete: "Yes",
    q8_right_correct: "Yes",
    q9_opt_out: "Yes",
    q11_policy_review: "Annual",
    q12_notice_at_collection: "Provided",
  }],
  ["governance", governanceContract, {
    privacy_policy: "Published and reviewed annually",
    dpo_status: "Privacy lead appointed",
    dpia_status: "Completed for high-risk workflows",
    training_status: "Annual mandatory privacy training",
  }],
  ["governance", governanceContract, { dpo_status: "DPO appointed" }],
  ["ir-playbook", irPlaybookContract, {
    cause: "Compromised vendor credential exposed a limited support dataset",
    affectedCount: "186,000",
    contained: "Credentials revoked, sessions invalidated, logs preserved, vendor access restricted",
  }],
  ["lia", liAssessmentStageBContract, {
    balancing_details: {
      reasonable_expectation: "Users expect security and service telemetry",
      potential_harm: "Unexpected profiling if safeguards fail",
    },
  }],
];

for (const [tool, contract, intake] of REPLAY) {
  Deno.test(`semantic coercion clears the gate — ${tool} ${Object.keys(intake).join(",")}`, () => {
    // deno-lint-ignore no-explicit-any
    const { intake: out } = coerceIntakeToContract(contract as any, intake);
    assertEquals(blockingContractViolations(tool, out), []);
  });
}

Deno.test("semantic passes pick the RIGHT rung, not merely a valid one", () => {
  const opt = (c: typeof governanceContract, k: string) => c.fields.find((f) => f.key === k)!.options!;
  assertEquals(coerceValue("DPO appointed", opt(governanceContract, "dpo_status"), "dpo_status"), "Yes, formal DPO");
  assertEquals(
    coerceValue("Privacy lead appointed", opt(governanceContract, "dpo_status"), "dpo_status"),
    "Yes, informal privacy lead",
  );
  assertEquals(
    coerceValue("Published and reviewed annually", opt(governanceContract, "privacy_policy"), "privacy_policy"),
    "Yes, current (reviewed in last 12 months)",
  );
  assertEquals(
    coerceValue("186,000", opt(irPlaybookContract, "affectedCount"), "affectedCount"),
    "More than 100,000",
  );
  assertEquals(
    coerceValue("Compromised vendor credential exposed a limited support dataset", opt(irPlaybookContract, "cause"), "cause"),
    "Phishing / credential compromise",
  );
  assertEquals(coerceValue("None", opt(irPlaybookContract, "contained"), "contained"), "No");
  assertEquals(coerceValue("Still investigating", opt(irPlaybookContract, "contained"), "contained"), "Unknown");
  assertEquals(
    coerceValue("Within 12 months", opt(cppaRiskContract, "q11_policy_review"), "q11_policy_review"),
    "Within 12 months",
  );
});

Deno.test("semantic passes do not resolve genuinely wrong values", () => {
  const revenue = cppaRiskContract.fields.find((f) => f.key === "q1_revenue")!.options!;
  assertEquals(coerceValue("about seventeen bananas", revenue, "q1_revenue"), null);
  const cause = irPlaybookContract.fields.find((f) => f.key === "cause")!.options!;
  assertEquals(coerceValue("meteorite strike on the datacentre roof", cause, "cause"), null);
});
