import { describe, it, expect } from "vitest";
import {
  resolveIntakeField,
  pointerResolves,
  intakeTokenIndex,
  verifyLiaIntakeEvidence,
  verifyGovernanceBasisPointers,
} from "../../../supabase/functions/_shared/ltp/fact-pointers.ts";
import { checkIrRequiredFields } from "../../../supabase/functions/_shared/ltp/ir-required-fields.ts";

const intake = {
  organization_name: "Northwind Retail",
  purpose: "fraud scoring on checkout transactions",
  data_subjects: ["customers"],
  details: { annual_chargeback_cost_gbp: 96400, processor: "Stripe" },
};

describe("fact pointers", () => {
  it("resolves dotted and camel/snake-insensitive paths", () => {
    expect(resolveIntakeField(intake, "details.processor")).toBe("Stripe");
    expect(resolveIntakeField(intake, "dataSubjects.0")).toBe("customers");
    expect(resolveIntakeField(intake, "details.nope")).toBeUndefined();
  });

  it("accepts pointers grounded in the intake and rejects invented ones", () => {
    const idx = intakeTokenIndex(intake);
    expect(pointerResolves("chargeback cost of 96400 recorded at intake", idx)).toBe(true);
    expect(pointerResolves("the documented biometric retention schedule", idx)).toBe(false);
  });

  it("LIA: drops unresolvable intake_evidence and adds the absence notice", () => {
    const report: any = {
      balancing_assessment: {
        factor_analysis: [
          {
            factor: "reasonable_expectations",
            intake_evidence: [
              { field: "details.processor", value: "Stripe" },
              { field: "details.biometric_templates", value: "facial templates retained 7 years" },
            ],
          },
          {
            factor: "impact_on_subjects",
            intake_evidence: [{ field: "", value: "a documented history of subject complaints" }],
          },
        ],
      },
    };
    const t = verifyLiaIntakeEvidence(report, intake);
    expect(t.checked).toBe(3);
    expect(t.removed).toBe(2);
    const fa = report.balancing_assessment.factor_analysis;
    expect(fa[0].intake_evidence).toHaveLength(1);
    expect(fa[1].intake_evidence).toHaveLength(0);
    expect(String(fa[1].evidence_absence)).toMatch(/does not present a documented fact/i);
  });

  it("Governance: flags a citation whose engaging fact is not in the record", () => {
    const findings: any = {
      transfers: {
        regulatory_basis_v2: [
          { citation: "GDPR Art. 28(3)", engaged_because: "Stripe acts as a processor for checkout transactions" },
          { citation: "GDPR Art. 9(2)(a)", engaged_because: "the company processes genetic data of employees" },
        ],
      },
    };
    const t = verifyGovernanceBasisPointers(findings, intake);
    expect(t.checked).toBe(2);
    expect(t.unresolved).toBe(1);
    const basis = findings.transfers.regulatory_basis_v2;
    expect(basis[0].pointer_verified).toBe(true);
    expect(basis[1].pointer_verified).toBe(false);
    expect(String(basis[1].engaged_because)).toMatch(/does not name the fact/i);
  });
});

describe("IR required fields", () => {
  const good = `
## Section 3: REGULATORY NOTIFICATION TIMELINE
EU GDPR — Article 33. Computed deadline: 2026-08-14 09:00 UTC
Contractual notification obligations — Triggered: Yes — the Stripe processor agreement at intake requires notice within 24 hours.

## Section 7: POST-INCIDENT ACTIONS
Containment — applied to this incident: the compromised checkout API keys were rotated and the affected node pool isolated.
Eradication — applied to this incident: the credential-stuffing entry path was closed and the attacker's persistence removed.
Recovery — applied to this incident: checkout was restored from clean images with monitoring on the fraud-scoring pipeline.
`;

  it("passes a playbook that renders every required field", () => {
    expect(checkIrRequiredFields(good)).toEqual([]);
  });

  it("flags a hollow field", () => {
    const hollow = good.replace(/Computed deadline: [^\n]*/, "Computed deadline: [TBD]");
    const codes = checkIrRequiredFields(hollow).map((f) => f.detail);
    expect(codes.some((d) => d.startsWith("computed_deadline"))).toBe(true);
  });

  it("flags missing containment/eradication/recovery application", () => {
    const bare = good.replace(/(Containment|Eradication|Recovery) — applied to this incident: [^\n]*\n/g, "");
    const ids = checkIrRequiredFields(bare).map((f) => f.detail.split(":")[0]);
    expect(ids).toEqual(expect.arrayContaining(["containment_applied", "eradication_applied", "recovery_applied"]));
  });

  it("flags a deadline that is only promised elsewhere", () => {
    const promised = `## Section 3
EU GDPR — the notification deadline is computed in the timeline table below.`;
    const codes = checkIrRequiredFields(promised).map((f) => f.code);
    expect(codes).toContain("ir_forward_promise_unfulfilled");
  });
});
