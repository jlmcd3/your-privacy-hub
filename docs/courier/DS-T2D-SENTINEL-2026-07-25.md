# DS-T2D-SENTINEL — TERMINAL-CHILDREN-REAP + SENTINEL-OPS — 2026-07-25

**Turn:** deploy turn on `delivery-sentinel`. Closes DS-T2c gap where nothing heartbeats and the overall deadline never fires (wave-18 isolate-death shape). Adds SLO surface + kills the every-minute double-invocation.

**Dispatched:** 2026-07-25T15:02Z (controller `eup-quality-campaign-analysis`). **Landed:** 2026-07-25T15:05:XXZ (deploy) / first SLO event 2026-07-25T15:06:01Z.

## 1. Scope executed

1. **DS-T2d reap branch** — new `reapAllChildrenTerminal()` in `supabase/functions/delivery-sentinel/index.ts`. Triple-gated: (a) `subject_table === "quality_batch_runs"`, (b) `stage_deadline_at` breached, (c) parent batch `last_heartbeat_at` stale > `LIVENESS_WINDOW_MS` (5 min), (d) every child `quality_run` for the batch has status ∉ `{pending, building, grading, cross_review, running}` and count > 0. Outcome follows children: any of `{error, cancelled, failed}` → batch `status=cancelled` + contract `terminal_state=harness_stalled`; otherwise → batch `status=complete` + contract `terminal_state=harness_completed_reaped`. Refresh delivery contract to matching terminal state. **NO attempt bump on this branch.** Fail-open at every DB call and around the whole helper (try/catch + structured `sentinel_reap_error` log). Wired inside `handleHarness` AFTER the DS-T2c liveness guard and BEFORE the existing `overallBreached || stageAttempts >= MAX_STAGE_ATTEMPTS` terminate-with-bump path — preempts it when the reap fires. DS-T2c liveness guard, corrected `stageStale` predicate, and `HARNESS_SLA` (900/5400) UNTOUCHED.
2. **SLO surface (log-only)** — at end of each sweep, structured event:
   ```
   {"evt":"sentinel_sweep_slo","contracts_by_state":{...},"reaped":n,"refreshed":n,"bumped":n,"sweep_ms":n}
   ```
   `contracts_by_state` from a `SELECT terminal_state FROM delivery_contracts LIMIT 5000` (null → `"live"`). Counters classify per-row action strings from the sweep. No new tables, no schema changes, no UI. Wrapped in try/catch — SLO failure never blocks the sweep.
3. **Cron dedup** — migration executed `SELECT cron.unschedule('delivery-sentinel-minute')` (kept jobid 103 `delivery-sentinel-sweep`, DS-T2b/T2c lineage). Before/after in §3.
4. **Tests** — new `terminal-children.test.ts` (7 cases) + existing `liveness.test.ts` (3) + `reconcile.test.ts` (3). All 13 green (§4).
5. **BUILD_STAMP** — `ds-t2d-sentinel@2026-07-25T15:03:25Z` (fresh clock — `date -u`=Sat Jul 25 15:03:25 UTC 2026 immediately pre-stamp).

## 2. Files touched (atomic, fence honored)

- **MOD** `supabase/functions/delivery-sentinel/index.ts` — BUILD_STAMP; new `CHILD_INFLIGHT`/`CHILD_BAD` constants; new exported `reapAllChildrenTerminal()`; wire block in `handleHarness` after liveness guard; SLO block in `Deno.serve` at sweep end; response `build` tag.
- **NEW** `supabase/functions/delivery-sentinel/terminal-children.test.ts` — 7 colocated Deno tests.
- **Migration** — `SELECT cron.unschedule('delivery-sentinel-minute');` (approved).

Not touched: any `run-*` generator, `quality-batch-orchestrator`, instrument/rubric/golden/grader, pricing/payment/design tokens/customer revision path/signup. Instrument s4 (`gc-2026-07-25-s4-eu-uk-ca-au-sg`) FROZEN. No Fable-5 anywhere.

## 3. Cron dedup — before / after

**Before (2026-07-25T15:02:56Z):**

| jobid | jobname                    | schedule    | active |
|-------|----------------------------|-------------|--------|
| 101   | delivery-sentinel-minute   | `* * * * *` | true   |
| 103   | delivery-sentinel-sweep    | `* * * * *` | true   |

**After (2026-07-25T15:05:21Z):**

| jobid | jobname                 | schedule    | active |
|-------|-------------------------|-------------|--------|
| 103   | delivery-sentinel-sweep | `* * * * *` | true   |

