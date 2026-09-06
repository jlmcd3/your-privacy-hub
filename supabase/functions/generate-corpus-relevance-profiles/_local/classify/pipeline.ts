// DOC 191 §6 — THE CLASSIFICATION PIPELINE, stages 0 through 3, with the
// §6.3 per-stage checkpoint draws.
//
// STAGE 4 IS NOT HERE, AND THAT IS DELIBERATE. §6.2's stage 4 is "a random
// sample, stratified toward whatever the pipeline marked low/medium
// confidence and toward anything just promoted to `rule`, gets A FULL HUMAN
// READ". Code cannot perform a human read. What this module provides for
// stage 4 is the TOOLING: `drawStratifiedSample` (sampling.ts) produces the
// draw, `ruleOfThreeUpperBound` states the bound the draw supports, and
// `runClassificationPipeline` hands back every stage's checkpoint sample
// alongside the outcomes. The reading, the root-cause diagnosis (§6.3 step
// 3), the signature-driven resweep (step 4) and the fix (steps 5–6) are human
// work by construction.
//
// STAGE 5 IS NOT A PIPELINE STAGE EITHER — it is the CEO/delegate
// ratification gate in §8, and nothing in this file can satisfy it. The
// pipeline's entire job is to narrow what needs that attention from thousands
// of rows to a short, evidence-attached list; the generator refuses to ship
// any `rule` row that has not been through it.

import type {
  ClassificationCandidate,
  ClassificationOutcome,
  LlmCall,
  Stage0Result,
  Stage1Result,
} from "./types.ts";
import { stage0Prior } from "./stage0-prior.ts";
import { stage1ExceptionMine } from "./stage1-exception.ts";
import { stage3SelfConsistency, type Stage3Result } from "./stage3-consistency.ts";
import {
  CHECKPOINT_SAMPLE_SIZE,
  drawStratifiedSample,
  type SampleableItem,
  type StratifiedDraw,
} from "./sampling.ts";

export const PIPELINE_VERSION = "corpus-classify-v1-2026-09-06";

export interface CheckpointReport {
  readonly stage: "stage0_prior" | "stage1_exception" | "stage2_extraction" | "stage3_consistency";
  readonly draw: StratifiedDraw<SampleableItem & { readonly note: string }>;
  /** What a reviewer is being asked to check on this draw. */
  readonly instruction: string;
}

export interface PipelineOptions {
  readonly llm: LlmCall;
  readonly pipelineVersion?: string;
  readonly classifiedAt?: string;
  readonly checkpointSize?: number;
  /** Seed prefix for the reproducible checkpoint draws. */
  readonly seed?: string;
  /** source_row_ids the §6.4 sibling check has already flagged, so the draws
   *  can weight toward them (§6.4's "routed into stage 4's sample"). */
  readonly siblingConflicts?: ReadonlySet<string>;
}

export interface PipelineRun {
  readonly outcomes: readonly ClassificationOutcome[];
  readonly checkpoints: readonly CheckpointReport[];
  readonly pipeline_version: string;
  readonly stage2_candidates: readonly string[];
  readonly promoted_ids: readonly string[];
}

function checkpoint(
  stage: CheckpointReport["stage"],
  items: readonly (SampleableItem & { note: string })[],
  seed: string,
  size: number,
  instruction: string,
): CheckpointReport {
  return { stage, draw: drawStratifiedSample(items, { size, seed }), instruction };
}

