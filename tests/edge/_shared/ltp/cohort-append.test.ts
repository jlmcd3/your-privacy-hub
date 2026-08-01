import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyCohortAppendIfAbsent } from "../../../../supabase/functions/_shared/ltp/cohort-append.ts";

// ITEM-204: cohort-append is RETIRED (Defect B). The graded surface now
// renders the full § 7121(a) phase-in schedule via cyber-audit-schedule.ts.
// This function is a permanent no-op; tests pin that contract.

Deno.test("cohort-append: RETIRED — no-op on indeterminate band (legacy)", () => {
  const report: any = { submission_summary: { submission_basis: "existing note" } };
  const res = applyCohortAppendIfAbsent(report, { q1_revenue: "$25M–$100M" });
  assertEquals(res.appended, false);
  assertEquals(report.submission_summary.submission_basis, "existing note");
});

Deno.test("cohort-append: RETIRED — no-op on resolved band", () => {
  const report: any = { submission_summary: { submission_basis: "note" } };
  const res = applyCohortAppendIfAbsent(report, { q1_revenue: "Over $100M" });
  assertEquals(res.appended, false);
  assertEquals(report.submission_summary.submission_basis, "note");
});

Deno.test("cohort-append: RETIRED — fail-open on empty inputs", () => {
  const res = applyCohortAppendIfAbsent({}, {});
  assertEquals(res.appended, false);
});
