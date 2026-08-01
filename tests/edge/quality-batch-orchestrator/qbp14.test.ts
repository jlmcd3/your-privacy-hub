// QB-P14 item 5 — per-tool batch size resolution.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveToolBatchSize } from "../../../supabase/functions/quality-batch-orchestrator/index.ts";

Deno.test("resolveToolBatchSize: prefers per-tool tool_state.batch_size", () => {
  const state = { lia: { batch_size: 5 }, dpia: { batch_size: 2 } };
  assertEquals(resolveToolBatchSize("lia", state, 8), 5);
  assertEquals(resolveToolBatchSize("dpia", state, 8), 2);
});

Deno.test("resolveToolBatchSize: falls back to batch-level when tool missing", () => {
  const state = { lia: { batch_size: 5 } };
  assertEquals(resolveToolBatchSize("registration", state, 4), 4);
});

Deno.test("resolveToolBatchSize: falls back to default 3 when both unset/invalid", () => {
  assertEquals(resolveToolBatchSize("lia", {}, null), 3);
  assertEquals(resolveToolBatchSize("lia", { lia: { batch_size: 0 } }, undefined), 3);
  assertEquals(resolveToolBatchSize("lia", { lia: { batch_size: -2 } }, 0), 3);
});

Deno.test("resolveToolBatchSize: fractional inputs are floored, min 1", () => {
  assertEquals(resolveToolBatchSize("lia", { lia: { batch_size: 3.7 } }, 6), 3);
  assertEquals(resolveToolBatchSize("lia", { lia: { batch_size: 1.4 } }, 6), 1);
});
