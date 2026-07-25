# NONCPPA-UK-TITLE-BACKFILL — Courier Report

**Stamp:** 2026-07-25T10:36:30.936Z (DB `now()`)
**Controller:** `eup-quality-campaign-analysis` tick 10:33Z
**Ledger:** `docs/pipeline-state.md` item 45 (dispatched as "43"; re-slotted per numbering-collision note in that item)
**Class:** T5 residual, P2-window tick — corpus-table write only

---

## Scope

Backfill `gdpr_articles.article_title` for every row where `jurisdiction = 'uk'`.
Pre-state: **81 / 81** UK rows with `article_title IS NULL` (or empty).
Post-state: **81 / 81** UK rows populated with verbatim titles from the official
UK GDPR table of contents. EU rows out of scope and untouched.

## Source

- **URL:** <https://www.legislation.gov.uk/eur/2016/679/contents>
- **Retrieved:** 2026-07-25 ~10:35Z
- **Nature:** Official UK legislation table of contents for the UK GDPR, reflecting
  the current in-force text including all articles inserted by the Data (Use and
  Access) Act 2025 (DUAA) and confirming the repeal of Arts. 22, 44, and 45.

## Method

Single guarded `UPDATE` executed via `query_database`:

- **Shape:** `UPDATE gdpr_articles SET article_title = v.title, updated_at = now() FROM (VALUES …) AS v(article_number, title) WHERE gdpr_articles.article_number = v.article_number AND gdpr_articles.jurisdiction = 'uk' AND (gdpr_articles.article_title IS NULL OR gdpr_articles.article_title = '')`
- **Key:** `article_number` (VALUES-join), scoped to `jurisdiction = 'uk'`.
- **Guard:** `WHERE` clause restricts writes to NULL / empty titles only, making
  the statement idempotent and safe against re-runs.
- **Payload:** 81 `(article_number, verbatim_title)` pairs transcribed 1:1 from
  the ToC HTML, including all DUAA-inserted articles listed below.
- **Corpus scope:** writes to `gdpr_articles` only. No edge-function deploys, no
  rubric / grader / golden / contract / prompt / registry edits.

## Acceptance checks

1. **1:1 ToC match.** All 81 UK `article_number` values in the DB matched exactly
   one entry in the legislation.gov.uk ToC, including the DUAA-inserted articles:
   **4A, 8A, 11A, 22A, 22B, 22C, 22D, 44A, 45A, 45B, 45C, 47A, 49A, 84A, 84B, 84C,
   84D, 86A, 91A**. No ToC entries orphaned; no DB rows without a source title.
2. **Repealed-article absence.** Articles **22, 44, 45** are absent from the UK
   corpus, consistent with the P3 UK-reconciliation finding
   (`docs/courier/NONCPPA-P3-BATCH-REPORT-2026-07-25.md`, ledger item 39). No
   attempt to fabricate titles for repealed articles.
3. **Post-check.** `SELECT COUNT(*) FILTER (WHERE article_title IS NULL OR article_title = '') AS still_missing, COUNT(*) AS total FROM gdpr_articles WHERE jurisdiction = 'uk'` → `still_missing = 0`, `total = 81`.
4. **Uniform stamp.** All 81 updated rows carry `updated_at = 2026-07-25T10:36:30.936Z`
   (single-statement DB `now()`), confirming the atomic write.
5. **EU untouched.** `SELECT COUNT(*) FROM gdpr_articles WHERE jurisdiction = 'eu' AND updated_at >= '2026-07-25T10:36:00Z'` → **0**. EU rows not modified in this
   turn.
6. **Spot-checks.** Verbatim-string equality confirmed for rows: **4A, 17, 22A, 47A,
   84B, 95** against the corresponding ToC entries. No trimming, no case changes,
   no punctuation drift.

## Stamp

`2026-07-25T10:36:30.936Z` (DB `now()` at UPDATE commit)

## Constraints honored

- **Corpus-only writes** to `gdpr_articles` (UK jurisdiction); no other tables
  touched.
- **No edge-function deploys** and **no instrument changes** (rubric, grader,
  golden, contract, prompt, registry all untouched).
- **No CPPA-table writes.**
- **WHERE-guarded** to NULL / empty titles only → idempotent, non-clobbering.
- **Change surface** limited to `gdpr_articles` (corpus) plus this courier report
  and `docs/pipeline-state.md` (ledger).

## European-corpus precondition progress

- UK title residual: **DONE** (this turn).
- Remaining precondition for Fable-5 revisit: **P2 EDPB guideline families 2+**
  (families beyond Guidelines 2/2019 § 2.4, ledger item 41).
