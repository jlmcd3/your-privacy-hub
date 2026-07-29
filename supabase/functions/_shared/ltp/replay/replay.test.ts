/**
 * ITEM 253 — TRACK 2 / SPEC §7.1: REPLAY HARNESS Stage A tests.
 *
 * DETERMINISTIC-PROVIDER TESTS ONLY. modelProvider MUST NOT be invoked
 * in this suite — Stage A ships without live LLM calls. A module-scope
 * call counter (_modelProviderCallCount_get) enforces this at test time.
 *
 * The deterministic path is pipeline-smoke-only (Ruling A). Substance
 * gates are EXPECTED to hard-fail because pickFactorTable pins
 * present_in_intake:false by design. A zero-hard-failure result on this
 * path means the harness lost its teeth.
 */
import {
  assert,
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  deterministicProvider,
  DETERMINISTIC_PROVIDER_KIND,
  _modelProviderCallCount_get,
  _modelProviderCallCount_reset,
} from "./providers.ts";
import { runReplayBatch, runReplayDoc } from "./runner.ts";
import { compareDoc } from "./side-by-side.ts";
import type { ReplayDoc } from "./types.ts";

_modelProviderCallCount_reset();

// Reused from grader-check-mirror.test.ts (Item 248 / ClearPath).
const REAL_INTAKE: Record<string, unknown> = {
  q3_sector: "Financial services",
  q1_revenue: "$100M–$500M",
  q9_opt_out: "Yes, but in footer only",
  entity_name: "ClearPath Credit Solutions, Inc.",
  q18_admt_use: "Yes",
  q2_consumers: "250,000–1 million",
  q5_sell_share: "Yes — share for advertising only",
  q15c_spi_volume: "50,000 or more",
  q15_sensitive_pi: "Yes",
  q20_admt_opt_out: "No",
  q4_pi_categories: ["Contact identifiers (name, email, phone)"],
  q8_right_correct: "Handled via support",
  q11_policy_review: "Within 12 months",
  q13_notice_content: "Yes, all three",
  q18b_admt_training: "Yes — training ADMT for significant decisions",
  q10_id_verification: "Documented verification process matching CPPA guidance",
  q14_employee_notice: "Yes",
  q16_sensitive_limit: 'Yes, with a separate "Limit the Use of My Sensitive PI" link',
  q17_sensitive_basis: "Necessary for the service",
  q5c_share_revenue_50pct: "No",
  i1_processing_purpose: "Underwrite loan applications.",
  i2_retention_period: "Approved loans: 7 years.",
  i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
  q12_notice_at_collection: "Yes, covers all collection points",
  q5b_profiling_observation: "No",
  q6_right_know: "Available via Privacy Center.",
  q7_right_delete: "Manual process, documented",
  q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
};

const CLEARPATH_DOC: ReplayDoc = {
  doc_id: "clearpath-real-intake",
  intake_data: REAL_INTAKE,
};

Deno.test("harness has teeth: deterministic-provider run on real intake yields non-empty golden-shape hard failures", async () => {
  const r = await runReplayDoc(
    CLEARPATH_DOC,
    deterministicProvider,
    DETERMINISTIC_PROVIDER_KIND,
  );
  assert(
    r.hard_failures.length > 0,
    `Deterministic path is hollow by construction (Ruling A); harness must ` +
      `report ≥1 hard failure. Observed: ${JSON.stringify(r.hard_failures)}`,
  );
  assert(
    r.hard_failures.some((f) => f.startsWith("golden_shape:")),
    `golden_shape hard failure MUST be reported on deterministic path; ` +
      `observed: ${JSON.stringify(r.hard_failures)}`,
  );
});

Deno.test("presence_rate on deterministic path is 0 (pickFactorTable pins present_in_intake:false)", async () => {
  const r = await runReplayDoc(
    CLEARPATH_DOC,
    deterministicProvider,
    DETERMINISTIC_PROVIDER_KIND,
  );
  assertStrictEquals(
    r.substance.presence_rate,
    0,
    `presence_rate MUST read the real plan. Deterministic derive pins every ` +
      `factor to present_in_intake:false; a non-zero rate here means the metric ` +
      `is wired to the wrong source. Observed metric: ${JSON.stringify(r.substance)}`,
  );
  assertStrictEquals(r.substance.present_factor_count, 0);
});

Deno.test("runReplayBatch aggregates per-gate counts + presence-rate distribution correctly over 2 copies", async () => {
  const docs: ReplayDoc[] = [
    { ...CLEARPATH_DOC, doc_id: "clearpath-copy-a" },
    { ...CLEARPATH_DOC, doc_id: "clearpath-copy-b" },
  ];
  const agg = await runReplayBatch(
    docs,
    deterministicProvider,
    DETERMINISTIC_PROVIDER_KIND,
  );
  assertEquals(agg.docs.length, 2);
  assertEquals(agg.hard_failure_count, 2);
  // Every doc contributes ≥1 golden_shape failure.
  assert(
    (agg.per_gate_failure_counts["golden_shape"] ?? 0) >= 2,
    `per_gate_failure_counts must aggregate golden_shape ≥2; observed: ${
      JSON.stringify(agg.per_gate_failure_counts)
    }`,
  );
  // Distribution over [0, 0] collapses to zeros.
  assertStrictEquals(agg.presence_rate_distribution.min, 0);
  assertStrictEquals(agg.presence_rate_distribution.median, 0);
  assertStrictEquals(agg.presence_rate_distribution.max, 0);
  assertEquals(agg.side_by_side_rows.length, 0);
});

Deno.test("side-by-side compareDoc returns deltas and tolerates a missing legacy key", async () => {
  const per = await runReplayDoc(
    CLEARPATH_DOC,
    deterministicProvider,
    DETERMINISTIC_PROVIDER_KIND,
  );
  // Stub legacy report missing `next_steps` (a real 38-key schema key).
  const legacy: Record<string, unknown> = {
    executive_summary: "x".repeat(400),
    assessment_summary: { narrative: "y".repeat(400) },
    scope_and_triggers: new Array(6).fill("prong"),
    scope_confirmation: new Array(6).fill("prong"),
    risk_assessment_by_activity: new Array(2).fill("z".repeat(900)),
    priority_actions: new Array(4).fill("act"),
    strengthen_items: new Array(1).fill("s"),
    exception_analysis: new Array(1).fill("e"),
    record_sufficiency: new Array(1).fill("r"),
    information_needed: new Array(1).fill("i"),
    opening_summary: "o".repeat(400),
    submission_summary: "s".repeat(400),
    // next_steps intentionally omitted.
  };
  const row = compareDoc(per, legacy);
  assertEquals(row.doc_id, per.doc_id);
  assert(
    row.deltas.missing_legacy_keys.includes("legacy_key_missing:next_steps"),
    `compareDoc must record missing legacy keys, not throw. Observed: ${
      JSON.stringify(row.deltas.missing_legacy_keys)
    }`,
  );
  assertEquals(typeof row.deltas.review_flag_delta, "number");
  assertEquals(typeof row.deltas.shortfall_delta, "number");
});

Deno.test("STATIC ASSERTION — modelProvider was never invoked during Stage A suite", () => {
  // NOTE: this test must remain LAST in file order so it observes the
  // cumulative counter for the suite. modelProvider is Stage-B only,
  // gated on CEO release per docs/courier/ITEM253-REPLAY-HARNESS-DESIGN-2026-07-29.md.
  assertStrictEquals(
    _modelProviderCallCount_get(),
    0,
    "modelProvider is CEO-released; Stage A must not invoke it.",
  );
});
