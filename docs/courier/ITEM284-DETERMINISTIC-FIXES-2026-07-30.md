# ITEM 284 — DETERMINISTIC FIX TURN (executes Item 283 N1)

**Date:** 2026-07-30T17:44Z · **Item:** 284 · **Track:** 2 (cppa-risk)
**Authority:** CEO "Proceed" 2026-07-30 on Item 283 N1.
**Turn discipline:** deterministic modules under `supabase/functions/_shared/ltp/` only. NO prompt change, NO 2R validator change, NO schema change, NO legacy-function edit. Deploy: `replay-cppa-risk-harness` ONLY.

---

## F1 — ONE COMPLETENESS PREDICATE

### Divergence autopsy (doc `278d0608`)

Two code paths computed completeness differently:

| Surface | Predicate consumed | Behaviour |
|---|---|---|
| `executive_summary` | `aggregateBalance(plan)` — which ALSO returned `"insufficient"` when the record carried **no present benefit factor** (BALANCE-SUBSTANCE RULE, batch 55b9f3a2 addendum (c)) | "not sufficient to complete the required benefit-and-impact analysis" |
| `assessment_summary`, `recordStatusInstance` (consumed by the RABA rationale) | `insufficientRecord(plan)` — the FACTUAL documentation-gate subset ONLY (Item 241.3 condition 5) | "is complete against the documentation elements of 11 CCR § 7152(a)" + firm benefits-outweigh |

On `278d0608` every factual documentation gate passed while the benefit column was empty. The narrow predicate said "complete"; the balance path said "insufficient". Both statements shipped in the same document.

### Fix

`assessRecordCompleteness(plan): RecordCompleteness` in `section-composers/cppa-risk.ts` is now the **single** predicate, exported and consumed by every composer that speaks to completeness (executive summary via `aggregateBalance`, assessment summary, `recordStatusInstance`/RABA, record sufficiency, next steps). Reasons are enumerated, not boolean-collapsed:

- `documentation_gate_unresolved` — any unresolved FACTUAL documentation gate (Item 241.3 condition 5 preserved: judgment-subset gates are reserved decisions and never make the record incomplete by themselves).
- `no_present_benefit_factor` — the former standalone balance-substance branch, now absorbed.
- `information_needed_outstanding` — any emitted "Items for your review" ask.

`insufficientRecord` is retained as a thin alias (`!assessRecordCompleteness(plan).complete`) so no call site reads a second definition.

## F2 — PROVISIONAL POSTURE ON AN INCOMPLETE RECORD

New template `T.risk.summary.provisional_posture` (`content/pass2-templates.ts`; version bumped to `pass2-templates-2026-07-30-item284-provisional-posture`), with both plan slots REQUIRED in `pass2-render.ts` (`provisional_support_clause`, `outstanding_elements_clause`) and resolvable in `slot-resolver.ts`.

Emitted by `provisionalPostureInstance(plan)` whenever the shared predicate reports the record incomplete, and appended to the assessment summary and to the RABA rationale chain. It states what the record AS DOCUMENTED supports, expressly conditions the statement on the enumerated outstanding elements, and returns completion and reserved determinations to the customer and counsel.

A firm favorable verdict is now structurally unreachable on that path: `aggregateBalance` cannot return `"firm"` while the predicate reports incomplete. The firm adverse side remains guarded by Item 273 / Issue 10 (firm negative verdicts are never count-derived).

RABA carrier note: the provisional instance rides at the END of the rationale `parts` chain, but the emitted CARRIER remains the balance conclusion (`carrierOf`), so downstream consumers of `activity_label` are unchanged.

## F3 — THE CHARACTER SLICE IS DEAD

Site: `pass1-llm.ts`, Single-Writer factor merge —
`const weight_note = typeof m.weight_note === "string" ? String(m.weight_note).slice(0, 240) : undefined;`
That hard 240-character cut is the exact signature of "commercial benefit from t", "limiting data exposur", "this personal i", "dark-patter".

Replaced by `fillOrOmitWeightNote(raw)`: the note ships WHOLE (bounded at `WEIGHT_NOTE_MAX_CHARS = 600`), or it is omitted entirely and counted. New telemetry key `pass1_weight_note_omissions` (dedicated; does not overload `pass1_factor_ref_drops`). No emitter downstream re-slices a note.

