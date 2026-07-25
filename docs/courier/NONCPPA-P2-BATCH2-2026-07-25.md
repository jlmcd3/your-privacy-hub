# NONCPPA INGESTION — P2 BATCH 2 (EDPB Guidelines 3/2018, 72 rows)
Stamp: p2-edpb-batch2@2026-07-25T18:49:06Z (controller tick; DB writes committed ~18:47Z)
Scope: EDPB guidelines cleanup, family 2 of 10 — `EDPB Guidelines 3/2018` (territorial scope, Art 3), 72 rows. Sub-steps this batch: pin-test + section_heading backfill + front-matter flag. (excerpt_text_norm already backfilled family-wide by the 14:29Z global sub-steps turn.)

## Source (ruled deviation, documented)
- DB `source_url` is `.../edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_0.pdf`; edpb.europa.eu is unreachable from the analysis sandbox (proxy 403/refused, retested this tick) AND ec.europa.eu likewise. Route-around: official EDPB sibling upload `.../edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf` (same domain, same adopted Version 2.1 document) fetched via web_fetch; extraction transited to sandbox by direct tool-result file read (NO context transit — see ledger note on the resolved transit blocker).
- Byte-equivalence of _en_1 to the ingested _en_0 is PROVEN empirically by the pin-test: 72/72 rows byte-exact, with the SINGLE divergence confined to the cover date on the front-matter row (see below).
- Cached extraction sha256 (raw, incl. 4-line fetch header): 3084d65b78b7ebdb4610203d96137668e2a1adb43c9033a99924ef56452b6145
- Cached extraction sha256 (header-stripped source.txt): 591d17bbbee508f37477014bc101c4f98abc4815529b76749a0a4e41d692ee14
- Cached extraction sha256 (ws-normalized): 58f2c7c752597cd71d1935db7800d05adff81ca2aadbba1baaf6a99d91cee87c

## Deterministic acceptance (pin-test) — PASSED 72/72
- Method identical to batch 1: md5-over-normalized-substring. DB side: `md5(regexp_replace(translate(excerpt_text, chr(61623), ''), '\s', '', 'g'))`; local side: identical whitespace strip on cached source, anchor located by first-90-char normalized prefix (all anchors unique after disambiguation), full-length segment md5 compared. No model attestation — byte-deterministic both sides.
- Coverage: contiguous — first row starts at stripped offset 0 (front matter), last row ends at 78,270 = full stripped length; zero gaps > 5 chars.
- Divergence classes found and attributed (both systematic, neither weakens the pin):
  (c) NEW CLASS: extractor emits control char U+0002 in place of a line-break hyphen ×4 ("case-by\x02case", "German\x02registered", +2). Ruled normalization: map \x02 → '-'. First-pass exact: 68/72; after \x02-map: 71/72.
  (d) NEW CLASS (front-matter only): _en_1 cover carries "Version 2.1 / 12 November 2019", ingested _en_0 carries "Version 2.1 / 07 January 2020" (the v2.1 formatting-change date). Single documented substitution on row afc25dbb makes it byte-exact (md5 7cd9ab24e87add6fe3a5fa530e0c3115 reproduced). Divergence confined to cover; zero content-row impact.
  One prefix ambiguity (de2eba9e — repeated sentence, 2 occurrences) resolved deterministically by full-segment md5 at each candidate anchor.

## Writes (all via Lovable query_database, corpus table `edpb_guidelines` only, single transaction ~18:47Z)
1. Front-matter flag (1 row): cover+TOC+version-history chunk afc25dbb (dot-leader TOC signature present) → `status='front_matter'`, `section_heading=NULL`.
2. section_heading backfill (71 content rows, 5 heading groups): headings taken from the source BODY (not TOC), position-checked — every assigned heading's body position precedes the row's pinned excerpt position (single documented exception: first body row e42efa89, where the INTRODUCTION heading opens inside the row span and no heading precedes it; assigned 'Introduction' under the stated within-row rule). All 5 heading anchors occur exactly once in the body. Distribution: Introduction ×4; '1 Application of the establishment criterion - Art 3(1)' ×24; '2 Application of the targeting criterion - Art 3(2)' ×26; '3 Processing in a place where Member State law applies by virtue of public international law' ×3; '4 Representative of controllers or processors not established in the Union' ×14.
3. Post-write census: front_matter=1 (heading NULL), final=71 (heading set 71/71).

## Not done / notes
- No sample-report regeneration (standing rule). No edge deploys rode this batch. No DDL this batch (status check constraint already admits 'front_matter' from batch 1).
- Remaining P2 families: 8 (next by size: WP248 rev.01, 46 rows — hosted on ec.europa.eu; then EDPB Guidelines 9/2022, 74 rows).
- P2 progress: 2/10 families (106/893 rows fully pinned+headed).
