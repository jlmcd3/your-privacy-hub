/**
 * LTP — overall_risk_level precedence law (CONTENT COURIER 2026-07-26).
 *
 * Verbatim enum at run-cppa-risk-assessment/index.ts:654 (mirror at
 * src/components/cppa/RiskAssessmentReportV4.tsx:48):
 *   "Low" | "Moderate" | "High" | "Critical" | "Insufficient basis"
 *
 * STRUCTURE RULING (per courier):
 *   Four ordered severity tiers (Low < Moderate < High < Critical) PLUS
 *   one epistemic state ("Insufficient basis") that is not a severity.
 *   The mapping is therefore a PRECEDENCE LAW, not a pure ladder.
 *
 * PRECEDENCE (evaluate in order):
 *   1. If ANY activity is impacts-outweigh:
 *        → "Critical" iff that activity's factor table has a negative-impact
 *          row anchored to intake severity "Severe" OR likelihood "Highly likely"
 *          (verified literals from src/pages/CPPARiskAssessment.enums.ts).
 *        → else "High".
 *      A determined harm finding is NEVER masked by another activity's
 *      insufficiency; coexisting insufficiency is disclosed in the narrative
 *      and Items for your review (composer responsibility, not this map's).
 *   2. Else if the record cannot support the analysis:
 *        conservative_write_around engaged on any activity's balance, OR
 *        ALL activities have incomplete mandatory documentation, OR
 *        every mandatory balance factor across all activities carries
 *        "no record evidence"
 *      → "Insufficient basis".
 *   3. Else if any activity is hedged/close (closeness ≥ 0.6), OR
 *        some (not all) activities have incomplete mandatory documentation, OR
 *        all-firm with open safeguard_gaps
 *      → "Moderate".
 *   4. Else (all-firm, no open safeguard_gaps) → "Low".
 *
 * Most-cautious-wins applies within rules 3–4 across activities as before;
 * rules 1–2 are absolute precedence.
 *
 * Pure; never throws.
 */

import type { ActivityOutcome } from "./summary-compose.ts";
import { FIRM_VARIANT_CLOSENESS_MAX } from "./content/pass2-templates.ts";

export const RISK_LEVEL_MAP_VERSION = "risk-level-map-2026-07-26";

export type OverallRiskLevel =
  | "Low"
  | "Moderate"
  | "High"
  | "Critical"
  | "Insufficient basis";

/**
 * Verified severity/likelihood literals from
 * src/pages/CPPARiskAssessment.enums.ts (IMPACT_SEVERITY_OPTS,
 * IMPACT_LIKELIHOOD_OPTS). Do not add synonyms; the T-condition test uses
 * these exact strings.
 */
export const T_CRITICAL_SEVERITY_LITERAL = "Severe";
export const T_CRITICAL_LIKELIHOOD_LITERAL = "Highly likely";

export interface NegativeImpactFactor {
  readonly severity?: string;
  readonly likelihood?: string;
}

export interface ActivityRecordSignals {
  readonly activity_ref: string;
  /** Rows on this activity's factor table classified as negative impact. */
  readonly negative_impacts: readonly NegativeImpactFactor[];
  /** Whether this activity engaged the conservative_write_around on balance. */
  readonly write_around_engaged: boolean;
  /** True when this activity's mandatory documentation is incomplete. */
  readonly documentation_incomplete: boolean;
  /**
   * True when EVERY mandatory balance factor for this activity carries
   * "no record evidence" (or equivalent sentinel).
   */
  readonly all_mandatory_factors_no_evidence: boolean;
  /** True when at least one safeguard_gap remains open on this activity. */
  readonly safeguard_gaps_open: boolean;
}

export interface RiskLevelInput {
  readonly outcomes: readonly ActivityOutcome[];
  readonly signals: readonly ActivityRecordSignals[];
}

export interface RiskLevelResult {
  readonly overall_risk_level: OverallRiskLevel;
  readonly rule_fired: 1 | 2 | 3 | 4;
  readonly rule_note: string;
  readonly critical_trigger_activity_ref?: string;
}

function signalFor(input: RiskLevelInput, ref: string): ActivityRecordSignals | undefined {
  return input.signals.find((s) => s.activity_ref === ref);
}

function hasCriticalTrigger(sig: ActivityRecordSignals | undefined): boolean {
  if (!sig) return false;
  return sig.negative_impacts.some(
    (n) => n.severity === T_CRITICAL_SEVERITY_LITERAL ||
           n.likelihood === T_CRITICAL_LIKELIHOOD_LITERAL,
  );
}

