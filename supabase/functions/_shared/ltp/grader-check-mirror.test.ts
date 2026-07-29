/**
 * ITEM 249/251/252 — TRACK 2 STAGE 4/5/6 / Rider (C1): GRADER-CHECK MIRROR.
 *
 * Mirrors 4 of the 7 cppa-risk deterministic grader checks into the
 * product e2e gate. Per courier: "Never ship a document that
 * deterministically fails a known check." Not-yet-scoped:
 * qc_r1_5_exception_fields_consumed, qc_r1_7_enhancement_placement_det,
 * qc_ws6_1_supplemental_consumption.
 *
 * Discipline: Item 236 law — report the true state; never weaken or
 * narrow a check to force green.
 *
 * CHECK 1 status (ITEM 252, CEO-signed 2026-07-29): now asserts the
 * SIGNED Ruling-B state exactly (no longer known-failing). Row 2
 * (`j.purpose_specificity_adequacy`) carries
 * `resolution_source_fields: ["i1_processing_purpose"]`; Rows 1 and 3
 * (`j.initiation_decision`, `j.safeguard_sufficiency`) intentionally
 * carry undefined per docs/courier/ITEM252-RULING-B-SIGNED-2026-07-29.md.
 *
 * CHECK 4 scoping (Item 251):
 *   Grader rule from quality_archive.quality_check_results_20260728
 *   (check_id qc_r1_4_cohort_determinism; 48 fails across runs 71–156).
 *   Verbatim evidence strings:
 *     - "resolved band $25M to under $50M requires § 7121(a) cohort
 *        April 1, 2030 (ISO or long form) in submission_summary; not stated"
 *     - "resolved band $50M to $100M requires § 7121(a) cohort April 1,
 *        2029 ... not stated"
 *     - "legacy/absent revenue band requires both April 1, 2029 and
 *        April 1, 2030 cohort dates (ISO or long form); found 2029=true
 *        2030=false"
 *     - "legacy/absent revenue band requires indeterminate two-cohort
 *        treatment; not present"
 *     - "resolved cohort April 1, 2029 is hedged near the cite window"
 *       (also 2030 variant).
 *   Item-204 CEO ruling (Defect B, 2026-07-27) retired customer-cohort
 *   computation: cyber-audit-schedule.ts emits the FULL three-tier
 *   § 7121(a) schedule (tier1/2/3 = April 1, 2028 / 2029 / 2030,
 *   corpus-pinned) with tier determination reserved to customer +
 *   counsel — identical output for resolved AND indeterminate bands.
 *   Spec §4 mandates this design. Empirically qc_r1_4 passes 100% on
 *   runs 157–164 (0 fails).
 */
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleReport } from "./pass2-assembler.ts";
import { derivePlan } from "./derive.ts";
import { CPPA_RISK_CONCLUSIONS, CPPA_RISK_CONCLUSION_INDEX } from "../legal-test/cppa-risk-conclusions.ts";
import { composeSection } from "./section-composers/cppa-risk.ts";
import { SCHEDULE_MARKER, SCHEDULE_LITERALS } from "./cyber-audit-schedule.ts";
import { CUSTOMER_COHORT_PATTERNS } from "./harvest-guard.ts";

export const GRADER_CHECK_MIRROR_VERSION = "grader-check-mirror-2026-07-29-item252";


// ---------------------------------------------------------------------------
// FIXTURE — real archived intake (ClearPath Credit Solutions), reused from
// Item 248 golden-shape-gate.test.ts. Fully populated so CHECK 1 has an
// unambiguous "resolved" baseline.
// ---------------------------------------------------------------------------

