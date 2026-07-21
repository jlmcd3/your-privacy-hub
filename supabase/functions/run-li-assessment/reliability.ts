// RUNTIME-1 — reliability helpers for run-li-assessment.
// Scoped to this function's directory per the courier's fence rule
// (no changes to _shared/*). Provides:
//   - isTransientError: classifies upstream failures that are safe to retry
//   - withUpstreamRetry: bounded exponential backoff for transient upstream failures
//   - heartbeat: persists the current stage into li_assessments so long stages
//     are detectable while running (also refreshes updated_at, which the reaper
//     uses to detect stalls)
//   - ensureTerminalFnRun: finally-path guarantee that function_runs and
//     li_assessments reach a terminal status on every exit path
//
// These helpers deliberately swallow their own errors — a telemetry failure
// must never turn a healthy generation into a failed one.

import type { FnRunHandle } from "../_shared/function-run-logger.ts";
import { failFunctionRun } from "../_shared/function-run-logger.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";

export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const m = msg.toLowerCase();
  if (m.includes("aborted") || m.includes("timeout")) return true;
  if (m.includes("econnreset") || m.includes("connection reset")) return true;
  if (m.includes("etimedout") || m.includes("enetunreach")) return true;
  if (m.includes("socket hang up") || m.includes("premature close")) return true;
  if (m.includes("fetch failed") || m.includes("network")) return true;
  // Anthropic upstream throws include the HTTP status in the message (see
  // callAnthropic: `Anthropic error: ${res.status}`).
  const status = msg.match(/anthropic error:\s*(\d{3})/i);
  if (status) {
    const code = Number(status[1]);
    if (code === 408 || code === 425 || code === 429) return true;
    if (code >= 500 && code <= 599) return true;
  }
  return false;
}

export async function withUpstreamRetry<T>(
  fn: () => Promise<T>,
  opts: { label: string; retries?: number; baseDelayMs?: number } = { label: "upstream" },
): Promise<T> {
  const retries = opts.retries ?? 2;
  const base = opts.baseDelayMs ?? 750;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (attempt === retries || !isTransientError(e)) {
        throw e;
      }
      const delay = base * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
      console.warn(JSON.stringify({
        evt: "upstream_retry",
        label: opts.label,
        attempt: attempt + 1,
        retries,
        delay_ms: delay,
        error: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
      }));
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

export async function heartbeat(
  supabase: any,
  assessment_id: string,
  stage: string,
): Promise<void> {
  try {
    await lifecycleUpdate(
      supabase,
      "li_assessments",
      assessment_id,
      { stage, updated_at: new Date().toISOString() },
      { fn: "run-li-assessment", phase: `heartbeat:${stage}` },
    );
  } catch (e) {
    console.warn("[lia-reliability] heartbeat write failed:", (e as Error)?.message ?? e);
  }
}

// Called from the background task's finally block. If the try body already
// wrote a terminal signal, this is a no-op; if it did not (e.g. an uncaught
// throw slipped past the catch), it stamps a failed signal so the row never
// stays in a running state on paths we can reach.
export async function ensureTerminalFnRun(
  supabase: any,
  assessment_id: string,
  fnRun: FnRunHandle,
  terminalReached: boolean,
): Promise<void> {
  if (terminalReached) return;
  try {
    await lifecycleUpdate(
      supabase,
      "li_assessments",
      assessment_id,
      { status: "failed" },
      { fn: "run-li-assessment", phase: "finally_guard" },
    );
  } catch (_) { /* swallow */ }
  try {
    await failFunctionRun(supabase, fnRun, new Error("worker_exited_without_terminal_signal"), {
      metadata: { assessment_id, phase: "finally_guard" },
    });
  } catch (_) { /* swallow */ }
}
