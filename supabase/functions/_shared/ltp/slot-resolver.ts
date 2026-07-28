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

export const SLOT_RESOLVER_VERSION = "ltp-slot-resolver-2026-07-28-item235";

export interface SlotContext {
  readonly activity_ref?: string;
  readonly closeness?: number;
  readonly cohort_date?: string;
  readonly review_items?: readonly string[];
  // ── Summary-composition context (CONTENT COURIER 2026-07-26) ──
  readonly activity_count_phrase?: string;
  readonly each_or_this_clause?: string;
  readonly firm_positive_list?: string;
  readonly close_list?: string;
  readonly negative_list?: string;
  readonly remaining_outcomes_clause?: string;
  readonly activity_label?: string;
  readonly outcome_clause?: string;
  readonly key_factor_token?: string;
  readonly docs_completion_clause?: string;
  readonly activity_singplural_clause?: string;
  // ── ITEM 235 (T-M9.5) per-instance slot passthroughs ──
  readonly action_label?: string;
  readonly action_basis?: string;
  readonly deadline_basis?: string;
  readonly step_label?: string;
  readonly step_basis?: string;
  readonly element_label?: string;
  readonly element_status_clause?: string;
  readonly factor_label?: string;
  readonly factor_basis?: string;
  readonly guidance_clause?: string;
  readonly review_label?: string;
  readonly review_basis?: string;
  readonly driving_activity_label?: string;
  readonly what_would_tip_it?: string;
  readonly doc_element_label?: string;
  readonly customer_question?: string;
  // ── ITEM 237 (T-M9.7) — balance-instance ctx passthroughs ──
  readonly benefit_summary_tokens?: string;
  readonly negative_summary_tokens?: string;
  readonly safeguard_summary_tokens?: string;
  readonly balance_direction_clause?: string;
  readonly tipping_factors?: string;
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
    case "doc_element_label":       return ctx.doc_element_label ?? "";
    case "customer_question":       return ctx.customer_question ?? "";
    // ── Summary-composition slots (context-provided, verbatim pass-through) ──
    case "activity_count_phrase":       return ctx.activity_count_phrase ?? "";
    case "each_or_this_clause":         return ctx.each_or_this_clause ?? "";
    case "firm_positive_list":          return ctx.firm_positive_list ?? "";
    case "close_list":                  return ctx.close_list ?? "";
    case "negative_list":               return ctx.negative_list ?? "";
    case "remaining_outcomes_clause":   return ctx.remaining_outcomes_clause ?? "";
    case "activity_label":              return ctx.activity_label ?? "";
    case "outcome_clause":              return ctx.outcome_clause ?? "";
    case "key_factor_token":            return ctx.key_factor_token ?? "";
    case "docs_completion_clause":      return ctx.docs_completion_clause ?? "";
    case "activity_singplural_clause":  return ctx.activity_singplural_clause ?? "";
    // ── ITEM 235 (T-M9.5) per-instance slot passthroughs ──
    case "action_label":                return ctx.action_label ?? "";
    case "action_basis":                return ctx.action_basis ?? "";
    case "deadline_basis":              return ctx.deadline_basis ?? "";
    case "step_label":                  return ctx.step_label ?? "";
    case "step_basis":                  return ctx.step_basis ?? "";
    case "element_label":               return ctx.element_label ?? "";
    case "element_status_clause":       return ctx.element_status_clause ?? "";
    case "factor_label":                return ctx.factor_label ?? "";
    case "factor_basis":                return ctx.factor_basis ?? "";
    case "guidance_clause":             return ctx.guidance_clause ?? "";
    case "review_label":                return ctx.review_label ?? "";
    case "review_basis":                return ctx.review_basis ?? "";
    case "driving_activity_label":      return ctx.driving_activity_label ?? "";
    case "what_would_tip_it":           return ctx.what_would_tip_it ?? "";
    default:
      return "";
  }
}

