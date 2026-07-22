// QB-P20 — extracted so tests can import buildSeedRow without booting
// the orchestrator's top-level Deno.serve.
import { GRADER_CONTEXT_VERSION } from "../grader/context.ts";

export function buildSeedRow(
  tool: string, batchSize: number, runNumber: number, createdBy: string, nowIso: string,
  opts: { pins?: unknown[] | null } = {},
) {
  const seed: Record<string, unknown> = {
    tool,
    status: "pending" as const,
    batch_size: batchSize,
    run_number: runNumber,
    created_by: createdBy,
    user_id: createdBy,
    started_at: nowIso,
    last_heartbeat_at: nowIso,
    next_doc_index: 0,
    grader_context_version: GRADER_CONTEXT_VERSION,
  };
  if (opts.pins && opts.pins.length) seed.intakes = opts.pins;
  return seed;
}
