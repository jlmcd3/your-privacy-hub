// BATCH a77240e3 (2026-09-12) — ChatGPT's "Report Prose Review v5" plus
// Claude's independent code check agreed on three real Governance defects.
//
// GOV5-01 — buildRiskCalibrationFinding's not_satisfied branch never set
// information_needed, so the remediation register (which derives its Action
// column from that field) rendered "—" for a genuine adverse finding — the
// same defect class DOC 162 already fixed on buildReviewAndUpdateFinding's
// two adverse branches, just missed here.
// GOV5-02 — the risk-calibration prose stated its own severity-vs-frequency
// inference immediately after naming "Article 24(1)", reading as if the
// Article itself supplied that exact rule.
// GOV5-03 — the passed-target-date note flagged the problem but gave no
// process for establishing live dates.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRiskCalibrationFinding } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { deriveRemediationRegisterTable } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

function riskIntake(over: Bag = {}): Bag {
  return {
    special_category: "Yes",
    technical_controls: "No",
    processing_nature: "Collection and analysis of health records for a clinical research study.",
    processing_scope: "All enrolled patients across three participating clinics.",
    processing_context: "An ongoing multi-year research collaboration.",
    processing_purposes: "Support of a longitudinal health outcomes study.",
    ...over,
  };
}

// ── GOV5-01 ────────────────────────────────────────────────────────────────

Deno.test("GOV5-01 — the not_satisfied risk-calibration finding now carries information_needed", () => {
  const f = buildRiskCalibrationFinding(riskIntake() as never) as unknown as Bag;
  assertEquals(f.verdict, "not_satisfied");
  assert(f.information_needed, "expected information_needed on the adverse branch");
  assertStringIncludes(String(f.information_needed), "calibrated to the severity");
});

Deno.test("GOV5-01 — the register's Action cell for this finding is no longer blank", () => {
  const f = buildRiskCalibrationFinding(riskIntake() as never) as unknown as Bag;
  const plan = [{ finding_key: "risk_calibration", domain: "risk_calibration", action_type: "Compliance gap", accountable_owner: "DPO", target_date: "2027-01-01", priority: "High", validation_method: "Internal review", status: "analysed" }];
  const table = deriveRemediationRegisterTable({ remediation_plan: plan, domain_element_findings: [{ key: "risk_calibration", label: "Article 24(1) risk calibration", record_fact: String(f.record_fact), information_needed: f.information_needed }] } as never, "2026-09-12")!;
  const actionCell = table.rows[0][2];
  assert(actionCell !== "—" && actionCell.trim().length > 0, `blank Action cell: ${actionCell}`);
});

Deno.test("GOV5-01 — the satisfied branch (risk true, controls strong) still carries no information_needed (no regression)", () => {
  const f = buildRiskCalibrationFinding(riskIntake({ technical_controls: "Yes — DLP/content filtering actively enforced" }) as never) as unknown as Bag;
  assertEquals(f.verdict, "satisfied");
  assertEquals(f.information_needed, undefined);
});

// ── GOV5-02 ────────────────────────────────────────────────────────────────

Deno.test("GOV5-02 — the risk-calibration inference is attributed to this assessment, not stated as Article 24(1) itself", () => {
  const f = buildRiskCalibrationFinding(riskIntake() as never) as unknown as Bag;
  assertStringIncludes(String(f.application), "On this assessment's reading");
});

// ── GOV5-03 ────────────────────────────────────────────────────────────────

Deno.test("GOV5-03 — the passed-target-date note now states a process (convene, per-item reassignment, re-approval), not only the flag", () => {
  const plan = [{
    finding_key: "records_of_processing.ropa_maintained",
    domain: "records_of_processing",
    action_type: "Compliance gap",
    accountable_owner: "Chief Privacy Officer",
    target_date: "2025-06-30",
    priority: "High — remediate this quarter",
    validation_method: "External audit or assurance report",
    validation_method_source: "recorded",
    status: "analysed",
  }];
  const t = deriveRemediationRegisterTable({ remediation_plan: plan, domain_element_findings: [] } as never, "2026-09-12")!;
  const note = String(t.note ?? "");
  assertStringIncludes(note, "a revised, owner-approved date is required");
  assertStringIncludes(note, "convene promptly");
  assertStringIncludes(note, "assign a revised date to each item");
  assertStringIncludes(note, "ranked by the risk it addresses");
  assertStringIncludes(note, "re-approve the updated register");
});

Deno.test("GOV5-03 — a future target date carries no passed-date process language (no regression)", () => {
  const plan = [{
    finding_key: "records_of_processing.ropa_maintained", domain: "records_of_processing", action_type: "Compliance gap",
    accountable_owner: "Chief Privacy Officer", target_date: "2027-06-30", priority: "High — remediate this quarter",
    validation_method: "External audit or assurance report", validation_method_source: "recorded", status: "analysed",
  }];
  const t = deriveRemediationRegisterTable({ remediation_plan: plan, domain_element_findings: [] } as never, "2026-09-12")!;
  assert(!String(t.note ?? "").includes("convene promptly"));
});
