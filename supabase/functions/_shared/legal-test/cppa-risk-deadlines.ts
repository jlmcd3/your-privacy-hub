/**
 * CPPA-RISK DEADLINE REGISTRY (Item 241.3 wiring — 2026-07-28)
 * ------------------------------------------------------------
 * Deadline rows verbatim from ITEM 241.2 courier §2.4 (CEO-approved
 * 2026-07-28). Every action emitted by the four-move gap-driven action
 * template consumes exactly one row via `deadline_basis_id`.
 *
 * ONE-DEADLINE-PER-ACTION LAW (courier §2.1, verbatim, binding):
 *   "Every action emitted by the four-move action template consumes
 *   exactly one `deadline_basis` row. If more than one deadline class
 *   could apply, the composer selects the earlier of the two and
 *   records the loser in `deadline_basis_alt_ref` for telemetry; the
 *   customer-facing sentence names only the selected deadline.
 *   Actions that have no statutory deadline consume the
 *   `ongoing_processing` row and render the
 *   'Immediate (before continuing …)' clause verbatim."
 *
 * PROSPECTIVE-MARKING RULE (courier §2.2, verbatim):
 *   "Deadlines that attach to processing initiated after the operative
 *   date render with the prefix 'Prospective —' before the ISO date;
 *   deadlines that attach to processing that pre-exists the operative
 *   date render with the prefix 'Ongoing —' before the ISO date. The
 *   prefix is part of the customer-facing sentence, not decoration,
 *   and is set from the cohort resolved by `r.cohort.compliance_date`."
 *
 * ONGOING-PROCESSING RULE (courier §2.3, verbatim):
 *   "When the record shows the processing is already underway and no
 *   statutory deadline extends the compliance date, the action renders
 *   'Immediate (before continuing the processing).' verbatim in place
 *   of an ISO date. This clause is the ONLY permissible non-ISO
 *   deadline surface."
 *
 * CEO CONDITION 4 (ITEM 241.3, verbatim binding condition):
 *   Every ISO date / cadence lands corpus-pin-tested against
 *   provision_texts before wiring; any row that fails pin-testing
 *   ships as the `ongoing_processing` fallback with a telemetry flag,
 *   never a hand-typed date. Runtime pin-testing is a warn-and-fall-back
 *   pattern (see markDeadlineFailedPin below): pure data here, drift
 *   registered at boot by run-cppa-risk-assessment via the existing
 *   `verifyCppaDeadlineDrift` seam. Composer consumers ALWAYS read
 *   through `selectDeadlineOrFallback` so a failed pin transparently
 *   yields the `d.ongoing_processing` row.
 */

export const CPPA_RISK_DEADLINES_VERSION =
  "cppa-risk-deadlines-2026-07-28-item241-3";

export type DeadlineClass =
  | "assessment_record"
  | "admt_pre_use_notice"
  | "submission"
  | "ongoing_processing";

export type CohortMarking = "prospective" | "ongoing" | "not_applicable";

export interface DeadlineRow {
  readonly id: string;
  readonly anchor_pinpoint: string;
  readonly deadline_class: DeadlineClass;
  readonly cohort_marking: CohortMarking;
  /** Verbatim customer-facing label (courier §2.4 column 4). */
  readonly deadline_label: string;
  /** Verbatim action-tail sentence (courier §2.4 column 5). */
  readonly deadline_sentence: string;
}

