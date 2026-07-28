# ITEM 240 — CP5: SCOPE ENGAGED-FLAG + BALANCE COHERENCE + T7 SPACING

Date: 2026-07-28
Deploy: `run-cppa-risk-assessment` — assembler stamp `ltp-pass2-assembler-2026-07-28-item240-cp5-single-writer`; composers `ltp-section-composers-cppa-risk-2026-07-28-item240-cp5`.

## Correctness Fixes (a)+(b)+(c)

- **(a) SCOPE ENGAGED-FLAG.** `T.risk.applicability.engaged` no longer takes
  `intake:LEDGER_ID` (the missing slot caused fill-or-omit to silently drop
  every engaged prong). Both scope templates now carry a composer-supplied
  `plan:prong_subject` sourced from the registry's `display_label` so each
  of the five § 7150(b) prongs reads distinctly. Composer
  `composeScope` in `section-composers/cppa-risk.ts` populates
  `prong_subject` and per-prong `__cite.PINPOINT`.

- **(b) EXEC/BALANCE COHERENCE, RUNTIME-ENFORCED.** `balanceInstance` now
  handles `aggregateBalance("insufficient")` by returning
  `T.risk.summary.docs` (the same template `composeAssessmentSummary` picks
  for the insufficient branch). It is now structurally impossible for
  balance/by-activity to render firm or hedged prose on an insufficient
  plan. Joint test `CP5 (b) coherence` guards every by-activity + summary
  instance against `T.risk.balance.firm|hedged` on an insufficient fixture.

- **(c) T7 SPACING.** Removed the hyphen from `systematic-observation`
  profiling in `risk-opening.ts`. Two PDF viewers drop
  ASCII hyphens during text extraction, producing "systematicobservation".
  Source text is now `systematic observation`. Joint test `CP5 (c)`
  asserts neither the hyphen nor the joined form can escape the source.

## SINGLE-WRITER Consolidation (LAW 3(a))

CP3's shape dispatch introduced three `report[shard.key] = ...` write sites
which broke LAW 3(a). CP5 consolidates the dispatch into a single
`coerceForShard(key, value)` helper so the assembler retains exactly ONE
write site. `surface-ownership.test.ts` LAW 3(a) is now green.

## Deferred to CP6

The dispatch also called for a wholesale prose-panel rewrite of
`pass2-templates.ts` (professional cadence), a `compliance_guidance`
sentence + real statutory deadline per registry row, and the eight
remaining Prose Panel targets. Those are content-registry edits
(change-controlled per the R5+ standing state) and are held for a
courier-anchored batch rather than co-mingled with the correctness fixes
above. This courier flags them explicitly for the next dispatch.

## Test Evidence

```
deno test _shared/ltp/surface-ownership.test.ts _shared/ltp/pass2-assembler.test.ts \
          _shared/legal-test/cp4-labels-citations.test.ts _shared/legal-test/cp5-scope-coherence.test.ts \
          _shared/report-contracts/cppa-risk-shape.test.ts
=> 25 passed | 0 failed
```
