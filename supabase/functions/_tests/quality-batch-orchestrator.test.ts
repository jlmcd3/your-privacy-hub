// QB-P1 + QB-P7 regression coverage for quality-batch-orchestrator's pure
// pieces. No live network calls — exercises slug validation, terminal-status
// set, stall threshold, and the wave-aware decide() transition function only.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  RUN_QUALITY_BATCH_SLUGS,
  RUN_QUALITY_BATCH_TERMINAL,
  CHILD_STALL_MS,
  DEFAULT_CONCURRENCY,
  MAX_CONCURRENCY,
  WAVE_STAGGER_MS,
  clampConcurrency,
  decide,
  buildSeedRow,
  inFlightEntries,
  type BatchRow,
  type ChildSnapshot,
} from "../quality-batch-orchestrator/index.ts";


Deno.test("slug set matches the run-quality-batch slugs exactly", () => {
  const expected = new Set([
    "cppa-admt", "cppa-risk", "cppa-cyber",
    "governance", "dpia", "lia",
    "dpa-generator", "ir-playbook", "biometric-checker",
    "registration",
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

Deno.test("QB-P7: wave defaults and bounds", () => {
  assertEquals(DEFAULT_CONCURRENCY, 3);
  assertEquals(MAX_CONCURRENCY, 5);
  assertEquals(WAVE_STAGGER_MS, 10_000);
  assertEquals(clampConcurrency(undefined), DEFAULT_CONCURRENCY);
  assertEquals(clampConcurrency(null), DEFAULT_CONCURRENCY);
  assertEquals(clampConcurrency(0), DEFAULT_CONCURRENCY);
  assertEquals(clampConcurrency(-4), DEFAULT_CONCURRENCY);
  assertEquals(clampConcurrency(1), 1);
  assertEquals(clampConcurrency(3), 3);
  assertEquals(clampConcurrency(5), 5);
  // Clamps above MAX_CONCURRENCY.
  assertEquals(clampConcurrency(9), 5);
  assertEquals(clampConcurrency("2"), 2);
});

const emptySnapshots = new Map<string, ChildSnapshot>();

const baseRow: BatchRow = {
  status: "running",
  phase: "kickoff",
  cancel_requested: false,
  tools: ["governance", "dpia"],
  current_tool_index: 0,
  current_quality_run_id: null,
  tool_results: [],
  concurrency: 1,
};

Deno.test("decide: non-running row is a no-op", () => {
  const d = decide({ ...baseRow, status: "complete" }, emptySnapshots, Date.now());
  assertEquals(d.kind, "noop");
});

Deno.test("decide: cancel_requested short-circuits to cancel_terminal", () => {
  const d = decide(
    { ...baseRow, cancel_requested: true, phase: "running_tool" },
    emptySnapshots,
    Date.now(),
  );
  assertEquals(d.kind, "cancel_terminal");
});

Deno.test("decide: kickoff advances phase", () => {
  const d = decide(baseRow, emptySnapshots, Date.now());
  assertEquals(d.kind, "advance_phase_running_tool");
});

Deno.test("decide (concurrency=1): running_tool with no in-flight dispatches one tool", () => {
  const d = decide(
    { ...baseRow, phase: "running_tool", concurrency: 1 },
    emptySnapshots,
    Date.now(),
  );
  assert(d.kind === "dispatch_wave");
  assertEquals(d.tools, ["governance"]);
  assertEquals(d.startIndex, 0);
});

Deno.test("QB-P7 decide (concurrency=3): first wave dispatches up to 3 tools", () => {
  const row: BatchRow = {
    ...baseRow,
    phase: "running_tool",
    tools: ["governance", "dpia", "lia", "cppa-risk"],
    concurrency: 3,
  };
  const d = decide(row, emptySnapshots, Date.now());
  assert(d.kind === "dispatch_wave");
  assertEquals(d.tools, ["governance", "dpia", "lia"]);
  assertEquals(d.startIndex, 0);
});

Deno.test("QB-P7 decide (concurrency>remaining): wave shrinks to remaining", () => {
  const row: BatchRow = {
    ...baseRow,
    phase: "running_tool",
    tools: ["governance", "dpia", "lia", "cppa-risk"],
    current_tool_index: 3,
    concurrency: 5,
  };
  const d = decide(row, emptySnapshots, Date.now());
  assert(d.kind === "dispatch_wave");
  assertEquals(d.tools, ["cppa-risk"]);
});

Deno.test("QB-P7 decide: terminal child in a wave triggers process_terminations", () => {
  const row: BatchRow = {
    ...baseRow,
    phase: "running_tool",
    concurrency: 2,
    tool_results: [
      { tool: "governance", quality_run_id: "run-a", final_status: "in_flight" },
      { tool: "dpia",       quality_run_id: "run-b", final_status: "in_flight" },
    ] as unknown[],
    current_tool_index: 2,
  };
  const snapshots = new Map<string, ChildSnapshot>([
    ["run-a", {
      status: "complete", last_heartbeat_at: new Date().toISOString(),
      score_overall: 88, gpt_score_overall: 84, error: null, run_number: 12,
    }],
    ["run-b", {
      status: "building", last_heartbeat_at: new Date().toISOString(),
      score_overall: null, gpt_score_overall: null, error: null, run_number: 4,
    }],
  ]);
  const d = decide(row, snapshots, Date.now());
  assert(d.kind === "process_terminations");
  assertEquals(d.terminations.length, 1);
  assertEquals(d.terminations[0].runId, "run-a");
  assertEquals(d.terminations[0].stalled, false);
});

Deno.test("QB-P7 decide: wave stays 'wait' while any child is still live", () => {
  const row: BatchRow = {
    ...baseRow,
    phase: "running_tool",
    concurrency: 2,
    tool_results: [
      { tool: "governance", quality_run_id: "run-a", final_status: "in_flight" },
      { tool: "dpia",       quality_run_id: "run-b", final_status: "in_flight" },
    ] as unknown[],
    current_tool_index: 2,
  };
  const snapshots = new Map<string, ChildSnapshot>([
    ["run-a", {
      status: "building", last_heartbeat_at: new Date().toISOString(),
      score_overall: null, gpt_score_overall: null, error: null, run_number: 1,
    }],
    ["run-b", {
      status: "building", last_heartbeat_at: new Date().toISOString(),
      score_overall: null, gpt_score_overall: null, error: null, run_number: 2,
    }],
  ]);
  const d = decide(row, snapshots, Date.now());
  assertEquals(d.kind, "wait");
});

Deno.test("QB-P7 decide: next wave only after ALL prior wave children reach terminal", () => {
  // Wave 1 fully drained: both entries carry terminal statuses (no in_flight).
  const row: BatchRow = {
    ...baseRow,
    phase: "running_tool",
    concurrency: 2,
    tools: ["governance", "dpia", "lia"],
    current_tool_index: 2,
    tool_results: [
      { tool: "governance", quality_run_id: "run-a", final_status: "complete" },
      { tool: "dpia",       quality_run_id: "run-b", final_status: "complete" },
    ] as unknown[],
  };
  const d = decide(row, emptySnapshots, Date.now());
  assert(d.kind === "dispatch_wave");
  assertEquals(d.tools, ["lia"]);
});

Deno.test("QB-P7 decide: all tools terminated → finalize", () => {
  const row: BatchRow = {
    ...baseRow,
    phase: "running_tool",
    concurrency: 2,
    current_tool_index: 2,
    tool_results: [
      { tool: "governance", quality_run_id: "run-a", final_status: "complete" },
      { tool: "dpia",       quality_run_id: "run-b", final_status: "error"    },
    ] as unknown[],
  };
  const d = decide(row, emptySnapshots, Date.now());
  assertEquals(d.kind, "finalize");
});

Deno.test("QB-P7 decide: every run-quality-batch terminal status is recognized", () => {
  for (const s of ["complete", "error", "cancelled"]) {
    const row: BatchRow = {
      ...baseRow,
      phase: "running_tool",
      concurrency: 1,
      tool_results: [{ tool: "governance", quality_run_id: "run-x", final_status: "in_flight" }] as unknown[],
      current_tool_index: 1,
    };
    const snapshots = new Map<string, ChildSnapshot>([
      ["run-x", {
        status: s, last_heartbeat_at: new Date().toISOString(),
        score_overall: null, gpt_score_overall: null, error: null, run_number: 1,
      }],
    ]);
    const d = decide(row, snapshots, Date.now());
    assert(d.kind === "process_terminations", `expected process_terminations for ${s}`);
    assertEquals(d.terminations[0].stalled, false);
  }
});

Deno.test("QB-P7 decide: stale heartbeat past 6min → stalled termination (wedge-guard preserved)", () => {
  const now = Date.now();
  const row: BatchRow = {
    ...baseRow,
    phase: "running_tool",
    concurrency: 2,
    current_tool_index: 2,
    tool_results: [
      { tool: "governance", quality_run_id: "run-a", final_status: "in_flight" },
      { tool: "dpia",       quality_run_id: "run-b", final_status: "in_flight" },
    ] as unknown[],
  };
  const snapshots = new Map<string, ChildSnapshot>([
    ["run-a", {
      status: "building",
      last_heartbeat_at: new Date(now - (CHILD_STALL_MS + 1000)).toISOString(),
      score_overall: null, gpt_score_overall: null, error: null, run_number: 1,
    }],
    ["run-b", {
      status: "building",
      last_heartbeat_at: new Date(now - 5_000).toISOString(),
      score_overall: null, gpt_score_overall: null, error: null, run_number: 2,
    }],
  ]);
  const d = decide(row, snapshots, now);
  assert(d.kind === "process_terminations");
  assertEquals(d.terminations.length, 1);
  assertEquals(d.terminations[0].runId, "run-a");
  assertEquals(d.terminations[0].stalled, true);
});

Deno.test("QB-P7 inFlightEntries filters malformed rows", () => {
  const row: BatchRow = {
    ...baseRow,
    tool_results: [
      { tool: "a", quality_run_id: "r1", final_status: "in_flight" },
      { tool: "b", quality_run_id: "r2", final_status: "complete" },
      { tool: "c", final_status: "in_flight" },                  // missing id
      null,
      { tool: "d", quality_run_id: 42, final_status: "in_flight" }, // bad id type
    ] as unknown[],
  };
  const out = inFlightEntries(row);
  assertEquals(out.length, 1);
  assertEquals(out[0].quality_run_id, "r1");
});

Deno.test("ChildSnapshot type carries run_number (compile-time)", () => {
  const snap: ChildSnapshot = {
    status: "complete", last_heartbeat_at: null,
    score_overall: null, gpt_score_overall: null, error: null,
    run_number: 42,
  };
  assertEquals(snap.run_number, 42);
});

Deno.test("buildSeedRow: exact key set and values match run-quality-batch insert", () => {
  const nowIso = "2026-07-15T00:00:00.000Z";
  const row = buildSeedRow("governance", 5, 7, "admin-uuid", nowIso);
  assertEquals(
    Object.keys(row).sort(),
    ["batch_size", "created_by", "grader_context_version", "last_heartbeat_at",
     "next_doc_index", "run_number", "started_at", "status", "tool", "user_id"],
  );
  assertEquals(row.tool, "governance");
  assertEquals(row.status, "pending");
  assertEquals(row.batch_size, 5);
  assertEquals(row.run_number, 7);
  assertEquals(row.created_by, "admin-uuid");
  assertEquals(row.user_id, "admin-uuid");
  assertEquals(row.started_at, nowIso);
  assertEquals(row.last_heartbeat_at, nowIso);
  assertEquals(row.next_doc_index, 0);
});

// ─── QB-P9 campaign-mode tests ────────────────────────────────────────────
import {
  applyStopRule,
  decideCampaignTick,
  CAMPAIGN_CERTIFIED_STREAK,
  CAMPAIGN_MAX_RUNS,
  type CampaignRowLite,
  type CampaignToolState,
} from "../quality-batch-orchestrator/index.ts";

const seed: CampaignToolState = {
  batch_size: 3, max_runs: 10, runs_completed: 0,
  consecutive_ge98: 0, active: true, retired_reason: null,
};

Deno.test("QB-P9 stop-rule: two consecutive scores ≥98 retires with reason=certified", () => {
  const s1 = applyStopRule(seed, 98);
  assertEquals(s1.active, true);
  assertEquals(s1.consecutive_ge98, 1);
  assertEquals(s1.runs_completed, 1);
  const s2 = applyStopRule(s1, 99);
  assertEquals(s2.active, false);
  assertEquals(s2.retired_reason, "certified");
  assertEquals(s2.consecutive_ge98, CAMPAIGN_CERTIFIED_STREAK);
});

Deno.test("QB-P9 stop-rule: 98 then 97 resets the streak, does not retire", () => {
  const s1 = applyStopRule(seed, 98);
  const s2 = applyStopRule(s1, 97);
  assertEquals(s2.active, true);
  assertEquals(s2.consecutive_ge98, 0);
  assertEquals(s2.runs_completed, 2);
  assertEquals(s2.retired_reason, null);
});

Deno.test("QB-P9 stop-rule: 10th run below streak retires with reason=max_runs", () => {
  let s = seed;
  for (let i = 0; i < CAMPAIGN_MAX_RUNS - 1; i++) s = applyStopRule(s, 90);
  assertEquals(s.active, true);
  assertEquals(s.runs_completed, CAMPAIGN_MAX_RUNS - 1);
  s = applyStopRule(s, 90);
  assertEquals(s.active, false);
  assertEquals(s.retired_reason, "max_runs");
  assertEquals(s.runs_completed, CAMPAIGN_MAX_RUNS);
});

Deno.test("QB-P9 stop-rule: retired row is not mutated by further calls", () => {
  const retired: CampaignToolState = { ...seed, active: false, retired_reason: "certified" };
  const s = applyStopRule(retired, 100);
  assertEquals(s, retired);
});

const baseCampaign: CampaignRowLite = {
  id: "c1", status: "paused",
  budget_cap_cents: 60000, estimated_spend_cents: 0,
  wave_interval_minutes: 360, last_wave_started_at: null,
  tool_state: { governance: { ...seed } },
};

Deno.test("QB-P9 tick: does nothing when status='paused'", () => {
  const d = decideCampaignTick(baseCampaign, { hasInflight: false, nowMs: Date.now() });
  assertEquals(d.kind, "status_noop");
});

Deno.test("QB-P9 tick: does nothing when status='complete' or 'killed'", () => {
  for (const status of ["complete", "killed"] as const) {
    const d = decideCampaignTick({ ...baseCampaign, status }, { hasInflight: false, nowMs: Date.now() });
    assertEquals(d.kind, "status_noop");
  }
});

Deno.test("QB-P9 tick: no-double-wave guard — active + inflight → wave_in_flight", () => {
  const d = decideCampaignTick(
    { ...baseCampaign, status: "active" },
    { hasInflight: true, nowMs: Date.now() },
  );
  assertEquals(d.kind, "wave_in_flight");
});

Deno.test("QB-P9 tick: active + no inflight + interval elapsed → start_wave", () => {
  const now = Date.now();
  const d = decideCampaignTick(
    {
      ...baseCampaign, status: "active",
      last_wave_started_at: new Date(now - 361 * 60_000).toISOString(),
    },
    { hasInflight: false, nowMs: now },
  );
  assertEquals(d.kind, "start_wave");
});

Deno.test("QB-P9 tick: active + no inflight + interval NOT elapsed → interval_wait", () => {
  const now = Date.now();
  const d = decideCampaignTick(
    {
      ...baseCampaign, status: "active",
      last_wave_started_at: new Date(now - 10 * 60_000).toISOString(),
    },
    { hasInflight: false, nowMs: now },
  );
  assertEquals(d.kind, "interval_wait");
});

Deno.test("QB-P9 tick: active + spend ≥ cap → budget_paused", () => {
  const d = decideCampaignTick(
    { ...baseCampaign, status: "active", estimated_spend_cents: 60000 },
    { hasInflight: false, nowMs: Date.now() },
  );
  assertEquals(d.kind, "budget_paused");
});

Deno.test("QB-P9 tick: no active tools → complete", () => {
  const d = decideCampaignTick(
    {
      ...baseCampaign, status: "active",
      tool_state: { governance: { ...seed, active: false, retired_reason: "certified" } },
    },
    { hasInflight: false, nowMs: Date.now() },
  );
  assertEquals(d.kind, "complete");
});

Deno.test("QB-P9 tick: null campaign → no_campaign", () => {
  const d = decideCampaignTick(null, { hasInflight: false, nowMs: Date.now() });
  assertEquals(d.kind, "no_campaign");
});
