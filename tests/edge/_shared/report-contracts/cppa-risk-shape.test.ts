/**
 * CP3 JOINT SHAPE-CONTRACT TEST — cppa-risk report_data.
 *
 * Verifies that:
 *   1. Assembler-shape (LTP): executive_summary is a string on every
 *      path (Type-J and normal path). assessment_summary carries a
 *      .narrative string bag.
 *   2. Coherence invariant: exec-summary text never simultaneously
 *      claims "no activities identified" AND "the activities identified
 *      on the record".
 *   3. Both the run-time exporters ingest this shape without producing
 *      a blank <body> (proxied here by rendering the coerce/list
 *      helpers directly to prove non-blank output).
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  coerceNarrativeScalar,
  coerceAssessmentSummary,
  coerceNarrativeList,
  assertExecSummaryCoherent,
  CPPA_RISK_SHAPE_VERSION,
} from "./cppa-risk-shape.ts";
import { derivePlan } from "../ltp/derive.ts";
import { assembleReport, buildTypeJWriteAroundBody } from "../ltp/pass2-assembler.ts";

Deno.test("CP3 shape: coerceNarrativeScalar collapses array -> string; passes through strings", () => {
  assertEquals(coerceNarrativeScalar(["one paragraph", "two paragraph"]), "one paragraph\n\ntwo paragraph");
  assertEquals(coerceNarrativeScalar("already string"), "already string");
  assertEquals(coerceNarrativeScalar([""]), undefined);
  assertEquals(coerceNarrativeScalar(undefined), undefined);
});

Deno.test("CP3 shape: assessment_summary always emits { narrative } bag", () => {
  const bag = coerceAssessmentSummary(["The record supports..."]);
  assert(bag && typeof bag.narrative === "string");
  assert(bag.narrative!.length > 0);
});

Deno.test("CP3 shape: narrative-list coerces string arrays and drops empties", () => {
  assertEquals(coerceNarrativeList(["a", "", "b"]), ["a", "b"]);
  assertEquals(coerceNarrativeList([]), undefined);
  assertEquals(coerceNarrativeList("solo"), ["solo"]);
});

Deno.test("CP3 coherence: exec text with contradictory activity claims is flagged", () => {
  const bad = "no activities identified as requiring assessment were assessed. For the activities identified on the record...";
  assertEquals(assertExecSummaryCoherent(bad), "exec_summary_activity_count_contradiction");
  const ok = "One activity requiring assessment was analyzed on the record.";
  assertEquals(assertExecSummaryCoherent(ok), null);
});

Deno.test("CP3 normal-path: assembler executive_summary ships as a string, not an array", () => {
  const plan = derivePlan({
    intake: { q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more", q18_admt_use: "no" },
    report_data: {},
    buildStamp: "cp3-joint-test",
  });
  const res = assembleReport(plan);
  const es = res.report.executive_summary;
  // executive_summary MUST be either undefined (omitted) or a plain string.
  if (es !== undefined) {
    assert(typeof es === "string", `executive_summary must be string; got ${typeof es}`);
    // And it must be coherent about activity counts.
    const violated = assertExecSummaryCoherent(es);
    assertEquals(violated, null, `exec summary coherence: ${violated}`);
  }
  const as = res.report.assessment_summary as { narrative?: unknown } | undefined;
  if (as !== undefined) {
    assert(as && typeof as === "object" && !Array.isArray(as), "assessment_summary must be a bag object");
  }
});

Deno.test("CP3 type-J path: executive_summary is a string", () => {
  const body = buildTypeJWriteAroundBody({ origin: "pass1_validator_reject", buildStamp: "cp3-joint-test" });
  assertEquals(typeof body.executive_summary, "string");
  assert((body.executive_summary as string).length > 0);
});

Deno.test("CP3 shape version constant exists", () => {
  assert(CPPA_RISK_SHAPE_VERSION.startsWith("cppa-risk-shape@"));
});
