# COURIER — ITEM 311: CHAPTER 7 REBUILD (lia)

**Dispatched:** CONTROLLER, 2026-07-31 (CEO overnight autonomous-continuation authority)
**Executed:** 2026-07-31T11:04Z
**Scope:** engine turn on `run-li-assessment` + intake extension + fixture unblock + pin tests.
**Forbidden and not done:** deploy, harness invocation, corpus ingestion.
**Source of requirements:** `docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md`, Chapter 7.

---

## 1. Op. 1 citation fix

`EDPB_1_2024_AUTHORITY` in `run-li-assessment/index.ts` was a hand-typed prose block
presented to the model as "SUPPLIED AUTHORITY EXCERPTS", carrying paragraph numbers
(39, 52, 73) that no corpus row supported.

It is now composed at boot by `renderEdpb12024Authority()` from
`_shared/registry/lia-verified-authorities.ts`. Each excerpt is emitted with its
subsection label and in quotation marks, and the block's own instruction tells the
model that any other proposition attributed to Guidelines 1/2024 must be written
around or phrased VERIFY-FIRST, with no section or paragraph number attached.

Registry changes (`lia-va-w2-2026-07-31-item311`):

- 15 anchored rows added — EDPB 1/2024 Section II, II.A, II.B, II.C and Recital 47.
- `recital_47_three_part_test` and `edpb_1_2024_three_step_test` removed from
  `LIA_UNANCHORED_PROPOSITIONS`.
- The three paraphrases with no corpus row were dropped, not retyped.

## 2. Intake extension

| Field | Why it exists |
|---|---|
| `balancing_details.collection_context` | Recital 47 runs on the time and context of collection. The enum answer is a conclusion, not that fact. |
| `balancing_details.children_data_subjects` | Art. 6(1)(f) names children expressly; the vulnerable-groups checkbox was the only proxy. |
| `balancing_details.additional_mitigations` | Kept separate from `safeguards` because measures the GDPR already requires do not count in the rebalance. |
| `purpose_details.controller_is_public_authority` | The second subparagraph is decided before the balance is reached. |
| `purpose_details.public_task_processing` | Gated on the above; the exclusion attaches to the tasks, not to the body. |

All five are optional at contract level and surfaced in `src/pages/LIAssessmentIntake.tsx`
(state, autosave draft payload, restore, submit payload, and form controls).

## 3. Four deliverables

`_shared/ltp/lia-deliverables/{types,elements,build}.ts` — pure, no I/O, never throws,
single writer for `reasonable_expectations`, `child_factor`,
`public_authority_exclusion`, `lia_determination`. All four carry the Op. 1 shape:
standard (verbatim) → record fact (quoted) → application → verdict.

- **Reasonable expectations.** No collection context → `undetermined_on_the_record`
  with a named ask. Notice-only support → `partly_expected` on the EDPB's own
  statement that fulfilment of information duties is not sufficient in itself.
- **Child factor.** Always an explicit determination; read from the direct answer or
  from the vulnerable-groups list; `undetermined_on_the_record` when neither is given.
- **Public-authority exclusion.** `exclusion_applies` sets `basis_unavailable`, which
  short-circuits the determination — no mitigation reaches the point.
- **Determination.** Carries `outcome`, `why`, `driving_factors`, `mitigations`,
  `rebalance_required`. Op. 5 fix: `classifyRecordedMitigations` marks
  already-required measures as not counting, quoting the exclusion verbatim.

`LIA_REPORT_SCHEMA.topLevel` extended in the same turn (wave-21 telemetry lesson).

## 4. Fixture and tests

- `lia-perfect-record` appended to `_shared/golden/lia.ts` — acquiring-book fraud
  screening, all five new fields supplied, collection context written to the
  relationship rather than to a notice, and `additional_mitigations` carrying one
  already-required and one beyond-obligation measure so both arms of the
  classification are exercised by one fixture. Existing four cases untouched.
- `src/registry/__tests__/lia-deliverables.test.ts` — **20/20 passing**. Pins every
  anchor row to the corpus snapshot by exact substring, pins the analysis shape, and
  pins the behaviour of each determination including the mitigation classification.
- Full suite: the 7 failures present are pre-existing and unrelated
  (`font-size.test.tsx`, `cppa_cyber` sample fixtures, `cppaRiskW9Slots`).

## 5. Honest limits

1. **No measurement taken.** Harness invocation is forbidden by the dispatch, so the
   ANALYSED path's quality is unscored.
2. **Op. 1's `three_part_test.purpose_test` was left untouched** by design and not
   re-verified.
3. **The LIA report viewer has not been extended** to render the four new keys. They
   are built, whitelisted and persisted, but not displayed. First item of the next
   lia turn.

**Disposition:** COMPLETE — awaiting controller verification. Not deployed.
