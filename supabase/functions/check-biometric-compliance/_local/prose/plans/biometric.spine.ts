// ─────────────────────────────────────────────────────────────────────────────
// ITEM 409 — BIOMETRIC PROSE SPINE (Leg A).
//
// This product uses the REFERENCE-PASSAGE IDIOM: verified statutory passages
// form the document's skeleton and the record's facts are woven in against
// them. The spine therefore encodes the section arc, the banned register and
// the reference-render fact-exemption — it does NOT encode section composers,
// because the walked renders establish that the biometric document is a SINGLE
// `assessment_text` string carrying ~83% of the document. There is no section
// to style, no shard, nothing for CSC to repair and nothing for coverage to
// link to. Leg A is a REGISTER encode over rendered strings.
//
// Walked renders (quality_run_documents):
//   28583f46-a280-4f18-9854-6dba7c2ea1b8  score 92.3  (full-batch, 2026-08-07)
//   d49d9be8-a503-4711-a60a-d1adb9e83bd1  score 88.4  (2026-08-01)
//
// The renders are an ARCHITECTURE AND REGISTER reference only. No fact, name,
// figure, entity or scenario from them may reach a customer document, and none
// of them may be seeded into a fixture as record truth.
// `REFERENCE_RENDER_TOKENS` exists so the battery test can prove that no
// biometric builder literal carries a token from either render.
// ─────────────────────────────────────────────────────────────────────────────

export const BIOMETRIC_PLAN_PRODUCT = "biometric";

/** The approved plan row. Pinned; the fidelity test reads the DB-shaped JSON. */
export const BIOMETRIC_PLAN_ROW_ID = "9c1f7b2e-4d3a-4c58-9b61-2f0a5e7d8134";
export const BIOMETRIC_PLAN_ROW_VERSION = 2;
export const BIOMETRIC_PLAN_VERSION_LABEL = "prose-plans-2026-08-08-item409";

/**
 * The row this plan supersedes. Retained and demoted (approved=false), never
 * orphaned and never silently reused — the item400 governance-stub discipline.
 */
export const BIOMETRIC_PLAN_SUPERSEDED_ROW_ID = "f1deaa14-e377-4d03-a2af-bd30475b8e42";

/**
 * The finalize-point stamp written into `_meta.internal.biometric_pipeline_stamp`.
 * NEW constant — check-biometric-compliance carried only prompt-block and
 * registry build stamps before item409.
 */
export const BIOMETRIC_PIPELINE_STAMP = "biometric-pipeline@item-so6-2026-08-10";

export const BIOMETRIC_REFERENCE_RENDER_IDS: readonly string[] = [
  "28583f46-a280-4f18-9854-6dba7c2ea1b8",
  "d49d9be8-a503-4711-a60a-d1adb9e83bd1",
];

export const BIOMETRIC_THESIS =
  "Each biometric statute in scope is applied in its own words: the verified passage states the requirement, the practice the record describes is set beside it, and the conclusion is stated first. Where the record is silent, the fact that would settle it is named.";

export const BIOMETRIC_IDIOM = "reference_passage" as const;

export const BIOMETRIC_IDIOM_NOTE =
  "This product is STATUTE-AS-TEMPLATE. Verified statutory passages form the document's skeleton and the record's facts are woven in against them. Every passage rendered as template must byte-match the provision_texts row its citation names; the citation names the row the bytes actually came from. A passage and its cited row may never be reconciled by editing either the passage or the corpus row.";

export type BiometricArcStage =
  | "headline"
  | "record"
  | "duty"
  | "analysis"
  | "remedy"
  | "close";

export type BiometricLead = "determination" | "record";

export interface BiometricSectionSpec {
  readonly id: string;
  readonly title: string;
  readonly arc_stage: BiometricArcStage;
  readonly lead: BiometricLead;
  readonly source_key: string;
  readonly themes: readonly string[];
  readonly required: boolean;
}

