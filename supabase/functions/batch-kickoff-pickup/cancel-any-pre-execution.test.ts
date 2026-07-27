// QBP25 — cancel-any-pre-execution law (LTP §17).
// A cancel_requested=true row that has not reached phase='running_tool' is
// finalized to cancelled/done on sight, in ANY pre-execution status
// ('queued/starting', 'running/kickoff', etc.). Zombies that never enter the
// orchestrator loop would otherwise never honor their cancel flag.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decidePickup, PICKUP_STALE_MS } from "./index.ts";

const NOW_MS = new Date("2026-07-27T03:30:00.000Z").getTime();
const STALE = new Date(NOW_MS - (PICKUP_STALE_MS + 60_000)).toISOString();

Deno.test("QBP25 — queued/starting zombie with cancel_requested=true → cancel_finalize", () => {
  const d = decidePickup([
    { id: "z1", status: "queued", phase: "starting", cancel_requested: true,
      last_heartbeat_at: STALE, started_at: STALE },
  ], NOW_MS);
  assertEquals(d.kind, "cancel_finalize");
  if (d.kind === "cancel_finalize") {
    assertEquals(d.run_id, "z1");
    assertEquals(d.phase, "starting");
    assertEquals(d.status, "queued");
  }
});

Deno.test("QBP25 — running/kickoff with cancel_requested=true → cancel_finalize (not kick, not reap)", () => {
  const d = decidePickup([
    { id: "k1", status: "running", phase: "kickoff", cancel_requested: true,
      last_heartbeat_at: STALE, started_at: STALE },
  ], NOW_MS);
  assertEquals(d.kind, "cancel_finalize");
});

Deno.test("QBP25 — running/running_tool with cancel_requested=true → NOT finalized here (orchestrator honors mid-loop)", () => {
  const d = decidePickup([
    { id: "r1", status: "running", phase: "running_tool", cancel_requested: true,
      last_heartbeat_at: STALE, started_at: STALE },
  ], NOW_MS);
  // A live-advancing row causes single_flight_skip; the orchestrator loop
  // itself is responsible for honoring cancel once phase reaches running_tool.
  assertEquals(d.kind, "single_flight_skip");
});

Deno.test("QBP25 — terminal row with cancel_requested=true → no-op (never finalized twice)", () => {
  const d = decidePickup([
    { id: "t1", status: "cancelled", phase: "done", cancel_requested: true,
      last_heartbeat_at: STALE, started_at: STALE },
  ], NOW_MS);
  assertEquals(d.kind, "noop");
});

Deno.test("QBP25 — cancel_finalize takes priority over kick eligibility", () => {
  const d = decidePickup([
    { id: "cancel-me", status: "queued", phase: "starting", cancel_requested: true,
      last_heartbeat_at: STALE, started_at: STALE },
    { id: "kick-me", status: "running", phase: "kickoff", cancel_requested: false,
      last_heartbeat_at: STALE, started_at: STALE },
  ], NOW_MS);
  assertEquals(d.kind, "cancel_finalize");
  if (d.kind === "cancel_finalize") assertEquals(d.run_id, "cancel-me");
});

Deno.test("QBP25 — regression: no cancel_requested anywhere → existing kick/reap/noop behavior unchanged", () => {
  const d = decidePickup([
    { id: "k1", status: "running", phase: "kickoff",
      last_heartbeat_at: STALE, started_at: STALE },
  ], NOW_MS);
  assertEquals(d.kind, "kick");
});
