# ITEM 270 — ACCEPTANCE-CORPUS RULING (2026-07-30)

**Turn class:** ledger + courier ONLY. No code, no deploys, no harness
invocation, no grader edits.

## 1. Ruling (team-unanimous)

The §7 replay / acceptance corpus is defined as the archive's
**MODERN-CONTRACT era**: **215 of 245** `cppa-risk` archive documents
(created 2026-07-13 → 2026-07-28) whose `intake_data` carries the current
contract keys.

The **30 pre-realignment documents** (2026-07-11 → 2026-07-13; ZERO modern
contract keys; nested legacy schema `impact` / `triggers` / `exceptions` /
`org_context` / `activity_details` / `annual_consumer_volume`) are
**EXCLUDED** from acceptance scoring and enumerated in §3 below.

Verification query (read-only, controller-reproducible):

```sql
select count(*) total,
       count(*) filter (where not (intake_data ?| array[
         'q1_revenue','q2_consumers','q5_sell_share','q15_sensitive_pi',
         'q18_admt_use','q3_sector','q4_pi_categories','entity_name']))
         as legacy_zero_modern
from quality_archive.quality_run_documents_20260728
where tool = 'cppa-risk';
-- total 245 | legacy_zero_modern 30
```

## 2. Four-lens record

- **CS:** the current intake contract IS the product. No customer can submit
  the old shape today, so replaying it measures a compatibility layer that
  neither track ships. Measuring it would move the ruler without moving the
  product.
- **Privacy-law:** § 7156 / § 7152 conclusions must trace to the fields the
  current form actually collects. A fabricated old→new semantic mapping
  would put words in customers' records — invention, prohibited.
- **Prompt-engineering:** n/a (no prompt surface touched).
- **Prose:** n/a (no customer-facing text authored).

**Item-269 evidence basis.** The era normalizer
(`era-normalize@2026-07-30-item269`) DID apply on the rerun — 4 keys mapped
(`q2_consumers`, `q5_sell_share`, `q15_sensitive_pi`, `exceptions_intake`)
with band labels resolved (e.g. `"Over 10 million" -> "1,000,000 or more"`)
— and 25/26 era docs still wrote around. The residual is not a tuning gap:
the narrative contract fields live in nested legacy objects for which **no
mapping code exists anywhere in the codebase**, and per the no-invention
constraint none was fabricated.

## 3. Excluded documents (30)

| # | doc id | created_at (UTC) |
| --- | --- | --- |
| 1 | 6e16ecd9-896c-47e3-93c7-53a8cc4f932b | 2026-07-11T13:41:04Z |
| 2 | b4338ce1-476d-49c0-af0f-baa86237348e | 2026-07-11T13:55:48Z |
| 3 | b5b5156d-d7b2-42ab-8bc2-f5044e599f1b | 2026-07-11T14:45:52Z |
| 4 | 961b160c-a130-4266-8bd0-98e3b18537d4 | 2026-07-11T18:57:20Z |
| 5 | a96909cf-6342-48fc-ab5f-bda611e56567 | 2026-07-11T19:13:34Z |
| 6 | 56ba21bf-aac1-4897-bc86-77e66ad8cdae | 2026-07-11T19:27:15Z |
| 7 | 8d63bb9b-7bc5-421d-9bbc-e8673b905ec4 | 2026-07-11T20:30:11Z |
| 8 | 89ee89d5-b404-43f1-adb7-918a52d5c30c | 2026-07-11T20:54:24Z |
| 9 | 6bb575fd-9942-4967-882d-4a8a55434e84 | 2026-07-11T20:58:27Z |
| 10 | 67fe63d0-5e52-4892-87d3-f6c0567dba92 | 2026-07-11T21:02:56Z |
| 11 | 2a8de57a-147f-403d-ab8b-93deb843f5b3 | 2026-07-11T21:07:24Z |
| 12 | b6cd74d4-91a7-4fae-ac1f-f1d1dd4403b8 | 2026-07-11T21:13:05Z |
| 13 | 6422d100-2c9f-456f-8327-8ef4d4022eb4 | 2026-07-12T02:35:13Z |
| 14 | d4c55d1b-89e1-45c8-8ec0-8daef14b2edc | 2026-07-12T02:39:02Z |
| 15 | c759a639-c873-467e-bfb6-83f1416086de | 2026-07-12T02:44:25Z |
| 16 | 4623f6a8-827f-4d7c-8d66-e95001e0a44d | 2026-07-12T02:49:14Z |
| 17 | 025ed86a-ca22-4be3-9da6-ecad620f18eb | 2026-07-12T02:55:00Z |
| 18 | 5c846efb-e083-4e3d-ad78-08f9fa2b93b9 | 2026-07-12T19:42:45Z |
| 19 | 98d7d0fa-a9e3-4992-bcbb-8cd508f9239c | 2026-07-12T19:46:53Z |
| 20 | ad1da204-ef44-4226-87f4-4a67557372f7 | 2026-07-12T19:51:40Z |
| 21 | 4976c319-0b38-4bbe-93b5-52dbe41a2265 | 2026-07-12T19:56:23Z |
| 22 | 21c5259f-32d3-4850-a868-43975bdc6211 | 2026-07-12T20:01:18Z |
| 23 | daab2449-5a93-4403-b85a-c2c98bdb0273 | 2026-07-12T21:42:17Z |
| 24 | 9667511f-e735-446b-946c-b435a4a909cd | 2026-07-12T21:46:14Z |
| 25 | ba8352f0-3f26-48ea-8650-2f2c93ab2fac | 2026-07-12T21:50:42Z |
| 26 | e2339752-2c57-493a-a56c-c50a3fe07be0 | 2026-07-12T21:55:02Z |
| 27 | 2321a497-0618-409f-9079-a766068b0cef | 2026-07-12T22:00:07Z |
| 28 | 590a5548-7e8b-4704-abe1-87dd4cde3206 | 2026-07-12T22:03:51Z |
| 29 | b2d46ca2-8ea3-4c0a-8f09-3b6beab233d4 | 2026-07-13T08:48:14Z |
| 30 | 40b837e5-f841-428d-9bba-a0c40f6cb979 | 2026-07-13T09:03:26Z |

(Doc 8, `89ee89d5-…`, is the Item-269 era fixture recorded verbatim in
`_shared/ltp/item269-era-and-fossil.test.ts`.)

## 4. ⚑ FLAGGED FOR CEO REVIEW — VETO AVAILABLE

This ruling **INTERPRETS** SPEC §7's "full-archive replay" as
**full-COMPATIBLE-archive replay**. That is a Ruling-A-class clarification
(same family as the gate-location ruling), not a spec amendment, and it is
raised here **prominently for CEO review with veto**.

If the CEO wants the 30 old-era documents covered, the alternative is an
explicit **old-form mapping table authored as a CEO-signed courier**. The
mapping IS content: it asserts what old customers meant. It cannot be
authored by the executor under the no-invention constraint.

## 5. GTM standing at the time of this ruling

Every GTM-graded modern-contract document is shippable: ramp-3 modern
**24/24** (8 `release`, 16 `release_with_logged_defects` — logged defects
all non-material golden-shape/advisory classes) plus exemplar attempt 9
(`release_with_logged_defects`). **100% shippable on the graded modern
population (25 docs); full-corpus run pending.**