/**
 * The section arc:
 *   applicability determination
 *   → the processing as the record describes it
 *   → the statutory requirements that attach, each stated from its verified
 *     passage with the record's facts against it
 *   → consent / notice / retention / security analyses
 *   → what remains
 *   → close.
 */
export const BIOMETRIC_SECTION_SPECS: readonly BiometricSectionSpec[] = [
  {
    id: "applicability_determination",
    title: "Whether each statute applies here",
    arc_stage: "headline",
    lead: "determination",
    source_key: "consequence_determination",
    themes: [
      "applies",
      "applies_conditionally",
      "does_not_apply",
      "one_verdict_per_statute",
      "condition_named",
    ],
    required: true,
  },
  {
    id: "processing_record",
    title: "The processing as the record describes it",
    arc_stage: "record",
    lead: "record",
    source_key: "processing_record",
    themes: ["identifiers", "population", "purpose", "vendor_and_storage", "record_quality"],
    required: true,
  },
  {
    id: "statutory_requirements",
    title: "The requirements that attach, and the record against each",
    arc_stage: "duty",
    lead: "determination",
    source_key: "duty_findings",
    themes: [
      "verified_passage_as_skeleton",
      "pinpoint_named",
      "record_fact_against_the_passage",
      "amendment_dated_and_separated",
      "exposure_kept_separate",
    ],
    required: true,
  },
  {
    id: "consent_and_notice",
    title: "Consent and notice",
    arc_stage: "duty",
    lead: "determination",
    source_key: "consent_and_notice",
    themes: [
      "written_release",
      "pre_collection_notice",
      "employment_condition_limb",
      "standalone_vs_embedded",
    ],
    required: true,
  },
  {
    id: "retention_and_destruction",
    title: "Retention and destruction",
    arc_stage: "duty",
    lead: "determination",
    source_key: "retention_and_destruction",
    themes: ["public_policy", "destruction_trigger", "outer_limit", "schedule_adherence"],
    required: true,
  },
  {
    id: "security_and_disclosure",
    title: "Security, disclosure and profit",
    arc_stage: "duty",
    lead: "determination",
    source_key: "security_and_disclosure",
    themes: [
      "reasonable_standard_of_care",
      "no_profit",
      "permitted_disclosure_bases",
      "vendor_flow_down",
    ],
    required: true,
  },
  {
    id: "open_elements",
    title: "What the record does not yet settle",
    arc_stage: "remedy",
    lead: "determination",
    source_key: "information_needed",
    themes: ["one_ledger", "named_missing_fact", "who_confirms_it", "actions_only"],
    required: true,
  },
  {
    id: "close",
    title: "Scope and reliance",
    arc_stage: "close",
    lead: "determination",
    source_key: "disclaimer",
    themes: ["not_legal_advice", "counsel_review", "record_bound"],
    required: true,
  },
];

/**
 * Register that may never reach a reader surface. The first block is machine
 * vocabulary; the second block is the apparatus-first and field-label register
 * the walked renders exhibit (R1/R3).
 */
export const BIOMETRIC_BANNED_REGISTER: readonly string[] = [
  "record_insufficient",
  "insufficient_basis",
  "resolved_met",
  "resolved_not_met",
  "INDETERMINATE",
  "CANDIDATE",
  "TEST-STATES",
  "Applies to this organisation:",
  "Applicability: Conditional",
  "Status: Conditional",
  "for the stated purpose:",
  "cannot be determined",
  "no basis to assess",
];

/**
 * Entity tokens from the two walked renders. No biometric builder literal and
 * no fixture may carry any of these — the FACT-EXEMPT rule made testable.
 */
export const REFERENCE_RENDER_TOKENS: readonly string[] = [
  "Prairie Warehousing Co.",
  "Prairie Warehousing",
  "Prairie",
];

export const BIOMETRIC_FACT_EXEMPT_RULE =
  "The walked renders are an ARCHITECTURE AND REGISTER reference only. No fact, name, figure, entity or scenario from them may reach a customer document, and none of them may be seeded into a fixture as record truth.";
