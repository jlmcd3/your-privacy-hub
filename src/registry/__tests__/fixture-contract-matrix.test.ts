// ITEM 325 — FLEET-WIDE FIXTURE × TOOL × VARIANT CONTRACT MATRIX.
//
// run-quality-batch validates EVERY pinned intake against the tool's
// IntakeContract at run start and aborts the whole batch on the first
// violation ("Pinned-fixture contract violations for <tool> (n/N)").
// Item 324 proved that a contract change adding a `required: "always"` field
// silently rots the pinned sets until someone starts a batch and watches it
// die at second zero.
//
// This test turns that failure mode red at commit time. It walks the FULL
// matrix — every tool in CONTRACT_BY_TOOL × every fixture variant that
// currently has content ("perfect" today, "messy" the moment the first messy
// fixture lands in _shared/golden/messy-registry.ts) — and runs the exact
// validator the batch runs.
//
// It is deliberately generic: nobody has to remember to extend it when a new
// tool, contract, or variant is added.

import { describe, it, expect } from "vitest";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate";
import { CONTRACT_BY_TOOL } from "../../../supabase/functions/run-quality-batch/_local/intake-contracts/registry";
import { GOLDEN_BY_TOOL } from "../../../supabase/functions/_shared/golden/registry";
import { MESSY_BY_TOOL } from "../../../supabase/functions/_shared/golden/messy-registry";
import { CPPA_RISK_CONTRACT_FIXTURES } from "../../../supabase/functions/_shared/cppa-risk-contract-fixtures";

type Variant = "perfect" | "messy";

const SETS: Record<Variant, Record<string, Array<{ id?: string; intake: unknown }>>> = {
  perfect: GOLDEN_BY_TOOL as unknown as Record<string, Array<{ id?: string; intake: unknown }>>,
  messy: MESSY_BY_TOOL as unknown as Record<string, Array<{ id?: string; intake: unknown }>>,
};

function fmt(v: { key: string; reason: string }[]): string {
  return v.slice(0, 8).map((x) => `${x.key}: ${x.reason}`).join("; ");
}

describe("fixture × tool × variant contract matrix", () => {
  const tools = Object.keys(CONTRACT_BY_TOOL).sort();

  it("covers every contract-backed tool", () => {
    // Guard against the map being emptied or an import going stale.
    expect(tools.length).toBeGreaterThanOrEqual(9);
  });

  for (const tool of tools) {
    const contract = CONTRACT_BY_TOOL[tool];

    for (const variant of ["perfect", "messy"] as Variant[]) {
      const cases = SETS[variant][tool] ?? [];

      if (cases.length === 0) {
        // "messy" is expected to be empty until those fixtures are authored;
        // "perfect" being empty is a real regression for a contract-backed tool.
        if (variant === "perfect") {
          it(`${tool} / perfect — has at least one pinned fixture`, () => {
            expect(cases.length, `no golden fixtures for ${tool}`).toBeGreaterThan(0);
          });
        }
        continue;
      }

      it(`${tool} / ${variant} — all ${cases.length} pinned fixtures satisfy the contract`, () => {
        const fails: string[] = [];
        cases.forEach((c, i) => {
          const res = validateIntake(contract, (c.intake ?? {}) as Record<string, unknown>);
          if (!res.ok) fails.push(`#${i}${c.id ? ` (${c.id})` : ""} → ${fmt(res.violations)}`);
        });
        expect(fails.join(" | ")).toBe("");
      });
    }
  }

  // The cppa-risk revision fixtures are a second pinned set consumed by the
  // same start-gate; Item 324 landed them and they must stay in the matrix.
  it("cppa-risk revision-contract fixtures satisfy the contract", () => {
    const fails: string[] = [];
    CPPA_RISK_CONTRACT_FIXTURES.forEach((f, i) => {
      const intake = ((f as unknown as { intake?: unknown }).intake ?? f) as Record<string, unknown>;
      const res = validateIntake(CONTRACT_BY_TOOL["cppa-risk"], intake);
      if (!res.ok) fails.push(`#${i} → ${fmt(res.violations)}`);
    });
    expect(fails.join(" | ")).toBe("");
  });
});
