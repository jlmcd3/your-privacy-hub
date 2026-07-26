/**
 * LTP assessment_summary composer — CONTENT COURIER 2026-07-26.
 *
 * Deterministically populates the 10 verified structured keys of
 * report_data.assessment_summary AND composes the additive `narrative`
 * string from the Pass-2 summary templates. Pure; never throws.
 *
 * Live-verified keys (query_database, latest doc): sector, company_name,
 * assessment_date, exceptions_status, exceptions_claimed, overall_risk_level,
 * triggered_activities, corpus_enforcement_note, admt_disclosure_required,
 * cybersecurity_audit_required.
 *
 * KNOWN CONTENT HELD (item 147 — carried in narrative telemetry, not in
 * customer surface): overall_risk_level tier mapping. The codebase enum is
 * 5-tier ("Low"|"Moderate"|"High"|"Critical"|"Insufficient basis"); the
 * courier defined a mapping only for a three-tier shape. Per the courier's
 * own escape clause, tier assignment is deferred to a follow-on content
 * courier. This composer leaves any caller-supplied overall_risk_level
 * value untouched and does NOT invent one.
 *
 * Aggregation rule (deterministic; drives calibration-match assert):
 *   Order activities most-consequential-first:
 *     (i)   impacts-outweigh
 *     (ii)  hedged/close (closeness ≥ FIRM_VARIANT_CLOSENESS_MAX) OR
 *           incomplete mandatory documentation
 *     (iii) firm benefits-outweigh
 *   Overall calibration = the most cautious outcome present.
 *   NEVER averaged or majority-ruled.
 */

import {
  PASS2_TEMPLATES,
  SUMMARY_OUTCOME_CLAUSES,
  SUMMARY_REMAINING_OUTCOMES_CLAUSES,
  SUMMARY_DOCS_COMPLETION_CLAUSES,
  SUMMARY_EACH_OR_THIS_CLAUSES,
  SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES,
  SUMMARY_NARRATIVE_MAX_CHARS,
  FIRM_VARIANT_CLOSENESS_MAX,
} from "./content/pass2-templates.ts";
import { renderTemplate } from "./pass2-render.ts";
import {
  mapOverallRiskLevel,
  type ActivityRecordSignals,
  type OverallRiskLevel,
} from "./risk-level-map.ts";
import type { RenderPlan, Proposition } from "../render-plan/schema.ts";

export const SUMMARY_COMPOSE_VERSION = "ltp-summary-compose-2026-07-26";

export type ActivityOutcomeKind =
  | "impacts_outweigh"
  | "hedged_or_incomplete"
  | "firm_benefits_outweigh"
  | "assessment_incomplete";

export interface ActivityOutcome {
  readonly activity_ref: string;
  readonly activity_label: string;
  readonly outcome: ActivityOutcomeKind;
  readonly closeness: number;
  readonly key_factor_token: string;
  readonly documentation_incomplete: boolean;
}

export interface ComposeInput {
  readonly plan: RenderPlan;
  readonly activity_outcomes: readonly ActivityOutcome[];
  readonly intake: {
    readonly company_name?: string;
    readonly sector?: string;
    readonly assessment_date?: string;
  };
  readonly gate_signals: {
    readonly admt_disclosure_required?: boolean;
    readonly cybersecurity_audit_required?: boolean;
    readonly documentation_gate_failed?: boolean;
    readonly exception_labels?: readonly string[]; // [] = no exceptions claimed
  };
  readonly corpus_enforcement_note?: string;
  /**
   * Per-activity record signals for the 5-tier precedence law
   * (`risk-level-map.ts`). Optional for back-compat: when absent, the
   * composer falls back to passing through `overall_risk_level_from_caller`.
   */
  readonly activity_signals?: readonly ActivityRecordSignals[];
  /** Caller-supplied fallback value (used only when activity_signals absent). */
  readonly overall_risk_level_from_caller?: string;
}

export interface ComposeResult {
  readonly structured: {
    readonly company_name: string;
    readonly sector: string;
    readonly assessment_date: string;
    readonly triggered_activities: readonly string[];
    readonly exceptions_claimed: readonly string[];
    readonly exceptions_status: string;
    readonly overall_risk_level: string;
    readonly cybersecurity_audit_required: boolean;
    readonly admt_disclosure_required: boolean;
    readonly corpus_enforcement_note: string;
    readonly narrative: string;
  };
  readonly telemetry: {
    readonly opening_template_id: string;
    readonly activity_line_count: number;
    readonly docs_template_used: boolean;
    readonly closing_template_used: boolean;
    readonly narrative_chars: number;
    readonly capped: boolean;
    readonly errors: readonly string[];
    /** false once activity_signals are supplied and the 5-tier map runs. */
    readonly overall_risk_level_held: boolean;
    readonly overall_risk_level_rule?: 1 | 2 | 3 | 4;
    readonly overall_risk_level_rule_note?: string;
  };
}

// ── Deterministic helpers ────────────────────────────────────────────────

