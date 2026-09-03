// INTAKE-4f / 4g — Governance + Biometric intake package batteries.
//
// 4f: one wording row (`dsrCapability`) and two prefill-confirm rows
// (`euUkData`, `specialCategory`). Keys and stored option strings unchanged.
// 4g: one wording row (Texas / CUBI framing) and one CEO-approved addition
// (`biometric_consent_withdrawal`), wired end to end.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { biometricContract } from "../../supabase/functions/_shared/intake-contracts/biometric";

const gov = readFileSync("src/pages/GovernanceAssessment.tsx", "utf8");
const bio = readFileSync("src/pages/BiometricChecker.tsx", "utf8");
const perfect = readFileSync("supabase/functions/quality-batch-orchestrator/_local/golden/biometric-perfect.ts", "utf8");
const golden = readFileSync("supabase/functions/quality-batch-orchestrator/_local/golden/biometric.ts", "utf8");
const labels = readFileSync("supabase/functions/_shared/customer-messages.ts", "utf8");

describe("INTAKE-4f — governance intake package", () => {
  it("keeps the dsr option strings byte-identical after the wording pass", () => {
    for (const o of [
      "Yes — documented and tested across all vendors",
      "Documented but not tested",
      "Ad hoc / not documented",
      "No process in place",
      "Unsure",
    ]) {
      expect(gov).toContain(`"${o}"`);
    }
    expect(gov).toContain("dsr_capability: dsrCapability");
  });

  it("offers euUkData and specialCategory as prefill confirmations", () => {
    expect(gov).toContain("Use my earlier answer — you selected an EU/UK jurisdiction");
    expect(gov).toContain("Use my earlier answer — you selected health or biometric data");
    expect(gov).toContain("eu_uk_data: euUkData");
    expect(gov).toContain("special_category: specialCategory");
  });
});

describe("INTAKE-4g — biometric intake package", () => {
  it("keeps the Texas framing statutorily accurate in the question's own text", () => {
    expect(bio).toContain("§ 503.001");
    expect(bio).toContain("one year");
  });

  it("carries biometric_consent_withdrawal end to end as an optional addition", () => {
    const f = biometricContract.fields.find((x) => x.key === "biometric_consent_withdrawal");
    expect(f).toBeTruthy();
    expect(f!.required).toBe("optional");
    expect(bio).toContain("form.biometric_consent_withdrawal");
    expect(labels).toContain("biometric_consent_withdrawal:");
    expect(perfect).toContain("biometric_consent_withdrawal:");
    expect(golden.match(/biometric_consent_withdrawal:/g)?.length).toBe(2);
  });

  it("frames withdrawal BIPA-neutrally", () => {
    expect(bio).toContain("Where GDPR applies, withdrawal must be as easy as giving consent.");
    expect(bio).not.toContain("BIPA gives");
  });
});
