// LTP §16 measurement-validity — shared launch-path assertion.
// CORRECTIONS-BUNDLE 2026-07-27 (ledger item 173, STATE-AUDIT item 171 finding B):
// the assertion previously lived only in `kick-wrapped-batch`, so any launch
// path that skipped that kicker (batch-kickoff-pickup, quality-batch-orchestrator,
// kick-perfect-intake) could kick a generator in the wrong mode without abort.
// This module is the SINGLE source of truth: every launch path imports it and
// aborts on mismatch. Fail-loud; NEVER downgrades to a warning.
//
// Design: docs/design/LEGAL-TEST-PIPELINE.md §16.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Tool-slug → edge-function map for LTP-managed generators. When a tool slug
// appears here, its declared expected mode is asserted before every launch.
// Currently limited to cppa-risk per Risk-first rollout (LEGAL-TEST-PIPELINE §7);
// additional tools are added ONLY when their LTP wiring lands in enforce mode.
export const LTP_MANAGED_TOOL_TO_FN: Readonly<Record<string, string>> = Object.freeze({
  "cppa-risk": "run-cppa-risk-assessment",
});

// Fleet-declared expected mode. Every LTP-managed tool MUST report this at
// GET /?ping=1 or the launch is aborted. Set to "enforce" once the fleet is
// in enforcement mode; ops may lower to "shadow" via env override for
// controlled shadow-mode measurement windows.
export function ltpExpectedMode(): "shadow" | "enforce" {
  const v = (Deno.env.get("LTP_MODE_EXPECTED") ?? "enforce").toLowerCase();
  return v === "shadow" ? "shadow" : "enforce";
}

export interface ModeCheckEntry {
  readonly tool: string;
  readonly target_fn: string;
  readonly expected: "shadow" | "enforce";
  readonly actual: string | null;
  readonly build_stamp: string | null;
  readonly ok: boolean;
  readonly error?: string;
}

export interface ModeAssertResult {
  readonly ok: boolean;
  readonly checks: readonly ModeCheckEntry[];
  readonly aborted_tool?: string;
}

async function pingTool(tool: string, targetFn: string, expected: "shadow" | "enforce"): Promise<ModeCheckEntry> {
  try {
    const pr = await fetch(`${SUPABASE_URL}/functions/v1/${targetFn}?ping=1`, {
      method: "GET",
      headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY },
    });
    const pj = await pr.json().catch(() => ({} as any));
    const actual = pj?.ltp_mode ?? null;
    return {
      tool, target_fn: targetFn, expected, actual,
      build_stamp: pj?.build_stamp ?? null,
      ok: actual === expected,
    };
  } catch (e) {
    return {
      tool, target_fn: targetFn, expected, actual: null, build_stamp: null,
      ok: false, error: (e as Error)?.message ?? "unknown",
    };
  }
}

/**
 * Assert every LTP-managed tool in `tools[]` reports the fleet-expected mode.
 * NEVER throws — callers must inspect `result.ok` and abort the launch on
 * failure. On abort, the caller MUST record the check payload on the batch/run
 * row so the mismatch is durable.
 */
export async function assertLtpModeForTools(tools: readonly string[]): Promise<ModeAssertResult> {
  const expected = ltpExpectedMode();
  const managed = tools.filter((t) => t in LTP_MANAGED_TOOL_TO_FN);
  if (managed.length === 0) return { ok: true, checks: [] };
  const checks: ModeCheckEntry[] = [];
  for (const t of managed) {
    const entry = await pingTool(t, LTP_MANAGED_TOOL_TO_FN[t], expected);
    checks.push(entry);
    if (!entry.ok) return { ok: false, checks, aborted_tool: t };
  }
  return { ok: true, checks };
}
