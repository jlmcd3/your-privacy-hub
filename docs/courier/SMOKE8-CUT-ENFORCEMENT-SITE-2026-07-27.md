# SMOKE-#8 CUT-ENFORCEMENT-SITE — Item 211 (2026-07-27)

## Root cause (controller-verified, restated)

Item 208's pre-serializer surface-guard walk enforced top-level
`REMOVE` / `EMPTY_ARRAY` rulings before the LEAK-PREV-P2 serializer
ran. `risk-surface-map.ts` explicitly states that CUT rulings execute
AT the serializer — so any composer emission of a CUT-path (e.g.
`cross_tool_recommendations`) is an EXPECTED PRE-SERIALIZER
CONDITION. The pre-serializer throw forced the safe-finalize backstop
on every run, silently skipping fragment-omit and any finalize
mutations on the shipped path.

Smoke #8 (assessment `fd485f92`) shipped a fully conformant document
(`shipped_surface_guard`: cut_violations=[], unowned_paths=[]) but
`composition_finalize.errored=true` on `cross_tool_recommendations`
presence pre-serializer.

## Fix chosen

Pre-serializer CUT enforcement is TELEMETRY-ONLY. Enforcement
authority for CUT rulings lives solely in `evaluateShippedSurfaceGuard`
on the shipped projection (Item 209 wire-site guard).

### `_shared/ltp/composition-finalize.ts`

- Retired `CUT_TOP_LEVEL_REMOVE` / `CUT_TOP_LEVEL_EMPTY_ARRAY` sets and
  their throw paths.
- Pre-serializer walk now records presence of every `RISK_CUT_RULINGS`
  entry (any grain, via `getByPath` on the ruling's declared path) under
  new telemetry field `pre_serializer_cut_pending: string[]`.
- The unowned-top-level check remains enforced at finalize (not a
  serializer concern).
- `FinalizeTelemetry.surface_cut_violations` retained for schema
  stability; always emits `[]`.

### `_shared/ltp/content/risk-surface-map.ts`

- Extended the `CutRuling` doc comment to name the enforcement site
  explicitly: post-serializer wire-site `evaluateShippedSurfaceGuard`.
  Pre-serializer records `pre_serializer_cut_pending` telemetry and
  never throws.

### `run-cppa-risk-assessment/index.ts`

- `BUILD_STAMP` → `ltp-risk-item211-cut-enforcement-site@2026-07-27T22:45:00Z`.

## Regression tests

`_shared/ltp/composition-finalize.test.ts`:

- REPLACED: "CUT-list top-level violation in enforce mode throws" →
  "CUT-ruled path present pre-serializer records telemetry, does NOT
  throw (Item 211)". Verifies BOTH top-level (`cross_tool_recommendations`)
  and nested (`scope_and_triggers.scope_notes`) CUT paths land in
  `pre_serializer_cut_pending` and `surface_cut_violations` stays `[]`.
- NEW: "unowned top-level in enforce mode throws" — the unowned class
  still enforces.
- Shipped-guard regressions (Item 209) unchanged and still passing:
  REMOVE / OBJECT_PRUNE / EMPTY_ARRAY violations on the shipped
  projection still fail.

## Test results

`deno test _shared/ltp/composition-finalize.test.ts` — **24 / 24 green.**

## Deploy + §16 ping

```
{"fn":"run-cppa-risk-assessment",
 "build_stamp":"ltp-risk-item211-cut-enforcement-site@2026-07-27T22:45:00Z",
 "ltp_mode":"enforce","composition_enforce":"1",
 "safe_finalize":"safe-finalize@2026-07-27-item206-hits"}
```

## Stage-C candidates (recorded, no code change this turn)

- **C/G grader divergence** on run #160 was 73.0 vs 88 = **15**
  (>= 12 threshold). Single-doc noise expected; logged for Stage-C
  divergence check.
- **Error-envelope-in-report_data** (Item 210 flag stands): the
  generator's outer catch writes `{"error":"Anthropic 529: ..."}` into
  `report_data` — belongs in a status/error column, not the
  customer-facing report surface.

## Ledger

Item 211 appended to `docs/pipeline-state.md`.

**READY-FOR-RELAUNCH. HARD STOP.**