const REAL_INTAKE: Record<string, unknown> = {
  q3_sector: "Financial services",
  q1_revenue: "$100M–$500M",
  q9_opt_out: "Yes, but in footer only",
  entity_name: "ClearPath Credit Solutions, Inc.",
  q18_admt_use: "Yes",
  q2_consumers: "250,000–1 million",
  q5_sell_share: "Yes — share for advertising only",
  q15c_spi_volume: "50,000 or more",
  q15_sensitive_pi: "Yes",
  q20_admt_opt_out: "No",
  q4_pi_categories: ["Contact identifiers (name, email, phone)"],
  q8_right_correct: "Handled via support",
  q11_policy_review: "Within 12 months",
  q13_notice_content: "Yes, all three",
  q18b_admt_training: "Yes — training ADMT for significant decisions",
  q10_id_verification: "Documented verification process matching CPPA guidance",
  q14_employee_notice: "Yes",
  q16_sensitive_limit: 'Yes, with a separate "Limit the Use of My Sensitive PI" link',
  q17_sensitive_basis: "Necessary for the service",
  q5c_share_revenue_50pct: "No",
  i1_processing_purpose: "Underwrite loan applications.",
  i2_retention_period: "Approved loans: 7 years.",
  i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy"],
  q12_notice_at_collection: "Yes, covers all collection points",
  q5b_profiling_observation: "No",
  q6_right_know: "Available via Privacy Center.",
  q7_right_delete: "Manual process, documented",
  q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
};

function planFor(intake: Record<string, unknown>) {
  return derivePlan({ intake, report_data: {}, buildStamp: "grader-check-mirror@item249" });
}

// ---------------------------------------------------------------------------
// CHECK 1 — qc_r1_1_no_asks_on_resolved_tests
// ---------------------------------------------------------------------------
// ITEM 252 (Ruling B signed, CEO 2026-07-29). Asserts the SIGNED state
// exactly per docs/courier/ITEM252-RULING-B-SIGNED-2026-07-29.md. Do NOT
// weaken these asserts to silence a future registry drift — a diff here is
// the signal that the signed record was violated.

const COURIER_252 =
  "docs/courier/ITEM252-RULING-B-SIGNED-2026-07-29.md";

Deno.test("CHECK 1a (qc_r1_1): registry carries the signed resolution_source_fields state", () => {
  const purpose = CPPA_RISK_CONCLUSION_INDEX["j.purpose_specificity_adequacy"];
  const initiation = CPPA_RISK_CONCLUSION_INDEX["j.initiation_decision"];
  const safeguard = CPPA_RISK_CONCLUSION_INDEX["j.safeguard_sufficiency"];

  assertEquals(
    purpose.resolution_source_fields,
    ["i1_processing_purpose"],
    `Row 2 (j.purpose_specificity_adequacy) MUST carry ` +
      `["i1_processing_purpose"] per signed ${COURIER_252}.`,
  );
  assertEquals(
    initiation.resolution_source_fields,
    undefined,
    `Row 1 (j.initiation_decision) MUST leave resolution_source_fields ` +
      `undefined (always-asking) per signed ${COURIER_252}.`,
  );
  assertEquals(
    safeguard.resolution_source_fields,
    undefined,
    `Row 3 (j.safeguard_sufficiency) MUST leave resolution_source_fields ` +
      `undefined (always-asking; ITEM250 proposal REJECTED — safeguards_summary ` +
      `is not a contract-real intake field) per signed ${COURIER_252}.`,
  );
});

