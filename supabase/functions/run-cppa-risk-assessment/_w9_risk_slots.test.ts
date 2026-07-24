// Unit tests for W9-RISK-SLOTS. Run with: deno test --allow-none
// (kept dependency-free — pure functions only).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachAndValidateSlots,
  buildAttestationBlock,
  buildRiskRegister,
  buildSubmissionSummary,
  validateSlots,
  W9_RISK_SLOTS_STAMP,
} from "./_w9_risk_slots.ts";

const baseIntake = {
  content_detail: {
    certifying_exec_name: "Jane Doe",
    certifying_exec_title: "Chief Privacy Officer",
    certifying_contact_email: "jane@example.com",
  },
};

const baseReport = () => ({
  assessment_summary: {
    company_name: "Acme Corp",
    assessment_date: "2026-07-24",
    triggered_activities: ["Selling or sharing personal information"],
    cybersecurity_audit_required: true,
    admt_disclosure_required: false,
  },
  scope_and_triggers: {
    triggered_activities_detail: [
      { activity: "Sale of PI", statutory_basis: "§ 7150(b)(1)" },
      { activity: "Profiling", statutory_basis: "§ 7150(b)(3)" },
    ],
  },
  risk_assessment_by_activity: [
    {
      activity: "Sale of PI",
      statutory_basis: "§ 7150(b)(1)",
      current_safeguards: "SP/CP contracts in place",
      safeguard_gaps: "no annual DPA audit",
      adverse_effects: [
        { harm_type: "unauthorised profiling", likelihood: "Likely", severity: "Significant", description: "..." },
        { harm_type: "reputational harm", likelihood: "Possible", severity: "Moderate", description: "..." },
      ],
    },
  ],
});

Deno.test("W9-RISK-SLOTS stamp is present", () => {
  assert(W9_RISK_SLOTS_STAMP.startsWith("w9-risk-slots"));
});

Deno.test("buildAttestationBlock renders i7/i8 identity + § 7156 basis", () => {
  const ab = buildAttestationBlock(baseIntake, baseReport());
  assertEquals(ab.certifying_executive_name, "Jane Doe");
  assertEquals(ab.certifying_executive_title, "Chief Privacy Officer");
  assertEquals(ab.certifying_contact_email, "jane@example.com");
  assert(/7156/.test(ab.statutory_basis));
  assertEquals(ab.submission_status, "pending");
  assert(ab.certification_statement.length > 40);
});

Deno.test("buildSubmissionSummary extracts § 7150(b)(N) triggered subsections", () => {
  const ss = buildSubmissionSummary(baseIntake, baseReport());
  assertEquals(ss.business_name, "Acme Corp");
  assertEquals(ss.assessment_date, "2026-07-24");
  assert(ss.triggered_subsections.includes("§ 7150(b)(1)"));
  assert(ss.triggered_subsections.includes("§ 7150(b)(3)"));
  assert(/7150.*7157/.test(ss.statutory_framework));
});

Deno.test("buildRiskRegister fans adverse_effects and assigns gap_status + pre/post scoring", () => {
  const rr = buildRiskRegister(baseReport());
  assertEquals(rr.entries.length, 2);
  assertEquals(rr.entries[0].id, "RR-001");
  assertEquals(rr.entries[0].gap_status, "open"); // safeguard_gaps present
  assert(["High", "Critical", "Moderate"].includes(rr.entries[0].residual_risk_level));
  // TURN 1b — pre_safeguard fields present on every row.
  assert("pre_safeguard_likelihood" in rr.entries[0]);
  assert("pre_safeguard_severity" in rr.entries[0]);
  assert("pre_safeguard_residual_risk_level" in rr.entries[0]);
});

Deno.test("attachAndValidateSlots emits all three keys and validates clean", () => {
  const r = baseReport();
  const { attached, validation } = attachAndValidateSlots(r, baseIntake);
  assertEquals(attached.sort(), ["attestation_block", "risk_register", "submission_summary"]);
  assertEquals(validation.ok, true, JSON.stringify(validation.errors));
  assert(r.attestation_block);
  assert(r.submission_summary);
  assert(r.risk_register);
});

Deno.test("validateSlots flags missing statutory anchors", () => {
  const bad = {
    attestation_block: {
      certifying_executive_name: "x", certifying_executive_title: "y", certifying_contact_email: "z",
      certification_statement: "short",
      statutory_basis: "§ 9999", // wrong anchor
      submission_status: "pending", submission_deadline: "n/a",
    },
    submission_summary: {
      assessment_date: "2026-07-24", business_name: "x",
      statutory_framework: "some other framework",
      triggered_subsections: [], compliance_deadline: "x", submission_deadline: "x", submission_basis: "x",
    },
    risk_register: { entries: [{ id: "RR-001" }] },
  };
  const v = validateSlots(bad);
  assertEquals(v.ok, false);
  assert(v.errors.some((e) => e.includes("§ 7156")));
  assert(v.errors.some((e) => e.includes("§§ 7150–7157")));
});
