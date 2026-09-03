// Corpus-pin law (doc 48 §II.2a law 1): every CamRow's pinned_excerpt must
// be an exact contiguous substring of the committed snapshot's text for
// that row's source_row_id/excerpt_field. Runs against SNAPSHOT FIXTURES,
// not live Supabase (local tests can't reach it — the _w15 baseline's
// lesson, doc 52 §1).

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { excerptPinned, type CorpusSnapshot } from "../../../archive/unwired/_shared/corpus/cam-verify.ts";
import type { CorpusMap } from "../../../supabase/functions/_shared/corpus/cam-types.ts";
import { RISK_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/risk-corpus-map.ts";
import { ADMT_CORPUS_MAP } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-corpus-map.ts";
import { DPIA_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/dpia-corpus-map.ts";
import { CYBER_CORPUS_MAP } from "../../../supabase/functions/run-cppa-cybersecurity/_local/corpus/maps/cyber-corpus-map.ts";
import { LIA_CORPUS_MAP } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-corpus-map.ts";
import { NOTICES_CORPUS_MAP } from "../../../archive/unwired/_shared/corpus/maps/notices-corpus-map.ts";

const MAPS: readonly CorpusMap[] = [
  RISK_CORPUS_MAP,
  ADMT_CORPUS_MAP,
  DPIA_CORPUS_MAP,
  CYBER_CORPUS_MAP,
  LIA_CORPUS_MAP,
  NOTICES_CORPUS_MAP,
];

for (const map of MAPS) {
  Deno.test(`${map.product}: every pinned_excerpt is a substring of its snapshot row`, async () => {
    const raw = await Deno.readTextFile(map.snapshot_file);
    const snapshot: CorpusSnapshot = JSON.parse(raw);
    for (const row of map.rows) {
      assert(
        excerptPinned(row, snapshot),
        `${row.id}: pinned_excerpt not found in snapshot row ${row.source_row_id}.${row.excerpt_field}`,
      );
    }
  });

  Deno.test(`${map.product}: snapshot has a captured_at stamp`, async () => {
    const raw = await Deno.readTextFile(map.snapshot_file);
    const snapshot: CorpusSnapshot = JSON.parse(raw);
    assert(typeof snapshot.captured_at === "string" && snapshot.captured_at.length > 0);
  });
}
