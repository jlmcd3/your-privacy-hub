// RC-REM-P1 — CPPA Cybersecurity intake contract (pilot).
//
// Intake shape (verified against src/pages/CPPACybersecurity.tsx):
//   {
//     profile: { entity_name, industry, incidents_12mo, framework, last_audit },
//     controls: [ { key, label, maturity, notes } × 18 ]
//   }
//
// IMPORT-VS-LITERAL DECISION: Supabase edge-function bundling only ships
// files under supabase/functions/, so this contract cannot import from
// src/pages/CPPACybersecurity.enums.ts at deploy time. The MATURITY option
// list is therefore copied verbatim below and parity with the form module
// is enforced mechanically in _tests/intake-contracts.test.ts (which runs
// under Deno with full workspace read access).
//
// Post-Prompt-7 state: controls[].maturity is optional (partial submission
// is permitted; missing maturity is handled by the insufficient-info
// guard). All five profile fields are always-required (form gates submit
// on `allComplete` — every profile leaf non-empty).

import type { IntakeContract } from "./types.ts";

// LITERAL COPY of src/pages/CPPACybersecurity.enums.ts MATURITY (5 items,
// verbatim). Parity is asserted in _tests/intake-contracts.test.ts.
export const CYBER_MATURITY_OPTIONS = [
  "Not implemented",
  "Ad hoc / informal",
  "Documented, partially implemented",
  "Implemented across organization",
  "Implemented with continuous monitoring",
] as const;

// LITERAL COPY of the inline <option> lists in CPPACybersecurity.tsx.
const INCIDENTS_12MO_OPTIONS = [
  "None",
  "1",
  "2–5",
  "More than 5",
] as const;

const FRAMEWORK_OPTIONS = [
  "NIST CSF",
  "ISO 27001",
  "SOC 2",
  "HITRUST",
  "PCI DSS",
  "None / informal",
  "Other",
] as const;

const LAST_AUDIT_OPTIONS = [
  "Within 12 months",
  "12–24 months ago",
  "Over 24 months ago",
  "Never",
] as const;

export const cppaCybersecurityContract: IntakeContract = {
  tool_type: "cppa_cybersecurity",
  table: "cppa_cybersecurity_runs",
  fields: [
    // profile.*
    { key: "profile.entity_name",    kind: "text", required: "always" },
    { key: "profile.industry",       kind: "text", required: "always" },
    { key: "profile.incidents_12mo", kind: "enum", required: "always",
      options: INCIDENTS_12MO_OPTIONS },
    { key: "profile.framework",      kind: "enum", required: "always",
      options: FRAMEWORK_OPTIONS },
    { key: "profile.last_audit",     kind: "enum", required: "always",
      options: LAST_AUDIT_OPTIONS },
    // controls[]
    { key: "controls[].key",     kind: "text",      required: "always" },
    { key: "controls[].label",   kind: "text",      required: "always" },
    { key: "controls[].maturity", kind: "enum",     required: "optional",
      options: CYBER_MATURITY_OPTIONS, askEligible: true },
    { key: "controls[].notes",   kind: "narrative", required: "optional" },
  ],
};