export async function runClassificationPipeline(
  candidates: readonly ClassificationCandidate[],
  opts: PipelineOptions,
): Promise<PipelineRun> {
  const pipeline_version = opts.pipelineVersion ?? PIPELINE_VERSION;
  const classified_at = opts.classifiedAt ?? new Date().toISOString();
  const size = opts.checkpointSize ?? CHECKPOINT_SAMPLE_SIZE;
  const seedBase = opts.seed ?? pipeline_version;
  const conflicts = opts.siblingConflicts ?? new Set<string>();
  const checkpoints: CheckpointReport[] = [];

  // ── STAGE 0 ─────────────────────────────────────────────────────────────
  const priors = new Map<string, Stage0Result>();
  for (const c of candidates) priors.set(c.id, stage0Prior(c));

  checkpoints.push(checkpoint(
    "stage0_prior",
    candidates.map((c) => ({
      id: c.id,
      confidence_tier: priors.get(c.id)!.confidence_tier,
      promoted_toward_rule: false, // stage 0 can never promote (see stage0-prior.ts)
      sibling_conflict: conflicts.has(c.source_row_id),
      note: priors.get(c.id)!.basis,
    })),
    `${seedBase}::stage0`,
    size,
    "Read each sampled row's excerpt and confirm the metadata prior is right for it — an enforcement action really is an outcome, a guidance pin really is the regulator interpreting its own rule. A repeated mismatch means the source-type table itself is wrong, not one row.",
  ));

  // ── STAGE 1 ─────────────────────────────────────────────────────────────
  const mined = new Map<string, Stage1Result>();
  for (const c of candidates) mined.set(c.id, stage1ExceptionMine(c, priors.get(c.id)!));

  checkpoints.push(checkpoint(
    "stage1_exception",
    candidates.map((c) => {
      const m = mined.get(c.id)!;
      return {
        id: c.id,
        // A shortlisted row is a row this stage moved toward `rule`.
        confidence_tier: m.shortlist_for_stage2 ? "low" as const : priors.get(c.id)!.confidence_tier,
        promoted_toward_rule: m.shortlist_for_stage2,
        sibling_conflict: conflicts.has(c.source_row_id),
        note: m.basis,
      };
    }),
    `${seedBase}::stage1`,
    size,
    "Check both directions on the sampled rows: a shortlisted row should genuinely carry categorical or definitional language, and a NON-shortlisted row should genuinely carry none. A missed marker becomes a searchable signature — add it to the wordlist and re-scan this batch (doc 191 §6.3 steps 3 and 6).",
  ));

  const shortlist = candidates.filter((c) => mined.get(c.id)!.shortlist_for_stage2);

  // ── STAGES 2 + 3 ────────────────────────────────────────────────────────
  // Stage 2 is never run alone: §6.2 stage 3 requires the SAME extraction run
  // twice under two framings, so the adversarial pair is the unit of work.
  const consistency = new Map<string, Stage3Result>();
  for (const c of shortlist) {
    consistency.set(c.id, await stage3SelfConsistency(c, opts.llm));
  }

  checkpoints.push(checkpoint(
    "stage2_extraction",
    shortlist.map((c) => {
      const r = consistency.get(c.id)!;
      return {
        id: c.id,
        confidence_tier: r.find_rule.quote_verified ? "medium" as const : "low" as const,
        promoted_toward_rule: r.find_rule.states_rule,
        sibling_conflict: conflicts.has(c.source_row_id),
        note: `find_rule: states_rule=${r.find_rule.states_rule}, quote_verified=${r.find_rule.quote_verified}`,
      };
    }),
    `${seedBase}::stage2`,
    size,
    "Re-read the quote against the excerpt yourself. The mechanical check proves the characters match; it cannot prove the quoted sentence actually says what the extraction claims. Reported/indirect speech is the known failure mode (doc 191 §6.3 step 3's own example).",
  ));

  checkpoints.push(checkpoint(
    "stage3_consistency",
    shortlist.map((c) => {
      const r = consistency.get(c.id)!;
      return {
        id: c.id,
        confidence_tier: r.promote_to_rule ? "low" as const : r.agreement ? "high" as const : "medium" as const,
        promoted_toward_rule: r.promote_to_rule,
        sibling_conflict: conflicts.has(c.source_row_id),
        note: r.basis,
      };
    }),
    `${seedBase}::stage3`,
    size,
    "Every row promoted to a rule CANDIDATE is drawn unconditionally here. Read it in full: this is the last automated step before the CEO ratification gate (doc 191 §8), and the generator will not ship any of these until that gate is passed.",
  ));

  // ── OUTCOMES ────────────────────────────────────────────────────────────
  const outcomes: ClassificationOutcome[] = candidates.map((c) => {
    const p = priors.get(c.id)!;
    const m = mined.get(c.id)!;
    const r = consistency.get(c.id);
    const trail = [`stage0: ${p.basis}`, `stage1: ${m.basis}`];
    if (r) {
      trail.push(`stage2(find_rule): states_rule=${r.find_rule.states_rule}, quote_verified=${r.find_rule.quote_verified}`);
      trail.push(`stage2(argue_pattern): states_rule=${r.argue_pattern.states_rule}, quote_verified=${r.argue_pattern.quote_verified}`);
      trail.push(`stage3: ${r.basis}`);
    }

    if (r?.promote_to_rule) {
      return {
        candidate: c,
        rule_or_pattern: "rule",
        pipeline_stage: "stage3_consistency",
        // A freshly promoted candidate is never "high": it is the most
        // expensive direction to be wrong in and it has had no human read.
        confidence_tier: "low",
        extracted_quote: r.extracted_quote,
        quote_verified: true,
        self_consistency_agreement: true,
        rule_statement: r.rule_statement,
        pipeline_version,
        trail: [...trail, `classified_at: ${classified_at}`],
        promoted_toward_rule: true,
      };
    }

    if (r) {
      return {
        candidate: c,
        rule_or_pattern: "pattern",
        pipeline_stage: r.agreement ? "stage3_consistency" : "stage2_extraction",
        confidence_tier: r.agreement ? "medium" : "low",
        extracted_quote: r.find_rule.quote_verified ? r.find_rule.quote : null,
        quote_verified: r.find_rule.quote_verified,
        self_consistency_agreement: r.agreement,
        rule_statement: null,
        pipeline_version,
        trail: [...trail, `classified_at: ${classified_at}`],
        promoted_toward_rule: r.find_rule.states_rule,
      };
    }

    return {
      candidate: c,
      rule_or_pattern: "pattern",
      pipeline_stage: m.is_exception ? "stage1_exception" : "stage0_prior",
      confidence_tier: m.is_exception ? "low" : p.confidence_tier,
      extracted_quote: null,
      quote_verified: false,
      self_consistency_agreement: null,
      rule_statement: null,
      pipeline_version,
      trail: [...trail, `classified_at: ${classified_at}`],
      promoted_toward_rule: false,
    };
  });

  return {
    outcomes,
    checkpoints,
    pipeline_version,
    stage2_candidates: shortlist.map((c) => c.id),
    promoted_ids: outcomes.filter((o) => o.rule_or_pattern === "rule").map((o) => o.candidate.id),
  };
}
