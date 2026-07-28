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
import type { RenderPlan, FactorTableEntry, Proposition, StatutoryAnchor, GateRuleOutcome } from "../../render-plan/schema.ts";
import type { SlotContext } from "../slot-resolver.ts";
import { FIRM_VARIANT_CLOSENESS_MAX, RECORD_STATUS_CLAUSES, SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES, SUMMARY_EACH_OR_THIS_CLAUSES, BALANCE_DIRECTION_CLAUSES } from "../content/pass2-templates.ts";
import { computeCloseness, chooseVariant } from "../closeness.ts";
import { CPPA_RISK_CONCLUSIONS, CPPA_RISK_CONCLUSION_INDEX, type ConclusionSpec } from "../../legal-test/cppa-risk-conclusions.ts";
import { selectDeadlineOrFallback } from "../../legal-test/cppa-risk-deadlines.ts";
import { CPPA_RISK_GATE_INDEX } from "../../gates/cppa-risk-gates.ts";

export const SECTION_COMPOSERS_VERSION = "ltp-section-composers-cppa-risk-2026-07-28-item242-cpb-final";

/**
 * ITEM 242 CP-B FINAL — CEO-ratified per-KIND opener stems.
 * Consumed as `element_short_label` PREFIX in T.risk.priority_action.golden
 * per courier §2.1. Bold header becomes `${STEM} ${label}`. Rest of the
 * golden template (customer_recorded_fact_clause, gap_or_consequence,
 * compliance_guidance, deadline_sentence, owner) continues to render.
 */
export type ActionKind =
  | "benefit_absent"
  | "harm_absent"
  | "safeguard_absent"
  | "gate_unresolved"
  | "type_j_reserved"
  | "conditional";

export const KIND_OPENERS: Readonly<Record<ActionKind, string>> = {
  benefit_absent: "Additional information would be needed to substantiate the stated benefit of",
  harm_absent: "Additional information would be needed to address the potential negative impact category",
  safeguard_absent: "Additional information would be needed to document the safeguard",
  gate_unresolved: "Additional information would be needed for",
  type_j_reserved: "Qualified counsel should be consulted for further consideration of",
  conditional: "Additional information would be necessary to substantiate",
};

export const FAMILY_THRESHOLDS: Readonly<Record<"harm" | "safeguard" | "benefit", number>> = {
  harm: 2,
  safeguard: 2,
  benefit: 3,
};

export { aggregateBalance, DOCUMENTATION_FACTUAL_GATE_IDS, DOCUMENTATION_JUDGMENT_GATE_IDS };
// ITEM 242 batch-3 A — expose the two composers under test for the
// deterministic-fix asserts (defects 3, 4, 6, 7).
export { composePriorityActions as composePriorityActionsForTest };
export { composeRecordSufficiency as composeRecordSufficiencyForTest };
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

// ── ITEM 241.3 — Gap-driven four-move action composer ────────────────────
//
// Sources, in order (Golden Shape §2):
//   (1) absent mandatory factors, (2) safeguard gaps, (3) Type-J
//   reserved judgments, (4) unresolved factual documentation gates,
//   (5) conditional obligations, (6) present-but-thin factors as
//   "strengthen" actions. Each emission uses the four-move template
//   T.risk.priority_action.golden and consumes exactly one deadline row
//   via selectDeadlineOrFallback (ONE-DEADLINE-PER-ACTION LAW).

function pickIntakeDisplay(plan: RenderPlan, field: string): string {
  const row = plan.intake_ledger.find((r) => r.intake_field === field);
  return (row?.display ?? "").trim();
}

function entityName(plan: RenderPlan): string {
  return pickIntakeDisplay(plan, "entity_name")
    || pickIntakeDisplay(plan, "company_name")
    || "the business";
}

/**
 * ITEM 243 defect 6 — PER-KIND OWNER RESOLUTION from i7/i8.
 *
 * Reads role-title fields ONLY (PII law holds — never names, phones, emails).
 * Per-KIND defaults when the intake yields no matching role title:
 *   • Type-J reserved judgment → "qualified legal counsel"
 *   • Unresolved documentation gate → certifying executive role title
 *     (i8_certifying_exec_title), else "the certifying executive"
 *   • Factor gaps (benefit/harm/safeguard/family/conditional) →
 *     best-matching internal contributor role title (i7_internal_contributors),
 *     else the certifying executive title, else the accountable-owner clause
 *
 * The prior implementation returned the raw i7_internal_contributors
 * string for every kind, which (a) leaked personnel names captured in
 * that narrative field into every action row and (b) attached the
 * wrong owner to Type-J and to certifying-executive gates.
 */
