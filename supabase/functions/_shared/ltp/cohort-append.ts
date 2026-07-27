/**
 * LTP COHORT APPEND-IF-ABSENT — STAGE-B CONTINUATION-4 (2026-07-27, item 195).
 *
 * Post-generation deterministic ensurer: when the resolved § 7121(a)
 * revenue band is INDETERMINATE (unspecified or legacy $25M–$100M), the
 * two-cohort conditional clause MUST be present in
 * report_data.submission_summary.submission_basis. If already present
 * (idempotent match), no-op. Fail-open: never throws.
 *
 * This is the courier-supplied "append-if-absent" fix for the A.i trace's
 * cohort-clause absence class. Runs AFTER waveb-completion so the
 * submission_basis crosswalk clauses are already appended.
 */

import { classifyRevenueBand } from "../cppa-test-states.ts";

export const COHORT_APPEND_STAMP = "ltp-cohort-append@2026-07-27T13:30:00Z";
export const COHORT_APPEND_VERSION = "cohort-append-v1";

const COHORT_CONDITIONAL =
  "§ 7121(a) cohort conditional — April 1, 2029 if 2027 revenue is $50M–$100M; " +
  "April 1, 2030 if under $50M; the recorded revenue band does not yet resolve the cohort";

const COHORT_MARKER_RE = /§\s*7121\(a\)\s+cohort\s+conditional/i;

export interface CohortAppendResult {
  readonly appended: boolean;
  readonly reason: "indeterminate_band_appended" | "already_present" | "band_resolved" | "no_summary";
  readonly stamp: string;
  readonly version: string;
}

export function applyCohortAppendIfAbsent(
  report: any,
  intake: Record<string, unknown>,
): CohortAppendResult {
  const base = { stamp: COHORT_APPEND_STAMP, version: COHORT_APPEND_VERSION };
  if (!report || typeof report !== "object") {
    return { appended: false, reason: "no_summary", ...base };
  }
  const summary = report.submission_summary;
  if (!summary || typeof summary !== "object") {
    return { appended: false, reason: "no_summary", ...base };
  }
  const band = classifyRevenueBand((intake as any)?.q1_revenue);
  // Only act when the band is INDETERMINATE — a resolved band gets its
  // single-date treatment elsewhere. Indeterminate = we cannot pick a
  // single cohort year and MUST expose the conditional to the reader.
  if (band?.over_25m !== "indeterminate") {
    return { appended: false, reason: "band_resolved", ...base };
  }
  const existing = String(summary.submission_basis ?? "");
  if (COHORT_MARKER_RE.test(existing)) {
    return { appended: false, reason: "already_present", ...base };
  }
  const glue = existing && !/;\s*$/.test(existing) ? "; " : "";
  summary.submission_basis = `${existing}${glue}${COHORT_CONDITIONAL}`;
  return { appended: true, reason: "indeterminate_band_appended", ...base };
}
