// LTP · post-gen retry budget & persist-first wrapper.
//
// CEO invariant (SMOKE-HANG ADDENDUM, 2026-07-27):
//   1. PERSIST-FIRST — the first composed document must survive a retry
//      that hangs, throws, or blows the isolate wall clock. Snapshot the
//      pre-retry parsed document, run the retry under a hard wall-clock
//      cap, and restore the snapshot on any failure or timeout.
//   2. `retry_within_budget` MUST include remaining wall-clock time
//      against the platform isolate ceiling, with a safety margin for
//      the post-retry pipeline (lint, LTP finalize, serializer, persist).
//
// Kept intentionally small and pure so it can be unit-tested without a
// Supabase context. Product code owns the parsed-doc reassignment; this
// module only decides IF the retry may run and BOUNDS how long it may run.

// SMOKE-HANG BRANCH-CORRECTION (2026-07-27, item 202):
// Empirical evidence from smoke #155 (assessment 6992d6e0…): the isolate
// lived well past the assumed 330s ceiling — a downstream LLM retry or
// finalize pass kept it busy long enough that the HARNESS reaper (20-min
// ceiling) fired first, orphaning the run. The CEO invariant is now:
// total post-lint work (retry + finalize + persist) MUST complete inside
// a hard E2E budget that keeps the whole pipeline under 15 minutes worst-
// case — comfortably inside the 20-min harness reap.
//
// Concretely: we treat the effective ceiling for retry-decision purposes
// as MAX_END_TO_END_MS. If elapsed exceeds MAX_ELAPSED_FOR_RETRY_MS the
// retry is refused even if wall-clock still exists — a late retry is a
// downstream time bomb. The post-retry reserve is grown to reflect the
// real cost of finalize + serializer + persist observed on cold paths.
export const ISOLATE_CEILING_MS = 900_000;             // 15 min hard E2E budget
export const MAX_END_TO_END_MS = 900_000;              // alias — used for retry-decision math
export const MAX_ELAPSED_FOR_RETRY_MS = 240_000;       // 4 min: past this, no retries
export const POST_RETRY_RESERVE_MS = 180_000;          // 3 min: finalize + serializer + persist
export const MIN_RETRY_WINDOW_MS = 30_000;
export const POST_LINT_LLM_CALL_TIMEOUT_MS = 120_000;  // per Anthropic leg; continuation makes max 240s
export const POST_LINT_PASS1_TIMEOUT_MS = 75_000;      // per Anthropic leg; pass-1 runs one attempt in clock mode
export const POST_LINT_LLM_MAX_CALL_MS = POST_LINT_LLM_CALL_TIMEOUT_MS * 2;
export const POST_LINT_PASS1_MAX_CALL_MS = POST_LINT_PASS1_TIMEOUT_MS * 2;

// Post-lint work guard — used by non-retry LLM sites (forward-path guard,
// CoT-leak guard). Callers pass elapsedMs and skip the downstream LLM
// call if elapsed exceeds this threshold. Persist-early already covers
// document safety; this covers pipeline-clock safety.
export const POST_LINT_LLM_BUDGET_MS = 300_000;        // 5 min: no more LLM calls past this
export function hasBudgetForPostLintLLM(elapsedMs: number): boolean {
  return elapsedMs < POST_LINT_LLM_BUDGET_MS;
}


export type RetryBudget = {
  allowed: boolean;
  reason: "ok" | "elapsed_budget_exceeded" | "wall_clock_insufficient";
  elapsedMs: number;
  remainingWallClockMs: number;
  retryCapMs: number;
};

export function computeRetryBudget(params: {
  elapsedMs: number;
  elapsedThresholdMs: number;
  isolateCeilingMs?: number;
  postRetryReserveMs?: number;
  minRetryWindowMs?: number;
  maxElapsedForRetryMs?: number;
}): RetryBudget {
  const ceiling = params.isolateCeilingMs ?? ISOLATE_CEILING_MS;
  const reserve = params.postRetryReserveMs ?? POST_RETRY_RESERVE_MS;
  const minWindow = params.minRetryWindowMs ?? MIN_RETRY_WINDOW_MS;
  const maxForRetry = params.maxElapsedForRetryMs ?? MAX_ELAPSED_FOR_RETRY_MS;
  const effectiveThreshold = Math.min(params.elapsedThresholdMs, maxForRetry);
  const remainingWallClockMs = Math.max(0, ceiling - params.elapsedMs);
  const retryCapMs = Math.max(0, remainingWallClockMs - reserve);

  if (params.elapsedMs >= effectiveThreshold) {
    return {
      allowed: false,
      reason: "elapsed_budget_exceeded",
      elapsedMs: params.elapsedMs,
      remainingWallClockMs,
      retryCapMs,
    };
  }
  if (retryCapMs < minWindow) {
    return {
      allowed: false,
      reason: "wall_clock_insufficient",
      elapsedMs: params.elapsedMs,
      remainingWallClockMs,
      retryCapMs,
    };
  }
  return {
    allowed: true,
    reason: "ok",
    elapsedMs: params.elapsedMs,
    remainingWallClockMs,
    retryCapMs,
  };
}


export type PersistFirstOutcome<T> =
  | { kind: "used_retry"; value: T; elapsedMs: number }
  | { kind: "kept_first"; reason: "threw" | "timed_out" | "invalid"; error?: string; elapsedMs: number };

/**
 * Persist-first retry wrapper.
 *
 * `firstDoc` is the composed document that will ship if anything goes
 * wrong. `retryFn` is invoked with an AbortSignal that fires at
 * `capMs`; a Promise.race enforces the deadline even if the callee
 * ignores the signal. Any throw, timeout, or `validate=false` result
 * causes the wrapper to return the `firstDoc` unchanged.
 *
 * This guarantees the first document survives a retry that hangs,
 * throws, or produces garbage. It does NOT (and cannot) survive an
 * isolate death — the caller must ensure `capMs` leaves enough
 * wall-clock for post-retry work via computeRetryBudget().
 */
export async function withRetryPersistFirst<T>(
  firstDoc: T,
  capMs: number,
  retryFn: (signal: AbortSignal) => Promise<T>,
  validate: (candidate: T) => boolean,
): Promise<PersistFirstOutcome<T>> {
  const started = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), capMs);
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      controller.signal.addEventListener("abort", () => {
        reject(new Error("retry_wall_clock_cap_exceeded"));
      });
    });
    const candidate = await Promise.race([retryFn(controller.signal), timeoutPromise]);
    if (!validate(candidate)) {
      return { kind: "kept_first", reason: "invalid", elapsedMs: Date.now() - started };
    }
    return { kind: "used_retry", value: candidate, elapsedMs: Date.now() - started };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const timedOut = controller.signal.aborted;
    return {
      kind: "kept_first",
      reason: timedOut ? "timed_out" : "threw",
      error: msg,
      elapsedMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
