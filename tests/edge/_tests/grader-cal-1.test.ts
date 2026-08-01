// GRADER-CAL-1 — regression tests for the shared post-filter and calibration
// changes. Kept under supabase/functions/_tests/ so `deno test` picks it up
// alongside the existing quality-batch orchestrator tests.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyGraderCal1Filter, recomputeOverallPreCal1 } from "../../../supabase/functions/_shared/grader/post-filters.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";

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

import { _internals as fmt } from "../../../supabase/functions/_shared/grader/format-checks.ts";

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

// ---------------------------------------------------------------------------
// GRADER-CAL-3 regression tests
// ---------------------------------------------------------------------------

const RUN2_DPA_HEADINGS = [
  "DATA PROCESSING AGREEMENT",
  "",
  "1. PARTIES AND RECITALS",
  "The parties agree as follows.",
  "2. DEFINITIONS",
  "3. SUBJECT MATTER",
  "4. DATA PROCESSING — PROCESSOR OBLIGATIONS",
  "4.5 Assistance with Data Subject Rights and DPIA",
  "The Processor shall assist the Controller.",
  "4.6 Assistance with Security, Breach Notification, and DPIA",
  "5. SUB-PROCESSING PROVISIONS",
  "6. DATA SUBJECT RIGHTS ASSISTANCE",
  "7. SECURITY MEASURES",
  "8. DATA TRANSFERS — INTERNATIONAL TRANSFER PROVISIONS",
  "9. RETURN OR DELETION OF PERSONAL DATA",
  "10. DATA BREACH NOTIFICATION",
  "11. AUDIT AND INSPECTION RIGHTS",
  "12. LIABILITY",
  "13. TERM AND TERMINATION",
].join("\n");

const DPA_SECTIONS = [
  "Parties and Recitals","Definitions","Subject Matter","Data Processing",
  "Sub-processing","Data Subject Rights","Security","Data Transfers",
  "Return or Deletion","Term and Termination",
];

Deno.test("GRADER-CAL-3 T1(i): run-2 DPA heading sequence produces zero e1 findings", () => {
  const findings = fmt.checkE1(DPA_SECTIONS, RUN2_DPA_HEADINGS);
  const fails = findings.filter((f) => !f.passed);
  assertEquals(fails.length, 0, JSON.stringify(fails));
});

Deno.test("GRADER-CAL-3 T1(ii): genuinely out-of-order plain-text headings still fail", () => {
  const doc = [
    "1. PARTIES AND RECITALS",
    "2. DEFINITIONS",
    "3. SUBJECT MATTER",
    "4. SECURITY MEASURES",           // swapped forward — should fail
    "5. DATA PROCESSING — PROCESSOR OBLIGATIONS",
    "6. SUB-PROCESSING PROVISIONS",
    "7. DATA SUBJECT RIGHTS ASSISTANCE",
    "8. DATA TRANSFERS",
    "9. RETURN OR DELETION",
    "10. TERM AND TERMINATION",
  ].join("\n");
  const findings = fmt.checkE1(DPA_SECTIONS, doc);
  const orderFails = findings.filter(
    (f) => !f.passed && f.check_id === "e1_section_order",
  );
  assert(orderFails.length >= 1);
});

Deno.test("GRADER-CAL-3 T1(iii): mixed heading + flat-text (in true order) produces no finding", () => {
  // "Data Subject Rights" is mentioned only in body prose (not a heading);
  // all other sections are heading-anchored and in order. Present-check
  // must pass without an order comparison against heading-anchored lastPos.
  const doc = [
    "1. PARTIES AND RECITALS",
    "2. DEFINITIONS",
    "3. SUBJECT MATTER",
    "4. DATA PROCESSING — PROCESSOR OBLIGATIONS",
    "The Processor shall support Data Subject Rights fulfilment in accordance with the Controller's instructions.",
    "5. SUB-PROCESSING PROVISIONS",
    "6. SECURITY MEASURES",
    "7. DATA TRANSFERS",
    "8. RETURN OR DELETION",
    "9. TERM AND TERMINATION",
  ].join("\n");
  const findings = fmt.checkE1(DPA_SECTIONS, doc);
  const fails = findings.filter((f) => !f.passed);
  assertEquals(fails.length, 0, JSON.stringify(fails));
});

Deno.test("GRADER-CAL-3 T1(iv): document TITLE substring must not shadow a section", () => {
  // Bare doc title "DATA PROCESSING AGREEMENT" + correctly placed §4 heading.
  const doc = [
    "DATA PROCESSING AGREEMENT",
    "1. PARTIES AND RECITALS",
    "2. DEFINITIONS",
    "3. SUBJECT MATTER",
    "4. DATA PROCESSING — PROCESSOR OBLIGATIONS",
    "5. SUB-PROCESSING PROVISIONS",
    "6. DATA SUBJECT RIGHTS ASSISTANCE",
    "7. SECURITY MEASURES",
    "8. DATA TRANSFERS",
    "9. RETURN OR DELETION",
    "10. TERM AND TERMINATION",
  ].join("\n");
  const findings = fmt.checkE1(DPA_SECTIONS, doc);
  const fails = findings.filter((f) => !f.passed);
  assertEquals(fails.length, 0, JSON.stringify(fails));
});

