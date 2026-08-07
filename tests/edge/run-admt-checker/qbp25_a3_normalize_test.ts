// QB-P25 A3 normalizer unit tests (Turn B1 / B0-a carried from A3).
// Run: `deno test supabase/functions/run-admt-checker/qbp25_a3_normalize_test.ts`
//
// Exercises the extracted normalizer directly, without invoking the generator:
//   - enum coercion (compliant → "na"; unknown + ca_consumer_count present →
//     "per_consumer_scalable"; unknown + absent → "per_violation"; known enum
//     preserved).
//   - compact-mode key stripping when determination_basis === "conservative_assumption".
//   - legacy determination_basis default ("" / missing / bogus → "established").
//   - duty_if_in_scope synthesis fallback (from remediation → finding → element).

import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  normalizeQbp25A3,
  coerceExposure,
  hasCaConsumerCount,
  COMPACT_KEYS,
} from "../../../supabase/functions/run-admt-checker/_qbp25_a3_normalize.ts";

// ── enum coercion ────────────────────────────────────────────────────────────

Deno.test("coerceExposure — known enum values pass through", () => {
  assertEquals(coerceExposure("per_violation", "gap", false), "per_violation");
  assertEquals(coerceExposure("per_consumer_scalable", "gap", true), "per_consumer_scalable");
  assertEquals(coerceExposure("na", "compliant", false), "na");
});

Deno.test("coerceExposure — compliant status forces 'na' regardless of prior value", () => {
  assertEquals(coerceExposure("$2,500 per violation", "compliant", true), "na");
  assertEquals(coerceExposure(undefined, "compliant", false), "na");
});

Deno.test("coerceExposure — unknown + ca_consumer_count present → per_consumer_scalable", () => {
  assertEquals(coerceExposure("scales per consumer, $2,500 each", "gap", true), "per_consumer_scalable");
  assertEquals(coerceExposure(null, "gap", true), "per_consumer_scalable");
});

Deno.test("coerceExposure — unknown + ca_consumer_count absent → per_violation", () => {
  assertEquals(coerceExposure("varies", "gap", false), "per_violation");
  assertEquals(coerceExposure(undefined, "gap", false), "per_violation");
});

Deno.test("hasCaConsumerCount — 'not provided' variants treated as absent", () => {
  assertEquals(hasCaConsumerCount(""), false);
  assertEquals(hasCaConsumerCount("   "), false);
  assertEquals(hasCaConsumerCount("Not provided"), false);
  assertEquals(hasCaConsumerCount("not   provided"), false);
  assertEquals(hasCaConsumerCount("500,000"), true);
  assertEquals(hasCaConsumerCount(250000), true);
});

// ── ca_consumer_count disambiguation via full normalizer ─────────────────────

Deno.test("normalizeQbp25A3 — FULL mode: ca_consumer_count present routes unknowns to per_consumer_scalable", () => {
  const report: any = {
    scope_analysis: { determination_basis: "established" },
    notice_gaps: [
      { element_id: "notice_purpose", status: "gap", enforcement_exposure: "$2,500 per affected consumer" },
      { element_id: "notice_output", status: "compliant", enforcement_exposure: "n/a per consumer" },
    ],
    opt_out_gaps: [],
    access_gaps: [{ element_id: "access_scope", status: "gap", enforcement_exposure: "per_violation" }],
  };
  const r = normalizeQbp25A3(report, { ca_consumer_count: "500,000" });
  assertEquals(r.detBasis, "established");
  assertEquals(report.notice_gaps[0].enforcement_exposure, "per_consumer_scalable");
  assertEquals(report.notice_gaps[1].enforcement_exposure, "na");
  // known enum preserved
  assertEquals(report.access_gaps[0].enforcement_exposure, "per_violation");
  assertEquals(r.exposureCoerced, 2);
});

Deno.test("normalizeQbp25A3 — FULL mode: ca_consumer_count absent routes unknowns to per_violation", () => {
  const report: any = {
    scope_analysis: { determination_basis: "established" },
    notice_gaps: [{ element_id: "notice_purpose", status: "gap", enforcement_exposure: "some free-form text" }],
    opt_out_gaps: [],
    access_gaps: [],
  };
  normalizeQbp25A3(report, { ca_consumer_count: "Not provided" });
  assertEquals(report.notice_gaps[0].enforcement_exposure, "per_violation");
});

// ── compact-mode stripping ───────────────────────────────────────────────────

Deno.test("normalizeQbp25A3 — COMPACT mode strips non-compact keys and preserves compact set", () => {
  const report: any = {
    scope_analysis: { determination_basis: "conservative_assumption" },
    notice_gaps: [
      {
        element_id: "notice_purpose",
        element: "Pre-use notice describing the ADMT decision",
        status: "gap",
        finding: "No pre-use notice today.",
        remediation: "Publish a pre-use notice describing the specific decision. Roll it out at collection.",
        enforcement_exposure: "per_violation",
        sample_language: "We use ADMT to …",
        usage_note: "Insert at signup flow.",
        duty_if_in_scope: "Provide a pre-use notice before collection.",
        citation: "",
      },
    ],
    opt_out_gaps: [],
    access_gaps: [],
  };
  normalizeQbp25A3(report, {});
  const entry = report.notice_gaps[0];
  const keys = new Set(Object.keys(entry));
  for (const k of keys) assert(COMPACT_KEYS.has(k), `unexpected surviving key: ${k}`);
  assertEquals(entry.duty_if_in_scope, "Provide a pre-use notice before collection.");
  assertEquals(entry.citation, "");
  assertEquals(entry.element_id, "notice_purpose");
});

