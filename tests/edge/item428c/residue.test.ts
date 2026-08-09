// ITEM 428-C — the two residual defects from pilot 351e932b (run #207).
//
//   D1  a referral sentence parked on the pre-gate
//       `$.risk_assessment_by_activity` surface leaves that surface (WRITER
//       side; no gate exemption is ever added for e6_counsel_referral).
//   D2  `reserved_insufficient_record` states the weighing outcome the
//       analytics actually reached and notes that the initiation decision
//       rests with the business — it no longer contradicts the document.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  rehomeReservedReferrals,
  RISK_SUMMARY_REHOME_VERSION,
} from "../../../supabase/functions/_shared/ltp/risk-summary-rehome.ts";
import { outweighConclusion } from "../../../supabase/functions/_shared/ltp/risk-activity-emit.ts";
import { RISK_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/risk-stamp.ts";

const PILOT_REFERRAL =
  "The initiation decision under 11 CCR § 7152(a)(7) and the treatment of the open elements remain reserved to the business and qualified legal counsel.";
const KEPT =
  "For every beneficiary class the stated benefit is supported by a record fact and outweighs the identified negative impacts.";

Deno.test("428-C stamp", () => {
  assertEquals(RISK_PIPELINE_STAMP, "risk-pipeline@item428c-2026-08-09");
  assertStringIncludes(RISK_SUMMARY_REHOME_VERSION, "item428c");
});

Deno.test("D1: referral prose leaves the typed activity surface", () => {
  const report: Record<string, unknown> = {
    risk_assessment_by_activity: [
      {
        activity: "Behavioural advertising",
        benefits_outweigh_risks_rationale: `${KEPT} ${PILOT_REFERRAL}`,
        adverse_effects: [PILOT_REFERRAL, "Loss of control over personal information."],
        _activity_key: "a1",
      },
    ],
    priority_actions: [],
  };
  const out = rehomeReservedReferrals(report);
  assert(out.activity_sentences_moved >= 2, JSON.stringify(out));
  const row = (report.risk_assessment_by_activity as Record<string, unknown>[])[0];
  assertEquals(String(row.benefits_outweigh_risks_rationale).includes("reserved to"), false);
  assertStringIncludes(String(row.benefits_outweigh_risks_rationale), "outweighs the identified");
  assertEquals(row.adverse_effects, ["Loss of control over personal information."]);
  assertEquals(row._activity_key, "a1", "machine leaves are never swept");
});

Deno.test("D1: legacy string activity entries are swept too", () => {
  const report: Record<string, unknown> = {
    risk_assessment_by_activity: [PILOT_REFERRAL, KEPT],
    priority_actions: [],
  };
  rehomeReservedReferrals(report);
  assertEquals(report.risk_assessment_by_activity, [KEPT]);
});

Deno.test("D1: an activity surface with no referral is untouched", () => {
  const before = [{ activity: "Analytics", benefits_outweigh_risks_rationale: KEPT }];
  const report: Record<string, unknown> = {
    risk_assessment_by_activity: structuredClone(before),
    priority_actions: [],
  };
  const out = rehomeReservedReferrals(report);
  assertEquals(out.activity_sentences_moved, 0);
  assertEquals(report.risk_assessment_by_activity, before);
});

Deno.test("D2: reserved_insufficient_record states the weighing outcome reached", () => {
  const analytics = {
    weighing: [
      { beneficiary_class: "the business", outweigh_determination: "benefits_outweigh" },
      { beneficiary_class: "the consumer", outweigh_determination: "benefits_outweigh" },
    ],
  };
  const s = outweighConclusion("reserved_insufficient_record", analytics);
  assertStringIncludes(s, "benefits of the processing outweigh the negative impacts");
  assertStringIncludes(s, "rests with the business under 11 CCR § 7152(a)(7)");
  assertEquals(s.includes("does not yet support a balance determination"), false);
});

Deno.test("D2: a genuinely undetermined record still reads undetermined", () => {
  const s = outweighConclusion("reserved_insufficient_record", {
    weighing: [{ beneficiary_class: "the business", outweigh_determination: "undetermined_on_the_record" }],
  });
  assertEquals(s, "The record does not yet support a balance determination for this activity.");
  assertEquals(outweighConclusion("reserved_insufficient_record", {}), s);
});

Deno.test("D2: the other emitted consequence enums are mapped, not defaulted", () => {
  const w = { weighing: [{ beneficiary_class: "the consumer", outweigh_determination: "impacts_outweigh" }] };
  for (const d of ["prohibit", "restrict", "initiate_with_modifications", "initiate"]) {
    const s = outweighConclusion(d, w);
    assertEquals(s.includes("does not yet support"), false, `${d} fell to default`);
  }
  assertStringIncludes(outweighConclusion("restrict", w), "the consumer");
});

Deno.test("D2: no conclusion sentence carries a counsel referral", () => {
  const w = { weighing: [{ beneficiary_class: "the business", outweigh_determination: "benefits_outweigh" }] };
  for (const d of ["initiate", "prohibit", "restrict", "initiate_with_modifications", "close_balance", "reserved_insufficient_record", ""]) {
    assertEquals(/\bcounsel\b/i.test(outweighConclusion(d, w)), false, `${d} names counsel`);
  }
});
