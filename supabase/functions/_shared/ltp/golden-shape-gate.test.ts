/**
 * ITEM 247 — TRACK 2 STAGE 2 / TASK B: GOLDEN-SHAPE GATE ASSESSMENT.
 *
 * Spec §6: "quotas are review-flags in production, hard asserts in the
 * e2e gate." This file runs the RICHEST existing fixture available in
 * the test suite (the ITEM 237 close-balance plan — the only one that
 * populates weighing_frame + factor_table + engaged applicability
 * propositions) through assembleReport, then calls evaluateGoldenShape
 * on the shipped body.
 *
 * ITEM 247 STATUS: ASSESSMENT-ONLY. The hard assert is INTENTIONALLY
 * commented out until the shortfall data has been reported to the
 * controller and next steps ratified. Per Item 236 law: reclassify /
 * report honestly, never weaken CPPA_RISK_GOLDEN_QUOTAS or pad the
 * fixture to force a green. The test below prints shortfall_keys and
 * shortfall_reasons verbatim so the courier can enumerate them.
 */
import { assembleReport } from "./pass2-assembler.ts";
import { derivePlan } from "./derive.ts";
import { evaluateGoldenShape } from "./golden-shape-quotas.ts";

function richestFixturePlan() {
  const base = derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "no",
    },
    report_data: {},
    buildStamp: "golden-shape-gate@item247",
  });
  // Extends the base with the ITEM 237 close-balance seed — the richest
  // fixture in the suite: weighing_frame + factor_table + one engaged
  // applicability proposition. Reused verbatim; not invented for this test.
  return {
    ...base,
    weighing_frame: [
      { pinpoint: "test.pin.1", anchor_hint: "close-balance factor A", closeness_contribution: 0.9 },
    ],
    propositions: [
      {
        id: "p.C.applicability.A",
        conclusion_id: "C.applicability.A",
        epistemic_type: "R",
        jurisdiction_tag: "cppa-ca",
        polarity: "positive",
        anchor: { corpus_key: "cppa-7152", pinpoint: "test" },
        intake_ledger_refs: [],
        citation_binding_refs: [],
      },
    ],
    factor_table: [
      {
        factor_id: "F.benefit.test",
        kind: "benefit",
        jurisdiction_tag: "cppa-ca",
        present_in_intake: true,
        intake_ledger_refs: [],
        guidance_refs: [],
        anchor: { corpus_key: "cppa-7152", pinpoint: "test" },
      },
    ],
    // deno-lint-ignore no-explicit-any
  } as any;
}

Deno.test("ITEM 247 (Task B): golden-shape ASSESSMENT on richest available fixture", () => {
  const plan = richestFixturePlan();
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const report = evaluateGoldenShape(result.report as Record<string, unknown>);

  // Print verbatim shortfall data for the controller courier.
  console.log("[ITEM 247 / Task B] evaluateGoldenShape shortfall report:");
  console.log(JSON.stringify({
    version: report.version,
    review_flag: report.review_flag,
    shortfall_keys: report.shortfall_keys,
    sections: report.sections.map((s) => ({
      key: s.key,
      kind: s.kind,
      present: s.present,
      chars: s.chars,
      items: s.items,
      avg_chars_per_item: s.avg_chars_per_item,
      meets_quota: s.meets_quota,
      shortfall_reasons: s.shortfall_reasons,
    })),
  }, null, 2));

  // HARD ASSERT — INTENTIONALLY COMMENTED OUT per Item 247 spec.
  // Uncomment ONLY after the richest fixture meets every quota, or
  // after the controller ratifies revised quotas / a new fixture.
  //
  //   assertEquals(report.shortfall_keys, [],
  //     `golden-shape shortfalls: ${JSON.stringify(report.shortfall_keys)}`);
});
