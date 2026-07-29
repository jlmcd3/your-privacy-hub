/**
 * ITEM 249 — TRACK 2 STAGE 4 / Rider (C1): GRADER-CHECK MIRROR.
 *
 * Mirrors 3 of the 7 cppa-risk deterministic grader checks into the
 * product e2e gate. Per courier: "Never ship a document that
 * deterministically fails a known check." Not-yet-scoped:
 * qc_r1_4_cohort_determinism, qc_r1_5_exception_fields_consumed,
 * qc_r1_7_enhancement_placement_det, qc_ws6_1_supplemental_consumption.
 *
 * Discipline: Item 236 law — report the true state; never weaken or
 * narrow a check to force green.
 */
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleReport } from "./pass2-assembler.ts";
import { derivePlan } from "./derive.ts";
import { CPPA_RISK_CONCLUSIONS } from "../legal-test/cppa-risk-conclusions.ts";

export const GRADER_CHECK_MIRROR_VERSION = "grader-check-mirror-2026-07-29-item250";

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

Deno.test("CHECK 1 (qc_r1_1): information_needed makes no ask about an already-resolved intake field", () => {
  // ITEM 250 (Ruling B, team-unanimous 2026-07-29) — SCAFFOLD WIRED.
  // The optional `resolution_source_fields` field is now defined on the
  // Type-J ConclusionSpec type, and composeInformationNeeded skips a
  // Type-J entry when every listed intake field is populated on the
  // plan's intake_ledger. No registry row populates the field today,
  // so the assertion below still FAILS by design — the failure now
  // documents the HELD content courier rather than an absent mechanism.
  //
  // Do NOT force this green by inventing resolution_source_fields values
  // in the registry. Population must arrive as a CEO-signed courier per
  // the standing content-law.
  const plan = planFor(REAL_INTAKE);
  assembleReport(plan, {}, { exitMode: "observe" });

  const jSpecs = CPPA_RISK_CONCLUSIONS.filter((c) => c.epistemic_type === "J");
  const populatedSpecs = jSpecs.filter(
    (c) => (c.resolution_source_fields?.length ?? 0) > 0,
  );

  assert(
    populatedSpecs.length === jSpecs.length && jSpecs.length > 0,
    "scaffold wired (Item 250); resolution_source_fields not yet " +
      "populated — HELD pending CEO sign-off on " +
      "docs/courier/ITEM250-RULING-B-TYPEJ-RESOLUTION-FIELDS-2026-07-29.md. " +
      `Observed: ${jSpecs.length} Type-J ConclusionSpec rows; ` +
      `${populatedSpecs.length} carry resolution_source_fields.`,
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
