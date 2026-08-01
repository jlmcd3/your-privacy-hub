// CPPA-HF1/HF2/HF3/HF4/HF5 — deterministic-check coverage.
import { assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";
import {
  checkH1ArticlePhrasing,
  checkH2InternalVocab,
  checkH3AdmtCitationDepth,
  checkH4EvasivePlaceholder,
  checkH5InternalNoteBlock,
  checkH6AdmtGoverningAnchor,
  checkH7BlanketAdmtRange,
  runCppaHf1Checks,
  runAdmtHf1Checks,
  ADMT_VERIFIED_CITES,
} from "../../../supabase/functions/_shared/grader/cppa-hf1-checks.ts";

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
  const bad = "Article 11 CCPA obligations. See § 7220(z)(9). the sensitive-PI determination-resolved determination applies.";
  const findings = runAdmtHf1Checks(bad);
  const failed = findings.filter((f) => !f.passed).map((f) => f.check_id);
  assertEquals(failed.includes("h1_article_phrasing"), true);
  assertEquals(failed.includes("h2_internal_vocab"), true);
  assertEquals(failed.includes("h3_admt_citation_depth"), true);
});

// ─── CPPA-HF3 tests ────────────────────────────────────────────────────

Deno.test("HF3 B2 — H5 flags '[INTERNAL NOTE: …]' block", () => {
  const bad = "The controller must proceed. [INTERNAL NOTE: HIPAA overlay — coordinate with HIM.]";
  const [f] = checkH5InternalNoteBlock(bad);
  assertEquals(f.passed, false);
  assertEquals(f.check_id, "h5_internal_note_block");
});

Deno.test("HF3 B2 — H5 flags '[INTERNAL: …]' variant", () => {
  const bad = "[INTERNAL - see routing memo].";
  const [f] = checkH5InternalNoteBlock(bad);
  assertEquals(f.passed, false);
});

Deno.test("HF3 B2 — H5 clean text passes", () => {
  const ok = "Where the ADMT is used in a HIPAA context, coordinate with the health-information management function.";
  const [f] = checkH5InternalNoteBlock(ok);
  assertEquals(f.passed, true);
});

