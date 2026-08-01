// PROCESS-RETRO-WRITEBACK (2026-07-27; ledger item 165).
//
// Canonical harness state machine for public.quality_batch_runs. This module
// is the single source of truth for state × owner mapping. Any daemon that
// mutates a wrapper row MUST import from here and MUST pass the conformance
// check (see supabase/functions/batch-kickoff-pickup/state-machine-conformance.test.ts).
//
// Full spec: docs/design/HARNESS-STATE-MACHINE.md.
// Named laws subsumed: LEGAL-TEST-PIPELINE.md §17 (cancel-any-pre-execution),
// §18 (launch-state equivalence).

export type Status = "queued" | "running" | "complete" | "cancelled" | "failed";
export type Phase  = "starting" | "kickoff" | "running_tool" | "done";

export interface State {
  status: Status;
  phase: Phase;
}

export function stateKey(s: State): string {
  return `${s.status}/${s.phase}`;
}

/** Every legal state in the machine. Any (status, phase) NOT here is illegal. */
export const LEGAL_STATES: readonly State[] = Object.freeze([
  { status: "running",   phase: "kickoff"      }, // CANONICAL BORN STATE (R1)
  { status: "queued",    phase: "starting"     }, // legacy external-launcher shape (§18)
  { status: "running",   phase: "running_tool" },
  { status: "complete",  phase: "done"         },
  { status: "cancelled", phase: "done"         },
  { status: "failed",    phase: "done"         },
]);

export const TERMINAL_STATES: readonly State[] = Object.freeze([
  { status: "complete",  phase: "done" },
  { status: "cancelled", phase: "done" },
  { status: "failed",    phase: "done" },
]);

export function isTerminal(s: State): boolean {
  return TERMINAL_STATES.some((t) => t.status === s.status && t.phase === s.phase);
}

/** Pre-execution states served by the picker (§18 launch-state equivalence). */
export const PRE_EXECUTION_STATES: readonly State[] = Object.freeze([
  { status: "running", phase: "kickoff"  },
  { status: "queued",  phase: "starting" },
]);

/** Primary owner (writer) for each state. Terminal states have no owner. */
export const OWNERSHIP: Readonly<Record<string, string | null>> = Object.freeze({
  "running/kickoff":      "batch-kickoff-pickup",
  "queued/starting":      "batch-kickoff-pickup",
  "running/running_tool": "quality-batch-orchestrator",
  "complete/done":        null,
  "cancelled/done":       null,
  "failed/done":          null,
});

/** Cancel-honouring owner for each non-terminal state (§17). */
export const CANCEL_OWNERSHIP: Readonly<Record<string, string>> = Object.freeze({
  "running/kickoff":      "batch-kickoff-pickup",
  "queued/starting":      "batch-kickoff-pickup",
  "running/running_tool": "quality-batch-orchestrator",
});

/** Reap-honouring owner (picker owns reap for all non-terminal states past REAP_STALE_MS). */
export const REAP_OWNERSHIP: Readonly<Record<string, string>> = Object.freeze({
  "running/kickoff":      "batch-kickoff-pickup",
  "queued/starting":      "batch-kickoff-pickup",
  "running/running_tool": "batch-kickoff-pickup",
});

export interface ConformanceReport {
  ok: boolean;
  reasons: string[];
  summary: {
    legal_states: number;
    terminal_states: number;
    owned_states: number;
    unowned_non_terminal: string[];
    missing_cancel_paths: string[];
  };
}

/**
 * Verify §4/§6 of the state machine: every non-terminal state has a primary
 * owner AND a cancel path. Terminal states must have no owner. Called from
 * the picker's boot path and from the conformance test.
 */
export function verifyStateMachine(): ConformanceReport {
  const reasons: string[] = [];
  const unowned_non_terminal: string[] = [];
  const missing_cancel_paths: string[] = [];

  for (const s of LEGAL_STATES) {
    const k = stateKey(s);
    const owner = OWNERSHIP[k];
    if (isTerminal(s)) {
      if (owner !== null) reasons.push(`terminal ${k} must have null owner (got ${owner})`);
      continue;
    }
    if (!owner) {
      reasons.push(`non-terminal ${k} has no primary owner`);
      unowned_non_terminal.push(k);
    }
    if (!CANCEL_OWNERSHIP[k]) {
      reasons.push(`non-terminal ${k} has no cancel path`);
      missing_cancel_paths.push(k);
    }
    if (!REAP_OWNERSHIP[k]) {
      reasons.push(`non-terminal ${k} has no reap owner`);
    }
  }

  const owned = Object.entries(OWNERSHIP).filter(([, v]) => v !== null).length;

  return {
    ok: reasons.length === 0,
    reasons,
    summary: {
      legal_states: LEGAL_STATES.length,
      terminal_states: TERMINAL_STATES.length,
      owned_states: owned,
      unowned_non_terminal,
      missing_cancel_paths,
    },
  };
}

/**
 * Assert-style helper: throws if the state machine is not fully served.
 * Called by daemon boot paths so a broken deploy fails loud (§16 measurement-
 * validity spirit applied to structural conformance).
 */
export function assertStateMachineConformance(): void {
  const r = verifyStateMachine();
  if (!r.ok) {
    throw new Error(
      `HARNESS-STATE-MACHINE conformance FAILED: ${r.reasons.join("; ")}`,
    );
  }
}
