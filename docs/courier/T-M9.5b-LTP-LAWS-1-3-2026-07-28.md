# T-M9.5b — LTP LAWS 1-3 (Item 235b)

**Date:** 2026-07-28
**Function:** `run-cppa-risk-assessment`
**Build stamp:** `ltp-risk-item235b-t-m9.5b-ltp-laws-1-3@2026-07-28T09:53:17.905Z`
**Dispatch class:** CEO addendum to T-M9.5. Standing law for every future product migration.

## What landed

### LAW 1 — projection→template seam, enforced per-slot
- `RenderResult` now exposes `slot_telemetry: readonly SlotTelemetry[]` with
  `{template_id, slot, source: "ctx"|"plan"|"none", required, empty}`.
- `renderTemplate` records telemetry for every plan_slot on every instance
  and emits per-slot omission errors of the form
  `omit_empty_required_slot:<template_id>:<slot>` (one per failing slot,
  replacing the aggregated form).
- Instance-level omission decision is unchanged: any REQUIRED plan_slot
  resolving empty rejects that instance with `omit_reason:"required_slot_empty"`.

### LAW 2 — deterministic E2E document test (required CI gate)
`_shared/ltp/e2e-document.test.ts` (5 tests):
- (i) every emitted section carries non-empty, residue-free strings.
- (ii) every omission has a classified `omitted_reason` from the closed
  enumeration.
- (iii) every shipped top-level key ∈ shard registry AND ∈ report schema.
- (iv) zero blank-slot regex matches on the shipped body (extends
  `INTERPOLATION_RESIDUE_PATTERNS`).
- plus `structural_completeness.nonconformant_keys === []`.

### LAW 3 — surface-ownership enforcement at build time
`_shared/ltp/surface-ownership.test.ts` (4 tests):
- (a) static grep of `pass2-assembler.ts` proves exactly one
  `report[<key>] = ...` write site, and the key expression is `shard.key`.
- (b) every `shard.key` ∈ report-schema top-level.
- (c) any shard targeting a top-level CUT-ruling path MUST have owner
  `template-cut`; any other owner_kind fails.
- (d) at assembly time no shipped key equals a CUT REMOVE path.

The cohort-to-CUT-surface class (§ 7121(a) → `cross_tool_recommendations`)
is now impossible to reintroduce without a static test failure.

## Files changed
- `supabase/functions/_shared/ltp/pass2-render.ts` — `SlotTelemetry`
  interface; `substitutePlanSlots` signature (adds `templateId` +
  `requiredSet`) returns per-slot telemetry; `renderTemplate` propagates
  it and emits per-slot omission errors. Behavior-compatible extension;
  no consumer relies on the old aggregated error string shape.
- `supabase/functions/_shared/ltp/e2e-document.test.ts` — new.
- `supabase/functions/_shared/ltp/surface-ownership.test.ts` — new.
- `supabase/functions/run-cppa-risk-assessment/index.ts` — BUILD_STAMP
  bumped; ping surface adds `ltp_laws_1_3: "item235b-2026-07-28"`.
- `docs/pipeline-state.md` — Item 235b appended.

## Test paste
```
running 5 tests from ./_shared/ltp/e2e-document.test.ts
LAW 2 (i): every emitted section carries real, residue-free content ... ok
LAW 2 (ii): every omitted section carries a classified omit reason ... ok
LAW 2 (iii): every shipped top-level key ∈ shard registry AND ∈ report schema ... ok
LAW 2 (iv): zero blank-slot patterns anywhere on the shipped surface ... ok
LAW 2: structural completeness — assembler reports no nonconformant keys ... ok
running 4 tests from ./_shared/ltp/surface-ownership.test.ts
LAW 3 (a): assembler source declares exactly ONE report[<key>] write site ... ok
LAW 3 (b): every shard.key is present in report schema top-level allow-list ... ok
LAW 3 (c): no shard.key is a top-level CUT ruling path ... ok
LAW 3 (d): assembler never ships a top-level key that matches a CUT ruling path ... ok
ok | 25 passed | 0 failed (525ms)
```
(waveb 10 + summary-compose 6 regressions run in the same suite.)

## Ping (verbatim)
```
{
  "build_stamp": "ltp-risk-item235b-t-m9.5b-ltp-laws-1-3@2026-07-28T09:53:17.905Z",
  "composition_enforce": "1",
  "fn": "run-cppa-risk-assessment",
  "ltp_laws_1_3": "item235b-2026-07-28",
  "ltp_mode": "enforce",
  "ltp_version": "ltp-risk-p2",
  "pass1_authoritative": "1",
  "pass1_model": "claude-sonnet-4-6",
  "pass1_stamp": "ltp-pass1-llm-item234-valid-plan-ships@2026-07-28",
  "pass1_timeout_enforced": "abort-controller",
  "pass2_assembler": "ltp-pass2-assembler-2026-07-28-item235-fill-or-omit",
  "pass2_assembler_composition_shape": "cppa-risk-shape@2026-07-28-tm7-retirement"
}
```

**Disposition:** READY-FOR-CONTROLLER-WIRE-VERIFY-AND-SMOKE-RELAUNCH. HARD STOP.