const RANK: Record<ActivityOutcomeKind, number> = {
  impacts_outweigh: 0,
  hedged_or_incomplete: 1,
  assessment_incomplete: 1,
  firm_benefits_outweigh: 2,
};

const isEngagedApplicabilityR = (p: Proposition): boolean =>
  p.epistemic_type === "R" &&
  (p as { polarity?: string }).polarity === "positive" &&
  /appl(icab|y)/i.test(p.conclusion_id);

/**
 * Deterministic populator for triggered_activities. ONLY the activity
 * labels of ENGAGED Type R applicability propositions are admitted.
 * Fixes the observed leak where customer-question strings entered the
 * array; customer questions belong in information_needed, never here.
 */
export function populateTriggeredActivities(plan: RenderPlan): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of plan.propositions) {
    if (!isEngagedApplicabilityR(p)) continue;
    // Reject anything shaped like a customer question.
    for (const ref of p.intake_ledger_refs ?? []) {
      const ent = plan.intake_ledger.find((l) => l.ledger_id === ref);
      const label = ent?.display?.trim();
      if (!label) continue;
      if (label.endsWith("?")) continue;
      if (/^(please|describe|what|which|how|does|do you|when|why|list)/i.test(label)) continue;
      if (label.length > 240) continue;
      if (seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}

const pluralActivityPhrase = (n: number): string =>
  n <= 0
    ? "no activities identified as requiring assessment"
    : n === 1
      ? "one activity requiring assessment"
      : `${n} activities requiring assessment`;

const joinList = (labels: readonly string[]): string => {
  const clean = labels.filter((s) => typeof s === "string" && s.trim().length > 0);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
};

const outcomeClauseFor = (k: ActivityOutcomeKind): string => {
  switch (k) {
    case "firm_benefits_outweigh": return SUMMARY_OUTCOME_CLAUSES[0];
    case "hedged_or_incomplete":   return SUMMARY_OUTCOME_CLAUSES[1];
    case "impacts_outweigh":       return SUMMARY_OUTCOME_CLAUSES[2];
    case "assessment_incomplete":  return SUMMARY_OUTCOME_CLAUSES[3];
  }
};

/**
 * Composes the assessment_summary.exceptions_status text per courier
 * template rule: no exceptions | list | append docs-incomplete suffix.
 */
function composeExceptionsStatus(
  exceptionLabels: readonly string[],
  docGateFailed: boolean,
): string {
  const suffix = docGateFailed ? "; documentation incomplete — see Items for your review" : "";
  if (!exceptionLabels || exceptionLabels.length === 0) return `No exceptions claimed${suffix}`;
  return `Exceptions claimed: ${joinList(exceptionLabels)}${suffix}`;
}

/**
 * Deterministic opening-template selection. Aggregation rule = most
 * cautious outcome present (never averaged, never majority-ruled).
 * Same rule governs the firm/hedged calibration assert.
 *
 * When an already-resolved overall_risk_level is provided (from
 * `mapOverallRiskLevel`), it takes precedence over outcome-only heuristics
 * so the opening variant is consistent with the 5-tier enum:
 *   "Insufficient basis" → insufficient
 *   "High" | "Critical"  → any_negative
 *   "Moderate"           → mixed_hedged
 *   "Low"                → all_firm
 */
export function selectOpeningTemplateId(
  outcomes: readonly ActivityOutcome[],
  overall?: OverallRiskLevel,
): string {
  if (overall === "Insufficient basis") return "T.risk.summary.opening.insufficient";
  if (overall === "High" || overall === "Critical") return "T.risk.summary.opening.any_negative";
  if (overall === "Moderate") return "T.risk.summary.opening.mixed_hedged";
  if (overall === "Low") return "T.risk.summary.opening.all_firm";
  if (outcomes.length === 0) return "T.risk.summary.opening.all_firm";
  const kinds = new Set(outcomes.map((o) => o.outcome));
  if (kinds.has("impacts_outweigh")) return "T.risk.summary.opening.any_negative";
  const anyClose = outcomes.some((o) => o.closeness >= FIRM_VARIANT_CLOSENESS_MAX);
  if (kinds.has("hedged_or_incomplete") || kinds.has("assessment_incomplete") || anyClose) {
    return "T.risk.summary.opening.mixed_hedged";
  }
  return "T.risk.summary.opening.all_firm";
}

// ── Composer ────────────────────────────────────────────────────────────

export function composeAssessmentSummary(input: ComposeInput): ComposeResult {
  const errors: string[] = [];
  const outcomes = [...input.activity_outcomes].sort(
    (a, b) => RANK[a.outcome] - RANK[b.outcome] || a.activity_ref.localeCompare(b.activity_ref),
  );

  // ── Structured keys ────────────────────────────────────────────────
  const triggered_activities = populateTriggeredActivities(input.plan);
  const exception_labels = input.gate_signals.exception_labels ?? [];
  const exceptions_status = composeExceptionsStatus(
    exception_labels,
    !!input.gate_signals.documentation_gate_failed,
  );

  // ── Precedence-law 5-tier mapping (only when signals supplied) ────
  const riskResult = input.activity_signals
    ? mapOverallRiskLevel({ outcomes, signals: input.activity_signals })
    : null;
  const overallResolved: OverallRiskLevel | undefined = riskResult?.overall_risk_level;

  // ── Narrative composition ─────────────────────────────────────────
  const openingId = selectOpeningTemplateId(outcomes, overallResolved);
  const activity_count_phrase = pluralActivityPhrase(outcomes.length);
  const firmList = outcomes.filter((o) => o.outcome === "firm_benefits_outweigh").map((o) => o.activity_label);
  const closeList = outcomes
    .filter((o) => o.outcome === "hedged_or_incomplete" || o.outcome === "assessment_incomplete" ||
                    o.closeness >= FIRM_VARIANT_CLOSENESS_MAX)
    .map((o) => o.activity_label);
  const negativeList = outcomes.filter((o) => o.outcome === "impacts_outweigh").map((o) => o.activity_label);
  const remaining = outcomes.length > negativeList.length
    ? SUMMARY_REMAINING_OUTCOMES_CLAUSES[0]
    : SUMMARY_REMAINING_OUTCOMES_CLAUSES[1];

  const openingRender = renderTemplate(openingId, input.plan, {
    activity_count_phrase,
    each_or_this_clause: outcomes.length === 1 ? SUMMARY_EACH_OR_THIS_CLAUSES[0] : SUMMARY_EACH_OR_THIS_CLAUSES[1],
    activity_singplural_clause: outcomes.length === 1
      ? SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES[0]
      : SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES[1],
    firm_positive_list: joinList(firmList),
    close_list: joinList(closeList),
    negative_list: joinList(negativeList),
    remaining_outcomes_clause: remaining,
  });
  errors.push(...openingRender.errors.map((e) => `opening:${e}`));

  const activityLineTexts: string[] = [];
  for (const o of outcomes) {
    const r = renderTemplate("T.risk.summary.activity_line", input.plan, {
      activity_label: o.activity_label,
      outcome_clause: outcomeClauseFor(o.outcome),
      key_factor_token: o.key_factor_token || "primary factor on the record",
    });
    if (r.errors.length) errors.push(...r.errors.map((e) => `activity_line:${e}`));
    if (r.text) activityLineTexts.push(r.text);
  }

  const docsClause = input.gate_signals.documentation_gate_failed
    ? SUMMARY_DOCS_COMPLETION_CLAUSES[1]
    : SUMMARY_DOCS_COMPLETION_CLAUSES[0];
  const docsRender = renderTemplate("T.risk.summary.docs", input.plan, {
    docs_completion_clause: docsClause,
  });
  errors.push(...docsRender.errors.map((e) => `docs:${e}`));

  const closingTemplate = PASS2_TEMPLATES["T.risk.closing.reserved"];
  const closingRender = closingTemplate
    ? renderTemplate("T.risk.closing.reserved", input.plan)
    : { text: "", errors: [] as string[] };
  errors.push(...closingRender.errors.map((e) => `closing:${e}`));

  // Fixed order: opening → activity lines → docs → closing.
  const parts: string[] = [];
  if (openingRender.text) parts.push(openingRender.text);
  if (activityLineTexts.length) parts.push(activityLineTexts.join(" "));
  if (docsRender.text) parts.push(docsRender.text);
  if (closingRender.text) parts.push(closingRender.text);
  let narrative = parts.join(" ").trim();
  let capped = false;
  if (narrative.length > SUMMARY_NARRATIVE_MAX_CHARS) {
    narrative = narrative.slice(0, SUMMARY_NARRATIVE_MAX_CHARS).replace(/\s+\S*$/, "").trim();
    capped = true;
    errors.push(`narrative_capped_at_${SUMMARY_NARRATIVE_MAX_CHARS}`);
  }

  return {
    structured: {
      company_name: input.intake.company_name ?? "",
      sector: input.intake.sector ?? "",
      assessment_date: input.intake.assessment_date ?? "",
      triggered_activities,
      exceptions_claimed: exception_labels,
      exceptions_status,
      // HELD-carried through: caller-supplied value is passed verbatim; the
      // composer does NOT synthesize a tier while item 147 remains open.
      overall_risk_level: input.overall_risk_level_from_caller ?? "",
      cybersecurity_audit_required: !!input.gate_signals.cybersecurity_audit_required,
      admt_disclosure_required: !!input.gate_signals.admt_disclosure_required,
      corpus_enforcement_note: input.corpus_enforcement_note ?? "",
      narrative,
    },
    telemetry: {
      opening_template_id: openingId,
      activity_line_count: activityLineTexts.length,
      docs_template_used: !!docsRender.text,
      closing_template_used: !!closingRender.text,
      narrative_chars: narrative.length,
      capped,
      errors,
      overall_risk_level_held: true,
    },
  };
}
