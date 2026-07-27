import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyWaveBCompletion,
  assertNoPiiInNarrative,
  computeProngOutcomes,
  enforcePurposeVerbatim,
  extendSubmissionBasisCrosswalk,
  WAVEB_COMPLETION_STAMP,
} from "./waveb-completion.ts";

Deno.test("(a)(i) purpose verbatim: rewrites paraphrased purpose to intake i1_processing_purpose", () => {
  const intake = {
    i1_processing_purpose: "Deliver core SaaS analytics functionality to enterprise customers with role-based access controls in place.",
  };
  const report: any = {
    risk_assessment_by_activity: [
      { purpose: "delivering analytics to customers" },
    ],
  };
  const n = enforcePurposeVerbatim(report, intake);
  assertEquals(n, 1);
  assertEquals(report.risk_assessment_by_activity[0].purpose, intake.i1_processing_purpose);
});

Deno.test("(a)(i) purpose-verbatim property: activity_details[].purpose_description wins over intake fallback", () => {
  const intake = {
    i1_processing_purpose: "fallback purpose",
    activity_details: [{ purpose_description: "per-activity purpose from intake row" }],
  };
  const report: any = {
    risk_assessment_by_activity: [{ purpose: "model paraphrase" }],
  };
  enforcePurposeVerbatim(report, intake);
  assertEquals(report.risk_assessment_by_activity[0].purpose, "per-activity purpose from intake row");
});

Deno.test("(a)(iii) TEMPLATE_CUT: inconsistency_flags with free-prose fragments are dropped", () => {
  const report: any = {
    inconsistency_flags: [
      "a garbled free-prose fragment",
      { title: "unstructured" },
      { source_field_a: "q5_sell_share", source_field_b: "q5c_share_revenue_50pct", explanation: "conflict" },
      { template_id: "T.risk.review_items", body: "validator entry" },
    ],
  };
  const { counters } = applyWaveBCompletion(report, {});
  assertEquals(counters.inconsistency_flags_dropped, 2);
  assertEquals(report.inconsistency_flags.length, 2);
});

Deno.test("(a)(ii) meta-string ban: strips 'We could not verify this item...' from priority_actions", () => {
  const report: any = {
    priority_actions: [
      { action: "We could not verify this item from the information provided; please supply the details." },
      { action: "Document a specific, non-generic purpose for the profiling activity." },
    ],
  };
  const { counters } = applyWaveBCompletion(report, {});
  assert(counters.meta_strings_scrubbed >= 1);
  assertEquals(report.priority_actions.length, 1);
  assertEquals(report.priority_actions[0].action.startsWith("Document"), true);
});

Deno.test("dup-connective regression: 'established on the record on the current record' collapses", () => {
  const report: any = {
    assessment_summary: {
      note: "The activity is established on the record on the current record.",
    },
  };
  const { counters } = applyWaveBCompletion(report, {});
  assert(counters.dup_connectives_scrubbed >= 1);
  assert(report.assessment_summary.note.includes("established on the current record"));
  assert(!report.assessment_summary.note.includes("on the record on the current record"));
});

Deno.test("(b) PII narrative ban: email/phone in narrative surfaces are scrubbed and post-render assert is clean", () => {
  const intake = {
    i8_certifying_exec_name: "Jane Doe",
    i8_contact_email: "jane.doe@example.com",
    i8_contact_phone: "415-555-0100",
    i7_internal_contributors: "Alice Ng; Bob Reyes",
  };
  const report: any = {
    assessment_summary: {
      text: "Jane Doe (jane.doe@example.com, 415-555-0100) certified the assessment with input from Alice Ng and Bob Reyes.",
    },
    priority_actions: [{ action: "Notify Jane Doe at jane.doe@example.com about the outcome." }],
    attestation_block: {
      certifying_executive_name: "Jane Doe",
      certifying_contact_email: "jane.doe@example.com",
    },
  };
  const { counters } = applyWaveBCompletion(report, intake);
  assert(counters.pii_narrative_hits_scrubbed >= 3);
  const errs = assertNoPiiInNarrative(report);
  assertEquals(errs, []);
  // attestation_block preserved verbatim.
  assertEquals(report.attestation_block.certifying_contact_email, "jane.doe@example.com");
  // narrative rewritten to generic role tokens.
  assert(report.assessment_summary.text.includes("the certifying executive"));
  assert(!/jane\.doe@example\.com/i.test(report.assessment_summary.text));
});

Deno.test("(c) crosswalk: per-prong § 7120(b) clauses appended to submission_basis", () => {
  const intake = {
    q1_revenue: "$50M to $100M",
    q2_consumers: "250,000 to under 1,000,000",
    q5_sell_share: "No",
    q15_sensitive_pi: "No",
  };
  const report: any = {
    submission_summary: { submission_basis: "§ 7121(a) cybersecurity-audit linkage" },
  };
  const added = extendSubmissionBasisCrosswalk(report, intake);
  assertEquals(added, 3);
  const basis = report.submission_summary.submission_basis;
  assert(basis.includes("§ 7120(b)(1)"));
  assert(basis.includes("§ 7120(b)(2)(A)"));
  assert(basis.includes("§ 7120(b)(2)(B)"));
  assert(basis.includes("§ 7121(a) cybersecurity-audit linkage"), "existing § 7121(a) linkage preserved");
});

Deno.test("(c) crosswalk emitter matrix: prong outcomes per intake case", () => {
  const cases: Array<[Record<string, any>, "met" | "not met" | "not applicable" | "indeterminate", "met" | "not met" | "not applicable" | "indeterminate", "met" | "not met" | "not applicable" | "indeterminate"]> = [
    [{ q5_sell_share: "No", q15_sensitive_pi: "No", q1_revenue: "Under $25M", q2_consumers: "Under 100,000" }, "not met", "not met", "not applicable"],
    [{ q5_sell_share: "Yes", q5c_share_revenue_50pct: "Yes", q15_sensitive_pi: "Yes", q15c_spi_volume: "50,000 or more", q1_revenue: "Over $100M", q2_consumers: "1,000,000 or more" }, "met", "met", "met"],
    [{}, "indeterminate", "indeterminate", "indeterminate"],
  ];
  for (const [intake, b1, b2A, b2B] of cases) {
    const out = computeProngOutcomes(intake);
    assertEquals(out.b1, b1);
    assertEquals(out.b2A, b2A);
    assertEquals(out.b2B, b2B);
  }
});

Deno.test("crosswalk emitter is idempotent", () => {
  const intake = { q5_sell_share: "No", q15_sensitive_pi: "No", q1_revenue: "Under $25M", q2_consumers: "Under 100,000" };
  const report: any = { submission_summary: { submission_basis: "§ 7121(a) cybersecurity-audit linkage" } };
  extendSubmissionBasisCrosswalk(report, intake);
  const once = report.submission_summary.submission_basis;
  const added2 = extendSubmissionBasisCrosswalk(report, intake);
  assertEquals(added2, 0);
  assertEquals(report.submission_summary.submission_basis, once);
});

Deno.test("stamp exposed", () => {
  assert(WAVEB_COMPLETION_STAMP.startsWith("ltp-waveb-completion@"));
});
