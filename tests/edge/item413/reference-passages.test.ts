// ITEM 413 — REFERENCE-PASSAGE DISCIPLINE FOR REGISTRATION.
//
// Every verbatim passage this product renders must byte-match the corpus row
// its citation names. The corpus rows are snapshotted in
// `__fixtures__/registration-corpus-rows.json`, resolved from
// `public.provision_texts` (US state statutes) and `public.gdpr_articles`
// (GDPR / UK GDPR Arts. 27 and 37) on 2026-08-08.
//
// NOTHING HERE EDITS A CORPUS ROW. If a passage and its cited row disagree the
// test fails and the item stops — that is the ITEM 388 lesson.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  checkPassageShape,
  checkPassagesAgainstCorpus,
  checkPassagesSurviveAssembly,
  formatDrift,
  isGdprArticleCorpusKey,
  REGISTRATION_REFERENCE_PASSAGE_VERSION,
  toRegistrationReferencePassages,
} from "../../../supabase/functions/_shared/prose/registration-reference-passages.ts";
import { REGISTRATION_DUTY_AUTHORITIES } from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-verified-authorities.ts";

const CORPUS: Record<string, string> = JSON.parse(
  await Deno.readTextFile(
    new URL("./__fixtures__/registration-corpus-rows.json", import.meta.url),
  ),
);

const PASSAGES = toRegistrationReferencePassages(REGISTRATION_DUTY_AUTHORITIES);

Deno.test("version is pinned", () => {
  assertEquals(
    REGISTRATION_REFERENCE_PASSAGE_VERSION,
    "registration-reference-passages-2026-08-08-item413",
  );
});

Deno.test("every duty row yields a shape-valid passage", () => {
  const drift = checkPassageShape(PASSAGES);
  assertEquals(drift.length, 0, formatDrift(drift));
});

Deno.test("every passage byte-matches the corpus row it cites", () => {
  assert(PASSAGES.length >= 28, `expected the full duty registry, got ${PASSAGES.length}`);
  const drift = checkPassagesAgainstCorpus(PASSAGES, CORPUS);
  assertEquals(drift.length, 0, formatDrift(drift));
});

Deno.test("the audit FAILS on drift — a curly quote is caught", () => {
  const [first] = PASSAGES;
  const mutated = [{ ...first, bytes: first.bytes.replace(/"/g, "\u201c") }];
  const drift = checkPassagesAgainstCorpus(mutated, CORPUS);
  assert(drift.length > 0, "curly-quote drift went undetected");
});

Deno.test("the audit FAILS when a row cites a corpus key that does not exist", () => {
  const [first] = PASSAGES;
  const drift = checkPassagesAgainstCorpus(
    [{ ...first, corpus_key: "no-such-corpus-row" }],
    CORPUS,
  );
  assertEquals(drift[0]?.reason, "missing_corpus_row");
});

Deno.test("GDPR article rows are resolved from the article table, not invented", () => {
  const gdpr = PASSAGES.filter((p) => isGdprArticleCorpusKey(p.corpus_key));
  assert(gdpr.length > 0, "expected Art. 27 / Art. 37 rows in the registry");
  for (const p of gdpr) {
    assert(CORPUS[p.corpus_key], `no corpus row snapshotted for ${p.corpus_key}`);
  }
});

Deno.test("passages survive assembly into a document string unaltered", () => {
  const assembled = PASSAGES.map((p) => `${p.citation}: ${p.bytes}`).join("\n\n");
  const drift = checkPassagesSurviveAssembly(assembled, PASSAGES);
  assertEquals(drift.length, 0, formatDrift(drift));
});
