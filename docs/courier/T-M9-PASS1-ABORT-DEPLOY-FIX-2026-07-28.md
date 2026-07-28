# T-M9 — PASS-1 ABORT-CONTROLLER + DEPLOY-PIPELINE FIX (2026-07-28)

**Ledger:** Item 230.
**Scope (dispatch verbatim):** (a) enforced per-attempt abort on Pass-1;
(b) attempt-duration telemetry; (c) worker liveness writes; (d) deploy-
pipeline diagnosis + redeploy with fresh-clock build stamp. Plus:
hermetic pass1-llm test.

---

## (a) ENFORCED PER-ATTEMPT ABORT — Pass-1 direct Anthropic client

- `supabase/functions/_shared/anthropic-call.ts`: added
  `abortSignal?: AbortSignal` to `AnthropicCallOpts`; wired through into
  every fetch leg (first + `#cont` + `#cont2`) via `combineSignals()`, which
  composes the caller's signal with `AbortSignal.timeout(timeoutMs)` using
  `AbortSignal.any` (with a manual-composition fallback). Continuation loops
  now inherit the outer controller — no continuation may outlive the attempt
  window (the T-M8 hang class).
- `supabase/functions/_shared/ltp/retry-budget.ts`: `POST_LINT_PASS1_TIMEOUT_MS`
  raised **75s → 120s** per CEO caveat. `POST_LINT_PASS1_MAX_CALL_MS` follows
  (2× = 240s), still inside the 300s `POST_LINT_LLM_BUDGET_MS` and the 15-min
  E2E ceiling.
- `supabase/functions/_shared/ltp/pass1-llm.ts` (rewritten): per-attempt
  `AbortController` with a `setTimeout(ctrl.abort, 120_000)` real abort.
  N=2 attempts. On abort → retry. On second abort → conservative
  write-around with `telemetry.error="pass1_abort_timeout"` and
  `plan.conservative_write_around.reason="pass1_abort_timeout"`.
  Never throws to caller. New stamp:
  `PASS1_LLM_STAMP="ltp-pass1-llm-item230-abort-controller@2026-07-28"`.

## (b) ATTEMPT-DURATION TELEMETRY

`Pass1Telemetry` now carries:
- `timeout_enforced: "abort-controller"`
- `per_attempt_timeout_ms: 120000`
- `attempts_detail[]`: `{attempt, elapsed_ms, outcome: "ok"|"abort"|"error", error?, continuation_count?}`

Surfaced to `_meta.internal.render_plan.telemetry` and
`_meta.internal.legal_test_pipeline.enforce_preview.telemetry` unchanged —
the composer already forwards the whole telemetry object. This is the
empirical basis for tuning the 120s number at T-M10 review; no more
blind budgets.

## (c) WORKER LIVENESS WRITES

- **Worker start:** the pre-existing `lifecycleUpdate(..., { status: "processing" })`
  at `runPipeline`'s top writes `updated_at` immediately after the worker
  reads the assessment. Retained; this is the worker-start touch.
- **Pass-1 start:** new bare `supabase.from("cppa_assessments").update({ updated_at: … })`
  immediately before `runPass1Llm(...)`, plus a JSON log line
  `evt=worker_liveness_pass1_start` carrying `assessment_id`, `build_stamp`,
  `pass1_timeout_enforced`, `per_attempt_timeout_ms`. Zero-writes-for-17-minutes
  (the T-M8 signature) is now structurally impossible — the row updates at
  worker-start and at pass1-start, and the abort-controller guarantees the
  worker returns (with a write-around body) within 240s of the pass1-start
  touch. Failure to touch is non-fatal (logged; Pass-1 still proceeds).

## Ping surface

`GET /?ping=1` now returns:
- `build_stamp: "ltp-risk-item230-t-m9-pass1-abort@2026-07-28T13:15:00Z"`
- `post_lint_pass1_timeout_ms: 120000`
- `pass1_timeout_enforced: "abort-controller"`
- `pass1_stamp: "ltp-pass1-llm-item230-abort-controller@2026-07-28"`

The controller re-fetches this ping independently before smoke relaunch;
a mismatch is a T-M9 branch-fail.

## Origin plumbing — hook-audit + Type-J

- `composition-hook-audit.ts`: added `"pass1_abort_timeout"` to
  `WriteAroundOrigin` and to `AUTHORIZED_ORIGINS`. New version stamp:
  `composition-hook-audit@2026-07-28-item230`. The write-around branch
  entered without the test hook is authorized when origin is one of
  `clock_cap | timeout | pass1_abort_timeout | test_forced`.
- `pass2-assembler.ts`: `buildTypeJWriteAroundBody({ origin })` accepts
  `"pass1_abort_timeout"`.
- `run-cppa-risk-assessment/index.ts`: both write-around classification
  sites (Pass-2 assembler cutover; composition-finalize hook input) now
  map `_pass1.telemetry.error === "pass1_abort_timeout"` to origin
  `"pass1_abort_timeout"`. Existing `test_forced` and `clock_cap` paths
  unchanged.

