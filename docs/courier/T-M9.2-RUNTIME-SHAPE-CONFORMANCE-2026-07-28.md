# T-M9.2 — RUNTIME SHAPE CONFORMANCE (LEGACY V4 GENERATION EXECUTION RETIRED)

**Date.** 2026-07-28
**Ledger.** Item 232
**Scope.** `supabase/functions/run-cppa-risk-assessment/index.ts` only.

## Dispatch summary

Item-231 log paste showed the item230a build executed the legacy Engine-A v4 generation (~120 s), post-gen scrub, and `generate-v4-retry` (120 s abort) BEFORE Pass-1. Declared shape is `llm_calls_per_document=[pass1_derive]`. The observed 2–3 LLM calls are undeclared drift AND spend waste per document — the T-M6 assembler overwrites every non-underscore top-level key with the deterministic body, so the legacy prose never reaches the shipped surface. T-M7 retired the declaration and modules but not the execution.

## VERIFY-FIRST — legacy `parsed` consumers

Every post-gen mutation of `report_data` (~L1017–L3577) writes into non-underscore top-level fields (`assessment_summary`, `priority_actions`, `risk_register`, `information_needed`, `exception_analysis`, etc.). At L3589 the T-M6 cutover computes:

```ts
const _preserved: Record<string, unknown> = {};
for (const [k, v] of Object.entries(_rdBefore ?? {})) {
  if (k.startsWith("_")) _preserved[k] = v;
}
const _cutover: Record<string, unknown> = { ..._body, ..._preserved };
report_data = _cutover as any;
```

Only underscore-prefixed subtrees (`_meta.internal.*` telemetry) survive; everything else is overwritten by the assembler body. Harvests (`opening_summary`, `submission_summary`) are deterministic via `harvest-guard.ts` and do not consume legacy prose. Conclusion: NO real consumer of the legacy generation output reaches the customer report. Deletion is safe.

## Fixes landed

1. **Retirement flag + counter.** `LEGACY_GENERATION_RETIRED = true` and `legacyLlmCallCount` module-level counter at boot.
2. **`callModel` fails loud.** When `LEGACY_GENERATION_RETIRED`, the function increments the counter and throws `composition_shape_drift:legacy_v4_callmodel_invoked:label=<label>` without issuing an Anthropic request.
3. **Primary block replaced with stub.** The `generate-v4` + `generate-v4-retry` block (previously ~L1017–L1054) is replaced with a shape-valid stub `parsed = { assessment_summary: {}, _legacy_generation_retired: {...} }`. `terminal_error_parse` is bypassed (the stub carries `assessment_summary`). A `legacy_v4_generation_skipped` log event is emitted.
4. **Scrub-retry sites guarded.** The three post-gen retry `callModel` invocations are short-circuited under `LEGACY_GENERATION_RETIRED` before invocation:
   - `generate-v4-retry` (T5 vocab + blacklist retry) at ~L1321.
   - `generate-v4-fwdpath-retry` at ~L1492.
   - `generate-v4-cot-leak-retry` at ~L1545.
   Each logs a `*_skipped_retired` event.
5. **Runtime shape assert.** Immediately before `terminal_complete` (~L3957), the pipeline asserts `legacyLlmCallCount === 0`. On drift it writes `status='error'` + `last_error=composition_shape_drift:legacy_v4_call_count=<n>;labels=<...>` to `cppa_assessments` and returns — no ship of spend-wasted output. Drift is now self-enforcing at runtime, not just declared.
6. **Explicit deploy + verbatim ping.** Fresh build stamp `ltp-risk-item232-t-m9.2-runtime-shape@2026-07-28T09:15:00Z`; explicit deploy via `supabase--deploy_edge_functions` per standing law.

## Expected E2E envelope

Removing the legacy generation execution eliminates ~120 s primary generation + up to ~120 s scrub-retry + associated post-gen scrub work from every run.

New runtime: intake validation + corpus retrieval → deterministic ledger/telemetry passes (no LLM) → Pass-1 derive (single LLM call, N=2 × 120 s worst-case, typical single-attempt sub-30 s) → Guide → Pass-2 assembler → guards → persist.

Expected E2E: **~30–60 s typical**, **≤ ~4 min worst-case** (Pass-1 retry exhaustion → Type-J write-around, the designed degradation), vs. the prior ~4–7 min envelope dominated by discarded generation.

## Post-deploy `GET ?ping=1` (verbatim)

```
build_stamp:                      ltp-risk-item232-t-m9.2-runtime-shape@2026-07-28T09:15:00Z
pass1_timeout_enforced:           abort-controller
post_lint_pass1_timeout_ms:       120000
pass1_stamp:                      ltp-pass1-llm-item230-abort-controller@2026-07-28
pass2_assembler:                  ltp-pass2-assembler-2026-07-28-tm6
composition_shape.version:        cppa-risk-shape@2026-07-28-tm7-retirement
composition_shape.llm_calls_per_document:
  [ { stage: "pass1_derive", role: "authoritative RenderPlan derive", model_role: "pass1_derive" } ]
composition_shape.intermediate_artifacts:
  [ "render_plan (authoritative)", "assembler_output (shipped body; harvests are deterministic)" ]
```

## Disposition

READY-FOR-CONTROLLER-WIRE-VERIFY-AND-SMOKE-RELAUNCH. HARD STOP.
