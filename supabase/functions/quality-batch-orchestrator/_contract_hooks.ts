// DS-T2b — Orchestrator ↔ delivery_contracts wiring (fail-open).
//
// Every call MUST swallow errors. A contract-side failure must NEVER alter
// batch behavior — the orchestrator is the wave harness and cannot afford a
// telemetry surface to become a control-flow surface. All returns are void.
//
// Build stamp: ds-t2b@2026-07-25T01:44:00Z (regenerate on real deploy)

export interface ContractDeps {
  create: (input: {
    runClass: "harness";
    tool: string;
    subjectTable: string;
    subjectId: string;
    userId: null;
    checkpointRef?: Record<string, unknown>;
  }) => Promise<{ id: string } | unknown>;
  heartbeatBySubject: (
    subjectTable: string,
    subjectId: string,
    checkpointRef?: Record<string, unknown>,
  ) => Promise<void>;
  terminateBySubject: (
    subjectTable: string,
    subjectId: string,
    terminalState: "delivered" | "harness_stalled" | "admin_escalated",
    lastError?: string,
  ) => Promise<void>;
}

export async function dcCreateBatchContract(
  deps: ContractDeps,
  runId: string,
  extra: Record<string, unknown> = {},
): Promise<void> {
  try {
    await deps.create({
      runClass: "harness",
      tool: "quality-batch",
      subjectTable: "quality_batch_runs",
      subjectId: runId,
      userId: null,
      checkpointRef: extra,
    });
  } catch (e) {
    console.error("[qb-orchestrator] dc.create swallowed", (e as Error).message);
  }
}

export async function dcHeartbeatBatchContract(
  deps: ContractDeps,
  runId: string,
): Promise<void> {
  try {
    await deps.heartbeatBySubject("quality_batch_runs", runId);
  } catch (e) {
    console.error("[qb-orchestrator] dc.heartbeat swallowed", (e as Error).message);
  }
}

export async function dcTerminateBatchContract(
  deps: ContractDeps,
  runId: string,
  status: "complete" | "failed" | "cancelled" | "error",
  lastError?: string,
): Promise<void> {
  try {
    const terminal =
      status === "complete" ? "delivered"
        : status === "cancelled" ? "harness_stalled"
        : "admin_escalated";
    await deps.terminateBySubject(
      "quality_batch_runs", runId, terminal, lastError,
    );
  } catch (e) {
    console.error("[qb-orchestrator] dc.terminate swallowed", (e as Error).message);
  }
}
