# ITEM 286 — STEP-0a BATCH 2 RESULTS

**Date:** 2026-07-30 · **Item:** 286 · **Disposition:** RECORD ONLY (docs-only)
**Authority:** Controller dispatch 2026-07-30 — record Step-0a Pass-2R calibration batch 2 outcomes, confirm Item-284/285 fixes, and queue residual validator classes for Item 287.
**Turn discipline:** no `.ts` change, no deploy, no harness invocation, no DB write. The diff for this turn contains ONLY this file and `docs/pipeline-state.md`.

---

## 1. BATCH IDENTITY

Batch 2 (jobs noted "Step 0a — Pass-2R calibration batch 2 (post-Item-284/285 build)").

- **Design:** 10 single-document jobs.
- **Outcome distribution:** 4 results returned, 6 isolate-dead.
- **Isolate-death cause:** 3-attempt × ~170s paths exceed isolate lifetime — a recurring structural constraint.
- **Remedy candidates (four-lens next session):** lower `PASS2R_MAX_ATTEMPTS` for replay jobs, or introduce per-attempt budget tiering.

---

## 2. GTM SUMMARY

| Metric | Count |
|---|---|
| release | 2 |
| release_with_logged_defects | 2 |
| block | 0 |

---

## 3. FIRST PASS-2R PROSE SUCCESS

**Doc `2391b49a` — all seven validators passed; prose persisted.**

This is the first candidate for the CEO side-by-side read.

---

## 4. ITEM-284 FIX CONFIRMATION (EMPIRICAL)

Doc `278d0608` re-ran internally consistent on the live build:

- `executive_summary` and `assessment_summary` both state insufficiency.
- The `provisional_posture` template rendered as designed.
- Reserved framing remained intact.

The F1/F2 verdict-contradiction seam is closed.

---

## 5. ITEM-285 WHITELIST FIX CONFIRMATION

Entity false positives collapsed from ~5 per document to residual edge classes.

---

## 6. RESIDUAL VALIDATOR CLASSES (NEXT FIX TURN — ITEM 287)

| Class | Evidence / Description | Proposed Remedy Area |
|---|---|---|
| (a) Numeric range constituents | `"249,999"` rejected though plan carries `"100,000–249,999"` (en-dash range normalization). | En-dash / hyphen / comma numeric-range normalization in `entityBearingStrings` or numeric validator. |
| (b) Acronym derived forms | `"ADMT's"` / `"ADMT-related"` rejected (possessive / hyphenated escape). | Possessive/hyphenated derived-form handling for carried acronyms. |
| (c) Constituent tokens of carried role titles | `"Protection"` rejected as a standalone token of a longer role title. | Token-match allowance for role-title constituents, or role-title whitelisting. |
| (d) `verdict_consistency` ["Low","Moderate"] | Rejected prose still not persisted; needs prose-in-hand adjudication. | `PERSIST-REJECTED-PROSE` as an observe-mode calibration candidate for four-lens review. |
| (e) `exception_analysis:part_4` | Fired on every reject across both batches — likely a §2R.2 re-homing-map question, not a model defect. Part 4 ("how the result could change") naturally hosts exception analysis. | Map amendment to be put to the four lenses next session. |
| (f) `processing_narrative` / RABA / `opening_summary` homed in `part_4` | Doc `278d0608` also placed these sections in `part_4` — structure-discipline watch. | Confirm section-to-part map; add structure validator if necessary. |

---

## 7. DOUBLE-CHECK

Diff contains only:

- `docs/courier/ITEM286-BATCH2-RESULTS-2026-07-30.md`
- `docs/pipeline-state.md`

---

## 8. SIGN-OFF

Recorded. Residual classes released to Item 287 for four-lens review and fix turn scoping.
