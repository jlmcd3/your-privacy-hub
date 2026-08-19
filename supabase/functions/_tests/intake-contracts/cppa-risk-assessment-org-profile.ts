// CPPA Risk Assessment — Organization Profile Contract
// (Intake Contract v2.0 §0, doc 31 §2d — NEW-O fields)
//
// These are ORGANIZATION-LEVEL fields that apply across all risk assessments
// submitted by a given business. They are NOT collected in the per-assessment
// intake form (CPPARiskAssessment.tsx). The assessment reads through to the
// organization profile for these values.
//
// D6 disposition: Spine X.E placeholders (cppa_submission_contact_*, certifier_*)
// are sourced from this org-profile contract, not from {{INTAKE.*}}.
//
// NOTE: i8_certifying_exec_name / i8_certifying_exec_title already exist in the
// main cppa-risk-assessment.ts contract as intake-level fields; v2.0 recommends
// migrating their source to the org profile going forward (assessment reads through).
// Those keys are NOT duplicated here — migration is a Phase B / reporting concern.

import type { IntakeContract } from "../../_shared/intake-contracts/types.ts";

export const YES_NO_OPTS = ["Yes", "No"] as const;

export const cppaRiskOrgProfileContract: IntakeContract = {
  id: "cppa_risk_org_profile",
  version: "2.0.0",
  fields: [
    // ── §2d — CPPA submission point of contact (§ 7157(b)(1))
    // Business point of contact for CPPA submissions. Distinct from the
    // certifying executive (who signs off) and the information providers
    // (who supplied assessment facts). Required on the annual worksheet.
    { key: "cppa_submission_contact_name",  kind: "text",  required: "always" },
    { key: "cppa_submission_contact_phone", kind: "text",  required: "optional" },
    { key: "cppa_submission_contact_email", kind: "text",  required: "always" },

    // ── §2d — Certifier eligibility attestations (§ 7157(c))
    // The CPPA requires the certifying executive to attest to all four of
    // these conditions. Each is a Yes/No gate; all four must be "Yes" for
    // a valid § 7157(c) certification.
    { key: "certifier_is_executive_management",
      kind: "enum", required: "always", options: YES_NO_OPTS },
    { key: "certifier_directly_responsible_for_ra_compliance",
      kind: "enum", required: "always", options: YES_NO_OPTS },
    { key: "certifier_has_sufficient_knowledge",
      kind: "enum", required: "always", options: YES_NO_OPTS },
    { key: "certifier_authorized_to_submit",
      kind: "enum", required: "always", options: YES_NO_OPTS },
  ],
};