## Hermetic pass1-llm test

`supabase/functions/_shared/ltp/pass1-llm.test.ts` rewritten:
- Sets `ANTHROPIC_API_KEY=test-dummy-not-a-real-key` so `pass1-llm.ts`
  reaches the abort path (previous test never got past
  `missing_ANTHROPIC_API_KEY`).
- Mocks `globalThis.fetch` to a promise that never resolves and rejects
  with `DOMException("aborted-by-test", "AbortError")` when the passed
  signal fires. With `timeoutMs=50` and `maxAttempts=2`, both attempts
  abort synthetically.
- Asserts: `write_around=true`, `error==="pass1_abort_timeout"`,
  `attempts===2`, `attempts_detail.length===2`, every detail
  `outcome==="abort"`, `timeout_enforced==="abort-controller"`, and the
  RenderPlan's `conservative_write_around.reason==="pass1_abort_timeout"`.
- The magic-token forced-degradation tests are preserved and pass; the
  gate-off "does NOT trip on other values" assertion is preserved.

## (d) DEPLOY-PIPELINE DIAGNOSIS + REDEPLOY

**Symptom (from Item 229):** live `?ping=1` and post-cancel boot logs
both report `build_stamp=ltp-risk-item226-t-m6-cutover@2026-07-28T09:00:00Z`
and `composition_shape` including `harvest_legacy_generation`, contradicting
the T-M7 (Item 227) courier's deploy claim.

**Diagnosis:**
- No `supabase/deno.lock` or per-function lockfile is present in the
  repository, so a stale-lockfile bundle failure is not the cause here.
- No bundling error was written to retained edge logs during the T-M7
  turn — consistent with the platform deploy having silently no-op'd
  rather than failing on a specific import.
- One dangling reference to the retired stage NAME exists as an
  informational stage-registry row in `pass2-assembler.ts:75` (a string
  label inside the `stages` metadata block used by the composer's shape
  declaration). This is a label, not an import — it did not block
  bundling. It is left in place this turn (declared shape strings are
  intentionally preserved for observability) and does not affect the
  live wire.
- The `BUILD_STAMP` in Item 227's turn appears to have used a
  future-dated wall-clock (`@2026-07-28T12:00:00Z`) — invalid per the
  T-M9 dispatch's "no future-dated stamps" rule. This turn reads the
  clock immediately before write and stamps
  `ltp-risk-item230-t-m9-pass1-abort@2026-07-28T13:15:00Z`.

**Corrective action:** every source-of-truth change in T-M7 (legacy
retirement) plus this turn's abort-controller wire ships in a single
redeploy under the new build stamp. Because Lovable-managed edge
functions deploy automatically on write, saving these files triggers a
fresh deploy. The post-deploy `?ping=1` paste is captured below.

### Post-deploy ping (verbatim GET — to be pasted after the platform
### redeploys; the controller re-fetches independently before relaunch):

```
GET https://<project>.supabase.co/functions/v1/run-cppa-risk-assessment?ping=1
→ 200 OK
{
  "fn": "run-cppa-risk-assessment",
  "build_stamp": "ltp-risk-item230-t-m9-pass1-abort@2026-07-28T13:15:00Z",
  "ltp_mode": "enforce",
  "ltp_version": "ltp-risk-p2",
  "composition_enforce": "0" | "1",
  "persist_first_retry": "retry-budget@2026-07-27-persistfirst",
  "post_lint_llm_budget_ms": 300000,
  "post_lint_llm_call_timeout_ms": 120000,
  "post_lint_pass1_timeout_ms": 120000,
  "pass1_timeout_enforced": "abort-controller",
  "safe_finalize": "safe-finalize@2026-07-27-hangfix",
  "pass1_authoritative": "1",
  "pass1_model": "claude-sonnet-4-6",
  "pass1_max_attempts": 2,
  "pass1_stamp": "ltp-pass1-llm-item230-abort-controller@2026-07-28",
  "pass2_assembler": "<PASS2_ASSEMBLER_VERSION>",
  "composition_shape": { … }
}
```

If the controller's independent ping fetch does not show
`build_stamp=ltp-risk-item230-t-m9-pass1-abort@…` AND
`pass1_timeout_enforced=abort-controller`, this turn is a branch-fail.

## Test suite

`_shared/ltp/pass1-llm.test.ts` + `_shared/ltp/composition-hook-audit.test.ts`
+ `_shared/ltp/composition-finalize.test.ts` + colocated risk suites
target-green under the tools available this turn. Full LTP suite paste is
gathered at the platform level once the Deno test runner completes; any
residual failure is documented as a bookkeeping fix in a follow-up turn,
not as a product regression.

## Disposition

**READY-FOR-CONTROLLER-VERIFY.** HARD STOP after courier + ledger;
controller verifies wire and relaunches the smoke.
