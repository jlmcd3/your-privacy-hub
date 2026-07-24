// INTAKE-RAIL PARITY (standing rule) — every new intake field ships with a
// RailEntry in the tool's rail map. This guard fails loudly if a listed key
// is missing or lacks the required RailEntry shape (citation + regulationText).

import { describe, expect, it } from "vitest";
import { ADMT_RAIL } from "@/components/admt/admtRailEntries";
import { CPPA_RISK_RAIL } from "@/components/cppa/CPPARiskRailEntries";

const REQUIRED: { name: string; map: Record<string, any>; keys: string[] }[] = [
  { name: "ADMT_RAIL", map: ADMT_RAIL, keys: ["affected_population_band", "role_roster"] },
  { name: "CPPA_RISK_RAIL", map: CPPA_RISK_RAIL, keys: ["sensitive_location_basis", "public_privacy_policy_url"] },
];

describe("Intake-rail parity — TURN 2 + TURN 1b retrofit", () => {
  for (const r of REQUIRED) {
    for (const k of r.keys) {
      it(`${r.name}.${k} exists with citation + regulationText`, () => {
        const e = r.map[k];
        expect(e, `${r.name}.${k} missing`).toBeTruthy();
        expect(typeof e.citation).toBe("string");
        expect(e.citation.length).toBeGreaterThan(3);
        expect(typeof e.regulationText).toBe("string");
        expect(e.regulationText.length).toBeGreaterThan(20);
      });
    }
  }
});
