// DOC 213 §2 — PER-PRODUCT TYPED VOCABULARY for analogy hooks.
//
// A verbatim copy of the LIA vocabulary in
// `generate-corpus-rules/_local/product-registry.ts`. It is copied rather
// than imported because an edge function may not import from a sibling
// function directory (deploy-hygiene). A product with no entry here gets no
// hook generation, and nothing is invented for it.
//
// DOC 231 (2026-09-08) — GENERALISED for a second product (CPPA Risk).
// `index.ts`'s `actionGenerate` previously hard-coded `elementOf: liaElementOf`
// and `contextBlock: LIA_HOOK_CONTEXT_BLOCK` — the only two things that were
// product-specific in an otherwise-generic dispatch (`output_path` and
// `export_prefix` were already registry fields). Both now live on THIS
// registry entry, alongside the vocabulary, so `actionGenerate` reads
// `registry.elementOf(factorId)` / `registry.contextBlock` for whichever
// product it is generating and needs no per-product branch. The `lia` entry
// below is functionally unchanged (same vocabulary; `elementOf`/
// `contextBlock` now point at the same `liaElementOf` /
// `LIA_HOOK_CONTEXT_BLOCK` the old hard-coded call used) —
// tests/edge/corpus/doc213-hooks-generator.test.ts and
// doc213-context-block-pin.test.ts, which exercise the `lia` path, are
// unaffected by this change.
//
// DOC 237 (2026-09-09) — RECONCILED across the three V3 product branches.
// `v3-dpia` (doc 232) and `v3-admt` (doc 235) each added their entry against
// the OLD, non-generalised interface (they could not see `v3-cppa-risk`'s
// generalisation, and said so). This is the ONE merged registry: FOUR
// entries (`lia`, `dpia`, `cppa-risk`, `admt`), every one carrying its own
// `elementOf`/`contextBlock` in the doc 231 shape, so `actionGenerate`'s
// single registry dispatch reaches every product's own factor→element map
// and [RATIFY] context block. Each product's vocabulary is carried over
// byte-for-byte from its own branch; only the two doc 231 fields were added
// to the `dpia`/`admt` entries. Pinned by
// tests/edge/corpus/doc237-registry-reconciliation.test.ts.

