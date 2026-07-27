import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyCohortAppendIfAbsent } from "./cohort-append.ts";

Deno.test("cohort-append: appends when indeterminate and absent", () => {
  const report: any = { submission_summary: { submission_basis: "existing note" } };
  const res = applyCohortAppendIfAbsent(report, { q1_revenue: "$25M to under $50M" });
  assertEquals(res.appended, true);
  assertEquals(res.reason, "indeterminate_band_appended");
  if (!/§ 7121\(a\) cohort conditional/i.test(report.submission_summary.submission_basis)) {
    throw new Error(`clause not appended: ${report.submission_summary.submission_basis}`);
  }
});

Deno.test("cohort-append: idempotent when already present", () => {
  const report: any = { submission_summary: { submission_basis: "note; § 7121(a) cohort conditional — April 1, 2029..." } };
  const res = applyCohortAppendIfAbsent(report, { q1_revenue: "$25M to under $50M" });
  assertEquals(res.appended, false);
  assertEquals(res.reason, "already_present");
});

Deno.test("cohort-append: no-op when band resolved", () => {
  const report: any = { submission_summary: { submission_basis: "note" } };
  const res = applyCohortAppendIfAbsent(report, { q1_revenue: "Over $100M" });
  assertEquals(res.appended, false);
  assertEquals(res.reason, "band_resolved");
});

Deno.test("cohort-append: fail-open on missing summary", () => {
  const res = applyCohortAppendIfAbsent({}, { q1_revenue: "$25M to under $50M" });
  assertEquals(res.appended, false);
  assertEquals(res.reason, "no_summary");
});
