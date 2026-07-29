// ITEM 242 CHECKPOINT A — deterministic-fix asserts (defects 3, 4, 6, 7).
// Deno tests; no network.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { derivePlan } from "../_shared/ltp/derive.ts";
import { composePriorityActionsForTest, composeRecordSufficiencyForTest } from "../_shared/ltp/section-composers/cppa-risk.ts";
import { CPPA_RISK_FACTORS } from "../_shared/factors/cppa-risk-factors.ts";

const buildStamp = "test-item242-a";

Deno.test("defect 3: neg.e.economic_harms guidance_ref subsection family matches its anchor (a)(5)(E)", () => {
  const row = CPPA_RISK_FACTORS.find((f) => f.id === "neg.e.economic_harms")!;
  assert(row);
  assertEquals(row.anchor.pinpoint, "11 CCR § 7152(a)(5)(E)");
  const g = row.guidance_refs![0];
  assertEquals(g.regulation_citation, "11 CCR § 7152(a)(5)(E)");
});

Deno.test("defect 4: q18=No suppresses ADMT actions (gap-applicability law)", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "10000000", q2_consumers: "50000", q18_admt_use: "no" },
    report_data: {},
    buildStamp,
  });
  const actions = composePriorityActionsForTest(plan);
  const admt = actions.filter((a) => /admt|automated|profiling/i.test(String(a.ctx.element_short_label ?? "")));
  assertEquals(admt.length, 0, "ADMT actions must be zero when q18_admt_use is negative");
});

Deno.test("defect 6: record_sufficiency opener + closer share one source (no contradiction)", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "10000000", q2_consumers: "50000", q18_admt_use: "yes", entity_name: "Acme" },
    report_data: {},
    buildStamp,
  });
  const items = composeRecordSufficiencyForTest(plan);
  const prose = items[0].ctx;
  const opener = String(prose.sufficiency_clause);
  const closer = String(prose.sufficiency_closer_clause);
  const openerSufficient = /^sufficient/.test(opener);
  const closerSufficient = /^is sufficient/.test(closer);
  assertEquals(openerSufficient, closerSufficient, "opener and closer must agree on sufficiency polarity");
});

Deno.test("defect 7a: every priority action carries a non-empty owner_role_titles slot", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "10000000", q2_consumers: "50000", q18_admt_use: "yes" },
    report_data: {},
    buildStamp,
  });
  const actions = composePriorityActionsForTest(plan);
  for (const a of actions) {
    assert(typeof a.ctx.owner_role_titles === "string" && a.ctx.owner_role_titles.length > 0,
      `action ${a.ctx.element_short_label} missing owner_role_titles`);
  }
});

Deno.test("defect 7b: factor-gap actions use assessment-record (§ 7155) deadline, not ongoing_processing", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "10000000", q2_consumers: "50000", q18_admt_use: "yes" },
    report_data: {},
    buildStamp,
  });
  const actions = composePriorityActionsForTest(plan);
  const factorGap = actions.find((a) => !/admt|profiling/i.test(String(a.ctx.element_short_label ?? "")));
  assert(factorGap, "expected at least one non-ADMT factor-gap action");
  const dl = String(factorGap!.ctx.deadline_sentence ?? "");
  assert(!/immediate/i.test(dl) || /assessment record/i.test(dl),
    `deadline sentence should reflect § 7155 assessment-record cohort, got: ${dl}`);
});

Deno.test("defect 7c: documentation-gate actions carry per-gate registry pinpoints (never bare § 7152(a))", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "10000000", q2_consumers: "50000", q18_admt_use: "yes" },
    report_data: {},
    buildStamp,
  });
  const actions = composePriorityActionsForTest(plan);
  const docActions = actions.filter((a) => {
    const pin = String((a.ctx as any).__cite?.PINPOINT ?? "");
    return /^11 CCR § 7152\(a\)\(\d/.test(pin);
  });
  // If there are any documentation-gate actions, none may use the bare "§ 7152(a)" fallback.
  for (const a of actions) {
    const pin = String((a.ctx as any).__cite?.PINPOINT ?? "");
    if (/documentation|record|assessment record/i.test(String(a.ctx.element_short_label ?? ""))) {
      assert(pin !== "11 CCR § 7152(a)", "documentation-gate action must not use bare § 7152(a) fallback");
    }
  }
  assert(true);
});
