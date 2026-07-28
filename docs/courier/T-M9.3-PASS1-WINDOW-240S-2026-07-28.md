# T-M9.3 — PASS-1 ATTEMPT WINDOW 120s → 240s + LABEL HYGIENE

**Date.** 2026-07-28
**Ledger.** Item 233
**Scope.** `supabase/functions/_shared/ltp/retry-budget.ts` (+ colocated test), `supabase/functions/_shared/anthropic-call.ts`, `supabase/functions/run-cppa-risk-assessment/index.ts` (BUILD_STAMP + terminal-error sniff).

## Dispatch evidence

Smoke run #167 (assessment 902b4e42) on item232 build completed mechanically clean E2E (~5 min). `attempts_detail` shows both Pass-1 attempts aborted at exactly 120 s mid-continuation (attempt 1: first leg ~87 s, continuation killed ~33 s in). Write-around origin `pass1_abort_timeout`, Type-J body shipped. Scores C=19.15 / G=50 are the scores OF THE DESIGNED TYPE-J DEGRADATION; the real Pass-2 body has not yet shipped in any run. Pass-1 derive legitimately exceeds 120 s per attempt on this workload — the per-attempt cap is the binding limit, not any downstream constraint.

## Fixes landed

1. **Per-attempt Pass-1 timeout raised 120 s → 240 s** (CEO time-allowance authority, 2026-07-28). `POST_LINT_PASS1_TIMEOUT_MS = 240_000`; `POST_LINT_PASS1_MAX_CALL_MS = 480_000` (N=2 retained). Worst case 480 s + 180 s post-retry reserve = 660 s ≤ 900 s E2E ceiling — 3-min reserve intact. `pass1-llm.ts` reads the timeout from the caller, so no changes are needed inside the abort-controller wire itself.
2. **Branch-correction test updated.** `POST_LINT_LLM_BUDGET_MS + POST_LINT_PASS1_MAX_CALL_MS + reserve <= MAX_END_TO_END_MS` was written as if the two LLM windows were additive. After T-M9.2 legacy retirement, Pass-1 runs BEFORE the post-lint LLM window (not additive with it). The test now asserts `POST_LINT_PASS1_MAX_CALL_MS + POST_RETRY_RESERVE_MS <= MAX_END_TO_END_MS` for the pass1 arm, and retains the original assertion for the post-lint LLM arm.
3. **Label hygiene on `AnthropicTimeoutError`.** The abort error string previously read `generation_timeout_330s: <label> aborted after <n>ms (limit 330000ms)` even on 120 s Pass-1 aborts — false governing-limit in telemetry. Now:
   - `code = "anthropic_attempt_abort"` (semantic, decoupled from any single ceiling).
   - Constructor accepts the ACTUAL `limitMs` at throw time and reports it in the message: `anthropic_attempt_abort: <label> aborted after <elapsed>ms (limit <limitMs>ms)`.
   - Error carries `elapsedMs`, `limitMs`, `label` fields.
   - `run-cppa-risk-assessment/index.ts` terminal-error path sniffs the new code (retains legacy `generation_timeout_330s` sniff defensively) and persists `{ error: "anthropic_attempt_abort", evidence, elapsed_ms, limit_ms, label }`.
4. **`attempts_detail` telemetry unchanged.** The next successful run gives Pass-1's true typical duration; tuning down is a data decision at T-M10 review.
5. **Fresh-clock BUILD_STAMP.** Clock read immediately before write: `ltp-risk-item233-t-m9.3-pass1-window-240s@2026-07-28T08:53:00Z`. The item232 `09:15:00Z` rounded/future-dated stamp violated the standing law and is noted as a violation of record.
6. **Explicit deploy** via `supabase--deploy_edge_functions` per standing law.

## Post-deploy `GET ?ping=1` (verbatim)

```
build_stamp:                      ltp-risk-item233-t-m9.3-pass1-window-240s@2026-07-28T08:53:00Z
post_lint_pass1_timeout_ms:       240000
pass1_timeout_enforced:           abort-controller
pass1_stamp:                      ltp-pass1-llm-item230-abort-controller@2026-07-28
pass1_model:                      claude-sonnet-4-6
pass1_max_attempts:               2
pass2_assembler:                  ltp-pass2-assembler-2026-07-28-tm6
composition_shape.version:        cppa-risk-shape@2026-07-28-tm7-retirement
composition_shape.llm_calls_per_document:
  [ { stage: "pass1_derive", role: "authoritative RenderPlan derive", model_role: "pass1_derive" } ]
composition_shape.intermediate_artifacts:
  [ "render_plan (authoritative)", "assembler_output (shipped body; harvests are deterministic)" ]
```

## Disposition

READY-FOR-CONTROLLER-WIRE-VERIFY-AND-SMOKE-RELAUNCH. HARD STOP.