import { liaElementOf } from "./factor-element.ts";
import { LIA_HOOK_CONTEXT_BLOCK } from "./hook-context-block.ts";
import { dpiaElementOf } from "./dpia-factor-element.ts";
import { DPIA_HOOK_CONTEXT_BLOCK } from "./dpia-hook-context-block.ts";
import { riskElementOf } from "./risk-factor-element.ts";
import { RISK_HOOK_CONTEXT_BLOCK } from "./risk-hook-context-block.ts";
import { admtElementOf } from "./admt-factor-element.ts";
import { ADMT_HOOK_CONTEXT_BLOCK } from "./admt-hook-context-block.ts";

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
  /** DOC 231 — factor label -> the grouping key a hook's `{section}` slot
   *  and engine-verdict lookup resolve through (LIA: three-part-test
   *  element; DPIA: obligation | adequacy; CPPA Risk and ADMT: the
   *  factor_id itself, doc 229 §8 / doc 235 §3.3 default #1).
   *  Returns `null` for an unmapped factor so `generateHooks` excludes
   *  that hook BY NAME rather than emitting a blank. */
  readonly elementOf: (factorId: string) => string | null;
  /** DOC 231 — the product's [RATIFY] context block, copied verbatim from
   *  its canonical `corpus/maps/<product>-hooks.ts` file (pinned by a
   *  byte-comparison test — see e.g.
   *  tests/edge/corpus/doc213-context-block-pin.test.ts /
   *  doc231-risk-registry-and-context-block.test.ts). `generateHooks`
   *  appends this string after the emitted hooks array. */
  readonly contextBlock: string;
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
    elementOf: liaElementOf,
    contextBlock: LIA_HOOK_CONTEXT_BLOCK,
  },
  // DOC 232 (2026-09-08) — DPIA V3 hook corpus registry entry. The DPIA
  // hook join / rule-states pair this vocabulary against lives at
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
  //
  // DOC 237 — `elementOf`/`contextBlock` wired to the DPIA files doc 232
  // already built (`dpia-factor-element.ts`, `dpia-hook-context-block.ts`,
  // both pinned against the canonical dpia-hooks.ts by their own tests).
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
    elementOf: dpiaElementOf,
    contextBlock: DPIA_HOOK_CONTEXT_BLOCK,
  },
  // DOC 231 (2026-09-08) — CPPA Risk registry entry. Vocabulary drawn from
  // the Risk intake contract (_shared/intake-contracts/cppa-risk-assessment.ts)
  // and the Risk CAM factor vocabulary (_shared/corpus/maps/risk-corpus-map.ts).
  // `use_case_class`/`relationship` vocabularies are EMPTY: CPPA Risk has no
  // activity classifier or closed relationship-to-subject field equivalent
  // to LIA's (doc 231 build log [NEEDS] — see also
  // run-cppa-risk-assessment-v2/_local/ltp/v3/rule-states.ts's header). A
  // hook whose `required_atoms` names a `class:`/`relationship:` atom can
  // never be drafted validly until one exists — the vocabulary is left
  // empty rather than invented so `checkAtom` (vocabulary.ts) rejects any
  // such atom outright, the same fail-closed behaviour an empty list
  // already gives every other kind here.
  "cppa-risk": {
    typed_state_vocabulary: {
      flags: [
        "sensitive_pi",
        "profiling_or_systematic_observation",
        "admt_use",
        "sell_or_share",
        "under16_data",
        "biometric_data",
        "children_data",
      ],
      classes: [], // [NEEDS] — no CPPA Risk activity classifier yet
      relationships: [], // [NEEDS] — no closed relationship-to-subject field yet
      data_categories: [
        "Contact identifiers (name, email, phone)",
        "Government identifiers (SSN, driver's license, state ID, passport number)",
        "Device identifiers (IP, cookies, device IDs)",
        "Internet or network activity",
        "Contents of mail, email, or text messages",
        "Precise geolocation (GPS-level / specific address)",
        "General location (city, region, ZIP, IP-derived)",
        "Financial information",
        "Account log-in or financial-account credentials",
        "Health or medical information",
        "Biometric information",
        "Genetic data",
        "Neural data",
        "Racial or ethnic origin",
        "Religious or philosophical beliefs",
        "Union membership",
        "Sexual orientation",
        "Gender identity",
        "Citizenship or immigration status",
        "Employment information",
        "Education information",
        "Children's data (under 16)",
        "Other",
      ],
      verdict_elements: [
        "Regulatory trigger and applicability", "Material privacy risks", "Processing purpose specificity",
        "Safeguards", "Approval and authority", "Stakeholder involvement and information providers",
        "Processing methods and coherence", "Retention", "Consumer interaction and scale",
        "Transparency and disclosures", "Consumer benefit", "ADMT made available to another business",
        "Benefits-risks balancing", "Assessment timing and material changes", "Assessment retention",
        "Prior DPIA or other assessment", "CPPA submission and certifying executive",
      ],
      state_roots: ["intake."],
    },
    instrument_scope: ["CPPA Regulations", "CCPA"],
    output_path: "supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts",
    export_prefix: "RISK",
    elementOf: riskElementOf,
    contextBlock: RISK_HOOK_CONTEXT_BLOCK,
  },
  // DOC 235 (2026-09-08) — ADMT's own vocabulary. `relationships` and
  // `data_categories` are EMPTY: ADMT has no closed relationship-to-
  // affected-person field and no closed data-category field (doc 216/227,
  // confirmed again in the doc 235 build) — empty, not invented.
  //
  // DOC 237 — `elementOf`/`contextBlock` wired to the ADMT files doc 235
  // already built (`admt-factor-element.ts`, `admt-hook-context-block.ts`,
  // both pinned against the canonical admt-hooks.ts by
  // tests/edge/corpus/doc235-admt-registry-and-context-block.test.ts).
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
      relationships: [],
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
    elementOf: admtElementOf,
    contextBlock: ADMT_HOOK_CONTEXT_BLOCK,
  },
};

export function hookRegistryFor(product: string): HookProductVocabulary | undefined {
  return HOOK_PRODUCT_REGISTRY[product];
}
