// CMP-B8 §1.2 — CORPUS-KEY FAIL-LOUD (61-CMP-B8-AUTHORITY-WING.md §1.2,
// ratified 2026-08-23, implemented 2026-08-26).
//
// The ruling: a `corpus_key` in the registration duty/source registries with
// no matching APPROVED provision row must fail the BUILD, not degrade
// silently at generation time. Before this test, nothing in a normal
// `deno test`/`vitest run` battery ever enforced that class:
//   - the authority-exhibit consumer (run-registration-assessment/index.ts)
//     never queries the corpus at all — it fabricates a `status: "approved"`
//     provision object straight from the registry's own hardcoded quote;
//   - `tests/edge/item413/reference-passages.test.ts` only checks the
//     registry against a hand-maintained local JSON mirror
//     (`registration-corpus-rows.json`, dated 2026-08-08) that nothing ever
//     reconciles against the live tables again;
//   - the two tests that DO query the live DB
//     (`src/registry/__tests__/registration-statutes-corpus-pin.test.ts`,
//     `registration-rail-corpus-pin.test.ts`) are `describe.skipIf(!CAN_RUN)`
//     — silently skipped whenever PGHOST/PGDATABASE are unset, which is the
//     normal case for this repo's test invocations, and neither one covers
//     the three `gdpr-articles:*` keys at all.
//
// This test closes that gap independently of live DB access, using the
// `REGISTRATION_APPROVED_CORPUS_KEYS` ledger
// (`registration-corpus-approval-ledger.ts`), whose entries were confirmed
// live this session (2026-08-26) via the project's own query tool — a
// SEPARATE evidence source from the registry file and from
// `registration-corpus-rows.json`, so a corpus_key typo'd into both of those
// at once still fails here.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  REGISTRATION_AUTHORITY_SOURCES,
  REGISTRATION_DUTY_AUTHORITIES,
} from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-verified-authorities.ts";
import {
  assertRegistrationCorpusKeysApproved,
  findUnapprovedRegistrationCorpusKeys,
  REGISTRATION_APPROVED_CORPUS_KEYS,
} from "../../../supabase/functions/run-registration-assessment/_local/registry/registration-corpus-approval-ledger.ts";

const ALL_ROWS = [...REGISTRATION_AUTHORITY_SOURCES, ...REGISTRATION_DUTY_AUTHORITIES];

Deno.test("CMP-B8 §1.2: every corpus_key referenced by the live registries has an approved-ledger entry", () => {
  const missing = findUnapprovedRegistrationCorpusKeys(ALL_ROWS);
  assertEquals(missing, [], `unapproved corpus_key(s) found: ${missing.join(", ")}`);
});

Deno.test("CMP-B8 §1.2: assertRegistrationCorpusKeysApproved does not throw on the real registries", () => {
  assertRegistrationCorpusKeysApproved(ALL_ROWS);
});

Deno.test("CMP-B8 §1.2 FAIL-LOUD PROOF: a row citing an unapproved corpus_key is caught, not silently accepted", () => {
  const poisoned = [...ALL_ROWS, { corpus_key: "no-such-approved-row" }];
  const missing = findUnapprovedRegistrationCorpusKeys(poisoned);
  assertEquals(missing, ["no-such-approved-row"]);
  let threw = false;
  try {
    assertRegistrationCorpusKeysApproved(poisoned);
  } catch (e) {
    threw = true;
    assert(
      String((e as Error).message).includes("no-such-approved-row"),
      "error message must name the offending key",
    );
    assert(
      String((e as Error).message).includes("CMP-B8"),
      "error message must cite the ratified rule it enforces",
    );
  }
  assert(threw, "assertRegistrationCorpusKeysApproved must throw on an unapproved corpus_key — this is the ratified fail-loud behavior");
});

Deno.test("CMP-B8 §1.2: a fully-approved row set produces zero findings (no false positives)", () => {
  const clean = Object.keys(REGISTRATION_APPROVED_CORPUS_KEYS).map((corpus_key) => ({ corpus_key }));
  assertEquals(findUnapprovedRegistrationCorpusKeys(clean), []);
});

Deno.test("CMP-B8 §1.2: every REGISTRATION_AUTHORITY_SOURCES row's corpus_key is in the ledger (Item 303 sources, not just Item 316 duties)", () => {
  // The pre-existing offline pin (registration-deliverables.test.ts) only
  // ever checked REGISTRATION_DUTY_AUTHORITIES against the corpus snapshot.
  // REGISTRATION_AUTHORITY_SOURCES (the Item 303 sources-only table, 9 rows)
  // had no offline coverage of any kind before this test.
  assertEquals(REGISTRATION_AUTHORITY_SOURCES.length, 9);
  const missing = findUnapprovedRegistrationCorpusKeys(REGISTRATION_AUTHORITY_SOURCES);
  assertEquals(missing, []);
});

Deno.test("CMP-B8 §1.2: the ledger itself names a source table for every key (no bare/undocumented approvals)", () => {
  for (const [key, entry] of Object.entries(REGISTRATION_APPROVED_CORPUS_KEYS)) {
    assert(
      entry.source === "provision_texts" || entry.source === "gdpr_articles",
      `${key} has an unrecognised source table: ${entry.source}`,
    );
    assert(entry.verified_on.length > 0, `${key} has no verified_on date`);
  }
});
