// DOC 191 §6 — the classification pipeline's shared types.
//
// THE REVIEWABLE UNIT IS THE EXCERPT, NEVER THE SOURCE DOCUMENT (§6.1).
// Nobody classifies a fifty-page AEPD decision; the pipeline classifies the
// two sentences a curator already pulled out and pin-verified as a real
// substring of the source. Every stage below reads only these fields.

import type {
  ConfidenceTier,
  PipelineStage,
  RuleOrPattern,
} from "../../../_shared/corpus/authority-relevance-profile.ts";

/** One candidate for classification. */
export interface ClassificationCandidate {
  /** Stable identity for logging/sampling — the CAM row id where one exists. */
  readonly id: string;
  readonly product: string;
  readonly source_table: string;
  readonly source_row_id: string;
  /** The CAM role (AP / FC / AQ / AOW / SB) where known. */
  readonly role: string | null;
  /** The pin-verified excerpt. The ONLY text stages 2 and 3 are given. */
  readonly pinned_excerpt: string;
  readonly curation_note: string;
  /** `display.bearing` where the row has a ratified display block. */
  readonly display_bearing?: string | null;
}

/** What stage 0 decides from metadata alone. */
export type Stage0Prior = "pattern" | "rule_eligible";

export interface Stage0Result {
  readonly prior: Stage0Prior;
  /** Stage 0 can NEVER output 'rule': a rule row needs a rule_statement and a
   *  mechanically verified quote (doc 191 §4's two check constraints), and
   *  stage 0 extracts nothing at all. "rule_eligible" means "worth stage 1's
   *  attention", not "is a rule". */
  readonly rule_or_pattern: "pattern";
  readonly confidence_tier: ConfidenceTier;
  readonly pipeline_stage: Extract<PipelineStage, "stage0_prior">;
  readonly basis: string;
}

export interface Stage1Result {
  /** True where the row BREAKS its own stage-0 prior — a pattern-prior row
   *  that talks like a holding, or a rule-prior row that is merely
   *  descriptive. This is §6.2's "exception" in the literal sense. */
  readonly is_exception: boolean;
  /** True where stage 2 has something to extract. Wider than `is_exception`:
   *  a rule-prior row carrying rule markers is not an exception (it is doing
   *  exactly what its prior predicted) but it IS the main candidate pool —
   *  and since stage 0 can never output 'rule', a row that never reaches
   *  stage 2 can never be promoted at all. */
  readonly shortlist_for_stage2: boolean;
  readonly categorical_markers: readonly string[];
  readonly definitional_markers: readonly string[];
  readonly modal_markers: readonly string[];
  readonly fact_pattern_markers: readonly string[];
  readonly basis: string;
}

export type Stage2Framing = "find_rule" | "argue_pattern";

export interface Stage2Result {
  readonly framing: Stage2Framing;
  /** The model's answer to the narrow question — NEVER "is this a rule". */
  readonly states_rule: boolean;
  readonly quote: string | null;
  /** Mechanically confirmed as a real substring of the excerpt. A false here
   *  forces `pattern` regardless of `states_rule` (§6.1's safe direction). */
  readonly quote_verified: boolean;
  readonly rule_statement: string | null;
  readonly raw: string;
}

export interface ClassificationOutcome {
  readonly candidate: ClassificationCandidate;
  readonly rule_or_pattern: RuleOrPattern;
  readonly pipeline_stage: PipelineStage;
  readonly confidence_tier: ConfidenceTier;
  readonly extracted_quote: string | null;
  readonly quote_verified: boolean;
  readonly self_consistency_agreement: boolean | null;
  readonly rule_statement: string | null;
  readonly pipeline_version: string;
  /** Human-readable trail of why this row landed where it did — the evidence
   *  a reviewer needs without re-deriving it from pipeline logs (§2). */
  readonly trail: readonly string[];
  /** True where the pipeline moved this row TOWARD 'rule' at any stage. The
   *  §6.3 checkpoint sample is weighted toward exactly these. */
  readonly promoted_toward_rule: boolean;
}

/** The injected model call. Stage 2/3 take this so tests stub it and no live
 *  API call is ever part of the automated suite. */
export type LlmCall = (system: string, user: string) => Promise<string>;
