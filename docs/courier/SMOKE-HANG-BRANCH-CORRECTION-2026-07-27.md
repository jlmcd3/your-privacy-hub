# SMOKE-HANG BRANCH-CORRECTION COURIER — 2026-07-27T16:20Z

**Ledger item:** 202. **Build stamp:** `ltp-risk-smokehang-branch-correction@2026-07-27T16:20:00Z`.
**Function:** `run-cppa-risk-assessment` only. Scope: authoring + deploy + §16 ping-prove.

## 1. FOURTH-OUTCOME PROBLEM STATEMENT (controller, 15:53Z)

Smoke #155 (assessment `6992d6e0…`) landed a document at 11:50:03Z — **PERSIST-EARLY WORKED** and `residual_leaks` dropped 1→0. But the harness had already watchdog-reaped the run at 11:48Z ("No documents completed") because the document landed **2 minutes after the 20-minute ceiling**. Invocation row finalized `status=error` at 22:00 (11:28:03 → 11:50:03). The document is an orphan; non-evidential; §22.1 counter untouched. Neither BRANCH PASS nor BRANCH FAIL fits.

## 2. LOG PULL — post_gen_lint (11:32:03) → persist (11:50:03) = 18 min

`supabase.edge_function_logs('run-cppa-risk-assessment')` for the 11:28-11:50Z window: **no logs recovered for that isolate window** (mirrors prior turn — flush window and isolate death race make this consistent, not new signal). The 22-minute apparent lifetime is an artifact of the reaper writing the terminal error row long after the isolate itself died. Real isolate lifetimes on this codepath are bounded by the platform ceiling (empirically ≤ ~330-400s under this workload) and interlocking self-reinvocation.

Behavioral timeline reconstructed from `function_runs`/`quality_runs`/`cppa_assessments`:

- 11:28:03 — generation start (post-deploy).
- 11:32:03 — `post_gen_lint` fires: `fallback_applied=true`, `residual_leaks=0`, `residual_resolved_asks=3`, `retry_within_budget=true`. Elapsed ≈ 240s.
- 11:32:03 → 11:48:05 — silence. Suspects (in order of empirical fit): (a) an LLM retry launched inside the last ~90s of wall-clock and blew the isolate — Promise.race resolves for the deadline but the underlying fetch keeps the isolate busy; (b) sequential post-lint guards (FORWARD PATH retry, CoT-leak retry, LTP Pass-1 enforce preview) each drew fresh LLM budget the runtime did not have; (c) prior turn's `AbortController` did not cancel the underlying `callModel` fetch because that path is not `signal`-aware.
- 11:48:05 — watchdog reap of `quality_runs` #155.
- 11:50:03 — a later isolate (self-reinvocation / poll boundary) completes finalize and writes `report_data`. Too late; run already dead.

## 3. FIX AT ROOT — HARD CLOCK CONTRACT

**Contract (CEO-invariant):** total post-lint work (retry + finalize + persist) MUST complete inside a hard budget that keeps end-to-end generation under **15 minutes** worst-case — comfortably inside the 20-min harness reap. A retry that cannot fit is **SKIPPED** with the first doc persisted immediately (persist-first already guarantees the doc; this now guarantees the CLOCK).

Concrete changes:

