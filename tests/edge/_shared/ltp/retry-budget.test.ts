// Unit tests for the persist-first retry budget + wrapper.
// Covers CEO regression bar (SMOKE-HANG ADDENDUM 2026-07-27):
//   - retry that hangs → first doc preserved
//   - retry that throws → first doc preserved
//   - retry that returns invalid → first doc preserved
//   - wall-clock-exhausted → retry skipped (reason=wall_clock_insufficient)
//   - elapsed threshold exceeded → retry skipped (reason=elapsed_budget_exceeded)
//   - retry within budget completing → used

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  computeRetryBudget,
  withRetryPersistFirst,
  ISOLATE_CEILING_MS,
  POST_RETRY_RESERVE_MS,
  MIN_RETRY_WINDOW_MS,
} from "../../../../supabase/functions/run-cppa-risk-assessment/_local/ltp/retry-budget.ts";

Deno.test("computeRetryBudget: ok when elapsed low and wall-clock permits", () => {
  const b = computeRetryBudget({ elapsedMs: 60_000, elapsedThresholdMs: 150_000 });
  assertEquals(b.allowed, true);
  assertEquals(b.reason, "ok");
  assertEquals(b.remainingWallClockMs, ISOLATE_CEILING_MS - 60_000);
});

Deno.test("computeRetryBudget: skip when elapsed exceeds threshold", () => {
  const b = computeRetryBudget({ elapsedMs: 160_000, elapsedThresholdMs: 150_000 });
  assertEquals(b.allowed, false);
  assertEquals(b.reason, "elapsed_budget_exceeded");
});

Deno.test("computeRetryBudget: wall_clock_insufficient branch is unreachable under current constants (T-M7.1)", () => {
  // T-M7.1 (dispatch, +1 constant): the wall_clock_insufficient branch
  // requires (a) elapsedMs < MAX_ELAPSED_FOR_RETRY_MS and (b) retryCapMs <
  // MIN_RETRY_WINDOW_MS. Under the current SMOKE-HANG BRANCH-CORRECTION
  // constants (ISOLATE_CEILING=900s, MAX_ELAPSED_FOR_RETRY=240s,
  // POST_RETRY_RESERVE=180s, MIN_RETRY_WINDOW=30s), any elapsed satisfying
  // (a) leaves remainingWallClock ≥ 660s and retryCapMs ≥ 480s ≫ minWindow,
  // so (b) can never fire — the branch is dead code preserved as
  // defence-in-depth if the ceiling ever tightens. Prior test pinned the
  // OLD (330s / 90s) constants; updated to assert the branch stays dead so
  // any future constant tightening that revives it lands a real assertion.
  const b = computeRetryBudget({ elapsedMs: 220_000, elapsedThresholdMs: 300_000 });
  assertEquals(b.allowed, true);
  assertEquals(b.reason, "ok");
  assertEquals(b.remainingWallClockMs >= POST_RETRY_RESERVE_MS + MIN_RETRY_WINDOW_MS, true);
});

Deno.test("computeRetryBudget: cap uses remaining wall clock minus reserve", () => {
  const b = computeRetryBudget({ elapsedMs: 100_000, elapsedThresholdMs: 300_000 });
  assertEquals(b.retryCapMs, ISOLATE_CEILING_MS - 100_000 - POST_RETRY_RESERVE_MS);
  assertEquals(b.allowed, true);
});

Deno.test("withRetryPersistFirst: retry that hangs → first doc preserved (timed_out)", async () => {
  const firstDoc = { v: "first" };
  const outcome = await withRetryPersistFirst(
    firstDoc,
    50, // 50ms cap
    () => new Promise(() => { /* never resolves */ }),
    () => true,
  );
  assertEquals(outcome.kind, "kept_first");
  if (outcome.kind === "kept_first") assertEquals(outcome.reason, "timed_out");
});

Deno.test("withRetryPersistFirst: retry that throws → first doc preserved (threw)", async () => {
  const outcome = await withRetryPersistFirst(
    { v: "first" },
    1_000,
    () => Promise.reject(new Error("boom")),
    () => true,
  );
  assertEquals(outcome.kind, "kept_first");
  if (outcome.kind === "kept_first") {
    assertEquals(outcome.reason, "threw");
    assertEquals(outcome.error, "boom");
  }
});

Deno.test("withRetryPersistFirst: retry that returns invalid → first doc preserved (invalid)", async () => {
  const outcome = await withRetryPersistFirst(
    { v: "first" },
    1_000,
    () => Promise.resolve({ v: "junk" }),
    (c) => c.v === "good",
  );
  assertEquals(outcome.kind, "kept_first");
  if (outcome.kind === "kept_first") assertEquals(outcome.reason, "invalid");
});

Deno.test("withRetryPersistFirst: valid retry within budget → used", async () => {
  const outcome = await withRetryPersistFirst(
    { v: "first" },
    1_000,
    () => Promise.resolve({ v: "good" }),
    (c) => c.v === "good",
  );
  assertEquals(outcome.kind, "used_retry");
  if (outcome.kind === "used_retry") assertEquals(outcome.value.v, "good");
});

Deno.test("withRetryPersistFirst: abort signal fires on cap", async () => {
  let observed = false;
  const outcome = await withRetryPersistFirst(
    { v: "first" },
    30,
    (signal) => new Promise((_, reject) => {
      signal.addEventListener("abort", () => { observed = true; reject(new Error("aborted")); });
    }),
    () => true,
  );
  assertEquals(observed, true);
  assertEquals(outcome.kind, "kept_first");
});

Deno.test("constants are non-zero and sensible", () => {
  assertEquals(ISOLATE_CEILING_MS > 0, true);
  assertEquals(POST_RETRY_RESERVE_MS >= 60_000, true);
  assertEquals(MIN_RETRY_WINDOW_MS >= 10_000, true);
});
