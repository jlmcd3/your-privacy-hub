// QB-P13 — stop-rule + resurrect unit tests.
//
// Covers three defects fixed in this courier:
//   1. applyStopRule must NOT increment runs_completed when claudeOverall
//      is null (errored/stalled child runs do not consume run slots).
//   2. applyStopRule must honor per-tool tool_state.max_runs (fallback to
//      CAMPAIGN_MAX_RUNS only when absent).
//   3. decideCampaignTick must return { kind: "resurrect" } when an in-flight
//      campaign batch has been idle beyond INFLIGHT_STALE_MS; a fresh
//      in-flight batch must still return { kind: "wave_in_flight" }.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyStopRule,
  decideCampaignTick,
  CAMPAIGN_MAX_RUNS,
  INFLIGHT_STALE_MS,
  type CampaignToolState,
  type CampaignRowLite,
} from "./index.ts";

const baseState = (over: Partial<CampaignToolState> = {}): CampaignToolState => ({
  batch_size: 3, max_runs: 6, runs_completed: 0, consecutive_ge98: 0,
  active: true, retired_reason: null, ...over,
});

Deno.test("applyStopRule: null score does not increment runs_completed", () => {
  const prev = baseState({ runs_completed: 2, consecutive_ge98: 1 });
  const next = applyStopRule(prev, null);
  assertEquals(next.runs_completed, 2, "runs_completed must not increment on null score");
  assertEquals(next.consecutive_ge98, 0, "streak must reset on non-passing outcome");
  assertEquals(next.active, true);
  assertEquals(next.retired_reason, null);
});

Deno.test("applyStopRule: per-tool max_runs=6 retires at 6", () => {
  let state = baseState({ max_runs: 6, runs_completed: 5, consecutive_ge98: 0 });
  state = applyStopRule(state, 80);
  assertEquals(state.runs_completed, 6);
  assertEquals(state.active, false);
  assertEquals(state.retired_reason, "max_runs");
});

Deno.test("applyStopRule: per-tool max_runs=6 is not overridden by CAMPAIGN_MAX_RUNS", () => {
  // With prior bug, tool would run to CAMPAIGN_MAX_RUNS (10). Guard here.
  assertEquals(CAMPAIGN_MAX_RUNS, 10);
  let state = baseState({ max_runs: 6, runs_completed: 0 });
  for (let i = 0; i < 6; i++) state = applyStopRule(state, 70);
  assertEquals(state.runs_completed, 6);
  assertEquals(state.active, false, "must retire at per-tool cap 6, not the campaign cap");
  assertEquals(state.retired_reason, "max_runs");
});

Deno.test("applyStopRule: fallback to CAMPAIGN_MAX_RUNS when max_runs missing/zero", () => {
  let state = baseState({ max_runs: 0 as unknown as number, runs_completed: 9 });
  state = applyStopRule(state, 70);
  assertEquals(state.runs_completed, 10);
  assertEquals(state.retired_reason, "max_runs");
});

const activeCampaign = (over: Partial<CampaignRowLite> = {}): CampaignRowLite => ({
  id: "camp-1",
  status: "active",
  budget_cap_cents: 60000,
  estimated_spend_cents: 0,
  wave_interval_minutes: 120,
  last_wave_started_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  tool_state: { lia: baseState() },
  ...over,
});

Deno.test("decideCampaignTick: stale in-flight batch → resurrect", () => {
  const now = Date.now();
  const staleMs = now - (INFLIGHT_STALE_MS + 60_000); // 11 min ago
  const d = decideCampaignTick(activeCampaign(), {
    hasInflight: true, nowMs: now,
    inflightBatchId: "batch-stale", inflightUpdatedAtMs: staleMs,
  });
  assertEquals(d.kind, "resurrect");
  if (d.kind === "resurrect") assertEquals(d.batchId, "batch-stale");
});

Deno.test("decideCampaignTick: fresh in-flight batch → wave_in_flight", () => {
  const now = Date.now();
  const freshMs = now - 60_000; // 1 min ago
  const d = decideCampaignTick(activeCampaign(), {
    hasInflight: true, nowMs: now,
    inflightBatchId: "batch-fresh", inflightUpdatedAtMs: freshMs,
  });
  assertEquals(d.kind, "wave_in_flight");
});

Deno.test("decideCampaignTick: in-flight with no heartbeat data stays wave_in_flight (conservative)", () => {
  const d = decideCampaignTick(activeCampaign(), {
    hasInflight: true, nowMs: Date.now(),
    inflightBatchId: "batch-x", inflightUpdatedAtMs: null,
  });
  assertEquals(d.kind, "wave_in_flight");
});
