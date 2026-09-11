// DOC 167 (2026-09-04, CPPA Risk Batch 13 triage) — § 7155 timing derivations,
// split out of risk-skeleton-assemble.ts so the risk factor engine can read the
// SAME resolver (one fact, one home): the assembler imports the engine, so the
// engine could not import these from the assembler without a cycle. The
// assembler re-exports them, so every existing import site is unchanged.

type Bag = Record<string, unknown>;
const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** {{DERIVED.initial_assessment_deadline}} — § 7155 timing rules over the status/start facts.
 * DOC 148 (A-Team Batch-8 P0) — the deadline is fact-gated: which § 7155
 * deadline applies to processing already underway depends on WHEN it began.
 * "Before initiation" was previously the fall-through for an ongoing
 * activity with no recorded start date — a definitive deadline the record
 * cannot support. That case now states the pending determination and the
 * fork the start date resolves. Planned processing and dated starts are
 * unchanged.
 * DOC 167 (Batch 13 A-Team §9, NestGrid) — the former `if (!status) return
 * null` gate meant an UNRECORDED processing status (the field is optional on
 * the live form) suppressed the entire timing determination: no Key Dates
 * row, no § 5.B conclusion — the one case where even LESS is known than
 * "Ongoing with no start date", which doc 148 already routes to the honest
 * pending fallback below. Silence is the wrong degrade for an unknown; the
 * fallthrough already produces the right sentence, so the gate is removed.
 * Sibling NestWave/Luminary fixtures (status recorded) rendered the pending
 * state correctly; NestGrid (status blank) rendered nothing. */
export function deriveInitialAssessmentDeadline(intake: Bag): string | null {
  const status = s(intake.processing_status);
  const start = s(intake.processing_start_date);
  const planned = s(intake.planned_start_date);
  if (/^planned/i.test(status)) {
    // DOC 255 (2026-09-11, CEO on doc 254A item 1): the labels use the
    // regulation's own term — "risk assessment" — and cite the rule that
    // sets each deadline, so the order (assessment, then three-year review
    // and 45-day material-change updates) is clear; "initial" and
    // "subsequent" are not the regulation's words.
    return `Risk assessment deadline: before the processing is initiated, under 11 CCR § 7155(a)(1)${planned ? ` (planned start: ${planned})` : ""}.`;
  }
  if (start && start < "2026-01-01") {
    return "Risk assessment deadline: December 31, 2027, under 11 CCR § 7155(b), for covered processing initiated before January 1, 2026 and continuing afterward; the assessment must then be reviewed and updated at least once every three years (§ 7155(a)(2)) and within 45 calendar days of any material change (§ 7155(a)(3)).";
  }
  if (start) {
    return `Risk assessment deadline: before initiation of the processing, under 11 CCR § 7155(a)(1) (processing initiated ${start}).`;
  }
  const pending =
    "Risk assessment deadline: determination pending — record when the covered processing began (under 11 CCR § 7155(a)(1) the assessment is required before initiating processing on or after January 1, 2026; under § 7155(b) covered processing already underway before that date and continuing afterward must be assessed by December 31, 2027).";
  // DOC 252 D1 (CEO-ruled 2026-09-10, revised 2026-09-11, batch 916c33a8
  // Velostream): where the record itself indicates the processing predates
  // 2026 — recorded as ongoing, with a prior assessment the Company dates
  // before January 1, 2026 — the deadline line IS the CEO's sentence (ledger
  // C1, CEO bytes; "the company" set in the Risk house form "the Company").
  // The "determination pending — record when…" lead is dropped (CEO
  // 2026-09-11), so `initialAssessmentDeadlinePending` is false here and the
  // engine draws the C2 Follow-Up from `priorAssessmentDateBefore2026`.
  return priorAssessmentDateBefore2026(intake)
    ? `Risk assessment deadline: ${DOC252_C1_C2_SENTENCE}`
    : pending;
}

