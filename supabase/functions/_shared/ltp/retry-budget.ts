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

export const ISOLATE_CEILING_MS = 330_000;
// Reserve for post-retry work: T-5 residue detection, deterministic
// fallback, i3 rewriter, guardInformationNeeded, W6..W24, LTP finalize,
// serializer, persist. Measured >60s in cold paths; 90s is the floor.
export const POST_RETRY_RESERVE_MS = 90_000;
// Minimum time we're willing to give the retry LLM call itself.
// Below this we skip: a truncated retry is worse than no retry.
export const MIN_RETRY_WINDOW_MS = 30_000;

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
}): RetryBudget {
  const ceiling = params.isolateCeilingMs ?? ISOLATE_CEILING_MS;
  const reserve = params.postRetryReserveMs ?? POST_RETRY_RESERVE_MS;
  const minWindow = params.minRetryWindowMs ?? MIN_RETRY_WINDOW_MS;
  const remainingWallClockMs = Math.max(0, ceiling - params.elapsedMs);
  const retryCapMs = Math.max(0, remainingWallClockMs - reserve);

  if (params.elapsedMs >= params.elapsedThresholdMs) {
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
