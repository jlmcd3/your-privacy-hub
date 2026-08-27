// ITEM 325 — CONTRACT_BY_TOOL, extracted.
//
// This map previously lived inline in run-quality-batch/index.ts, which meant
// the CI fixture-contract matrix could not import it without booting a 3.3k-line
// edge function. It is the single source of truth for "which IntakeContract
// governs which quality-batch tool slug"; run-quality-batch now imports it.
//
// Coverage: Phase-1's nine census tools + registration (S-R1, doc 80,
// 2026-08-27 — PN-R2 executed: the complete, tested contract moved out of
// archive/unwired/ and registered here). Remaining non-contract tools
// (ask-privacy, weekly-brief, custom-brief, trend-report, state-law) are
// absent on purpose and fall through to their hand-typed intake
// descriptions.

import type { IntakeContract } from "../../../_shared/intake-contracts/types.ts";
import { cppaAdmtContract } from "../../../_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract } from "../../../_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "../../../_shared/intake-contracts/cppa-cybersecurity.ts";
import { governanceContract } from "../../../_shared/intake-contracts/governance-assessment.ts";
import { dpiaFrameworkContract } from "../../../_shared/intake-contracts/dpia-framework.ts";
import { liAssessmentStageBContract } from "../../../_shared/intake-contracts/li-assessment.ts";
import { dpaGeneratorContract } from "../../../_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract } from "../../../_shared/intake-contracts/ir-playbook.ts";
import { registrationContract } from "../../../_shared/intake-contracts/registration-assessment.ts";
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
  "registration":      registrationContract,
  "biometric-checker": biometricCheckerContract,
};
