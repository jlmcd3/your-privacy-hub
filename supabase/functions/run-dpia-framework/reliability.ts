// RUNTIME-1 — reliability helpers for run-dpia-framework.
// Scoped to this function's directory per the courier's fence rule
// (no changes to _shared/*). Companion to run-li-assessment/reliability.ts.
//
// Stage checkpointing for DPIA is already handled by the per-unit staging
// design (_staging.units[u].status: blocked → dispatching → processing →
// done/error) plus writeUnitStatus, which refreshes updated_at on every
// transition. Resume entry: any unit still in status !== "done" is re-invoked
// idempotently by runUnit's skip-if-done gate (index.ts L1454-1458), so the
// sweeper (batch-kickoff-pickup / reap-stuck-generations) can safely re-POST
// the same unit id after a worker eviction.
//
// This module adds only what the DPIA path was missing: bounded retry around
// the upstream Anthropic call for transient resets (like the RUN 1 u4
// incident), and a finally-path guarantee that the bootstrap function_runs
// row and the dpia_frameworks row never orphan.

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
  const status = msg.match(/anthropic error:\s*(\d{3})/i)
    ?? msg.match(/http\s*(\d{3})/i);
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

export async function ensureTerminalFnRun(
  supabase: any,
  dpia_id: string,
  fnRun: FnRunHandle,
  terminalReached: boolean,
): Promise<void> {
  if (terminalReached) return;
  try {
    await lifecycleUpdate(
      supabase,
      "dpia_frameworks",
      dpia_id,
      { status: "failed" },
      { fn: "run-dpia-framework", phase: "finally_guard" },
    );
  } catch (_) { /* swallow */ }
  try {
    await failFunctionRun(supabase, fnRun, new Error("worker_exited_without_terminal_signal"), {
      metadata: { dpia_id, phase: "finally_guard" },
    });
  } catch (_) { /* swallow */ }
}
