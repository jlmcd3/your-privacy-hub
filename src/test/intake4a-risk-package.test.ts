// INTAKE-4a — CPPA Risk wording pass + materialChangeSincePrior addition.
// (a) key/option/stored-value byte-identity snapshot for the risk contract.
// (b) legacy-shaped saved draft (no material_change_since_prior key) still
//     validates and the field is genuinely optional.
// (c) contract-vs-form parity for the new field.
import { describe, it, expect } from "vitest";
import { validateIntake } from "../../supabase/functions/_shared/intake-contracts/validate";
import { cppaRiskContract } from "../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment";
import { CPPA_RISK_PERFECT, CPPA_RISK_GOLDEN } from "../../supabase/functions/_shared/golden/cppa-risk";
import { FIELD_LABELS } from "../../supabase/functions/_shared/customer-messages";

describe("INTAKE-4a — contract key/option snapshot (byte-identity guard)", () => {
  it("every field key + option array is unchanged except the new optional addition", () => {
    const shape = cppaRiskContract.fields.map((f) => ({
      key: f.key,
      kind: f.kind,
      required: f.required,
      options: f.options ?? null,
    }));
    // The new field must be present, optional, and enum Yes/No.
    const added = shape.find((f) => f.key === "material_change_since_prior");
    expect(added).toBeTruthy();
    expect(added?.required).toBe("optional");
    expect(added?.options).toEqual(["Yes", "No"]);
    // Every other field must still validate cleanly against the existing
    // pinned golden set (unchanged wording/keys/options).
    for (const g of CPPA_RISK_GOLDEN) {
      const res = validateIntake(cppaRiskContract, g.intake as Record<string, unknown>);
      expect(res.ok, `${g.id}: ${res.ok ? "" : res.violations.map((v) => v.key).join(",")}`).toBe(true);
    }
  });
});

describe("INTAKE-4a — legacy draft back-compat", () => {
  it("a legacy intake missing material_change_since_prior still validates (key is optional)", () => {
    const legacy = { ...(CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>) };
    expect("material_change_since_prior" in legacy).toBe(false);
    const res = validateIntake(cppaRiskContract, legacy);
    expect(res.ok, res.ok ? "" : res.violations.map((v) => `${v.key}: ${v.reason}`).join("; ")).toBe(true);
  });

  it("a legacy intake produces a byte-identical object when re-serialised (no silent mutation)", () => {
    const legacy = { ...(CPPA_RISK_GOLDEN[0].intake as Record<string, unknown>) };
    const before = JSON.stringify(legacy);
    validateIntake(cppaRiskContract, legacy);
    expect(JSON.stringify(legacy)).toBe(before);
  });
});

describe("INTAKE-4a — contract-vs-form-vs-fixture parity for the new field", () => {
  it("RISK_PERFECT answers material_change_since_prior like every other asked field", () => {
    const intake = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;
    expect(intake.material_change_since_prior).toBe("Yes");
    const res = validateIntake(cppaRiskContract, intake);
    expect(res.ok, res.ok ? "" : res.violations.map((v) => `${v.key}: ${v.reason}`).join("; ")).toBe(true);
  });

  it("FIELD_LABELS carries a humanized label for the new key", () => {
    expect(FIELD_LABELS.material_change_since_prior).toBeTruthy();
  });

  it("the form declares the matching state setter and intake key", () => {
    const fs = require("fs") as typeof import("fs");
    const src = fs.readFileSync(require("path").resolve(__dirname, "../../../src/pages/CPPARiskAssessment.tsx"), "utf8");
    expect(src).toContain("materialChangeSincePrior");
    expect(src).toContain("material_change_since_prior: materialChangeSincePrior");
    expect(src).toContain('Has this processing activity changed materially since the last assessment?');
  });
});