/** DOC 252 ledger C1/C2 — the CEO's sentence (2026-09-11), one home for both
 *  the § 5.B / Key Dates surface and the § 4.D Follow-Up. */
// DOC 255 (2026-09-11, CEO on doc 254A item 1): restated in § 7155's own
// terms with the order of obligations explicit (assessment by the § 7155(b)
// date, then § 7155(a)(2) review and § 7155(a)(3) updates).
export const DOC252_C1_C2_SENTENCE =
  "Based on the information provided by the Company, processing began before January 1, 2026 and is ongoing. Under 11 CCR § 7155(b) the risk assessment for that processing must be conducted and documented by December 31, 2027; it must then be reviewed and updated at least once every three years (§ 7155(a)(2)) and within 45 calendar days of any material change (§ 7155(a)(3)).";

/**
 * DOC 252 D1 — the record's own indication that the processing predates
 * 2026: processing_status is "Ongoing" and the prior-assessment summary
 * (i9_existing_dpia_summary, with i9_has_existing_dpia = Yes) carries a date
 * before January 1, 2026. Returns that date in the Company's own words
 * ("March 2023", "Q1 2024", "2023-03-15"), or "" where the indication is not
 * on the record. A dated prior assessment is an INDICATION of the start, never
 * the start date itself, so every consumer keeps the pending determination
 * and asks for the start date.
 */
const PRIOR_DATE_RE =
  /\b(?:(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.?\s+(?:\d{1,2},?\s+)?(20\d{2})|Q[1-4]\s+(20\d{2})|(20\d{2})-\d{2}(?:-\d{2})?)\b/g;

export function priorAssessmentDateBefore2026(intake: Bag): string {
  if (!/^ongoing/i.test(s(intake.processing_status))) return "";
  if (!/^yes/i.test(s(intake.i9_has_existing_dpia))) return "";
  const summary = s(intake.i9_existing_dpia_summary);
  if (!summary) return "";
  for (const m of summary.matchAll(PRIOR_DATE_RE)) {
    const year = Number(m[1] ?? m[2] ?? m[3]);
    if (year && year < 2026) return m[0];
  }
  return "";
}

/** True when the § 5.B / Key Dates deadline is in its pending state — the
 * start date is unrecorded on a non-planned record — so the engine can draw
 * the completing Follow-Up from the same fact the assembler renders. */
export function initialAssessmentDeadlinePending(intake: Bag): boolean {
  return /determination pending/.test(deriveInitialAssessmentDeadline(intake) ?? "");
}

/** {{DERIVED.assessment_retention_end_date_or_rule}} — § 7155 later-of rule over the status facts. */
export function deriveAssessmentRetentionEnd(intake: Bag): string | null {
  const status = s(intake.processing_status);
  if (/^discontinued/i.test(status)) {
    return "Because the processing is recorded as discontinued, the assessment record must be retained for five years after completion of this assessment, or until the end of the processing if that is later";
  }
  // DOC 167 (Batch 13, NestGrid) — same gate defect as
  // deriveInitialAssessmentDeadline: a blank (optional) processing status
  // used to return null and drop the § 5.D conclusion entirely. Unlike the
  // deadline fallback, the continuing-processing sentence below ASSERTS that
  // the processing continues, which an unrecorded status cannot support — so
  // the blank case gets its own honest open-question sentence.
  if (!status) {
    // Team ratification (doc 167 §C.2, CEO-delegated): § 7155(c) is ONE
    // later-of rule that governs regardless of status; what a blank status
    // leaves undeterminable is the END DATE, not which rule applies.
    return "Whether the processing is ongoing or discontinued is not recorded; the later-of rule above governs in either case, and the retention end date — the later of five years after completion of this assessment and the end of the processing — is not yet determinable; record the processing status to resolve it";
  }
  return "Because the processing continues on the information provided, the retention end date is not yet determinable; the later-of rule above governs";
}