function certifyingExecTitle(plan: RenderPlan): string {
  return pickIntakeDisplay(plan, "i8_certifying_exec_title") || "the certifying executive";
}

function contributorRoleTitles(plan: RenderPlan): string {
  const raw = pickIntakeDisplay(plan, "i7_internal_contributors");
  if (!raw) return "";
  // Role-titles-only guard: drop tokens that look like names / contact
  // handles (defect 6 PII invariant). Retain segments that read as role
  // titles (contain job-title-ish tokens or are short comma-separated
  // items). This is a mechanical filter — nothing legal-substantive.
  const segments = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  const roleLike = segments.filter((s) =>
    /officer|counsel|manager|director|lead|analyst|engineer|admin|privacy|security|compliance|dpo|cpo|ciso|cfo|cto|ceo|coo|specialist|architect|owner/i.test(s)
    && !/@|\+?\d{7,}/.test(s),
  );
  return roleLike.length > 0 ? roleLike.join(", ") : "";
}

function ownerForKind(kind: ActionKind, plan: RenderPlan): string {
  if (kind === "type_j_reserved") return "qualified legal counsel";
  if (kind === "gate_unresolved") return certifyingExecTitle(plan);
  // benefit_absent / harm_absent / safeguard_absent / conditional →
  // contributors first, then certifying exec, then accountable-owner fallback.
  return contributorRoleTitles(plan)
    || certifyingExecTitle(plan)
    || "the accountable business owner named on the assessment record";
}


/**
 * ITEM 242 (defect 4) — GAP-APPLICABILITY LAW. An action for an
 * absent factor / gate is emitted ONLY when the governing applicability
 * gate is `pass` or `not_applicable` (i.e., not `block`). ADMT-scoped
 * items with q18_admt_use negative resolve to `block` on
 * G.q18.admt_consequence — those actions are suppressed here and
 * instead surface in record_sufficiency as "not applicable".
 */
function isAdmtScoped(id: string | undefined): boolean {
  return !!id && /admt|automated_decision|profiling/i.test(id);
}

function admtGateBlocked(plan: RenderPlan): boolean {
  const g = plan.gate_outcomes.find((o) => o.gate_id === "G.q18.admt_consequence");
  return g?.outcome === "block";
}

function factorAdmtApplicable(f: FactorTableEntry, plan: RenderPlan): boolean {
  if (!isAdmtScoped(f.factor_id)) return true;
  return !admtGateBlocked(plan);
}

function propAdmtApplicable(p: Proposition, plan: RenderPlan): boolean {
  if (!isAdmtScoped(p.conclusion_id)) return true;
  return !admtGateBlocked(plan);
}

/**
 * ITEM 242 (defect 7b) — cohort-aware deadline resolver. Documentation
 * gates and factor gaps read the § 7155 cohort marker off the intake
 * (processing_start_date / cohort_effective_date proxies) instead of
 * defaulting every non-ADMT action to `d.ongoing_processing`.
 */
function cohortIsProspective(plan: RenderPlan): boolean {
  const start = pickIntakeDisplay(plan, "processing_start_date");
  const cohort = pickIntakeDisplay(plan, "cohort_effective_date");
  // If the record explicitly names a prospective start date after the
  // operative period, prospective wins; otherwise the record is treated
  // as pre-existing processing (§ 7155(b) applies).
  return /^prospective\b/i.test(start) || /^prospective\b/i.test(cohort);
}

function deadlineForAction(conclusionId: string | undefined, isDocumentationGate: boolean, plan: RenderPlan): string {
  const prospective = cohortIsProspective(plan);
  if (conclusionId && /admt/i.test(conclusionId)) {
    return prospective ? "d.admt_pre_use_notice.prospective" : "d.admt_pre_use_notice.existing";
  }
  if (isDocumentationGate) {
    return prospective ? "d.assessment_record.prospective" : "d.assessment_record.pre_existing";
  }
  // Factor-table gaps (safeguard / negative-impact documentation) are
  // assessment-record items under § 7155 — NOT ongoing-processing.
  return prospective ? "d.assessment_record.prospective" : "d.assessment_record.pre_existing";
}

