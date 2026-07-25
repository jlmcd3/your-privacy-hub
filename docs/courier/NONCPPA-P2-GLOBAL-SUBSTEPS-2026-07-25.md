# NONCPPA INGESTION — P2 GLOBAL SUB-STEPS (norm backfill + TOC flags, all families)
Stamp: p2-global-substeps@2026-07-25T14:29:21Z (controller tick 14:24Z; DB db_now 2026-07-25T14:29:21.872744+00)
Scope: RULED DEVIATION from per-family batch plan. Sandbox egress proxy returns 403 CONNECT for edpb.europa.eu (curl, both hosts, retried), and the web_fetch-extracted PDF text (133,508 chars for Guidelines 01/2022) cannot reach the analysis sandbox without a ~70K-token double context transit. Therefore this tick executed only the SOURCE-INDEPENDENT P2 sub-steps, globally across all 10 families. Per-family pin-tests + position-checked section_heading backfill remain OPEN, gated on a restored source path. FLAG FOR JOHN: sandbox proxy blocks edpb.europa.eu; either allowlist it or accept slower per-family transits.

## Writes (all via Lovable query_database, corpus table `edpb_guidelines` only)
1. excerpt_text_norm backfill, 859 rows (all rows outside batch-1 family 2/2019): identical batch-1 formula `btrim(regexp_replace(translate(excerpt_text, chr(61623), ' '), '\s+', ' ', 'g'))`, WHERE excerpt_text_norm IS NULL.
2. Front-matter flags, 20 rows: conservative dominance rule — row matches dot-leader signature `\.{5,}\s*\d` AND dot fraction >= 0.49 AND >= 6 dot-leader runs. All 20 heads manually inspected pre-write (pure TOC or cover/version-history chunks). Flagged ids: 8078430f, 00706150, 08ea355e, be1e7042, 52dc739d, 8f2e5c81, 2ce0edea, 841fae1e, b6cb9fd0, 71e8fa4b, 12421e7d, 1a1d28ff, 4540351f, 66287162, 829da0ab, a5369863, b2ac790c, 730d1ac7, 9541cb7e, 23709feb. Mixed/sub-threshold rows (11 more matched the signature, dot_frac 0.18–0.38) deliberately NOT flagged — deferred to source-verified per-family passes. Reversible (status flip only); all product consumers filter status='final' (verified batch 1).

## Deterministic acceptance — PASSED
- still_null_norm = 0 / 893 total rows.
- norm_mismatch (recomputed formula vs stored) = 0 / 893.
- status counts post-write: front_matter 22 (2 batch-1 + 20 this tick), final 871.

## Not done / open
- Per-family pin-tests (100% md5-over-normalized) and section_heading backfill: OPEN for families 01/2022, 07/2020, 1/2024, Rec 01/2020, WP260, 05/2020, 9/2022, 3/2018, WP248 — need source PDFs (blocked, see above).
- No sample regen, no deploys, no instrument/status-check DDL changes this tick.
