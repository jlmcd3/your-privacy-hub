/**
 * ITEM 426 — reader tolerance (five states), registry-resolved statutory_basis,
 * the conditionality rule in all three directions, and the CSC linkage.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  claimedExceptionKeys,
  coerceExceptionView,
  EXCEPTION_DOWNGRADE_BASIS,
  EXCEPTION_EXPLICIT_NONE_SENTENCE,
  EXCEPTION_PIN,
  exceptionTrigger,
  isRiskException,
  normalizeRiskExceptions,
  resolveExceptionPinpoint,
  RISK_EXCEPTION_LEAVES,
} from "../../../supabase/functions/_shared/report-contracts/risk-exceptions.ts";
import { runRiskCsc } from "../../../supabase/functions/_shared/ltp/risk-csc.ts";

const TYPED = {
  exception_name: "Transient use",
  claimed: true,
  statutory_basis: EXCEPTION_PIN.transient_use,
  scope_described: "Bid-request data inside the OpenRTB pipeline.",
  safeguards_described: "Deleted within 300 milliseconds.",
  documentation_status: "Data-flow logs retained.",
  missing_elements: [],
  validity_assessment: "Assessable on the record as it stands.",
  flags: [],
};

// ── reader tolerance — five states ──────────────────────────────────────────

Deno.test("ITEM 426 reader: absent", () => {
  const v = coerceExceptionView(undefined);
  assertEquals(v.shape, "absent");
  assertEquals(v.present, false);
});

Deno.test("ITEM 426 reader: empty array is a distinct state from absent", () => {
  assertEquals(coerceExceptionView([]).shape, "empty");
  assertEquals(coerceExceptionView([]).present, false);
});

Deno.test("ITEM 426 reader: string[] (hole defect preserved verbatim)", () => {
  const hole = "The assessment record includes  as required by 11 CCR § 7150(b)(1).";
  const v = coerceExceptionView([hole, "second"]);
  assertEquals(v.shape, "strings");
  assertEquals(v.texts, [hole, "second"]);
  assertEquals(v.rows.length, 0);
});

Deno.test("ITEM 426 reader: bare string", () => {
  const v = coerceExceptionView("one element");
  assertEquals(v.shape, "strings");
  assertEquals(v.texts, ["one element"]);
});

Deno.test("ITEM 426 reader: legacy object[] never drops a row", () => {
  const v = coerceExceptionView([{ statutory_basis: "Cal. Civ. Code § 1798.140(e)(4)" }]);
  assertEquals(v.shape, "legacy_objects");
  assertEquals(v.rows.length, 1);
  assertEquals(v.typed.length, 0);
});

Deno.test("ITEM 426 reader: canonical record[] is recognised as typed", () => {
  const v = coerceExceptionView([TYPED]);
  assertEquals(v.shape, "typed");
  assertEquals(v.typed.length, 1);
  for (const leaf of RISK_EXCEPTION_LEAVES) assert(leaf in v.typed[0]);
});

Deno.test("ITEM 426 reader: mixed strings + objects stays legacy_objects and keeps both", () => {
  const v = coerceExceptionView(["prose", { exception_name: "X" }]);
  assertEquals(v.shape, "legacy_objects");
  assertEquals(v.texts.length, 1);
  assertEquals(v.rows.length, 1);
});

// ── deterministic statutory_basis ───────────────────────────────────────────

Deno.test("ITEM 426 registry: every emitted statutory_basis byte-matches its pin; none null", () => {
  const intake = {
    exceptions_intake: Object.fromEntries(
      Object.keys(EXCEPTION_PIN).map((k) => [k, { claimed: true }]),
    ),
  };
  const report: Record<string, unknown> = {};
  const s = normalizeRiskExceptions(report, intake);
  assertEquals(s.action, "typed");
  const rows = report.exception_analysis as Record<string, unknown>[];
  assertEquals(rows.length, Object.keys(EXCEPTION_PIN).length);
  const seen = new Set<string>();
  for (const r of rows) {
    assert(isRiskException(r), "every emitted row satisfies the nine-leaf contract");
    const key = String(r._exception_key);
    assertEquals(r.statutory_basis, EXCEPTION_PIN[key], `pin mismatch for ${key}`);
    assert(r.statutory_basis && String(r.statutory_basis).length > 0, "no null basis");
    // No duplicate basis across leaves EXCEPT the two keys the registry itself
    // pins to the same provision (fraud_detection / security_integrity).
    if (key !== "security_integrity") {
      assert(!seen.has(r.statutory_basis), `duplicated basis across leaves: ${key}`);
      seen.add(r.statutory_basis);
    }
  }
});

Deno.test("ITEM 426 registry: an unknown exception type takes the honest downgrade", () => {
  assertEquals(resolveExceptionPinpoint("not_a_real_key").statutory_basis, EXCEPTION_DOWNGRADE_BASIS);
  assertEquals(resolveExceptionPinpoint(undefined).resolved, false);
  const report: Record<string, unknown> = {};
  normalizeRiskExceptions(report, { exceptions_intake: { moon_landing: { claimed: true } } });
  const rows = report.exception_analysis as Record<string, unknown>[];
  assertEquals(rows[0].statutory_basis, EXCEPTION_DOWNGRADE_BASIS);
  assertEquals(rows[0]._basis_source, "registry_downgrade_unresolved");
  assert((rows[0].flags as string[]).some((f) => /counsel review/i.test(f)));
});

// ── conditionality — all three directions ───────────────────────────────────

Deno.test("ITEM 426 conditionality: CLAIMED ⇒ typed records", () => {
  const report: Record<string, unknown> = { exception_analysis: [] };
  const s = normalizeRiskExceptions(report, {
    exceptions_intake: { debugging: { claimed: true, scope: "s", safeguards: "g", documentation: "d" } },
  });
  assertEquals(s.trigger, "claimed");
  assertEquals(s.action, "typed");
  assertEquals(s.padding_removed, true);
  const rows = report.exception_analysis as Record<string, unknown>[];
  assertEquals(rows.length, 1);
  assertEquals(rows[0].missing_elements, []);
});

Deno.test("ITEM 426 conditionality: EXPLICIT NONE ⇒ the one honest sentence", () => {
  const report: Record<string, unknown> = { exception_analysis: [] };
  const s = normalizeRiskExceptions(report, { exceptions_intake: {} });
  assertEquals(s.trigger, "explicit_none");
  assertEquals(report.exception_analysis, [EXCEPTION_EXPLICIT_NONE_SENTENCE]);
});

Deno.test("ITEM 426 conditionality: NEITHER ⇒ key absent (padding ends)", () => {
  const report: Record<string, unknown> = { exception_analysis: [] };
  const s = normalizeRiskExceptions(report, { q1_revenue: "Over $100M" });
  assertEquals(s.trigger, "absent");
  assertEquals(s.action, "omitted");
  assertEquals(s.padding_removed, true);
  assert(!("exception_analysis" in report), "the key must be DELETED, not emptied");
});

Deno.test("ITEM 426 r5c: a blank exceptions block is a SUBSTANTIVE negative answer", () => {
  // emptyIsAnswer — presence of the block, however blank, answers the question.
  assertEquals(exceptionTrigger({ exceptions_intake: {} }), "explicit_none");
  assertEquals(exceptionTrigger({ exceptions_intake: null }), "explicit_none");
  assertEquals(exceptionTrigger({ exceptions_intake: { debugging: { claimed: false } } }), "explicit_none");
  // Absence of the block is NOT an answer.
  assertEquals(exceptionTrigger({}), "absent");
  assertEquals(claimedExceptionKeys({ exceptions_intake: { debugging: true } }), ["debugging"]);
});

Deno.test("ITEM 426 fail-open: a legacy document we did not author is not rewritten", () => {
  const legacy = [{ exception_name: "Transient use", statutory_basis: "Cal. Civ. Code § 1798.140(e)(4)" }];
  const report: Record<string, unknown> = { exception_analysis: legacy };
  const s = normalizeRiskExceptions(report, { exceptions_intake: {} });
  assertEquals(s.action, "left_legacy");
  assertEquals(report.exception_analysis, legacy);
});

// ── CSC linkage (detection semantics unchanged) ─────────────────────────────

Deno.test("ITEM 426 CSC linkage: r2 still fires on a legacy row, unchanged", () => {
  const report: Record<string, unknown> = {
    exception_analysis: [{ status: "claimed", text: "the business claims the exception applies" }],
  };
  const t = runRiskCsc(report, { intake: { exceptions_intake: {} } });
  const hits = t.violations.filter((v) => v.check_id === "r2_exception_vs_record");
  assertEquals(hits.length, 1);
  assertEquals((report.exception_analysis as Record<string, unknown>[])[0].status, "not_claimed");
});

Deno.test("ITEM 426 CSC linkage: the TYPED emission stays inside r2's detection vocabulary", () => {
  const report: Record<string, unknown> = { exception_analysis: [{ ...TYPED }] };
  const t = runRiskCsc(report, { intake: { exceptions_intake: {} } });
  const hits = t.violations.filter((v) => v.check_id === "r2_exception_vs_record");
  assertEquals(hits.length, 1, "claimed:true must be visible to r2");
  const row = (report.exception_analysis as Record<string, unknown>[])[0];
  assertEquals(row.claimed, false);
  assertEquals(row.status, "not_claimed");
});

Deno.test("ITEM 426 CSC linkage: no violation when the record DOES claim the exception", () => {
  const report: Record<string, unknown> = { exception_analysis: [{ ...TYPED }] };
  const t = runRiskCsc(report, { intake: { exceptions_intake: { transient_use: { claimed: true } } } });
  assertEquals(t.violations.filter((v) => v.check_id === "r2_exception_vs_record").length, 0);
  assertEquals((report.exception_analysis as Record<string, unknown>[])[0].claimed, true);
});
