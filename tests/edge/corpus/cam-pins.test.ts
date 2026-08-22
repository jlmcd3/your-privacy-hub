// Corpus-pin law (doc 48 §II.2a law 1): every CamRow's pinned_excerpt must
// be an exact contiguous substring of the committed snapshot's text for
// that row's source_row_id/excerpt_field. Runs against SNAPSHOT FIXTURES,
// not live Supabase (local tests can't reach it — the _w15 baseline's
// lesson, doc 52 §1).

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { excerptPinned, type CorpusSnapshot } from "../../../supabase/functions/_shared/corpus/cam-verify.ts";
import { RISK_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/risk-corpus-map.ts";

Deno.test("RISK_CORPUS_MAP: every pinned_excerpt is a substring of its snapshot row", async () => {
  const raw = await Deno.readTextFile(RISK_CORPUS_MAP.snapshot_file);
  const snapshot: CorpusSnapshot = JSON.parse(raw);
  for (const row of RISK_CORPUS_MAP.rows) {
    assert(
      excerptPinned(row, snapshot),
      `${row.id}: pinned_excerpt not found in snapshot row ${row.source_row_id}.${row.excerpt_field}`,
    );
  }
});

Deno.test("RISK_CORPUS_MAP: snapshot has a captured_at stamp", async () => {
  const raw = await Deno.readTextFile(RISK_CORPUS_MAP.snapshot_file);
  const snapshot: CorpusSnapshot = JSON.parse(raw);
  assert(typeof snapshot.captured_at === "string" && snapshot.captured_at.length > 0);
});
