// Cyber master review (2026-09-15, F06) — MIRROR PARITY for the dated CCPA
// revenue threshold. The intake page names the figure from
// src/lib/ccpaRevenueThreshold.ts; the engine tests against
// _shared/bands/revenue-consumer.ts. They must agree row for row.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CCPA_REVENUE_THRESHOLDS, ccpaRevenueThresholdForYear, ccpaRevenueThresholdOn } from "../../../supabase/functions/_shared/bands/revenue-consumer.ts";
import { CCPA_REVENUE_THRESHOLDS_MIRROR, ccpaRevenueThresholdForYearMirror, ccpaRevenueThresholdOnMirror } from "../../../src/lib/ccpaRevenueThreshold.ts";

Deno.test("revenue threshold mirror — same dated rows as the engine", () => {
  assertEquals(
    CCPA_REVENUE_THRESHOLDS_MIRROR.map((t) => [t.effective, t.amount, t.label]),
    CCPA_REVENUE_THRESHOLDS.map((t) => [t.effective, t.amount, t.label]),
  );
});

Deno.test("revenue threshold mirror — same resolution on dates and reference years", () => {
  for (const d of ["2021-06-30", "2024-12-31", "2025-01-01", "2026-09-16", "2027-01-01"]) {
    assertEquals(ccpaRevenueThresholdOnMirror(d).amount, ccpaRevenueThresholdOn(d).amount, d);
  }
  for (const y of [2022, 2023, 2024, 2025, 2026]) {
    assertEquals(ccpaRevenueThresholdForYearMirror(y).amount, ccpaRevenueThresholdForYear(y).amount, String(y));
  }
});
