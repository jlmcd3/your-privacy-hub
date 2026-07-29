/**
 * ITEM 253 — Substance gates.
 *
 * Pure evaluators over an assembled AssemblerResult + RenderPlan. Each
 * gate returns hard-failure strings (empty = pass). No mutation.
 *
 * Per Ruling A (docs/courier/ITEM250-RULING-A-GOLDEN-SHAPE-GATE-LOCATION-2026-07-29.md)
 * the golden-shape HARD ASSERT lives here: shortfall_keys non-empty ⇒
 * one hard failure entry per key.
 */
import type { RenderPlan, FactorTableEntry } from "../../render-plan/schema.ts";
import type { AssemblerResult } from "../pass2-assembler.ts";
import type { TemplateInstance } from "../section-composers/cppa-risk.ts";
import { composeSection, KIND_OPENERS } from "../section-composers/cppa-risk.ts";
import { evaluateGoldenShape } from "../golden-shape-quotas.ts";
import type { SubstanceGateConfig, SubstanceMetrics } from "./types.ts";

const RATIFIED_STEMS: ReadonlySet<string> = new Set(
  Object.values(KIND_OPENERS),
);
export { RATIFIED_STEMS };

export interface SubstanceEvaluation {
  readonly metrics: SubstanceMetrics;
  readonly hard_failures: readonly string[];
}

/** presence_rate = present factors / total factors. */
export function presenceRate(
  plan: RenderPlan,
  cfg?: SubstanceGateConfig,
): { rate: number; present: number; total: number; failure?: string } {
  const total = plan.factor_table.length;
  const present = plan.factor_table.filter((f) => f.present_in_intake).length;
  const rate = total === 0 ? 0 : present / total;
  let failure: string | undefined;
  if (cfg?.min_presence_rate !== undefined && rate < cfg.min_presence_rate) {
    failure = `presence_rate:${rate.toFixed(3)}<${cfg.min_presence_rate}`;
  }
  return { rate, present, total, failure };
}

/**
 * noteSpecificity: every PRESENT factor must have ≥1 intake_ledger_ref AND
 * a weight_note that is not the "no record evidence" fossil.
 */
export function noteSpecificity(plan: RenderPlan): {
  factors_with_ledger_refs: number;
  note_token_diversity: number;
  failures: readonly string[];
} {
  const failures: string[] = [];
  const presentFactors: FactorTableEntry[] = plan.factor_table.filter(
    (f) => f.present_in_intake,
  );
  let withRefs = 0;
  const noteTokens = new Set<string>();
  for (const f of presentFactors) {
    if (f.intake_ledger_refs.length >= 1) withRefs += 1;
    else failures.push(`note_specificity:no_ledger_ref:${f.factor_id}`);
    const note = (f.weight_note ?? "").trim();
    if (!note) {
      failures.push(`note_specificity:missing_weight_note:${f.factor_id}`);
    } else if (/no record evidence/i.test(note)) {
      failures.push(`note_specificity:fossil_no_record_evidence:${f.factor_id}`);
    } else {
      for (const tok of note.toLowerCase().split(/\W+/).filter(Boolean)) {
        noteTokens.add(tok);
      }
    }
  }
  return {
    factors_with_ledger_refs: withRefs,
    note_token_diversity: noteTokens.size,
    failures,
  };
}

/**
 * actionDiversity: over composed priority_actions instances, no two
 * CONSECUTIVE actions share KIND opener stem AND element label. Ratified
 * stems (KIND_OPENERS values) are exempt from prefix-only checks per
 * SPEC §6 — this evaluator only fails on FULL (stem+label) duplication.
 */
export function actionDiversity(plan: RenderPlan): {
  ok: boolean;
  failures: readonly string[];
} {
  const instances: TemplateInstance[] =
    (composeSection("priority_actions", plan) as TemplateInstance[] | null) ?? [];
  const failures: string[] = [];
  for (let i = 1; i < instances.length; i += 1) {
    const prev = instances[i - 1];
    const cur = instances[i];
    const prevLabel = String((prev.ctx as Record<string, unknown>).element_short_label ?? "");
    const curLabel = String((cur.ctx as Record<string, unknown>).element_short_label ?? "");
    const prevStem = matchStem(prevLabel);
    const curStem = matchStem(curLabel);
    if (
      prevStem !== null &&
      curStem !== null &&
      prevStem === curStem &&
      prevLabel === curLabel
    ) {
      failures.push(`action_diversity:consecutive_dup:${i}:${curStem}`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function matchStem(label: string): string | null {
  for (const stem of RATIFIED_STEMS) {
    if (label.startsWith(stem)) return stem;
  }
  return null;
}

/** goldenShapeHard — Ruling A hard-assert site. */
export function goldenShapeHard(report: Record<string, unknown>): {
  review_flag: boolean;
  shortfall_keys: readonly string[];
  failures: readonly string[];
} {
  const gs = evaluateGoldenShape(report);
  return {
    review_flag: gs.review_flag,
    shortfall_keys: gs.shortfall_keys,
    failures: gs.shortfall_keys.map((k) => `golden_shape:${k}`),
  };
}

/** Aggregate evaluator used by the runner. */
export function evaluateSubstance(
  plan: RenderPlan,
  result: AssemblerResult,
  cfg?: SubstanceGateConfig,
): SubstanceEvaluation {
  const pr = presenceRate(plan, cfg);
  const ns = noteSpecificity(plan);
  const ad = actionDiversity(plan);
  const gs = goldenShapeHard(result.report);
  const failures = [
    ...(pr.failure ? [pr.failure] : []),
    ...ns.failures,
    ...ad.failures,
    ...gs.failures,
  ];
  return {
    metrics: {
      presence_rate: pr.rate,
      present_factor_count: pr.present,
      factors_with_ledger_refs: ns.factors_with_ledger_refs,
      note_token_diversity: ns.note_token_diversity,
      action_kind_diversity_ok: ad.ok,
      golden_shape: {
        review_flag: gs.review_flag,
        shortfall_keys: gs.shortfall_keys,
      },
    },
    hard_failures: failures,
  };
}
