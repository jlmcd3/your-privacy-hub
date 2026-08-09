// INTAKE-4d — DPIA package stability battery.
//
// Parity rule: only question text and helper prose changed on the wording /
// prefill rows. Keys, options and answer shapes stay byte-identical. The one
// addition is `residual_risks` (CEO-approved, additive, optional).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DPIA_CONTRACT } from "../../supabase/functions/_shared/intake-contracts/dpia-framework";
import { DPIA_PERFECT } from "../../supabase/functions/_shared/golden/dpia";

const page = readFileSync("src/pages/DPIAFramework.tsx", "utf8");
const keys = DPIA_CONTRACT.fields.map((f) => f.key);

describe("INTAKE-4d — DPIA intake package", () => {
  it("keeps the wording-pass and prefill rows on their original keys", () => {
    for (const k of ["transfer_flows", "functional_description", "alternatives_considered", "dpia_team"]) {
      expect(keys).toContain(k);
      expect(page).toContain(k.replace(/_(\w)/g, (_, c) => c.toUpperCase()));
    }
  });

  it("keeps the alternatives row shape byte-identical", () => {
    expect(page).toContain('{ processing_operation: "", alternative: "", rejection_reason: "" }');
  });

  it("never merges dpia_team into dpia_prepared_by", () => {
    expect(keys).toContain("dpia_team");
    expect(keys).toContain("dpia_prepared_by");
    expect(page).toContain("value={dpiaTeam}");
    expect(page).toContain("value={dpiaPreparedBy}");
  });

  it("carries residual_risks end to end as an optional addition", () => {
    const f = DPIA_CONTRACT.fields.find((x) => x.key === "residual_risks");
    expect(f).toBeTruthy();
    expect(f!.required).toBe("optional");
    expect(page).toContain("residual_risks: residualRisks");
    for (const c of DPIA_PERFECT as unknown as Array<{ intake: Record<string, unknown> }>) {
      expect(String(c.intake.residual_risks ?? "").length).toBeGreaterThan(80);
    }
  });

  it("offers the prefills as confirmations, not silent copies", () => {
    expect(page).toContain("Use my earlier answer");
    expect(page).toContain("Start from my earlier answer");
  });
});
