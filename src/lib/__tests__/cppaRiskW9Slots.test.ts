// TURN 1a — Golden slot-presence assertions for CPPA Risk Assessment.
// Verifies that the deterministic W9 slot reprojection produces the three
// typed slots with the required keys/enums. Runs the same builder the edge
// function uses (imported directly from the Deno function source — pure
// TypeScript, no Deno runtime symbols in scope, safe under vitest).
import { describe, it, expect } from "vitest";
import {
  buildAttestationBlock,
  buildSubmissionSummary,
  buildRiskRegister,
  validateSlots,
  attachAndValidateSlots,
} from "../../../supabase/functions/run-cppa-risk-assessment/_w9_risk_slots";

const GOLDEN_INTAKE = {
  content_detail: {
    certifying_exec_name: "Alexandra Rivera",
    certifying_exec_title: "Chief Privacy Officer",
    certifying_contact_email: "arivera@golden.example",
  },
};

const GOLDEN_REPORT = () => ({
  assessment_summary: {
    company_name: "Golden Widgets Inc.",
    assessment_date: "2026-07-24",
    triggered_activities: ["Selling or sharing personal information", "ADMT"],
    cybersecurity_audit_required: true,
    admt_disclosure_required: true,
  },
  scope_and_triggers: {
    triggered_activities_detail: [
      { activity: "Sale of PI to ad networks", statutory_basis: "§ 7150(b)(1)" },
      { activity: "Targeted advertising", statutory_basis: "§ 7150(b)(1)" }, // dedup
      { activity: "Profiling via systematic observation", statutory_basis: "§ 7150(b)(3)" },
      { activity: "ADMT — significant decisions", statutory_basis: "§ 7150(b)(3)" },
    ],
  },
  risk_assessment_by_activity: [
    {
      activity: "Sale of PI to ad networks",
      statutory_basis: "§ 7150(b)(1)",
      current_safeguards: "Compliant service-provider contracts",
      safeguard_gaps: "annual audit not performed",
      adverse_effects: [
        { harm_type: "loss of control", likelihood: "Likely", severity: "Significant" },
      ],
    },
    {
      activity: "Profiling via systematic observation",
      statutory_basis: "§ 7150(b)(3)",
      current_safeguards: "opt-out honored",
      safeguard_gaps: "",
      adverse_effects: [
        { harm_type: "chilling effect", likelihood: "Possible", severity: "Moderate" },
        { harm_type: "reputational harm", likelihood: "Possible", severity: "Moderate" },
      ],
    },
  ],
});

describe("W9-RISK-SLOTS golden presence", () => {
  it("attestation_block renders identity from intake + § 7156 basis", () => {
    const ab = buildAttestationBlock(GOLDEN_INTAKE, GOLDEN_REPORT());
    expect(ab.certifying_executive_name).toBe("Alexandra Rivera");
    expect(ab.certifying_executive_title).toBe("Chief Privacy Officer");
    expect(ab.certifying_contact_email).toBe("arivera@golden.example");
    expect(ab.statutory_basis).toMatch(/7156/);
    expect(ab.certification_statement.length).toBeGreaterThan(40);
    expect(["pending", "submitted", "not_required"]).toContain(ab.submission_status);
  });

  it("submission_summary extracts and dedupes § 7150(b)(N) subsections + carries anchor", () => {
    const ss = buildSubmissionSummary(GOLDEN_INTAKE, GOLDEN_REPORT());
    expect(ss.business_name).toBe("Golden Widgets Inc.");
    expect(ss.statutory_framework).toMatch(/§§\s*7150.*7157/);
    // Dedup: two "§ 7150(b)(1)" and two "§ 7150(b)(3)" collapse to two entries.
    expect(ss.triggered_subsections).toEqual(["§ 7150(b)(1)", "§ 7150(b)(3)"]);
    expect(ss.compliance_deadline).toBe("December 31, 2027");
  });

  it("risk_register fans adverse_effects one-row-per (activity × harm) with stable IDs", () => {
    const rr = buildRiskRegister(GOLDEN_REPORT());
    expect(rr.entries).toHaveLength(3);
    expect(rr.entries.map((e) => e.id)).toEqual(["RR-001", "RR-002", "RR-003"]);
    expect(rr.entries[0].gap_status).toBe("open");
    expect(rr.entries[1].gap_status).toBe("mitigated");
    for (const e of rr.entries) {
      for (const k of ["activity", "harm_type", "likelihood", "severity", "current_safeguards", "gap_status", "residual_risk_level", "statutory_basis"]) {
        expect(e).toHaveProperty(k);
      }
    }
  });

  it("attachAndValidateSlots emits all three keys and validation is clean", () => {
    const r = GOLDEN_REPORT();
    const { attached, validation } = attachAndValidateSlots(r, GOLDEN_INTAKE);
    expect(attached.sort()).toEqual(["attestation_block", "risk_register", "submission_summary"]);
    expect(validation.ok).toBe(true);
    expect(r).toHaveProperty("attestation_block");
    expect(r).toHaveProperty("submission_summary");
    expect(r).toHaveProperty("risk_register");
  });

  it("validateSlots flags missing/malformed anchors", () => {
    const bad: any = {
      attestation_block: {
        certifying_executive_name: "x", certifying_executive_title: "y", certifying_contact_email: "z",
        certification_statement: "short",
        statutory_basis: "§ 9999",
        submission_status: "unknown-state", submission_deadline: "n/a",
      },
      submission_summary: {
        assessment_date: "2026-07-24", business_name: "x",
        statutory_framework: "some other framework",
        triggered_subsections: "not-an-array" as any,
        compliance_deadline: "x", submission_deadline: "x", submission_basis: "x",
      },
      risk_register: { entries: [{ id: "RR-001" }] },
    };
    const v = validateSlots(bad);
    expect(v.ok).toBe(false);
    expect(v.errors.join("|")).toMatch(/§ 7156/);
    expect(v.errors.join("|")).toMatch(/§§ 7150–7157/);
    expect(v.errors.join("|")).toMatch(/triggered_subsections/);
    expect(v.errors.join("|")).toMatch(/submission_status/);
  });
});
