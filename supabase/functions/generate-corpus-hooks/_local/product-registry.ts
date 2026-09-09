// DOC 213 §2 — PER-PRODUCT TYPED VOCABULARY for analogy hooks.
//
// A verbatim copy of the LIA vocabulary in
// `generate-corpus-rules/_local/product-registry.ts`. It is copied rather
// than imported because an edge function may not import from a sibling
// function directory (deploy-hygiene). A product with no entry here gets no
// hook generation, and nothing is invented for it.

/** Exactly the DATA_CATEGORIES strings in src/pages/LIAssessment.enums.ts. */
export const LIA_DATA_CATEGORIES: readonly string[] = [
  "Contact data",
  "Purchase/transaction history",
  "Browsing/behavioural data",
  "Location data",
  "Employment data",
  "Financial data",
  "Health or medical data",
  "Biometric data",
  "Special category data",
  "Communications data",
  "Device/technical data",
  "Other",
];

export interface TypedStateVocabulary {
  readonly flags: readonly string[];
  readonly classes: readonly string[];
  readonly relationships: readonly string[];
  readonly data_categories: readonly string[];
  readonly verdict_elements: readonly string[];
  readonly state_roots: readonly string[];
}

export interface HookProductVocabulary {
  readonly typed_state_vocabulary: TypedStateVocabulary;
  readonly instrument_scope: readonly string[];
  readonly output_path: string;
  readonly export_prefix: string;
}

/** DOC 232 (2026-09-08) — a verbatim copy of DATA_CATS
 *  (src/pages/DPIAFramework.enums.ts). Copied, not imported — same reason
 *  LIA_DATA_CATEGORIES above is a copy of LIAssessment.enums.ts. */
export const DPIA_DATA_CATEGORIES: readonly string[] = [
  "Contact details",
  "Employee records",
  "Customer records",
  "Health or medical data",
  "Financial data",
  "Biometric data",
  "Children's data",
  "Location data",
  "Communications content",
  "Other",
];

/** DOC 232 — the closed `reasons_to_conduct` slugs
 *  (run-dpia-framework/_local/ltp/dpia-deliverables/dpia-reasons-vocabulary.ts,
 *  a verbatim copy of the REASONS_TO_CONDUCT text from
 *  src/pages/DPIAFramework.enums.ts). Copied, not imported, for the same
 *  cross-function-import reason as DPIA_DATA_CATEGORIES above. */
export const DPIA_REASON_SLUG_LIST: readonly string[] = [
  "art35_3a_evaluation_profiling",
  "art35_3b_large_scale_special_category",
  "art35_3c_public_area_monitoring",
  "evaluation_scoring",
  "automated_decision_making",
  "systematic_monitoring",
  "sensitive_data",
  "large_scale",
  "matching_combining_datasets",
  "vulnerable_subjects",
  "innovative_technology",
  "prevents_exercising_right",
  "required_by_national_law",
  "dpo_or_data_subject_recommendation",
  "required_by_code_of_conduct",
  "risk_management_accountability",
  "existing_processing_risk_changed",
];

export const HOOK_PRODUCT_REGISTRY: Readonly<Record<string, HookProductVocabulary>> = {
  lia: {
    typed_state_vocabulary: {
      flags: [
        "special_category",
        "children",
        "eprivacy_terminal_equipment",
        "electronic_marketing",
        "public_authority",
        "large_scale",
        "automated_decision",
      ],
      classes: [
        "direct_marketing",
        "fraud_prevention",
        "employee_monitoring",
        "behavioral_advertising",
        "research_analytics",
        "it_security",
        "contractual_administration",
        "product_improvement",
      ],
      relationships: ["customer", "employee", "prospect", "public"],
      data_categories: LIA_DATA_CATEGORIES,
      verdict_elements: ["purpose", "necessity", "balancing"],
      state_roots: [
        "intake.",
        "interest_legitimacy.",
        "child_factor.",
        "public_authority_exclusion.",
        "scale_frequency_duration.",
        "eprivacy_short_circuit.",
        "precedent_class_posture.",
        "reasonable_expectations.",
        "potential_harms.",
        "opt_out_feasibility.",
        "relationship_with_individual.",
        "automated_decision_analysis.",
        "alternatives_considered.",
      ],
    },
    instrument_scope: ["EU GDPR", "UK GDPR"],
    output_path: "supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts",
    export_prefix: "LIA",
  },
  // DOC 232 (2026-09-08) — DPIA V3 hook corpus registry entry. Additive,
  // self-contained: does not change the `lia` entry above. The DPIA hook
  // join / rule-states pair this vocabulary against lives at
  // run-dpia-framework/_local/ltp/dpia-deliverables/{rule-states,
  // dpia-hook-join}.ts; the runtime atom evaluator remains
  // `_shared/corpus/rule-types.ts` (product-agnostic, unmodified).
  //
  // `state_roots` is deliberately just "intake." and "engagement_map." — DPIA
  // has no rules-as-data engine and no second typed-determination surface
  // this build could safely read atoms off without risking a misreading of
  // attachDpiaDeliverables's 4,000+ line internals (doc 232's own [NEEDS]
  // note); `engagement_map.` is `buildDpiaEngagementMap()`'s own
  // deterministic, already-tested rule engagement (doc 230 decision 5: "the
  // engagement map is the rule pass here").
  dpia: {
    typed_state_vocabulary: {
      flags: [
        "biometric",
        "special_category",
        "children",
        "large_scale",
        "vulnerable_subjects",
        "automated_decision",
        "cross_border_transfer",
      ],
      classes: [
        "employee_monitoring",
        "public_space_surveillance",
        "algorithmic_decision",
        "innovative_technology_use",
        "dataset_matching",
      ],
      relationships: ["employee", "customer", "public"],
      data_categories: DPIA_DATA_CATEGORIES,
      verdict_elements: ["obligation", "adequacy"],
      state_roots: ["intake.", "engagement_map."],
    },
    instrument_scope: ["EU GDPR", "UK GDPR"],
    output_path: "supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-hooks.ts",
    export_prefix: "DPIA",
  },
};

export function hookRegistryFor(product: string): HookProductVocabulary | undefined {
  return HOOK_PRODUCT_REGISTRY[product];
}
