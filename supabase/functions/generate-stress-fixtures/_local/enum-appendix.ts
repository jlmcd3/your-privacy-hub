// PANEL HARNESS — VERBATIM OPTION APPENDIX (2026-08-31).
//
// The fixture prompts describe enum fields as "string" / ["array"], so the
// generator invents plausible labels ("Children & EdTech", "GB", "identifiers")
// that are not the labels the forms emit. Every such value is refused by the
// intake contract gate in run-stress-job, and the batch then measures fixture
// naming rather than product quality.
//
// This module renders the contracts' OWN option lists into the prompt so the
// generator must choose verbatim. It is derived, never hand-maintained: if a
// contract option changes, the appendix changes with it.

import type { IntakeContract } from "../../_shared/intake-contracts/types.ts";
import { governanceContract } from "../../_shared/intake-contracts/governance-assessment.ts";
import { dpaGeneratorContract } from "../../_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract } from "../../_shared/intake-contracts/ir-playbook.ts";
import { biometricContract } from "../../_shared/intake-contracts/biometric.ts";
import { registrationContract } from "../../_shared/intake-contracts/registration-assessment.ts";
import { liAssessmentStageBContract } from "../../_shared/intake-contracts/li-assessment.ts";
import { dpiaFrameworkContract } from "../../_shared/intake-contracts/dpia-framework.ts";
import { cppaAdmtContract } from "../../_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract } from "../../_shared/intake-contracts/cppa-risk-assessment.ts";

const CONTRACTS: Record<string, IntakeContract> = {
  governance: governanceContract,
  dpa: dpaGeneratorContract,
  irPlaybook: irPlaybookContract,
  biometric: biometricContract,
  registration: registrationContract,
  lia: liAssessmentStageBContract,
  dpia: dpiaFrameworkContract,
  cppaAdmt: cppaAdmtContract,
  cppaRisk: cppaRiskContract,
};

/**
 * Render an "ALLOWED VALUES" block for the given prompt object names.
 * Objects with no contract (usNotice, euNotice, ropa, cppaCyber) are skipped.
 */
export function enumAppendix(objectNames: string[]): string {
  const blocks: string[] = [];
  for (const name of objectNames) {
    const contract = CONTRACTS[name];
    if (!contract) continue;
    const lines: string[] = [];
    for (const f of contract.fields) {
      if (!f.options || !f.options.length) continue;
      if (f.kind !== "enum" && f.kind !== "multi-enum" && f.kind !== "string-array") continue;
      const many = f.kind !== "enum";
      lines.push(
        `- ${name}.${f.key}${many ? "[] (choose 1+)" : " (choose exactly 1)"}: ${
          f.options.map((o) => JSON.stringify(o)).join(" | ")
        }`,
      );
    }
    if (lines.length) blocks.push(lines.join("\n"));
  }
  if (!blocks.length) return "";
  return `

ALLOWED VALUES — COPY VERBATIM.
The fields below are closed lists. Emit the option string EXACTLY as written
here, character for character (including punctuation, dashes and casing). Do
not paraphrase, translate, abbreviate, use ISO country codes, or invent a new
label. If none of the options is a perfect fit, choose the closest one (or the
"Other" option where one exists). Fields not listed here are free text.

${blocks.join("\n")}`;
}
