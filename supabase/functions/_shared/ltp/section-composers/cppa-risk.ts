/**
 * LTP Section Composers — cppa-risk (ITEM 235 / T-M9.5).
 *
 * Per-shard composers that turn a RenderPlan into an ordered list of
 * template INSTANCES with populated SlotContext. Renderer enforces
 * fill-or-omit at the instance level; composers therefore ship every
 * candidate instance and let the renderer drop the ones whose required
 * slots resolve empty.
 *
 * Pure; RenderPlan-only inputs.
 */
import type { RenderPlan, FactorTableEntry, Proposition } from "../../render-plan/schema.ts";
import type { SlotContext } from "../slot-resolver.ts";
import { FIRM_VARIANT_CLOSENESS_MAX, RECORD_STATUS_CLAUSES, SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES, SUMMARY_EACH_OR_THIS_CLAUSES, BALANCE_DIRECTION_CLAUSES } from "../content/pass2-templates.ts";
import { computeCloseness, chooseVariant } from "../closeness.ts";

export const SECTION_COMPOSERS_VERSION = "ltp-section-composers-cppa-risk-2026-07-28-item236";

export interface TemplateInstance {
  readonly template_id: string;
  readonly ctx: SlotContext;
}

// ── Small helpers ────────────────────────────────────────────────────────

const humanize = (id: string): string =>
  id.replace(/^[a-z]+\.[a-z]\./i, "").replace(/^F\./, "").replace(/[._-]+/g, " ").trim();

const factorLabel = (f: FactorTableEntry): string => humanize(f.factor_id);

const joinList = (labels: readonly string[]): string => {
  const clean = labels.filter((s) => typeof s === "string" && s.trim().length > 0);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
};

const pluralActivityPhrase = (n: number): string =>
  n <= 0
    ? "no activities identified as requiring assessment"
    : n === 1
      ? "one activity requiring assessment"
      : `${n} activities requiring assessment`;

/** Engaged Type R applicability propositions (mirrors summary-compose.ts). */
const engagedApplicability = (plan: RenderPlan): Proposition[] =>
  plan.propositions.filter(
    (p) => p.epistemic_type === "R" && (p as { polarity?: string }).polarity === "positive"
      && /appl(icab|y)/i.test(p.conclusion_id),
  );

const activityCount = (plan: RenderPlan): number => engagedApplicability(plan).length;

const anyCloseBalance = (plan: RenderPlan): boolean =>
  plan.weighing_frame.some(
    (f) => typeof f.closeness_contribution === "number" && f.closeness_contribution >= FIRM_VARIANT_CLOSENESS_MAX,
  );

const anyImpactsOutweigh = (plan: RenderPlan): boolean => {
  const benefits = plan.factor_table.filter((f) => f.kind === "benefit" && f.present_in_intake).length;
  const negatives = plan.factor_table.filter((f) => f.kind === "negative_impact" && f.present_in_intake).length;
  return negatives > 0 && negatives > benefits;
};

const insufficientRecord = (plan: RenderPlan): boolean =>
  plan.factor_table.filter((f) => f.present_in_intake).length === 0;

// ── Composers ────────────────────────────────────────────────────────────

/**
 * ITEM 236 fix (d) — activity_label MUST resolve from the proposition
 * (humanized conclusion_id), never from the raw intake answer value.
 * The engaged Type-R propositions carry the activity semantics; the
 * intake ledger display for the referenced field is a raw answer
 * (e.g. "Yes — systematic observation…") and would surface a
 * customer-facing label like "For Yes — systematic observation…".
 */
function activityLabelForProp(p: Proposition, _plan: RenderPlan): string {
  return humanize(p.conclusion_id);
}

