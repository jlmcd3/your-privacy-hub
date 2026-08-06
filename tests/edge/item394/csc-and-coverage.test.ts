// ITEM 394 LEG C — ADMT CSC + COVERAGE tests.
//
// Identities:
//   item394 csc a2 repairs a backed absence claim from the single writer
//   item394 csc a2 preserves honest absence on a silent record
//   item394 csc a1 flags insufficient_basis against a backed element
//   item394 csc a3 drops absence prose from an authority field
//   item394 csc fails open on a hostile report
//   item394 coverage zero orphans on a live-parity ADMT record
//   item394 coverage flags a supplied fact whose section carries nothing
//   item394 coverage declared anchorage only — undeclared actions never orphan
//   item394 coverage flags an ask against a supplied fact
//   item394 gate reads a2 as the ADMT false-absence id

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runAdmtCsc } from "../../../supabase/functions/_shared/ltp/admt-csc.ts";
import { runCoverageMatrix } from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { FALSE_ABSENCE_CHECK_IDS } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { ADMT_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-admt.ts";

const ABSENT = "The record is silent here, and the question is carried forward.";

function backedIntake(): Record<string, unknown> {
  return {
    system_name: "Tenancy Fit Index",
    system_type: "Applicant screening",
    system_description: "Scores rental applications against an affordability rubric.",
    decision_domains: ["Housing decisions"],
    human_review: "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
    opt_out_appeal_process: "Applicants may request human review within 15 business days via the applicant portal.",
    access_logic_disclosure: "Plain-language summary of the affordability rubric bands and the applicant's rank position.",
    admt_detail: { appeal_reviewer_role: "senior leasing manager", appeal_trained: "Yes", appeal_authority_overturn: "Yes" },
  };
}

Deno.test("item394 csc a2 repairs a backed absence claim from the single writer", () => {
  const report: Record<string, unknown> = {
    adequacy_finding: { logic_disclosure: { conclusion: "adequate", reason: ABSENT } },
  };
  const t = runAdmtCsc(report, { intake: backedIntake() });
  const v = t.violations.find((x) => x.check_id === "a2_absence_claim_vs_record");
  assert(v, "expected an a2 violation");
  assertEquals(v!.repaired, true);
  const reason = String((report.adequacy_finding as any).logic_disclosure.reason);
  assert(reason.includes("affordability rubric"), reason);
  assertEquals((report.adequacy_finding as any).logic_disclosure.conclusion, "adequate");
});

Deno.test("item394 csc a2 preserves honest absence on a silent record", () => {
  const report: Record<string, unknown> = {
    adequacy_finding: { logic_disclosure: { conclusion: "insufficient_basis", reason: ABSENT } },
  };
  const t = runAdmtCsc(report, { intake: { system_name: "X" } });
  assertEquals(t.violations.filter((v) => v.check_id === "a2_absence_claim_vs_record").length, 0);
  assertEquals(String((report.adequacy_finding as any).logic_disclosure.reason), ABSENT);
});

Deno.test("item394 csc a1 flags insufficient_basis against a backed element", () => {
  const report: Record<string, unknown> = {
    adequacy_finding: { human_intervention: { conclusion: "insufficient_basis", reason: "Not established." } },
  };
  const t = runAdmtCsc(report, { intake: backedIntake() });
  const v = t.violations.find((x) => x.check_id === "a1_element_conclusion_vs_record");
  assert(v, "expected an a1 violation");
  assertEquals(v!.path, "adequacy_finding.human_intervention.conclusion");
});

Deno.test("item394 csc a3 drops absence prose from an authority field", () => {
  const report: Record<string, unknown> = {
    notice_element_findings: [{ element_id: "b1", element_verbatim: ABSENT }],
  };
  const t = runAdmtCsc(report, { intake: {} });
  assert(t.violations.some((v) => v.check_id === "a3_authority_field_hygiene"));
  assertEquals((report.notice_element_findings as any)[0].element_verbatim, undefined);
});

Deno.test("item394 csc fails open on a hostile report", () => {
  const hostile: Record<string, unknown> = {};
  (hostile as any).self = hostile; // cyclic — JSON.stringify inside str() must not kill the run
  const t = runAdmtCsc(hostile, { intake: backedIntake() });
  // Fail-open: the pass returns telemetry rather than throwing, and the report
  // is never left half-written.
  assertEquals(typeof t.version, "string");
  assertEquals(Array.isArray(t.violations), true);
});

// ── coverage ───────────────────────────────────────────────────────────────

Deno.test("item394 coverage zero orphans on a live-parity ADMT record", () => {
  const intake = ADMT_PERFECT[0].intake as Record<string, unknown>;
  const filler = (label: string) =>
    `${label}: the record's own facts are set out here at sufficient length to satisfy the substance floor.`;
  const report: Record<string, unknown> = {
    scope_analysis: { summary: filler("scope") },
    notice_element_findings: [{ element_id: "b1", why: filler("notice") }],
    opt_out_gaps: [{ finding: filler("opt out") }],
    access_readiness_findings: [{ element_id: "b2_logic", why: filler("access") }],
    adequacy_finding: { logic_disclosure: { conclusion: "adequate", reason: filler("adequacy") } },
    documentation_to_maintain: [{ finding: filler("documentation") }],
    risk_assessment_obligation: { summary: filler("risk assessment obligation") },
    information_needed: [],
    top_3_actions: [{ action: "Publish the pre-use notice", anchor_keys: ["notice_delivery"] }],
  };
  const t = runCoverageMatrix("cppa-admt", report, intake);
  assertEquals(t.crashed, false);
  assertEquals(t.orphans.map((o) => `${o.type}@${o.path}`), []);
});

Deno.test("item394 coverage flags a supplied fact whose section carries nothing", () => {
  const t = runCoverageMatrix("cppa-admt", { scope_analysis: {} }, {
    system_name: "Tenancy Fit Index",
    system_description: "Scores rental applications.",
  });
  assert(t.orphans.some((o) => o.type === "supplied_fact_without_section" && o.path === "scope_analysis"));
});

Deno.test("item394 coverage declared anchorage only — undeclared actions never orphan", () => {
  const undeclared = runCoverageMatrix("cppa-admt", {
    top_3_actions: [{ action: "Do a thing nobody recorded" }],
  }, {});
  assertEquals(undeclared.orphans.filter((o) => o.type === "action_without_record_anchor").length, 0);

  const declared = runCoverageMatrix("cppa-admt", {
    top_3_actions: [{ action: "Do a thing", anchor_keys: ["opt_out_methods"] }],
  }, {});
  assertEquals(declared.orphans.filter((o) => o.type === "action_without_record_anchor").length, 1);
});

Deno.test("item394 coverage flags an ask against a supplied fact", () => {
  const t = runCoverageMatrix("cppa-admt", {
    scope_analysis: { summary: "x".repeat(80) },
    information_needed: [{ text: "Supply access_logic_disclosure." }],
  }, { access_logic_disclosure: "Plain-language summary of the ranking factors." });
  assert(t.orphans.some((o) => o.type === "ask_against_supplied_fact"));
});

Deno.test("item394 gate reads a2 as the ADMT false-absence id", () => {
  assertEquals(FALSE_ABSENCE_CHECK_IDS["cppa-admt"], ["a2_absence_claim_vs_record"]);
});
