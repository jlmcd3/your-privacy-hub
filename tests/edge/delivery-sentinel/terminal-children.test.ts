// DS-T2d — all-children-terminal reap-branch tests.
// Exercises reapAllChildrenTerminal() with a fake admin client that mirrors
// the .from().select()/update()/eq()/is()/not()/maybeSingle() chains used by
// the impl. Covers: (a) wave-18 false-kill regression (children alive),
// (b) all-children-terminal reap, (c) mixed parent-fresh short-circuit,
// (d) fail-open on driver exception.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { reapAllChildrenTerminal } from "./index.ts";

const NOW_MS = new Date("2026-07-25T15:00:00.000Z").getTime();

function baseRow(overrides: Partial<any> = {}) {
  return {
    id: "contract-1",
    run_class: "harness" as const,
    user_id: null,
    tool: "cppa-admt",
    subject_table: "quality_batch_runs",
    subject_id: "batch-1",
    stage: "grade",
    // stage_deadline breached by default (5 min ago).
    stage_deadline_at: new Date(NOW_MS - 5 * 60 * 1000).toISOString(),
    overall_deadline_at: new Date(NOW_MS + 60 * 60 * 1000).toISOString(),
    heartbeat_at: new Date(NOW_MS - 6 * 60 * 1000).toISOString(),
    attempts: {},
    failure_class: null,
    checkpoint_ref: {},
    ...overrides,
  };
}

interface FakeState {
  batch: { last_heartbeat_at: string | null; status: string; phase: string } | null;
  batchErr?: { message: string } | null;
  kids: Array<{ id: string; status: string }>;
  kidsErr?: { message: string } | null;
  throwOnFrom?: boolean;
  captures: Array<{ table: string; op: string; patch?: any }>;
}

function fakeAdmin(state: FakeState) {
  return {
    from(table: string) {
      if (state.throwOnFrom) throw new Error("boom");
      const chain: any = {
        _table: table,
        _op: "select",
        select(_c?: string) { return chain; },
        update(p: any) {
          state.captures.push({ table, op: "update", patch: p });
          chain._op = "update";
          return chain;
        },
        eq(_k: string, _v: unknown) { return chain; },
        is(_k: string, _v: unknown) { return chain; },
        not(_k: string, _op: string, _v: unknown) { return chain; },
        in(_k: string, _v: unknown) { return chain; },
        async maybeSingle() {
          return { data: state.batch, error: state.batchErr ?? null };
        },
        // Awaiting the chain (for the `.eq("batch_id", ...)` select) resolves kids.
        then(resolve: any) {
          if (chain._op === "update") {
            resolve({ data: [{ id: "x" }], error: null });
          } else if (chain._table === "quality_runs") {
            resolve({ data: state.kids, error: state.kidsErr ?? null });
          } else {
            resolve({ data: null, error: null });
          }
        },
      };
      return chain;
    },
  };
}

Deno.test("DS-T2d — regression: children ALIVE (in-flight) → NO reap, no updates", async () => {
  const state: FakeState = {
    batch: { last_heartbeat_at: new Date(NOW_MS - 10 * 60 * 1000).toISOString(), status: "running", phase: "grading" },
    kids: [
      { id: "k1", status: "building" },  // in-flight
      { id: "k2", status: "complete" },
    ],
    captures: [],
  };
  const admin = fakeAdmin(state);
  const out = await reapAllChildrenTerminal(admin, baseRow(), NOW_MS);
  assertEquals(out.acted, false);
  assert(String(out.reason).startsWith("children_in_flight"), `reason=${out.reason}`);
  // No update() calls.
  assertEquals(state.captures.filter((c) => c.op === "update").length, 0);
});

