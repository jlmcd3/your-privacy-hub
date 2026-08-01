// QB-P20 — extracted so tests can import buildSeedRow without booting
// the orchestrator's top-level Deno.serve.
// STAGE-B CONTINUATION-4 (2026-07-27, item 195) — PIN-SLICE FIX:
// cap `intakes` (pinned goldens) to `batchSize` at seed time so a size-1
// batch never enters run-quality-batch with 16 pinned intakes staged.
// The pinned-rerun path deliberately sets batch_size == pins.length and
// remains unaffected. Historical rows (no pins) unaffected.
import { GRADER_CONTEXT_VERSION } from "../../../_shared/grader/context.ts";

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
  if (opts.pins && opts.pins.length) {
    // PIN-SLICE FIX: never stage more pinned intakes than the batch will
    // consume. A batch_size=1 run with 16 goldens must persist exactly 1
    // pinned intake; the excess is dropped at the seed boundary (source
    // of truth) rather than inside run-quality-batch (overshoot arm).
    const capped = opts.pins.length > batchSize
      ? opts.pins.slice(0, batchSize)
      : opts.pins;
    seed.intakes = capped;
  }
  return seed;
}
