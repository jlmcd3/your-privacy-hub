// RC-REM-P1-C — DPIA Framework intake contract.
//
// Intake shape verified against src/pages/DPIAFramework.tsx buildIntake()
// (~L283). 49 user-facing keys + `source_assessment_id` system key.
//
// Enum options are literal copies of src/pages/DPIAFramework.enums.ts. Parity
// enforced by the test.

import type { IntakeContract } from "./types.ts";

export const DPIA_DATA_CATS = [
  "Contact details", "Employee records", "Customer records", "Health or medical data",
  "Financial data", "Biometric data", "Children's data", "Location data",
  "Communications content", "Other",
] as const;

export const DPIA_TOOLS = [
  "Microsoft 365 / Copilot", "Google Workspace / Gemini", "Salesforce + Einstein",
  "ChatGPT / OpenAI", "Claude / Anthropic", "GitHub Copilot", "Zoom + AI features",
  "Slack + AI features", "Notion + AI", "Grammarly", "Otter.ai / Fireflies",
  "HubSpot", "Adobe Creative Cloud",
] as const;

export const DPIA_SAFEGUARDS = [
  "Encryption at rest", "Encryption in transit", "Access controls", "Data minimisation",
  "Pseudonymisation", "Staff training", "DPA signed with processor", "Anonymisation",
  "Contractual restrictions", "None",
] as const;

export const DPIA_JURISDICTIONS = [
  "EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal",
  "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)",
  "Australia", "Singapore", "Other",
] as const;

export const DPIA_LEGAL_BASES = [
  "Consent (Art. 6(1)(a))", "Contract (Art. 6(1)(b))", "Legal obligation (Art. 6(1)(c))",
  "Vital interests (Art. 6(1)(d))", "Public task (Art. 6(1)(e))",
  "Legitimate interest (Art. 6(1)(f))",
] as const;

export const DPIA_ART9 = [
  "Explicit consent (Art. 9(2)(a))",
  "Employment, social security & social protection law (Art. 9(2)(b))",
  "Vital interests — data subject incapable of consent (Art. 9(2)(c))",
  "Not-for-profit body's legitimate activities (Art. 9(2)(d))",
  "Data manifestly made public by the data subject (Art. 9(2)(e))",
  "Establishment, exercise or defence of legal claims (Art. 9(2)(f))",
  "Substantial public interest — Union/Member State law (Art. 9(2)(g))",
  "Preventive/occupational medicine, health or social care (Art. 9(2)(h))",
  "Public interest in public health (Art. 9(2)(i))",
  "Archiving, research or statistics — Art. 89(1) (Art. 9(2)(j))",
] as const;

export const DPIA_REASONS = [
  "Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))",
  "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
  "Large-scale systematic monitoring of a public area (Art. 35(3)(c))",
  "Evaluation or scoring (incl. profiling / prediction)",
  "Automated decision-making with legal or significant effect",
  "Sensitive or highly personal data",
  "Data processed on a large scale",
  "Matching or combining datasets",
  "Data concerning vulnerable subjects",
  "Innovative use of new technology",
  "Processing prevents exercising a right / using a service",
  "Required by national law",
  "DPO or data-subject recommendation",
  "Required by a code of conduct / standard",
  "Risk management / accountability (beneficial)",
  "Existing processing — the risk has changed",
] as const;

// SPECIAL_CATEGORY_CATS — page L58; gates article_9_condition requiredness.
const SPECIAL_CATEGORY_CATS = ["Health or medical data", "Biometric data"] as const;

export { SPECIAL_CATEGORY_CATS };