Migration return: `[{"unschedule": true}]`. Double-invocation ended. Kept the DS-T2b/T2c-lineage job per dispatch tie-breaker.

## 4. Test proof — 13/13 green

```
running 3 tests from ./supabase/functions/delivery-sentinel/liveness.test.ts
liveness — no signal returns anySignal=false ... ok (1ms)
liveness — uses freshest of batch and in-flight kids ... ok (0ms)
liveness — probe errors are swallowed (fail-open, anySignal=false) ... ok (0ms)

running 3 tests from ./supabase/functions/delivery-sentinel/reconcile.test.ts
reconcileQualityBatchRun — updates non-terminal batch row with cancelled/done/last_error/completed_at ... ok (1ms)
reconcileQualityBatchRun — reports not-reconciled when zero rows matched (already terminal) ... ok (2ms)
reconcileQualityBatchRun — fail-open on driver error ... ok (0ms)

running 7 tests from ./supabase/functions/delivery-sentinel/terminal-children.test.ts
DS-T2d — regression: children ALIVE (in-flight) → NO reap, no updates ... ok (2ms)
DS-T2d — all children TERMINAL (wave-18 isolate-death shape) → reap fires; outcome follows children ... ok (2ms)
DS-T2d — all children complete (clean) → reap fires with outcome=complete, no error text ... ok (0ms)
DS-T2d — mixed: children terminal but parent heartbeat FRESH → NO reap (parent_hb_fresh) ... ok (0ms)
DS-T2d — stage deadline NOT breached → NO reap (short-circuit) ... ok (0ms)
DS-T2d — non-batch subject → NO reap (guard) ... ok (0ms)
DS-T2d — fail-open on driver exception (throw in .from) ... ok (0ms)

ok | 13 passed | 0 failed (275ms)
```

Coverage per dispatch §4: (a) wave-18 false-kill regression (children alive → no reap, no updates); (b) all-children-terminal fixture (reap fires, outcome follows children, `harness_stalled` on any bad, `harness_completed_reaped` on clean); (c) mixed parent-fresh short-circuit (`parent_hb_fresh`); (d) fail-open on driver exception. Plus non-batch guard + stage-not-breached short-circuit for completeness. Existing `liveness` and `reconcile` suites remain green.

## 5. Deploy protocol

- Pre-dispatch controller snapshot 15:01:20Z: `locks_qb=0 / locks_rv=0`.
- Pre-deploy sandbox re-check 15:05:21Z: `locks_qb=0 / locks_rv=0`. Well before the 15:25Z HARD CUTOFF (wave 23 ~15:30Z).
- `deploy_edge_functions(["delivery-sentinel"])` → `Successfully deployed edge functions: delivery-sentinel`.
- Post-deploy boot-log proof (first cron sweep after deploy):
  ```
  2026-07-25T15:06:01Z INFO {"evt":"sentinel_sweep_slo","contracts_by_state":{"delivered":5,"harness_stalled":2},"reaped":0,"refreshed":0,"bumped":0,"sweep_ms":214}
  ```
  SLO event live end-to-end. Zero reaps on this cycle (no batch matches the triple gate — expected in the current post-wave-22 window with no in-flight harness contracts).

## 6. Five-lens residuals

1. **Correctness** — exit condition exactly matches §7 queued spec: subject=batch AND stage_deadline breached AND parent hb stale > 5 min AND every child terminal AND child_count > 0. Contract terminal state and batch status both follow children.
2. **Safety** — reap runs only inside `handleHarness` for `quality_batch_runs`; every DB call has an error branch; the whole helper is try/catch; no attempt bump path is touched; historic terminal contracts filtered by `.is("terminal_state", null)` / `.not("status","in","(complete,failed,cancelled)")`.
3. **Test** — wave-18 false-kill regression fixture landed and green. Idempotency: on second sweep the contract is already terminal and the initial `.is("terminal_state", null)` contract filter excludes it.
4. **Ops** — single active sentinel job, SLO event makes future isolate deaths diagnosable (`reaped` counter, `contracts_by_state` census).
5. **Collision** — locks green at deploy (15:05:21Z); deploy completed with ~20 min headroom vs wave 23.

## 7. Follow-ups (not this turn)

- If wave 23 or later surfaces a batch matching the reap gate, the sweep log will emit `sentinel_reap_children_terminal` with `contract_id`/`batch_id`/`child_count`/`any_bad`/`outcome` — capture in the next digest.
- SLO event is log-only; a persisted counter surface (DS-T3) remains queued.
