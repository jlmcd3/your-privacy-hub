// QB-P25 boundary-batch structural prevention.
//
// For every tool that has an IntakeContract in CONTRACT_BY_TOOL (mirrored
// from run-quality-batch/index.ts), assert that EVERY registered golden
// fixture (GOLDEN_BY_TOOL from supabase/functions/_shared/golden/registry.ts)
// validates cleanly against its contract. This catches:
//   - enum values not in options (e.g. cyber maturity "Partial" leak);
//   - required-always fields empty (e.g. admt decision_domains: []);
//   - unknown top-level keys (contract drift).
//
// Non-contract tools (currently: "registration") are exempt — the CI test
// prints them as skipped so the exemption is visible.
//
// If a fixture violates the contract, the failure message identifies the
// tool, fixture id, and the first four violations verbatim.

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { validateIntake } from "../_shared/intake-contracts/validate.ts";
import type { IntakeContract } from "../_shared/intake-contracts/types.ts";

import { GOLDEN_BY_TOOL } from "../_shared/golden/registry.ts";

import { cppaAdmtContract }         from "../_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract }         from "../_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "../_shared/intake-contracts/cppa-cybersecurity.ts";
import { governanceContract }       from "../_shared/intake-contracts/governance-assessment.ts";
import { dpiaFrameworkContract }    from "../_shared/intake-contracts/dpia-framework.ts";
import { liAssessmentStageBContract } from "../_shared/intake-contracts/li-assessment.ts";
import { dpaGeneratorContract }     from "../_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract }       from "../_shared/intake-contracts/ir-playbook.ts";
import { biometricCheckerContract } from "../_shared/intake-contracts/biometric-checker.ts";

// MUST mirror CONTRACT_BY_TOOL in run-quality-batch/index.ts. If a new
// contract is added there, add it here (test intentionally hand-mirrored so
// the runtime map stays free of test imports).
const CONTRACT_BY_TOOL: Record<string, IntakeContract> = {
  "cppa-admt":         cppaAdmtContract,
  "cppa-risk":         cppaRiskContract,
  "cppa-cyber":        cppaCybersecurityContract,
  "governance":        governanceContract,
  "dpia":              dpiaFrameworkContract,
  "lia":               liAssessmentStageBContract,
  "dpa-generator":     dpaGeneratorContract,
  "ir-playbook":       irPlaybookContract,
  "biometric-checker": biometricCheckerContract,
};

Deno.test("golden-contract / every golden fixture validates against its tool contract", () => {
  const failures: string[] = [];
  const skipped: string[] = [];

  for (const [tool, fixtures] of Object.entries(GOLDEN_BY_TOOL)) {
    const contract = CONTRACT_BY_TOOL[tool];
    if (!contract) {
      skipped.push(`${tool} (no contract mapped)`);
      continue;
    }
    for (const fx of fixtures) {
      const res = validateIntake(contract, (fx.intake ?? {}) as Record<string, unknown>);
      if (!res.ok) {
        const head = res.violations.slice(0, 4)
          .map((v) => `${v.key}: ${v.reason}`).join("; ");
        const more = res.violations.length > 4 ? ` (+${res.violations.length - 4} more)` : "";
        failures.push(`  - ${tool} / ${fx.id}: ${head}${more}`);
      }
    }
  }

  if (skipped.length) {
    console.log(`[golden-contract] skipped (no contract): ${skipped.join(", ")}`);
  }
  assert(
    failures.length === 0,
    `Golden fixtures violate their tool contracts:\n${failures.join("\n")}`,
  );
});
