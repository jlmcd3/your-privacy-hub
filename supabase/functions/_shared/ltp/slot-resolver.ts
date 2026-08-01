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
  // ── ITEM 284 (F2) — provisional-posture passthroughs ──
  readonly provisional_support_clause?: string;
  readonly outstanding_elements_clause?: string;
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
  // ── ITEM 241.1 (E1) — scope per-prong composer context. Without this
  //    slot in the resolver, T.risk.applicability.engaged/not_engaged
  //    tripped fill-or-omit and BOTH scope_and_triggers and
  //    scope_confirmation dropped out at the wire (run-#177 blocker).
  readonly prong_subject?: string;
  readonly customer_question?: string;
  // ── ITEM 237 (T-M9.7) — balance-instance ctx passthroughs ──
  readonly benefit_summary_tokens?: string;
  readonly negative_summary_tokens?: string;
  readonly safeguard_summary_tokens?: string;
  readonly balance_direction_clause?: string;
  readonly tipping_factors?: string;
  // ── ITEM 241.3 — gap-driven four-move action + section-opener slots ──
  readonly element_short_label?: string;
  readonly entity_name?: string;
  readonly customer_recorded_fact_clause?: string;
  readonly gap_or_consequence_clause?: string;
  readonly compliance_guidance_sentence?: string;
  readonly deadline_sentence?: string;
  readonly q4_pi_categories?: string;
  readonly i1_processing_purpose?: string;
  readonly prong_list_with_individual_pinpoints?: string;
  readonly balance_outcome_sentence?: string;
  readonly customer_fact_clause?: string;
  readonly action_verb_phrase?: string;
  readonly aggregateBalance_sentence?: string;
  readonly sections_7150b_pinpoints?: string;
  readonly as_of_date?: string;
  readonly sufficiency_clause?: string;
  readonly sufficiency_closer_clause?: string;
  readonly factual_elements_summary_clause?: string;
  readonly reserved_judgments_list?: string;
  readonly type_j_pinpoints?: string;
  // ── ITEM 242 (defect 7a) — action owner slot.
  readonly owner_role_titles?: string;
  // ── ITEM 240 CP4 — per-instance citation pinpoints. When present,
  //    substituteCitations reads ctx.__cite[slot] verbatim as the pinpoint.
  //    This is the per-proposition binding seam that ends the "everything
  //    cites § 7150(b)(1)" class (global-first-binding fallback).
  readonly __cite?: Readonly<Record<string, string>>;
  // ITEM 244 (L1/L3/L5) — passthrough slots for processing narrative,
  // less-intrusive alternatives, and record-sufficiency affirmations.
  readonly i1b_min_pi_clause?: string;
  readonly affirmed_count_clause?: string;
  readonly gap_count_clause?: string;
  readonly pi_categories_clause?: string;
  readonly sources_clause?: string;
  readonly i1_processing_purpose_clause?: string;
  readonly i6_vendors_clause?: string;
  readonly i4_disclosure_mechanisms_clause?: string;
  readonly i2_retention_period_clause?: string;
  readonly i2_retention_criteria_clause?: string;
  readonly i2_deletion_clause?: string;
  // ITEM 244 (E1) v2 posture slots.
  readonly engaged_prong_label?: string;
  readonly engaged_prong_posture_clause?: string;
  readonly non_engaged_prongs_inline?: string;
  // ITEM 276 — primary-activity subject + § 7156(a) segmentation slots.
  readonly primary_activity_name?: string;
  readonly primary_activity_purpose_clause?: string;
  readonly secondary_activity_count_phrase?: string;
  readonly secondary_activity_list?: string;
  readonly secondary_divergence_clause?: string;
  // ITEM 319 — directive comparable-set recommendation clause.
  readonly secondary_recommendation_clause?: string;
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
      // ITEM 237 fix (b) — ctx-supplied value wins when non-empty so the
      // composer's balance-instance projection is authoritative.
      return (typeof ctx.benefit_summary_tokens === "string" && ctx.benefit_summary_tokens.trim().length > 0)
        ? ctx.benefit_summary_tokens
        : joinTokens(factorsByKind(plan, "benefit").map(factorLabel));
    case "negative_summary_tokens":
      return (typeof ctx.negative_summary_tokens === "string" && ctx.negative_summary_tokens.trim().length > 0)
        ? ctx.negative_summary_tokens
        : joinTokens(factorsByKind(plan, "negative_impact").map(factorLabel));
    case "safeguard_summary_tokens":
      return (typeof ctx.safeguard_summary_tokens === "string" && ctx.safeguard_summary_tokens.trim().length > 0)
        ? ctx.safeguard_summary_tokens
        : joinTokens(factorsByKind(plan, "safeguard").map(factorLabel));
    case "balance_direction_clause": {
      if (typeof ctx.balance_direction_clause === "string" && ctx.balance_direction_clause.trim().length > 0) {
        return ctx.balance_direction_clause;
      }
      const b = factorsByKind(plan, "benefit").length;
      const n = factorsByKind(plan, "negative_impact").length;
      return n > b ? BALANCE_DIRECTION_CLAUSES[1] : BALANCE_DIRECTION_CLAUSES[0];
    }
    case "tipping_factors":
      return (typeof ctx.tipping_factors === "string" && ctx.tipping_factors.trim().length > 0)
        ? ctx.tipping_factors
        : tippingFrom(plan.weighing_frame);
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
    // ITEM 241.1 (E1) — scope per-prong subject passthrough.
    case "prong_subject":           return ctx.prong_subject ?? "";
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
    // ── ITEM 284 (F2) — provisional posture ──
    case "provisional_support_clause":  return ctx.provisional_support_clause ?? "";
    case "outstanding_elements_clause": return ctx.outstanding_elements_clause ?? "";
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
    // ── ITEM 241.3 — four-move action + section-opener passthroughs ──
    case "element_short_label":         return ctx.element_short_label ?? "";
    case "entity_name":                 return ctx.entity_name ?? "";
    case "customer_recorded_fact_clause": return ctx.customer_recorded_fact_clause ?? "";
    case "gap_or_consequence_clause":   return ctx.gap_or_consequence_clause ?? "";
    case "compliance_guidance_sentence": return ctx.compliance_guidance_sentence ?? "";
    case "deadline_sentence":           return ctx.deadline_sentence ?? "";
    case "q4_pi_categories":            return ctx.q4_pi_categories ?? "";
    case "i1_processing_purpose":       return ctx.i1_processing_purpose ?? "";
    case "prong_list_with_individual_pinpoints": return ctx.prong_list_with_individual_pinpoints ?? "";
    case "balance_outcome_sentence":    return ctx.balance_outcome_sentence ?? "";
    case "customer_fact_clause":        return ctx.customer_fact_clause ?? "";
    case "action_verb_phrase":          return ctx.action_verb_phrase ?? "";
    case "aggregateBalance_sentence":   return ctx.aggregateBalance_sentence ?? "";
    case "sections_7150b_pinpoints":    return ctx.sections_7150b_pinpoints ?? "";
    case "as_of_date":                  return ctx.as_of_date ?? "";
    case "sufficiency_clause":          return ctx.sufficiency_clause ?? "";
    case "sufficiency_closer_clause":   return ctx.sufficiency_closer_clause ?? "";
    case "factual_elements_summary_clause": return ctx.factual_elements_summary_clause ?? "";
    case "reserved_judgments_list":     return ctx.reserved_judgments_list ?? "";
    case "type_j_pinpoints":            return ctx.type_j_pinpoints ?? "";
    // ── ITEM 242 (defect 7a) — action owner passthrough.
    case "owner_role_titles":           return ctx.owner_role_titles ?? "";
    // ── ITEM 276 — primary-activity subject + § 7156(a) segmentation ──
    case "primary_activity_name":            return ctx.primary_activity_name ?? "";
    case "primary_activity_purpose_clause":  return ctx.primary_activity_purpose_clause ?? "";
    case "secondary_activity_count_phrase":  return ctx.secondary_activity_count_phrase ?? "";
    case "secondary_activity_list":          return ctx.secondary_activity_list ?? "";
    case "secondary_divergence_clause":      return ctx.secondary_divergence_clause ?? "";
    case "secondary_recommendation_clause": return ctx.secondary_recommendation_clause ?? "";
    default:
      return "";
  }
}


