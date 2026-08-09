# INTAKE-4d — DPIA Framework intake pass (2026-08-09)

Parity rule observed: question text and helper prose only. No key, option, or
answer-shape changed on any existing row.

## Wording pass
- `transfer_flows` — group helper rewritten in plainer language; same entry
  fields, same conditional behaviour.

## Prefill as confirmation
- `functional_description` (1.2) — when the step-by-step `description` answer is
  substantive and this row is empty, the customer is offered "Use my earlier
  answer", which copies it into the field for confirmation or editing. Nothing
  is written without the customer's click.
- `alternatives_considered` — when `necessity_proportionality` is substantive
  and no entry exists, the customer is offered "Start from my earlier answer",
  which seeds one entry with that text as the rejection reason for confirmation.
  The row shape `{ processing_operation, alternative, rejection_reason }` is
  unchanged.

## Never merge
- `dpia_team` (0.5 RACI) stays a separate row from `dpia_prepared_by`. No merge,
  no prefill between the two.

## Addition (CEO-approved)
- `residual_risks` — optional narrative, "What risk is left after your
  safeguards?" (Art. 35(7)(d)). Wired through the form, `buildIntake()`, draft
  restore, the intake contract, `FIELD_LABELS`, and both DPIA_PERFECT fixtures.

## Verification
- `src/test/intake4d-dpia-package.test.ts` (5 tests) — contract parity, row
  shape, never-merge, additive field end to end, prefill-as-confirmation.
- 1143 frontend tests and 3304 edge tests green.
