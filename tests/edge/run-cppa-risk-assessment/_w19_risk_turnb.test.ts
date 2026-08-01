// WAVE19-FIX TURN B — D2/B1 reconciliation guard ledger-consult tests.
//
// Contract (from courier):
//   - Over-enforce case: ledger supports the fact → report unchanged, no
//     reconciliation template, no reconciliation telemetry (only the new
//     suppression counter increments).
//   - Under-enforce case: no ledger support → reconciliation template
//     still fires (D2 legacy behaviour preserved).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyW10RiskB1, W19_RISK_TURNB_STAMP } from "./_w10_risk_b1.ts";

Deno.test("W19-TURNB: stamp present and shaped", () => {
  assert(W19_RISK_TURNB_STAMP.startsWith("w19-risk-turnb@"));
});

Deno.test("W19-TURNB over-enforce: ledger-supported fact → guard is strict no-op (i6_vendors type case)", () => {
  const intake = {
    q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
    i6_vendors: "AWS/Stripe/SendGrid",
  };
  // Sentence would match the D2 profiling-denial regex ("no systematic
  // observation"), but the ledger has a supporting entry for the fact
  // being reconciled (i6_vendors verbatim value appears in the sentence).
  const original = "The intake reflects no systematic observation beyond AWS/Stripe/SendGrid vendor telemetry.";
  const report = { executive_summary: original };
  const { counters } = applyW10RiskB1(report, intake);
  // Strict no-op: text unchanged, no reconciliation template emitted.
  assertEquals((report as Record<string, unknown>).executive_summary, original);
  // No reconciliation-downgrade telemetry.
  assertEquals(counters.profiling_denials_downgraded, 0);
  // Suppression counter incremented exactly once.
  assertEquals(counters.d2b1_reconciliation_suppressed_by_ledger, 1);
});

Deno.test("W19-TURNB under-enforce: no ledger support → reconciliation template still fires", () => {
  const intake = {
    q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
  };
  const original = "The record shows no systematic observation and no profiling.";
  const report = { executive_summary: original };
  const { counters } = applyW10RiskB1(report, intake);
  const out = (report as Record<string, unknown>).executive_summary as string;
  assert(
    out.includes("does not support this statement") || out.includes("must be reconciled"),
    `expected reconciliation template, got: ${out}`,
  );
  assert(counters.profiling_denials_downgraded >= 1);
  assertEquals(counters.d2b1_reconciliation_suppressed_by_ledger, 0);
});

Deno.test("W19-TURNB: intake denies profiling → D2 never fires (legacy invariant)", () => {
  const intake = { q5b_profiling_observation: "No" };
  const original = "The record shows no systematic observation.";
  const report = { executive_summary: original };
  const { counters } = applyW10RiskB1(report, intake);
  assertEquals((report as Record<string, unknown>).executive_summary, original);
  assertEquals(counters.profiling_denials_scanned, 0);
  assertEquals(counters.d2b1_reconciliation_suppressed_by_ledger, 0);
});

Deno.test("W19-TURNB: suppression counter present on empty run (schema stability)", () => {
  const { counters } = applyW10RiskB1({}, {});
  assertEquals(counters.d2b1_reconciliation_suppressed_by_ledger, 0);
});
