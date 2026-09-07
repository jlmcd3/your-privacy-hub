// DOC 207 §4 — TRACK 2: RE-POINT THE RELEVANCE PROFILES TO THE GENERATED FILE.
//
// Doc 191 built the generator and the split (`LIA_RULE_PROFILES` /
// `LIA_PATTERN_PROFILES`) but never wrote the generated file, and
// `liaProfileOf` in `lia-relevance-profiles.ts` still read only the
// hand-authored `LIA_RELEVANCE_PROFILES` literal. Doc 207 Track 2:
//   1. materialized `lia-relevance-profiles.generated.ts` (already done —
//      this is steps 2-4);
//   2. re-pointed `liaProfileOf` to read
//      `row.relevance_profile ?? LIA_PATTERN_PROFILES[row.id] ?? LIA_RULE_PROFILES[row.id]`
//      first, falling back to the literal only where the generated maps
//      have no entry for the id;
//   3. this file — the pin doc 207 §4 step 3 asks for: for every key of the
//      hand-authored literal, `liaProfileOf({id: key})` after the swap must
//      either deep-equal the hand-authored profile before the swap, or be
//      one of the documented, CEO-approved exceptions below.
//
// WHAT WAS FOUND (captured from `git show c0e1a3a37:.../lia-relevance-profiles.ts`,
// which is byte-identical to the literal still in that file today — verified,
// no diff exists between c0e1a3a37 and HEAD for that path): of the 39 keys,
// 35 are byte-identical between the literal and the generated file's
// scorer-visible (8-field) profile. The other 4 differ, and in every case
// the generated value is a doc205-backfill correction (2026-09-06,
// CEO-approved per doc 205 §12 item 3 / doc 205A §8.4) that this hand
// literal was never updated to carry — see each row's own curation_note in
// `lia-relevance-profiles.generated.ts` for the source citation. Per doc 207
// §4 step 2's instruction, the literal is therefore NOT deleted; it stays as
// the last fallback in `liaProfileOf`'s lookup chain (currently unreachable,
// since all 39 ids resolve through the generated file first).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { canonicalCamProfileBytes } from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/generate.ts";
import {
  LIA_CORPUS_MAP,
} from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-corpus-map.ts";
import {
  LIA_RELEVANCE_PROFILES,
  liaProfileOf,
} from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.ts";
import {
  LIA_PATTERN_PROFILES,
  LIA_PROFILES_VERSION,
  LIA_RULE_PROFILES,
} from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.generated.ts";
import type { CamRow } from "../../../supabase/functions/_shared/corpus/cam-types.ts";

const AP_ROWS = LIA_CORPUS_MAP.rows.filter((r) => r.role === "AP");
const AP_ROWS_BY_ID = new Map(AP_ROWS.map((r) => [r.id, r] as const));

/** The 4 of 39 keys where the generated (corrected) profile legitimately
 *  differs from the stale hand-authored literal. Every one is a
 *  doc205-backfill correction — see the row's own curation_note in the
 *  generated file. Keying this list explicitly means a future regeneration
 *  that silently reverts one of these corrections fails this test loudly. */
const KNOWN_CORRECTIONS: Readonly<Record<string, { field: string; from: unknown; to: unknown }[]>> = {
  "lia/f03-necessity/ap-w6-01": [
    { field: "outcome_posture", from: "conditional", to: "rejected" },
  ],
  "lia/f01-interest-legitimacy/ap-w6-02": [
    {
      field: "factor_ids",
      from: ["Interest legitimacy", "Necessity and less-intrusive means"],
      to: ["Interest legitimacy", "Necessity and less-intrusive means", "Balancing of interests, rights and freedoms"],
    },
    { field: "outcome_posture", from: "conditional", to: "accepted" },
  ],
  "lia/f04-balancing/ap-w6-04": [
    { field: "outcome_posture", from: "conditional", to: "rejected" },
  ],
  "lia/f01-interest-legitimacy/ap-w6-12": [
    { field: "instrument", from: "EU GDPR", to: "Directive 95/46" },
  ],
};

Deno.test("doc207 §4 step 1 — LIA_PROFILES_VERSION is pinned", () => {
  assertEquals(LIA_PROFILES_VERSION, "lia-relevance-profiles-v1-2026-09-07");
});

Deno.test("doc207 §4 step 2 — every AP row id in the hand-authored literal resolves through the generated file", () => {
  // Confirms the fallback to LIA_RELEVANCE_PROFILES is currently unreachable
  // in production: every literal key has a generated counterpart.
  for (const id of Object.keys(LIA_RELEVANCE_PROFILES)) {
    assert(
      id in LIA_PATTERN_PROFILES || id in LIA_RULE_PROFILES,
      `${id}: in the hand-authored literal but absent from both generated maps — the fallback would actually fire`,
    );
  }
});

Deno.test("doc207 §4 step 3 — THE PIN: liaProfileOf after the swap equals the hand-authored literal for every unaffected key, and equals the documented correction for every affected key", () => {
  const handKeys = Object.keys(LIA_RELEVANCE_PROFILES);
  assertEquals(handKeys.length, 39);

  const unexpectedDrift: string[] = [];
  let correctionsSeen = 0;

  for (const key of handKeys) {
    const row = AP_ROWS_BY_ID.get(key);
    assert(row, `${key}: named in LIA_RELEVANCE_PROFILES but not found in LIA_CORPUS_MAP's AP rows`);

    const before = LIA_RELEVANCE_PROFILES[key]!; // the literal, untouched by this track
    const after = liaProfileOf(row as CamRow)!; // liaProfileOf post-swap

    const beforeBytes = canonicalCamProfileBytes(before);
    const afterBytes = canonicalCamProfileBytes(after);

    if (beforeBytes === afterBytes) {
      continue; // identical — the common case (35 of 39 keys)
    }

    const corrections = KNOWN_CORRECTIONS[key];
    if (!corrections) {
      unexpectedDrift.push(`${key}:\n  before ${beforeBytes}\n  after  ${afterBytes}`);
      continue;
    }
    correctionsSeen++;
    for (const c of corrections) {
      assertEquals((before as Record<string, unknown>)[c.field], c.from, `${key}.${c.field}: literal no longer matches the recorded "before" value`);
      assertEquals((after as Record<string, unknown>)[c.field], c.to, `${key}.${c.field}: generated file no longer matches the recorded "after" value`);
    }
  }

  assertEquals(unexpectedDrift, [], `undocumented drift between the literal and the generated file:\n${unexpectedDrift.join("\n")}`);
  assertEquals(correctionsSeen, Object.keys(KNOWN_CORRECTIONS).length, "every documented correction key must actually be present in the literal and differ as recorded");
});

Deno.test("doc207 §4 step 3 — every AP row still has a profile after the swap (doc189-lia-relevance.test.ts's own invariant, re-checked here)", () => {
  for (const r of AP_ROWS) {
    assert(liaProfileOf(r), `AP row ${r.id} has no relevance profile after the doc207 Track 2 re-point`);
  }
});

Deno.test("doc207 §4 step 2 — LIA_RELEVANCE_PROFILES was NOT deleted (4 of 39 keys still differ from the generated file)", () => {
  // This is the negative-space assertion doc 207 §4 step 2 requires: the
  // literal must still exist and still be importable because equivalence is
  // not yet total. If a future pass hand-corrects the 4 rows above (or
  // removes the literal outright) this test's premise changes and it, and
  // KNOWN_CORRECTIONS above, must be updated together.
  assertEquals(Object.keys(LIA_RELEVANCE_PROFILES).length, 39);
  assertEquals(Object.keys(KNOWN_CORRECTIONS).length, 4);
});
