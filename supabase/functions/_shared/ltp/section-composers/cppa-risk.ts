/**
 * LTP Section Composers — cppa-risk (ITEM 240 CP4 — LABELS + PER-INSTANCE CITATIONS).
 *
 * CP4 fixes (2026-07-28):
 *   (a) DISPLAY-LABEL LAYER: every customer-facing label resolves via the
 *       registry's display_label (ConclusionSpec.display_label / FactorRow.label),
 *       never via humanize(id). Registry-id shapes are structurally
 *       unshippable — enforced downstream by value-screen's REGISTRY_ID_PATTERNS.
 *   (b) PER-PROPOSITION CITATION BINDING: every template instance carries
 *       ctx.__cite pinpoints from ITS OWN anchor (proposition/factor/gate).
 *       Scope & Triggers renders one instance PER § 7150(b) prong with the
 *       correct engaged/not-engaged from gate outcomes and each with its
 *       own pinpoint. Ends the global-first-binding fallback class.
 *   (c) EXEC/BALANCE COHERENCE: composeExecutive consumes the same
 *       aggregateBalance(plan) mode that balanceInstance uses.
 */
import type { RenderPlan, FactorTableEntry, Proposition, StatutoryAnchor } from "../../render-plan/schema.ts";
import type { SlotContext } from "../slot-resolver.ts";
import { FIRM_VARIANT_CLOSENESS_MAX, RECORD_STATUS_CLAUSES, SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES, SUMMARY_EACH_OR_THIS_CLAUSES, BALANCE_DIRECTION_CLAUSES } from "../content/pass2-templates.ts";
import { computeCloseness, chooseVariant } from "../closeness.ts";
import { CPPA_RISK_CONCLUSIONS, CPPA_RISK_CONCLUSION_INDEX, type ConclusionSpec } from "../../legal-test/cppa-risk-conclusions.ts";
import { selectDeadlineOrFallback } from "../../legal-test/cppa-risk-deadlines.ts";

export const SECTION_COMPOSERS_VERSION = "ltp-section-composers-cppa-risk-2026-07-28-item241-3-wiring";

export { aggregateBalance, DOCUMENTATION_FACTUAL_GATE_IDS, DOCUMENTATION_JUDGMENT_GATE_IDS };
export type { BalanceMode };

/**
 * ITEM 241.3 CONDITION 5 (Type-J engineering rider) — DOCUMENTATION GATE
 * PARTITION. Factual gates count against record sufficiency; judgment
 * gates are reserved decisions (never record gaps). `insufficientRecord`
 * and `aggregateBalance` restrict to the factual subset only, per the
 * courier's Engineering Rider and the CEO's binding CONDITION 5.
 *
 * The judgment subset is enumerated for future protection: today
 * cppa-risk-gates.ts declares only factual documentation gates, but any
 * future j.* documentation gate MUST land in the judgment set so the
 * predicate cannot regress.
 */
const DOCUMENTATION_FACTUAL_GATE_IDS: ReadonlySet<string> = new Set([
  "G.documentation.purpose_present",
  "G.documentation.categories_present",
  "G.documentation.operational_elements_present",
  "G.documentation.approver_present",
]);

const DOCUMENTATION_JUDGMENT_GATE_IDS: ReadonlySet<string> = new Set([
  "G.documentation.initiation_decision",
  "G.documentation.purpose_specificity",
  "G.documentation.safeguard_sufficiency",
]);


export interface TemplateInstance {
  readonly template_id: string;
  readonly ctx: SlotContext;
}

// ── Registry-backed label + anchor lookups ───────────────────────────────

const BALANCE_ANCHOR: StatutoryAnchor =
  CPPA_RISK_CONCLUSION_INDEX["w.balance.risks_vs_benefits"]?.anchor
  ?? { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)" };

