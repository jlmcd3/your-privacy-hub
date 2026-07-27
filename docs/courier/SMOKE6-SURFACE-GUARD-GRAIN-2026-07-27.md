# SMOKE-#6 SURFACE-GUARD-GRAIN — Item 208 (2026-07-27)

## Root cause (controller-verified, restated)

The Stage-B `finalizeComposition` surface-guard walk collapsed every
`CutRuling` to its top-level key via `path.split(".")[0]` and ignored
`mode`. That wrongly condemned the **bound** surface
`scope_and_triggers` (whose only cut ruling is a **nested**
OBJECT_PRUNE at `scope_and_triggers.scope_notes`). The guard also
evaluated the **pre-serializer** object, while `risk-surface-map.ts`
plainly states the CUTs execute at the LEAK-PREV-P2 serializer layer.
Smoke #6 (assessment `096d2d92`) shipped a fully conformant document
(scope_notes absent, `cross_tool_recommendations` absent,
`inconsistency_flags` empty) — the guard raised on the wrong object at
the wrong grain.

## Fix chosen

**Both**: rewrite the finalize guard AND add a post-serializer wire-
site guard. Rationale — the finalize walk is retained for the two
rulings whose grain **is** the top level (REMOVE / EMPTY_ARRAY); the
nested OBJECT_PRUNE ruling is enforced against the SHIPPED projection
via a new `evaluateShippedSurfaceGuard(shipped)` run **after** the
LEAK-PREV-P2 serializer. This matches the surface-map exactly and
would have kept smoke #6 green.

### `_shared/ltp/composition-finalize.ts`

- `CUT_TOP_LEVEL_REMOVE` / `CUT_TOP_LEVEL_EMPTY_ARRAY` derived from
  `RISK_CUT_RULINGS` filtered by mode and by whether the path is a
  top-level key.
- Finalize walk (Step 2) now enforces only those two modes at the top
  level. OBJECT_PRUNE-only rulings are ignored here (their key is
  legitimately allowed as a bound top-level surface).
- New export `evaluateShippedSurfaceGuard(shipped)` evaluates every
  ruling at its **declared path + mode** against the shipped
  projection. Also flags unowned top-level keys.

### `supabase/functions/run-cppa-risk-assessment/index.ts`

- After the LEAK-PREV-P2 serializer, run `evaluateShippedSurfaceGuard`
  and record telemetry on `_meta.internal.shipped_surface_guard`
  (mode, cut_violations, unowned_paths, enforce_violation). Never
  throws — the persist invariant is inviolable at the wire-site.
- `BUILD_STAMP` → `ltp-risk-item208-shipped-surface-guard@2026-07-27T19:30:00Z`.

### `_shared/ltp/cyber-audit-schedule.ts`

- Removed the "legacy renderer mirror" write to
  `cross_tool_recommendations.cybersecurity_audit_rationale`. That
  surface is REMOVE-cut at the serializer (item 136) — the write was
  dead AND the trigger for the smoke-#6 CTR guard false positive.
- Renderer-tolerance audit in `risk-surface-map.ts` already confirms
  all downstream renderers tolerate the absence of
  `cross_tool_recommendations`.

## Regression tests (added)

`_shared/ltp/composition-finalize.test.ts`:

- smoke-#6 exact shipped shape (scope_notes absent, no CTR, empty
  flags) — passes with zero violations.
- OBJECT_PRUNE: shipped with `scope_notes` present — FAILS.
- REMOVE: shipped with `cross_tool_recommendations` present — FAILS.
- EMPTY_ARRAY: shipped with non-empty `inconsistency_flags` — FAILS.
- Finalize regression: bound top-level `scope_and_triggers` (with only
  allowed children) does **not** throw in enforce mode.

## Test results

`deno test _shared/ltp/composition-finalize.test.ts
_shared/ltp/cyber-audit-schedule.test.ts
_shared/ltp/surface-write-guard.test.ts` — **34 / 34 green**.

## Deploy + §16 ping

```
{"fn":"run-cppa-risk-assessment",
 "build_stamp":"ltp-risk-item208-shipped-surface-guard@2026-07-27T19:30:00Z",
 "ltp_mode":"enforce","composition_enforce":"1",
 "safe_finalize":"safe-finalize@2026-07-27-item206-hits"}
```

## Ledger

Item 209 appended to `docs/pipeline-state.md`.

**READY-FOR-RELAUNCH. HARD STOP.**
