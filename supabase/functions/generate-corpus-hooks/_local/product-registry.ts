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
// unaffected by this change (doc 231 test run confirms).

import { liaElementOf } from "./factor-element.ts";
import { LIA_HOOK_CONTEXT_BLOCK } from "./hook-context-block.ts";
import { riskElementOf } from "./risk-factor-element.ts";
import { RISK_HOOK_CONTEXT_BLOCK } from "./risk-hook-context-block.ts";

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
   *  element; CPPA Risk: the factor_id itself, doc 229 §8 default #1).
   *  Returns `null` for an unmapped factor so `generateHooks` excludes
   *  that hook BY NAME rather than emitting a blank. */
  readonly elementOf: (factorId: string) => string | null;
  /** DOC 231 — the product's [RATIFY] context block, copied verbatim from
   *  its canonical `corpus/maps/<product>-hooks.ts` file (pinned by a
   *  byte-comparison test — see e.g.
   *  tests/edge/corpus/doc213-context-block-pin.test.ts /
   *  doc231-risk-context-block-pin.test.ts). `generateHooks` appends this
   *  string after the emitted hooks array. */
  readonly contextBlock: string;
}

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
};

export function hookRegistryFor(product: string): HookProductVocabulary | undefined {
  return HOOK_PRODUCT_REGISTRY[product];
}
