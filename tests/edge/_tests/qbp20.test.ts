// QB-P20 — structural test-design upgrade tests.
//   1. Every golden fixture passes validateIntake against its contract
//      (where a contract exists).
//   2. Pins survive seeding — buildSeedRow includes intakes[] when pins
//      are passed.
//   3. Fixture lint rejects a planted collision fixture.
//   4. gate_v2 truth-table.
//   5. shadow score arithmetic.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { GOLDEN_BY_TOOL } from "../_shared/golden/registry.ts";
import { validateIntake } from "../_shared/intake-contracts/validate.ts";
import { cppaAdmtContract } from "../_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract } from "../_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "../_shared/intake-contracts/cppa-cybersecurity.ts";
import { governanceContract } from "../_shared/intake-contracts/governance-assessment.ts";
import { dpiaFrameworkContract } from "../_shared/intake-contracts/dpia-framework.ts";
import { liAssessmentStageBContract } from "../_shared/intake-contracts/li-assessment.ts";
import { dpaGeneratorContract } from "../_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract } from "../_shared/intake-contracts/ir-playbook.ts";
import { biometricCheckerContract } from "../_shared/intake-contracts/biometric-checker.ts";
import { buildSeedRow } from "../_shared/quality/seed-row.ts";
import { lintFixture } from "../_shared/quality/fixture-lint.ts";
import { evaluateGateV2 } from "../_shared/quality/gate-v2.ts";
import { shadowScore } from "../_shared/quality/shadow-score.ts";

const CONTRACTS: Record<string, unknown> = {
  "cppa-admt": cppaAdmtContract,
  "cppa-risk": cppaRiskContract,
  "cppa-cyber": cppaCybersecurityContract,
  "governance": governanceContract,
  "dpia": dpiaFrameworkContract,
  "lia": liAssessmentStageBContract,
  "dpa-generator": dpaGeneratorContract,
  "ir-playbook": irPlaybookContract,
  "biometric-checker": biometricCheckerContract,
};
Deno.test("QB-P20 goldens validate against their contracts", () => {
  const errors: string[] = [];
  for (const [tool, cases] of Object.entries(GOLDEN_BY_TOOL)) {
    const contract = CONTRACTS[tool];
    if (!contract) continue;
    for (const c of cases) {
      const r = validateIntake(contract as any, c.intake);
      if (!r.ok) errors.push(`${tool}::${c.id} → ${JSON.stringify(r.violations)}`);
    }
  }
  assert(errors.length === 0, "\n" + errors.join("\n"));
});

// (2) Pins survive seeding.
Deno.test("QB-P20 buildSeedRow pins intakes when provided", () => {
  const pins = [{ a: 1 }, { a: 2 }];
  const row = buildSeedRow("dpia", 5, 1, "user-uuid", new Date().toISOString(), { pins });
  assertEquals((row as any).intakes, pins);
  const noPin = buildSeedRow("dpia", 5, 1, "user-uuid", new Date().toISOString());
  assertEquals((noPin as any).intakes, undefined);
});

// (3) Fixture lint rejects planted collisions.
Deno.test("QB-P20 fixture-lint catches planted collisions", () => {
  assert(lintFixture({ narrative: "As an AI, I recommend consulting local counsel." }));
  assert(lintFixture({ note: "Please review [INTERNAL] before shipping." }));
  assert(lintFixture({ prose: "See § 999.99 for details." })); // outside allowlist
  assert(lintFixture({ q: "Answer stored in q5b_share_revenue_50pct field." }));
  // Clean fixture passes.
  assertEquals(lintFixture({ narrative: "Company processes data under GDPR Article 6(1)(f)." }), null);
});

// (4) gate_v2 truth-table.
Deno.test("QB-P20 gate_v2 truth-table", () => {
  const clean = {
    dimensions: { accuracy: 95, citation: 95, hallucination: 95, analysis: 95, intelligence: 95, formatting: 95 },
    findings: [],
    pooledDocs: 15,
  };
  assertEquals(evaluateGateV2(clean).pass, true);
  assertEquals(evaluateGateV2({ ...clean, pooledDocs: 14 }).pass, false);
  assertEquals(evaluateGateV2({ ...clean, dimensions: { ...clean.dimensions, citation: 89 } }).pass, false);
  assertEquals(evaluateGateV2({ ...clean, findings: [{ check_type: "deterministic", severity: "high", passed: false }] }).pass, false);
  assertEquals(evaluateGateV2({ ...clean, findings: [{ check_type: "llm", severity: "critical", passed: false }] }).pass, false);
  // Post-filter LLM medium is fine.
  assertEquals(evaluateGateV2({ ...clean, findings: [{ check_type: "llm", severity: "medium", passed: false }] }).pass, true);
});

// (5) Shadow-score arithmetic.
Deno.test("QB-P20 shadow_score arithmetic", () => {
  assertEquals(shadowScore(100, []), 100);
  // 100 - 25 (critical) - 12 (high) - 6 (medium) - 2 (low) = 55
  assertEquals(shadowScore(100, [
    { check_type: "llm", severity: "critical", passed: false },
    { check_type: "llm", severity: "high", passed: false },
    { check_type: "llm", severity: "medium", passed: false },
    { check_type: "llm", severity: "low", passed: false },
  ]), 55);
  // Deterministic findings ignored by shadow score.
  assertEquals(shadowScore(100, [
    { check_type: "deterministic", severity: "critical", passed: false },
  ]), 100);
  // Never negative.
  assertEquals(shadowScore(10, [
    { check_type: "llm", severity: "critical", passed: false },
    { check_type: "llm", severity: "critical", passed: false },
  ]), 0);
});
