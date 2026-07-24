// TURN 3 (cppa-cyber) — parity + drift guard for the new intake fields.
// Ensures the Cybersecurity contract's enum options exactly match the live
// enums file consumed by the intake page's Pills components.

import { describe, expect, it } from "vitest";
import {
  CYBER_EVIDENCE_OPTS as CONTRACT_EVIDENCE,
  CYBER_IN_SCOPE_FRAMEWORKS as CONTRACT_FRAMEWORKS,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-cybersecurity";
import {
  CYBER_EVIDENCE_OPTS as ENUMS_EVIDENCE,
  CYBER_IN_SCOPE_FRAMEWORKS as ENUMS_FRAMEWORKS,
} from "@/pages/CPPACybersecurity.enums";

describe("CYBER TURN 3 intake-field parity", () => {
  it("evidence options match contract ↔ enums verbatim", () => {
    expect([...ENUMS_EVIDENCE]).toEqual([...CONTRACT_EVIDENCE]);
  });
  it("in_scope_frameworks options match contract ↔ enums verbatim", () => {
    expect([...ENUMS_FRAMEWORKS]).toEqual([...CONTRACT_FRAMEWORKS]);
  });
});
