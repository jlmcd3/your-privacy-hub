# T-M9.7 — RUN #171 FIXES (Item 237)

**Date:** 2026-07-28
**Scope:** cppa-risk (`run-cppa-risk-assessment`); RenderPlan primacy
preserved; no grader edits; no batch inserts.

Run #171 evidence: C=68.1 / G=87. Boilerplate layer landed, `wa_origin`
now `null` on ok, but the build was NOT accepted because
`opening_summary` and the two core balance sections
(`assessment_summary`, `risk_assessment_by_activity`) still omitted.

## Fix (a) — OPENING HARVEST: LEDGER VOCABULARY

**Mismatch evidence.** The T7 deterministic opening
(`_shared/openings/risk-opening.ts`) emits provenance sources shaped
`"intake:<csv-of-field-names>"`. Fields cited across S2 / S3 / S4:

- `entity_name`
- `q4_pi_categories`
- `i1_processing_purpose`
- `q5_sell_share`
- `q5b_profiling_observation`
- `i1b_min_pi`
- `i4_disclosure_mechanisms`
- `bought_sold_shared_count`

The RenderPlan's `intake_ledger` was built by `derivePlan()` from the
narrow `LEDGER_KEYS` list — only `q1_revenue`, `q2_consumers`,
`q18_admt_use`, `sell_share`, `sensitive_pi`, `processing_purposes`,
`safeguards_summary`, `retention_period`. Every T7 provenance field
above was legitimately consulted by the opening builder but was
absent from `plan.intake_ledger`, so
`intakeRefsGroundedInPlan()` in `harvest-guard.ts` rejected with
`harvest_intake_ref_not_in_plan_ledger` — the guard's grounding check
was correct; the ledger was under-populated.

**Fix.** Extended `LEDGER_KEYS` in `_shared/ltp/derive.ts` to include
every T7-referenced intake field. Guard logic untouched. Grounding
still enforced — ledger just now carries the fields the opening
legitimately depends on.

## Fix (b) — UNIFIED VARIANT-SELECTION SEAM

**Callsite enumeration.** Every path that selects between
`T.risk.balance.firm` and `T.risk.balance.hedged`:

1. `_shared/ltp/section-composers/cppa-risk.ts::balanceInstance` —
   runtime selection consumed by the assembler.
2. `_shared/ltp/pipeline.ts` — shadow-mode telemetry only, no
   composition effect.
3. `_shared/ltp/pass2-render.ts::assertCalibrationMatch` — post-render
   guard; rejects firm at `closeness ≥ FIRM_VARIANT_CLOSENESS_MAX`.

**Closeness value sources.**

- Composer: `chooseVariant(computeCloseness(plan, plan.weighing_frame))`
  — WEIGHTED SCALAR (0.5·factorImbalance + 0.4·guidanceNorm +
  0.1·safeguardBoost).
- Assembler guard (`anyCloseBalance`): PER-FRAME MAX
  (`some(contribution ≥ threshold)`).

With a single dominant frame contribution of 0.9 and no factor
imbalance, the weighted scalar was 0.36 → composer picked firm; the
per-frame max was 0.9 → guard rejected firm. Two definitions, one
sentinel.

**Fix.** `_shared/ltp/closeness.ts::computeCloseness` now returns the
max of the weighted scalar and the strongest per-frame contribution.
`chooseVariant` therefore returns `hedged` whenever any single frame
crosses the threshold — matching `anyCloseBalance` exactly.
`chooseVariant` remains the ONE selection function.

**Composer completion.** `balanceInstance` also now populates the
actual template plan-slots — `benefit_summary_tokens`,
`negative_summary_tokens`, `tipping_factors`,
`safeguard_summary_tokens`, `balance_direction_clause` — from the plan
factor table and weighing frame. `slot-resolver.ts` prefers
ctx-supplied values for these slots when non-empty so the composer's
projection is authoritative. Without this, the hedged/firm templates
resolved slots against the plan directly, and empty plan surfaces
tripped the required-slot omission path.

**Joint test per LAW-1 discipline.** Added
`ITEM 237 fix (b): assembler emits hedged (NEVER firm) for
assessment_summary + risk_assessment_by_activity at closeness ≥
threshold` in `_shared/ltp/e2e-document.test.ts`. Asserts on assembler
`telemetry.sections[k].template_ids_rendered` and `.emitted` — not on
`chooseVariant` in isolation.

## Fix (c) — HYGIENE

- **`part_a` / `part_b` / `gating`** reclassified to emit `{}` as
  empty-by-design. Their shard `project` now returns `{}` instead of
  `NONE`, so telemetry states the truth (structural presence at the
  shard) rather than `no_content`.
- **`value-screen` version-stamp pin** updated in
  `_shared/ltp/value-screen.test.ts` to the current stamp
  (`value-screen@2026-07-28-item235-residue`).
- **`waveb` gateway-missing-key probe** rewritten hermetic per the
  T-M9 pattern. Since T-M9.2 the direct Anthropic client replaced the
  Lovable-gateway path, so the probe now unsets `ANTHROPIC_API_KEY`
  (and `LOVABLE_API_KEY` for belt-and-braces) and asserts the
  conservative write-around fallback.

## Test evidence

```
_shared/ltp/e2e-document.test.ts   11/11 pass
  (includes ITEM 237 fix (b) joint assertion)
_shared/ltp/ (full suite)          221/221 pass, 0 failed
```

Previous suite state: 218 passed / 2 failed (both cleared by fix (c)).

## Deploy

`BUILD_STAMP` bumped to
`ltp-risk-item237-t-m9.7-run171-fixes@2026-07-28T10:44:52.457Z`.

Ping surface (verbatim) — see ledger Item 237.

## Disposition

READY-FOR-CONTROLLER-WIRE-VERIFY-AND-RELAUNCH. HARD STOP.
