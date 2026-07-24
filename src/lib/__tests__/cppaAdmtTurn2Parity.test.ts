// TURN 2 (cppa-admt) — parity + drift guard for the two new intake fields.
// Ensures the ADMT contract's enum options exactly match the live enums file
// consumed by the intake page's Pills components.

import { describe, expect, it } from "vitest";
import {
  ADMT_AFFECTED_POPULATION_BAND_OPTS as CONTRACT_APB,
  ADMT_ROLE_ROSTER_OPTS as CONTRACT_ROSTER,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-admt";
import {
  ADMT_AFFECTED_POPULATION_BAND_OPTS as ENUMS_APB,
  ADMT_ROLE_ROSTER_OPTS as ENUMS_ROSTER,
} from "@/pages/admt/ADMTChecker.enums";

describe("ADMT TURN 2 intake-field parity", () => {
  it("affected_population_band options match contract ↔ enums verbatim", () => {
    expect([...ENUMS_APB]).toEqual([...CONTRACT_APB]);
  });
  it("role_roster options match contract ↔ enums verbatim", () => {
    expect([...ENUMS_ROSTER]).toEqual([...CONTRACT_ROSTER]);
  });
});
