// ITEM 381 — the coach reads the SAME intake contracts the gate reads.
//
// Single place where the browser bundle reaches into the shared contract
// modules, so there is one path to audit and no second copy of the field list
// to drift from the gate.

import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment";
import type { CoachContract } from "./askedKeys";
import type { CoachProduct } from "./thinSpots";

export const COACH_CONTRACTS: Record<CoachProduct, CoachContract> = {
  dpia: dpiaFrameworkContract as unknown as CoachContract,
  cppa_risk: cppaRiskContract as unknown as CoachContract,
};
