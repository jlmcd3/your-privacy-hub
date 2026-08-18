// CPPA Risk Assessment — Finalization Stage Contract
// (Intake Contract v2.0 §12–§13, doc 31 §3 — NEW-F and RESTAGED fields)
//
// These fields are collected in the FINALIZATION stage — AFTER the analysis
// is generated and the business has reviewed the factor outputs. They are NOT
// part of the initial assessment intake (CPPARiskAssessment.tsx stepValid).
//
// D10: a8_information_providers and a9_approval_date are RESTAGED here
// from the main cppa-risk-assessment.ts contract (where they remain at
// required:"optional" so legacy rows keep validating). The finalization
// gate makes them required at Final-Approved.
//
// final_processing_decision disposition per § 7152(a)(7):
//   Planned → Initiate | Initiate with conditions | Do not initiate
//   Ongoing  → Continue | Continue with conditions | Discontinue
// This field reconciles with the existing § 7152(a)(7) reserved-decision
// carve-out in ltp/record-complete.ts (doc 28 §4), which survives until
// the finalization stage supplies this field.

import type { IntakeContract } from "./types.ts";

const YES_NO_OPTS = ["Yes", "No"] as const;

export const FINAL_PROCESSING_DECISION_PLANNED_OPTS = [
  "Initiate",
  "Initiate with conditions",
  "Do not initiate",
] as const;

export const FINAL_PROCESSING_DECISION_ONGOING_OPTS = [
  "Continue",
  "Continue with conditions",
  "Discontinue",
] as const;

// Combined set used at the contract layer; the form shows only the
// processing-status-appropriate subset.
export const FINAL_PROCESSING_DECISION_OPTS = [
  ...FINAL_PROCESSING_DECISION_PLANNED_OPTS,
  ...FINAL_PROCESSING_DECISION_ONGOING_OPTS,
] as const;

export const REVIEWER_ROLE_OPTS = ["Reviewed", "Approved", "Both"] as const;

export const cppaRiskFinalizationContract: IntakeContract = {
  id: "cppa_risk_finalization",
  version: "2.0.0",
  fields: [
    // ── §3 — final processing decision (§ 7152(a)(7)) ─────────────────────
    // Business decision — never factor-generated. The CEO or delegated
    // executive records the outcome of the weighing in light of the factor
    // outputs. Gated on processing_status from the intake (Planned → Initiate
    // variants; Ongoing → Continue variants).
    { key: "final_processing_decision",
      kind: "enum", required: "always", options: FINAL_PROCESSING_DECISION_OPTS },
    { key: "final_processing_decision_notes",
      kind: "narrative", required: "optional" },

    // ── §3 — review-and-approval record repeater (§ 7152(a)(9)) ──────────
    // Canonical finalization record; supersedes the legacy a9_approver_name /
    // a9_approver_position pair from the intake form. Each row records one
    // reviewer or approver. The approver must have authority to participate
    // in the processing initiation decision.
    { key: "assessment_reviewers_approvers",
      kind: "structured", required: "always" },
    { key: "assessment_reviewers_approvers[].name",
      kind: "text", required: "conditional",
      requiredWhen: "a reviewer row is present" },
    { key: "assessment_reviewers_approvers[].position",
      kind: "text", required: "conditional",
      requiredWhen: "a reviewer row is present" },
    { key: "assessment_reviewers_approvers[].role",
      kind: "enum", required: "conditional",
      requiredWhen: "a reviewer row is present", options: REVIEWER_ROLE_OPTS },

    // ── §3 — approver authority confirmation (§ 7152(a)(9)) ───────────────
    { key: "approver_authority_confirmed",
      kind: "enum", required: "always", options: YES_NO_OPTS },
    { key: "approver_authority_basis",
      kind: "narrative", required: "optional" },

    // ── §3 — D10 RESTAGED from cppa-risk-assessment.ts ───────────────────
    // Both fields remain in the main contract at required:"optional" for
    // legacy-row compat. They are required here at the finalization gate.
    { key: "a9_approval_date",
      kind: "date", required: "always" },
    { key: "a8_information_providers",
      kind: "narrative", required: "always" },

    // ── §3 — finalization quality gate (EUP/QA) ───────────────────────────
    // Must be "Yes" before Final-Approved status is granted. Records that
    // any action items or follow-up items flagged in the assessment have
    // been resolved or formally deferred with documented justification.
    { key: "finalization_required_follow_up_resolved",
      kind: "enum", required: "always", options: YES_NO_OPTS },
  ],
};
