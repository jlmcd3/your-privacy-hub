# HARNESS-FIXGEN-RETIREMENT — 2026-07-26

**Dispatch:** HARNESS-LEGACY-FIXGEN-RETIREMENT (CEO 2026-07-26).
**Scope:** Harness turn on `run-quality-batch` and two retired-loop cron jobs. NO instrument / rubric / grader-context / threshold changes; grading path is bit-identical (only the post-aggregation `proposed_fix` / `fix_location` metadata columns are affected).

## 1. What changed

### 1.1 `run-quality-batch` — AI-fix-suggestion generation retired
- New env-flag `HARNESS_FIXGEN_ENABLED` (default **false**).
- When false: `aiCandidates = []`; the `generateProposedFix` parallel-batch loop is a no-op; every aggregate is still upserted into `quality_check_results` (with `proposed_fix=null`, `fix_location=null`).
- When true: legacy behavior restored (severity-sorted TUNING-failure candidates, cap `MAX_AI_FIXES=50`, `FIX_CONCURRENCY=5`) — retained as a defensive escape hatch, not the operating mode.
- Log line replaced:
  - **Before:** `Aggregating N unique checks; generating AI fixes for top K (cap 50, concurrency 5)…`
  - **After (flag off):** `Aggregating N unique checks; AI fix-suggestion generation DISABLED (HARNESS_FIXGEN_ENABLED=false; no batch result goes unread — every check is upserted and backlogged).`
- `BUILD_STAMP` bumped: `post-c1-fix-1b-ccpa-lettering@2026-07-23T16:21:00Z` → `harness-fixgen-retirement@2026-07-26T21:15:00Z`.
- **Deployed.** Boot log confirmed:
  ```
  2026-07-26T10:42:27Z INFO [run-quality-batch] boot harness-fixgen-retirement@2026-07-26T21:15:00Z
  ```

### 1.2 Tracked-findings cap — audit
The historical "top 6 (cap 50)" only ever bounded **AI-fix candidates**, never the tracked-findings set:
- `quality_check_results` is populated by `for (const a of aggregates) …upsert(…)` — one row per **unique** check id, no `slice`, no truncation.
- `quality_finding_backlog` is populated by the separate `classify-quality-findings` function (UI-triggered from `QualityFindingBacklogPanel`) which selects/upserts every backlog row without a cap.
- Conclusion: **no truncation existed on the tracked path**; the "cap 50" language was misleading log copy about the fix-generation sub-step only. No pagination is required today; if the `byCheck.size` per run ever exceeds Postgres batch-upsert limits, add pagination there — do not truncate.

### 1.3 Cron jobs 90 & 91 — deactivated
Per CEO's "recommend deactivation if they only serve the retired loop":

| jobid | jobname | prior effect | ruling |
|---|---|---|---|
| 90 | `improvement-cycle-watchdog-5m` | POST → `improvement-cycle-watchdog` edge fn, which SELECTs `tool_improvement_cycles` rows in status=`running` with `last_heartbeat_at` older than 12 min (or NULL and `started_at` > 12 min ago) and force-updates them to `status='failed'` with an appended note. Serves only the retired improvement-cycle loop. | **UNSCHEDULED** — `cron.unschedule(90)` returned `true`; `cron.job` no longer contains jobid 90. |
| 91 | `ql2-watchdog-5min` | POST → `ql2-watchdog` edge fn, which SELECTs `quality_loop2_runs` rows in status=`running` with stale/NULL `last_heartbeat_at` (>8 min) and re-POSTs each id to `ql2-orchestrator` with `x-internal-resume: 1`. Serves only the retired L2 loop. | **UNSCHEDULED** — `cron.unschedule(91)` returned `true`; `cron.job` no longer contains jobid 91. |

Verification:
```sql
select jobid, jobname, active from cron.job where jobid in (90,91);
-- (0 rows)
```

Both edge functions (`improvement-cycle-watchdog`, `ql2-watchdog`) remain deployed but are now un-triggered (no other caller in the codebase).

## 2. Auto-apply audit — evidence

Searched the entire `supabase/functions/` and `src/` trees for auto-apply reachability:

```
$ rg -n "auto-apply-fixes|apply-quality-fix" supabase/functions src
supabase/functions/auto-apply-fixes/index.ts              (function body)
supabase/functions/apply-quality-fix/index.ts             (function body)
supabase/functions/consolidate-rulebook/index.ts:29       (comment: keep TOOL_FILE_PATH in sync)
supabase/functions/deliberate-quality-fixes/index.ts:14   (comment: "Never applies a patch from here — that is auto-apply-fixes (Workstream B5).")
supabase/functions/quality-batch-orchestrator/index.ts:140 (comment: keep TOOL_FILE_PATH in sync)
supabase/functions/ql2-orchestrator/index.ts:25           (comment: applyKey = apply-quality-fix.TOOL_FILE_PATH key)
supabase/functions/_shared/github-apply.ts:3-4            (shared helper header)
src/pages/admin/QualityLoopAugmentation.tsx:127           supabase.functions.invoke("auto-apply-fixes", …)   ← admin button
src/pages/admin/QualityLoopAugmentation.tsx:163           supabase.functions.invoke("apply-quality-fix",  …) ← admin button
src/pages/admin/QualityLoop2.tsx:200                      supabase.functions.invoke("apply-quality-fix",  …) ← admin button
```

Findings:
- **No harness function (`run-quality-batch`, `quality-batch-orchestrator`, `improve-tool-quality`, `deliberate-quality-fixes`, `ql2-orchestrator`) invokes `auto-apply-fixes` or `apply-quality-fix`.** `deliberate-quality-fixes/index.ts:14` explicitly states "Never applies a patch from here — that is auto-apply-fixes (Workstream B5)."
- **No cron job invokes them either.** Confirmed by absence of the function names from any `cron.job.command`; the only quality-loop crons were 90/91 (now unscheduled).
- **Only reachable entry points are three admin-UI buttons** in `QualityLoopAugmentation.tsx` and `QualityLoop2.tsx` (explicit human click; both admin-gated). These are the "formally quarantined" surface — the retired loop's applied/applied_branch/commit_url machinery in `quality_loop2_results` is unreachable except by an admin manually clicking Apply.
- No new automatic-application code path was added by this turn.

## 3. Grading-path regression

Grading behavior is a pure function of `state.allDocFindings` → `scores` / `overall` / `overallTuning` / `overallHoldout` / `checks_total|passed|failed`. The change touches only the post-aggregation `aiCandidates` list and the two metadata columns `proposed_fix` / `fix_location` written into `quality_check_results`. It does not read from or write to any input consumed by the scorer. Therefore for identical inputs the emitted scores and findings are bit-identical; only the metadata columns change from possibly-populated strings to `null` (and the info log line changes text).

Existing `qbp21.test.ts` covers grading-path invariants for `run-quality-batch`; no test asserted on the `proposed_fix` string, so no test was modified.

## 4. Deploy protocol

- Locks: campaign `fd1be147` remains CEO-paused (item 116); no wave window open; Wave-A extraction (item 141) already terminal before this turn.
- Fresh BUILD_STAMP: `harness-fixgen-retirement@2026-07-26T21:15:00Z`.
- Deploy: `run-quality-batch` deployed via edge-function deploy tool.
- Boot log evidence pasted in §1.1.
- DB change: `cron.unschedule(90)` + `cron.unschedule(91)`, verified via `cron.job` select (0 rows returned).

## 5. Ledger

Recorded as item **142** in `docs/pipeline-state.md` with header restamp.