interface ActionSource {
  readonly kind: ActionKind;
  readonly conclusion_id?: string;
  readonly factor_id?: string;
  readonly element_short_label: string;
  readonly pinpoint: string;
  readonly customer_recorded_fact_clause: string;
  readonly gap_or_consequence_clause: string;
  readonly compliance_guidance_sentence: string;
  readonly is_documentation_gate: boolean;
}

/** Lowercase the first character (used to fold CEO opener into label prefix). */
function lcFirst(s: string): string {
  return s.length === 0 ? s : s[0].toLowerCase() + s.slice(1);
}

/**
 * Family grouping (CEO courier §2.2). Consolidate ≥2 absent harms,
 * ≥2 absent safeguards, ≥3 absent benefits into single family actions
 * with a bulleted sub-list, reducing 14-clone action sets to ~11 diverse.
 */
function groupFamilies(sources: ActionSource[]): ActionSource[] {
  const groups: Record<"harm" | "safeguard" | "benefit", ActionSource[]> = {
    harm: [], safeguard: [], benefit: [],
  };
  const other: ActionSource[] = [];
  for (const s of sources) {
    if (s.kind === "harm_absent" && s.factor_id?.startsWith("neg.")) groups.harm.push(s);
    else if (s.kind === "safeguard_absent" && s.factor_id?.startsWith("safe.")) groups.safeguard.push(s);
    else if (s.kind === "benefit_absent" && s.factor_id?.startsWith("benefit.")) groups.benefit.push(s);
    else other.push(s);
  }
  const out: ActionSource[] = [...other];
  const FAMILY_META: Record<"harm" | "safeguard" | "benefit", { pinpoint: string; opener_family: string; guidance: string }> = {
    harm: {
      pinpoint: "11 CCR § 7152(a)(5)",
      opener_family: "the following potential negative impact categories",
      guidance: "Document each of the listed § 7152(a)(5) negative-impact categories on the assessment record with the specificity the subsection requires.",
    },
    safeguard: {
      pinpoint: "11 CCR § 7152(a)(6)",
      opener_family: "the following safeguards",
      guidance: "Document each of the listed § 7152(a)(6) safeguards on the assessment record with the specificity the subsection requires.",
    },
    benefit: {
      pinpoint: "11 CCR § 7152(a)(4)",
      opener_family: "the following stated benefits",
      guidance: "Document each of the listed § 7152(a)(4) benefits on the assessment record with the specificity the subsection requires.",
    },
  };
  (["harm", "safeguard", "benefit"] as const).forEach((fam) => {
    const rows = groups[fam];
    if (rows.length >= FAMILY_THRESHOLDS[fam]) {
      const meta = FAMILY_META[fam];
      const bullets = rows.map((r) => `• ${r.element_short_label.replace(/^[A-Z]/, (c) => c)}`).join("\n");
      out.push({
        kind: rows[0].kind,
        factor_id: `family.${fam}`,
        element_short_label: `${meta.opener_family}:\n${bullets}`,
        pinpoint: meta.pinpoint,
        customer_recorded_fact_clause: `none of the listed items above are on ${entityPlaceholder()}'s record`,
        gap_or_consequence_clause: `${meta.pinpoint} requires each of these elements to be documented for the assessment record to be complete`,
        compliance_guidance_sentence: meta.guidance,
        is_documentation_gate: false,
      });
    } else {
      out.push(...rows);
    }
  });
  return out;
}

// Sentinel used only inside groupFamilies (composer substitutes entityName at emit).
function entityPlaceholder(): string { return "the business"; }

