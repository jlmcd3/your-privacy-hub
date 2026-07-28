/**
 * T-M3 (Item 223) — Harvest subordination guard tests.
 * Pure; no I/O. Exercises both keys and every rejection reason.
 */
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { RenderPlan } from "../render-plan/schema.ts";
import {
  evaluateHarvest,
  evaluateOpeningHarvest,
  evaluateSubmissionHarvest,
  HARVEST_GUARD_VERSION,
} from "./harvest-guard.ts";
import {
  renderCyberAuditSchedule,
  SCHEDULE_MARKER,
} from "./cyber-audit-schedule.ts";

// Minimal plan factory: only the fields the guard reads.
function makePlan(over: Partial<RenderPlan> = {}): RenderPlan {
  return {
    plan_version: "v1",
    product: "cppa_risk_assessment",
    build_stamp: "test",
    jurisdiction_tag: "cppa-ca",
    intake_ledger: [
      { ledger_id: "L.revenue", intake_field: "q1_revenue", value: "Over $100M", display: "Over $100M" },
      { ledger_id: "L.entity", intake_field: "entity_name", value: "Acme Inc.", display: "Acme Inc." },
    ],
    citation_bindings: [],
    propositions: [],
    factor_table: [],
    weighing_frame: [],
    gate_outcomes: [],
    conservative_write_around: null as unknown as RenderPlan["conservative_write_around"],
    ...(over as object),
  } as unknown as RenderPlan;
}

Deno.test("harvest-guard: version stamp", () => {
  assertEquals(HARVEST_GUARD_VERSION, "harvest-guard@2026-07-28-tm3");
});

// ── opening_summary ─────────────────────────────────────────────────

Deno.test("opening: missing/empty artifact → rejected", () => {
  const d = evaluateOpeningHarvest(null, makePlan());
  assertEquals(d.accepted, false);
  assertEquals(d.telemetry.rejection_reason, "harvest_missing_or_empty");
});

Deno.test("opening: leak-lexicon hit (e.g. {{intake: token) → rejected + telemetered", () => {
  const d = evaluateOpeningHarvest(
    { text: "Acme is a covered business under {{intake:L.revenue}}." },
    makePlan(),
  );
  assertEquals(d.accepted, false);
  assertEquals(d.telemetry.rejection_reason, "harvest_value_screen_hit");
  assert(d.telemetry.evidence.some((e) => e.includes("leak-lexicon")));
});

Deno.test("opening: truncated-slot value ('We') → rejected", () => {
  const d = evaluateOpeningHarvest({ text: "We" }, makePlan());
  assertEquals(d.accepted, false);
  assertEquals(d.telemetry.rejection_reason, "harvest_value_screen_hit");
  assert(d.telemetry.evidence.some((e) => e.startsWith("truncated-slot-value:")));
});

Deno.test("opening: intake ref outside plan ledger → rejected (SUBORDINATION)", () => {
  const d = evaluateOpeningHarvest(
    {
      text: "Acme Inc. is a covered business under the CCPA.",
      provenance: {
        version: "t7",
        s0_criteria: [],
        s1_triggers: [],
        omitted: [],
        sources: { S1: "q99_never_in_ledger" },
        s0_b_rejected_reason: null,
      },
    },
    makePlan(),
  );
  assertEquals(d.accepted, false);
  assertEquals(d.telemetry.rejection_reason, "harvest_intake_ref_not_in_plan_ledger");
  assert(d.telemetry.evidence[0].includes("q99_never_in_ledger"));
});

Deno.test("opening: S0 asserts (A) but plan Type-R polarity=not_applicable → rejected", () => {
  const plan = makePlan({
    propositions: [
      {
        id: "R1",
        conclusion_id: "C.applicability.A",
        epistemic_type: "R",
        jurisdiction_tag: "cppa-ca",
        polarity: "not_applicable",
        anchor: { pinpoint: "Civ. Code § 1798.140(d)(1)(A)" } as unknown as RenderPlan["propositions"][number]["anchor"],
        intake_ledger_refs: [],
        citation_binding_refs: [],
      } as unknown as RenderPlan["propositions"][number],
    ],
  });
  const d = evaluateOpeningHarvest(
    {
      text: "Acme Inc. is a covered business under the CCPA on the record provided.",
      provenance: {
        version: "t7",
        s0_criteria: ["A"],
        s1_triggers: [],
        omitted: [],
        sources: { S1: "entity_name" },
        s0_b_rejected_reason: null,
      },
    },
    plan,
  );
  assertEquals(d.accepted, false);
  assertEquals(
    d.telemetry.rejection_reason,
    "harvest_criterion_conflicts_plan_propositions",
  );
});

Deno.test("opening: clean artifact grounded in ledger + no conflict → ACCEPTED", () => {
  const d = evaluateOpeningHarvest(
    {
      text: "Acme Inc. is a covered business subject to the CCPA on the record provided.",
      provenance: {
        version: "t7",
        s0_criteria: ["A"],
        s1_triggers: [],
        omitted: [],
        sources: { S1: "entity_name", S2: "q1_revenue" },
        s0_b_rejected_reason: null,
      },
    },
    makePlan(),
  );
  assertEquals(d.accepted, true);
  assertEquals(d.telemetry.rejection_reason, null);
});

// ── submission_summary (§ 7121(a) phase-in schedule) ────────────────

Deno.test("submission: missing/empty → rejected", () => {
  const d = evaluateSubmissionHarvest(null, makePlan());
  assertEquals(d.accepted, false);
  assertEquals(d.telemetry.rejection_reason, "harvest_missing_or_empty");
});

Deno.test("submission: missing SCHEDULE_MARKER → rejected", () => {
  const d = evaluateSubmissionHarvest(
    { text: "April 1, 2028. April 1, 2029. April 1, 2030." },
    makePlan(),
  );
  assertEquals(d.accepted, false);
  assertEquals(d.telemetry.rejection_reason, "harvest_missing_schedule_marker");
});

Deno.test("submission: tier deadline stripped → rejected as tampered", () => {
  const good = renderCyberAuditSchedule();
  const tampered = good.replace("April 1, 2029", "TBD");
  const d = evaluateSubmissionHarvest({ text: tampered }, makePlan());
  assertEquals(d.accepted, false);
  assertEquals(d.telemetry.rejection_reason, "harvest_schedule_literal_tampered");
});

Deno.test("submission: customer-specific cohort attribution → rejected (Item-204 law)", () => {
  const good = renderCyberAuditSchedule();
  const bad = good + " Your cohort deadline is April 1, 2028.";
  const d = evaluateSubmissionHarvest({ text: bad }, makePlan());
  assertEquals(d.accepted, false);
  assertEquals(
    d.telemetry.rejection_reason,
    "harvest_states_customer_specific_cohort",
  );
});

Deno.test("submission: verbatim renderCyberAuditSchedule() output → ACCEPTED", () => {
  const d = evaluateSubmissionHarvest({ text: renderCyberAuditSchedule() }, makePlan());
  assertEquals(d.accepted, true, `unexpected reject: ${d.telemetry.rejection_reason}`);
  assert(renderCyberAuditSchedule().includes(SCHEDULE_MARKER));
});

Deno.test("dispatch: unknown key → rejected with kind_unrecognized", () => {
  const d = evaluateHarvest(
    "not_a_real_key" as unknown as "opening_summary",
    { text: "x" },
    makePlan(),
  );
  assertEquals(d.accepted, false);
  assertEquals(d.telemetry.rejection_reason, "harvest_kind_unrecognized");
});