## F4 — `priority_actions` PHRASE + OWNER

- **Phrase de-duplication.** Family-grouped rows already name the element class in their label ("the following potential negative impact categories:"). Prepending the class-naming KIND stem produced "…to address the potential negative impact category the following potential negative impact categories:". Family rows now take the class-neutral RATIFIED stem `KIND_OPENERS.gate_unresolved` ("Additional information would be needed for"); non-family rows are byte-unchanged. No new stem was invented — SPEC §6 ratified-stem discipline holds.
- **Owner.** `ownerForKind` hard-coded every `type_j_reserved` action to "qualified legal counsel". `ActionSource.owner_role_titles_override` now carries the registry's `reserved_to`: `"business"` → the certifying-executive title (fallback "the accountable business owner named on the assessment record"), `"external_auditor"` → the external auditor. Unregistered conclusion ids keep the Item-243 defect-6 default, so that pin is intact. `j.initiation_decision` (§ 7152(a)(7), `reserved_to: "business"`) is no longer assigned to counsel.

## F5 — `next_steps` EMITTER (PART 3/4)

`composeNextSteps` previously emitted present-safeguard confirmations ONLY — hence NULL on `1cda30f6`/`2391b49a` and one trivial item on `278d0608`. It now derives, in order and deduped by case-folded label:

1. one completion step per outstanding `information_needed` ask (the same emitter the customer reads under "Items for your review", carrying its `customer_question` as the basis);
2. one documentation step per unresolved FACTUAL documentation gate, using the same labels as `priority_actions` (`documentationGateLabel`, hoisted for this purpose) and the gate's own pinpoint;
3. present-element confirmations (prior behaviour, retained).

FILL-OR-OMIT: an entry missing a label or a basis is dropped whole; no fragment and no `undefined` residue reaches the surface.

---

## TESTS

New: `supabase/functions/_shared/ltp/item284-deterministic-fixes.test.ts` — 8 tests, all passing:

```
ITEM 284 F1: one predicate — exec summary and assessment summary never diverge ... ok
ITEM 284 F1: predicate reports the no-present-benefit state as incomplete ... ok
ITEM 284 F2: incomplete record → provisional posture, no firm favorable verdict ... ok
ITEM 284 F3: weight_note ships whole or is omitted — never sliced mid-word ... ok
ITEM 284 F3: no shipped factor note ends on a truncated word ... ok
ITEM 284 F4: priority_actions carry no duplicated element-class phrase ... ok
ITEM 284 F4: the § 7152(a)(7) initiation decision is owned by the business ... ok
ITEM 284 F5: next_steps is substantive whenever information_needed is ... ok
ok | 8 passed | 0 failed
```

Full suite (`_shared/ltp/` + `run-cppa-risk-assessment/`): **506 passed | 21 failed**. The 21 failures are the SAME failure set as HEAD before this turn (captured by restoring the five touched files to HEAD and diffing the failing-test list: `NO-NEW-FAILURES`) — the Item-273 pre-existing legacy inventory (stale template-count pins, stale version-stamp pins, stale BUILD_STAMP pins, and the pre-existing `item276` "rationale must emit" case where no applicability prong is engaged). No test was weakened or deleted.

## FILES CHANGED

- `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts` — F1, F2, F4, F5.
- `supabase/functions/_shared/ltp/pass1-llm.ts` — F3 (`fillOrOmitWeightNote`, `WEIGHT_NOTE_MAX_CHARS`, `pass1_weight_note_omissions`).
- `supabase/functions/_shared/ltp/content/pass2-templates.ts` — F2 template + version bump.
- `supabase/functions/_shared/ltp/slot-resolver.ts`, `pass2-render.ts` — F2 slots (required).
- `supabase/functions/_shared/ltp/content/content.test.ts` — id-list pin extended.
- `supabase/functions/_shared/ltp/item284-deterministic-fixes.test.ts` — new.

## DEPLOY / LIVE-CALL DECLARATION

Deployed: `replay-cppa-risk-harness` ONLY. No other function deployed. No LLM call, no harness invocation, no DB write this turn. Track-1 production wire and `supabase/_rebuild-snapshot-item244/` untouched.

**Disposition:** LANDED. F8 (`section_structure` provisional positives) is now re-judgeable; N2 (Item 285, 2R entity-whitelist) is unblocked.
