// PANEL HARNESS CONTRACT-GATE (2026-08-30, doc 108) — pure module, no env.
// Claude-generated stress intakes that drift from the canonical intake
// contracts silently route the deterministic builders down
// record_insufficient/generic paths, and the resulting low grades read as
// product defects when they are fixture defects. run-stress-job validates
// every fixture here BEFORE the product runs.
import { validateIntake } from "../../_shared/intake-contracts/validate.ts";
import type { IntakeContract } from "../../_shared/intake-contracts/types.ts";
import { liAssessmentStageBContract } from "../../_shared/intake-contracts/li-assessment.ts";
import { dpiaFrameworkContract } from "../../_shared/intake-contracts/dpia-framework.ts";
import { governanceContract } from "../../_shared/intake-contracts/governance-assessment.ts";
import { cppaRiskContract } from "../../_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "../../_shared/intake-contracts/cppa-cybersecurity.ts";
import { cppaAdmtContract } from "../../_shared/intake-contracts/cppa-admt.ts";
import { biometricContract } from "../../_shared/intake-contracts/biometric.ts";
import { irPlaybookContract } from "../../_shared/intake-contracts/ir-playbook.ts";
import { dpaGeneratorContract } from "../../_shared/intake-contracts/dpa-generator.ts";
import { registrationContract } from "../../_shared/intake-contracts/registration-assessment.ts";

// Session-shaped products (ropa / notices) have no single intake contract.
const CONTRACT_BY_STRESS_TOOL: Record<string, IntakeContract | undefined> = {
  "lia": liAssessmentStageBContract,
  "dpia": dpiaFrameworkContract,
  "governance": governanceContract,
  "cppa-risk": cppaRiskContract,
  "cppa-cyber": cppaCybersecurityContract,
  "cppa-admt": cppaAdmtContract,
  "biometric": biometricContract,
  "ir-playbook": irPlaybookContract,
  "dpa": dpaGeneratorContract,
  "registration": registrationContract,
};

export const INTAKE_CONTRACT_GATE_PREFIX = "INTAKE_CONTRACT_GATE";

/** The canonical contract for a stress-harness tool id, if it has one. */
export function contractForStressTool(tool: string): IntakeContract | undefined {
  return CONTRACT_BY_STRESS_TOOL[tool];
}

/** Violation classes that BLOCK the run: a value that is present but not
 * the verbatim label/shape the form emits. These silently degrade output
 * and corrupt the grade. Missing-required and unknown-key findings are
 * logged but do not block — the harness synthesizes some fields per tool
 * (e.g. governance's organization_name from job.company_name), and an
 * honestly sparse record is legitimate product input.
 * DOC 169 (2026-09-04, batch 50b8bcd4) — an EXCLUSIVE multi-enum option
 * selected beside other options (a state the form cannot produce) blocks
 * too: the product's faithful reading of the exclusive answer is then graded
 * as a hallucination, which is a fixture defect wearing a product score. */
export function blockingContractViolations(tool: string, intake: Record<string, unknown>): string[] {
  const contract = CONTRACT_BY_STRESS_TOOL[tool];
  if (!contract) return [];
  const { violations } = validateIntake(contract, intake);
  const blocking = violations.filter((v) =>
    /not in options|expected array|expected a JSON array|is not a non-empty string|exclusive option/.test(v.reason)
  );
  const advisory = violations.filter((v) => !blocking.includes(v));
  if (advisory.length) {
    console.log(JSON.stringify({
      evt: "intake_contract_advisory", fn: "run-stress-job", tool,
      advisory: advisory.slice(0, 12).map((v) => `${v.key}: ${v.reason}`),
    }));
  }
  return blocking.map((v) => `${v.key}: ${v.reason}`);
}

