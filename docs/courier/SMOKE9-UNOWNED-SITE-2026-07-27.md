# SMOKE-#9 UNOWNED-SITE — Item 213 (2026-07-27)

## Root cause (controller-verified, restated)

Smoke #9 (assessment run #161) completed in 327s with grader scores
C=81.45 / G=88 and a FULLY CLEAN shipped projection
(`shipped_surface_guard`: `cut_violations=[]`, `unowned_paths=[]`).
The Item-211 build stamp proved on the wire. But
`composition_finalize.errored=true` because the pre-serializer
`surface-write-guard walk` still enforced the **unowned-top-level**
class in enforce mode and threw on five keys — `generated_at`,
`legacy_shim_applied`, `normalised_intake`, `retrieval_meta`,
`open_items` — that the LEAK-PREV-P2 serializer strips (hence
shipped `unowned=[]`).

This is the same class of false positive as smoke #6 and smoke #8:
the pre-serializer guard is judging the wrong object. Every
surface-shape ruling in `risk-surface-map.ts` executes at the
serializer; the pre-serializer object legitimately contains keys the
serializer removes.

## Fix chosen (single-turn consolidation)

Pre-serializer `finalizeComposition` surface checks become
**ENTIRELY telemetry-only** in every mode (`observe` and `enforce`).
ALL surface-shape enforcement authority — CUT rulings AND the
unowned-top-level class — lives solely at the post-serializer
wire-site `evaluateShippedSurfaceGuard` on the shipped/graded
projection. Value-screen / fragment-omit / hook-audit behavior is
unchanged.

### `_shared/ltp/composition-finalize.ts`

- Removed the enforce-mode throw on `surface_unowned_paths`. The
  pre-serializer walk now records unowned top-level keys under new
  telemetry field `pre_serializer_unowned_pending: string[]`.
- `FinalizeTelemetry.surface_unowned_paths` and
  `surface_cut_violations` retained for schema stability; always emit
  `[]`.
- `evaluateShippedSurfaceGuard` already computed both `cut_violations`
  and `unowned_paths` on the shipped projection — no change; the
  wire-site telemetry consumer (`_meta.internal.shipped_surface_guard`)
  is the single authoritative source.

### `_shared/ltp/content/risk-surface-map.ts`

- Rewrote the enforcement-site comment: all surface-shape rulings
  (CUT + unowned) enforce SOLELY at the post-serializer wire-site.
  Pre-serializer records `pre_serializer_cut_pending` and
  `pre_serializer_unowned_pending` telemetry and never throws.

### `run-cppa-risk-assessment/index.ts`

- `BUILD_STAMP` → `ltp-risk-item213-unowned-site@2026-07-27T23:45:00Z`.

## Regression tests

`_shared/ltp/composition-finalize.test.ts`:

- REPLACED: "unowned top-level in enforce mode throws" →
  "unowned top-level in enforce records telemetry, does NOT throw
  (Item 213)". Verifies `made_up_key`, `generated_at`,
  `retrieval_meta` all land in `pre_serializer_unowned_pending` with
  `surface_unowned_paths=[]` and no throw.
- UPDATED: observe-mode unowned test now asserts the new telemetry
  field.
- UPDATED: safeFinalize unowned-in-enforce test now asserts
  `errored=false`, `enforce_violation=false`, and the telemetry-field
  presence.
- NEW: "shipped-surface-guard: unowned top-level key FAILS on shipped
  projection (Item 213)" — the shipped guard still reports the class.
- NEW: "smoke-#9 exact composed shape (5 unowned + clean surface)
  passes finalize with telemetry (Item 213)" — replays the five
  smoke-#9 keys and asserts no throw, all five in
  `pre_serializer_unowned_pending`.
- Previously green tests (Items 208/211/206) unchanged and still
  passing.

## Test results

`deno test _shared/ltp/composition-finalize.test.ts` — **26 / 26 green.**

## Deploy + §16 ping

Boot log observed:

```
[run-cppa-risk-assessment] boot build_stamp=ltp-risk-item213-unowned-site@2026-07-27T23:45:00Z
{"evt":"risk_va_registry_loaded", ..., "build_stamp":"ltp-risk-item213-unowned-site@2026-07-27T23:45:00Z"}
```

## Ledger

Item 213 appended to `docs/pipeline-state.md`.

**READY-FOR-RELAUNCH. HARD STOP.**
