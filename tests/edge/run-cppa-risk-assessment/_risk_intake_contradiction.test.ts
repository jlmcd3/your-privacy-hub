// RISK-INTAKE-CONTRADICTION-BODY — colocated tests
import { assertEquals, assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyRiskIntakeContradiction,
  RISK_INTAKE_CONTRADICTION_VERSION,
  RISK_INTAKE_CONTRADICTION_STAMP,
} from "../../../supabase/functions/run-cppa-risk-assessment/_risk_intake_contradiction.ts";

// ── BEFORE-FIXTURE: w28 doc 1036f12c (quality_run 38cfb5d6) shapes ────────
Deno.test("BEFORE-FIXTURE: profiling-established claim excised when q5b=No (doc 1036f12c shape A)", () => {
  const intake = { q5b_profiling_observation: "No", q18_admt_use: "Yes" };
  const report = {
    analysis: "The record affirmatively records profiling and inferences drawn from consumer behavior. The company documents each ADMT use.",
    opening_summary: "Untouched.",
  };
  const { counters, report: out } = applyRiskIntakeContradiction(intake, report);
  const a = (out as any).analysis as string;
  assert(!/affirmatively records profiling/i.test(a), "class A sentence must be excised");
  assertStringIncludes(a, "documents each ADMT use");
  assertEquals(counters.classA_excisions >= 1, true);
  assertEquals((out as any).opening_summary, "Untouched.");
});

Deno.test("BEFORE-FIXTURE: 'negated ADMT-use field' / 'reconcile' framing excised when q18=Yes (doc 1036f12c shape B)", () => {
  const intake = { q5b_profiling_observation: "No", q18_admt_use: "Yes" };
  const report = {
    body: "We reconcile the negated ADMT-use field with the stated deployment. Consumers may request access.",
  };
  const { counters, report: out } = applyRiskIntakeContradiction(intake, report);
  const b = (out as any).body as string;
  assert(!/reconcile the negated ADMT-use/i.test(b));
  assertStringIncludes(b, "Consumers may request access");
  assertEquals(counters.classB_downgrades + counters.classA_excisions >= 1, true);
});

Deno.test("BEFORE-FIXTURE: sell/share affirmative claim excised when q5_sell_share=No", () => {
  const intake = { q5_sell_share: "No" };
  const report = {
    analysis: "The business sells personal information to advertising partners. Downstream contracts govern retention.",
  };
  const { counters, report: out } = applyRiskIntakeContradiction(intake, report);
  const a = (out as any).analysis as string;
  assert(!/sells personal information/i.test(a));
  assertStringIncludes(a, "Downstream contracts");
  assertEquals(counters.classA_excisions >= 1, true);
});

// ── Already-clean no-op ──────────────────────────────────────────────────
Deno.test("already-clean report is a no-op", () => {
  const intake = { q5b_profiling_observation: "No", q18_admt_use: "Yes", q5_sell_share: "No" };
  const report = {
    analysis: "The business does not conduct systematic-observation profiling. It uses ADMT for significant decisions. It does not sell or share personal information.",
  };
  const { counters, report: out } = applyRiskIntakeContradiction(intake, report);
  assertEquals(counters.classA_excisions, 0);
  assertEquals(counters.classB_downgrades, 0);
  assertEquals((out as any).analysis, (report as any).analysis);
});

// ── Idempotence ──────────────────────────────────────────────────────────
Deno.test("idempotent: second pass is a no-op", () => {
  const intake = { q5b_profiling_observation: "No", q18_admt_use: "Yes" };
  const report = {
    analysis: "The record affirmatively records profiling here. We reconcile the negated ADMT-use field there. Retain this sentence.",
  };
  const r1 = applyRiskIntakeContradiction(intake, report).report;
  const r2 = applyRiskIntakeContradiction(intake, r1);
  assertEquals(r2.counters.classA_excisions, 0);
  assertEquals(r2.counters.classB_downgrades, 0);
  assertEquals((r2.report as any).analysis, (r1 as any).analysis);
});

// ── Anchor + reserved-subtree safety ─────────────────────────────────────
Deno.test("anchor fields (citation, verbatim_quote, deadline, source_fields) never scrubbed", () => {
  const intake = { q5b_profiling_observation: "No" };
  const report = {
    citations: [{
      citation: "11 CCR § 7150",
      verbatim_quote: "The record affirmatively records profiling and inferences.",
      deadline: "The business profiles consumers within 30 days.",
      source_fields: ["The record documents profiling activity."],
    }],
  };
  const { counters, report: out } = applyRiskIntakeContradiction(intake, report);
  assertEquals(counters.classA_excisions, 0);
  const c = (out as any).citations[0];
  assertEquals(c.citation, "11 CCR § 7150");
  assertStringIncludes(c.verbatim_quote, "affirmatively records profiling");
  assertStringIncludes(c.deadline, "profiles consumers");
});

