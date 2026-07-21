// GRADER-CAL-5R — reproduce the 0ec3a1e3 signature and assert that the
// disclaimer-scoped counsel-ownership sentence is NOT counted as an e6
// counsel_referral once framework_disclaimer (and finding-record echoes)
// are excluded from the deterministic-check prose. A positive case asserts
// that genuine body-text counsel referrals still fire.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractProseFromReport } from "../_shared/advisory-voice.ts";
import { runFormatChecksGeneric } from "../_shared/grader/format-checks.ts";

const SANCTIONED_SENTENCE =
  "Your qualified Data Protection Officer or legal counsel must review, complete, and own it.";

// Reproduce the fix at the DPIA call-site: strip framework_disclaimer and
// jurisdiction_validation before extracting prose for deterministic checks.
function checksProse(report: Record<string, unknown>): string {
  const { framework_disclaimer: _fd, jurisdiction_validation: _jv, ...rest } = report;
  return extractProseFromReport(rest);
}

Deno.test("GRADER-CAL-5R: sanctioned sentence in framework_disclaimer + embedded finding records does NOT fire e6", () => {
  // Signature of dpia report 0ec3a1e3 (doc 1): sanctioned sentence appears
  // exactly 3 times — framework_disclaimer field + 2 embedded finding
  // records — zero body occurrences.
  const report = {
    executive_summary:
      "The record establishes the processing purpose and the controller identity; the record does not yet resolve the retention period, and recording that period completes the DPIA.",
    section_1_description: {
      narrative:
        "The DPO owns the description of processing operations and coordinates with the head of the affected business unit.",
    },
    section_4_risk_management: {
      measures: [
        { owner: "the CISO", measure: "restrict access to production data" },
      ],
    },
    framework_disclaimer:
      "This document helps your organisation structure its Data Protection Impact Assessment using the EDPB-endorsed Guidelines on DPIA (WP248 rev.01). It is not a completed DPIA and does not satisfy the requirements of GDPR Article 35 on its own. " +
      SANCTIONED_SENTENCE +
      " It does not constitute legal advice.",
    jurisdiction_validation: {
      findings: [
        { code: "note", severity: "info", evidence: SANCTIONED_SENTENCE },
        { code: "note", severity: "info", evidence: SANCTIONED_SENTENCE },
      ],
    },
    lint_warnings: [
      // lint_warnings is already reserved by extractProseFromReport, but we
      // include an echo here to prove exclusion is effective.
      { rule: "T-3", field: "preamble", context: SANCTIONED_SENTENCE },
    ],
  };

  const prose = checksProse(report);
  assert(
    !prose.includes(SANCTIONED_SENTENCE),
    "sanctioned sentence must not appear in checks-only prose",
  );
  const findings = runFormatChecksGeneric(prose);
  const e6 = findings.filter((f) => f.check_id === "e6_counsel_referral" && !f.passed);
  assertEquals(e6.length, 0, `expected 0 e6 hits, got: ${JSON.stringify(e6)}`);
});

Deno.test("GRADER-CAL-5R: genuine body-text counsel referral still fires e6", () => {
  const report = {
    executive_summary:
      "The organisation must consult legal counsel to determine whether the transfer instrument is adequate.",
    framework_disclaimer:
      "Your qualified Data Protection Officer or legal counsel must review, complete, and own it.",
  };
  const prose = checksProse(report);
  const findings = runFormatChecksGeneric(prose);
  const e6 = findings.filter((f) => f.check_id === "e6_counsel_referral" && !f.passed);
  assert(e6.length >= 1, `expected genuine body counsel referral to fire e6, got: ${JSON.stringify(findings)}`);
});

Deno.test("GRADER-CAL-5R: prior no-op ternary would have kept disclaimer in prose (negative control)", () => {
  // Prior implementation: both ternary branches passed an object identical
  // to reportData, so framework_disclaimer text WAS included. This test
  // documents that pre-fix behaviour by demonstrating the un-stripped path
  // still produces at least one e6 hit for the same input.
  const report = {
    executive_summary: "The DPO owns section 1 in coordination with the business unit.",
    framework_disclaimer:
      "This document helps your organisation. " + SANCTIONED_SENTENCE + " It does not constitute legal advice.",
  };
  const proseUnstripped = extractProseFromReport(report);
  assert(proseUnstripped.includes(SANCTIONED_SENTENCE));
  const findings = runFormatChecksGeneric(proseUnstripped);
  const e6 = findings.filter((f) => f.check_id === "e6_counsel_referral" && !f.passed);
  assert(e6.length >= 1, "negative control: pre-fix path should have produced an e6 hit");
});
