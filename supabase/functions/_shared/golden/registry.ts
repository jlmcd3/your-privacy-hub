// QB-P20 — Golden registry. Maps tool key → GoldenCase[]. Consumed by the
// orchestrator seed path (buildSeedRow → intakes) and by the pinned_rerun
// admin action.
//
// Coverage: every tool referenced by CONTRACT_BY_TOOL plus non-contract
// tools that ship goldens (registration). Contract-only tools whose
// existing goldens don't conform to the current contract (biometric) use
// the *extra* fixture until the legacy set is re-ratified.

import type { GoldenCase } from "./types.ts";
import { DPIA_GOLDEN } from "./dpia.ts";
import { CPPA_CYBER_GOLDEN } from "./cppa-cyber.ts";
import { DPA_GOLDEN } from "./dpa.ts";
import { IR_PLAYBOOK_GOLDEN } from "./ir-playbook.ts";
import { REGISTRATION_GOLDEN } from "./registration.ts";
import { CPPA_ADMT_GOLDEN } from "./cppa-admt.ts";
import { GOVERNANCE_GOLDEN } from "./governance.ts";
import { LIA_GOLDEN } from "./lia.ts";
import { CPPA_RISK_GOLDEN } from "./cppa-risk.ts";
import { BIOMETRIC_GOLDEN_EXTRA } from "./biometric-extra.ts";

export const GOLDEN_BY_TOOL: Record<string, GoldenCase[]> = {
  "dpia":              DPIA_GOLDEN,
  "cppa-cyber":        CPPA_CYBER_GOLDEN,
  "dpa-generator":     DPA_GOLDEN,
  "ir-playbook":       IR_PLAYBOOK_GOLDEN,
  "registration":      REGISTRATION_GOLDEN,
  "cppa-admt":         CPPA_ADMT_GOLDEN,
  "governance":        GOVERNANCE_GOLDEN,
  "lia":               LIA_GOLDEN,
  "cppa-risk":         CPPA_RISK_GOLDEN,
  "biometric-checker": BIOMETRIC_GOLDEN_EXTRA,
};

/** Return golden intake payloads for pinning (positions 0..N-1). */
export function goldenIntakes(tool: string): unknown[] {
  return (GOLDEN_BY_TOOL[tool] ?? []).map(c => c.intake);
}
