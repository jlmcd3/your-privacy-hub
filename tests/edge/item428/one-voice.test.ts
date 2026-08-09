// ITEM 428 (PIECE B) — ONE SUMMARY VOICE: the architectural extension of R2/R7.
//
// R2/R7 at the architectural level: exactly one surface carries the narrative
// VERDICT, and no other surface restates it. The Risk document's summary class
// is now:
//
//   • executive_summary        — the single narrative verdict surface
//   • assessment_summary       — the TYPED fact strip (table, never prose)
//   • processing_narrative     — the one prose account of the processing
//   • submission_and_retention — the statutory block re-homed from the
//                                retired `submission_summary` (item428 Piece B)
//
// These tests pin: reader tolerance for the retired key, fact-strip typing
// (every value from its typed source, nothing model-composed) and the
// one-voice rule itself.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeRiskSummaryVoice } from "../../../supabase/functions/_shared/ltp/risk-summary-voice.ts";
import {
  buildFactStrip,
  coerceFactStrip,
  isRiskFactStrip,
  RISK_FACT_STRIP_TYPE,
} from "../../../supabase/functions/_shared/report-contracts/risk-fact-strip.ts";

const STATUTORY =
  "The business must submit this risk assessment to the Agency under § 7157(a)(1), " +
  "retain it under § 7155(c), and meet its § 7121(a)(3) cohort deadline of April 1, 2030. " +
  "Each § 7120(b) prong posture is stated above.";

function baseReport(): Record<string, unknown> {
  return {
    executive_summary: "The processing is permitted to proceed subject to the recorded safeguards.",
    submission_summary: STATUTORY,
    processing_narrative: ["The business processes employee biometric identifiers for access control."],
    company_name: "Acme Corp",
    industry: "Retail",
    risk_level: "Moderate",
    assessment_date: "2026-08-09",
  };
}

// ── READER TOLERANCE ────────────────────────────────────────────────────
Deno.test("[item428][one-voice] the retired submission_summary is re-homed, never dropped", () => {
  const report = baseReport();
  normalizeRiskSummaryVoice(report, {});
  assertEquals("submission_summary" in report, false, "the retired surface must not ship");
  assertEquals(
    report.submission_and_retention,
    STATUTORY,
    "the statutory block moves byte-for-byte onto its new surface",
  );
});

Deno.test("[item428][one-voice] a document already on the new surface is left alone", () => {
  const report = baseReport();
  delete report.submission_summary;
  report.submission_and_retention = STATUTORY;
  normalizeRiskSummaryVoice(report, {});
  assertEquals(report.submission_and_retention, STATUTORY);
});

Deno.test("[item428][one-voice] a document with neither key gains no invented surface", () => {
  const report = baseReport();
  delete report.submission_summary;
  normalizeRiskSummaryVoice(report, {});
  assertEquals("submission_and_retention" in report, false);
});

// ── ONE VOICE ───────────────────────────────────────────────────────────
Deno.test("[item428][one-voice] the statutory block never becomes the verdict voice", () => {
  const report = baseReport();
  report.executive_summary = "";
  normalizeRiskSummaryVoice(report, {});
  const verdict = String(report.executive_summary ?? "");
  assert(
    !verdict.includes("§ 7157(a)(1)"),
    "the statutory block must not be merged into the executive summary (second voice)",
  );
  assertEquals(report.submission_and_retention, STATUTORY);
});

Deno.test("[item428][one-voice] no surface restates the executive summary's verdict", () => {
  const report = baseReport();
  normalizeRiskSummaryVoice(report, {});
  const verdict = String(report.executive_summary ?? "");
  assert(verdict.length > 0, "the verdict surface must carry the verdict");
  for (const key of ["assessment_summary", "processing_narrative", "submission_and_retention"]) {
    const other = JSON.stringify(report[key] ?? null);
    assert(
      !other.includes(verdict),
      `${key} restates the executive summary's verdict — R2/R7 one-voice violation`,
    );
  }
});

// ── FACT-STRIP TYPING ───────────────────────────────────────────────────
Deno.test("[item428][fact-strip] assessment_summary is the typed strip, never prose", () => {
  const report = baseReport();
  normalizeRiskSummaryVoice(report, {});
  const strip = report.assessment_summary;
  assert(isRiskFactStrip(strip), `assessment_summary is not a typed fact strip: ${JSON.stringify(strip)}`);
  assertEquals((strip as { _typed: string })._typed, RISK_FACT_STRIP_TYPE);
  assertEquals(coerceFactStrip(strip).typed, true);
});

Deno.test("[item428][fact-strip] every value comes from its typed source, nothing composed", () => {
  const strip = buildFactStrip({
    company_name: "Acme Corp",
    sector: "Retail",
    assessment_date: "2026-08-09",
    overall_risk_level: "Moderate",
    triggered_activities: ["Automated decisionmaking"],
    exceptions_claimed: [],
    exceptions_status: "None claimed",
    admt_disclosure_required: true,
    cybersecurity_audit_required: false,
  });
  assertEquals(strip.company_name, "Acme Corp");
  assertEquals(strip.overall_risk_level, "Moderate");
  assertEquals(strip.admt_disclosure_required, true);
  assertEquals(strip.cybersecurity_audit_required, false);
  // Nothing model-composed: every scalar is a bare typed value, not a sentence.
  for (const v of [strip.company_name, strip.sector, strip.overall_risk_level, strip.exceptions_status]) {
    assert(
      !/\b(we |the business must|therefore|accordingly)\b/i.test(v),
      `fact-strip value looks model-composed: ${v}`,
    );
    assert(!v.endsWith("."), `fact-strip value is sentence-shaped: ${v}`);
  }
});
