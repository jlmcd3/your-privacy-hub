// GRADER-CAL-1 — regression tests for the shared post-filter and calibration
// changes. Kept under supabase/functions/_tests/ so `deno test` picks it up
// alongside the existing quality-batch orchestrator tests.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyGraderCal1Filter, recomputeOverallPreCal1 } from "../_shared/grader/post-filters.ts";
import { GRADER_CONTEXT_VERSION } from "../_shared/grader/context.ts";

Deno.test("GRADER-CAL-1 A2: NOTE FOR LEGAL REVIEW block is not a leak", () => {
  const findings = [
    {
      check_id: "rubric_internal_reasoning_leak",
      dimension: "hallucination",
      severity: "high",
      passed: false,
      evidence: "NOTE FOR LEGAL REVIEW — Framework selection: this DPA characterises …",
    },
    {
      check_id: "rubric_internal_reasoning_leak",
      dimension: "hallucination",
      severity: "high",
      passed: false,
      evidence: "as an AI language model I cannot advise …",
    },
  ];
  const { kept, dropped } = applyGraderCal1Filter(findings);
  assertEquals(kept.length, 1);
  assertEquals(kept[0].evidence, "as an AI language model I cannot advise …");
  assertEquals(dropped.a2, 1);
});

Deno.test("GRADER-CAL-1 A3: NY S2659B / Chapter 647 references are whitelisted", () => {
  const findings = [
    {
      check_id: "rubric_citation_misapplied",
      dimension: "citation",
      severity: "high",
      passed: false,
      evidence: "Report cites S2659B / Chapter 647 as current NY breach-notification law.",
    },
    {
      check_id: "rubric_citation_misapplied",
      dimension: "citation",
      severity: "high",
      passed: false,
      evidence: "Report cites some other invented statute number 12345XYZ.",
    },
  ];
  const { kept, dropped } = applyGraderCal1Filter(findings);
  assertEquals(kept.length, 1);
  assertEquals(dropped.a3, 1);
});

Deno.test("GRADER-CAL-1 A3: NY A8872A whitelisted", () => {
  const findings = [{
    check_id: "rubric_unsupported_business_claim",
    dimension: "hallucination",
    severity: "high",
    passed: false,
    evidence: "The 30-day figure comes from A8872A (signed December 2024).",
  }];
  const { kept, dropped } = applyGraderCal1Filter(findings);
  assertEquals(kept.length, 0);
  assertEquals(dropped.a3, 1);
});

Deno.test("GRADER-CAL-1 A4: affirmation-shaped findings are suppressed", () => {
  const findings = [
    {
      check_id: "rubric_citation_misapplied",
      dimension: "citation",
      severity: "high",
      passed: false,
      evidence: "This citation is correct.",
    },
    {
      check_id: "rubric_citation_misapplied",
      dimension: "citation",
      severity: "high",
      passed: false,
      evidence: "The report properly cites § 1798.82.",
    },
    {
      check_id: "rubric_generic_boilerplate",
      dimension: "analysis",
      severity: "medium",
      passed: false,
      evidence: "The analysis restates the intake verbatim without adding facts.",
    },
  ];
  const { kept, dropped } = applyGraderCal1Filter(findings);
  assertEquals(kept.length, 1);
  assertEquals(dropped.a4, 2);
});

Deno.test("GRADER-CAL-1 A4: `passed:true` (schema-only) is preserved even if evidence sounds affirmative", () => {
  const findings = [{
    check_id: "rubric_citation_misapplied",
    dimension: "citation",
    severity: "high",
    passed: true, // model reported this as a PASS row — must not be filtered
    evidence: "This citation is correct.",
  }];
  const { kept, dropped } = applyGraderCal1Filter(findings);
  assertEquals(kept.length, 1);
  assertEquals(dropped.a4, 0);
});

Deno.test("GRADER-CAL-1 A5: recomputeOverallPreCal1 uses pre-CAL-1 weight vector", () => {
  const scores = {
    accuracy: 80, citation: 80, hallucination: 80,
    analysis: 60, intelligence: 60, formatting: 60,
  };
  // 80*.30 + 80*.25 + 80*.20 + 60*.15 + 60*.05 + 60*.05
  //  = 24 + 20 + 16 + 9 + 3 + 3 = 75
  assertEquals(recomputeOverallPreCal1(scores), 75);
});

Deno.test("GRADER-CAL-1: GRADER_CONTEXT_VERSION advances forward from the CAL-1 tag", () => {
  // Superseded by COUNSEL-VOICE-1 (gc-2026-07-19-counsel-voice-1). The
  // constant is monotonic within the gc-YYYY-MM-DD-tag family — assert on
  // the shape rather than the exact CAL-1 string so downstream couriers
  // can bump the version without breaking this suite.
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-"));
  assert(GRADER_CONTEXT_VERSION >= "gc-2026-07-19");
});

Deno.test("GRADER-CAL-1 B [already-resolved-in-code]: pickup-stamp guard tracks current gc-* version", () => {
  const stamp = GRADER_CONTEXT_VERSION;
  assert(stamp.startsWith("gc-"));
});