function composeExecutive(plan: RenderPlan): TemplateInstance[] {
  const n = activityCount(plan);
  const each = n === 1 ? SUMMARY_EACH_OR_THIS_CLAUSES[0] : SUMMARY_EACH_OR_THIS_CLAUSES[1];
  // ITEM 236 fix (d) — singular/plural clause: n==1 → "activity", n!=1 → "activities".
  const singplural = n === 1 ? SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES[0] : SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES[1];
  const acp = pluralActivityPhrase(n);
  const engagedLabels = engagedApplicability(plan).map((p) => activityLabelForProp(p, plan));
  if (insufficientRecord(plan)) {
    return [{ template_id: "T.risk.exec.insufficient", ctx: { activity_singplural_clause: singplural } }];
  }
  if (anyImpactsOutweigh(plan)) {
    return [{
      template_id: "T.risk.exec.negative",
      ctx: {
        activity_count_phrase: acp,
        negative_list: joinList(engagedLabels) || "the activities identified on the record",
        remaining_outcomes_clause: "",
      },
    }];
  }
  // ITEM 236 fix (b) — variant selection through chooseVariant(closeness).
  // Closeness ≥ FIRM_VARIANT_CLOSENESS_MAX → hedged (with what_would_tip_it),
  // never firm. Flat-certainty guard remains as backstop.
  const closeness = computeCloseness(plan, plan.weighing_frame);
  if (chooseVariant(closeness) === "hedged") {
    const tipping = plan.weighing_frame
      .slice()
      .sort((a, b) => (b.closeness_contribution ?? 0) - (a.closeness_contribution ?? 0))
      .slice(0, 3)
      .map((f) => f.anchor_hint || f.pinpoint);
    return [{
      template_id: "T.risk.exec.hedged",
      ctx: {
        activity_count_phrase: acp,
        close_list: joinList(engagedLabels) || "the activities identified on the record",
        what_would_tip_it: joinList(tipping) || "the balance of benefits, negative impacts, and safeguards on the record",
        remaining_outcomes_clause: "",
      },
    }];
  }
  return [{
    template_id: "T.risk.exec.firm",
    ctx: { activity_count_phrase: acp, each_or_this_clause: each },
  }];
}

/**
 * ITEM 236 fix (b) — Balance-template selection MUST route through
 * chooseVariant(closeness). At closeness ≥ FIRM_VARIANT_CLOSENESS_MAX
 * the hedged variant is chosen, with the tipping-factor context slot
 * populated. Firm variant is never emitted at close balance.
 */
function balanceInstance(plan: RenderPlan): TemplateInstance {
  const closeness = computeCloseness(plan, plan.weighing_frame);
  const variant = chooseVariant(closeness);
  if (variant === "hedged") {
    const tipping = plan.weighing_frame
      .slice()
      .sort((a, b) => (b.closeness_contribution ?? 0) - (a.closeness_contribution ?? 0))
      .slice(0, 3)
      .map((f) => f.anchor_hint || f.pinpoint);
    return {
      template_id: "T.risk.balance.hedged",
      ctx: {
        what_would_tip_it: joinList(tipping) || "the balance of benefits, negative impacts, and safeguards on the record",
      },
    };
  }
  return { template_id: "T.risk.balance.firm", ctx: {} };
}

function composeAssessmentSummary(plan: RenderPlan): TemplateInstance[] {
  if (insufficientRecord(plan)) {
    // Nothing to weigh; return an insufficient exec-style summary line via docs.
    return [{
      template_id: "T.risk.summary.docs",
      ctx: { docs_completion_clause: "has outstanding documentation items — see Items for your review; the record does not yet complete" },
    }];
  }
  return [
    balanceInstance(plan),
    { template_id: "T.risk.summary.docs", ctx: { docs_completion_clause: "is complete against" } },
  ];
}

function composeRiskByActivity(plan: RenderPlan): TemplateInstance[] {
  const engaged = engagedApplicability(plan);
  if (engaged.length === 0) {
    // Fall back to a single balance instance so the section still ships
    // meaningful analytical prose when no Type-R activities are engaged
    // but factor content exists on the plan.
    if (!insufficientRecord(plan)) return [balanceInstance(plan)];
    return [];
  }
  // One balance instance per activity; label context slot for downstream
  // narrative composition.
  return engaged.map<TemplateInstance>((p) => {
    const inst = balanceInstance(plan);
    return {
      template_id: inst.template_id,
      ctx: { ...inst.ctx, activity_label: activityLabelForProp(p, plan) },
    };
  });
}


function composePriorityActions(plan: RenderPlan): TemplateInstance[] {
  // Priority actions derive from negative-impact factors and safeguard gaps.
  const rows = plan.factor_table.filter((f) =>
    f.present_in_intake && (f.kind === "negative_impact" || /gap|remediat|action/i.test(f.factor_id))
  );
  return rows.map<TemplateInstance>((f) => ({
    template_id: "T.risk.priority_action",
    ctx: {
      action_label: `Address ${factorLabel(f)}`,
      action_basis: `The record identifies this factor as bearing on the § 7152(a) analysis and warranting a documented response.`,
      deadline_basis: "Complete before the next annual review or before the next material change to the processing activity",
    },
  }));
}

