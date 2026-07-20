// CPPA-HF6 — normalizer-order reorder tests. Mirrors the pre/post
// injection walkers in run-admt-checker/index.ts to guarantee the
// rendered output contains ZERO literal "the cited provision" and
// no doubled-article breakage after registry injection.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/testing/asserts.ts";

const PRE_INJECT_PHRASE_RULES: Array<[RegExp, string]> = [
  [/\bthe\s+applicable\s+definitional\s+provision\b/gi, "the cited provision"],
  [/\bthe\s+applicable\s+regulation\s+section\b/gi, "the cited provision"],
  [/\bthe\s+the\s+cited\s+provision\b/gi, "the cited provision"],
  [/\bthe\s+((?:full|four|three|two|entire|all|many|few|several)\s+)the\s+cited\s+provision\b/gi, "$1the cited provision"],
];

function preInject(s: string): string {
  let next = s;
  for (const [re, sub] of PRE_INJECT_PHRASE_RULES) next = next.replace(re, sub);
  return next;
}

function consume(prose: string, concrete: string): string {
  const TOKEN_RE = /\bthe\s+cited\s+provision(?:\s+(?:governing|above|below|referenced))?\b/gi;
  const UNDER_RE = /\bunder\s+the\s+cited\s+provision\b/gi;
  const PURSUANT_RE = /\bpursuant\s+to\s+the\s+cited\s+provision\b/gi;
  let next = prose.replace(UNDER_RE, `under ${concrete}`);
  next = next.replace(PURSUANT_RE, `pursuant to ${concrete}`);
  next = next.replace(TOKEN_RE, concrete);
  return next;
}

function postInject(s: string): string {
  return s.replace(/\bthe\s+the\b/gi, "the").replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1");
}

function pipeline(model: string, concrete: string): string {
  return postInject(consume(preInject(model), concrete));
}

Deno.test("HF6 — 'the applicable definitional provision' is consumed by injection", () => {
  const out = pipeline("The response must satisfy the applicable definitional provision.", "11 CCR § 7222(b)(3)");
  assert(!/the cited provision/i.test(out), `token survived: ${out}`);
  assert(out.includes("11 CCR § 7222(b)(3)"));
});

Deno.test("HF6 — 'the applicable regulation section' is consumed by injection", () => {
  const out = pipeline("Under the applicable regulation section the business must respond within 45 days.", "11 CCR § 7222(b)");
  assert(!/the cited provision/i.test(out), out);
  assert(out.includes("under 11 CCR § 7222(b)"));
});

Deno.test("HF6 — 'the full the cited provision' collapses cleanly through injection", () => {
  const out = pipeline("Triggering the full the cited provision ADMT obligations.", "11 CCR § 7220");
  assert(!/the cited provision/i.test(out));
  assert(!/\bthe\s+the\b/i.test(out));
  // Expect the redundant leading "the" dropped so text reads "triggering full 11 CCR § 7220".
  assert(out.includes("11 CCR § 7220"), out);
});

Deno.test("HF6 — 'None of the four the cited provision consolidation scenarios' renders cleanly", () => {
  const out = pipeline("None of the four the cited provision consolidation scenarios apply.", "11 CCR § 7220(c)");
  assert(!/the cited provision/i.test(out), out);
  assert(!/\bthe\s+the\b/i.test(out));
  assert(out.includes("11 CCR § 7220(c)"));
});

Deno.test("HF6 — paired production fixture (7 artifact phrasings) yields zero 'the cited provision'", () => {
  // Composite fixture derived from batch 9e5616b3 doc 1 (run 72).
  const raw = [
    "The response must satisfy the applicable definitional provision.",
    "Under the applicable regulation section, respond within 45 days.",
    "The the cited provision governs this element.",
    "Triggering the full the cited provision ADMT obligations.",
    "None of the four the cited provision consolidation scenarios apply.",
    "All the the cited provision requirements must be met.",
    "Pursuant to the applicable definitional provision the business owes disclosure.",
  ].join(" ");
  const out = pipeline(raw, "11 CCR § 7222(b)(3)");
  assertEquals((out.match(/the cited provision/gi) ?? []).length, 0, out);
  assert(!/\bthe\s+the\b/i.test(out), `doubled article survived: ${out}`);
});

Deno.test("HF6 — walker leaves prose without artifacts untouched", () => {
  const clean = "The Pre-use Notice must describe the ADMT logic in plain language.";
  const out = pipeline(clean, "11 CCR § 7220");
  assertEquals(out, clean);
});
