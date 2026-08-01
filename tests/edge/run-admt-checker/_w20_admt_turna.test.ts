// WAVE20-FIX TURN A — colocated deno tests (B1 variant splice, B2 keyless,
// B4 information_needed filter).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW20AdmtTurnA,
  filterEmptyInformationNeeded,
  rewriteKeylessFallbackOnEntry,
  scrubSpliceVariants,
  W20_ADMT_TURNA_STAMP,
} from "../../../supabase/functions/run-admt-checker/_w20_admt_turna.ts";

const FALLBACK = "the applicable ADMT-subchapter provision";

Deno.test("stamp has w20-admt-turna prefix", () => {
  assert(W20_ADMT_TURNA_STAMP.startsWith("w20-admt-turna@"));
});

// ── B1 variant-tolerant splice scrub ───────────────────────────────────
Deno.test("B1: exact wave-20 survivor 'the five enumerated the applicable ADMT-subchapter provision categories' collapses", () => {
  const bad = "Assess the five enumerated the applicable ADMT-subchapter provision categories under the rule.";
  const r = scrubSpliceVariants(bad);
  assert(r.hits >= 1, "expected at least 1 hit");
  assert(!/the\s+five\s+enumerated\s+the\s+applicable/i.test(r.out), r.out);
  // trailing "categories" also scrubbed to leave a clean fallback phrase
  assert(!/ADMT-subchapter\s+provision\s+categories/i.test(r.out), r.out);
});

Deno.test("B1: numeral variant 'the six listed the applicable ADMT-subchapter provision' collapses", () => {
  const bad = "Review the six listed the applicable ADMT-subchapter provision.";
  const r = scrubSpliceVariants(bad);
  assert(r.hits >= 1);
  assert(!/the\s+six\s+listed\s+the\s+applicable/i.test(r.out));
});

Deno.test("B1: adjective variant 'the two governing the applicable ADMT-subchapter provision' collapses", () => {
  const bad = "Under the two governing the applicable ADMT-subchapter provision.";
  const r = scrubSpliceVariants(bad);
  assert(r.hits >= 1);
  assert(!/the\s+two\s+governing\s+the\s+applicable/i.test(r.out));
});

Deno.test("B1: trailing-noun variant scrubbed (categories/provisions/requirements)", () => {
  for (const noun of ["categories", "provisions", "requirements", "obligations", "elements"]) {
    const bad = `Cited under ${FALLBACK} ${noun}.`;
    const r = scrubSpliceVariants(bad);
    assert(r.hits >= 1, `noun=${noun}`);
    assert(!new RegExp(`${noun}\\.`).test(r.out) || r.out.endsWith(`${FALLBACK}.`),
      `unexpected residual: ${r.out}`);
  }
});

Deno.test("B1: well-formed prose left untouched", () => {
  const ok = `Assess ADMT scope under ${FALLBACK} before first use.`;
  const r = scrubSpliceVariants(ok);
  assertEquals(r.hits, 0);
  assertEquals(r.out, ok);
});

// ── B2 keyless coverage ───────────────────────────────────────────────
Deno.test("B2: keyless entry with citation === FALLBACK → section-range anchor", () => {
  const entry: any = { citation: FALLBACK, finding: `Under ${FALLBACK}, act.` };
  const d = rewriteKeylessFallbackOnEntry(entry);
  assertEquals(d.citation_rewrites, 1);
  assertEquals(entry.citation, "11 CCR §§ 7200–7222");
  assert(!entry.finding.includes(FALLBACK), "fallback stripped from prose");
  assert(entry.finding.includes("the ADMT subchapter"));
});

Deno.test("B2: entry with proposition_key left to w19 A1 (no rewrite)", () => {
  const entry: any = { proposition_key: "scope_deadline", citation: FALLBACK, finding: `Under ${FALLBACK}.` };
  const d = rewriteKeylessFallbackOnEntry(entry);
  assertEquals(d.citation_rewrites, 0);
  assertEquals(entry.citation, FALLBACK);
});

Deno.test("B2: no fallback on entry → no-op", () => {
  const entry: any = { citation: "11 CCR § 7220", finding: "Emit Pre-use Notice." };
  const d = rewriteKeylessFallbackOnEntry(entry);
  assertEquals(d.citation_rewrites, 0);
  assertEquals(d.prose_rewrites, 0);
});

// ── B4 information_needed filter ──────────────────────────────────────
Deno.test("B4: drops empty and structurally incomplete objects", () => {
  const report: any = {
    information_needed: [
      {}, // empty
      { question: "" }, // blank field
      { question: "Confirm the vendor list." }, // legit
      "", // empty string
      "What is the retention period?", // legit
      { topic: "  " }, // whitespace only
      null,
    ],
  };
  const d = filterEmptyInformationNeeded(report);
  assertEquals(d.dropped, 5);
  assertEquals(report.information_needed.length, 2);
  assertEquals(report.information_needed[0].question, "Confirm the vendor list.");
  assertEquals(report.information_needed[1], "What is the retention period?");
});

Deno.test("B4: no information_needed array → no-op", () => {
  const report: any = { other: "data" };
  const d = filterEmptyInformationNeeded(report);
  assertEquals(d.dropped, 0);
});

// ── Orchestrator integration ──────────────────────────────────────────
Deno.test("orchestrator: full B1+B2+B4 integration and diag stamped", () => {
  const report: any = {
    top_3_actions: [
      { rank: 1, citation: FALLBACK, action: `Assess the five enumerated the applicable ADMT-subchapter provision categories.` },
      { rank: 2, proposition_key: "scope_deadline", citation: "11 CCR § 7150", action: "Confirm deadline." },
    ],
    information_needed: [
      {},
      { question: "Provide vendor list." },
      { question: "" },
    ],
  };
  const d = applyW20AdmtTurnA(report, {});
  assertEquals(d.version, W20_ADMT_TURNA_STAMP);
  assert(d.b1_variant_splice_scrubs >= 1, "b1 fired");
  assertEquals(d.b2_keyless_citation_rewrites, 1);
  assertEquals(d.b4_information_needed_dropped, 2);
  assertEquals(report.top_3_actions[0].citation, "11 CCR §§ 7200–7222");
  assert(!/the\s+five\s+enumerated\s+the\s+applicable/i.test(report.top_3_actions[0].action));
  assertEquals(report.information_needed.length, 1);
  assert((report as any)._w20_admt_turna?.version === W20_ADMT_TURNA_STAMP);
});

Deno.test("orchestrator: empty report — no crash, version stamped", () => {
  const d = applyW20AdmtTurnA({}, {});
  assertEquals(d.version, W20_ADMT_TURNA_STAMP);
});