const DOC_APPROVER_ANCHOR: StatutoryAnchor =
  CPPA_RISK_CONCLUSION_INDEX["r.documentation.approver_present"]?.anchor
  ?? { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(9)" };

function conclusionAnchor(conclusionId: string): StatutoryAnchor | undefined {
  return CPPA_RISK_CONCLUSION_INDEX[conclusionId]?.anchor;
}

function conclusionLabel(conclusionId: string): string {
  return CPPA_RISK_CONCLUSION_INDEX[conclusionId]?.display_label ?? "";
}

function propLabel(p: Proposition): string {
  return p.display_label ?? conclusionLabel(p.conclusion_id) ?? "";
}

function factorLabel(f: FactorTableEntry): string {
  return f.display_label ?? "";
}

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

const engagedApplicability = (plan: RenderPlan): Proposition[] =>
  plan.propositions.filter(
    (p) => p.epistemic_type === "R" && (p as { polarity?: string }).polarity === "positive"
      && /appl(icab|y)/i.test(p.conclusion_id),
  );

const activityCount = (plan: RenderPlan): number => engagedApplicability(plan).length;

/**
 * ITEM 241.3 CONDITION 5 — insufficiency derives from the FACTUAL
 * documentation-gate subset only. Judgment-subset gates are reserved
 * decisions and cannot cause an insufficient exec on a docs-complete
 * record. See DOCUMENTATION_FACTUAL_GATE_IDS / DOCUMENTATION_JUDGMENT_GATE_IDS.
 */
const insufficientRecord = (plan: RenderPlan): boolean =>
  plan.gate_outcomes.some(
    (g) => DOCUMENTATION_FACTUAL_GATE_IDS.has(g.gate_id) && g.outcome !== "pass",
  );

const anyImpactsOutweigh = (plan: RenderPlan): boolean => {
  const benefits = plan.factor_table.filter((f) => f.kind === "benefit" && f.present_in_intake).length;
  const negatives = plan.factor_table.filter((f) => f.kind === "negative_impact" && f.present_in_intake).length;
  return negatives > 0 && negatives > benefits;
};

type BalanceMode = "insufficient" | "negative" | "hedged" | "firm";
function aggregateBalance(plan: RenderPlan): BalanceMode {
  if (insufficientRecord(plan)) return "insufficient";
  if (anyImpactsOutweigh(plan)) return "negative";
  const closeness = computeCloseness(plan, plan.weighing_frame);
  return chooseVariant(closeness) === "hedged" ? "hedged" : "firm";
}


// ── Composers ────────────────────────────────────────────────────────────

function composeExecutive(plan: RenderPlan): TemplateInstance[] {
  const n = activityCount(plan);
  const each = n === 1 ? SUMMARY_EACH_OR_THIS_CLAUSES[0] : SUMMARY_EACH_OR_THIS_CLAUSES[1];
  const singplural = n === 1 ? SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES[0] : SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES[1];
  const acp = pluralActivityPhrase(n);
  const engagedLabels = engagedApplicability(plan).map(propLabel);
  const mode = aggregateBalance(plan);
  if (mode === "insufficient" || engagedLabels.length === 0) {
    return [{ template_id: "T.risk.exec.insufficient", ctx: { activity_singplural_clause: singplural } }];
  }
  const engagedList = joinList(engagedLabels);
  if (mode === "negative") {
    return [{
      template_id: "T.risk.exec.negative",
      ctx: {
        activity_count_phrase: acp,
        negative_list: engagedList,
        remaining_outcomes_clause: "",
      },
    }];
  }
  if (mode === "hedged") {
    const tipping = plan.weighing_frame
      .slice()
      .sort((a, b) => (b.closeness_contribution ?? 0) - (a.closeness_contribution ?? 0))
      .slice(0, 3)
      .map((f) => f.anchor_hint || f.pinpoint);
    return [{
      template_id: "T.risk.exec.hedged",
      ctx: {
        activity_count_phrase: acp,
        close_list: engagedList,
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

function balanceInstance(plan: RenderPlan): TemplateInstance {
  const mode = aggregateBalance(plan);
  const benefits = plan.factor_table.filter((f) => f.kind === "benefit" && f.present_in_intake);
  const negatives = plan.factor_table.filter((f) => f.kind === "negative_impact" && f.present_in_intake);
  const safeguards = plan.factor_table.filter((f) => f.kind === "safeguard" && f.present_in_intake);
  const benefit_summary_tokens = joinList(benefits.map(factorLabel)) || "the benefits documented on the record";
  const negative_summary_tokens = joinList(negatives.map(factorLabel)) || "the potential negative impacts documented on the record";
  const safeguard_summary_tokens = joinList(safeguards.map(factorLabel)) || "the safeguards documented on the record";
  const tipping = plan.weighing_frame
    .slice()
    .sort((a, b) => (b.closeness_contribution ?? 0) - (a.closeness_contribution ?? 0))
    .slice(0, 3)
    .map((f) => f.anchor_hint || f.pinpoint);
  const tipping_factors = joinList(tipping) || "the balance of benefits, negative impacts, and safeguards on the record";
  const baseCite = { PINPOINT_7152A5: BALANCE_ANCHOR.pinpoint, PINPOINT_7152A: BALANCE_ANCHOR.pinpoint, PINPOINT_7152: BALANCE_ANCHOR.pinpoint };
  // CP5 (b) — coherence: `insufficient` mode routes to the docs template so
  // aggregateBalance("insufficient") NEVER produces firm/hedged balance prose.
  if (mode === "insufficient") {
    return {
      template_id: "T.risk.summary.docs",
      ctx: {
        docs_completion_clause: "has outstanding documentation items — see Items for your review; the record does not yet complete",
        __cite: { PINPOINT_7152A: BALANCE_ANCHOR.pinpoint },
      },
    };
  }
  if (mode === "hedged") {
    return {
      template_id: "T.risk.balance.hedged",
      ctx: {
        benefit_summary_tokens,
        negative_summary_tokens,
        tipping_factors,
        what_would_tip_it: tipping_factors,
        __cite: baseCite,
      },
    };
  }
  const direction = mode === "negative"
    ? BALANCE_DIRECTION_CLAUSES[1]
    : BALANCE_DIRECTION_CLAUSES[0];
  return {
    template_id: "T.risk.balance.firm",
    ctx: {
      benefit_summary_tokens,
      negative_summary_tokens,
      safeguard_summary_tokens,
      balance_direction_clause: direction,
      __cite: baseCite,
    },
  };
}

function composeAssessmentSummary(plan: RenderPlan): TemplateInstance[] {
  if (insufficientRecord(plan)) {
    return [{
      template_id: "T.risk.summary.docs",
      ctx: {
        docs_completion_clause: "has outstanding documentation items — see Items for your review; the record does not yet complete",
        __cite: { PINPOINT_7152A: BALANCE_ANCHOR.pinpoint },
      },
    }];
  }
  return [
    balanceInstance(plan),
    {
      template_id: "T.risk.summary.docs",
      ctx: {
        docs_completion_clause: "is complete against",
        __cite: { PINPOINT_7152A: BALANCE_ANCHOR.pinpoint },
      },
    },
  ];
}

function composeRiskByActivity(plan: RenderPlan): TemplateInstance[] {
  const engaged = engagedApplicability(plan);
  if (engaged.length === 0) {
    if (!insufficientRecord(plan)) return [balanceInstance(plan)];
    return [];
  }
  return engaged.map<TemplateInstance>((p) => {
    const inst = balanceInstance(plan);
    return {
      template_id: inst.template_id,
      ctx: { ...inst.ctx, activity_label: propLabel(p) },
    };
  });
}

function composePriorityActions(plan: RenderPlan): TemplateInstance[] {
  const rows = plan.factor_table.filter((f) =>
    f.present_in_intake && (f.kind === "negative_impact" || /gap|remediat|action/i.test(f.factor_id))
  );
  return rows.map<TemplateInstance>((f) => ({
    template_id: "T.risk.priority_action",
    ctx: {
      action_label: `Address ${factorLabel(f)}`,
      action_basis: `The record identifies this factor as bearing on the balancing analysis and warranting a documented response.`,
      deadline_basis: "Complete before the next annual review or before the next material change to the processing activity",
      // CP4 (b) — deadline pinpoint = this factor's own anchor.
      __cite: { PINPOINT_DEADLINE: f.anchor.pinpoint },
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
      __cite: { PINPOINT: f.anchor.pinpoint },
    },
  }));
}

function composeRecordSufficiency(plan: RenderPlan): TemplateInstance[] {
  // CP4 (b) — each record item cites its own factor anchor pinpoint.
  return plan.factor_table.map<TemplateInstance>((f) => ({
    template_id: "T.risk.record_sufficiency.item",
    ctx: {
      element_label: factorLabel(f),
      element_status_clause: f.present_in_intake
        ? RECORD_STATUS_CLAUSES[0]
        : RECORD_STATUS_CLAUSES[1],
      __cite: { PINPOINT: f.anchor.pinpoint },
    },
  }));
}

function composeInformationNeeded(plan: RenderPlan): TemplateInstance[] {
  // CP4 (a)+(b) — Type J review items resolve display_label + own anchor.
  const jProps = plan.propositions.filter((p) => p.epistemic_type === "J");
  return jProps.map<TemplateInstance>((p) => {
    const label = propLabel(p) || conclusionLabel(p.conclusion_id) || "this reserved judgment";
    const anchor = conclusionAnchor(p.conclusion_id) ?? DOC_APPROVER_ANCHOR;
    return {
      template_id: "T.risk.documentation.gap",
      ctx: {
        doc_element_label: label,
        customer_question: `Please confirm or provide additional detail regarding ${label}.`,
        __cite: { PINPOINT: anchor.pinpoint },
      },
    };
  });
}

function composeExceptionAnalysis(plan: RenderPlan): TemplateInstance[] {
  return plan.propositions
    .filter((p) => p.epistemic_type === "R" && /exception/i.test(p.conclusion_id))
    .map<TemplateInstance>((p) => {
      const label = propLabel(p) || "this exception";
      const templateId = (p as { polarity?: string }).polarity === "positive"
        ? "T.risk.documentation.present"
        : "T.risk.documentation.gap";
      return {
        template_id: templateId,
        ctx: {
          doc_element_label: label,
          customer_question: `Please describe the basis for the exception recorded for ${label}.`,
          __cite: { PINPOINT: p.anchor.pinpoint },
        },
      };
    });
}

/**
 * CP4 (b) — SCOPE & TRIGGERS. One instance PER § 7150(b) prong. Each
 * instance carries its OWN anchor pinpoint and its OWN engaged/not-engaged
 * flag from the plan's gate outcomes (falling back to the proposition
 * polarity). Ends the run-#175 "5× identical § 7150(b)(1)" class.
 */
function composeScope(plan: RenderPlan): TemplateInstance[] {
  const applicabilityConcls = CPPA_RISK_CONCLUSIONS.filter(
    (c) => c.epistemic_type === "R" && /appl(icab|y)/i.test(c.id),
  );
  const gateById = new Map(plan.gate_outcomes.map((g) => [g.gate_id, g]));
  const propById = new Map(
    plan.propositions
      .filter((p) => /appl(icab|y)/i.test(p.conclusion_id))
      .map((p) => [p.conclusion_id, p]),
  );
  const instances = applicabilityConcls.map<TemplateInstance & { __engaged: boolean }>((c) => {
    const gate = c.rule_gate ? gateById.get(c.rule_gate) : undefined;
    const prop = propById.get(c.id);
    const engagedFromGate = gate?.outcome === "pass";
    const engagedFromProp = (prop as { polarity?: string } | undefined)?.polarity === "positive";
    const engaged = engagedFromGate || engagedFromProp;
    const templateId = engaged ? "T.risk.applicability.engaged" : "T.risk.applicability.not_engaged";
    // CP5 (a) — per-prong subject from the registry display_label.
    // CP4 (b) — per-prong pinpoint from THIS conclusion's anchor.
    return {
      template_id: templateId,
      ctx: {
        prong_subject: c.display_label || "this trigger",
        __cite: { PINPOINT: c.anchor.pinpoint },
      },
      __engaged: engaged,
    };
  });
  // ITEM 241.1 (E1) — engaged prongs LEAD; not-engaged prongs follow.
  // Stable sort so registry order is preserved within each bucket.
  instances.sort((a, b) => (a.__engaged === b.__engaged) ? 0 : (a.__engaged ? -1 : 1));
  return instances.map(({ template_id, ctx }) => ({ template_id, ctx }));
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
      return null;
  }
}
