// MC-S1b Task 9 — unit tests for the redeploy conflict-gate.
// Runs under Deno test. Uses a hand-rolled fake DB.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { detectRedeployConflicts, summariseConflicts, OVERRIDE_TOKEN } from "./redeploy-gate.ts";

function fakeDb(fixtures: Record<string, any[]>) {
  return {
    from(table: string) {
      const rows = fixtures[table] ?? [];
      const chain: any = {
        _rows: rows,
        select() { return chain; },
        not() { return chain; },
        in() { return chain; },
        limit() { return Promise.resolve({ data: chain._rows, error: null }); },
        is() { return chain; },
      };
      return chain;
    },
  };
}

Deno.test("redeploy-gate: clear database returns no conflicts", async () => {
  const db = fakeDb({
    quality_runs: [], quality_batch_runs: [], quality_loop3_batches: [], dpia_frameworks: [],
  });
  const conflicts = await detectRedeployConflicts(db);
  assertEquals(conflicts.length, 0);
});

Deno.test("redeploy-gate: in-flight batch produces a conflict", async () => {
  const db = fakeDb({
    quality_runs: [],
    quality_batch_runs: [{ id: "b1", status: "running", phase: "running_tool" }],
    quality_loop3_batches: [],
    dpia_frameworks: [],
  });
  const conflicts = await detectRedeployConflicts(db);
  assertEquals(conflicts.length, 1);
  assertEquals(conflicts[0].source, "quality_batch_runs");
});

Deno.test("redeploy-gate: dpia staging unit still pending is flagged once per row", async () => {
  const db = fakeDb({
    quality_runs: [], quality_batch_runs: [], quality_loop3_batches: [],
    dpia_frameworks: [
      { id: "d1", report_data: { _staging: { units: { u1: { status: "pending" }, u2: { status: "success" } } } } },
      { id: "d2", report_data: { _staging: { units: { u1: { status: "success" } } } } },
    ],
  });
  const conflicts = await detectRedeployConflicts(db);
  assertEquals(conflicts.length, 1);
  assertEquals(conflicts[0].source, "dpia_staging");
  assertEquals(conflicts[0].id, "d1");
});

Deno.test("redeploy-gate: summariseConflicts groups by source", () => {
  const s = summariseConflicts([
    { source: "quality_batch_runs", id: "a", detail: "" },
    { source: "quality_batch_runs", id: "b", detail: "" },
    { source: "dpia_staging", id: "c", detail: "" },
  ]);
  assertEquals(s.quality_batch_runs, 2);
  assertEquals(s.dpia_staging, 1);
});

Deno.test("redeploy-gate: OVERRIDE_TOKEN is the exact typed string", () => {
  assertEquals(OVERRIDE_TOKEN, "OVERRIDE-REDEPLOY");
});
