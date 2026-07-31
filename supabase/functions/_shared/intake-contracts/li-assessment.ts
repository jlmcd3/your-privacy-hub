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

// Stage B enum values — verified against LIAssessmentIntake.tsx radio
// components. Kept locally; parity is asserted by literal-in-source
// substring at test time is not needed because these are unique inline.
const REASONABLE_EXPECTATION_OPTS = ["Yes", "Partly", "No"] as const;
const POTENTIAL_HARM_OPTS = ["None / negligible", "Minor", "Moderate", "Severe"] as const;

// ITEM 311 additions — Art. 6(1)(f) child clause and second subparagraph.
const CHILD_DATA_SUBJECT_OPTS = ["Yes", "No", "Unknown"] as const;
const PUBLIC_AUTHORITY_OPTS = ["Yes", "No"] as const;
const PUBLIC_TASK_OPTS = ["Yes", "No", "Not applicable"] as const;


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


    // necessity_details
    { key: "necessity_details",                        kind: "structured", required: "always" },
    { key: "necessity_details.alternatives",           kind: "narrative",  required: "always" },
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
    // Branch-gated leaves.
    { key: "balancing_details.statutory_restrictions",       kind: "structured", required: "conditional",
      requiredWhen: "processing engages the marketing branch (showMarketingBranch === true)",
      hiddenValue: "" /* stored value when gated off is literal null */ },
    { key: "balancing_details.employment_safeguards",        kind: "structured", required: "conditional",
      requiredWhen: "processing engages the employment branch (showEmploymentBranch === true)",
      hiddenValue: "" /* stored value when gated off is literal null */ },
    { key: "balancing_details.additional_context",           kind: "narrative",  required: "optional" },

    { key: "stage",                 kind: "text", required: "always" },        // "submitted"
    { key: "preview_assessment_id", kind: "text", required: "always" },
  ],
};
