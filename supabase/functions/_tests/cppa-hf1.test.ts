// CPPA-HF1 — deterministic-check coverage for H1/H2/H3.
import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import {
  checkH1ArticlePhrasing,
  checkH2InternalVocab,
  checkH3AdmtCitationDepth,
  runCppaHf1Checks,
  runAdmtHf1Checks,
  ADMT_VERIFIED_CITES,
} from "../_shared/grader/cppa-hf1-checks.ts";

Deno.test("H1 — bans 'Article 11 ADMT' / 'Article 10 CCPA' phrasing", () => {
  const bad = "The Article 11 ADMT obligations do not attach.";
  const [f] = checkH1ArticlePhrasing(bad);
  assertEquals(f.passed, false);
  assertEquals(f.check_id, "h1_article_phrasing");
});

Deno.test("H1 — GDPR Article NN is permitted (out of scope)", () => {
  const ok = "The controller must satisfy Article 6 GDPR before processing.";
  const [f] = checkH1ArticlePhrasing(ok);
  assertEquals(f.passed, true);
});

Deno.test("H2 — flags 'the sale/share-revenue determination-resolved determination'", () => {
  const bad = "the sale/share-revenue determination-resolved determination is engaged.";
  const findings = checkH2InternalVocab(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("H2 — flags raw intake field ids in prose", () => {
  const bad = "See i7_internal_contributors for the roster.";
  const findings = checkH2InternalVocab(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("H2 — clean prose passes", () => {
  const ok = "The record identifies five internal contributors, including legal counsel.";
  const findings = checkH2InternalVocab(ok);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("H3 — verified § 7222(b)(3)(A) passes", () => {
  const ok = "See § 7222(b)(3)(A) for the future-use disclosure requirement.";
  const findings = checkH3AdmtCitationDepth(ok);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("H3 — unverified § 7220(c)(5)(A) is flagged", () => {
  const bad = "The disclosure elements at § 7220(c)(5)(A)-(C) require …";
  const findings = checkH3AdmtCitationDepth(bad);
  const failed = findings.filter((f) => !f.passed);
  assertEquals(failed.length >= 1, true);
  assertEquals(failed[0].check_id, "h3_admt_citation_depth");
});

Deno.test("ADMT_VERIFIED_CITES contains parent sections", () => {
  for (const cite of ["7220", "7221", "7222", "7222(b)(3)(A)"]) {
    assertEquals(ADMT_VERIFIED_CITES.has(cite), true);
  }
});

Deno.test("runCppaHf1Checks — clean report passes all", () => {
  const clean = "The record establishes purpose limitation under § 7002. Further clarification is advisable.";
  const findings = runCppaHf1Checks(clean);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("runAdmtHf1Checks — chained failures aggregate", () => {
  const bad = "Article 11 CCPA obligations. See § 7220(c)(5)(B). the sensitive-PI determination-resolved determination applies.";
  const findings = runAdmtHf1Checks(bad);
  const failed = findings.filter((f) => !f.passed).map((f) => f.check_id);
  assertEquals(failed.includes("h1_article_phrasing"), true);
  assertEquals(failed.includes("h2_internal_vocab"), true);
  assertEquals(failed.includes("h3_admt_citation_depth"), true);
});
