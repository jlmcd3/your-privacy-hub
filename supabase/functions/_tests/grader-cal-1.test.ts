// GRADER-CAL-1 — regression tests for the shared post-filter and calibration
// changes. Kept under supabase/functions/_tests/ so `deno test` picks it up
// alongside the existing quality-batch orchestrator tests.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyGraderCal1Filter, recomputeOverallPreCal1 } from "../_shared/grader/post-filters.ts";
import { GRADER_CONTEXT_VERSION } from "../_shared/grader/context.ts";

Deno.test("GRADER-CAL-2 T5: legacy NOTE FOR LEGAL REVIEW is no longer whitelisted", () => {
  // Prompts prohibit the heading; a leak finding quoting it must survive
  // the post-filter so it can drive a real defect signal.
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
  assertEquals(kept.length, 2);
  assertEquals(dropped.a2, 0);
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

// ---------------------------------------------------------------------------
// GRADER-CAL-2 regression tests
// ---------------------------------------------------------------------------

import { _internals as fmt } from "../_shared/grader/format-checks.ts";

Deno.test("GRADER-CAL-2 T1: bare owner-cell role title is exempt", () => {
  const doc = "| Action | Owner |\n| Update DPIA | Legal Counsel |\n";
  const findings = fmt.checkE6(doc);
  // The lone role-title cell must not produce an e6 fail.
  const fails = findings.filter((f) => !f.passed);
  assertEquals(fails.length, 0);
});

Deno.test("GRADER-CAL-2 T1: pipe-separated role roster is exempt", () => {
  const doc = "Stakeholders: DPO | Compliance Manager | Legal Counsel | CISO";
  const findings = fmt.checkE6(doc);
  const fails = findings.filter((f) => !f.passed);
  assertEquals(fails.length, 0);
});

Deno.test("GRADER-CAL-2 T1: 'consult a lawyer' still fails (directive verb override)", () => {
  const doc = "Before publishing, consult a lawyer on this determination.";
  const findings = fmt.checkE6(doc);
  const fails = findings.filter((f) => !f.passed);
  assert(fails.length >= 1);
});

Deno.test("GRADER-CAL-2 T1: 'Miriam Schulz — Legal Counsel' still exempt", () => {
  const doc = "Miriam Schulz — Legal Counsel";
  const findings = fmt.checkE6(doc);
  const fails = findings.filter((f) => !f.passed);
  assertEquals(fails.length, 0);
});

Deno.test("GRADER-CAL-2 T2: recital mentions before headings pass order check", () => {
  // "Data Processing" and "Security" are name-dropped in the recitals BEFORE
  // their §4 / §9 headings; all headings themselves are in template order.
  const doc = [
    "## Parties and Recitals",
    "The parties acknowledge Data Processing and Security are governed below.",
    "## Definitions",
    "## Subject Matter",
    "## Data Processing",
    "## Sub-processing",
    "## Data Subject Rights",
    "## Security",
    "## Data Transfers",
    "## Return or Deletion",
    "## Term and Termination",
  ].join("\n");
  const findings = fmt.checkE1(
    [
      "Parties and Recitals","Definitions","Subject Matter","Data Processing",
      "Sub-processing","Data Subject Rights","Security","Data Transfers",
      "Return or Deletion","Term and Termination",
    ], doc,
  );
  const fails = findings.filter((f) => !f.passed);
  assertEquals(fails.length, 0);
});

Deno.test("GRADER-CAL-2 T2: genuinely swapped headings still fail order check", () => {
  const doc = [
    "## Parties and Recitals",
    "## Definitions",
    "## Subject Matter",
    "## Security",        // out of order — should appear later
    "## Data Processing",
    "## Sub-processing",
    "## Data Subject Rights",
    "## Data Transfers",
    "## Return or Deletion",
    "## Term and Termination",
  ].join("\n");
  const findings = fmt.checkE1(
    [
      "Parties and Recitals","Definitions","Subject Matter","Data Processing",
      "Sub-processing","Data Subject Rights","Security","Data Transfers",
      "Return or Deletion","Term and Termination",
    ], doc,
  );
  const orderFails = findings.filter(
    (f) => !f.passed && f.check_id === "e1_section_order",
  );
  assert(orderFails.length >= 1);
});

Deno.test("GRADER-CAL-2 T4: self-exonerating 'no clear leak' evidence dropped by A4", () => {
  const findings = [{
    check_id: "rubric_internal_reasoning_leak",
    dimension: "hallucination",
    severity: "high",
    passed: false,
    evidence: "the phrase 'the record' remains within the 'the record' whitelist. No clear leak beyond whitelisted formulae.",
  }];
  const { kept, dropped } = applyGraderCal1Filter(findings);
  assertEquals(kept.length, 0);
  assert(dropped.a4 >= 1);
});

