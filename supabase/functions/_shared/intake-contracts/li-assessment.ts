// RC-REM-P1-B — LI Assessment intake contract.
//
// TWO stages, both contract-covered.
//
//   Stage A insert  — src/pages/LIAssessment.tsx (~L158). Fields:
//     organization_name, subject_anchor, processing_description,
//     data_categories, relationship_type, jurisdictions.
//
//   Stage B intake_data — src/pages/LIAssessmentIntake.tsx (~L270).
//     Adds stated_purpose, alternatives_considered, purpose_details{…},
//     necessity_details{…}, balancing_details{…}, stage, preview_assessment_id.
//
// Enum options anchored to src/pages/LIAssessment.enums.ts. Literal copies
// below; parity enforced by the test.

import type { IntakeContract } from "./types.ts";

// ── Verbatim option copies from LIAssessment.enums.ts ──────────────────
export const DATA_CATEGORIES = [
  "Contact data", "Purchase/transaction history", "Browsing/behavioural data",
  "Location data", "Employment data", "Financial data", "Health or medical data",
  "Biometric data", "Special category data", "Communications data", "Device/technical data", "Other",
] as const;
export const RELATIONSHIPS = [
  "Existing customer", "Prospective customer", "Employee", "Former employee",
  "Website visitor (no account)", "B2B contact", "Member of the public", "Other",
] as const;
export const JURISDICTIONS = [
  "EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal",
  "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)",
  "Australia", "Singapore", "Other",
] as const;

// Stage B enum values. DOC 161 (2026-09-03, audit A.2): the intake form
// (LIAssessmentIntake.tsx select controls) emits the LONG option strings
// below; the short values are the legacy vocabulary the golden fixtures and
// pre-2026-09 rows carry. Both validate; every builder resolves them through
// one reader (elements.ts EXPECTATION_* / build-upgrade4.ts severityOf), and
// the slot map labels both. Exported (PANEL FIX 11 follow-on, 2026-08-31) so
// generate-stress-fixtures can type-anchor its deterministic LIA fixture.
export const REASONABLE_EXPECTATION_OPTS = [
  "Yes — directly contemplated by our existing relationship",
  "Probably — disclosed in privacy notice and consistent with the relationship",
  "Maybe — they may not have anticipated this specific use",
  "Unlikely — this would surprise most data subjects",
  "No — we have no relationship with these individuals; they would not expect this",
  "Yes", "Partly", "No",
] as const;
export const POTENTIAL_HARM_OPTS = [
  "Negligible — annoyance only",
  "Limited — minor inconvenience or unwanted contact",
  "Significant — discrimination, financial loss, reputational damage",
  "Severe — physical safety, identity theft, loss of livelihood",
  "None / negligible", "Minor", "Moderate", "Severe",
] as const;
// DOC 161 — the purpose selects' option strings (text fields on the contract;
// "Other (describe below)" carries its free text in the *_other companion).
export const INTEREST_HOLDER_OPTS = [
  "Our organisation only",
  "Our organisation and a third party (e.g. business partner)",
  "A third party we share data with",
  "The data subject themselves",
  "The wider public",
  "Other (describe below)",
] as const;
export const INTEREST_TYPE_OPTS = [
  "Commercial / revenue-related",
  "Operational / service delivery",
  "Security / fraud prevention",
  "Legal / regulatory compliance",
  "Public interest / societal benefit",
  "Research / product improvement",
  "Political / electoral campaigning",
  "Other (describe below)",
] as const;

// ITEM 311 additions — Art. 6(1)(f) child clause and second subparagraph.
const CHILD_DATA_SUBJECT_OPTS = ["Yes", "No", "Unknown"] as const;
const PUBLIC_AUTHORITY_OPTS = ["Yes", "No"] as const;
const PUBLIC_TASK_OPTS = ["Yes", "No", "Not applicable"] as const;

// DOC 189 (2026-09-05, CEO-approved; the PN-L6 resolution — an explicit
// exception to the fleet-redesign "no new intake" rule) — the two
// device-access questions the ePrivacy gate reads ahead of its lexicons.
// Verbatim copies of src/pages/LIAssessment.enums.ts DEVICE_ACCESS_OPTS /
// DEVICE_ACCESS_NECESSITY_OPTS. Both optional so legacy rows validate; the
// gate keeps its lexicon behaviour where the questions are unanswered.
export const DEVICE_ACCESS_OPTS = ["Yes", "No", "Not sure"] as const;
export const DEVICE_ACCESS_NECESSITY_OPTS = [
  "Yes — all of it is strictly necessary",
  "No — some or all of it goes further",
  "Not sure",
] as const;