export const CPPA_RISK_DEADLINES: readonly DeadlineRow[] = [
  {
    id: "d.assessment_record.pre_existing",
    anchor_pinpoint: "11 CCR § 7155(b)",
    deadline_class: "assessment_record",
    cohort_marking: "ongoing",
    deadline_label: "Ongoing — 2027-12-31 (§ 7155(b))",
    deadline_sentence:
      "Complete and retain the assessment record by Ongoing — 2027-12-31, the § 7155(b) compliance date for processing that was underway before the operative date.",
  },
  {
    id: "d.assessment_record.prospective",
    anchor_pinpoint: "11 CCR § 7155(a)",
    deadline_class: "assessment_record",
    cohort_marking: "prospective",
    deadline_label: "Prospective — before initiating the processing (§ 7155(a))",
    deadline_sentence:
      "Complete and retain the assessment record Prospective — before initiating the processing, as § 7155(a) requires for processing initiated after the operative date.",
  },
  {
    id: "d.assessment_record.material_change",
    anchor_pinpoint: "11 CCR § 7155(c)",
    deadline_class: "assessment_record",
    cohort_marking: "prospective",
    deadline_label: "Prospective — before implementing the material change (§ 7155(c))",
    deadline_sentence:
      "Update and retain the assessment record Prospective — before implementing the material change, as § 7155(c) requires when a material change to the processing occurs.",
  },
  {
    id: "d.admt_pre_use_notice.existing",
    anchor_pinpoint: "11 CCR § 7220",
    deadline_class: "admt_pre_use_notice",
    cohort_marking: "ongoing",
    deadline_label: "Ongoing — 2027-01-01 (§ 7220)",
    deadline_sentence:
      "Publish and retain the ADMT pre-use notice by Ongoing — 2027-01-01, the § 7220 compliance date for ADMT already in use.",
  },
  {
    id: "d.admt_pre_use_notice.prospective",
    anchor_pinpoint: "11 CCR § 7220",
    deadline_class: "admt_pre_use_notice",
    cohort_marking: "prospective",
    deadline_label: "Prospective — before deploying the ADMT (§ 7220)",
    deadline_sentence:
      "Publish and retain the ADMT pre-use notice Prospective — before deploying the ADMT, as § 7220 requires for ADMT not yet in use.",
  },
  {
    id: "d.submission.attestation",
    anchor_pinpoint: "11 CCR § 7157",
    deadline_class: "submission",
    cohort_marking: "not_applicable",
    deadline_label: "Ongoing — annually (§ 7157)",
    deadline_sentence:
      "Submit the § 7157 attestation Ongoing — annually, on the schedule the Agency prescribes for the business's cohort.",
  },
  {
    id: "d.ongoing_processing",
    anchor_pinpoint: "(no statutory deadline)",
    deadline_class: "ongoing_processing",
    cohort_marking: "not_applicable",
    deadline_label: "Immediate (before continuing the processing)",
    deadline_sentence:
      "Address this item Immediate (before continuing the processing), as no statutory deadline extends the compliance date.",
  },
];

export const CPPA_RISK_DEADLINE_INDEX: Readonly<Record<string, DeadlineRow>> =
  Object.freeze(Object.fromEntries(CPPA_RISK_DEADLINES.map((d) => [d.id, d])));

/** Fallback row all failed-pin selections resolve to. */
export const ONGOING_PROCESSING_FALLBACK: DeadlineRow =
  CPPA_RISK_DEADLINE_INDEX["d.ongoing_processing"];

// ---------------------------------------------------------------------
// Runtime pin-fail bookkeeping (CONDITION 4). Warn-only mutation; a
// row is only marked failed by the boot-time drift lint after a real
// corpus mismatch. Composer consumers ALWAYS route through
// `selectDeadlineOrFallback` so a failed pin transparently degrades.
// ---------------------------------------------------------------------

const _failedPinIds = new Set<string>();

export function markDeadlineFailedPin(id: string): void {
  _failedPinIds.add(id);
}

export function isDeadlinePinFailed(id: string): boolean {
  return _failedPinIds.has(id);
}

export interface DeadlineSelection {
  readonly row: DeadlineRow;
  readonly requested_id: string;
  readonly pin_fallback: boolean;
}

/** Fill-or-fallback deadline resolver. Never throws; unknown id → fallback. */
export function selectDeadlineOrFallback(id: string): DeadlineSelection {
  const row = CPPA_RISK_DEADLINE_INDEX[id];
  if (!row || _failedPinIds.has(id)) {
    return { row: ONGOING_PROCESSING_FALLBACK, requested_id: id, pin_fallback: true };
  }
  return { row, requested_id: id, pin_fallback: false };
}
