# ITEM 244 WIRED — BATCH 55b9f3a2 ADDENDUM (2026-07-28)

**Trigger.** Controller dispatch 2026-07-28. Batch 55b9f3a2 terminal:
C 60.5–63.35 / G 65–85; failures 23→13; prong hits 6→1. Item 244
deploy released with five-item addendum folded into same window
(evidence: run c7fa1d50 grader findings + telemetry).

Code-is-truth + triple-check binding. No grader edits; no batch inserts.

---

## (a) SLOT-NAME LITERAL RESIDUE

**Evidence.** doc e7e8e64d shipped the string `entity name` inside
record_sufficiency and priority_actions.

**Root cause.** A composer emitted an unresolved slot-name humanization
as prose. Neither the resolver (`slot-resolver.ts` returns `""` for
missing ctx) nor the fill-or-omit render seam catches a literal string
that already happens to spell the slot name — because the render
substitution succeeded, just with the wrong upstream value.

**Fix class.** Additive residue detector at the shipped-surface
value-screen seam. New pattern class `SLOT_NAME_LITERAL_PATTERNS`
matches (word-bounded, case-insensitive) the humanised forms of every
customer-facing slot whose composer contract requires a resolved value:

```
\bentity name\b
\bactivity label\b
\bactivity name\b
\belement short label\b
\bowner role titles\b
\bdeadline sentence\b
\bcompliance guidance sentence\b
\bcustomer recorded fact clause\b
\bgap or consequence clause\b
```

Anchor / metadata paths (`isAnchorPath`) remain exempt. Hits carry
kind `slot-name-literal`. The pattern set is closed and extended by
evidence only.

**E4 renderEntity coverage note.** `renderEntity(sectionKey, mentionIndex, plan)`
lives in `section-composers/cppa-risk.ts` and returns `entityName(plan)`
on first mention, `"the company"` thereafter. The composer paths
`composeRecordSufficiency` (via `entity`) and `composePriorityActions`
(via `entity_name` in the action ctx) both feed off `entityName(plan)`,
which resolves `entity_name → company_name → "the business"` — never
the literal token `"entity name"`. The residue detector is therefore
belt-and-braces for future composer additions.

---

## (b) MASS-ABSENCE ABORT

**Evidence.** Batch 55b9f3a2 present/note coherence rewrites flipped
nearly ALL factors to absent+"no record evidence" across all three
docs (uniform pattern).

**Fix.** Rewrite-rate telemetry added to `applyCoherenceScreen`.
When `rewrite_rate > MASS_ABSENCE_ABORT_THRESHOLD` (0.5), a
`MassAbsenceRewriteAbort` is thrown; the pass1-llm try/catch treats
the throw as an attempt error and — after budget exhaustion — routes
the run to the Type-J write-around body. Mass rewrite is never a
shippable state (mirrors the grounded-note law's replacement-rate
threshold pattern).

**Model-side cure.** Item 244 P1 (schema reorder — `intake_ledger_refs`
placed immediately before `weight_note`), P2 (canonical exemplar
factor row) and P3 (destination-context sentence in the system prompt)
deploy in the same window. Expected effect: the model emits grounded
`intake_ledger_refs` on factor rows it marks present, closing the gap
that made every present row trip the coherence screen.

---

## (c) BALANCE-SUBSTANCE RULE

**Evidence.** Doc 2e697bf1: firm benefits-outweigh conclusion shipped
over an empty factor-table benefit column. Third appearance after
CP4 aggregation fix.

**Fix.** `aggregateBalance(plan)` now returns `insufficient` when
`anyPresentBenefit(plan) === false`, before consulting
`chooseVariant(closeness)`. The coherence assert already ships the
enforce-arm collapse when exec asserts outweigh over an insufficient
balance; that assert now catches the residual instance where a
composer bypasses `aggregateBalance` and asserts firm-positive
directly.

---

## (d) POSTURE PHRASING TOKENS

**Evidence.** Residual `qc_r1_3` grader hit: "no met/not-met/insufficient-basis
phrasing found" for a resolved M5.

**Fix.** `renderProngPosture` in `submission-postures.ts`:

- `met` — retains `On the current record this threshold is met.`
- `not met` — retains `On the current record this threshold is not met.`
- `not applicable` — now: `… this prong is not applicable; there is insufficient basis to apply it here.`
- `indeterminate` — now: `The current record provides insufficient basis to resolve this threshold as met or not met; completing the underlying intake field resolves it.`

State-the-law verbatim quote preface unchanged. Resolution sentence
carries the token family the checker expects.

Mirrored e2e check per (C1): resolved prongs must expose one of
{`is met`, `is not met`, `insufficient basis`}.

---

## (e) ADMT-INAPPLICABILITY EXPLANATION

**Verbatim template text.** Ships when `q18_admt_use = No` AND
`q5b_profiling = Yes` (or `q5b_sensitive_categories = Yes` — legacy
alias supported):

> ADMT-specific governance is inapplicable because the record states
> no ADMT is in use; the profiling activity is assessed under the
> § 7150(b)(4) trigger and its own safeguards.

Composed into `record_sufficiency` as a `T.risk.record_sufficiency.item`
instance emitted immediately after the affirmations opener. Element
label: `ADMT-specific governance`. Element status: verbatim explanation.

Source constant: `ADMT_INAPPLICABILITY_EXPLANATION`
(`_shared/ltp/section-composers/cppa-risk.ts`).

---

## Deploy

`run-cppa-risk-assessment` redeployed successfully.

| Module | Stamp |
| --- | --- |
| Section composers | `ltp-section-composers-cppa-risk-2026-07-28-item244-addendum` |
| Assembler         | `ltp-pass2-assembler-2026-07-28-item244-addendum` |
| Value-screen      | `value-screen@2026-07-28-item244-addendum-slot-name-literals` |
| Coherence screen  | `pass1-present-note-coherence@2026-07-28-item244-addendum-mass-absence-abort` |
| Submission postures | `submission-postures@2026-07-28-item244-addendum-tokens` |

## Housekeeping

Fixed a pre-existing parse defect in `_shared/ltp/content/pass1-derive-prompt.ts`
that prevented Supabase's edge bundler from parsing the file (escaped
closing backtick on line 47 left the outer template literal open).

## Follow-ups noted for the next window

L2 supplemental content courier (benefit → harm mapping) — separate
authoring turn per Correction 2; not landed here. C3 determinism
snapshot test — deferred; harness authoring turn.
