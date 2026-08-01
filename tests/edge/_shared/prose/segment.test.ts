// ITEM 337 — PROSE PROGRAM 1, Part A regression tests.
// Uses the exact recorded defect examples from the 2026-08-01 PDF review.
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  splitSentencesSafe,
  truncateAtSentenceBoundary,
  isAbbreviationFragment,
  rejoinSentences,
} from "./segment.ts";

const HEDGE = "The organisation should confirm whether the described position applies here.";

Deno.test("A1 — hedge never splices after 'Art.' (dpia/governance recorded defect)", () => {
  const src = "The controller relies on GDPR Art. 35(11) for review. A DPIA follows.";
  const parts = splitSentencesSafe(src);
  assertEquals(parts.length, 2);
  assert(parts[0].includes("Art. 35(11)"), parts[0]);
  // Simulate the hedge inserter: append the hedge AFTER a real sentence.
  const spliced = rejoinSentences([parts[0], HEDGE, parts[1]]);
  assert(!/Art\. The organisation/.test(spliced), spliced);
  assert(spliced.includes("GDPR Art. 35(11)"));
});

Deno.test("A2 — recorded orphan '…applies here. 4(16)(a) main-establishment' cannot recur", () => {
  const src = "Supervisory competence follows GDPR Art. 4(16)(a) main-establishment analysis.";
  const parts = splitSentencesSafe(src);
  assertEquals(parts.length, 1);
  assertEquals(parts[0], src);
});

Deno.test("A3 — cppa-cyber 'Cal. Civ.' truncation leaves no dangling abbreviation", () => {
  const src =
    "The business must maintain a written information security programme. " +
    "Breach notification duties arise under Cal. Civ. Code § 1798.82 whenever unencrypted personal information is acquired by an unauthorised person.";
  const cut = truncateAtSentenceBoundary(src, 120)!;
  assert(!/Civ\.$/.test(cut), cut);
  assert(!/Cal\.$/.test(cut), cut);
  assertEquals(cut, "The business must maintain a written information security programme.");
});

Deno.test("A4 — {\"text\":\"Civ.\"} next_steps entry is detectable as a fragment", () => {
  assert(isAbbreviationFragment("Civ."));
  assert(isAbbreviationFragment("Cal. Civ."));
  assert(isAbbreviationFragment("Art."));
  assert(!isAbbreviationFragment("Civ. Code § 1798.82 requires notice."));
  assert(!isAbbreviationFragment("Maintain the programme."));
});

Deno.test("A5 — abbreviation inventory: no false boundaries", () => {
  const cases = [
    "See Cal. Code Regs. tit. 11, § 7152 for the harm catalogue.",
    "The fine in Case No. 24-1177 was upheld.",
    "Compare Schrems v. Meta on transfer risk.",
    "Categories include e.g. telemetry and account data.",
    "The vendor is Acme Inc. and processes on documented instructions.",
    "See 45 CFR § 164.312 for technical safeguards.",
  ];
  for (const c of cases) assertEquals(splitSentencesSafe(c).length, 1, c);
});

Deno.test("A6 — real boundaries still split", () => {
  const src = "The record is complete. The assessment proceeds! Does it? Yes.";
  assertEquals(splitSentencesSafe(src).length, 4);
});
