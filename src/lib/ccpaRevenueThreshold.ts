/**
 * Cyber master review (2026-09-15, F06) — the CCPA revenue threshold the
 * intake names in its dated threshold question.
 *
 * FRONTEND MIRROR of CCPA_REVENUE_THRESHOLDS in
 * supabase/functions/_shared/bands/revenue-consumer.ts, pinned by
 * tests/edge/_shared/ccpa-revenue-threshold-mirror.test.ts. The figure is
 * CPI-adjusted every odd-numbered year (Civ. Code § 1798.199.95(d)(1), the
 * provision § 1798.140(d)(1)(A) itself names: "as adjusted pursuant to
 * subdivision (d) of Section 1798.199.95"; both verified on
 * leginfo.legislature.ca.gov 2026-09-16); the CPPA published $26,625,000
 * effective January 1, 2025
 * (https://www.cppa.ca.gov/regulations/cpi_adjustment.html, verified
 * 2026-09-16). Relative imports only (Deno tests).
 */

export interface CcpaRevenueThresholdRow {
  readonly effective: string;
  readonly amount: number;
  readonly label: string;
}

export const CCPA_REVENUE_THRESHOLDS_MIRROR: readonly CcpaRevenueThresholdRow[] = [
  { effective: "2020-01-01", amount: 25_000_000, label: "$25,000,000" },
  { effective: "2025-01-01", amount: 26_625_000, label: "$26,625,000" },
];

/** The threshold in force on an ISO date (default: today). */
export function ccpaRevenueThresholdOnMirror(isoDate?: string): CcpaRevenueThresholdRow {
  const d = isoDate ?? new Date().toISOString().slice(0, 10);
  let current = CCPA_REVENUE_THRESHOLDS_MIRROR[0];
  for (const t of CCPA_REVENUE_THRESHOLDS_MIRROR) if (t.effective <= d) current = t;
  return current;
}

/** Revenue earned in calendar year Y is tested against the figure in force on January 1 of Y+1. */
export function ccpaRevenueThresholdForYearMirror(referenceYear: number): CcpaRevenueThresholdRow {
  return ccpaRevenueThresholdOnMirror(`${referenceYear + 1}-01-01`);
}

/** The preceding calendar year — the default reference year for the threshold question. */
export function defaultRevenueReferenceYear(now: Date = new Date()): number {
  return now.getFullYear() - 1;
}
