// W6-CYBER-FIX unit tests.
import { assertEquals, assert } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import {
  applyW6CyberFix,
  truncateRegulatoryBasisInflation,
  rewriteFrameworkOverride,
  scrubCrossControlDerivedFigures,
  W6_CYBER_FIX_VERSION,
} from "./_w6_cyber_fix.ts";

Deno.test("W6-CYBER (1) — regulatory_basis inflation with 'including' is truncated", () => {
  const s = "encryption of personal information at rest and in transit, including key management practices and field-level protections for PII";
  const { out, truncated } = truncateRegulatoryBasisInflation(s);
  assertEquals(truncated, true);
  assertEquals(out, "encryption of personal information at rest and in transit");
});

Deno.test("W6-CYBER (1) — 'mean time to remediate' token drops the trailing operational-metric clause", () => {
  const s = "vulnerability management and remediation tracking, with mean time to remediate targets";
  const { out, truncated } = truncateRegulatoryBasisInflation(s);
  assertEquals(truncated, true);
  assert(!/mean time to remediate/i.test(out), out);
  assertEquals(out, "vulnerability management and remediation tracking");
});

Deno.test("W6-CYBER (1) — clean noun phrase is untouched", () => {
  const s = "the encryption of personal information as required by the component";
  const { out, truncated } = truncateRegulatoryBasisInflation(s);
  assertEquals(truncated, false);
  assertEquals(out, s);
});

Deno.test("W6-CYBER (2) — HITRUST intake: 'as required under 11 CCR § 7123(e)' NIST framing rewritten to optional crosswalk", () => {
  const s = "Frame remediation around log ingestion pipelines corresponding to the Detect function of NIST CSF 2.0, as required under 11 CCR § 7123(e), so that alerts are triaged within an hour.";
  const { out, rewritten } = rewriteFrameworkOverride(s, "HITRUST");
  assert(rewritten >= 1);
  assert(!/as required under/i.test(out), out);
  assert(/optional/i.test(out), out);
  assert(/HITRUST/.test(out), out);
});

Deno.test("W6-CYBER (2) — NIST-CSF-elected intake: NO rewrite", () => {
  const s = "corresponding to the Protect function of NIST CSF 2.0, as required under 11 CCR § 7123(e)";
  const { out, rewritten } = rewriteFrameworkOverride(s, "NIST CSF 2.0");
  assertEquals(rewritten, 0);
  assertEquals(out, s);
});

Deno.test("W6-CYBER (2) — missing intake framework: NO rewrite (safe default)", () => {
  const s = "as required under NIST CSF 2.0";
  const { out, rewritten } = rewriteFrameworkOverride(s, undefined);
  assertEquals(rewritten, 0);
  assertEquals(out, s);
});

Deno.test("W6-CYBER (2) — SOC 2 intake: bare 'as required under NIST CSF 2.0' rewritten", () => {
  const s = "…retain the maturity attestation as required under NIST CSF 2.0.";
  const { out, rewritten } = rewriteFrameworkOverride(s, "SOC 2");
  assertEquals(rewritten, 1);
  assert(/optional crosswalk to NIST CSF 2\.0/i.test(out), out);
});

Deno.test("W6-CYBER (3) — 'based on the stated population of 580 total users' scrubbed to labelled-derived form", () => {
  const s = "approximately 16-17 accounts at the reported completion rate, based on the stated population of 580 total users across engineering and staff";
  const { out, scrubbed } = scrubCrossControlDerivedFigures(s);
  assert(scrubbed >= 1);
  assert(!/580/.test(out), out);
  assert(/derived/i.test(out), out);
});

Deno.test("W6-CYBER (3) — 'approximately N–M accounts at the reported completion rate' labelled derived when population line absent", () => {
  const s = "approximately 16–17 accounts at the reported completion rate remain outstanding.";
  const { out, scrubbed } = scrubCrossControlDerivedFigures(s);
  assert(scrubbed >= 1);
  assert(/derived estimate/i.test(out), out);
});

Deno.test("W6-CYBER orchestrator — HITRUST intake rewrites NIST framing and truncates regulatory_basis", () => {
  const report: any = {
    executive_summary: "Frame remediation around log ingestion corresponding to the Detect function of NIST CSF 2.0, as required under 11 CCR § 7123(e).",
    controls: [
      {
        control: "encryption",
        finding: "based on the stated population of 580 total users across engineering and staff",
        remediation: "align with the Protect function of NIST CSF 2.0, as required under 11 CCR § 7123(e)",
        regulatory_basis: "Assessed under 11 CCR § 7123(c)(2): the annual cybersecurity audit must assess encryption of personal information at rest and in transit, including key management practices and field-level protections for PII, as applicable to the business.",
      },
    ],
  };
  const intake: any = { profile: { framework: "HITRUST" } };
  const counters = applyW6CyberFix(report, intake);
  assert(counters.frameworkRewritten >= 2);
  assert(counters.regulatoryBasisTruncated >= 1);
  assert(counters.derivedFiguresScrubbed >= 1);
  assertEquals(counters.framework, "HITRUST");
  const c = report.controls[0];
  assertEquals(
    c.regulatory_basis,
    "Assessed under 11 CCR § 7123(c)(2): the annual cybersecurity audit must assess encryption of personal information at rest and in transit, as applicable to the business.",
  );
  assert(!/580/.test(c.finding), c.finding);
  assert(!/as required under/i.test(c.remediation), c.remediation);
  assert(!/as required under/i.test(report.executive_summary), report.executive_summary);
});

Deno.test("W6-CYBER orchestrator — NIST-elected intake: no framework rewrites", () => {
  const report: any = {
    controls: [
      {
        control: "detect",
        remediation: "align with the Detect function of NIST CSF 2.0, as required under 11 CCR § 7123(e)",
        regulatory_basis: "Assessed under 11 CCR § 7123(c)(6): the annual cybersecurity audit must assess vulnerability management, as applicable to the business.",
      },
    ],
  };
  const intake: any = { profile: { framework: "NIST CSF 2.0" } };
  const counters = applyW6CyberFix(report, intake);
  assertEquals(counters.frameworkRewritten, 0);
  assert(/as required under/i.test(report.controls[0].remediation));
});

Deno.test("W6-CYBER orchestrator — idempotent (second pass is a no-op)", () => {
  const report: any = {
    controls: [
      {
        control: "encryption",
        remediation: "align with the Protect function of NIST CSF 2.0, as required under 11 CCR § 7123(e)",
        regulatory_basis: "Assessed under 11 CCR § 7123(c)(2): the annual cybersecurity audit must assess encryption of personal information at rest and in transit, including key management practices, as applicable to the business.",
      },
    ],
  };
  const intake: any = { profile: { framework: "SOC 2" } };
  const first = applyW6CyberFix(report, intake);
  const snapshot = JSON.stringify(report);
  const second = applyW6CyberFix(report, intake);
  assertEquals(JSON.stringify(report), snapshot);
  assertEquals(second.frameworkRewritten, 0);
  assertEquals(second.regulatoryBasisTruncated, 0);
  assert(first.frameworkRewritten >= 1);
});

Deno.test("W6-CYBER version stamp shape", () => {
  assert(/^w6-cyber-fix@\d{4}-\d{2}-\d{2}$/.test(W6_CYBER_FIX_VERSION));
});
