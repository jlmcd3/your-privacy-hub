/**
 * LTP Pass-2 Slot Resolver (Wave-B enforcement mode).
 *
 * Deterministically resolves the plan_slots referenced by pass2-templates.ts
 * from a validated RenderPlan v1. Pure; never throws (returns "" for any
 * absent-but-required slot — post-render assertion will flag).
 *
 * Slot inventory (from pass2-templates.ts):
 *   benefit_summary_tokens     ← factor_table[kind="benefit"].factor_id
 *   negative_summary_tokens    ← factor_table[kind="negative_impact"].factor_id
 *   safeguard_summary_tokens   ← factor_table[kind="safeguard"].factor_id
 *   balance_direction_clause   ← selected from BALANCE_DIRECTION_CLAUSES
 *   tipping_factors            ← factor rows with highest closeness contribution
 *   doc_element_label          ← gate_outcome derived
 *   customer_question          ← gate_outcome derived
 *   cohort_date                ← deterministic cohort resolver (upstream)
 *   review_item_list           ← validator issues + gate customer questions
 *   open_questions_tokens      ← Type R propositions with polarity=="unknown"
 */
import type { RenderPlan, FactorTableEntry, WeighingFrameEntry } from "../render-plan/schema.ts";
import { BALANCE_DIRECTION_CLAUSES } from "./content/pass2-templates.ts";

export const SLOT_RESOLVER_VERSION = "ltp-slot-resolver-2026-07-26";

export interface SlotContext {
  readonly activity_ref?: string;
  readonly closeness?: number;
  readonly cohort_date?: string;
  readonly review_items?: readonly string[];
}

const joinTokens = (labels: readonly string[]): string => {
  const clean = labels.filter((s) => typeof s === "string" && s.trim().length > 0);
  if (clean.length === 0) return "no items on the record";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
};

const factorsByKind = (plan: RenderPlan, kind: FactorTableEntry["kind"]): FactorTableEntry[] =>
  plan.factor_table.filter((f) => f.kind === kind && f.present_in_intake);

const factorLabel = (f: FactorTableEntry): string => f.factor_id.replace(/^F\./, "").replace(/[._-]+/g, " ");

const tippingFrom = (frame: readonly WeighingFrameEntry[]): string => {
  const top = [...frame].sort((a, b) => (b.closeness_contribution ?? 0) - (a.closeness_contribution ?? 0)).slice(0, 3);
  return joinTokens(top.map((f) => f.anchor_hint || f.pinpoint));
};

export function resolveSlot(
  plan: RenderPlan,
  slot: string,
  ctx: SlotContext = {},
): string {
  switch (slot) {
    case "benefit_summary_tokens":
      return joinTokens(factorsByKind(plan, "benefit").map(factorLabel));
    case "negative_summary_tokens":
      return joinTokens(factorsByKind(plan, "negative_impact").map(factorLabel));
    case "safeguard_summary_tokens":
      return joinTokens(factorsByKind(plan, "safeguard").map(factorLabel));
    case "balance_direction_clause": {
      const b = factorsByKind(plan, "benefit").length;
      const n = factorsByKind(plan, "negative_impact").length;
      return n > b ? BALANCE_DIRECTION_CLAUSES[1] : BALANCE_DIRECTION_CLAUSES[0];
    }
    case "tipping_factors":
      return tippingFrom(plan.weighing_frame);
    case "cohort_date":
      return ctx.cohort_date ?? "";
    case "review_item_list":
      return joinTokens(ctx.review_items ?? []);
    case "open_questions_tokens": {
      const unknowns = plan.propositions.filter(
        (p) => p.epistemic_type === "R" && (p as { polarity?: string }).polarity === "unknown",
      );
      if (unknowns.length === 0) return "";
      return `Open questions: ${joinTokens(unknowns.map((u) => u.conclusion_id))}.`;
    }
    case "doc_element_label":
    case "customer_question":
      // Bound to a per-gate context; caller substitutes from gate_outcomes.
      return "";
    default:
      return "";
  }
}
