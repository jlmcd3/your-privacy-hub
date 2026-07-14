// RC-REM-P1-C — DPIA Framework intake contract.
//
// Intake shape verified against src/pages/DPIAFramework.tsx buildIntake()
// (~L283). 44 user-facing keys + `source_assessment_id` system key.
//
// Enum options anchored to src/pages/DPIAFramework.enums.ts. Parity
// enforced by the test.

import type { IntakeContract } from "./types.ts";
import {
  DATA_CATS as DPIA_DATA_CATS,
  TOOLS as DPIA_TOOLS,
  SAFEGUARDS as DPIA_SAFEGUARDS,
  JURISDICTIONS as DPIA_JURISDICTIONS,
  LEGAL_BASES as DPIA_LEGAL_BASES,
  ARTICLE_9_CONDITIONS as DPIA_ART9,
  REASONS_TO_CONDUCT as DPIA_REASONS,
} from "../../../../src/pages/DPIAFramework.enums.ts";

// SPECIAL_CATEGORY_CATS — page L58; gates article_9_condition requiredness.
const SPECIAL_CATEGORY_CATS = ["Health or medical data", "Biometric data"] as const;

export {
  DPIA_DATA_CATS, DPIA_TOOLS, DPIA_SAFEGUARDS, DPIA_JURISDICTIONS,
  DPIA_LEGAL_BASES, DPIA_ART9, DPIA_REASONS, SPECIAL_CATEGORY_CATS,
};

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
    // "Other: <text>" suffix append; kept as structured to allow the
    // free-form entry.
    { key: "third_party_processors", kind: "structured", required: "optional" },
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

    // Jurisdiction resolver inputs
    { key: "controller_country", kind: "text", required: "optional" },
    { key: "controller_land", kind: "text", required: "optional" },
    { key: "controller_sector", kind: "text", required: "optional" },
    { key: "central_administration_country", kind: "text", required: "optional" },
    { key: "eu_decision_establishment_country", kind: "text", required: "optional" },
    { key: "transfer_flows", kind: "structured", required: "optional" },
    { key: "retention_record_type", kind: "text", required: "optional" },

    // System key
    { key: "source_assessment_id", kind: "text", required: "optional" },
  ],
};
