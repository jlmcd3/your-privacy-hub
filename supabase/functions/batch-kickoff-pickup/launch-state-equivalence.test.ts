// QBP26 — Launch-state equivalence law (LTP §18).
// Both canonical pre-execution shapes are picked up equivalently:
//   (A) status='running',  phase='kickoff'
//   (B) status='queued',   phase='starting'
// Root cause under repair: Wave-C batch 2a3c07a2 and zombie 9c1e3a8f stalled
// because inserts landed in shape (B) while the picker only served shape (A).

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decidePickup, isKickoffEligible, PICKUP_STALE_MS } from "./index.ts";

const NOW_MS = new Date("2026-07-27T03:30:00.000Z").getTime();
const STALE = new Date(NOW_MS - (PICKUP_STALE_MS + 60_000)).toISOString();

Deno.test("§18 — both canonical shapes are kickoff-eligible", () => {
  assertEquals(isKickoffEligible("running", "kickoff"), true);
  assertEquals(isKickoffEligible("queued", "starting"), true);
  assertEquals(isKickoffEligible("running", "running_tool"), false);
  assertEquals(isKickoffEligible("queued", "kickoff"), false);
  assertEquals(isKickoffEligible("running", "starting"), false);
});

Deno.test("§18 — queued/starting row past stale threshold → kick (not noop)", () => {
  const d = decidePickup([
    { id: "wave-c", status: "queued", phase: "starting",
      last_heartbeat_at: STALE, started_at: STALE },
  ], NOW_MS);
  assertEquals(d.kind, "kick");
  if (d.kind === "kick") assertEquals(d.run_id, "wave-c");
});

Deno.test("§18 — queued/starting does NOT trigger single_flight_skip against running/kickoff peer", () => {
  const d = decidePickup([
    { id: "q1", status: "queued", phase: "starting",
      last_heartbeat_at: STALE, started_at: STALE },
    { id: "k1", status: "running", phase: "kickoff",
      last_heartbeat_at: STALE, started_at: STALE },
  ], NOW_MS);
  // Neither is 'live' (advanced past kickoff); oldest kickoff-eligible wins.
  assertEquals(d.kind, "kick");
});

Deno.test("§18 — running/running_tool peer blocks queued/starting pickup (single-flight)", () => {
  const d = decidePickup([
    { id: "live", status: "running", phase: "running_tool",
      last_heartbeat_at: STALE, started_at: STALE },
    { id: "wait", status: "queued", phase: "starting",
      last_heartbeat_at: STALE, started_at: STALE },
  ], NOW_MS);
  assertEquals(d.kind, "single_flight_skip");
});

Deno.test("§18 — queued/starting past 30min → reap (parity with running/kickoff)", () => {
  const REAP_STALE = new Date(NOW_MS - (31 * 60_000)).toISOString();
  const d = decidePickup([
    { id: "old", status: "queued", phase: "starting",
      last_heartbeat_at: REAP_STALE, started_at: REAP_STALE },
  ], NOW_MS);
  assertEquals(d.kind, "reap");
});