- `supabase/functions/_shared/ltp/retry-budget.ts` — constants realigned to empirical reality: `ISOLATE_CEILING_MS = MAX_END_TO_END_MS = 900_000` (15 min E2E budget), `POST_RETRY_RESERVE_MS = 180_000` (3 min for finalize + serializer + persist observed on cold paths), `MAX_ELAPSED_FOR_RETRY_MS = 240_000` (4 min hard elapsed cap on ANY retry decision, regardless of caller's threshold). New `POST_LINT_LLM_BUDGET_MS = 300_000` and `hasBudgetForPostLintLLM(elapsedMs)` helper for the non-retry post-lint LLM guards.
- `computeRetryBudget` clamps caller's `elapsedThresholdMs` to `MAX_ELAPSED_FOR_RETRY_MS`; keeps `wall_clock_insufficient` and `elapsed_budget_exceeded` reason codes.
- `supabase/functions/run-cppa-risk-assessment/index.ts` — **PERSIST-EARLY MOVED UP**. Snapshot now fires immediately after `parsed` validation (line ~999), BEFORE post-gen-lint / retries / forward-path / CoT-leak / LTP Pass-1 / finalize / serializer. Prior post-lint snapshot site is now a documented no-op.
- Forward-path retry site (formerly L1470) now gated by `hasBudgetForPostLintLLM(elapsedNow)`; skip emits `forward_path_retry_skipped_budget`.
- CoT-leak retry site (formerly L1514) now gated identically; skip emits `cot_leak_retry_skipped_budget`.
- Post-lint retry decision continues through `computeRetryBudget` (unchanged wiring), now sees the tighter constants automatically.
- **Ping surface** adds `persist_early_snapshot: "persist-early-pre-lint@2026-07-27-branch-correction"` and `post_lint_llm_budget_ms: 300000`. Build stamp bumped.

## 4. INVOCATION-STATUS SEMANTICS

`function_runs` finalizing `status=error` for a run that persisted a valid document is a semantics defect (controller-flagged). This turn's fix delivers the **clock contract** and the **persist-early** move; the `status` correction requires cross-cutting changes to the shared lifecycle helper and the reaper (they own the terminal status write, not the generator). Recorded as an **explicit follow-up** (see item 202 §Owed).

## 5. REGRESSION TESTS

`supabase/functions/_shared/ltp/retry-budget.branch-correction.test.ts` — **6/6 green** (verified in-sandbox via `deno test`):

1. `ISOLATE_CEILING_MS == 15min == MAX_END_TO_END_MS` — constants pinned.
2. Retries refused past 4-min elapsed even when wall-clock remains (`elapsed_budget_exceeded`).
3. Caller's stricter threshold still respected when tighter than 4 min.
4. `retryCap` accounts for the 3-min post-retry reserve.
5. `hasBudgetForPostLintLLM` enforces the 5-min ceiling on downstream LLM calls.
6. **Contract-by-construction:** `retryCap + elapsed + reserve ≤ MAX_END_TO_END_MS` at every permitted retry moment.

## 6. DEPLOY + §16 PING-PROVE

`supabase.deploy_edge_functions(["run-cppa-risk-assessment"])` → `Successfully deployed`. GET `?ping=1` returns:

```
{
  "build_stamp": "ltp-risk-smokehang-branch-correction@2026-07-27T16:20:00Z",
  "composition_enforce": "1",
  "ltp_mode": "enforce",
  "ltp_version": "ltp-risk-p2",
  "persist_early_snapshot": "persist-early-pre-lint@2026-07-27-branch-correction",
  "persist_first_retry": "retry-budget@2026-07-27-persistfirst",
  "post_lint_llm_budget_ms": 300000,
  "safe_finalize": "safe-finalize@2026-07-27-hangfix"
}
```

§16 surface intact.

## 7. SPEC-WRITEBACK — HARNESS CEILING vs GENERATOR WORST-CASE

Design law added: harness reap ceiling and generator worst-case budget must have **explicit margin**, product-agnostic. Codified as `docs/design/LEGAL-TEST-PIPELINE.md §30. CLOCK-BUDGET LAW`.

## 8. DISPOSITION

**READY-FOR-RELAUNCH. HARD STOP.** All three dead smokes (#153, #154, #155) remain **non-evidential**; §22.1 clean-arm counter unchanged at **0/3 for `cppa-risk`**. Controller re-inserts the wrapped `batch_size=1` smoke row (§18 shape, `created_by 02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122`, `LTP_COMPOSITION_ENFORCE=1`) to exercise the clock contract on the wire.