Deno.test("CHECK 1b (qc_r1_1): composer skips purpose-adequacy ask when i1_processing_purpose is populated; still asks otherwise", () => {
  const purposeLabel = CPPA_RISK_CONCLUSION_INDEX["j.purpose_specificity_adequacy"].display_label;
  const initiationLabel = CPPA_RISK_CONCLUSION_INDEX["j.initiation_decision"].display_label;
  const safeguardLabel = CPPA_RISK_CONCLUSION_INDEX["j.safeguard_sufficiency"].display_label;

  // Populated case: purpose-adequacy is resolved on the record → skipped.
  const planResolved = planFor(REAL_INTAKE);
  const itemsResolved = composeSection("information_needed", planResolved) ?? [];
  const labelsResolved = itemsResolved.map((i) => i.ctx?.doc_element_label as string);
  assert(
    !labelsResolved.includes(purposeLabel),
    `purpose-adequacy review item MUST be skipped when i1_processing_purpose ` +
      `is populated (signed ${COURIER_252}); observed labels: ${JSON.stringify(labelsResolved)}`,
  );
  assert(
    labelsResolved.includes(initiationLabel),
    `initiation-decision review item MUST remain (Row 1 always-asking); ` +
      `observed labels: ${JSON.stringify(labelsResolved)}`,
  );
  assert(
    labelsResolved.includes(safeguardLabel),
    `safeguard-sufficiency review item MUST remain (Row 3 always-asking); ` +
      `observed labels: ${JSON.stringify(labelsResolved)}`,
  );

  // Unpopulated case: purpose-adequacy is not resolved → item present.
  const planUnresolved = planFor({ ...REAL_INTAKE, i1_processing_purpose: undefined });
  const itemsUnresolved = composeSection("information_needed", planUnresolved) ?? [];
  const labelsUnresolved = itemsUnresolved.map((i) => i.ctx?.doc_element_label as string);
  assert(
    labelsUnresolved.includes(purposeLabel),
    `purpose-adequacy review item MUST be present when i1_processing_purpose ` +
      `is absent; observed labels: ${JSON.stringify(labelsUnresolved)}`,
  );
});


// ---------------------------------------------------------------------------
// CHECK 2 — qc_r1_2_spi_prong_utilization (M4 → § 7120(b)(2)(B))
// ---------------------------------------------------------------------------

function submissionSummaryText(intake: Record<string, unknown>): string {
  const plan = planFor(intake);
  const result = assembleReport(plan, {}, { exitMode: "observe" });
  const val = (result.report as Record<string, unknown>).submission_summary;
  return typeof val === "string" ? val : "";
}

Deno.test("CHECK 2 (qc_r1_2): resolved M4 (SPI volume qualifying) → submission_summary cites § 7120(b)(2)(B)", () => {
  const text = submissionSummaryText({ ...REAL_INTAKE, q15c_spi_volume: "50,000 or more" });
  assert(text.length > 0, "submission_summary was empty (harvest rejected?)");
  assertStringIncludes(
    text,
    "§ 7120(b)(2)(B)",
    "M4 resolves met with q15c_spi_volume='50,000 or more'; submission_summary must cite § 7120(b)(2)(B).",
  );
});

Deno.test("CHECK 2 (qc_r1_2): resolved M4 (SPI volume below threshold) → submission_summary cites § 7120(b)(2)(B)", () => {
  const text = submissionSummaryText({ ...REAL_INTAKE, q15c_spi_volume: "Fewer than 50,000" });
  assert(text.length > 0, "submission_summary was empty (harvest rejected?)");
  assertStringIncludes(
    text,
    "§ 7120(b)(2)(B)",
    "M4 resolves not-met with q15c_spi_volume='Fewer than 50,000'; submission_summary must cite § 7120(b)(2)(B).",
  );
});

Deno.test("CHECK 2 (qc_r1_2): M4 not_applicable (q15_sensitive_pi=No) → submission_summary still cites § 7120(b)(2)(B)", () => {
  // When SPI is absent altogether M4 resolves as not_applicable — still a
  // resolved state per the courier rule, so the pinpoint must appear.
  const intake = { ...REAL_INTAKE, q15_sensitive_pi: "No", q15c_spi_volume: undefined as unknown };
  const text = submissionSummaryText(intake);
  assert(text.length > 0, "submission_summary was empty (harvest rejected?)");
  assertStringIncludes(
    text,
    "§ 7120(b)(2)(B)",
    "M4 resolved as not_applicable; § 7120(b)(2)(B) must still appear in submission_summary.",
  );
});

// ---------------------------------------------------------------------------
// CHECK 3 — qc_r1_3_50pct_prong_utilization (M5 → § 7120(b)(1))
// ---------------------------------------------------------------------------