Deno.test("DS-T2d — all children TERMINAL (wave-18 isolate-death shape) → reap fires; outcome follows children", async () => {
  const state: FakeState = {
    batch: { last_heartbeat_at: new Date(NOW_MS - 10 * 60 * 1000).toISOString(), status: "running", phase: "grading" },
    kids: [
      { id: "k1", status: "complete" },
      { id: "k2", status: "error" }, // any bad → cancelled
      { id: "k3", status: "complete" },
    ],
    captures: [],
  };
  const admin = fakeAdmin(state);
  const out = await reapAllChildrenTerminal(admin, baseRow(), NOW_MS);
  assertEquals(out.acted, true);
  assertEquals(out.outcome, "cancelled");
  assertEquals(out.child_count, 3);
  const updates = state.captures.filter((c) => c.op === "update");
  assertEquals(updates.length, 2);
  const batchPatch = updates.find((u) => u.table === "quality_batch_runs")!.patch;
  assertEquals(batchPatch.status, "cancelled");
  assertEquals(batchPatch.phase, "done");
  assert(String(batchPatch.last_error).includes("[ds-t2d-reap]"));
  const contractPatch = updates.find((u) => u.table === "delivery_contracts")!.patch;
  assertEquals(contractPatch.terminal_state, "harness_stalled");
  // NO attempt bump: patch must not carry an `attempts` field.
  assert(!("attempts" in contractPatch), "contract patch must not carry attempts");
});

Deno.test("DS-T2d — all children complete (clean) → reap fires with outcome=complete, no error text", async () => {
  const state: FakeState = {
    batch: { last_heartbeat_at: new Date(NOW_MS - 10 * 60 * 1000).toISOString(), status: "running", phase: "grading" },
    kids: [
      { id: "k1", status: "complete" },
      { id: "k2", status: "complete" },
    ],
    captures: [],
  };
  const admin = fakeAdmin(state);
  const out = await reapAllChildrenTerminal(admin, baseRow(), NOW_MS);
  assertEquals(out.acted, true);
  assertEquals(out.outcome, "complete");
  const contractPatch = state.captures.find((c) => c.table === "delivery_contracts" && c.op === "update")!.patch;
  assertEquals(contractPatch.terminal_state, "harness_completed_reaped");
  const batchPatch = state.captures.find((c) => c.table === "quality_batch_runs" && c.op === "update")!.patch;
  assertEquals(batchPatch.last_error, null);
});

Deno.test("DS-T2d — mixed: children terminal but parent heartbeat FRESH → NO reap (parent_hb_fresh)", async () => {
  const state: FakeState = {
    batch: { last_heartbeat_at: new Date(NOW_MS - 60 * 1000).toISOString(), status: "running", phase: "grading" },
    kids: [
      { id: "k1", status: "complete" },
      { id: "k2", status: "complete" },
    ],
    captures: [],
  };
  const admin = fakeAdmin(state);
  const out = await reapAllChildrenTerminal(admin, baseRow(), NOW_MS);
  assertEquals(out.acted, false);
  assert(String(out.reason).startsWith("parent_hb_fresh"), `reason=${out.reason}`);
  assertEquals(state.captures.filter((c) => c.op === "update").length, 0);
});

Deno.test("DS-T2d — stage deadline NOT breached → NO reap (short-circuit)", async () => {
  const state: FakeState = {
    batch: { last_heartbeat_at: null, status: "running", phase: "grading" },
    kids: [{ id: "k1", status: "complete" }],
    captures: [],
  };
  const admin = fakeAdmin(state);
  const row = baseRow({ stage_deadline_at: new Date(NOW_MS + 5 * 60 * 1000).toISOString() });
  const out = await reapAllChildrenTerminal(admin, row, NOW_MS);
  assertEquals(out.acted, false);
  assertEquals(out.reason, "stage_not_breached");
});

Deno.test("DS-T2d — non-batch subject → NO reap (guard)", async () => {
  const state: FakeState = { batch: null, kids: [], captures: [] };
  const admin = fakeAdmin(state);
  const out = await reapAllChildrenTerminal(admin, baseRow({ subject_table: "quality_loop2_runs" }), NOW_MS);
  assertEquals(out.acted, false);
  assertEquals(out.reason, "not_batch_subject");
});

Deno.test("DS-T2d — fail-open on driver exception (throw in .from)", async () => {
  const state: FakeState = { batch: null, kids: [], throwOnFrom: true, captures: [] };
  const admin = fakeAdmin(state);
  const out = await reapAllChildrenTerminal(admin, baseRow(), NOW_MS);
  assertEquals(out.acted, false);
  assert(String(out.reason).startsWith("exception:boom"), `reason=${out.reason}`);
});
