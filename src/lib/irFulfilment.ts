// QA round two (IR-A-01 / IR-B / IR-C, 2026-09-06) — Incident Response
// fulfilment state.
//
// The Incident Response Playbook is PURCHASE-FIRST: create-tool-checkout writes
// the ir_playbooks row from whatever the landing page held, which is an
// untouched empty form because the intake is only shown after payment.
// payments-webhook then dispatched generate-ir-playbook against that empty row;
// the generator answered 400, dispatchGenerator stamped the PAID row
// status='error', and the result page — which had no failed branch — rendered
// "No assessment content available". All three QA customers lost a paid
// purchase this way.
//
// These predicates are the single place that decides whether a playbook row is
// waiting for its incident facts rather than genuinely broken.

/** Statuses on which nothing is running, so the result page stops polling. */
export const IR_TERMINAL_STATUSES = new Set([
  "complete",
  "error",
  "failed",
  "refunded",
  "failed_resolved",
  // Written by generate-ir-playbook when a paid row still has no intake.
  // Terminal for polling, but recoverable: the customer completes the intake.
  "awaiting_intake",
]);

export interface IrPlaybookRowLike {
  status?: string | null;
  intake_data?: Record<string, unknown> | null;
}

/**
 * True when the intake carries the facts the generator actually requires.
 * `jurisdictions` is the generator's own gate (generate-ir-playbook rejects a
 * body with no jurisdictions), so it is the honest test of "usable intake".
 */
export function hasIncidentIntake(row: IrPlaybookRowLike | null | undefined): boolean {
  const j = (row?.intake_data as { jurisdictions?: unknown } | null | undefined)?.jurisdictions;
  return Array.isArray(j) && j.length > 0;
}

/**
 * True when the customer has paid but the playbook has no incident facts to be
 * written from. The result page must route these back into the intake instead
 * of rendering an empty report — the purchase is intact, only the answers are
 * missing.
 *
 * `awaiting_intake` is the state the generator writes going forward; the
 * intake test also catches rows already stranded as `error` by the pre-fix
 * dispatch, so purchases orphaned before this change recover too.
 */
export function needsIncidentIntake(row: IrPlaybookRowLike | null | undefined): boolean {
  if (!row) return false;
  const status = String(row.status ?? "");
  if (status === "complete") return false;
  if (status === "awaiting_intake") return true;
  return IR_TERMINAL_STATUSES.has(status) && !hasIncidentIntake(row);
}
