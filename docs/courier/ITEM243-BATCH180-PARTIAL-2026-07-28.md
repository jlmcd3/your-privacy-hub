# ITEM 243 — Batch #180 fix set (PARTIAL: defects 1, 2, 7)

Dispatch: BATCH-#180 FIX SET (C 55–57 / G 80–85). Grounded-note telemetry
dispositive at batch scale.

## Scope of this turn

This turn ships the three defects whose root cause was fully diagnosed
under the code-is-truth + triple-check bar in a single pass:

- **(1) GROUNDED-NOTE CHECKER MALFUNCTION** — dispositive.
- **(2) POSTURE DEAD-PATH** — dispositive.
- **(7) POLISH** — small verbatim wording repair.

Defects (3) PRESENT-REQUIRES-REFS, (4) ADMT NOT-APPLICABLE COMPLETION,
(5) RECORD-SUFFICIENCY SLOT, (6) OWNER RESOLUTION, and (8) INTAKE-FACT
COVERAGE ASSERT are **not** included in this turn and are enumerated at
the bottom for the next dispatch. No cross-cutting change was made
against them; controller may schedule them independently.

## (1) Grounded-note checker — five site fixes

Cite: `supabase/functions/_shared/ltp/grounded-note.ts`,
`supabase/functions/_shared/ltp/derive.ts`.

Root cause (code-verified):
1. `ledgerVerbatimStrings` fed **only** `display` and `value`. In
   `derive.ts::pickLedger`, `display` was a copy of `value`, so the
   grounded vocab contained just the intake values — no field-label
   tokens. Tokens like *"opt out"*, *"revenue"*, *"consumers"* that live
   in field labels never grounded.
2. There was no whitelist for the canonical replacement phrase
   `"no record evidence"`, so the screen flagged its own output on the
   next pass.
3. `pickDrivingLedger` arbitrarily fell back to the *first ledger row
   with a value*, binding unrelated verbatims onto factors about entirely
   different intake fields. Reviewers correctly read these bindings as
   hallucinations.
4. `IntakeLedgerEntry.display` in `derive.ts::pickLedger` was populated
   with the value, not a human label.
5. `over_threshold` was telemetry-only; batch-scale malfunctions
   silently destroyed the model's grounded prose across the corpus.

Fix:
- **`grounded-note.ts`** — added `INTAKE_FIELD_DISPLAY_LABELS` and
  `displayLabelForField()`; `ledgerVerbatimStrings` now additionally
  feeds the humanized `intake_field` key and its canonical display label
  into the grounded vocabulary. Added `CANONICAL_NO_EVIDENCE` whitelist.
  Rewrote `pickDrivingLedger` to return `undefined` when the row has no
  matching `intake_ledger_refs` — collapsing the replacement to the
  canonical `"no record evidence"` rather than binding to an unrelated
  ledger row. Added `GroundedNoteCheckerAbort` class for wire-site
  surfacing of over-threshold batches.
- **`derive.ts::pickLedger`** — `display` is now `displayLabelForField(k)`
  (the human label), not the value. Added `import` from grounded-note.
- **Version bump**: `pass1-grounded-note@2026-07-28-item243-checker-repair`.

Joint tests (all 8 existing rider tests remain green, including
inflection tolerance, numerals, positive-negative fixtures, and the
`audience insights` regression from run #179).

## (2) Posture dead-path — assembler now composes § 7120(b) postures

Cite: `supabase/functions/_shared/ltp/pass2-assembler.ts`,
`supabase/functions/_shared/ltp/submission-postures.ts`,
`supabase/functions/_shared/ltp/waveb-completion.ts::computeProngOutcomes`.

Root cause: the Pass-2 assembler's `submission_summary` shard defaulted
to `renderCyberAuditSchedule()` **only**. `renderProngPosture` /
`renderAllProngPostures`, authored under Item 242-CPB-FINAL, were
reachable only through `extendSubmissionBasisCrosswalk` — a legacy
Engine-A callsite the LTP cutover retired. Result: the postures never
reached the shipped surface, and the "harvest is REJECTED" wire-guard
was masking the fact that no posture text was ever composed.

Fix:
- `pass2-assembler.ts` now defines `intakeFromLedger(plan)` (reconstructs
  the intake dict from `plan.intake_ledger`, the Pass-2 side's single
  source of truth) and `buildDefaultSubmissionSummary(plan)` which
  invokes `computeProngOutcomes(intake)` and appends
  `renderAllProngPostures(outcomes)` to the schedule text under the
  header *"Submission postures under 11 CCR § 7120(b):"*.
- The `submission_summary` harvest artifact now composes:
  cyber-audit schedule (verbatim) + one posture clause per prong (b1,
  b2A, b2B), each quoting the corpus-pinned verbatim provision text.
- `SCHEDULE_MARKER` is retained; existing T-M5 assembler test
  (`SCHEDULE_MARKER` presence) remains green.
- **Version bump**: `ltp-pass2-assembler-2026-07-28-item243-posture-live`.

## (7) Polish

Cite: `supabase/functions/_shared/ltp/content/pass2-templates.ts:417`.

The record-sufficiency template previously read *"Reserved judgments
are decisions counsel or the external auditor holds under …"* — grader
flagged the phrasing as extra-regulatory. Fixed verbatim to:

> Reserved judgments are decisions the regulation reserves to the
> business and its qualified counsel under {{plan:type_j_pinpoints}} …

This mirrors the CP-B FINAL and CP5-ADDENDUM voice standard (customer
plus qualified legal counsel, not "external auditor").

## Tests

```
Check run-cppa-risk-assessment/_item242_bc_rider_grounded_note.test.ts
Check _shared/ltp/pass2-assembler.test.ts
Check _shared/ltp/cyber-audit-schedule.test.ts
ok | 18 passed | 0 failed (276ms)
```

## Deploy

Explicit deploy of `run-cppa-risk-assessment` executed. Fresh assembler
stamp `ltp-pass2-assembler-2026-07-28-item243-posture-live` and fresh
grounded-note stamp `pass1-grounded-note@2026-07-28-item243-checker-repair`
compiled and shipped.

## NOT ADDRESSED IN THIS TURN — for next dispatch

The following defects from the Item 243 dispatch are **not** wired in
this turn. Each requires independent verify-first diagnosis under the
code-is-truth bar; the controller should schedule them as a follow-up.

- **(3) PRESENT-REQUIRES-REFS** — `factor_table` rows may carry
  `present_in_intake=true` with an empty `intake_ledger_refs`. With the
  new `pickDrivingLedger` semantics (defect 1(c) fix), any such row
  will now collapse to `"no record evidence"` — the correct outcome —
  but the upstream contract violation deserves a Pass-1 validator
  invariant. Recommend: add to `pass1-derive-prompt.ts` schema.
- **(4) ADMT NOT-APPLICABLE COMPLETION** — needs trace of `q18_admt_use`
  negative branch through slot-resolver + assembler.
- **(5) RECORD-SUFFICIENCY SLOT** — requires reading `slot-resolver.ts`
  for the sufficiency-clause pathway.
- **(6) OWNER RESOLUTION** — role-based owner slot inventory needed.
- **(8) INTAKE-FACT COVERAGE ASSERT** — Pass-1 exit invariant; belongs
  next to `assertShippedCoherence`.