/**
 * Deterministic mapping from activity outcomes + per-activity record
 * signals to the 5-tier overall_risk_level enum.
 */
export function mapOverallRiskLevel(input: RiskLevelInput): RiskLevelResult {
  const outcomes = input.outcomes ?? [];
  const signals = input.signals ?? [];

  // ── Rule 1: any impacts-outweigh (absolute precedence) ─────────────
  const negatives = outcomes.filter((o) => o.outcome === "impacts_outweigh");
  if (negatives.length > 0) {
    for (const neg of negatives) {
      const sig = signalFor(input, neg.activity_ref);
      if (hasCriticalTrigger(sig)) {
        return {
          overall_risk_level: "Critical",
          rule_fired: 1,
          rule_note: "impacts-outweigh with Severe severity or Highly-likely likelihood",
          critical_trigger_activity_ref: neg.activity_ref,
        };
      }
    }
    return {
      overall_risk_level: "High",
      rule_fired: 1,
      rule_note: "impacts-outweigh present; no Critical severity/likelihood trigger",
    };
  }

  // ── Rule 2: record cannot support the analysis (absolute precedence) ──
  const anyWriteAround = signals.some((s) => s.write_around_engaged);
  const allDocIncomplete = signals.length > 0 && signals.every((s) => s.documentation_incomplete);
  const allFactorsNoEvidence = signals.length > 0 && signals.every((s) => s.all_mandatory_factors_no_evidence);
  if (anyWriteAround || allDocIncomplete || allFactorsNoEvidence) {
    const why: string[] = [];
    if (anyWriteAround) why.push("conservative_write_around engaged");
    if (allDocIncomplete) why.push("all activities have incomplete mandatory documentation");
    if (allFactorsNoEvidence) why.push("every mandatory balance factor carries no record evidence");
    return {
      overall_risk_level: "Insufficient basis",
      rule_fired: 2,
      rule_note: why.join("; "),
    };
  }

  // ── Rule 3: hedged/close, partial doc incompleteness, or open safeguard gaps ──
  const anyClose = outcomes.some(
    (o) => o.outcome === "hedged_or_incomplete" ||
           o.outcome === "assessment_incomplete" ||
           o.closeness >= FIRM_VARIANT_CLOSENESS_MAX,
  );
  const someDocIncomplete = signals.some((s) => s.documentation_incomplete);
  const anySafeguardGaps = signals.some((s) => s.safeguard_gaps_open);
  if (anyClose || someDocIncomplete || anySafeguardGaps) {
    const why: string[] = [];
    if (anyClose) why.push("hedged/close outcome present");
    if (someDocIncomplete) why.push("some (not all) activities have incomplete mandatory documentation");
    if (anySafeguardGaps) why.push("open safeguard gaps");
    return {
      overall_risk_level: "Moderate",
      rule_fired: 3,
      rule_note: why.join("; "),
    };
  }

  // ── Rule 4: all-firm, no open safeguard gaps ───────────────────────
  return {
    overall_risk_level: "Low",
    rule_fired: 4,
    rule_note: "all activities firm benefits-outweigh; no open safeguard gaps",
  };
}

/**
 * Consistency asserter: opening variant ⇔ overall_risk_level.
 * Returns a violation message when inconsistent; null when consistent.
 *
 *   "Insufficient basis" ⇔ "T.risk.summary.opening.insufficient"
 *   "High" | "Critical"  ⇒ "T.risk.summary.opening.any_negative"
 *   "Moderate"           ⇒ "T.risk.summary.opening.mixed_hedged"
 *   "Low"                ⇒ "T.risk.summary.opening.all_firm"
 */
export function assertOpeningRiskLevelConsistency(
  overall: OverallRiskLevel,
  openingTemplateId: string,
): string | null {
  const expected: Record<OverallRiskLevel, string> = {
    "Insufficient basis": "T.risk.summary.opening.insufficient",
    "Critical": "T.risk.summary.opening.any_negative",
    "High": "T.risk.summary.opening.any_negative",
    "Moderate": "T.risk.summary.opening.mixed_hedged",
    "Low": "T.risk.summary.opening.all_firm",
  };
  const want = expected[overall];
  if (openingTemplateId !== want) {
    return `opening_risk_level_mismatch: overall=${overall} opening=${openingTemplateId} expected=${want}`;
  }
  return null;
}
