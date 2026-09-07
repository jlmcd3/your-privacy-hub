// DOC 207C §3 — PER-PRODUCT TYPED STATE VOCABULARY for authority rules.
//
// Same shape and same discipline as the profiles generator's registry: a
// product with no entry gets no generation, and nothing is invented for it.

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
  /** A `state:` path is accepted when it starts with one of these. */
  readonly state_roots: readonly string[];
}

export interface RuleProductVocabulary {
  readonly typed_state_vocabulary: TypedStateVocabulary;
  readonly instrument_scope: readonly string[];
  readonly output_path: string;
  readonly export_prefix: string;
}

export const RULE_PRODUCT_REGISTRY: Readonly<Record<string, RuleProductVocabulary>> = {
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
    output_path: "supabase/functions/run-li-assessment/_local/corpus/maps/lia-rules.ts",
    export_prefix: "LIA",
  },
};

export function ruleRegistryFor(product: string): RuleProductVocabulary | undefined {
  return RULE_PRODUCT_REGISTRY[product];
}