function composeNextSteps(plan: RenderPlan): TemplateInstance[] {
  const rows = plan.factor_table.filter((f) => f.present_in_intake && f.kind === "safeguard");
  return rows.map<TemplateInstance>((f) => ({
    template_id: "T.risk.next_step",
    ctx: {
      step_label: `Confirm ${factorLabel(f)} is documented in the assessment record`,
      step_basis: `Present on the record; retain the supporting documentation with the assessment file.`,
    },
  }));
}

function composeStrengthenItems(plan: RenderPlan): TemplateInstance[] {
  const rows = plan.factor_table.filter((f) => f.present_in_intake && /gap|strengthen/i.test(f.factor_id));
  return rows.map<TemplateInstance>((f) => ({
    template_id: "T.risk.documentation.gap",
    ctx: {
      doc_element_label: factorLabel(f),
      customer_question: `Please provide additional record support for ${factorLabel(f)}.`,
    },
  }));
}

function composeRecordSufficiency(plan: RenderPlan): TemplateInstance[] {
  // Each factor row becomes an item; present_in_intake picks the status clause.
  return plan.factor_table.map<TemplateInstance>((f) => ({
    template_id: "T.risk.record_sufficiency.item",
    ctx: {
      element_label: factorLabel(f),
      element_status_clause: f.present_in_intake
        ? RECORD_STATUS_CLAUSES[0]
        : RECORD_STATUS_CLAUSES[1],
    },
  }));
}

function composeInformationNeeded(plan: RenderPlan): TemplateInstance[] {
  // Judgmental (Type J) propositions become customer questions.
  const jProps = plan.propositions.filter((p) => p.epistemic_type === "J");
  return jProps.map<TemplateInstance>((p) => {
    const ref = p.intake_ledger_refs?.[0];
    const ent = ref ? plan.intake_ledger.find((l) => l.ledger_id === ref) : undefined;
    return {
      template_id: "T.risk.documentation.gap",
      ctx: {
        doc_element_label: ent?.display || p.conclusion_id,
        customer_question: `Please confirm or provide additional detail regarding ${ent?.display || p.conclusion_id}.`,
      },
    };
  });
}

function composeExceptionAnalysis(plan: RenderPlan): TemplateInstance[] {
  return plan.propositions
    .filter((p) => p.epistemic_type === "R" && /exception/i.test(p.conclusion_id))
    .map<TemplateInstance>((p) => {
      const ref = p.intake_ledger_refs?.[0];
      const ent = ref ? plan.intake_ledger.find((l) => l.ledger_id === ref) : undefined;
      const templateId = (p as { polarity?: string }).polarity === "positive"
        ? "T.risk.documentation.present"
        : "T.risk.documentation.gap";
      return {
        template_id: templateId,
        ctx: {
          doc_element_label: ent?.display || p.conclusion_id,
          customer_question: `Please describe the basis for the exception recorded for ${ent?.display || p.conclusion_id}.`,
        },
      };
    });
}

function composeScope(plan: RenderPlan): TemplateInstance[] {
  return plan.propositions
    .filter((p) => p.epistemic_type === "R" && /appl(icab|y)/i.test(p.conclusion_id))
    .map<TemplateInstance>((p) => {
      const engaged = (p as { polarity?: string }).polarity === "positive";
      const templateId = engaged ? "T.risk.applicability.engaged" : "T.risk.applicability.not_engaged";
      return { template_id: templateId, ctx: {} };
    });
}

// ── Public dispatch ──────────────────────────────────────────────────────

export function composeSection(sectionKey: string, plan: RenderPlan): TemplateInstance[] | null {
  switch (sectionKey) {
    case "executive_summary":            return composeExecutive(plan);
    case "priority_actions":             return composePriorityActions(plan);
    case "next_steps":                   return composeNextSteps(plan);
    case "strengthen_items":             return composeStrengthenItems(plan);
    case "record_sufficiency":           return composeRecordSufficiency(plan);
    case "information_needed":           return composeInformationNeeded(plan);
    case "exception_analysis":           return composeExceptionAnalysis(plan);
    case "scope_confirmation":           return composeScope(plan);
    case "scope_and_triggers":           return composeScope(plan);
    case "assessment_summary":           return composeAssessmentSummary(plan);
    case "risk_assessment_by_activity":  return composeRiskByActivity(plan);
    default:
      return null; // caller falls back to legacy single-render behavior.
  }
}
