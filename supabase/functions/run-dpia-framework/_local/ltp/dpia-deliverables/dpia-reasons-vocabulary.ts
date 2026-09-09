// DOC 232 — the closed `reasons_to_conduct` vocabulary (REASONS_TO_CONDUCT,
// src/pages/DPIAFramework.enums.ts, confirmed 2026-09-08), mapped to the
// slugs `rule-states.ts` uses for the `state:intake.reasons_to_conduct.<slug>`
// atom family. One canonical copy for the PRODUCT side (this file); the
// OFFLINE GENERATOR side (generate-corpus-hooks/_local/product-registry.ts)
// carries its own independent copy — an edge function may not import a
// sibling function's directory (doc 213 §2's rule), the same reason
// generate-corpus-hooks/_local/product-registry.ts's own `LIA_DATA_CATEGORIES`
// is a copy of src/pages/LIAssessment.enums.ts, not an import of it.
//
// Text is verbatim from REASONS_TO_CONDUCT; a slug is added only, never a
// re-wording of the option text itself (the text is what the atom's
// `stateValue` actually stores and what a hook drafter sees verbatim).

export const DPIA_REASON_SLUGS: Readonly<Record<string, string>> = {
  "Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))": "art35_3a_evaluation_profiling",
  "Large-scale special-category or criminal-offence data (Art. 35(3)(b))": "art35_3b_large_scale_special_category",
  "Large-scale systematic monitoring of a public area (Art. 35(3)(c))": "art35_3c_public_area_monitoring",
  "Evaluation or scoring (incl. profiling / prediction)": "evaluation_scoring",
  "Automated decision-making with legal or significant effect": "automated_decision_making",
  "Systematic monitoring (of employees, a defined population, or a non-public space)": "systematic_monitoring",
  "Sensitive or highly personal data": "sensitive_data",
  "Data processed on a large scale": "large_scale",
  "Matching or combining datasets": "matching_combining_datasets",
  "Data concerning vulnerable subjects": "vulnerable_subjects",
  "Innovative use of new technology": "innovative_technology",
  "Processing prevents exercising a right / using a service": "prevents_exercising_right",
  "Required by national law": "required_by_national_law",
  "DPO or data-subject recommendation": "dpo_or_data_subject_recommendation",
  "Required by a code of conduct / standard": "required_by_code_of_conduct",
  "Risk management / accountability (beneficial)": "risk_management_accountability",
  "Existing processing — the risk has changed": "existing_processing_risk_changed",
};

export const DPIA_REASON_SLUG_LIST: readonly string[] = Object.values(DPIA_REASON_SLUGS);
