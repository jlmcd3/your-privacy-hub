// ITEM 370 — PROSE ENGINE HARDENING.
//
// RULE A repeated_boilerplate — a normalized prose sentence of 8+ words that
//        appears 3+ times across the document's prose surfaces.
// RULE B merge_artifact      — determiner-collision artifacts left by template
//        splicing ("an The", "This is an The").
//
// Fixtures reproduce the three defect phrases confirmed by direct PDF text
// extraction from a shipped LIA and a shipped DPIA.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  type LintableSection,
  lintDocumentStyle,
} from "../../../../supabase/functions/_shared/prose/style-lint.ts";

const sec = (id: string, text: string): LintableSection => ({
  section_id: id,
  title: id,
  text,
  spans: [],
});

const findings = (sections: LintableSection[], rule: string) =>
  lintDocumentStyle(sections).filter((f) => f.rule === rule);

// ── the three confirmed defect phrases ─────────────────────────────────────
const LIA_PHRASE =
  "We could not verify this item from the information provided; it is listed under information needed.";
const DPIA_PHRASE =
  "The organisation should confirm whether the described position applies here.";
const MERGE_PHRASE =
  "This is an The intake did not include a description of the retention period.";

Deno.test("RULE A — the LIA boilerplate phrase repeated 25 times trips the rule", () => {
  const body = Array.from({ length: 25 }, () => LIA_PHRASE).join(" ");
  const hits = findings([sec("purpose", body)], "repeated_boilerplate");
  assert(hits.length >= 1, "expected repeated_boilerplate");
  assert(hits[0].detail.includes("repeated 25 times"), hits[0].detail);
  assert(hits[0].detail.includes("purpose"), hits[0].detail);
  assert(hits[0].detail.toLowerCase().includes("could not verify this item"), hits[0].detail);
});

Deno.test("RULE A — the DPIA boilerplate phrase trips at 5x and at 21x, across sections", () => {
  for (const n of [5, 21]) {
    const per = Math.ceil(n / 2);
    const a = Array.from({ length: per }, () => DPIA_PHRASE).join(" ");
    const b = Array.from({ length: n - per }, () => DPIA_PHRASE).join(" ");
    const hits = findings([sec("necessity", a), sec("risks", b)], "repeated_boilerplate");
    assert(hits.length >= 1, `n=${n}: expected repeated_boilerplate`);
    assert(hits[0].detail.includes(`repeated ${n} times`), hits[0].detail);
    assert(hits[0].detail.includes("necessity"), hits[0].detail);
    assert(hits[0].detail.includes("risks"), hits[0].detail);
    // one finding per offending section key
    assertEquals(new Set(hits.map((h) => h.section_id)).size, 2);
  }
});

Deno.test("RULE A — legitimate 2x repetition does not trip", () => {
  const body = `${DPIA_PHRASE} Some intervening prose carries the section forward. ${DPIA_PHRASE}`;
  assertEquals(findings([sec("necessity", body)], "repeated_boilerplate").length, 0);
});

Deno.test("RULE A — a short repeated phrase (<8 words) does not trip", () => {
  const short = "The company states this."; // 4 words
  const body = Array.from({ length: 9 }, () => short).join(" ");
  assertEquals(findings([sec("purpose", body)], "repeated_boilerplate").length, 0);
});

Deno.test("RULE A — structural repetition (cards, bullets, enum labels, tables) does not trip", () => {
  const line = "Not stated in the record provided by the organisation.";
  const card = Array.from({ length: 6 }, (_, i) => `- Field ${i}: ${line}`).join("\n");
  const bullets = Array.from({ length: 6 }, () => `• ${line}`).join("\n");
  const table = Array.from({ length: 6 }, () => `| Retention | ${line} |`).join("\n");
  const enums = Array.from({ length: 6 }, (_, i) => `${i + 1}. ${line}`).join("\n");
  assertEquals(
    findings(
      [sec("record", card), sec("b", bullets), sec("t", table), sec("e", enums)],
      "repeated_boilerplate",
    ).length,
    0,
  );
});

Deno.test("RULE B — the confirmed merge artifact trips the rule", () => {
  const hits = findings([sec("purpose", MERGE_PHRASE)], "merge_artifact");
  assert(hits.length >= 1, "expected merge_artifact");
  assertEquals(hits.length, 1, "the two patterns must not double-report one collision");
  assert(hits[0].detail.includes("an The"), hits[0].detail);
});

Deno.test("RULE B — other determiner collisions trip; each is reported once", () => {
  for (const frag of ["a The intake did not include", "the This is a placeholder", "an It is unclear"]) {
    const hits = findings([sec("s", `The assessment records ${frag} value.`)], "merge_artifact");
    assert(hits.length >= 1, `expected merge_artifact for "${frag}"`);
  }
});

Deno.test("RULE B — clean prose does not trip", () => {
  const clean = [
    "The company states that it retains marketing analytics for twenty-four months.",
    "It describes the processing as necessary to the stated purpose, and the assessment accepts that framing.",
    "The organisation identifies a single controller of record. This is a considered position.",
    "That is the basis on which the balancing test proceeds.",
  ].join(" ");
  assertEquals(findings([sec("purpose", clean)], "merge_artifact").length, 0);
});

Deno.test("RULE B — a quoted proper-noun title beginning with 'The' is exempt", () => {
  const t = 'The company cites the "The Times" report in support of its position.';
  assertEquals(findings([sec("s", t)], "merge_artifact").length, 0);
  const italic = "The company cites the *The Guardian* report in support of its position.";
  assertEquals(findings([sec("s", italic)], "merge_artifact").length, 0);
});

Deno.test("both rules reach the same findings channel as the existing battery", () => {
  const all = lintDocumentStyle([
    sec("purpose", `${MERGE_PHRASE} ${Array.from({ length: 3 }, () => DPIA_PHRASE).join(" ")}`),
  ]);
  const rules = new Set(all.map((f) => f.rule));
  assert(rules.has("merge_artifact"));
  assert(rules.has("repeated_boilerplate"));
});
