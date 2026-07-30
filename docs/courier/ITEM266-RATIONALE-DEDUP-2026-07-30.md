# ITEM 266 — ACTIVITY-RATIONALE DE-DUPLICATION — 2026-07-30

**Type.** Item 264 follow-up. Composer consolidation + deterministic duplication
detector + one DRAFT GTM register entry. No new customer prose beyond the
already-ratified templates.

## Evidence

Controller review of ramp-1 attempt 8 (job `54a21294`): the shipped
`risk_assessment_by_activity` array carried FOUR items, each **5,506 chars**,
with items 0 and 1 verified **byte-identical** by controller SQL. The
Golden-Shape quota (≥1 item, ≥800 avg chars/item) was therefore met by
repetition — a loop2 "no verbatim duplication" law violation.

**Root cause.** The Item-264 rationale is composed entirely from plan-GLOBAL
artifacts — documentation gate outcomes, `factor_table` rows and their
`weight_note`s, and the closeness/calibration verdict. Nothing in the current
`RenderPlan` scopes factors or notes to individual activities, so per-activity
emission necessarily clones. Presenting one record-level analysis N times
fabricates differentiation the plan does not contain.

## FIX 1 — Honest consolidation (composer)

`_shared/ltp/section-composers/cppa-risk.ts` · `composeRiskByActivity` now
emits ONE combined rationale item whenever the rationale inputs are
plan-global (i.e. always, today). The engaged activities are ENUMERATED into
the existing ratified conclusion carrier's `activity_label` slot via the
existing `joinList` mechanics — no new sentence frame, no new prose. The
Item-264 four-part body (record status → benefit factor_lines → negative
factor_lines → safeguard factor_lines → calibrated conclusion) is composed
ONCE. The LIA line remains its own item. With exactly one engaged activity,
behaviour is byte-identical to Item 264.

`SECTION_COMPOSERS_VERSION = "ltp-section-composers-cppa-risk-2026-07-30-item266-rationale-dedup"`.

**Quota note.** `min_items = 1` and ≥800 chars/item remain satisfied
**honestly**: one item, full four-part body, well above the floor.

## FIX 2 — Same-section duplication detector (harness, Ruling-A location)

`_shared/ltp/replay/substance-gates.ts` gains
`evaluateSectionDuplication(report)`: for every top-level LIST section, any
two string items that are byte-identical — or identical after whitespace
normalisation — yield the hard failure
`section_duplication:<key>:<i>=<j>`. Wired into `evaluateSubstance`'s
`hard_failures`. This makes the loop2 no-verbatim-duplication law a
deterministic check rather than a review judgment.

## FIX 3 — GTM register DRAFT entry

`_shared/ltp/replay/gtm-materiality-register.ts` gains
`{ defect_class: "section_duplication", materiality: "non_material", source: "harness" }`
— rationale: verbatim repetition is a prose/quality defect; it does not
misstate law or alter the legal conclusion (loop2 dinged even 95+ documents
for duplication classes). Ship + log. The register remains **DRAFT** and
observe/telemetry-only pending CEO ratification.

## FIX 4 — Build Issues note (ledger; controller mirrors to Drive)

**NEW DESIGN QUESTION — per-activity factor attribution.** Genuinely distinct
per-activity rationales require the plan to scope factors and weight notes to
activities — a Pass-1 schema addition at the §2 architecture level. Options:
(i) model-authored `engaged_activity` refs on factor rows; (ii) keep the
record-level analysis as the product's honest shape (the golden corpus
averaged 2.1 activities with distinct rationales — evaluate whether that
distinctness came from activity-scoped INTAKES rather than plan structure).
Requires spec-amendment evaluation. NOT wired this turn.

## Deliberate spec-of-test change (declared, not a weakening)

The Item-264 test's expectation was stated as "one shipped item PER ENGAGED
ACTIVITY". Its fixture engages exactly one applicability proposition, so the
assertion values are unchanged; the test NAME and header comment were
restated to the consolidated shape
(`item264/266 — one consolidated rationale item (plus the LIA line)`), and the
inline comment now reads "Item 266: always exactly one consolidated
rationale". No assertion was relaxed or removed. The multi-activity case is
newly covered by `item266-rationale-dedup.test.ts`.

## Tests

New `_shared/ltp/item266-rationale-dedup.test.ts` — 6/6 green: multi-activity
fixture → exactly one rationale item + LIA line; consolidated item enumerates
all three engaged activities; detector flags byte-identical items;
detector flags whitespace-normalized duplicates; detector passes on distinct
items and ignores non-list keys; GTM classifies `section_duplication:*` as
logged/non-material.

Full regression (replay, item262, item264, item266, pass1-injection,
grader-check-mirror, grounded-note-mode, e2e-document, surface-ownership,
pass2-assembler, golden-shape-gate, gtm-grader) — verbatim:
`ok | 73 passed | 0 failed`.

## Four-lens sign-off

- **Prose (lead):** one honest analysis beats four clones. Repetition reads as
  padding and invites the reader to hunt for a difference that does not
  exist; enumeration of the engaged activities preserves the scope statement
  without pretending to four separate analyses.
- **CS:** consolidation is a composer-local change; the duplication detector
  is a pure, deterministic evaluator at the Ruling-A gate location, so the
  class can never silently return.
- **Privacy-law:** n/a — no new data surface, no change to what is asserted
  about the customer's record.
- **Prompt-engineering:** n/a — zero prompt, knowledge-map, or grader edits.

## Not changed

Templates (`pass2-templates.ts`), registries, prompts, screens, C/G grader
instruments, deterministic check definitions, legacy wire,
`supabase/_rebuild-snapshot-item244/`. NO harness invocation. Redeploy limited
to `replay-cppa-risk-harness`.