function composePriorityActions(plan: RenderPlan): TemplateInstance[] {
  const entity = entityName(plan);
  const owner = ownerRoleTitles(plan);
  const rawSources: ActionSource[] = [];

  // (1)+(2) factor-table gaps — filtered by gap-applicability law.
  for (const f of plan.factor_table) {
    const isGap = !f.present_in_intake || /gap|absent|missing/i.test(f.factor_id);
    if (!isGap) continue;
    if (!factorAdmtApplicable(f, plan)) continue; // defect 4
    const label = factorLabel(f) || "this factor";
    // Map factor kind → ActionKind.
    const kind: ActionKind =
      f.kind === "benefit" ? "benefit_absent"
      : f.kind === "negative_impact" ? "harm_absent"
      : f.kind === "safeguard" ? "safeguard_absent"
      : "gate_unresolved";
    rawSources.push({
      kind,
      factor_id: f.factor_id,
      element_short_label: label,
      pinpoint: f.anchor.pinpoint,
      customer_recorded_fact_clause: f.present_in_intake
        ? `the record shows ${lcFirst(label)} but the supporting detail is thin`
        : `${lcFirst(label)} is not present on ${entity}'s record`,
      gap_or_consequence_clause: `the § 7152(a) record cannot be relied upon for ${lcFirst(label)} without further documentation`,
      compliance_guidance_sentence: `Document ${lcFirst(label)} in the assessment record with the specificity ${f.anchor.pinpoint} requires.`,
      is_documentation_gate: false,
    });
  }

  // (3) Type-J reserved judgments — filtered by gap-applicability law.
  for (const p of plan.propositions) {
    if (p.epistemic_type !== "J") continue;
    if (!propAdmtApplicable(p, plan)) continue; // defect 4
    const spec: ConclusionSpec | undefined = CPPA_RISK_CONCLUSION_INDEX[p.conclusion_id];
    const label = propLabel(p) || conclusionLabel(p.conclusion_id) || "this reserved judgment";
    const reservedTo = spec?.reserved_to === "legal_counsel"
      ? "qualified legal counsel"
      : spec?.reserved_to === "external_auditor"
        ? "the external auditor"
        : "the accountable business owner";
    rawSources.push({
      kind: "type_j_reserved",
      conclusion_id: p.conclusion_id,
      element_short_label: label,
      pinpoint: p.anchor.pinpoint,
      customer_recorded_fact_clause: `the record reserves ${lcFirst(label)} to ${reservedTo}`,
      gap_or_consequence_clause: `the reserved judgment must be exercised and recorded before the assessment closes`,
      compliance_guidance_sentence: spec?.compliance_guidance
        ?? `Record ${reservedTo}'s decision on ${lcFirst(label)} in the assessment file per ${p.anchor.pinpoint}.`,
      is_documentation_gate: false,
    });
  }

  // (4) Unresolved FACTUAL documentation gates.
  const gateLabel = (id: string): string => {
    const tail = id.replace(/^G\.documentation\./, "").replace(/_/g, " ");
    const noun = tail.replace(/\s+present$/i, "").trim();
    return `assessment record — ${noun}`;
  };
  for (const g of plan.gate_outcomes) {
    if (!DOCUMENTATION_FACTUAL_GATE_IDS.has(g.gate_id)) continue;
    if (g.outcome === "pass") continue;
    const spec = CPPA_RISK_GATE_INDEX[g.gate_id];
    const pin = spec?.anchor_pinpoint ?? "11 CCR § 7152(a)";
    const label = gateLabel(g.gate_id);
    rawSources.push({
      kind: "gate_unresolved",
      element_short_label: label,
      pinpoint: pin,
      customer_recorded_fact_clause: `${lcFirst(label)} is not on ${entity}'s record`,
      gap_or_consequence_clause: `${pin} requires this element for the assessment record to be complete`,
      compliance_guidance_sentence: `Complete the ${pin} record for ${lcFirst(label)} before the assessment closes.`,
      is_documentation_gate: true,
    });
  }

  // Family grouping (CEO §2.2). Non-family kinds pass through untouched.
  const sources = groupFamilies(rawSources);

  return sources.map<TemplateInstance>((s) => {
    const sel = selectDeadlineOrFallback(deadlineForAction(s.conclusion_id, s.is_documentation_gate, plan));
    // KIND opener stem prepended to element_short_label per courier §2.1.
    // For family-grouped rows the label already carries the family opener
    // ("the following …:"); prepend the KIND stem to complete the sentence.
    const stem = KIND_OPENERS[s.kind];
    const prefixedLabel = s.factor_id?.startsWith("family.")
      ? `${stem} ${s.element_short_label}`
      : `${stem} ${lcFirst(s.element_short_label)}`;
    // Family customer_recorded_fact_clause carries the "the business" sentinel — replace here.
    const factClause = s.customer_recorded_fact_clause.replace(/the business's record/g, `${entity}'s record`);
    return {
      template_id: "T.risk.priority_action.golden",
      ctx: {
        element_short_label: prefixedLabel,
        entity_name: entity,
        customer_recorded_fact_clause: factClause,
        gap_or_consequence_clause: s.gap_or_consequence_clause,
        compliance_guidance_sentence: s.compliance_guidance_sentence,
        deadline_sentence: sel.row.deadline_sentence,
        owner_role_titles: owner,
        __cite: { PINPOINT: s.pinpoint },
      },
    };
  });
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
  // ITEM 241.3 — GOLDEN prose lead-in FIRST (courier §4.3).
  const entity = entityName(plan);
  const factual = plan.factor_table.filter((f) => f.present_in_intake).map(factorLabel).filter(Boolean);
  const jProps = plan.propositions.filter((p) => p.epistemic_type === "J");
  const jLabels = jProps.map(propLabel).filter(Boolean);
  const jPinpoints = Array.from(new Set(jProps.map((p) => p.anchor.pinpoint)));
  const sufficient = !insufficientRecord(plan);
  const asOf = pickIntakeDisplay(plan, "assessment_date") || new Date().toISOString().slice(0, 10);
  const prose: TemplateInstance = {
    template_id: "T.risk.record_sufficiency.prose",
    ctx: {
      // ITEM 242 (defect 6) — opener + closer derived from the SAME
      // `sufficient` boolean via distinct grammatically-fitted clauses.
      // Contradiction between opener and closer is structurally
      // impossible; e2e assert enforces it.
      sufficiency_clause: sufficient
        ? "sufficient for the § 7152(a)(6) balancing frame to weigh"
        : "not yet sufficient for the § 7152(a)(6) balancing frame — see enumerated deficiencies below",
      sufficiency_closer_clause: sufficient
        ? "is sufficient for the § 7152(a)(6) balancing frame to weigh"
        : "remains not yet sufficient for the § 7152(a)(6) balancing frame — see enumerated deficiencies above",
      entity_name: entity,
      factual_elements_summary_clause: factual.length > 0 ? joinList(factual) : "the factual elements captured on the record",
      reserved_judgments_list: jLabels.length > 0 ? joinList(jLabels) : "no reserved judgments",
      type_j_pinpoints: jPinpoints.length > 0 ? joinList(jPinpoints) : "the applicable § 7152(a) subdivisions",
      as_of_date: asOf,
    },
  };
  const items = plan.factor_table.map<TemplateInstance>((f) => ({
    template_id: "T.risk.record_sufficiency.item",
    ctx: {
      element_label: factorLabel(f),
      element_status_clause: f.present_in_intake
        ? RECORD_STATUS_CLAUSES[0]
        : RECORD_STATUS_CLAUSES[1],
      __cite: { PINPOINT: f.anchor.pinpoint },
    },
  }));
  return [prose, ...items];
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
  instances.sort((a, b) => (a.__engaged === b.__engaged) ? 0 : (a.__engaged ? -1 : 1));
  const prongList = instances
    .map(({ ctx, __engaged }) => `${(ctx.prong_subject ?? "").toString()} (${(ctx.__cite?.PINPOINT ?? "")}) — ${__engaged ? "engaged" : "not engaged"}`)
    .join("; ");
  // ITEM 241.3 — CP5 §3.2 customer-first opener prepended.
  const opener: TemplateInstance = {
    template_id: "T.risk.section_opener.scope",
    ctx: {
      entity_name: entityName(plan),
      q4_pi_categories: pickIntakeDisplay(plan, "q4_pi_categories") || "personal information",
      i1_processing_purpose: pickIntakeDisplay(plan, "i1_processing_purpose") || "its stated business purposes",
      prong_list_with_individual_pinpoints: prongList || "the § 7150(b) triggers enumerated below",
    },
  };
  return [opener, ...instances.map(({ template_id, ctx }) => ({ template_id, ctx }))];
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
