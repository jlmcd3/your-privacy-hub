// Notices manifest-lint — the test-side equivalent of the admin-only
// `lint-deterministic-legal-text` edge function (doc 05 N2's design:
// "manifest-lint as a test; every assertion resolves against fixture
// corpus rows"), plus a seeded-mutation meta-test proving the checker
// bites (doc 34/44 discipline: "seeded meta-tests bite").
//
// WHY A SEPARATE TEST INSTEAD OF INVOKING THE LIVE FUNCTION: PN-N4's gap
// (03-DECISION-QUEUE.md, "Open — Notices") is that lint-deterministic-
// legal-text is admin-only and requires a live Supabase connection
// (SUPABASE_URL/SERVICE_KEY/ANON_KEY + network access to gdpr_articles/
// cppa_authorities) — it cannot run inside the offline `deno test --allow-
// read --allow-env tests/edge/` battery without production credentials in
// CI, which is a real infrastructure/secrets decision, not a same-session
// engineering call (see the corresponding decision-queue addition, "Open —
// Notices", filed this session). This test instead re-implements the exact
// same normalise+mustContain check the live function runs
// (lint-deterministic-legal-text/index.ts's `normalise`/`lintGenerator`),
// against a COMMITTED FIXTURE of the corpus text, in the same spirit as
// every other fleet product's `cam-pins.test.ts` (pins verified against a
// snapshot, never live Supabase, per doc 52 §1's "local tests can't reach
// it" rule).
//
// Fixture provenance: tests/edge/notices/__fixtures__/legal-text-corpus-
// fixture.json — text excerpts queried LIVE from production gdpr_articles/
// cppa_authorities this session (2026-08-26, via Lovable MCP
// query_database, SELECT-only), sufficient to contain every mustContain
// phrase as of that query. A live re-run of this session's SQL against
// today's corpus resolved all 13 manifest entries with ZERO
// corpus_rows_missing and ZERO phrase_failures — i.e. the fixture matches
// what the live lint would report right now. The fixture does not
// auto-refresh; a future corpus edit could silently invalidate it, which
// is exactly what PN-N4's "should the live lint run on a schedule"
// question (still open) is asking the CEO to rule on.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  EU_NOTICE_LEGAL_TEXT_ASSERTIONS,
  US_NOTICE_LEGAL_TEXT_ASSERTIONS,
  type LegalTextAssertion,
} from "../../../supabase/functions/_shared/legal-text-assertions.ts";

type Fixture = {
  captured_at: string;
  gdpr_articles: Record<string, string>;
  cppa_authorities: Record<string, string>;
};