// UPGRADE-4 additions — ICO three-part-arc inputs and the attestation close.
// All optional so legacy rows continue to validate.
const BENEFICIARY_OPTS = [
  "Our business", "The individuals whose data is processed", "A third party",
  "Our business and the individuals", "Our business and a third party",
] as const;
const RELATIONSHIP_CATEGORY_OPTS = [
  "Customer", "Employee", "Prospect", "Member of the public — no relationship",
] as const;
const OPT_OUT_AVAILABLE_OPTS = [
  "Yes — unconditional, on request, with no consequence",
  "Yes — but conditional or subject to review",
  "No opt-out is available",
] as const;
const DPO_REVIEWED_OPTS = ["Yes", "No", "Planned"] as const;


/** Stage A — the row inserted at preview time (LIAssessment.tsx ~L158). */
export const liAssessmentStageAContract: IntakeContract = {
  tool_type: "li_assessment_stage_a",
  table: "li_assessments",
  fields: [
    { key: "organization_name",     kind: "text",       required: "always" },
    { key: "subject_anchor",        kind: "text",       required: "always" },
    { key: "processing_description", kind: "narrative", required: "always" },
    // data_categories is a FLAT ARRAY OF STRINGS. Elements are enum values
    // from DATA_CATEGORIES OR "Other: <free text>" strings that the form
    // folds in (LIAssessment.tsx ~L142). Persisted as text[] in
    // li_assessments.data_categories — an object payload will fail insert.
    { key: "data_categories",       kind: "string-array", required: "always" },
    { key: "relationship_type",     kind: "text",       required: "always" }, // enum RELATIONSHIPS OR "Other: …" post-fold
    { key: "jurisdictions",         kind: "multi-enum", required: "always", options: JURISDICTIONS },
  ],
};

