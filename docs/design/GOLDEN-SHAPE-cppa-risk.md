# GOLDEN SHAPE — cppa-risk (rendering contract)

**Status:** Imposed on the LTP-rebuilt product as a RENDERING CONTRACT (Item 241 dispatch, CEO-directed 2026-07-28). Item 241.1 (this turn) mirrors the spec and lands structural + telemetry pieces; Item 241.2 authors verbatim registry content for CEO sign-off; Item 241.3 wires the approved content and the gap-driven action composer.

**Design law:** the GOLDEN SHAPE describes the empirically derived construct of the top-50 legacy cppa-risk documents (quotas, structure, prose register). All validated plan data is left intact — the RenderPlan (Pass-1) is untouched. This contract governs Pass-2 RENDERING ONLY.

## §1. Quotas (top-50 empirics, n=50)

| Section                       | Quota                                                                       |
| ----------------------------- | --------------------------------------------------------------------------- |
| `priority_actions`            | ~11 items × ~747 chars each, four-move anatomy                              |
| `risk_assessment_by_activity` | ~1,215 chars per activity                                                   |
| `assessment_summary.purpose`  | ~516 chars (ledger verbatim + operational context)                          |
| `benefits_to_business`        | ~316 chars                                                                  |
| `benefits_to_consumers`       | ~333 chars (distinct prose from benefits_to_business)                       |
| `adverse_effects`             | ~4 items × ~308 chars                                                       |
| `current_safeguards`          | ~522 chars                                                                  |
| `safeguard_gaps`              | ~891 chars, ENUMERATED "(n) [gap] — [pinpoint] requires [registry excerpt]" |
| `record_sufficiency`          | ~845 chars flowing prose (not bullets)                                      |
| `information_needed`          | substantial items                                                           |

## §2. Action polarity — GAP-DRIVEN

Actions are **gap-driven** (the key structural correction from Item 241). Sources, in order:

1. Absent mandatory factors
2. Safeguard gaps
3. Type-J reserved judgments
4. Unresolved documentation gates
5. Conditional obligations (gate-linked "[applies only if…]")
6. Present-but-thin factors — as **strengthen** actions

Each action carries the four-move anatomy: **element + customer's recorded fact + gap/consequence + compliance_guidance** — with a real deadline (deadline registry; prospective/ongoing marking; one deadline per action).

The registry authoring pass (compliance_guidance + deadline_basis fields) is Item 241.2; wiring is Item 241.3.

## §3. Prose register

- Counsel voice with epistemic precision (e.g. "this reflects an incomplete record, not a finding on the merits").
- Colorable-argument weighing structure.
- Enumerated deficiencies with inline pinpoints.
- Intake specifics quoted by name from ledger / weight_notes.
- **Customer-first openers everywhere** — approved CP5 §3.2 section-opener texts wire in Item 241.3.

## §4. Enforcement

`GOLDEN_SHAPE_QUOTAS` module measures per-section depth (chars / items) at assembler exit as **telemetry only**. Production behavior is **telemetry + review-flag on shortfall — NEVER content deletion**. All existing guards (value-screen, surface guard, exec/balance coherence, provenance) are unchanged.

The `evaluateGoldenShape(report)` helper returns:
```
{
  version,
  sections: [{ key, kind, present, chars, items, avg_chars_per_item, meets_quota, shortfall_reasons }],
  review_flag: boolean,
  shortfall_keys: string[],
}
```
The assembler surfaces this under `telemetry.exit_checks.golden_shape`.

## §5. Run-#177 structural blockers — fixed in Item 241.1

**E1. `scope_and_triggers` + `scope_confirmation` omitted entirely.** The CP5 per-prong composer supplied `ctx.prong_subject`, but `resolveSlot` had no case for it — the plan-slot resolved empty, `fill-or-omit` dropped the template, and both scope shards emitted nothing. Fix: `slot-resolver.ts` now passes `ctx.prong_subject` through. The scope composer additionally sorts engaged prongs first, per the customer-first opener law.

**E2. "Coherently insufficient."** The prior `insufficientRecord` predicate keyed on `factor_table.present_in_intake`, and `aggregateBalance` treated `activityCount === 0` as insufficient. Both violated the §2.5 precedence law. Fix: insufficiency is derived from **documentation gates alone** — any `G.documentation.*` outcome that is not `pass` (either `block` or `not_applicable`) signals absent § 7152(a) documentation and therefore an insufficient record. Absent optional factors and Type-J conversions are NOT record-insufficiency.

## §6. Version stamps (Item 241.1)

- `GOLDEN_SHAPE_QUOTAS_VERSION = "golden-shape-quotas-cppa-risk-2026-07-28-item241-1"`
- `SECTION_COMPOSERS_VERSION  = "ltp-section-composers-cppa-risk-2026-07-28-item241-1-e1e2"`
- `PASS2_ASSEMBLER_VERSION    = "ltp-pass2-assembler-2026-07-28-item241-1-structural"`
