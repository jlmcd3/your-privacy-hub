// QB-P1 regression coverage for quality-batch-orchestrator's pure pieces.
// No live network calls — exercises slug validation, terminal-status set,
// stall threshold, and the decide() transition function only.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  RUN_QUALITY_BATCH_SLUGS,
  RUN_QUALITY_BATCH_TERMINAL,
  CHILD_STALL_MS,
  decide,
  buildSeedRow,
  type BatchRow,
  type ChildSnapshot,
} from "../quality-batch-orchestrator/index.ts";


Deno.test("slug set matches the nine run-quality-batch slugs exactly", () => {
  const expected = new Set([
    "cppa-admt", "cppa-risk", "cppa-cyber",
    "governance", "dpia", "lia",
    "dpa-generator", "ir-playbook", "biometric-checker",
  ]);
  assertEquals(RUN_QUALITY_BATCH_SLUGS.size, expected.size);
  for (const s of expected) assert(RUN_QUALITY_BATCH_SLUGS.has(s), `missing ${s}`);
});

Deno.test("terminal-status set is exactly {complete, error, cancelled}", () => {
  assertEquals(
    [...RUN_QUALITY_BATCH_TERMINAL].sort(),
    ["cancelled", "complete", "error"],
  );
});

Deno.test("stall threshold is 6 minutes", () => {
  assertEquals(CHILD_STALL_MS, 6 * 60_000);
});

const baseRow: BatchRow = {
  status: "running",
  phase: "kickoff",
  cancel_requested: false,
  tools: ["governance", "dpia"],
  current_tool_index: 0,
  current_quality_run_id: null,
  tool_results: [],
};

Deno.test("decide: non-running row is a no-op", () => {
  const d = decide({ ...baseRow, status: "complete" }, null, Date.now());
  assertEquals(d.kind, "noop");
});

Deno.test("decide: cancel_requested short-circuits to cancel_terminal", () => {
  const d = decide({ ...baseRow, cancel_requested: true, phase: "running_tool" }, null, Date.now());
  assertEquals(d.kind, "cancel_terminal");
});

Deno.test("decide: kickoff advances phase", () => {
  const d = decide(baseRow, null, Date.now());
  assertEquals(d.kind, "advance_phase_running_tool");
});

Deno.test("decide: running_tool with no child dispatches next tool", () => {
  const d = decide({ ...baseRow, phase: "running_tool" }, null, Date.now());
  assert(d.kind === "dispatch_child");
  assertEquals(d.tool, "governance");
});

Deno.test("decide: terminal child triggers child_terminal with moreTools flag", () => {
  const row: BatchRow = { ...baseRow, phase: "running_tool", current_quality_run_id: "abc" };
  const child: ChildSnapshot = {
    status: "complete", last_heartbeat_at: new Date().toISOString(),
    score_overall: 82, gpt_score_overall: 79, error: null, run_number: null,
  };
  const d = decide(row, child, Date.now());
  assert(d.kind === "child_terminal");
  assertEquals(d.moreTools, true);
  // Final tool → moreTools=false
  const d2 = decide({ ...row, current_tool_index: 1 }, child, Date.now());
  assert(d2.kind === "child_terminal");
  assertEquals(d2.moreTools, false);
});

Deno.test("decide: every run-quality-batch terminal status is recognized", () => {
  const row: BatchRow = { ...baseRow, phase: "running_tool", current_quality_run_id: "abc" };
  for (const s of ["complete", "error", "cancelled"]) {
    const child: ChildSnapshot = {
      status: s, last_heartbeat_at: new Date().toISOString(),
      score_overall: null, gpt_score_overall: null, error: null, run_number: null,
    };
    const d = decide(row, child, Date.now());
    assertEquals(d.kind, "child_terminal", `expected terminal for status=${s}`);
  }
});

Deno.test("decide: stale heartbeat past 6min → child_stalled", () => {
  const row: BatchRow = { ...baseRow, phase: "running_tool", current_quality_run_id: "abc" };
  const now = Date.now();
  const child: ChildSnapshot = {
    status: "building",
    last_heartbeat_at: new Date(now - (CHILD_STALL_MS + 1000)).toISOString(),
    score_overall: null, gpt_score_overall: null, error: null, run_number: null,
  };
  const d = decide(row, child, now);
  assertEquals(d.kind, "child_stalled");
});

Deno.test("decide: fresh heartbeat → child_wait", () => {
  const row: BatchRow = { ...baseRow, phase: "running_tool", current_quality_run_id: "abc" };
  const now = Date.now();
  const child: ChildSnapshot = {
    status: "building",
    last_heartbeat_at: new Date(now - 5_000).toISOString(),
    score_overall: null, gpt_score_overall: null, error: null, run_number: null,
  };
  const d = decide(row, child, now);
  assertEquals(d.kind, "child_wait");
});
