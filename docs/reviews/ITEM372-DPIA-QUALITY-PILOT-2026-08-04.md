# ITEM 372 — DPIA QUALITY PILOT (methods 2 and 3) — EVIDENCE

Date: 2026-08-04 · Product: `dpia` only · Status: **built, seeded, proven**

## What shipped

| Method | Change | Where |
|---|---|---|
| 2a | Executive **Determination** block renders first (screen, PDF), after the identity header and draft banner, before Section 0. Prose, not a table. EDPB sections 0–6 untouched. | `_shared/report-exhibits/determination.ts`, `DeterminationBlock.tsx`, `DPIAReportBody.tsx`, `DPIAFrameworkResult.tsx`, `generate-report-pdf/index.ts` |
| 2b | Bracket tags lifted out of prose into the asks surface; in place, a counsel-voice absence sentence via the live frame-substitution pass. Bare tags in table cells become "To be completed: …". Orphan closing brackets (wreckage of collapsed placeholders) are dropped. | `_shared/prose/bracket-tags.ts` |
| 2c | Authority appendix states the "citation only — no approved corpus text" note **once** as a preamble; entries then list cleanly. | `_shared/report-exhibits/authority-exhibit.ts`, `AuthorityExhibit.tsx` |
| 3a | Single-home rule: five `home_assignments` in the plan; every section prompt lists points owned elsewhere ("reference, do not restate"); new conservative `cross_section_restatement` register-lint rule keyed on factual anchors. | `dpia.plan.json`, `_shared/prose/register-lint.ts`, `run-dpia-framework/index.ts` |
| 3b | CEO panel rewrite seeded as `extended_exemplars[0]`, `kind: reference_render`, `fact_exempt: true` (FORM guidance only — Acme Health facts never leak). | `dpia.plan.json` |
| 3c | Plan re-seeded with the **second content revision** (artifact label `prose-plans-2026-08-04-item372`) into the single `dpia` row, which is `version = 1`, `library_schema_version = 2`; the row is `approved = true` by CEO sign-off recorded directly in the database. "v2" in earlier drafts meant this content revision, NOT a second `version` row. | `prose_document_plans / dpia`, `version 1`, hash at seeding `9d256ac7…aa64`; current hash after the change-control field rename: `70718f28…7897` |
| Rider | `COUNSEL_REFERRAL_RE` now matches "outside counsel" / "external counsel"; sanctioned-register and disclaimer exemptions unchanged. Positive and negative controls in tests. | `_shared/advisory-voice.ts` |

## Proof run — two real stored DPIA renders

Passes applied to the stored `report_data` (no model call).

| | `c2d39052` | `89dd0525` |
|---|---|---|
| Bracket tags found | 40 | 68 |
| Lifted out of prose | 31 | 53 |
| Labelled blanks (table cells) | 9 | 15 |
| Asks added | 38 | 64 |
| **Bracketed interruptions inside prose, after** | **0** | **0** |
| Register-lint total, before | 67 | 73 |
| Register-lint total, after | 70 | 67 |
| `orphan_bracket`, before → after | 0 → 0 | 4 → **0** |
| Determination block | 4 paragraphs, 8 missing foundations | 4 paragraphs, 8 missing foundations |

Notes on the numbers:

- The 46-finding Item 364 baseline was measured on a different (earlier) report;
  these two rows lint at 67 and 73 before the pass. The pass is not a prose
  rewriter — it removes structural wreckage. The `cadence_*` and
  `appositive_stack` counts are the model's sentence habits and move only when
  the register block and the reference exemplar drive the next generation.
- `cross_section_restatement` reports 35 / 39 on these legacy rows. Both predate
  the single-home prompt rule, so this is the expected pre-state, and it is the
  number the first post-approval generation should be judged against.
- Two old pool sentences remain in the legacy rows. The frame-substitution pass
  cannot replace them yet: the DPIA **frame set** is still `approved: false`.
  Only the **plan** was approved by this dispatch.

## Suites

- `item372-dpia-quality-pilot.test.ts` — **14 passed / 0 failed**
- `item372` + `item364-dpia-register` + `dpia.test.ts` — **32 passed / 0 failed**
- Frontend (`vitest run`) — **1022 passed / 1 failed** (see below)
- Edge (`tests/edge/_tests` + `tests/edge/_shared`) — **1505 passed / 45 failed**,
  all 45 in the pre-existing baseline inventory (registry `w1` tags, grader
  stamp mirrors, `dpia` BUILD_STAMP pinned at `dpia-t6fix@2026-07-25`, the four
  cppa-risk approval-state pins). None touch this dispatch's files.

## Open items for the CEO

1. **Change-control divergence.** The database rows for `lia`, `registration`
   and `biometric` are `approved = true`, but their authored JSON in
   `library/prose/` still says `approved: false`. The row is what the runtime
   reads, so those three products are live on their Wave 1 plans. The
   `prose-library-pin` test fails on `registration` for exactly this reason —
   it is a governance question, not a code defect, and I have not changed any
   approval state other than the DPIA plan this dispatch authorised.
2. The DPIA **frame set** remains unapproved. Approving it is what retires the
   last two old pool sentences.
