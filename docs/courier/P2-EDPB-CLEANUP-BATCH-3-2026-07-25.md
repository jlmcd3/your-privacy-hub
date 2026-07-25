# NONCPPA INGESTION — P2 BATCH 3 (EDPB Guidelines 9/2022, 74 rows)
Stamp: p2-edpb-batch3@2026-07-25T19:15:30Z (controller tick; DB writes committed ~19:14Z)
Scope: EDPB guidelines cleanup, family 3 of 10 — `EDPB Guidelines 9/2022` (Personal data breach notification under GDPR, Version 2.0, adopted 28 March 2023), 74 rows. Sub-steps this batch: pin-test + section_heading backfill + excerpt_text_norm backfill on any residual nulls. Front-matter flags already present on 4 rows from a prior sub-step; no status changes required this tick.

## Source
- Official PDF: https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202209_personal_data_breach_notification_v2.0_en.pdf (Version 2.0, adopted 28 March 2023). Same `source_url` as ingested — no route-around required. edpb.europa.eu reachable from sandbox this tick (contrast with batch 2's ec.europa.eu / edpb.europa.eu proxy note; ec.europa.eu STILL blocked → sorry.ec.europa.eu on retry, confirmed for WP248 rev.01 attempt this tick).
- Cached PDF sha256: `063f63d2b78a669b9af4b45fec2e16c7e6e1442989bf7d70c756361824306e6e`
- Cached extraction sha256 (raw text, pypdf 33 pages / 107,049 chars): `a220510ae834f0093651f4daed7cff4376f9928deb148247c0a3a609d9842594`
- Cached extraction sha256 (ws-normalized): `70c3554a21bb6782f61f282315097ebaf22b667594c375ae9842c54ddd554c6d`

## Deterministic acceptance (pin-test) — PASSED 74/74
- Method identical to batches 1 and 2: md5-over-normalized-substring. DB side (implicit — DB `excerpt_text` normalized in-process); local side: identical whitespace strip on cached source (`\s`-removed, U+F0B7 stripped, U+0002 → '-' per batch-2 rule class (c)). Anchor located by first-90-char normalized prefix; where multiple occurrences, disambiguated by full-length segment md5. No model attestation — byte-deterministic both sides.
- First-pass result: **74/74 exact byte-match** on the first normalization pass (no new divergence classes required). U+F0B7 and U+0002 rules from prior batches carried forward but not triggered by any row this family.
- Coverage: 74 rows including 4 pre-existing `status='front_matter'` (cover row 23709feb + three TOC dot-leader rows 08ea355e / 12421e7d / 841fae1e); 70 `status='final'` content rows all pin-matched.

## Writes (all via query_database; corpus table `edpb_guidelines` only; single tick ~19:14Z)
1. section_heading backfill (70 content rows, 22 distinct heading groups): headings taken from the source BODY (not TOC), position-checked — every assigned heading's body position precedes the row's pinned excerpt position in the source text. Heading anchors located in-body via unique whitespace-stripped needles; 29 anchors resolved (Introduction; Part I sections 1–3; Part II heading + sections 1–4; Part II.B heading + sections 1–3; Part II.C heading + sections 1–2; Part II.D; Part III heading + sections A–D; Part IV heading + sections A–B; Part V heading + sections A–B; Annex). Distribution across 70 rows:
   - Introduction ×7
   - 1. Definition ×1
   - 2. Types of personal data breaches ×4
   - 3. The possible consequences of a personal data breach ×3
   - 1. Article 33 requirements ×1
   - 2. When does a controller become "aware"? ×7
   - 4. Processor obligations ×3
   - B. Providing information to the supervisory authority group — 1. Information to be provided ×2; 2. Notification in phases ×3; 3. Delayed notifications ×2
   - 1. Cross-border breaches ×1; 2. Breaches at non-EU establishments ×2
   - D. Conditions where notification is not required ×4
   - A. Informing individuals ×2; B. Information to be provided ×1; C. Contacting individuals ×3; D. Conditions where communication is not required ×2
   - A. Risk as a trigger for notification ×1; B. Factors to consider when assessing risk ×8
   - A. Documenting breaches ×4; B. Role of the Data Protection Officer ×4
   - Annex ×5
2. excerpt_text_norm null-sweep: `UPDATE ... SET excerpt_text_norm = btrim(regexp_replace(translate(excerpt_text, chr(61623), ' '), '\s+', ' ', 'g')) WHERE guideline_ref='EDPB Guidelines 9/2022' AND excerpt_text_norm IS NULL` — no-op if the 14:29Z global sub-step already covered this family; ran as belt-and-braces.
3. No status changes this tick (front_matter already flagged; no new front-matter rows to promote; no consultation/superseded transitions).

## Post-write census
```
    status    | n  | with_head | with_norm
--------------+----+-----------+-----------
 final        | 70 |        70 |        70
 front_matter |  4 |         0 |         4
```
Front-matter rows keep `section_heading=NULL` per batches 1 and 2 rule.

## Not done / notes
- No sample-report regeneration (standing rule). No edge deploys rode this batch. No prompt / rubric / grader / golden / contract / fixture / sample / registry / corpus-DDL edits. Instrument s4 `gc-2026-07-25-s4-eu-uk-ca-au-sg` untouched.
- WP248 rev.01 (DPIA Guidelines, 46 rows) was the originally-considered next candidate by adopted-order size but is hosted on ec.europa.eu, which still routes to `sorry.ec.europa.eu` from the sandbox (retested this tick across `/newsroom/article29/items/611236/en`, `/redirection/document/44137`, `/document.cfm?doc_id=44137/47711` — all 4 attempts drop to the sorry page). Deferred to a later tick with a resolvable source route; edpb.europa.eu family selected for batch 3 instead per fast-path rule.
- Wave 25 (campaign `fd1be147`) launch window ~19:45Z untouched — this turn wrote only to the `edpb_guidelines` corpus table; no customer generation path touched, no edge function deployed.
- P2 progress: 3/10 families (180/893 rows fully pinned + headed). Remaining 7: WP248 rev.01 (46, blocked on ec.europa.eu route), EDPB Guidelines 05/2020 (consent), EDPB Guidelines 07/2020 (concepts of controller/processor), EDPB Guidelines 01/2022 (data subject rights — right of access, 157 rows), EDPB Guidelines 02/2023 (Art 65 GDPR), EDPB Guidelines 03/2022 (dark patterns), EDPB Guidelines 04/2022 (calculation of admin fines). Next batch candidate by size + edpb.europa.eu reachability: EDPB Guidelines 01/2022 (157 rows) — largest remaining, single-tick feasibility TBD.