Deno.test("GRADER-CAL-3 T2(a): DPIA preamble ownership disclaimer is exempt", () => {
  const doc = [
    "This document is not legal advice.",
    "Your qualified Data Protection Officer or legal counsel must review, complete, and own it.",
    "",
    "1. SCOPE AND CONTEXT",
    "The processing activities under review are described below.",
    "2. NECESSITY AND PROPORTIONALITY",
    "Standard analysis body prose.",
  ].join("\n");
  const findings = fmt.checkE6(doc);
  const fails = findings.filter((f) => !f.passed);
  assertEquals(fails.length, 0, JSON.stringify(fails));
});

Deno.test("GRADER-CAL-3 T2(b): mid-document counsel referral still fails", () => {
  const doc = [
    "1. SCOPE AND CONTEXT",
    "The controller shall consult your legal counsel before proceeding with this activity.",
    "2. RISK ASSESSMENT",
    "Body content.",
    "3. MITIGATIONS",
    "More body content.",
  ].join("\n");
  const findings = fmt.checkE6(doc);
  const fails = findings.filter((f) => !f.passed && f.check_id === "e6_counsel_referral");
  assert(fails.length >= 1, JSON.stringify(findings));
});

Deno.test("GRADER-CAL-3 T2(c): closing-block ownership disclaimer is exempt", () => {
  const body = [
    "1. SCOPE AND CONTEXT", "Body.",
    "2. NECESSITY", "Body.",
    "3. RISK", "Body.",
    "4. MITIGATIONS", "Final section body.",
  ].join("\n");
  const doc = body +
    "\n\nCLOSING NOTICE\nThis document is not legal advice; your qualified Data Protection Officer or legal counsel must review, complete, and own it.";
  const findings = fmt.checkE6(doc);
  const fails = findings.filter((f) => !f.passed);
  assertEquals(fails.length, 0, JSON.stringify(fails));
});

Deno.test("GRADER-CAL-5R: instrument version bumped to grader-cal-5r", () => {
  assertEquals(GRADER_CONTEXT_VERSION, "gc-2026-07-26-s5-eu-uk-ca-au-sg");
});

// ---------------------------------------------------------------------------
// GRADER-CAL-4 regression tests — e6 owner-directive & descriptive-status
// carve-outs. See advisory-voice.ts and format-checks.ts for rationale.
// ---------------------------------------------------------------------------

// The e6 zone-based exemption for the ownership-disclaimer needs section
// headings to be considered "active". Wrap the target sentence in a minimal
// two-section body so the sentence lives clearly mid-document.
function midBody(sentence: string): string {
  return [
    "## Section 1",
    "Body prose.",
    sentence,
    "## Section 2",
    "More body prose.",
  ].join("\n");
}

Deno.test("GRADER-CAL-4: reader-directed ownership sentence mid-body still fails", () => {
  const doc = midBody("Your qualified Data Protection Officer or legal counsel must review, complete, and own it.");
  const fails = fmt.checkE6(doc).filter((f) => !f.passed);
  assert(fails.length >= 1);
});

Deno.test("GRADER-CAL-4: 'resolved by legal counsel' still fails", () => {
  const doc = midBody("The probability-score bracketed field must be resolved by legal counsel.");
  const fails = fmt.checkE6(doc).filter((f) => !f.passed);
  assert(fails.length >= 1);
});

Deno.test("GRADER-CAL-4: 'reviewed by counsel' still fails", () => {
  const doc = midBody("This assessment should be reviewed by counsel before filing.");
  const fails = fmt.checkE6(doc).filter((f) => !f.passed);
  assert(fails.length >= 1);
});

Deno.test("GRADER-CAL-4: 'consult your attorney' still fails", () => {
  const doc = midBody("Consult your attorney before relying on this document.");
  const fails = fmt.checkE6(doc).filter((f) => !f.passed);
  assert(fails.length >= 1);
});

Deno.test("GRADER-CAL-4: Privacy Officer passive notification directive passes", () => {
  const doc = midBody("If an opt-out request has not been fully processed — including vendor notification and cessation confirmation — by business day 12, the Privacy Officer must be notified and an escalation review must begin.");
  const fails = fmt.checkE6(doc).filter((f) => !f.passed);
  assertEquals(fails.length, 0, JSON.stringify(fails));
});

Deno.test("GRADER-CAL-4: Privacy Officer active task directive passes", () => {
  const doc = midBody("The Privacy Officer must update the access-response template to add the specific denial bases.");
  const fails = fmt.checkE6(doc).filter((f) => !f.passed);
  assertEquals(fails.length, 0, JSON.stringify(fails));
});

Deno.test("GRADER-CAL-4: DPO with Legal Counsel collaborator passes", () => {
  const doc = midBody("The DPO, working with Legal Counsel and the CTO, must: (1) conduct a formal audit of all current technology tools.");
  const fails = fmt.checkE6(doc).filter((f) => !f.passed);
  assertEquals(fails.length, 0, JSON.stringify(fails));
});

Deno.test("GRADER-CAL-4: descriptive-status privacy-lead sentence passes", () => {
  const doc = midBody("The informal privacy lead (a senior legal counsel carrying privacy responsibilities part-time) has flagged the gap but no remediation timeline has been set.");
  const fails = fmt.checkE6(doc).filter((f) => !f.passed);
  assertEquals(fails.length, 0, JSON.stringify(fails));
});

