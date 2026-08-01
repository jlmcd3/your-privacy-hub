// ITEM 343 — emit-gate degrade defect on the LTP report shape.
//
// Repro (Item 342 smoke finding 1, Item 335 doc #1 payload): the LTP shape
// carries ROOT-level prose sections, so degrade()'s parent is the report
// root — where `information_needed` is the honest-degradation ARRAY. The
// old code overwrote that array with scalar `true`, losing the two
// §7152(a)(6)/(a)(7) rows.

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { runEmitGate } from "./emit-gate.ts";

const wellFormed =
  "The record identifies the certifying executive as the reported contact; the intake supports this position and no additional confirmation is required at this stage.";
const wellFormed2 =
  "Retention practice is documented in the intake as a 24-month ceiling with quarterly review, which the assessment carries forward without modification for the current draft.";

/** The two honest-degradation rows the Item 342 payload carried. */
const ITEM_342_ROWS = [
  {
    id: "info_7152_a_6",
    topic: "negative_impacts",
    prompt:
      "Confirm the negative impacts to consumer privacy identified under \u00a7 7152(a)(6).",
  },
  {
    id: "info_7152_a_7",
    topic: "safeguards",
    prompt:
      "Confirm the safeguards the business plans to implement under \u00a7 7152(a)(7).",
  },
];

function ltpPayload() {
  return {
    // ROOT-level prose sections (LTP shape).
    opening_summary:
      "Reconcile the record on i1b_min_pi against the intake, since the current position cannot be supported without further evidence collected.",
    executive_summary: wellFormed,
    assessment_summary: wellFormed2,
    processing_narrative: wellFormed,
    scope_and_triggers: wellFormed2,
    record_sufficiency: wellFormed,
    submission_summary: wellFormed2,
    information_needed: ITEM_342_ROWS.map((r) => ({ ...r })),
  } as Record<string, any>;
}

Deno.test("ITEM 343: LTP shape — degrade preserves information_needed array (2 \u00a77152(a)(6)/(a)(7) rows survive)", () => {
  const report = ltpPayload();
  runEmitGate(report, { tool: "cppa_risk_assessment", intakeRoster: {} });

  // Degradation actually happened on the offending root-level leaf.
  assertEquals(report.opening_summary.includes("i1b_min_pi"), false);
  assert(report._meta.internal.emit_gate.degraded_count >= 1);

  // THE DEFECT: array must never become a scalar.
  assert(
    Array.isArray(report.information_needed),
    `information_needed must stay an array; got ${typeof report.information_needed}`,
  );
  const ids = report.information_needed.map((r: any) => r.id);
  assert(ids.includes("info_7152_a_6"), "\u00a7 7152(a)(6) row must survive");
  assert(ids.includes("info_7152_a_7"), "\u00a7 7152(a)(7) row must survive");

  // The gate appends its own row rather than replacing.
  const appended = report.information_needed.filter(
    (r: any) => r.source === "emit_gate",
  );
  assertEquals(appended.length, 1);
  assertEquals(appended[0].path, "$.opening_summary");
});

Deno.test("ITEM 343: append is idempotent across repeated gate runs", () => {
  const report = ltpPayload();
  runEmitGate(report, { tool: "cppa_risk_assessment", intakeRoster: {} });
  const first = report.information_needed.length;
  runEmitGate(report, { tool: "cppa_risk_assessment", intakeRoster: {} });
  assertEquals(report.information_needed.length, first);
});

Deno.test("ITEM 343: legacy shape behavior stays byte-identical (scalar true)", () => {
  const report: Record<string, any> = {
    reason:
      "Insufficient information to score this system; please supply the missing intake dimensions and re-run the assessment for a complete result.",
    exec_summary: wellFormed,
    scope: wellFormed2,
    notes: wellFormed,
    tail: wellFormed2,
  };
  runEmitGate(report, { tool: "cppa_risk_assessment" });
  assertEquals(report.information_needed, true);
});

Deno.test("ITEM 343: non-array truthy information_needed is still coerced to scalar true (legacy)", () => {
  const report: Record<string, any> = {
    reason:
      "Insufficient information to score this system; please supply the missing intake dimensions and re-run the assessment for a complete result.",
    exec_summary: wellFormed,
    scope: wellFormed2,
    notes: wellFormed,
    tail: wellFormed2,
    information_needed: true,
  };
  runEmitGate(report, { tool: "cppa_risk_assessment" });
  assertEquals(report.information_needed, true);
});