Deno.test("HF3 D — H2 flags i5_admt_logic in prose", () => {
  const bad = "See i5_admt_logic for the description.";
  const findings = checkH2InternalVocab(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("HF3 D — H2 flags q19_admt_description in prose", () => {
  const bad = "The q19_admt_description field is silent on retention.";
  const findings = checkH2InternalVocab(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("HF3 D — H2 flags 'the audit-cohort determination'", () => {
  const bad = "the audit-cohort determination applies here.";
  const findings = checkH2InternalVocab(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("HF3 A — run-admt-checker source contains no 'Article 10/11' shorthand outside HF1/HF2 warning rules", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/run-admt-checker/index.ts", import.meta.url));
  // Only permitted occurrences are inside the two lines that describe the ban itself
  // (CPPA-HF1 A2 and CPPA-HF2 E rulebook self-check). Everywhere else is a defect.
  const lines = src.split("\n");
  const violations = lines.filter((ln, i) => {
    if (!/Article 1[01]/.test(ln)) return false;
    // Whitelist the two ban-description lines
    if (/CPPA-HF1 A2/.test(ln) || /CPPA-HF2 E/.test(ln) || /CPPA-HF3/.test(ln)) return false;
    return true;
  });
  assertEquals(violations.length, 0);
});

Deno.test("HF3 runners — CPPA runner includes H5", () => {
  const findings = runCppaHf1Checks("[INTERNAL NOTE: foo]");
  const ids = findings.map((f) => f.check_id);
  assertEquals(ids.includes("h5_internal_note_block"), true);
});

// ─── CPPA-HF4 tests ────────────────────────────────────────────────────

Deno.test("HF4 F — H2 flags access_verify token in prose", () => {
  const bad = "The access_verify step must be documented.";
  const findings = checkH2InternalVocab(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("HF4 F — H2 flags access_verify_nonacct token", () => {
  const bad = "See access_verify_nonacct for non-account cases.";
  const findings = checkH2InternalVocab(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("HF4 B1 — H6 flags § 7001 as sole governing anchor for ADMT duty", () => {
  const bad = "Under § 7001(e)(1), the business must disclose the categories of personal information used.";
  const findings = checkH6AdmtGoverningAnchor(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("HF4 B1 — H6 passes when § 7001 accompanies a § 7222 anchor", () => {
  const ok = "The access response under § 7222(b) must include, per § 7001(e)(1) definition, the personal information categories.";
  const findings = checkH6AdmtGoverningAnchor(ok);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("HF4 B1 — H6 passes when § 7001 appears without an action verb", () => {
  const ok = "The term 'personal information' is defined at § 7001(e)(1).";
  const findings = checkH6AdmtGoverningAnchor(ok);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("HF4 E adjudication — § 7221(c)/(e)/(h)/(m)/(n)(1)/(n)(2) are all whitelisted", () => {
  for (const c of ["7221(c)", "7221(e)", "7221(h)", "7221(m)", "7221(n)(1)", "7221(n)(2)"]) {
    assertEquals(ADMT_VERIFIED_CITES.has(c), true);
  }
});

Deno.test("HF4 runAdmtHf1Checks includes H6 in output", () => {
  const findings = runAdmtHf1Checks("Under § 7001(a), the business must respond to access requests.");
  assertEquals(findings.some((f) => f.check_id === "h6_admt_governing_anchor"), true);
});

// ── CPPA-HF5 additions ────────────────────────────────────────────────

Deno.test("HF5 H — H5 flags [INTERNAL PROCEDURE ...] bracket blocks", () => {
  const bad = "[INTERNAL PROCEDURE — REFERENCED IN CONSUMER COMMUNICATIONS] use only where applicable.";
  const [f] = checkH5InternalNoteBlock(bad);
  assertEquals(f.passed, false);
  assertEquals(f.check_id, "h5_internal_note_block");
});

Deno.test("HF5 H — H5 flags [INTERNAL REVIEW] and [INTERNAL: ...] siblings", () => {
  for (const s of ["[INTERNAL REVIEW pending]", "[INTERNAL: draft]", "[INTERNAL NOTE — TBD]"]) {
    const [f] = checkH5InternalNoteBlock(s);
    assertEquals(f.passed, false, `expected flag on: ${s}`);
  }
});

Deno.test("HF5 C — H6 permits § 7001 in an action-citation chain when a § 722x anchor co-appears (QB-P15 CEO ruling; regression-checked R-TURN-1)", () => {
  const chain = "The response draws on 11 CCR § 7222(b)(3) + 11 CCR § 7001(e)(1) + 11 CCR § 7222(b)(3)(A).";
  const findings = checkH6AdmtGoverningAnchor(chain);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("HF5 C — H6 still passes when § 7001 is a narrative definitional reference", () => {
  const narrative = "The access response under § 7222(b) must include, per the § 7001(e)(1) definition, the personal information categories used.";
  const findings = checkH6AdmtGoverningAnchor(narrative);
  assertEquals(findings.every((f) => f.passed), true);
});

// ── R-TURN-1 additions ────────────────────────────────────────────────

Deno.test("R-TURN-1 item 1 — H6 accepts § 7200(a) as an operative co-cite for § 7001 duty", () => {
  const ok = "Under § 7200(a), the business must provide the required access response, applying the § 7001(e)(1) definitional element.";
  const findings = checkH6AdmtGoverningAnchor(ok);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("R-TURN-1 item 1 — H6 still flags § 7001-only duty (no § 72xx anchor)", () => {
  const bad = "Under § 7001(e)(1), the business must respond to access requests.";
  const findings = checkH6AdmtGoverningAnchor(bad);
  assertEquals(findings.some((f) => !f.passed), true);
});

Deno.test("R-TURN-1 item 2 — H7 negation guard: 'must respond' inside a 'not triggered' sentence does NOT flag", () => {
  const negated = "Under §§ 7220–7222 the Pre-use Notice duty to respond is not triggered where no significant decision is made.";
  const findings = checkH7BlanketAdmtRange(negated);
  assertEquals(findings.every((f) => f.passed), true);
});

Deno.test("R-TURN-1 item 2 — H7 still flags affirmative blanket-range duty", () => {
  const bad = "The business must respond per §§ 7220–7222 to every access request.";
  const findings = checkH7BlanketAdmtRange(bad);
  assertEquals(findings.some((f) => !f.passed && f.check_id === "h7_admt_blanket_range"), true);
});

Deno.test("R-TURN-1 item 2 — H7 negation variants ('does not attach', 'not applicable') do NOT flag", () => {
  for (const s of [
    "Under §§ 7220–7222 the notice duty does not attach on this record.",
    "The access response requirement is not applicable to §§ 7220–7222 where the exception is engaged.",
  ]) {
    const findings = checkH7BlanketAdmtRange(s);
    assertEquals(findings.every((f) => f.passed), true, `expected pass on: ${s}`);
  }
});
