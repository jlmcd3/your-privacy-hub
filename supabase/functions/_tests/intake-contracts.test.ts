// RC-REM-P1 — Intake-contract acceptance tests.
//
// Three test surfaces per covered tool:
//   (a) PARITY:   contract enum options === form .enums.ts exports.
//   (b) MIRROR:   FIELD_ENUM_MIRROR entries the contract owns match the
//                 contract options element-for-element.
//   (c) FIXTURE:  every registered fixture validates cleanly against its
//                 contract.
//
// The .enums.ts modules are imported by relative path — all five have zero
// imports, verified safe under Deno.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { validateIntake } from "../_shared/intake-contracts/validate.ts";
import {
  cppaCybersecurityContract,
  CYBER_MATURITY_OPTIONS,
} from "../_shared/intake-contracts/cppa-cybersecurity.ts";
import { CYBER_CONTRACT_FIXTURES } from "../_shared/cyber-contract-fixtures.ts";
import { FIELD_ENUM_MIRROR } from "../_shared/field-enums.ts";
// Form enums module (zero imports; safe to load under Deno test).
import { MATURITY as FORM_MATURITY } from "../../../src/pages/CPPACybersecurity.enums.ts";

Deno.test("intake-contracts / cyber PARITY — contract MATURITY === form MATURITY", () => {
  assertEquals(
    [...CYBER_MATURITY_OPTIONS],
    [...FORM_MATURITY],
    "cppa-cybersecurity contract MATURITY drifted from src/pages/CPPACybersecurity.enums.ts",
  );
});

Deno.test("intake-contracts / cyber MIRROR — FIELD_ENUM_MIRROR maturity === contract options", () => {
  const mirror = FIELD_ENUM_MIRROR["cppa_cybersecurity:maturity"];
  assert(Array.isArray(mirror), "cppa_cybersecurity:maturity missing from FIELD_ENUM_MIRROR");
  assertEquals([...mirror!], [...CYBER_MATURITY_OPTIONS]);
});

Deno.test("intake-contracts / cyber FIXTURES — every fixture validates cleanly", () => {
  for (const fx of CYBER_CONTRACT_FIXTURES) {
    const res = validateIntake(
      cppaCybersecurityContract,
      fx.intake as Record<string, unknown>,
    );
    assert(
      res.ok,
      `fixture ${fx.fixture_id} violates contract: ${JSON.stringify(res.violations)}`,
    );
  }
});

// Sanity checks on the validator itself so regressions are caught here
// rather than surfacing only through downstream fixture drift.
Deno.test("intake-contracts / validator — flags unknown top-level key", () => {
  const res = validateIntake(cppaCybersecurityContract, {
    profile: {
      entity_name: "X",
      industry: "Y",
      incidents_12mo: "None",
      framework: "SOC 2",
      last_audit: "Never",
    },
    controls: [],
    bogus_key: 1,
  } as Record<string, unknown>);
  assert(!res.ok);
  assert(res.violations.some((v) => v.key === "bogus_key"));
});

Deno.test("intake-contracts / validator — flags off-enum maturity", () => {
  const res = validateIntake(cppaCybersecurityContract, {
    profile: {
      entity_name: "X",
      industry: "Y",
      incidents_12mo: "None",
      framework: "SOC 2",
      last_audit: "Never",
    },
    controls: [{ key: "c1_auth", label: "Authentication", maturity: "Implemented", notes: "" }],
  } as Record<string, unknown>);
  assert(!res.ok);
  assert(res.violations.some((v) => v.key === "controls[].maturity"));
});

Deno.test("intake-contracts / validator — accepts empty maturity (optional)", () => {
  const res = validateIntake(cppaCybersecurityContract, {
    profile: {
      entity_name: "X",
      industry: "Y",
      incidents_12mo: "None",
      framework: "SOC 2",
      last_audit: "Never",
    },
    controls: [{ key: "c1_auth", label: "Authentication", maturity: "", notes: "" }],
  } as Record<string, unknown>);
  assert(res.ok, JSON.stringify(res.violations));
});
