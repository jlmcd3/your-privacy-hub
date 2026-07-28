/**
 * CP-B §1 — Submission postures for the § 7120(b) prongs.
 *
 * Per-prong, per-marker-state posture clauses grounded in the VERBATIM
 * text of 11 CCR § 7120 and the cross-referenced § 1798.140(d)(1)(C).
 * State-the-law form only; never computes beyond the record.
 *
 * Marker sources (verified in code):
 *   - M4 → § 7120(b)(2)(B), sourced from `q15c_spi_volume`
 *     (`_shared/cppa-test-states.ts:84`)
 *   - M5 → § 7120(b)(1),   sourced from `q5c_share_revenue_50pct`
 *     (`_shared/cppa-test-states.ts:82`)
 *   - b2A derived from consumer-band + revenue-band (b1/b2A/b2B triad in
 *     `waveb-completion.ts::computeProngOutcomes`).
 */
import {
  CCPA_7120_B_1,
  CCPA_7120_B_2_A,
  CCPA_7120_B_2_B,
  CCPA_1798_140_D_1_C,
} from "../openings/ccpa-7120-pin.ts";

export type ProngKey = "b1" | "b2A" | "b2B";
export type ProngOutcome = "met" | "not met" | "not applicable" | "indeterminate";

const PRONG_PIN: Record<ProngKey, string> = {
  b1: "§ 7120(b)(1)",
  b2A: "§ 7120(b)(2)(A)",
  b2B: "§ 7120(b)(2)(B)",
};

/**
 * Verbatim text of the prong requirement (from provision_texts:cppa-7120).
 * Used as the state-the-law preface in every posture clause.
 */
function prongPreface(prong: ProngKey): string {
  switch (prong) {
    case "b1":
      return `${PRONG_PIN.b1} incorporates Civil Code § 1798.140(d)(1)(C), which applies when a business "${CCPA_1798_140_D_1_C.replace(/\.$/, "")}"`;
    case "b2A":
      return `${PRONG_PIN.b2A} applies when a business "${CCPA_7120_B_2_A}"`;
    case "b2B":
      return `${PRONG_PIN.b2B} applies when a business "${CCPA_7120_B_2_B}"`;
  }
}

/**
 * State-the-law posture clause per prong per outcome. The clause quotes
 * the provision verbatim and states the posture on the current record
 * without computing beyond it.
 */
export function renderProngPosture(prong: ProngKey, outcome: ProngOutcome): string {
  const preface = prongPreface(prong);
  switch (outcome) {
    case "met":
      return `${preface}. On the current record this threshold is met.`;
    case "not met":
      return `${preface}. On the current record this threshold is not met.`;
    case "not applicable":
      return `${preface}. On the current record this prong is not applicable.`;
    case "indeterminate":
      return `${preface}. The current record does not yet resolve this threshold; completing the underlying intake field resolves it.`;
  }
}

export function renderAllProngPostures(
  outcomes: Record<ProngKey, ProngOutcome>,
): string[] {
  return (["b1", "b2A", "b2B"] as const).map((k) => renderProngPosture(k, outcomes[k]));
}

export const SUBMISSION_POSTURES_STAMP = "submission-postures@2026-07-28-cpb-final";
