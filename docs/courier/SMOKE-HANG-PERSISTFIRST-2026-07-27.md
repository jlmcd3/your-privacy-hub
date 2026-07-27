# SMOKE-HANG PERSIST-FIRST RETRY — Courier (2026-07-27)

**Dispatch:** SMOKE-HANG ADDENDUM (CEO, 2026-07-27) — corrected root-cause site. Supersedes the diagnosis framing in Item 197; the invariant stands, the site moves.

## Verified state on arrival (10:49Z, controller-supplied + code-confirmed)

- `quality_run 1b55c7ba` (run #153) already self-reaped at 10:44:20 — `status=error`, `error="No documents completed"`. **Step (1) of the dispatch (manual reap) skipped.** `quality_batch_runs` recorded `actual_count=0` vs `declared_count=1`.
- `cppa_assessments 1b4a1a0a`: `updated_at` frozen at 10:24:16; `report_data IS NULL`.
- `function_runs`:
  - Outer `fcc85c62` (invocation 10:24:15) never `finished_at` — isolate died before the outer catch.
  - Inner `post_gen_lint 61a5544b`: `status=success` at 10:28:40, payload `fallback_applied=true`, `residual_leaks=1`, `residual_resolved_asks=4` (fields: `i1_processing_purpose`, `i1b_min_pi`, `i2_retention_period`, `sensitive_location_basis`), `retry_within_budget=true`.
- `function_logs`: window 10:24-10:29 outside retention — diagnosis proceeded from code inspection + timeline evidence.

## Corrected diagnosis

Crash site = the **post-gen-lint retry path**, not composition-finalize.

Pre-fix code at `run-cppa-risk-assessment/index.ts:1216-1254`:

```ts
const elapsedAtViolationMs = Date.now() - t0;
const retryWithinBudget = elapsedAtViolationMs < CPPA_RISK_RETRY_ELAPSED_THRESHOLD_MS; // 150_000
// … if retryWithinBudget:
const retry = await callModel(system, userPrompt + …, "generate-v4-retry");
const retryParsed = tryParseJson(retry.text);
if (retryParsed && retryParsed.assessment_summary) {
  parsed = retryParsed;   // ← first doc DISCARDED in memory before persist
  lastStopReason = retry.stopReason;
  debugRaw = retry.text;
}
```

Two invariants violated:

1. **The budget was a TOKEN/count budget, not wall-clock.** Isolate ceiling is 330s (see `AnthropicTimeoutError` / `code === "generation_timeout_330s"`). Lint fired ~264s in. Retry launched into ~66s of remaining wall-clock. Insufficient.
2. **The retry branch discarded the first document in memory BEFORE launching the retry.** A dead retry left `parsed` in a partially-mutated state; no snapshot; nothing to fall back to. When the isolate died mid-retry, both documents were lost — the exact "silent total loss" CEO described.

## Fix invariant (unchanged, now aimed correctly)

1. **PERSIST-FIRST.** The first composed document is snapshotted before any retry launches. A successful retry overwrites the snapshot. A hung/thrown/timed-out/garbage retry costs nothing — the snapshot ships.
2. **`retry_within_budget` includes wall-clock.** Remaining wall-clock against isolate ceiling, minus a hard reserve for post-retry work. Insufficient budget → skip retry, keep first doc, telemeter `retry_skipped_wall_clock`.

## Implementation

### New module: `supabase/functions/_shared/ltp/retry-budget.ts`

Pure, unit-testable. No Supabase dependency.

```ts
export const ISOLATE_CEILING_MS = 330_000;
export const POST_RETRY_RESERVE_MS = 90_000;  // T-5 detect + fallback + i3 + guard + W6..W24 + LTP finalize + serializer + persist
export const MIN_RETRY_WINDOW_MS = 30_000;    // below this, a truncated retry is worse than none

export function computeRetryBudget({ elapsedMs, elapsedThresholdMs, ... }): RetryBudget
  // returns { allowed, reason: "ok"|"elapsed_budget_exceeded"|"wall_clock_insufficient", remainingWallClockMs, retryCapMs }

export async function withRetryPersistFirst<T>(firstDoc, capMs, retryFn(signal), validate): PersistFirstOutcome<T>
  // Wraps retry in AbortController + Promise.race deadline at capMs.
  // Returns {kind:"used_retry", value} only on validated candidate,
  // else {kind:"kept_first", reason:"threw"|"timed_out"|"invalid", error?, elapsedMs}.
```

### Wire-site: `run-cppa-risk-assessment/index.ts:1216-1305`

- `retry_within_budget` now = `computeRetryBudget().allowed`.
- Snapshots of `parsed`, `lastStopReason`, `debugRaw` taken before retry.
- Retry runs inside `withRetryPersistFirst`; only `used_retry` writes back.
- New telemetry:
  - `post_gen_retry_used { retry_elapsed_ms }`
  - `post_gen_retry_failed_preserve_first_doc { reason, error?, retry_elapsed_ms }`
  - `post_gen_violation_retry_skipped_wall_clock { reason: "wall_clock_insufficient", remaining_wall_clock_ms, retry_cap_ms, … }`
- Existing `post_gen_violation` extended with `retry_budget_reason`, `remaining_wall_clock_ms`, `retry_cap_ms`.

### Boot + §16 ping conformance

- Boot line adds `persist_first_retry=retry-budget@2026-07-27-persistfirst`.
- `?ping` response adds `persist_first_retry` and `safe_finalize` alongside `composition_enforce`.
- **BUILD_STAMP:** `ltp-risk-smokehang-persistfirst-retry@2026-07-27T15:05:00Z`.

## Regression tests — 10/10 green

`supabase/functions/_shared/ltp/retry-budget.test.ts`:

| Test | Verifies |
|---|---|
| `retry that hangs → first doc preserved (timed_out)` | CEO bar (a) |
| `retry that throws → first doc preserved (threw)` | CEO bar (b) |
| `retry that returns invalid → first doc preserved (invalid)` | Defense-in-depth |
| `valid retry within budget → used` | Happy path |
| `abort signal fires on cap` | Callee sees cancellation |
| `computeRetryBudget: skip when remaining wall-clock < reserve+minWindow` | CEO bar (wall-clock skip) |
| `computeRetryBudget: skip when elapsed exceeds threshold` | Legacy threshold preserved |
| `computeRetryBudget: cap uses remaining wall-clock minus reserve` | Correct math |
| `computeRetryBudget: ok when elapsed low and wall-clock permits` | Happy path |
| `constants are non-zero and sensible` | Guard against regressions on the defaults |

## Stage-C content candidates (recorded per CEO §4; NOT fixed this turn)

Composer emitted these on a **perfect** intake — upstream composer defects, not lint/retry bugs. Fair game for Stage-C content-side work under courier discipline:

- `residual_leaks=1` on the perfect fixtures.
- `resolved_source_ask_dropped` on:
  - `i1_processing_purpose`
  - `i1b_min_pi`
  - `i2_retention_period`
  - `sensitive_location_basis`

## Re-smoke (STEP 5) — NOT executed this turn

Sandbox 401 conditions from Item 197 unchanged. Controller-issued wrapped `batch_size=1` smoke required to exercise the persist-first path on the wire (real admin `created_by 02bc7cd6-a2ef-41c0-8ea8-eaa52e1b1122`, `LTP_COMPOSITION_ENFORCE=1`, `declared_count==actual_count` at terminal, resolved-band cohort check per CONTINUATION-5 step 9).

## Disposition

**CORRECTED ROOT FIX LANDED. HARD STOP.** Steps 9, 9b, 10, 11, 12 of CONTINUATION-5 still owed. Awaiting controller relaunch.
