# ITEM 292 — CLEAN-RUN BATCH 4 RESULT + CEO READ OPEN (2026-07-30)

**Authority:** Controller dispatch 2026-07-30. RECORD ONLY — no code change, no deploy, no harness invocation, no DB write.

**Purpose:** Record the post-Item-290 clean-run acceptance batch and open the CEO review surface at `/admin/replay-review`.

---

## 1. Batch Design

Batch 4 jobs were noted: **"Step 0a — CLEAN RUN batch 4 (post-Item-290, 20 docs, CEO read gate)"**. Twenty single-document replay jobs were dispatched against the rebuilt `run-cppa-risk-assessment` Track-2 surface with the Item-290 single-key scope fix deployed.

## 2. Deterministic Results

| Metric | Result |
|---|---|
| Persisted deterministic reports | **20 / 20** |
| GTM `release` | **0** |
| GTM `release_with_logged_defects` | **20** |
| GTM `block` | **0** |

**The acceptance bar (100% release or `release_with_logged_defects`, zero block) is MET on the shipped deterministic surface.**

## 3. Scope-Duplication Block Eliminated

The seven blocks observed in Batch 3 (`section_cross_duplication:scope_confirmation=scope_and_triggers`) dropped to **zero** after the Item-290 single-key scope emission. The `scope_confirmation` key is no longer emitted on Track-2 assembled reports; the surviving key `scope_and_triggers` carries the identical content, and the GTM detector no longer observes the cross-key collision.

## 4. Pass-2R Prose Conversion

- **Pass-2R observe stage completed:** 8 documents
- **Validator rejects with `prose_rejected` persisted:** 7 documents
- **Lost to isolate death:** 12 documents
- **Prose conversion this batch:** 0

**Cumulative passing prose documents:** 2

- `2391b49a` (Batch 2, Item-287)
- `d47f2960` (Batch 3, Item-288)

Both passing prose documents remain available as side-by-side candidates in the CEO review surface.

## 5. Adjudication Backlog

The 7 validator rejects in this batch are dominated by the `verdict_consistency` class (e.g., `["Low","Moderate"]` mixed verdicts). Rejected-prose adjudication is the next calibration workstream after the CEO read, beginning with the `verdict_consistency` class first to raise prose conversion rate.

## 6. CEO Read Is Open

The CEO review surface is live at `/admin/replay-review` on the Batch-4 corpus. The two prose-converted documents (`2391b49a`, `d47f2960`) are presented as side-by-side candidates for comparison.

## 7. Pending Executor Queue

1. **Rejected-prose adjudication** — `verdict_consistency` class first.
2. **Item 291 EU corpus gap analysis** — awaiting CEO review of the inventory before any ingestion spend.

## 8. Double-Check

- Diff limited to `docs/courier/ITEM292-CLEAN-RUN-2026-07-30.md` and `docs/pipeline-state.md`.
- No `.ts`, `.tsx`, `.sql`, or deploy artifacts touched.
- No harness invoked, no DB rows written.

**Disposition:** RECORDED. Clean-run acceptance bar met; CEO read opened; prose-adjudication and corpus-gap queues remain pending.
