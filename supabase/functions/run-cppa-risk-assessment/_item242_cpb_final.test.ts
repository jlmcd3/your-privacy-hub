// ITEM 242 CP-B FINAL — joint tests for KIND openers, family grouping,
// posture clauses, and the re-scoped repeated-opener assert.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  KIND_OPENERS,
  composePriorityActionsForTest,
  type ActionKind,
} from "../_shared/ltp/section-composers/cppa-risk.ts";
import { derivePlan } from "../_shared/ltp/derive.ts";
import {
  renderProngPosture,
  renderAllProngPostures,
  type ProngKey,
} from "../_shared/ltp/submission-postures.ts";
import { computeProngOutcomes, extendSubmissionBasisCrosswalk } from "../_shared/ltp/waveb-completion.ts";
import { CCPA_7120_B_2_A, CCPA_7120_B_2_B, CCPA_1798_140_D_1_C } from "../_shared/openings/ccpa-7120-pin.ts";

const stamp = "test-item242-cpb-final";

Deno.test("CP-B §1: posture clauses quote § 7120 verbatim", () => {
  assert(renderProngPosture("b2A", "met").includes(CCPA_7120_B_2_A));
  assert(renderProngPosture("b2B", "not met").includes(CCPA_7120_B_2_B));
  assert(renderProngPosture("b1", "indeterminate").includes(CCPA_1798_140_D_1_C.replace(/\.$/, "")));
});

Deno.test("CP-B §1: six-per-state posture asserts", () => {
  const states: Array<"met" | "not met" | "not applicable" | "indeterminate"> =
    ["met", "not met", "not applicable", "indeterminate"];
  for (const p of ["b1", "b2A", "b2B"] as const) {
    for (const s of states) {
      const clause = renderProngPosture(p, s);
      assert(clause.length > 40, `posture ${p}/${s} too short`);
      assert(clause.includes(p === "b1" ? "§ 7120(b)(1)" : p === "b2A" ? "§ 7120(b)(2)(A)" : "§ 7120(b)(2)(B)"));
    }
  }
});

Deno.test("CP-B §1: crosswalk emits state-the-law postures grounded in verbatim provision text", () => {
  const intake = { q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more",
    q5_sell_share: "Yes", q5c_share_revenue_50pct: "Yes",
    q15_sensitive_pi: "Yes", q15c_spi_volume: "50,000 or more" };
  const report: any = { submission_summary: { submission_basis: "" } };
  const added = extendSubmissionBasisCrosswalk(report, intake);
  assertEquals(added, 3);
  const basis = String(report.submission_summary.submission_basis);
  assert(basis.includes(CCPA_7120_B_2_A));
  assert(basis.includes(CCPA_7120_B_2_B));
  assert(basis.includes("this threshold is met"));
});

Deno.test("CP-B §2: six KIND openers exposed and non-empty", () => {
  const kinds: ActionKind[] = ["benefit_absent", "harm_absent", "safeguard_absent",
    "gate_unresolved", "type_j_reserved", "conditional"];
  for (const k of kinds) {
    assert(typeof KIND_OPENERS[k] === "string" && KIND_OPENERS[k].length > 20);
  }
});

Deno.test("CP-B §2: KIND opener stem appears as element_short_label prefix on every action", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "10000000", q2_consumers: "50000", q18_admt_use: "yes" },
    report_data: {},
    buildStamp: stamp,
  });
  const actions = composePriorityActionsForTest(plan);
  assert(actions.length > 0, "expected priority actions");
  const stems = Object.values(KIND_OPENERS);
  for (const a of actions) {
    const label = String(a.ctx.element_short_label);
    assert(stems.some((s) => label.startsWith(s)),
      `action label missing CEO opener stem: ${label.slice(0, 80)}`);
  }
});

Deno.test("CP-B §2: family grouping consolidates absent negatives when >= 2", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "10000000", q2_consumers: "50000", q18_admt_use: "yes" },
    report_data: {},
    buildStamp: stamp,
  });
  const actions = composePriorityActionsForTest(plan);
  // A family action carries the family opener text.
  const familyHarm = actions.find((a) =>
    String(a.ctx.element_short_label).includes("the following potential negative impact categories"));
  assert(familyHarm, "expected a consolidated negative-impact family action");
});

Deno.test("CP-B §2.3: re-scoped repeated-opener assert exempts ratified stems", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "10000000", q2_consumers: "50000", q18_admt_use: "yes" },
    report_data: {},
    buildStamp: stamp,
  });
  const actions = composePriorityActionsForTest(plan);
  const stems = new Set(Object.values(KIND_OPENERS));
  // Rebuild the re-scoped assert:
  //   for each pair (i, j) with i < j:
  //     - if the two labels share the SAME (KIND-stem, element core),
  //       and the post-stem substance duplicates, fail.
  //     - RATIFIED stems are exempt from the naive "same 20-char prefix" test.
  const key = (label: string) => {
    for (const s of stems) if (label.startsWith(s)) return { stem: s, tail: label.slice(s.length).trim() };
    return { stem: "", tail: label };
  };
  for (let i = 0; i < actions.length; i++) {
    for (let j = i + 1; j < actions.length; j++) {
      const a = key(String(actions[i].ctx.element_short_label));
      const b = key(String(actions[j].ctx.element_short_label));
      // Ratified stems match is fine; substance duplication is not.
      const substanceDup = a.stem !== "" && b.stem !== "" && a.stem === b.stem && a.tail === b.tail && a.tail.length > 0;
      assert(!substanceDup, `substance-dup pair (${i}, ${j}) violates re-scoped assert: ${a.tail}`);
    }
  }
});

Deno.test("CP-B §1: computeProngOutcomes marker source verification (M4=q15c_spi_volume, M5=q5c_share_revenue_50pct)", () => {
  const out = computeProngOutcomes({
    q5_sell_share: "Yes", q5c_share_revenue_50pct: "Yes",
    q15_sensitive_pi: "Yes", q15c_spi_volume: "50,000 or more",
    q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more",
  });
  assertEquals(out.b1, "met");
  assertEquals(out.b2B, "met");
});
