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
    return `Initial-assessment deadline: before the processing is initiated${planned ? ` (planned start: ${planned})` : ""}.`;
  }
  if (start && start < "2026-01-01") {
    return "Initial-assessment deadline: December 31, 2027 (transition deadline for covered processing initiated before January 1, 2026 and continuing afterward).";
  }
  if (start) {
    return `Initial-assessment deadline: before initiation of the processing (processing initiated ${start}).`;
  }
  return "Initial-assessment deadline: determination pending — record when the covered processing began (before initiation applies to processing initiated on or after January 1, 2026; the December 31, 2027 transition deadline applies to covered processing already underway before that date and continuing afterward).";
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
