// CPPA-HF1/HF2 — deterministic-check coverage for H1/H2/H3/H4.
import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import {
  checkH1ArticlePhrasing,
  checkH2InternalVocab,
  checkH3AdmtCitationDepth,
  checkH4EvasivePlaceholder,
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

Deno.test("H3 — verified § 7220(c)(5)(A) now passes (HF2 whitelist expansion)", () => {
  const ok = "The disclosure elements at § 7220(c)(5)(A) require specific plain-language explanation.";
  const findings = checkH3AdmtCitationDepth(ok);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("H3 — verified § 7221(h) opt-out confirmation passes", () => {
  const ok = "The business must confirm the opt-out under § 7221(h).";
  const findings = checkH3AdmtCitationDepth(ok);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("H3 — unverified § 7222(m) is flagged (does not exist)", () => {
  const bad = "See § 7222(m) for aggregate responses.";
  const findings = checkH3AdmtCitationDepth(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("H4 — 'the cited provision governing X' is flagged", () => {
  const bad = "Under the cited provision governing pre-use notice, the disclosure must be plain-language.";
  const findings = checkH4EvasivePlaceholder(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("H4 — clean prose with concrete citation passes", () => {
  const ok = "Under § 7220(c)(1), the notice must state the specific decision.";
  const findings = checkH4EvasivePlaceholder(ok);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("ADMT_VERIFIED_CITES contains HF2-expanded entries", () => {
  for (const cite of ["7220(c)(5)(A)", "7220(c)(5)(B)", "7220(c)(5)(C)", "7221(h)", "7222(c)(2)(A)", "7221(b)(1)(A)"]) {
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
