# T-M1 — PASS-1 DERIVE AS AUTHORITATIVE (cppa-risk)
Dispatch: T-M1 (CEO-released 2026-07-28) · Ledger Item 221
Design: docs/design/LEGAL-TEST-PIPELINE.md DESIGN COMPLETE-v2.3 · Item 218 §(b)(1)

## Scope

Rebuild-chain turn 3 (after Items 219 T-S1 security, 220 T-C1 intake contract).
Wires Pass-1 (deterministic derive + LLM arm + V1–V8 validators) as the
authoritative artifact producer for `run-cppa-risk-assessment`. The legacy
composer still ships the customer-visible body this turn — body-render
cutover is T-M6.

## Deliverables

### (a) Shadow-branch retirement
`run-cppa-risk-assessment/index.ts`:
- `LTP_MODE_BOOT` pinned to `"enforce"` (was `Deno.env.get("LTP_ENFORCE_ENABLED") === "1" ? "enforce" : "shadow"`).
- The `LTP_ENFORCE_ENABLED` gate on the Pass-1 call site is retired. Pass-1
  now runs unconditionally on every generation (budget-skip path preserved).
- Retry budget honors the CEO N=2 ruling: `maxAttempts: PASS1_MAX_ATTEMPTS`
  (previously hard-coded `1`).

### (b) Model assert
- Boot log emits `pass1_model=claude-sonnet-4-6 pass1_max_attempts=2 pass1_stamp=…`.
- `GET /?ping=1` surface adds `pass1_authoritative`, `pass1_model`,
  `pass1_max_attempts`, `pass1_stamp`.
- POST-time header `x-ltp-pass1-model-expected` asserts declared-vs-actual
  Pass-1 model; mismatch returns HTTP 409 `ltp_pass1_model_mismatch` and
  logs `ltp_pass1_model_mismatch_abort` before any generation spend.
- Pass-1 model is `claude-sonnet-4-6` via `callAnthropicWithContinuation`
  (unchanged — CEO Q3 same-model ruling).

### (c) Authoritative RenderPlan persistence
- On successful Pass-1 the RenderPlan is persisted verbatim under
  `report_data._meta.internal.render_plan` with envelope
  `{ authoritative, manifest, plan, plan_summary, telemetry, build_stamp,
    model, max_attempts, timeout_ms }`.
- Legacy shadow-preview slot `_meta.internal.legal_test_pipeline.enforce_preview`
  is retained one-release for T-M2..T-M5 back-compat.
- Whitelist serializer continues to strip `_meta.internal` from the shipped
  surface (cutover consumer T-M6 reads before serialization).

### (d) Validator gating
V1–V8 remain enforced inside `runPass1Llm` via `validateRenderPlan`
(supabase/functions/_shared/render-plan/validators.ts). Attempts with issues
are rejected within the N=2 retry budget; terminal failure surfaces as
`conservative_write_around.triggered=true` on the plan and `write_around=true`
on telemetry.

### (e) Write-around origin
The existing `safeFinalizeComposition` hook at index.ts:3506 reads
`_ltpPreview?.plan_summary?.write_around` and classifies origin as
`clock_cap` (default) or `test_forced` (magic token). Hook-audit already
allows `clock_cap` origins (Item 217 fix). Type-J reserved-judgment body
emission on the shipped surface is deferred to T-M6 body cutover — during
T-M1 the legacy composer still produces the shipped body on write-around,
with `write_around_origin` recorded on telemetry.

### (f) Clock discipline
- Wall-clock cap (15 min) and persist-first pattern unchanged (Items 202–203).
- Pass-1 per-attempt cap retained at `POST_LINT_PASS1_TIMEOUT_MS = 75000ms`.
- Total Pass-1 budget = 2 × 75s = 150s worst-case, well inside the
  post-lint LLM budget (`POST_LINT_LLM_BUDGET_MS = 300000ms`).

## Round-trip unit tests (green)

```
$ deno test --allow-env --allow-net _shared/ltp/render-plan-roundtrip.test.ts
running 2 tests from ./_shared/ltp/render-plan-roundtrip.test.ts
derive→persist round-trip: minimal intake yields JSON-stable plan ... ok (2ms)
derive→persist round-trip: authoritative envelope shape is JSON-stable ... ok (1ms)
ok | 2 passed | 0 failed (10ms)
```

## Deploy + §16 ping paste

Deployed via `supabase--deploy_edge_functions` → `run-cppa-risk-assessment`.

```
GET /run-cppa-risk-assessment?ping=1
{"fn":"run-cppa-risk-assessment",
 "build_stamp":"ltp-risk-item221-t-m1-derive-authoritative@2026-07-28T05:00:00Z",
 "ltp_mode":"enforce",
 "ltp_version":"ltp-risk-p2",
 "composition_enforce":"1",
 "persist_first_retry":"retry-budget@2026-07-27-persistfirst",
 "report_completion_gate":"final-status-and-report-data@2026-07-27-smoke-latency-rootcause",
 "post_lint_llm_budget_ms":300000,
 "post_lint_llm_call_timeout_ms":120000,
 "post_lint_pass1_timeout_ms":75000,
 "safe_finalize":"safe-finalize@2026-07-28-item217-repair-outside-guard",
 "pass1_authoritative":"1",
 "pass1_model":"claude-sonnet-4-6",
 "pass1_max_attempts":2,
 "pass1_stamp":"ltp-pass1-llm-2026-07-27-anthropic-direct"}
```

## Files touched

- `supabase/functions/run-cppa-risk-assessment/index.ts` — BUILD_STAMP,
  LTP_MODE_BOOT pin, Pass-1 authoritative wire, render_plan persist,
  ping surface fields, `x-ltp-pass1-model-expected` header assert, boot log.
- `supabase/functions/_shared/ltp/render-plan-roundtrip.test.ts` — new
  derive→persist round-trip test (2 cases, green).

## Not in scope (deferred)

- **T-M6** body cutover: Pass-2 templates producing the shipped surface.
- **Type-J reserved-judgment body** as the shipped surface on write-around
  (rides with T-M6; T-M1 records `write_around_origin` on telemetry only).
- `waveb.test.ts` line 79–81 assertions still expect
  `PASS1_MANIFEST.model.startsWith("google/")` — stale since the same-model
  ruling landed. Not touched this turn (out of dispatch scope).

## HARD STOP.
