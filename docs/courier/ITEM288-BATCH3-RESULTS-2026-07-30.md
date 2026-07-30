# ITEM 288 — STEP-0a BATCH 3 RESULTS + ADJUDICATION QUEUE

**Date:** 2026-07-30 · **Item:** 288 · **Disposition:** RECORD ONLY (docs-only)
**Authority:** Controller dispatch 2026-07-30 — record Step-0a Pass-2R calibration batch 3 outcomes and queue the evidence-first adjudication turn (Item 289).
**Turn discipline:** no `.ts` change, no deploy, no harness invocation, no DB write. The diff for this turn contains ONLY this file and `docs/pipeline-state.md`.

---

## 1. BATCH IDENTITY

Batch 3 (jobs noted "Step 0a — Pass-2R calibration batch 3 (post-Item-287, 20 docs)").

- **Design:** 20 single-document jobs.
- **Precondition:** Built on the Item-287 build (numeric range / acronym derived-form fixes, §2R.2 map amendment, PERSIST-FIRST harness, rejected-prose persistence).

---

## 2. DETERMINISTIC OUTCOME

**PERSIST-FIRST VINDICATED — 20/20 deterministic results persisted.**

Batches 1R and 2 each lost 6 of 10 documents with zero persisted output. Batch 3 retains the full Pass-1 / assembly result for every document even when Pass-2R is lost later.

---

## 3. PASS-2R OUTCOME

| Outcome | Count |
|---|---|---|
| Prose success | 1 |
| Validator reject (with `prose_rejected` persisted) | 6 |
| Lost to isolate death | 13 |

- **Second overall prose success:** doc `d47f2960` — all seven validators passed; prose persisted.
- **Rejected prose now in hand:** 6 docs persisted their final attempt prose and per-attempt rejection sets, enabling the first prose-in-hand adjudication of `verdict_consistency ["Low","Moderate"]` and other validator classes.
- **Isolate-death structural constraint remains:** 13/20 docs lost during 2R. The attempt-budget vs isolate-lifetime question goes to the four-lens with batch-3 latency data (see §6).

---

## 4. GTM SUMMARY

| Verdict | Count |
|---|---|---|
| release | 5 |
| release_with_logged_defects | 8 |
| block | **7** |

**Block class:** All 7 blocks are on the single defect class:

```
section_cross_duplication:scope_confirmation=scope_and_triggers
```

This includes **3 re-run documents that did NOT block in batch 2**, which means the outcome is at least partly NEW post-Item-284. The two scope keys were already observed byte-identical (`916 = 916` chars) in batch-2 assembled reports.

---

## 5. ADJUDICATION QUEUE (ITEM 289 — FOUR-LENS, EVIDENCE-FIRST)

No fix until adjudicated. The controller must bring:

### 5.1 `scope_confirmation` / `scope_and_triggers` — alias or duplication?

- **Question:** Establish from the emitters whether the pair is an intentional legacy-compat alias (one emitter emitting two keys for the same legal surface) versus a real duplication introduced or converged by Item 284.
- **Required evidence:** File:line for the emitter(s) that write each key, plus the assembled-report bytes for at least one affected doc.
- **Remedy options:**
  - (a) If alias: add a detector alias-exemption for the known pair (closed list, documented).
  - (b) If real duplication: change the emitter to a single key with viewer/PDF parity.

### 5.2 Rejected-prose validator adjudication

- The 6 `validator_reject` docs now have `prose_rejected` payloads.
- **First class to adjudicate:** `verdict_consistency ["Low","Moderate"]` — requires reading the actual prose to decide whether the validator is correctly enforcing the provisional-posture rule or is a false positive.
- Then proceed through the remaining rejection classes in descending legal-criticality order.

### 5.3 2R attempt-budget vs isolate-lifetime

- **Data to bring:** batch-3 per-doc latency, attempt count at success/reject/death, and isolate lifetime ceiling.
- **Candidates:** lower `PASS2R_MAX_ATTEMPTS` for replay jobs; per-attempt budget tiering; or accept the current loss rate as a calibration cost.
- **Constraint:** the only two prose successes to date landed on attempt 3; reducing attempts risks killing future successes.

---

## 6. DOUBLE-CHECK

Diff contains only:

- `docs/courier/ITEM288-BATCH3-RESULTS-2026-07-30.md`
- `docs/pipeline-state.md`

---

## 7. SIGN-OFF

Recorded. Adjudication queue released to Item 289 for four-lens review and fix-turn scoping.
