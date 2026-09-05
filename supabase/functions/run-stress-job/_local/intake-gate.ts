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
import { usNoticeContract } from "../../_shared/intake-contracts/us-notice.ts";

// Session-shaped products: ropa and the EU notice still have no single intake
// contract. Batch 4ed05f22 (2026-09-05) — the US notice now has one for its
// token-read questions (see us-notice.ts), after a prose sale/sharing answer
// went through ungated and the generated notice could not state its position.
const CONTRACT_BY_STRESS_TOOL: Record<string, IntakeContract | undefined> = {
  "us-notice": usNoticeContract,
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
/**
 * Batch 4ed05f22 (2026-09-05): a generated fixture carried `""` for the
 * conditional multi-select `admt_detail.appeal_outcomes` and the gate refused
 * the whole run ("multi-enum expected array; got string"). An empty string on
 * a multi-value question is not a state the form produces, but it is not a
 * contradiction either — it is an unanswered question written the wrong way.
 * The gate reads it as unanswered (the key is dropped) instead of blocking;
 * a NON-empty wrong shape still blocks. Returns a copy; never mutates.
 */
export function dropBlankMultiValues(contract: IntakeContract, intake: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = structuredClone(intake);
  for (const f of contract.fields) {
    if (f.kind !== "multi-enum" && f.kind !== "string-array" && f.kind !== "structured") continue;
    if (f.key.includes("[]")) continue; // array-of-records leaves are not blank-able this way
    const segs = f.key.split(".");
    let node: unknown = out;
    for (let i = 0; i < segs.length - 1; i++) {
      if (!node || typeof node !== "object") { node = undefined; break; }
      node = (node as Record<string, unknown>)[segs[i]];
    }
    if (!node || typeof node !== "object") continue;
    const leaf = segs[segs.length - 1];
    if ((node as Record<string, unknown>)[leaf] === "") delete (node as Record<string, unknown>)[leaf];
  }
  return out;
}

export function blockingContractViolations(tool: string, intake: Record<string, unknown>): string[] {
  const contract = CONTRACT_BY_STRESS_TOOL[tool];
  if (!contract) return [];
  const { violations } = validateIntake(contract, dropBlankMultiValues(contract, intake));
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

