# ITEM 267 — DEADLINE-SENTENCE PROSE REWORD (Build Issue 6R)

**Date:** 2026-07-30
**Signature authority (CEO verbatim, 2026-07-30):** "I agree to whatever the teams recommend on each issue - except for issue 8. Go forward with all other changes"
**Teams' recommendation (prose lens leads, ratified):** minimal reword of the `deadline_sentence` values so each renders as a natural standalone sentence, preserving all legal content verbatim.

**File:** `supabase/functions/_shared/legal-test/cppa-risk-deadlines.ts`
**Version:** `cppa-risk-deadlines-2026-07-28-item241-3` → `cppa-risk-deadlines-2026-07-30-item267-prose`

## 1. Preservation contract

- Dates preserved (rendered long-form in prose; the ISO form remains on `deadline_label`).
- Pinpoints preserved and now stated in full (`11 CCR § 7155(b)` etc.).
- §2.2 prospective-vs-ongoing marking law preserved: the literal `Prospective —` / `Ongoing —` markings remain **verbatim on `deadline_label`**, which is unchanged for every row; the prose carries the same distinction in sentence form ("this is an ongoing obligation" / "this deadline applies prospectively").
- §2.3 ongoing-processing clause preserved in meaning ("immediately, before continuing the processing").
- No row deleted, added, re-ided, or re-classed. `selectDeadlineOrFallback` and the pin-fail fallback are untouched.

## 2. Old → new, per row (verbatim; ALL seven rows audited, six reworded)

| id | OLD `deadline_sentence` | NEW `deadline_sentence` |
|---|---|---|
| `d.assessment_record.pre_existing` | "Complete and retain the assessment record by Ongoing — 2027-12-31, the § 7155(b) compliance date for processing that was underway before the operative date." | "Complete and retain the assessment record by December 31, 2027, the compliance date fixed by 11 CCR § 7155(b) for processing that was underway before the operative date; this is an ongoing obligation." |
| `d.assessment_record.prospective` | "Complete and retain the assessment record Prospective — before initiating the processing, as § 7155(a) requires for processing initiated after the operative date." | "Complete and retain the assessment record before initiating the processing, as 11 CCR § 7155(a) requires; this deadline applies prospectively, to processing initiated after the operative date." |
| `d.assessment_record.material_change` | "Update and retain the assessment record Prospective — before implementing the material change, as § 7155(c) requires when a material change to the processing occurs." | "Update and retain the assessment record before implementing the material change, as 11 CCR § 7155(c) requires; this deadline applies prospectively, from the point the material change to the processing occurs." |
| `d.admt_pre_use_notice.existing` | "Publish and retain the ADMT pre-use notice by Ongoing — 2027-01-01, the § 7220 compliance date for ADMT already in use." | "Publish and retain the ADMT pre-use notice by January 1, 2027, the compliance date fixed by 11 CCR § 7220 for automated decisionmaking technology already in use; this is an ongoing obligation." |
| `d.admt_pre_use_notice.prospective` | "Publish and retain the ADMT pre-use notice Prospective — before deploying the ADMT, as § 7220 requires for ADMT not yet in use." | "Publish and retain the ADMT pre-use notice before deploying the automated decisionmaking technology, as 11 CCR § 7220 requires; this deadline applies prospectively, to technology not yet in use." |
| `d.submission.attestation` | "Submit the § 7157 attestation Ongoing — annually, on the schedule the Agency prescribes for the business's cohort." | "Submit the attestation required by 11 CCR § 7157 annually, on the schedule the Agency prescribes for the business's cohort; this is an ongoing annual obligation." |
| `d.ongoing_processing` | "Address this item Immediate (before continuing the processing), as no statutory deadline extends the compliance date." | "Address this item immediately, before continuing the processing, because no statutory deadline extends the compliance date." |

`deadline_label` values — all seven — are byte-identical to the ITEM 241.2 §2.4 column-4 values.

## 3. Tests

`supabase/functions/_shared/ltp/item267-deadline-sentences.test.ts` (new, 4 tests, green):
1. no row's sentence contains `by Ongoing —` / `by Prospective —` / any em-dash marker; every row ends as a sentence;
2. the §2.2 markings survive verbatim on the labels;
3. dates and pinpoints preserved verbatim in the prose (December 31 2027 / § 7155(b); January 1 2027 / § 7220; "prospectively" / § 7155(a));
4. §2.3 fallback row reads naturally and `selectDeadlineOrFallback` degradation is intact.

## 4. Deploy

`replay-cppa-risk-harness` redeployed (only function touched). No harness invocation.
