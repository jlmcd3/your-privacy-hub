/**
 * ITEM 241.1 — structural-fixes joint test.
 *
 * (E1) Scope emits with per-prong subjects AND engaged prongs LEAD.
 * (E2) `aggregateBalance` insufficiency is derived from documentation
 *      gates alone. Absent factors alone do NOT trigger insufficient.
 * (Q1) `evaluateGoldenShape` flags shortfalls and never mutates the
 *      report; the assembler surfaces the report under exit_checks.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { composeSection, aggregateBalance } from "../../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";
import { assembleReport } from "../../../../supabase/functions/_shared/ltp/pass2-assembler.ts";
import {
  CPPA_RISK_GOLDEN_QUOTAS,
  evaluateGoldenShape,
} from "../../../../supabase/functions/_shared/ltp/golden-shape-quotas.ts";
import type { RenderPlan } from "../../../../supabase/functions/_shared/render-plan/schema.ts";

function planWithGateOutcomes(gates: RenderPlan["gate_outcomes"]): RenderPlan {
  return {
    plan_version: "v1",
    product: "cppa-risk-assessment",
    build_stamp: "item241-1@test",
    jurisdiction_tag: "cppa-ca",
    intake_ledger: [],
    citation_bindings: [],
    propositions: [],
    factor_table: [],
    weighing_frame: [],
    gate_outcomes: gates,
    conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
  };
}

Deno.test("241.1 (E1): scope_and_triggers emits six instances and engaged prongs LEAD", () => {
  const plan = derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "yes",
      // ITEM 272 — engage § 7150(b)(4) systematic-observation via the
      // real intake enum value (draft-era q_extensive_profiling retired).
      q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
    },
    report_data: {},
    buildStamp: "item241-1@test",
  });
  const scope = composeSection("scope_and_triggers", plan)!
    .filter((i) => !i.template_id.startsWith("T.risk.section_opener."));
  assertEquals(scope.length, 6, "must emit one instance per § 7150(b) prong"); // ITEM 272: six prongs
  const engagedIndices: number[] = [];
  const notEngagedIndices: number[] = [];
  scope.forEach((i, idx) => {
    if (i.template_id === "T.risk.applicability.engaged") engagedIndices.push(idx);
    else notEngagedIndices.push(idx);
  });
  if (engagedIndices.length > 0 && notEngagedIndices.length > 0) {
    const lastEngaged = Math.max(...engagedIndices);
    const firstNotEngaged = Math.min(...notEngagedIndices);
    assert(
      lastEngaged < firstNotEngaged,
      `engaged prongs must lead: engaged=${engagedIndices}, not_engaged=${notEngagedIndices}`,
    );
  }
  for (const i of scope) {
    const subj = (i.ctx as { prong_subject?: string }).prong_subject ?? "";
    assert(subj.length > 0, "every instance must carry a prong_subject");
  }
});


Deno.test("241.1 (E1): scope shards emit in the shipped report (fill-or-omit no longer trips prong_subject)", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more", q18_admt_use: "no" },
    report_data: {},
    buildStamp: "item241-1@test",
  });
  const out = assembleReport(plan);
  assert(Array.isArray(out.report.scope_and_triggers), "scope_and_triggers must ship as an array");
  assert((out.report.scope_and_triggers as unknown[]).length >= 6, "scope_and_triggers must carry at least 6 items");
  // ITEM 290 — NO-TWIN PIN. `scope_confirmation` is retired from Track-2
  // emission (CEO ruling 2026-07-30): not emitted at all, no empty stub.
  assert(
    !Object.prototype.hasOwnProperty.call(out.report, "scope_confirmation"),
    "retired twin scope_confirmation must not be emitted",
  );
});


Deno.test("241.1 (E2): aggregateBalance insufficiency is documentation-gate driven — factor absence alone is NOT insufficient", () => {
  // No factors present, but ALL documentation gates PASS → not insufficient.
  const planDocsOk = planWithGateOutcomes([
    { gate_id: "G.documentation.purpose_present", outcome: "pass" },
    { gate_id: "G.documentation.categories_present", outcome: "pass" },
    { gate_id: "G.documentation.operational_elements_present", outcome: "pass" },
    { gate_id: "G.documentation.approver_present", outcome: "pass" },
  ]);
  assert(aggregateBalance(planDocsOk) !== "insufficient", "docs pass + no factors ⇒ NOT insufficient");

  // Any docs gate not-pass → insufficient.
  const planDocsBlocked = planWithGateOutcomes([
    { gate_id: "G.documentation.purpose_present", outcome: "block" },
    { gate_id: "G.documentation.categories_present", outcome: "pass" },
    { gate_id: "G.documentation.operational_elements_present", outcome: "pass" },
    { gate_id: "G.documentation.approver_present", outcome: "pass" },
  ]);
  assertEquals(aggregateBalance(planDocsBlocked), "insufficient");

  const planDocsNa = planWithGateOutcomes([
    { gate_id: "G.documentation.purpose_present", outcome: "not_applicable" },
    { gate_id: "G.documentation.categories_present", outcome: "pass" },
    { gate_id: "G.documentation.operational_elements_present", outcome: "pass" },
    { gate_id: "G.documentation.approver_present", outcome: "pass" },
  ]);
  assertEquals(aggregateBalance(planDocsNa), "insufficient");
});

Deno.test("241.1 (Q1): evaluateGoldenShape flags shortfalls without mutating the report", () => {
  const empty = {};
  const before = JSON.stringify(empty);
  const r = evaluateGoldenShape(empty);
  assertEquals(JSON.stringify(empty), before, "must not mutate the report");
  assertEquals(r.review_flag, true);
  assertEquals(r.shortfall_keys.length, CPPA_RISK_GOLDEN_QUOTAS.length);
});

Deno.test("241.1 (Q2): assembler surfaces the golden_shape telemetry under exit_checks", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more", q18_admt_use: "no" },
    report_data: {},
    buildStamp: "item241-1@test",
  });
  const out = assembleReport(plan);
  const gs = out.telemetry.exit_checks.golden_shape;
  assert(typeof gs.version === "string" && gs.version.includes("item241-1"));
  assert(Array.isArray(gs.sections) && gs.sections.length === CPPA_RISK_GOLDEN_QUOTAS.length);
  assert(typeof gs.review_flag === "boolean");
});
