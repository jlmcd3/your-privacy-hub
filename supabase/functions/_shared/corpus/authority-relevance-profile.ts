// DOC 191 (2026-09-06) — the PRODUCT-AGNOSTIC relevance profile.
//
// The generalization of `CamRelevanceProfile` (cam-types.ts), whose
// `instrument` / `relationship` unions are LIA's own vocabulary baked into a
// shared type. Here every product-scoped field is a plain string, and the
// vocabulary is checked at GENERATION time against that product's registered
// list (doc 191 §3/§5) rather than at type level — the one real
// generalization this schema makes.
//
// DETERMINISM LAW (doc 48 §II.2a) IS UNCHANGED: no product code ever reads
// `authority_relevance_profiles` at generation time. This type describes the
// rows the build-time generator (generate-corpus-relevance-profiles) reads
// and the objects it BAKES INTO a snapshot-pinned `*-relevance-profiles.ts`
// file. Production reads only the generated file.
//
// THE RULE/PATTERN DISTINCTION (doc 191 §2, the CEO's own 2026-09-06 framing):
//   "rule"    — a regulator or court CLARIFYING WHAT THE LAW MEANS. Eligible,
//               AFTER CEO ratification, to be wired into a gate or outcome
//               override the way LIA's ePrivacy gate reads the EDPB row.
//   "pattern" — a specific enforcement OUTCOME against a named party ("a
//               similar company was fined"). Never eligible for gate wiring;
//               persuasive-only forever.
// The default is "pattern". Curators must affirmatively mark "rule" and
// supply a `rule_statement`. The enforcement is not this comment — it is the
// RULE_PROFILES / PATTERN_PROFILES export split the generator emits and the
// fleet-wide boundary test that bars gate/override files from importing the
// pattern half (tests/edge/corpus/corpus-relevance-rule-boundary.test.ts).

export type RuleOrPattern = "rule" | "pattern";

export type PipelineStage =
  | "stage0_prior"
  | "stage1_exception"
  | "stage2_extraction"
  | "stage3_consistency"
  | "human";

export type ConfidenceTier = "high" | "medium" | "low";

export type OutcomePosture = "accepted" | "conditional" | "rejected" | "contested";

/** The `source_table` values doc 191 §4 admits. `court_decisions` is listed in
 *  the DDL comment as a future member pending the doc 201 CEO call (§7.1) —
 *  it is included here so a curated litigation row is representable, not
 *  because any such row exists. */
export type ProfileSourceTable =
  | "enforcement_actions"
  | "provision_texts"
  | "edpb_guidelines"
  | "regulatory_guidance"
  | "cppa_fsor_commentary"
  | "cppa_authorities"
  | "gdpr_articles"
  | "gdpr_recitals"
  | "court_decisions";

/**
 * The generated, ships-in-the-repo object. This is what a product's map
 * consumes; it deliberately carries NO curation bookkeeping (curated_by,
 * ratified_by, ledger_ref…) — those live in the DB row and are the
 * generator's INPUT, never bytes a product reads.
 */
export interface AuthorityRelevanceProfile {
  readonly product: string;
  readonly country: string;
  /** PRODUCT-SCOPED; checked against the product's registered instrument list. */
  readonly instrument: string;
  /** PRODUCT-SCOPED; must be a subset of the product's factor vocabulary. */
  readonly factor_ids: readonly string[];
  readonly use_case_class: string | null;
  readonly outcome_posture: OutcomePosture;
  readonly relationship: string | null;
  readonly data_categories: readonly string[];
  readonly flags: readonly string[];
  readonly rule_or_pattern: RuleOrPattern;
  /** Required iff rule_or_pattern === "rule". */
  readonly rule_statement?: string;
  readonly curation_note: string;

  // ── EVIDENCE FIELDS (doc 191 §2/§6) ───────────────────────────────────
  readonly pipeline_stage: PipelineStage;
  readonly extracted_quote: string | null;
  readonly quote_verified: boolean;
  readonly self_consistency_agreement: boolean | null;
  readonly confidence_tier: ConfidenceTier;
  readonly pipeline_version: string;
  readonly classified_at: string; // ISO timestamp
}

/**
 * One `authority_relevance_profiles` row exactly as the table stores it
 * (doc 191 §4). The generator's input; never shipped.
 */
export interface AuthorityRelevanceProfileRow {
  readonly id: string;
  readonly product: string;
  readonly source_table: string;
  readonly source_row_id: string;
  readonly cam_row_id: string | null;
  readonly country: string;
  readonly instrument: string;
  readonly factor_ids: readonly string[];
  readonly use_case_class: string | null;
  readonly outcome_posture: string;
  readonly relationship: string | null;
  readonly data_categories: readonly string[];
  readonly flags: readonly string[];
  readonly rule_or_pattern: string;
  readonly rule_statement: string | null;
  readonly curation_note: string;
  readonly curated_by: string;
  readonly curated_at: string;
  readonly ratified_by: string | null;
  readonly ratified_at: string | null;
  readonly ledger_ref: string | null;
  readonly map_version_generated_into: string | null;
  readonly pipeline_stage: string;
  readonly extracted_quote: string | null;
  readonly quote_verified: boolean;
  readonly self_consistency_agreement: boolean | null;
  readonly confidence_tier: string;
  readonly pipeline_version: string;
  readonly classified_at: string;
  readonly created_at?: string;
  readonly updated_at?: string;
}

/** The shared BASE flag vocabulary (doc 191 §2). Products extend it; they do
 *  not redefine these five. */
export const BASE_PROFILE_FLAGS = [
  "special_category",
  "children",
  "large_scale",
  "automated_decision",
  "public_authority",
] as const;

/** Is a row ratified for RULE use? All three stamps, per doc 191 §8 — a
 *  partial stamp is not a ratification. Only the CEO (or a named delegate)
 *  may set these; no pipeline stage can satisfy this on its own. */
export function isRuleRatified(row: AuthorityRelevanceProfileRow): boolean {
  return !!row.ratified_by && !!row.ratified_at && !!row.ledger_ref;
}

/** Project a DB row onto the shipped profile shape. Pure; no validation
 *  (validation is the generator's job — see relevance-profile-generation.ts). */
export function rowToProfile(row: AuthorityRelevanceProfileRow): AuthorityRelevanceProfile {
  const base = {
    product: row.product,
    country: row.country,
    instrument: row.instrument,
    factor_ids: [...row.factor_ids],
    use_case_class: row.use_case_class,
    outcome_posture: row.outcome_posture as OutcomePosture,
    relationship: row.relationship,
    data_categories: [...row.data_categories],
    flags: [...row.flags],
    rule_or_pattern: row.rule_or_pattern as RuleOrPattern,
    curation_note: row.curation_note,
    pipeline_stage: row.pipeline_stage as PipelineStage,
    extracted_quote: row.extracted_quote,
    quote_verified: row.quote_verified,
    self_consistency_agreement: row.self_consistency_agreement,
    confidence_tier: row.confidence_tier as ConfidenceTier,
    pipeline_version: row.pipeline_version,
    classified_at: row.classified_at,
  };
  return row.rule_or_pattern === "rule" && row.rule_statement
    ? { ...base, rule_statement: row.rule_statement }
    : base;
}