/** Stage B — the intake_data payload posted at submit (LIAssessmentIntake.tsx ~L270). */
export const liAssessmentStageBContract: IntakeContract = {
  tool_type: "li_assessment",
  table: "li_assessments",
  fields: [
    // Stage-A fields re-sent
    { key: "organization_name",     kind: "text",       required: "always" },
    { key: "subject_anchor",        kind: "text",       required: "optional" }, // preview may not have set it; nullable in the insert
    { key: "processing_description", kind: "narrative", required: "always" },
    { key: "data_categories",       kind: "string-array", required: "always" }, // flat string[] with "Other: …" folded in; persisted as text[]
    { key: "relationship_type",     kind: "text",       required: "always" },
    { key: "jurisdictions",         kind: "multi-enum", required: "always", options: JURISDICTIONS },

    // Stage B additions
    { key: "stated_purpose",         kind: "narrative", required: "always" },
    { key: "alternatives_considered", kind: "narrative", required: "always" },

    // purpose_details
    { key: "purpose_details",                          kind: "structured", required: "always" },
    { key: "purpose_details.interest_holder",          kind: "text",       required: "optional" },
    { key: "purpose_details.interest_type",            kind: "text",       required: "optional" },
    { key: "purpose_details.interest_statement",       kind: "narrative",  required: "optional" },
    { key: "purpose_details.interest_holder_other",    kind: "text",       required: "optional" },
    { key: "purpose_details.interest_type_other",      kind: "text",       required: "optional" },
    // ITEM 311 — Art. 6(1)(f) second subparagraph. The exclusion is decided
    // BEFORE the balance is reached, so the record has to carry it. Optional
    // at contract level; the builder degrades loudly when it is absent.
    { key: "purpose_details.controller_is_public_authority", kind: "enum", required: "optional",
      options: PUBLIC_AUTHORITY_OPTS },
    { key: "purpose_details.public_task_processing",   kind: "enum",       required: "optional",
      options: PUBLIC_TASK_OPTS },
    // DOC 189 — the ePrivacy availability gate's own two questions (the
    // other availability gate beside the public-authority pair above).
    // Q1 always shown; Q2 shown only when Q1 === "Yes".
    { key: "purpose_details.device_access",            kind: "enum",       required: "optional",
      options: DEVICE_ACCESS_OPTS },
    { key: "purpose_details.device_access_strictly_necessary", kind: "enum", required: "conditional",
      options: DEVICE_ACCESS_NECESSITY_OPTS,
      requiredWhen: 'purpose_details.device_access === "Yes"',
      trigger: { key: "purpose_details.device_access", equals: ["Yes"] } },
    // UPGRADE-4 — the specific benefit and who receives it.
    { key: "purpose_details.specific_benefit",         kind: "narrative",  required: "optional" },
    { key: "purpose_details.beneficiary",              kind: "enum",       required: "optional",
      options: BENEFICIARY_OPTS },


    // necessity_details
    { key: "necessity_details",                        kind: "structured", required: "always" },
    { key: "necessity_details.alternatives",           kind: "narrative",  required: "always" },
    // UPGRADE-4 — why each listed alternative is inadequate.
    { key: "necessity_details.alternatives_rationale", kind: "narrative",  required: "optional" },
    { key: "necessity_details.why_consent_not_used",   kind: "narrative",  required: "optional" },
    { key: "necessity_details.data_minimised",         kind: "narrative",  required: "optional" },
    // Branch-gated: `showAnalyticsBranch ? value : null`. hiddenValue null.
    { key: "necessity_details.pseudonymisation_options", kind: "structured", required: "conditional",
      requiredWhen: "processing engages the analytics branch (showAnalyticsBranch === true)",
      hiddenValue: "" /* stored value when gated off is literal null */ },

    // balancing_details
    { key: "balancing_details",                              kind: "structured", required: "always" },
    { key: "balancing_details.reasonable_expectation",       kind: "enum",       required: "always", options: REASONABLE_EXPECTATION_OPTS },
    { key: "balancing_details.reasonable_expectation_detail", kind: "narrative", required: "optional" },
    // ITEM 311 — Recital 47 runs on the TIME AND CONTEXT OF COLLECTION, which
    // the enum answer above does not supply. Optional at contract level; the
    // builder degrades loudly with a named ask when it is absent.
    { key: "balancing_details.collection_context",           kind: "narrative",  required: "optional" },
    { key: "balancing_details.vulnerable_subjects",          kind: "string-array", required: "optional" }, // string[] from LIAssessmentIntake.tsx L127
    { key: "balancing_details.vulnerable_subjects_other",    kind: "text",       required: "optional" },
    // ITEM 311 — Art. 6(1)(f) "in particular where the data subject is a child".
    { key: "balancing_details.children_data_subjects",       kind: "enum",       required: "optional", options: CHILD_DATA_SUBJECT_OPTS },

    { key: "balancing_details.potential_harm",               kind: "enum",       required: "always", options: POTENTIAL_HARM_OPTS },
    { key: "balancing_details.potential_harm_detail",        kind: "narrative",  required: "optional" },
    { key: "balancing_details.safeguards",                   kind: "string-array", required: "optional" }, // string[] from LIAssessmentIntake.tsx L129
    { key: "balancing_details.safeguards_other",             kind: "text",       required: "optional" },
    // ITEM 311 — measures offered as MITIGATIONS. EDPB 1/2024 II.C.4 excludes
    // measures the GDPR already requires; the builder classifies each entry.
    { key: "balancing_details.additional_mitigations",       kind: "narrative",  required: "optional" },

    { key: "balancing_details.opt_out_mechanism",            kind: "narrative",  required: "always" },
    { key: "balancing_details.special_category_data",        kind: "boolean",    required: "optional" },
    // UPGRADE-4 — balancing inputs stated rather than inferred.
    { key: "balancing_details.relationship_category",        kind: "enum",       required: "optional", options: RELATIONSHIP_CATEGORY_OPTS },
    { key: "balancing_details.scale_approx",                 kind: "text",       required: "optional" },
    { key: "balancing_details.frequency",                    kind: "text",       required: "optional" },
    { key: "balancing_details.duration",                     kind: "text",       required: "optional" },
    { key: "balancing_details.potential_harms",              kind: "string-array", required: "optional" },
    { key: "balancing_details.opt_out_available",            kind: "enum",       required: "optional", options: OPT_OUT_AVAILABLE_OPTS },
    // Branch-gated leaves.
    { key: "balancing_details.statutory_restrictions",       kind: "structured", required: "conditional",
      requiredWhen: "processing engages the marketing branch (showMarketingBranch === true)",
      hiddenValue: "" /* stored value when gated off is literal null */ },
    { key: "balancing_details.employment_safeguards",        kind: "structured", required: "conditional",
      requiredWhen: "processing engages the employment branch (showEmploymentBranch === true)",
      hiddenValue: "" /* stored value when gated off is literal null */ },
    { key: "balancing_details.additional_context",           kind: "narrative",  required: "optional" },

    // UPGRADE-4 — attestation close. Persisted to li_assessments.attestation.
    { key: "attestation",                     kind: "structured",   required: "optional" },
    { key: "attestation.dpo_reviewed",        kind: "enum",         required: "optional", options: DPO_REVIEWED_OPTS },
    { key: "attestation.dpo_reviewer",        kind: "text",         required: "optional" },
    { key: "attestation.dpo_review_date",     kind: "text",         required: "optional" },
    { key: "attestation.approver_name",       kind: "text",         required: "optional" },
    { key: "attestation.approver_position",   kind: "text",         required: "optional" },
    { key: "attestation.approval_date",       kind: "text",         required: "optional" },
    { key: "attestation.review_triggers",     kind: "string-array", required: "optional" },

    { key: "stage",                 kind: "text", required: "always" },        // "submitted"
    { key: "preview_assessment_id", kind: "text", required: "always" },
  ],
};
