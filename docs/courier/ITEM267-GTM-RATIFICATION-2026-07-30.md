# ITEM 267 — GTM MATERIALITY REGISTER RATIFICATION (Build Issue 7)

**Date:** 2026-07-30
**Signature authority (CEO verbatim, 2026-07-30):** "I agree to whatever the teams recommend on each issue - except for issue 8. Go forward with all other changes"
**Teams' recommendation (ratified):** the draft v1 assignments stand as-is, including Item 266's `section_duplication = non_material`.

## 1. Change

`supabase/functions/_shared/ltp/replay/gtm-materiality-register.ts`

| | Before | After |
|---|---|---|
| Version | `gtm-materiality-v1-2026-07-30-DRAFT` | `gtm-materiality-v1.1-2026-07-30-RATIFIED` |
| Header status | "ACTIVE IN OBSERVE/TELEMETRY ONLY — register assignments require CEO ratification before gating any release decision." | RATIFIED per the CEO delegation quote above; assignments are the release policy. |
| Fail-closed rule | unclassified → `block` | **UNCHANGED** — unclassified → `block` |
| Entries | 18 | 18 (no assignment changed) |

`gtm-grader.ts` is **unchanged** — verdict logic is identical.

## 2. Ratified register (full table)

### MATERIAL — blocks release

| defect_class | source | rationale |
|---|---|---|
| `presence_rate` | harness | Hollow-document class: presence below the mined hard floor means the assessment asserts little from the record. |
| `harness_error` | harness | No document was produced at all. |
| `label_residue` | harness | Unresolved-slot literals misstate the customer's own facts. |
| `note_specificity:no_ledger_ref` | harness | PRESENT factor with no ledger reference is an ungrounded assertion. |
| `note_specificity:fossil_no_record_evidence` | harness | Fossil basis on a PRESENT row is a self-contradiction on the legal surface. |
| `note_specificity:missing_weight_note` | harness | Conclusion with no stated reasoning. |
| `action_diversity:consecutive_dup` | harness | Cloned consecutive actions = composition failure; duplicated obligations shipped. |
| `qc_r1` | deterministic_check | Grader-mirrored legal-surface checks; any failure is a legal-correctness defect. |
| `pii` | harness | Any PII reject class is a privacy harm. |
| `coherence` | harness | Cross-section contradictions misstate the legal position. |
| `contradiction` | harness | Direct contradiction between shipped statements. |

### NON-MATERIAL — ship + log

| defect_class | source | rationale |
|---|---|---|
| `golden_shape` | harness | Single-section depth shortfalls are quota/quality flags, not correctness defects. |
| `section_duplication` | harness | Item 266: verbatim repetition is a prose defect; does not misstate law or alter the conclusion. |
| `review_band_low` | advisory | Advisory presence band flag; at/above the hard floor. |
| `review_band_high` | advisory | Advisory presence band flag; no customer-visible harm. |
| `grounded_note_would_replace` | advisory | Observe-mode lexicon calibration telemetry; no rewrite applied. |
| `deadline_sentence_prose_wart` | harness | Register wart; does not alter legal meaning or the stated deadline. (Closed by Item 267 Part 2.) |
| `legacy_key_missing` | harness | Side-by-side gap against an archived legacy report; not a shipped-document defect. |

### Unregistered classes
Fail-closed: `lookupMateriality` returns `null`, `evaluateGtm` records the class in `unclassified` and returns `block`. **Unchanged by ratification.**

## 3. Tests

`supabase/functions/_tests/gtm-grader.test.ts` imports `GTM_MATERIALITY_REGISTER_VERSION` symbolically and asserts the verdict logic (release / release_with_logged_defects / block / fail-closed). 6/6 green after the version bump.

## 4. Deploy

`replay-cppa-risk-harness` redeployed (only function touched). No harness invocation this turn.
