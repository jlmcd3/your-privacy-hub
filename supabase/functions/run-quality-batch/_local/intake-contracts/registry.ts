// ITEM 325 — CONTRACT_BY_TOOL, extracted.
//
// This map previously lived inline in run-quality-batch/index.ts, which meant
// the CI fixture-contract matrix could not import it without booting a 3.3k-line
// edge function. It is the single source of truth for "which IntakeContract
// governs which quality-batch tool slug"; run-quality-batch now imports it.
//
// Coverage is Phase-1's nine census tools. Non-contract tools (registration,
// ask-privacy, weekly-brief, custom-brief, trend-report, state-law) are absent
// on purpose and fall through to their hand-typed intake descriptions.

import type { IntakeContract } from "./types.ts";
import { cppaAdmtContract } from "./cppa-admt.ts";
import { cppaRiskContract } from "./cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "./cppa-cybersecurity.ts";
import { governanceContract } from "./governance-assessment.ts";
import { dpiaFrameworkContract } from "./dpia-framework.ts";
import { liAssessmentStageBContract } from "./li-assessment.ts";
import { dpaGeneratorContract } from "./dpa-generator.ts";
import { irPlaybookContract } from "./ir-playbook.ts";
import { biometricCheckerContract } from "./biometric-checker.ts";

export const CONTRACT_BY_TOOL: Record<string, IntakeContract> = {
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
