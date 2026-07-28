# ITEM 242 — BATCH-OF-THREE FIX SET, CHECKPOINT A (deterministic)

Dispatch: `CONTROLLER DISPATCH — ITEM 242 (2026-07-28)`
Executed: 2026-07-28 (deterministic subset only — Checkpoint A).
Deploy status: **CODE LANDED, EXPLICIT DEPLOY PENDING controller wire.**
Build stamp: `ltp-risk-item242-batch3-fixes@…`
Composer version: `ltp-section-composers-cppa-risk-2026-07-28-item242-batch3`

## Scope executed this turn (Checkpoint A)

CEO ruling on the split proposal was implicit-continuation only, so this
turn ships the four defects that are **deterministic-fix-only** — no new
customer-facing prose, no Pass-1 prompt content. The three content
authoring classes (defects 1, 2, 5) are surfaced verbatim in Checkpoint B
and Checkpoint C couriers for CEO sign-off before wiring.

| Defect | Class | Status this turn |
|---|---|---|
| (3) `neg.e.economic_harms` guidance_ref citation | Registry re-key | ✅ Wired + tested |
| (4) Gap-applicability law | Composer filter | ✅ Wired + tested |
| (6) Record-sufficiency opener/closer contradiction | Template/composer | ✅ Wired + tested |
| (7a) Owner slot on every action | Template slot + composer | ✅ Wired + tested |
| (7b) Cohort-aware deadline row selection | Composer | ✅ Wired + tested |
| (7c) Per-gate registry pinpoints | Composer | ✅ Wired + tested |
| (1) Submission prong utilization § 7120(b)(1)/(2)(B) | **Content + wiring** | ⏸ Checkpoint B |
| (2) Action diversity per factor KIND | **Content + wiring** | ⏸ Checkpoint B |
| (5) Pass-1 judgment hygiene (glossary + coherence screen) | **Prompt content** | ⏸ Checkpoint C |

## Defect 3 — VERIFY-FIRST finding + re-key

**Row:** `neg.e.economic_harms` (`supabase/functions/_shared/factors/cppa-risk-factors.ts`)
- Anchor: `11 CCR § 7152(a)(5)(E)` (economic harms) — unchanged.
- **Previous guidance_ref citation:** `11 CCR § 7152(a)(5)(F)` p.36 (FSOR).
- **Verify-first read of provision_texts + FSOR p.36:** The FSOR
  commentary discusses "based upon profiling" as a pathway to **economic
  injury** to consumers. In the post-modification regulation the
  economic-harms enumeration lives at **(a)(5)(E)**; the (F) label in
  the FSOR reflects the pre-modification numbering.
- **Ruling:** Substance controls over pre-mod pinpoint label. Re-key the
  guidance_ref `regulation_citation` to `11 CCR § 7152(a)(5)(E)` and
  preserve the pre-mod provenance verbatim in `anchor_hint` as
  historical context, not as a live cross-provision reach.

## Defect 4 — GAP-APPLICABILITY LAW

Rule (new): gap-driven actions emit only for absent-**AND-APPLICABLE**
elements. Absent-and-inapplicable items surface in `record_sufficiency`
as "not applicable" and never as an action.

**Wiring** — `_shared/ltp/section-composers/cppa-risk.ts::composePriorityActions`:
- New helpers `isAdmtScoped`, `admtGateBlocked`, `factorAdmtApplicable`,
  `propAdmtApplicable`. When `G.q18.admt_consequence` outcome === `block`,
  every ADMT-scoped factor and Type-J proposition is filtered out of the
  action set before template instancing.
- Fixture assert (`_item242_batch3_a.test.ts`): q18=No record produces
  zero ADMT actions.

## Defect 6 — RECORD-SUFFICIENCY CLOSER

`T.risk.record_sufficiency.prose` (`_shared/ltp/content/pass2-templates.ts`)
now takes a second slot `sufficiency_closer_clause`. Both the opener
(`sufficiency_clause`) and the closer are derived from the same boolean
in `composeRecordSufficiency`. Contradiction between opener and closer is
structurally impossible; the e2e assert enforces polarity agreement.

**Verbatim template text (unchanged aside from the terminal clause):**
> "…As of `{{plan:as_of_date}}`, the record `{{plan:sufficiency_closer_clause}}`."

**Verbatim closer clauses (composer-set, not model-authored):**
- Sufficient: `"is sufficient for the § 7152(a)(6) balancing frame to weigh"`
- Insufficient: `"remains not yet sufficient for the § 7152(a)(6) balancing frame — see enumerated deficiencies above"`

## Defect 7 — ACTION MECHANICS

### 7a — Owner slot
`T.risk.priority_action.golden` gains `owner_role_titles`. Composer reads
`i7_internal_contributors` (role-title only; PII-safe). Fallback:
"the accountable business owner named on the assessment record".
Template terminal sentence: `" Owner: {{plan:owner_role_titles}}."`.
`REQUIRED_PLAN_SLOTS` updated in `pass2-render.ts`.

### 7b — Cohort-aware deadline selection
`deadlineForAction` refactored to consult intake for
`processing_start_date` / `cohort_effective_date`. Factor-gap AND
documentation-gate actions now select assessment-record rows under
§ 7155 (`d.assessment_record.pre_existing` or `.prospective`) instead of
defaulting to `d.ongoing_processing`. ADMT actions select
`d.admt_pre_use_notice.{existing|prospective}`.

### 7c — Per-gate registry pinpoints
Documentation-gate action branch now reads `CPPA_RISK_GATE_INDEX[g.gate_id].anchor_pinpoint`
so each action carries its own § 7152(a)(1)/(a)(2)/(a)(3)/(a)(9) pinpoint.
Labels are id-derived (`"assessment record — <slug>"`), never the raw
description sentence (which previously bled internal cross-refs like
"(a)(3)(G) ADMT logic/output is required only when § 7150(b)(3) fires"
into the shipped action label).

## Tests

New file `supabase/functions/run-cppa-risk-assessment/_item242_batch3_a.test.ts` —
six asserts, one per defect. New composer exports
`composePriorityActionsForTest`, `composeRecordSufficiencyForTest`
provide the test surface without disturbing the assembler.

Full suite (LTP shared + run-cppa-risk-assessment):
```
running 296 tests
ok | 296 passed | 0 failed (6s)
```

## Files touched

- `supabase/functions/_shared/factors/cppa-risk-factors.ts` — defect 3.
- `supabase/functions/_shared/ltp/content/pass2-templates.ts` — defects 6, 7a.
- `supabase/functions/_shared/ltp/pass2-render.ts` — REQUIRED_PLAN_SLOTS updates.
- `supabase/functions/_shared/ltp/slot-resolver.ts` — new slot passthroughs.
- `supabase/functions/_shared/ltp/section-composers/cppa-risk.ts` — defects 4, 6, 7a, 7b, 7c; test exports; version bump.
- `supabase/functions/run-cppa-risk-assessment/index.ts` — BUILD_STAMP bump.
- `supabase/functions/run-cppa-risk-assessment/_item242_batch3_a.test.ts` — new.

## HARD STOP

Checkpoint A is code-complete and green. Explicit deploy pending
controller wire; Checkpoint B (defects 1 + 2, content-anchored courier)
and Checkpoint C (defect 5, Pass-1 prompt-glossary + coherence-screen
content) require CEO sign-off before wiring per courier-discipline law.
