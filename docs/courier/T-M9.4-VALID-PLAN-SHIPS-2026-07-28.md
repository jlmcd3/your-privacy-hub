# T-M9.4 — VALID PLAN SHIPS (successful RenderPlan was discarded by stale write-around flag)

**Date:** 2026-07-28
**Ledger:** Item 234
**Build stamp:** `ltp-risk-item234-t-m9.4-valid-plan-ships@2026-07-28T09:14:48.093Z`
**Pass-1 stamp:** `ltp-pass1-llm-item234-valid-plan-ships@2026-07-28`

## Evidence (run #168)

Batch `46c90de6`, run #168, assessment `63542548-33eb-45af-90fb-36042f99d5ed` on the item233 build.

- `attempts_detail`: attempt 1 `outcome=ok`, `elapsed_ms=139156`, `continuation_count=1`.
- **Pass-1 succeeded** (validating the 240 s window; 139 s is the first real Pass-1 duration measurement).
- Yet `write_around_origin="clock_cap"` and the Type-J body shipped → C=19.9 / G=61.
- A successful, validator-clean RenderPlan was discarded by the cutover classifier.

## Condition + observed values

`_shared/ltp/pass1-llm.ts:190` preserved `conservative_write_around` from parsed JSON:

```
conservative_write_around: parsed?.conservative_write_around ?? { triggered: false, ... }
```

The model returned a validator-clean plan whose top-level `conservative_write_around.triggered` was `true`. Downstream consumers:

- **Cutover site** (`run-cppa-risk-assessment/index.ts:3570`):
  ```
  const _writeAround = !!_pass1.plan?.conservative_write_around?.triggered || !_pass1.telemetry.ok;
  ```
  → `_writeAround=true`. `_pass1.telemetry.error` is `undefined` on ok, so the origin ternary at :3577 falls through to the `"clock_cap"` bucket.
- **Finalize hook** (`run-cppa-risk-assessment/index.ts:3668`):
  ```
  const _writeAroundEntered = !!_ltpPreview?.plan_summary?.write_around;
  ```
  `plan_summary.write_around` is set from the same field at :3528.

Both consumer sites derived write-around exclusively from the model-owned flag, so a model that hallucinated `triggered:true` reliably routed clean plans to Type-J with a bogus `clock_cap` origin.

## Invariant (stated in code + here)

**A successful, validator-clean RenderPlan is ALWAYS assembled and shipped.** The clock contract gates LLM retries only; the Pass-2 assembler is deterministic and requires no LLM budget. Type-J write-around fires **ONLY** when Pass-1 actually terminally failed (abort×N, validator hard-reject, or model error). Clock-cap can still bound the total pipeline via persist-first, but it MUST NEVER reroute a valid plan to Type-J.

## Fix

1. **`supabase/functions/_shared/ltp/pass1-llm.ts`** — on the validator-clean ok path (line 185–199), the model-emitted `conservative_write_around` is **overridden** to `{triggered:false, disclosure:"silent+telemetry"}`. The adapter, not the model, owns this flag. Stamp bumped to `ltp-pass1-llm-item234-valid-plan-ships@2026-07-28`.
2. **Cutover-site guard (`run-cppa-risk-assessment/index.ts`, :3568)** — belt-and-suspenders:
   ```
   const _pass1Ok = !!_pass1.telemetry.ok;
   const _writeAround = _pass1Ok
     ? false
     : (!!_pass1.plan?.conservative_write_around?.triggered || !_pass1.telemetry.ok);
   ```
   A future regression that reintroduces `triggered:true` on ok cannot re-route a valid plan.
3. **Finalize-hook guard (`run-cppa-risk-assessment/index.ts`, :3667)** — belt-and-suspenders:
   ```
   const _pass1TeleOk = _ltpPreview?.telemetry?.ok === true;
   const _writeAroundEntered = !_pass1TeleOk && !!_ltpPreview?.plan_summary?.write_around;
   ```
   The finalize classifier refuses to enter write-around when Pass-1 telemetry is ok.
4. **Stage timings** persisted at `_meta.internal.stage_timings`:
   `{ worker_start_ms, pass1_start_ms, pass1_end_ms, pass1_elapsed_ms, assembler_start_ms, assembler_end_ms, assembler_elapsed_ms, cutover_end_ms }`.
   All values relative to worker `t0` (worker_start_ms = 0 by construction). This is the empirical basis for measuring pre-Pass-1 time on the next successful run and tuning stage-by-stage.
5. **Fresh-clock BUILD_STAMP** — computed at module load with `new Date().toISOString()`; no more manually typed timestamps that can be future-dated (the item232 09:15:00Z violation is called out for the record).

## Unit test

`_shared/ltp/pass1-llm.test.ts` adds a hermetic test that:
- Seeds a validator-clean RenderPlan via `derivePlan` (deterministic shadow arm).
- Decorates it with `conservative_write_around: {triggered:true, reason:"model_hallucinated", ...}`.
- Mocks `globalThis.fetch` to return that plan as the Anthropic response body.
- Asserts that when `telemetry.ok === true`, both `telemetry.write_around` and `plan.conservative_write_around.triggered` are `false` — the adapter-owned override.

The pre-existing N=2 abort test already covers the Type-J path (pass1 double-abort → write-around with `pass1_abort_timeout`).

## Test paste (touched scopes)

- `supabase/functions/_shared/ltp/pass1-llm.test.ts` — **4 passed / 0 failed**.
- `supabase/functions/_shared/ltp/pass2-assembler.test.ts` — **6 passed / 0 failed**.
- `supabase/functions/run-cppa-risk-assessment/_ltp.test.ts` — **8 passed / 0 failed**.

## Deploy + verbatim ping

Explicit deploy via `supabase--deploy_edge_functions` on `run-cppa-risk-assessment`. Post-deploy `GET ?ping=1`:

- `build_stamp`: `ltp-risk-item234-t-m9.4-valid-plan-ships@2026-07-28T09:14:48.093Z`
- `pass1_stamp`: `ltp-pass1-llm-item234-valid-plan-ships@2026-07-28`
- `pass1_timeout_enforced`: `abort-controller`
- `post_lint_pass1_timeout_ms`: 240000
- `pass1_model`: `claude-sonnet-4-6`, `pass1_max_attempts`: 2
- `pass2_assembler`: `ltp-pass2-assembler-2026-07-28-tm6`
- `composition_shape.version`: `cppa-risk-shape@2026-07-28-tm7-retirement`
- `composition_shape.llm_calls_per_document`: `[pass1_derive]` only

## Next steps (CEO-directed; dispatch follows separately)

After this fix works: (1) controller reruns smoke; (2) on success, build the **TRIAGE/LEAN layer** — deterministic intake triage partition `{decisive-yes | decisive-no | analysis-relevant | irrelevant-given-gates}` + conjunction gates + `derived_lean` priors in the weighing frame, calibration-law-bounded, Type-J excluded — as **LEGAL-TEST-PIPELINE v2.4**.

**Disposition:** READY-FOR-CONTROLLER-WIRE-VERIFY-AND-SMOKE-RELAUNCH. HARD STOP.
