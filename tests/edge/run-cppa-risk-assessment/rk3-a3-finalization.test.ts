// RK3-A3 GROUP 3 — §3 Finalization stage contract (doc 31 §3 — NEW-F fields)
// Pins the finalization contract end to end:
//   contract  — cppa_risk_finalization carries 11 fields:
//               final_processing_decision + notes,
//               assessment_reviewers_approvers (4 fields),
//               approver_authority_confirmed + basis,
//               a9_approval_date + a8_information_providers (D10 restaged),
//               finalization_required_follow_up_resolved.
//   enums     — FINAL_PROCESSING_DECISION_PLANNED_OPTS / ONGOING_OPTS /
//               FINAL_PROCESSING_DECISION_OPTS / REVIEWER_ROLE_OPTS parity
//               between cppa-risk-assessment-finalization.ts and
//               CPPARiskAssessment.enums.ts.
//   labels    — FIELD_LABELS covers all new finalization-specific keys.
//   D10       — a8_information_providers and a9_approval_date are required
//               in this contract at "always" (they are "optional" in the
//               main intake contract after D10 restaging).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  cppaRiskFinalizationContract,
  FINAL_PROCESSING_DECISION_PLANNED_OPTS,
  FINAL_PROCESSING_DECISION_ONGOING_OPTS,
  FINAL_PROCESSING_DECISION_OPTS,
  REVIEWER_ROLE_OPTS,
} from "../../../supabase/functions/_tests/intake-contracts/cppa-risk-assessment-finalization.ts";
import { FIELD_LABELS } from "../../../supabase/functions/_shared/customer-messages.ts";
// Frontend parity copies
import {
  FINAL_PROCESSING_DECISION_PLANNED_OPTS as FE_PLANNED,
  FINAL_PROCESSING_DECISION_ONGOING_OPTS as FE_ONGOING,
  FINAL_PROCESSING_DECISION_OPTS as FE_ALL,
  REVIEWER_ROLE_OPTS as FE_REVIEWER_ROLE,
} from "../../../src/pages/CPPARiskAssessment.enums.ts";

const field = (key: string) => cppaRiskFinalizationContract.fields.find((f) => f.key === key);

// ── CONTRACT ─────────────────────────────────────────────────────────────────

Deno.test("RK3-A3 g3 — finalization contract id and version are stable", () => {
  assertEquals(cppaRiskFinalizationContract.id, "cppa_risk_finalization");
  assertEquals(cppaRiskFinalizationContract.version, "2.0.0");
});

Deno.test("RK3-A3 g3 — finalization contract has exactly 11 fields", () => {
  assertEquals(cppaRiskFinalizationContract.fields.length, 11);
});

Deno.test("RK3-A3 g3 — final_processing_decision is always-required enum with 6 options", () => {
  const f = field("final_processing_decision");
  assert(f, "final_processing_decision missing from cppaRiskFinalizationContract");
  assertEquals(f!.kind, "enum");
  assertEquals(f!.required, "always");
  assertEquals([...(f!.options as readonly string[])], [...FINAL_PROCESSING_DECISION_OPTS]);
});

Deno.test("RK3-A3 g3 — assessment_reviewers_approvers and child fields are correct", () => {
  const parent = field("assessment_reviewers_approvers");
  assert(parent, "assessment_reviewers_approvers missing");
  assertEquals(parent!.kind, "structured");
  assertEquals(parent!.required, "always");

  for (const key of [
    "assessment_reviewers_approvers[].name",
    "assessment_reviewers_approvers[].position",
  ]) {
    const f = field(key);
    assert(f, `${key} missing`);
    assertEquals(f!.kind, "text");
    assertEquals(f!.required, "conditional");
  }

  const roleField = field("assessment_reviewers_approvers[].role");
  assert(roleField, "assessment_reviewers_approvers[].role missing");
  assertEquals(roleField!.kind, "enum");
  assertEquals(roleField!.required, "conditional");
  assertEquals([...(roleField!.options as readonly string[])], [...REVIEWER_ROLE_OPTS]);
});

Deno.test("RK3-A3 g3 — D10 restaged: a9_approval_date and a8_information_providers are always-required in finalization contract", () => {
  const dateField = field("a9_approval_date");
  assert(dateField, "a9_approval_date missing from cppaRiskFinalizationContract");
  assertEquals(dateField!.kind, "date");
  assertEquals(dateField!.required, "always");

  const providersField = field("a8_information_providers");
  assert(providersField, "a8_information_providers missing from cppaRiskFinalizationContract");
  assertEquals(providersField!.kind, "narrative");
  assertEquals(providersField!.required, "always");
});

// ── ENUM PARITY ───────────────────────────────────────────────────────────────

Deno.test("RK3-A3 g3 — FINAL_PROCESSING_DECISION_PLANNED_OPTS parity between contract and enums file", () => {
  assertEquals([...FE_PLANNED], [...FINAL_PROCESSING_DECISION_PLANNED_OPTS]);
});

Deno.test("RK3-A3 g3 — FINAL_PROCESSING_DECISION_ONGOING_OPTS parity between contract and enums file", () => {
  assertEquals([...FE_ONGOING], [...FINAL_PROCESSING_DECISION_ONGOING_OPTS]);
});

Deno.test("RK3-A3 g3 — FINAL_PROCESSING_DECISION_OPTS combined set parity", () => {
  assertEquals([...FE_ALL], [...FINAL_PROCESSING_DECISION_OPTS]);
  assertEquals(FE_ALL.length, 6);
});

Deno.test("RK3-A3 g3 — REVIEWER_ROLE_OPTS parity between contract and enums file", () => {
  assertEquals([...FE_REVIEWER_ROLE], [...REVIEWER_ROLE_OPTS]);
});

// ── FIELD_LABELS ──────────────────────────────────────────────────────────────

Deno.test("RK3-A3 g3 — FIELD_LABELS covers all finalization-specific keys", () => {
  const finalizationKeys = [
    "final_processing_decision",
    "final_processing_decision_notes",
    "assessment_reviewers_approvers",
    "assessment_reviewers_approvers[].name",
    "assessment_reviewers_approvers[].position",
    "assessment_reviewers_approvers[].role",
    "approver_authority_confirmed",
    "approver_authority_basis",
    "finalization_required_follow_up_resolved",
  ];
  for (const key of finalizationKeys) {
    assert(key in FIELD_LABELS, `FIELD_LABELS missing entry for ${key}`);
    assert(
      typeof FIELD_LABELS[key] === "string" && FIELD_LABELS[key].length > 0,
      `FIELD_LABELS[${key}] must be a non-empty string`,
    );
  }
});
