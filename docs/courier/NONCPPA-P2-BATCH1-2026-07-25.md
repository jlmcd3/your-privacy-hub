# NONCPPA INGESTION — P2 BATCH 1 (EDPB Guidelines 2/2019)
Stamp: p2-edpb-batch1@2026-07-25T10:19:38Z (controller tick; DB writes completed 10:16–10:18Z)
Scope: EDPB guidelines cleanup, family 1 of 10 — `EDPB Guidelines 2/2019` (Art 6(1)(b) online services), 34 rows.

## Source
- Official PDF: https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines-art_6-1-b-adopted_after_public_consultation_en.pdf (Version 2.0, adopted 8 Oct 2019)
- Cached extraction sha256 (raw): dd3d96cb52bb15e9bff615cac61f400777423f41ff3e032626458e30a57ab85a
- Cached extraction sha256 (ws-normalized): c79883a06bfe0ba358323875c33e90d6b7bc8afb0b30edc8552aff0bd24222f8

## Writes (all via Lovable query_database, corpus table `edpb_guidelines` only)
1. DDL: `ADD COLUMN IF NOT EXISTS excerpt_text_norm text` (plan-mandated normalized shadow text).
2. DDL: `edpb_guidelines_status_check` extended to admit `'front_matter'` (was final/consultation/superseded). Ruled deviation: additive-only; all product consumers filter `.eq("status","final")` (verified by repo grep: edpb-1-2024-consistency.ts, generate-ir-playbook, run-li-assessment, gdpr-context), so flagged rows are auto-excluded with zero code change.
3. Shadow backfill (34/34 rows): `excerpt_text_norm = btrim(regexp_replace(translate(excerpt_text, chr(61623), ' '), '\s+', ' ', 'g'))`.
4. Front-matter flag (2 rows): cover row e548785e, TOC row 78ceb546 (dot-leader signature `\.{5,}\s*\d`) → `status='front_matter'`, heading left NULL.
5. section_heading backfill (32 content rows, 10 heading groups): headings taken from the source body (not TOC), position-checked — every assigned heading's body position precedes the row's pinned excerpt position in the source text. Distribution: 1.1×4, 1.2×1, 2.1×4, 2.2×2, 2.3×1, 2.4×2, 2.5×8, 2.6×3, 2.7×1, 3.1×1, 3.3×3, 3.4×2. (3.2 Fraud prevention content sits inside chunk boundaries of adjacent rows; no row's start falls under 3.2.)

## Deterministic acceptance (pin-test) — PASSED 34/34
- Method: md5-over-normalized-substring. DB side: `md5(regexp_replace(translate(excerpt_text, chr(61623), ''), '\s', '', 'g'))`; local side: identical strip applied to cached source; anchor located by first-120-char normalized prefix, then full-length segment md5 compared. No model attestation — byte-deterministic both sides.
- Normalization ruled: whitespace-insensitive + removal of U+F0B7 (private-use bullet glyph present in ingested text, absent in fresh extraction). All other characters exact. Two divergence classes found and attributed: (a) ingestion extractor inserts a space between footnote digit and following '(' — whitespace-only; (b) U+F0B7 bullets ×4 in one row (5d8978cf).
- First-pass exact-whitespace-collapse pin: 31/34; ws-stripped: 33/34; ws+U+F0B7-stripped: 34/34.

## Not done / notes
- No sample-report regeneration (standing rule). No edge deploys rode this batch. Remaining P2 families: 9 (next: EDPB Guidelines 2/2019 done → 01/2022 largest at 157 rows). UK gdpr_articles article_title backfill (81 rows) still queued for a later P2-window tick.
- Budget: this batch consumed only controller tick time + trivial DB queries; well under plan estimate.
