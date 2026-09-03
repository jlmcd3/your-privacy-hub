// INTAKE-4b — CPPA Cyber wording pass + in_scope_frameworks prefill-confirm
// + remediation_owner addition.
// (a) key/option/stored-value byte-identity snapshot for the cyber contract.
// (b) legacy-shaped saved intake (no profile.remediation_owner) still
//     validates and the field is genuinely optional.
// (c) contract-vs-form parity for the new field and the label registry entry.
// (d) the maturity ladder's rung definitions are untouched (stored values).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { validateIntake } from "../../supabase/functions/_shared/intake-contracts/validate";
import {
  cppaCybersecurityContract,
  CYBER_MATURITY_OPTIONS,
  CYBER_EVIDENCE_OPTS,
  CYBER_IN_SCOPE_FRAMEWORKS,
  CYBER_CONTROL_SLUGS,
  CYBER_AUDITOR_ENGAGEMENT_OPTIONS,
} from "../../supabase/functions/_shared/intake-contracts/cppa-cybersecurity";
import { CYBER_PERFECT, CPPA_CYBER_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-cyber";
import { FIELD_LABELS } from "../../supabase/functions/_shared/customer-messages";

const FORM = readFileSync("src/pages/CPPACybersecurity.tsx", "utf8");

describe("INTAKE-4b — contract key/option snapshot (byte-identity guard)", () => {
  it("stored option values are unchanged", () => {
    expect([...CYBER_MATURITY_OPTIONS]).toEqual([
      "Not implemented",
      "Ad hoc / informal",
      "Documented, partially implemented",
      "Implemented across organization",
      "Implemented with continuous monitoring",
      // DOC 159 (2026-09-03) — § 7123(b)(2)/(c) "if applicable".
      "Not applicable to our information system",
    ]);
    expect(CYBER_CONTROL_SLUGS.length).toBe(18);
    expect(CYBER_EVIDENCE_OPTS.length).toBe(8);
    expect(CYBER_AUDITOR_ENGAGEMENT_OPTIONS.length).toBe(6);
    expect([...CYBER_IN_SCOPE_FRAMEWORKS]).toEqual([
      "NIST CSF", "ISO 27001", "SOC 2", "HITRUST", "PCI DSS", "None / informal", "Other",
    ]);
  });

  it("the new field is profile.remediation_owner, optional text", () => {
    const added = cppaCybersecurityContract.fields.find((f) => f.key === "profile.remediation_owner");
    expect(added?.kind).toBe("text");
    expect(added?.required).toBe("optional");
  });

  // DELIBERATE RE-PIN (2026-08-25, Conversion C1.2 + FC-L4): this test's
  // title and exact field list predate the § 7120(a)-(b) applicability
  // predicate fields (q1_revenue/q2_consumers/q5_sell_share/
  // q5c_share_revenue_50pct/q15_sensitive_pi/q15c_spi_volume) and FC-L4's
  // password_auth_used — see the intake contract's own header comment for
  // the full rationale on each. Re-pinned to the current field list rather
  // than widened to "contains at least"; a future addition should touch
  // this list deliberately, same discipline.
  it("the full field list is the INTAKE-4b set plus C1.2's six applicability fields plus FC-L4's password predicate", () => {
    const keys = cppaCybersecurityContract.fields.map((f) => f.key);
    expect(keys).toEqual([
      "profile.entity_name",
      "profile.industry",
      "profile.incidents_12mo",
      // DOC 159 (2026-09-03) — § 7123(e)(9)/(10), conditional on an incident.
      "profile.incident_notifications",
      "profile.framework",
      "profile.last_audit",
      "profile.in_scope_frameworks",
      "profile.audit_scope_rationale",
      "profile.auditor_engagement_status",
      "profile.prior_audit_scope",
      "profile.remediation_owner",
      "profile.q1_revenue",
      "profile.q2_consumers",
      "profile.q5_sell_share",
      "profile.q5c_share_revenue_50pct",
      "profile.q15_sensitive_pi",
      "profile.q15c_spi_volume",
      "profile.password_auth_used",
      "controls[].key",
      "controls[].label",
      "controls[].maturity",
      "controls[].notes",
      "controls[].evidence",
      // DOC 159 (2026-09-03) — § 7123(b)(2), conditional on the not-applicable maturity.
      "controls[].na_reason",
    ]);
  });

  it("every pinned golden intake still validates unchanged", () => {
    for (const g of CPPA_CYBER_GOLDEN) {
      const res = validateIntake(cppaCybersecurityContract, g.intake as Record<string, unknown>);
      expect(res.ok, `${g.id}: ${res.ok ? "" : res.violations.map((v) => v.key).join(",")}`).toBe(true);
    }
  });
});

describe("INTAKE-4b — legacy draft back-compat", () => {
  it("a legacy intake with no profile.remediation_owner still validates", () => {
    const legacy = JSON.parse(JSON.stringify(CYBER_PERFECT[0].intake)) as any;
    delete legacy.profile.remediation_owner;
    expect("remediation_owner" in legacy.profile).toBe(false);
    const res = validateIntake(cppaCybersecurityContract, legacy);
    expect(res.ok, res.ok ? "" : res.violations.map((v) => `${v.key}: ${v.reason}`).join("; ")).toBe(true);
  });
});

describe("INTAKE-4b — contract-vs-form parity for the addition", () => {
  it("the form emits profile.remediation_owner and the label registry names it", () => {
    expect(FORM).toContain("remediation_owner:");
    expect(FORM).toContain("Who owns remediation of findings from this audit?");
    expect(FIELD_LABELS["profile.remediation_owner"]).toBe("owner of remediation for audit findings");
  });

  it("CYBER_PERFECT answers the new field", () => {
    const p = (CYBER_PERFECT[0].intake as any).profile;
    expect(typeof p.remediation_owner).toBe("string");
    expect(p.remediation_owner.trim().length).toBeGreaterThan(0);
  });
});

describe("INTAKE-4b — prefill-confirm, never merge", () => {
  it("in_scope_frameworks remains its own question with its own key", () => {
    expect(FORM).toContain('data-rail-key="in_scope_frameworks"');
    expect(FORM).toContain("toggleInScopeFramework");
    // Prefill machinery present and gated on an untouched row.
    expect(FORM).toContain("inScopePrefilled");
    expect(FORM).toContain("inScopeTouched");
  });
});
