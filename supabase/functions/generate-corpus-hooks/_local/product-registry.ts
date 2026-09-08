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

/** DOC 235 (2026-09-08) — ADMT's own closed-list decision-domain slugs
 *  (`_shared/intake-contracts/cppa-admt.ts`'s `SIGNIFICANT_DECISION_DOMAINS`,
 *  minus the explicit negative "None of these categories..."), reduced to
 *  a `use_case_class` value per record (the FIRST regulated domain
 *  selected — see run-admt-checker-v2/_local/ltp/v3/rule-states.ts's own
 *  doc comment for why this is a first-pass reduction, not a real
 *  classifier). Exported so a future ADMT use-case classifier can reuse
 *  the exact slug vocabulary this build's hooks are drafted against. */
export const ADMT_DECISION_DOMAIN_CLASSES: readonly string[] = [
  "lending_financial",
  "housing",
  "education",
  "hiring_admission",
  "work_allocation",
  "employment_action",
  "healthcare",
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
  // DOC 235 (2026-09-08) — ADMT's own vocabulary. Purely additive: this
  // entry uses the SAME `HookProductVocabulary` shape the `lia` entry above
  // already has on `main` — no `elementOf`/`contextBlock` fields, because
  // `main`'s `HookProductVocabulary` interface does not carry them today
  // (the CPPA-Risk agent's generalisation of `actionGenerate` that would
  // add them lives only on the unmerged `v3-cppa-risk` branch, per doc 235's
  // build log). Adding those fields here myself would risk a shape
  // collision with whatever that branch's own edit to this interface turns
  // out to be — deliberately left for the orchestrator to reconcile at
  // merge time, the same restraint DPIA's own build showed (doc 232 §9.2).
  admt: {
    typed_state_vocabulary: {
      flags: [
        "significant_decision",
        "no_human_review",
        "qualifying_human_review",
        "solely_advertising",
        "vendor_hosted",
        "biometric_model",
        "full_opt_out",
        "human_appeal_exception",
        "hiring_admission_exception",
        "work_allocation_exception",
      ],
      classes: [...ADMT_DECISION_DOMAIN_CLASSES],
      // ADMT has no closed relationship-to-affected-person field (doc
      // 216/227, confirmed again this build) — empty, not invented.
      relationships: [],
      // ADMT has no closed data-category field (doc 216/227) — empty, not
      // invented.
      data_categories: [],
      verdict_elements: [
        "Significant decision",
        "Human involvement",
        "Advertising exclusion",
        "Notice delivery",
        "Notice content",
        "Opt-out pathway",
        "Access process",
        "Vendor dependency",
      ],
      state_roots: ["intake."],
    },
    instrument_scope: ["CPPA ADMT Regulations"],
    output_path: "supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts",
    export_prefix: "ADMT",
  },
};

export function hookRegistryFor(product: string): HookProductVocabulary | undefined {
  return HOOK_PRODUCT_REGISTRY[product];
}
