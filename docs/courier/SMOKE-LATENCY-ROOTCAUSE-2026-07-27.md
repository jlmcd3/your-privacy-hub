# SMOKE-LATENCY ROOTCAUSE COURIER — 2026-07-27T16:25Z

**Ledger item:** 203. **Build stamp:** `ltp-risk-smoke-latency-rootcause@2026-07-27T16:25:46Z`.
**Functions:** `run-cppa-risk-assessment`, `run-quality-batch`, `reap-stuck-generations`.

## 1. MEASUREMENT-VALIDITY HOLE — ANSWER

The rejected persist-early tree wrote `cppa_assessments.report_data` immediately after initial parse validation, before post-gen-lint retry, forward-path retry, CoT-leak retry, LTP Pass-1, `safeFinalizeComposition`, the whitelist serializer, and the terminal `complete` write.

Therefore **yes**: downstream code could mutate `report_data` after the harness could observe a present `report_data`. That means the graded surface was timing-dependent and could bypass composition-enforce artifacts. The deployed fix is invalid as a completion mechanism.

**Chosen fix:** final-only completion surface. The pre-final snapshot write was removed. `report_data` is now written only at `terminal_complete`, after composition-finalize and serializer. The quality harness also treats `status='complete'` with null `report_data` as an error, not a gradable document.

## 2. ORDERED EVIDENCE — 11:28–11:50Z

Edge-function log pulls for `run-cppa-risk-assessment` with `6992d6e0…` and `post_gen_lint` returned **no edge log lines** for the isolate window. The recoverable evidence is database telemetry:

```text
11:28:03.047Z  function_runs db44484b… status=running, metadata.assessment_id=6992d6e0…
11:32:03.425Z  function_runs 69509878… event=post_gen_lint, fallback_applied=true,
                residual_leaks=0, residual_resolved_asks=3, retry_within_budget=true
11:33:07.022Z  quality poller isolate 1 hits 300s poll deadline; self-reinvokes
11:38:10.561Z  quality poller isolate 2 hits 300s poll deadline; self-reinvokes
11:43:14.838Z  quality poller isolate 3 hits 300s poll deadline; self-reinvokes
11:48:04.743Z  quality poller isolate 4 hits 287s poll deadline; self-reinvokes
11:48:05.278Z  quality_run #155 fails doc: generator did not reach terminal state within 1202s
11:48:05.444Z  quality_run #155 terminal error: No documents completed
11:50:03.514Z  reaper marks function_runs db44484b… error; duration_ms=1,320,467
```

No recovered log line names a single consuming step. The concrete evidence is a silent post-lint span after `retry_within_budget=true`. The root class is post-lint clock spend without hard latest-start and per-call bounds.

## 3. ROOT FIX — CLOCK CONTRACT

The generator now enforces a 15-minute E2E budget with a 5-minute margin inside the 20-minute harness watchdog:

- retries refused past 4 minutes elapsed;
- 3-minute reserve held for finalize + serializer + persist;
- post-lint LLM calls refused at/after 5 minutes elapsed;
- allowed post-lint LLM calls are per-call timeout bounded;
- Pass-1 enforce preview is skipped over budget and limited to one bounded attempt when allowed.

## 4. INVOCATION-STATUS SEMANTICS

A function invocation that has already persisted a completed document must not be finalized as `error` solely because telemetry cleanup or a later catch path runs. `run-cppa-risk-assessment` now checks the source assessment before calling the error finalizer. `reap-stuck-generations` similarly recovers stuck `function_runs` to success if the referenced assessment is already complete with `report_data`.

## 5. SPEC-WRITEBACK

`docs/design/LEGAL-TEST-PIPELINE.md §30` now states the measurement-valid persistence law: no pre-final document may be exposed on the harness completion surface unless it is fully finalized or explicitly non-completing.

## 6. REGRESSION TESTS

`_shared/ltp/retry-budget.branch-correction.test.ts` covers the clock contract, including the new construction check that latest-start budget + max post-lint LLM call + reserve fits under the 15-minute E2E ceiling. Verified in sandbox: **7/7 green**.

## 7. DEPLOY + §16 PING-PROVE

Deployed `run-cppa-risk-assessment`, `run-quality-batch`, and `reap-stuck-generations`.

GET `run-cppa-risk-assessment?ping=1` returns:

```json
{
  "build_stamp": "ltp-risk-smoke-latency-rootcause@2026-07-27T16:25:46Z",
  "composition_enforce": "1",
  "fn": "run-cppa-risk-assessment",
  "ltp_mode": "enforce",
  "ltp_version": "ltp-risk-p2",
  "persist_first_retry": "retry-budget@2026-07-27-persistfirst",
  "post_lint_llm_budget_ms": 300000,
  "post_lint_llm_call_timeout_ms": 120000,
  "post_lint_pass1_timeout_ms": 75000,
  "report_completion_gate": "final-status-and-report-data@2026-07-27-smoke-latency-rootcause",
  "safe_finalize": "safe-finalize@2026-07-27-hangfix"
}
```

No `persist_early_snapshot` key remains.

## 8. DISPOSITION

**READY-FOR-RELAUNCH. HARD STOP.** Smokes #153, #154, and #155 remain non-evidential; §22.1 clean-arm counter remains **0/3 for `cppa-risk`**.