Deno.test("reserved subtrees (_meta, _internal, engagement_map, annotations, opening_summary) untouched", () => {
  const intake = { q5b_profiling_observation: "No", q18_admt_use: "Yes" };
  const report = {
    opening_summary: "The record affirmatively records profiling.",
    engagement_map: { note: "We reconcile the negated ADMT-use field." },
    annotations: [{ text: "The business sells personal information." }],
    _meta: { internal: { note: "The record affirmatively records profiling." } },
    _internal: { note: "We reconcile the negated ADMT-use field." },
  };
  const { counters, report: out } = applyRiskIntakeContradiction(
    { ...intake, q5_sell_share: "No" }, report,
  );
  assertEquals(counters.classA_excisions, 0);
  assertEquals(counters.classB_downgrades, 0);
  assertEquals((out as any).opening_summary, (report as any).opening_summary);
  assertEquals((out as any).engagement_map.note, (report as any).engagement_map.note);
  assertEquals((out as any).annotations[0].text, (report as any).annotations[0].text);
  assertEquals((out as any)._meta.internal.note, (report as any)._meta.internal.note);
  assertEquals((out as any)._internal.note, (report as any)._internal.note);
});

// ── Fail-open on null intake + primitive report ──────────────────────────
Deno.test("fail-open: null intake → no-op, no throw", () => {
  const { counters, report: out } = applyRiskIntakeContradiction(null, { analysis: "x" });
  assertEquals(counters.classA_excisions, 0);
  assertEquals(counters.criteria_checked.length, 0);
  assertEquals((out as any).analysis, "x");
});
Deno.test("fail-open: primitive report → returned untouched", () => {
  const { counters, report: out } = applyRiskIntakeContradiction({ q18_admt_use: "Yes" }, "hello" as any);
  assertEquals(counters.classA_excisions, 0);
  assertEquals(out as any, "hello");
});
Deno.test("fail-open: indefinite intake polarity is a no-op", () => {
  const intake = { q18_admt_use: "In evaluation", q5b_profiling_observation: "TBD" };
  const report = { analysis: "The record affirmatively records profiling. We reconcile the negated ADMT-use field." };
  const { counters, report: out } = applyRiskIntakeContradiction(intake, report);
  assertEquals(counters.classA_excisions, 0);
  assertEquals(counters.classB_downgrades, 0);
  assertEquals((out as any).analysis, (report as any).analysis);
});

// ── Telemetry shape ──────────────────────────────────────────────────────
Deno.test("telemetry shape: version, stamp, build_stamp, counters, criteria, errors", () => {
  const { counters } = applyRiskIntakeContradiction(
    { q18_admt_use: "Yes", q5b_profiling_observation: "No", q5_sell_share: "No" },
    { analysis: "clean text with no triggers." },
    { buildStamp: "risk-intake-contradiction-body@2026-07-26T03:31:00Z" },
  );
  assertEquals(counters.version, RISK_INTAKE_CONTRADICTION_VERSION);
  assertEquals(counters.stamp, RISK_INTAKE_CONTRADICTION_STAMP);
  assertEquals(counters.build_stamp, "risk-intake-contradiction-body@2026-07-26T03:31:00Z");
  assertEquals(typeof counters.classA_excisions, "number");
  assertEquals(typeof counters.classB_downgrades, "number");
  assertEquals(Array.isArray(counters.criteria_checked), true);
  assertEquals(counters.criteria_checked.sort(), ["q18_admt_use", "q5_sell_share", "q5b_profiling_observation"]);
  assertEquals(Array.isArray(counters.errors), true);
  assertEquals(counters.errors.length, 0);
});

// ── Opening summary explicitly untouched ────────────────────────────────
Deno.test("opening_summary never scrubbed even when it contains a contradiction shape", () => {
  const intake = { q5b_profiling_observation: "No" };
  const report = {
    opening_summary: "The record affirmatively records profiling.",
    analysis: "The record affirmatively records profiling.",
  };
  const { counters, report: out } = applyRiskIntakeContradiction(intake, report);
  assertEquals((out as any).opening_summary, "The record affirmatively records profiling.");
  assert(!/affirmatively records profiling/i.test((out as any).analysis));
  assertEquals(counters.classA_excisions, 1);
});