// ── legacy default for determination_basis ───────────────────────────────────

Deno.test("normalizeQbp25A3 — missing determination_basis defaults to 'established'", () => {
  const report: any = { scope_analysis: {}, notice_gaps: [], opt_out_gaps: [], access_gaps: [] };
  const r = normalizeQbp25A3(report, {});
  assertEquals(r.detBasisDefaulted, true);
  assertEquals(report.scope_analysis.determination_basis, "established");
  assertEquals(r.detBasis, "established");
});

Deno.test("normalizeQbp25A3 — bogus determination_basis defaults to 'established'", () => {
  const report: any = {
    scope_analysis: { determination_basis: "maybe_probably" },
    notice_gaps: [], opt_out_gaps: [], access_gaps: [],
  };
  const r = normalizeQbp25A3(report, {});
  assertEquals(r.detBasisDefaulted, true);
  assertEquals(report.scope_analysis.determination_basis, "established");
});

Deno.test("normalizeQbp25A3 — determination_basis absent scope_analysis entirely still defaults", () => {
  const report: any = { notice_gaps: [], opt_out_gaps: [], access_gaps: [] };
  const r = normalizeQbp25A3(report, {});
  // scope_analysis is not created; but detBasis defaults for gap-processing.
  assertEquals(r.detBasis, "established");
});

// ── duty_if_in_scope synthesis fallback ──────────────────────────────────────

Deno.test("synthesis fallback — from remediation (first sentence)", () => {
  const report: any = {
    scope_analysis: { determination_basis: "conservative_assumption" },
    notice_gaps: [{
      element_id: "notice_purpose",
      element: "Pre-use notice",
      remediation: "Publish a pre-use notice before collection. Roll it out at signup.",
      finding: "Not present.",
    }],
    opt_out_gaps: [],
    access_gaps: [],
  };
  const r = normalizeQbp25A3(report, {});
  assertEquals(
    report.notice_gaps[0].duty_if_in_scope,
    "Publish a pre-use notice before collection.",
  );
  assertEquals(r.dutySynthesized, 1);
});

Deno.test("synthesis fallback — falls through to finding when remediation missing", () => {
  const report: any = {
    scope_analysis: { determination_basis: "conservative_assumption" },
    notice_gaps: [{ element_id: "notice_purpose", element: "Pre-use notice", finding: "No notice today. Additional context." }],
    opt_out_gaps: [], access_gaps: [],
  };
  normalizeQbp25A3(report, {});
  assertEquals(report.notice_gaps[0].duty_if_in_scope, "No notice today.");
});

Deno.test("synthesis fallback — falls through to element when remediation and finding missing", () => {
  const report: any = {
    scope_analysis: { determination_basis: "conservative_assumption" },
    notice_gaps: [{ element_id: "notice_purpose", element: "Pre-use notice describing the ADMT decision" }],
    opt_out_gaps: [], access_gaps: [],
  };
  normalizeQbp25A3(report, {});
  assertEquals(
    report.notice_gaps[0].duty_if_in_scope,
    "Pre-use notice describing the ADMT decision",
  );
});

Deno.test("synthesis fallback — empty-string duty_if_in_scope is treated as missing and synthesized", () => {
  const report: any = {
    scope_analysis: { determination_basis: "conservative_assumption" },
    notice_gaps: [{
      element_id: "notice_purpose",
      element: "Pre-use notice",
      duty_if_in_scope: "   ",
      remediation: "Publish a pre-use notice before collection.",
    }],
    opt_out_gaps: [], access_gaps: [],
  };
  const r = normalizeQbp25A3(report, {});
  assertEquals(report.notice_gaps[0].duty_if_in_scope, "Publish a pre-use notice before collection.");
  assertEquals(r.dutySynthesized, 1);
});

Deno.test("synthesis fallback — pre-existing duty_if_in_scope preserved (no synthesis)", () => {
  const report: any = {
    scope_analysis: { determination_basis: "conservative_assumption" },
    notice_gaps: [{
      element_id: "notice_purpose",
      element: "Pre-use notice",
      duty_if_in_scope: "Author-supplied duty text.",
      remediation: "Would-be synthesized text.",
    }],
    opt_out_gaps: [], access_gaps: [],
  };
  const r = normalizeQbp25A3(report, {});
  assertEquals(report.notice_gaps[0].duty_if_in_scope, "Author-supplied duty text.");
  assertEquals(r.dutySynthesized, 0);
});
