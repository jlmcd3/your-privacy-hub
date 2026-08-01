// REBUILD-DPIA — cppa-risk rider unit tests (Task 10a/10b).
// Separate file to avoid Deno.serve port collision when both generator index.ts
// files are imported into the same test process.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyDeterministicPostGenFallback as applyRiskFallback,
  PROSE_FIELD_ID_MAP,
} from "../run-cppa-risk-assessment/index.ts";
import type { TestState } from "../_shared/cppa-test-states.ts";

Deno.test("REBUILD-DPIA T10a: 'the M6 cohort determination' → 'the audit-cohort determination' (byte-exact)", () => {
  const report = { priority_actions: [{ text: "the M6 cohort determination" }], information_needed: [] };
  const testStates: Record<string, TestState> = {
    M6: { state: "resolved_met", basis: "cohort mapped", source_fields: ["q1_revenue"] },
  };
  const { parsed } = applyRiskFallback(report, testStates);
  const out = (parsed as any).priority_actions[0].text as string;
  assertEquals(out, "the audit-cohort determination");
});

Deno.test("REBUILD-DPIA T10a: no 'the the' or duplicate trailing noun after scrub", () => {
  const report = { priority_actions: [{ text: "Verify the M6 audit determination outcome." }], information_needed: [] };
  const { parsed } = applyRiskFallback(report, {} as any);
  const out = (parsed as any).priority_actions[0].text as string;
  assert(!/\bM6\b/.test(out));
  assert(!/\bthe the\b/i.test(out));
  assert(/the audit-cohort determination/.test(out));
});

Deno.test("REBUILD-DPIA T10b: prose field-id scrub replaces q18b_admt_training in prose, preserves anchors", () => {
  const report = {
    cross_tool_recommendations: {
      admt_assessment_rationale: "The q18b_admt_training answer indicates no training.",
    },
    information_needed: [
      { field: "q18b_admt_training", dimensions: "confirm training", source_fields: ["q18b_admt_training"] },
    ],
  };
  const { parsed, notes } = applyRiskFallback(report, {} as any);
  const rationale = (parsed as any).cross_tool_recommendations.admt_assessment_rationale as string;
  assert(!/q18b_admt_training/.test(rationale), `prose still contains raw id: "${rationale}"`);
  assert(/the ADMT-training answer/.test(rationale));
  const inEntry = (parsed as any).information_needed[0];
  assertEquals(inEntry.field, "q18b_admt_training");
  assertEquals(inEntry.source_fields[0], "q18b_admt_training");
  assert(notes.some((n) => n.code === "prose_field_id_scrubbed"));
});

Deno.test("REBUILD-DPIA T10b: PROSE_FIELD_ID_MAP covers the courier list", () => {
  const required = [
    "q18_admt_use", "q18b_admt_training", "q5_sell_share", "q5c_share_revenue_50pct",
    "q15_sensitive_pi", "q15c_spi_volume", "q5b_profiling_observation", "q15b_under16_knowledge",
  ];
  for (const k of required) {
    assert(k in PROSE_FIELD_ID_MAP, `missing prose scrub for ${k}`);
  }
});
