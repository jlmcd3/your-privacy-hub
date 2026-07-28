# T-M9.1 — BACKGROUND-DEATH DIAGNOSTIC + FAIL-LOUD FIX

**Date.** 2026-07-28T08:27:33Z
**Ledger.** Item 231
**Build.** `ltp-risk-item231-t-m9.1-fail-loud@2026-07-28T08:27:33Z`
**Scope.** `supabase/functions/run-cppa-risk-assessment/index.ts` only. No grader edits, no batch inserts.

## Evidence pulled (edge-function logs, 08:22–08:26Z, assessment b432e65e)

Verbatim relevant lines:

```
08:26:04Z INFO {"evt":"worker_liveness_pass1_start","fn":"run-cppa-risk-assessment","assessment_id":"b432e65e-2742-480b-858d-852e665a257d","build_stamp":"ltp-risk-item230a-t-m9-redeploy@2026-07-28T08:16:03Z","pass1_timeout_enforced":"abort-controller","per_attempt_timeout_ms":120000}
08:26:04Z INFO {"evt":"run_meter_recorded","tool":"cppa_risk_assessment","assessment":"b432e65e-2742-480b-858d-852e665a257d","version":1}
08:24:04Z WARN post_gen_violation (T-2 / T-5 / risk-adaptive-standard-authoring) on first callModel output
08:24:04Z INFO [cppa-risk v4] generation total 120611ms stop=end_turn
08:26:04Z ERROR [generate-v4-retry] stage=callAnthropic ABORT elapsed=120003ms limit=120000ms outer_aborted=false
08:26:04Z WARN post_gen_retry_failed_preserve_first_doc reason=threw error=generation_timeout_330s
```

The platform does NOT surface a discrete uncaught-exception line for background tasks that die via unhandled rejection inside `EdgeRuntime.waitUntil`; that class of death is silent on retained logs.

## Correction to the controller failure hypothesis

Contra dispatch: `worker_liveness_pass1_start` DID fire at 08:26:04Z, ~4 minutes after the `processing` write at 08:22:03Z. The isolate was not dead in that window; it was executing the legitimate slow path (`retrieveCorpusContext` → deadline block → first `callModel` at ~2 min → post-gen scrub → `generate-v4-retry` `callModel` aborting at 120 s). No DB touches happen anywhere on that path, so `updated_at` remained frozen and the harness could not distinguish "slow" from "dead". Controller cancellation at 08:24:40Z updated the DB row externally but did not signal the isolate.

The Pass-1 abort-controller from item230a is present and correct; it just doesn't guard the `callModel` legs earlier in the pipeline.

## Crash-point analysis (index.ts)

Between `runPipeline`'s `processing` write (~L928) and `worker_liveness_pass1_start` (~L3499) there is no DB liveness touch. Grep-verified: no stale import of any T-M7-retired symbol survives in the early generation path. The T-M6 and item230a builds share this liveness-gap; both produce the same visible signature (frozen `updated_at`, `last_error=NULL`) — not because of a stale-import crash, but because of the gap itself plus the absence of a fail-loud persist on background-isolate exit.

## Fix landed

1. **Worker-start liveness touch.** `runPipeline` now writes `updated_at` and logs `evt=worker_liveness_start` IMMEDIATELY after the `processing` write and BEFORE any slow work. Non-fatal on failure.
2. **Fail-loud background catch.** `EdgeRuntime.waitUntil(wrapped)` now, on any uncaught throw in `runPipeline` (and when the row is not already `complete`), persists `status='error'` + `last_error='background_task_uncaught: <msg>'` + `updated_at` to `cppa_assessments` BEFORE calling `failFunctionRun`. Wrapped in its own try/catch so a DB failure on the error-persist path cannot re-throw and defeat the guarantee. Silent background-isolate death is now structurally impossible.
3. **Build stamp restamped fresh-clock; EXPLICIT deploy** via `supabase--deploy_edge_functions` (standing law from Item 230 addendum).

## Post-deploy ping (verbatim, this turn)

```
GET /run-cppa-risk-assessment?ping=1 → 200
{
  "build_stamp": "ltp-risk-item231-t-m9.1-fail-loud@2026-07-28T08:27:33Z",
  "composition_enforce": "1",
  "composition_shape": {
    "final_documents_per_assessment": 1,
    "intermediate_artifacts": [
      "render_plan (authoritative)",
      "assembler_output (shipped body; harvests are deterministic)"
    ],
    "llm_calls_per_document": [
      { "model_role": "pass1_derive", "role": "authoritative RenderPlan derive", "stage": "pass1_derive" }
    ],
    "note": "CEO ruling 2026-07-28: undeclared drift aborts; declared shape is the conformance target.",
    "product": "cppa-risk-assessment",
    "version": "cppa-risk-shape@2026-07-28-tm7-retirement"
  },
  "fn": "run-cppa-risk-assessment",
  "ltp_mode": "enforce",
  "ltp_version": "ltp-risk-p2",
  "pass1_authoritative": "1",
  "pass1_max_attempts": 2,
  "pass1_model": "claude-sonnet-4-6",
  "pass1_stamp": "ltp-pass1-llm-item230-abort-controller@2026-07-28",
  "pass1_timeout_enforced": "abort-controller",
  "pass2_assembler": "ltp-pass2-assembler-2026-07-28-tm6",
  "persist_first_retry": "retry-budget@2026-07-27-persistfirst",
  "post_lint_llm_budget_ms": 300000,
  "post_lint_llm_call_timeout_ms": 120000,
  "post_lint_pass1_timeout_ms": 120000,
  "report_completion_gate": "final-status-and-report-data@2026-07-27-smoke-latency-rootcause",
  "safe_finalize": "safe-finalize@2026-07-28-item217-repair-outside-guard"
}
```

## Disposition

READY-FOR-CONTROLLER-WIRE-VERIFY-AND-RELAUNCH. HARD STOP.