Deno.test("CHECK 3 (qc_r1_3): resolved M5 met (q5c=Yes) → submission_summary cites § 7120(b)(1)", () => {
  const text = submissionSummaryText({ ...REAL_INTAKE, q5c_share_revenue_50pct: "Yes" });
  assert(text.length > 0, "submission_summary was empty (harvest rejected?)");
  assertStringIncludes(
    text,
    "§ 7120(b)(1)",
    "M5 resolves met with q5c_share_revenue_50pct='Yes'; submission_summary must cite § 7120(b)(1).",
  );
});

Deno.test("CHECK 3 (qc_r1_3): resolved M5 not_met (q5c=No) → submission_summary cites § 7120(b)(1)", () => {
  const text = submissionSummaryText({ ...REAL_INTAKE, q5c_share_revenue_50pct: "No" });
  assert(text.length > 0, "submission_summary was empty (harvest rejected?)");
  assertStringIncludes(
    text,
    "§ 7120(b)(1)",
    "M5 resolves not_met with q5c_share_revenue_50pct='No'; submission_summary must cite § 7120(b)(1).",
  );
});

// ---------------------------------------------------------------------------
// CHECK 4 — qc_r1_4_cohort_determinism (§ 7121(a) full three-tier schedule)
//
// Scoping recorded in the file header. Item-204 (Defect B) retired customer-
// specific cohort computation; cyber-audit-schedule.ts emits the full three-
// tier schedule identically for resolved AND indeterminate bands, with tier
// determination reserved to customer + counsel. The harvest guard
// (evaluateSubmissionHarvest) already rejects artifacts missing
// SCHEDULE_MARKER, missing any tier deadline, or matching
// CUSTOMER_COHORT_PATTERNS. This CHECK asserts the schedule is present
// end-to-end on the shipped assembled submission_summary.
// ---------------------------------------------------------------------------

Deno.test("CHECK 4 (qc_r1_4): resolved revenue band → full § 7121(a) schedule in submission_summary", () => {
  const text = submissionSummaryText(REAL_INTAKE);
  assert(text.length > 0, "submission_summary was empty (harvest rejected?)");
  assertStringIncludes(text, SCHEDULE_MARKER, "§ 7121(a) schedule marker missing");
  assertStringIncludes(text, SCHEDULE_LITERALS.tier1.deadline, "tier1 deadline missing");
  assertStringIncludes(text, SCHEDULE_LITERALS.tier2.deadline, "tier2 deadline missing");
  assertStringIncludes(text, SCHEDULE_LITERALS.tier3.deadline, "tier3 deadline missing");
});

Deno.test("CHECK 4 (qc_r1_4): absent revenue band → indeterminate two-cohort treatment subsumed by full schedule", () => {
  const text = submissionSummaryText({ ...REAL_INTAKE, q1_revenue: undefined as unknown as string });
  assert(text.length > 0, "submission_summary was empty (harvest rejected?)");
  assertStringIncludes(text, SCHEDULE_MARKER, "§ 7121(a) schedule marker missing on absent-band intake");
  assertStringIncludes(text, SCHEDULE_LITERALS.tier2.deadline, "tier2 (2029) deadline missing on absent-band intake");
  assertStringIncludes(text, SCHEDULE_LITERALS.tier3.deadline, "tier3 (2030) deadline missing on absent-band intake");
});

Deno.test("CHECK 4 (qc_r1_4): shipped schedule never computes a customer-specific cohort", () => {
  const text = submissionSummaryText(REAL_INTAKE);
  assert(text.length > 0, "submission_summary was empty (harvest rejected?)");
  for (const re of CUSTOMER_COHORT_PATTERNS) {
    assert(
      !re.test(text),
      `submission_summary matched customer-cohort pattern ${re} — Item-204 (Defect B) forbids customer-specific cohort attribution`,
    );
  }
  assertStringIncludes(
    text,
    "The customer, in consultation with qualified legal counsel",
    "reserved-to-counsel closing sentence missing",
  );
});