export const dpiaFrameworkContract: IntakeContract = {
  tool_type: "dpia_framework",
  table: "dpia_frameworks",
  fields: [
    { key: "organization_name", kind: "text", required: "always" },
    { key: "processing_activity_name", kind: "text", required: "always" },
    { key: "description", kind: "narrative", required: "always" },
    { key: "purpose", kind: "narrative", required: "always" },
    { key: "data_categories", kind: "multi-enum", required: "always", options: DPIA_DATA_CATS },
    { key: "data_subjects", kind: "text", required: "always" },
    { key: "volume_frequency", kind: "text", required: "always" },
    // third_party_processors — Pills multi-select over TOOLS plus optional
    // "Other: <text>" append. Flat string[] (DPIAFramework.tsx L290:
    // [...processors, `Other: ${otherProcessor.trim()}`]).
    { key: "third_party_processors", kind: "string-array", required: "optional" },
    { key: "existing_safeguards", kind: "multi-enum", required: "optional", options: DPIA_SAFEGUARDS },
    { key: "jurisdictions", kind: "multi-enum", required: "always", options: DPIA_JURISDICTIONS },
    { key: "legal_basis_proposed", kind: "enum", required: "always", options: DPIA_LEGAL_BASES },
    { key: "article_9_condition", kind: "enum", required: "conditional",
      requiredWhen: 'data_categories overlaps SPECIAL_CATEGORY_CATS',
      hiddenValue: "", options: DPIA_ART9 },
    { key: "necessity_proportionality", kind: "narrative", required: "always" },
    { key: "retention_period", kind: "text", required: "always" },

    // EDPB §0 — carried now, consumed by edge rebuild
    { key: "controller_contact", kind: "text", required: "optional" },
    { key: "dpo_info", kind: "text", required: "optional" },
    { key: "processor_obligations", kind: "narrative", required: "optional" },
    { key: "processing_version", kind: "text", required: "optional" },
    { key: "estimated_launch_date", kind: "date", required: "optional" },
    { key: "estimated_end_date", kind: "date", required: "optional" },
    { key: "dpia_team", kind: "narrative", required: "optional" },
    // DPIA UPGRADE ITEM 2 — EDPB template v1.0 (adopted 10 March 2026) § 0.5
    // ¶6 and ¶10. ALL OPTIONAL so legacy dpia_frameworks rows continue to
    // validate; they ride intake_data (jsonb), so no column and no migration.
    { key: "dpia_prepared_by", kind: "narrative", required: "optional" },
    { key: "dpia_approved_by_name", kind: "text", required: "optional" },
    { key: "dpia_approved_by_title", kind: "text", required: "optional" },
    { key: "dpia_approval_date", kind: "date", required: "optional" },
    { key: "dpia_signoff_basis", kind: "narrative", required: "optional" },
    { key: "reference_materials", kind: "narrative", required: "optional" },
    { key: "reasons_to_conduct", kind: "multi-enum", required: "optional", options: DPIA_REASONS },
    { key: "dpia_scope_note", kind: "narrative", required: "optional" },
    { key: "publication_intent", kind: "text", required: "optional" },

    // EDPB §§1/2/5
    { key: "secondary_uses", kind: "narrative", required: "optional" },
    { key: "nature_scope_context", kind: "narrative", required: "optional" },
    { key: "functional_description", kind: "narrative", required: "optional" },
    { key: "supporting_assets", kind: "narrative", required: "optional" },
    { key: "codes_of_conduct", kind: "narrative", required: "optional" },
    { key: "data_minimisation_justification", kind: "narrative", required: "optional" },
    { key: "data_quality_measures", kind: "narrative", required: "optional" },
    { key: "data_subject_rights_mechanisms", kind: "narrative", required: "optional" },
    { key: "dp_by_design_measures", kind: "narrative", required: "optional" },
    { key: "dpo_advice", kind: "narrative", required: "optional" },
    { key: "data_subjects_views_sought", kind: "text", required: "optional" },
    { key: "data_subjects_views", kind: "narrative", required: "optional" },

    // ITEM 310 — Chapter 6 (E)(4). The least-intrusive-means test cannot be
    // PERFORMED without the alternatives the controller actually considered
    // and rejected. Array of { processing_operation, alternative,
    // rejection_reason } records (DPIAFramework.tsx repeater).
    { key: "alternatives_considered", kind: "structured", required: "optional" },


    // Jurisdiction resolver inputs
    { key: "controller_country", kind: "text", required: "optional" },
    // ITEM 380 r5b — real skip logic: DPIAFramework.tsx L911 renders this
    // select only when `controllerCountry === "DE"`.
    { key: "controller_land", kind: "text", required: "conditional",
      requiredWhen: "controller_country === \"DE\"",
      trigger: { key: "controller_country", equals: ["DE"] } },

    { key: "controller_sector", kind: "text", required: "optional" },
    { key: "central_administration_country", kind: "text", required: "optional" },
    { key: "eu_decision_establishment_country", kind: "text", required: "optional" },
    { key: "transfer_flows", kind: "structured", required: "optional" },
    { key: "retention_record_type", kind: "text", required: "optional" },

    // System key
    { key: "source_assessment_id", kind: "text", required: "optional" },
  ],
};