function normalise(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

// Mirrors lint-deterministic-legal-text/index.ts's resolveCorpus: EU/UK
// citations of the form "gdpr:<jurisdiction>:<article>" resolve against
// gdpr_articles; everything else resolves against cppa_authorities.
function resolveFixtureText(citation: string, fixture: Fixture): string | undefined {
  if (/^gdpr:(eu|uk):/i.test(citation.trim())) {
    return fixture.gdpr_articles[citation];
  }
  return fixture.cppa_authorities[citation];
}

interface LintEntryResult {
  citation: string;
  corpus_row_found: boolean;
  phrases: { phrase: string; present: boolean }[];
  all_phrases_present: boolean;
}

function lintAgainstFixture(entries: readonly LegalTextAssertion[], fixture: Fixture): LintEntryResult[] {
  return entries.map((entry) => {
    const text = resolveFixtureText(entry.citation, fixture);
    const found = typeof text === "string";
    const normalisedCorpus = found ? normalise(text!) : "";
    const phrases = entry.mustContain.map((phrase) => ({
      phrase,
      present: found && normalisedCorpus.includes(normalise(phrase)),
    }));
    return {
      citation: entry.citation,
      corpus_row_found: found,
      phrases,
      all_phrases_present: found && phrases.every((p) => p.present),
    };
  });
}

async function loadFixture(): Promise<Fixture> {
  const raw = await Deno.readTextFile("tests/edge/notices/__fixtures__/legal-text-corpus-fixture.json");
  return JSON.parse(raw) as Fixture;
}

// ---- Real manifests against the real fixture: must be 100% clean today ----

Deno.test("notices manifest-lint: every EU_NOTICE_LEGAL_TEXT_ASSERTIONS entry resolves, every phrase present", async () => {
  const fixture = await loadFixture();
  const results = lintAgainstFixture(EU_NOTICE_LEGAL_TEXT_ASSERTIONS, fixture);
  assertEquals(results.length, 7, "EU manifest entry count changed — update this test and re-verify doc 05 §5's corrected '13' figure");
  for (const r of results) {
    assert(r.corpus_row_found, `${r.citation}: no fixture row (would be corpus_rows_missing in the live lint)`);
    assert(r.all_phrases_present, `${r.citation}: missing phrase(s) — ${JSON.stringify(r.phrases.filter((p) => !p.present))}`);
  }
});

Deno.test("notices manifest-lint: every US_NOTICE_LEGAL_TEXT_ASSERTIONS entry resolves, every phrase present", async () => {
  const fixture = await loadFixture();
  const results = lintAgainstFixture(US_NOTICE_LEGAL_TEXT_ASSERTIONS, fixture);
  assertEquals(results.length, 6, "US manifest entry count changed — update this test and re-verify doc 05 §5's corrected '13' figure");
  for (const r of results) {
    assert(r.corpus_row_found, `${r.citation}: no fixture row (would be corpus_rows_missing in the live lint)`);
    assert(r.all_phrases_present, `${r.citation}: missing phrase(s) — ${JSON.stringify(r.phrases.filter((p) => !p.present))}`);
  }
});

Deno.test("notices manifest-lint: combined US+EU entry count is 13, not the stale doc figure of 19", () => {
  assertEquals(EU_NOTICE_LEGAL_TEXT_ASSERTIONS.length + US_NOTICE_LEGAL_TEXT_ASSERTIONS.length, 13);
});

// ---- Seeded-mutation meta-tests: prove the checker actually bites ----
// (doc 34/44: "seeded meta-tests bite" — a checker that has never been
// proven to fail on a broken input has not been proven at all.)

Deno.test("notices manifest-lint SEEDED FAILURE: a mustContain phrase absent from the corpus text is caught", async () => {
  const fixture = await loadFixture();
  const poisoned: LegalTextAssertion[] = [
    { citation: "gdpr:eu:6", mustContain: ["this phrase does not appear anywhere in article 6"] },
  ];
  const results = lintAgainstFixture(poisoned, fixture);
  assertEquals(results[0].all_phrases_present, false, "seeded bad phrase was NOT caught — the checker is not biting");
  assertEquals(results[0].phrases[0].present, false);
});

Deno.test("notices manifest-lint SEEDED FAILURE: a citation with no corpus row is caught (corpus_rows_missing)", async () => {
  const fixture = await loadFixture();
  const poisoned: LegalTextAssertion[] = [
    { citation: "gdpr:eu:999", mustContain: ["anything"] },
  ];
  const results = lintAgainstFixture(poisoned, fixture);
  assertEquals(results[0].corpus_row_found, false, "seeded missing-row citation was NOT caught — the checker is not biting");
  assertEquals(results[0].all_phrases_present, false);
});

Deno.test("notices manifest-lint SEEDED FAILURE: a template edit that breaks a real mustContain phrase fails (doc 05 N2's own seeded case)", async () => {
  // doc 05 N2: "a template edit that breaks a mustContain phrase must fail."
  // Simulate a corpus row that drifted (the phrase this session's live
  // query found was reworded/removed at the source).
  const fixture = await loadFixture();
  const drifted: Fixture = {
    ...fixture,
    cppa_authorities: {
      ...fixture.cppa_authorities,
      "Cal. Civ. Code § 1798.105": "1798.105. Consumers' rights regarding their information held by a business.",
    },
  };
  const results = lintAgainstFixture(US_NOTICE_LEGAL_TEXT_ASSERTIONS, drifted);
  const row = results.find((r) => r.citation === "Cal. Civ. Code § 1798.105")!;
  assertEquals(row.all_phrases_present, false, "drifted corpus text ('right to delete' removed) was NOT caught — the checker is not biting");
});
