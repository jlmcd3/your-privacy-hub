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

// QB-P5 Item 1 — canonical 18 control slugs verified against
// src/pages/CPPACybersecurity.tsx (form emits these keys position-for-
// position). Contract now pins controls[].key to this enum so fixture
// intakes cannot invent alternative slugs (e.g. asset_inventory, mfa).
export const CYBER_CONTROL_SLUGS = [
  "c1_auth",
  "c2_encryption",
  "c3_account_access",
  "c4_inventory",
  "c5_secure_config",
  "c6_vuln_mgmt",
  "c7_audit_logs",
  "c8_network_mon",
  "c9_anti_malware",
  "c10_segmentation",
  "c11_port_protocol",
  "c12_awareness",
  "c13_training",
  "c14_secure_dev",
  "c15_third_party",
  "c16_retention",
  "c17_incident",
  "c18_continuity",
] as const;

// TURN 3 — per-component evidence-availability checklist (ISO 19011 evidence
// typing surface). LITERAL COPY of CPPACybersecurity.enums.ts
// CYBER_EVIDENCE_OPTS. Parity is asserted in cppaCyberTurn3Parity.test.ts.
export const CYBER_EVIDENCE_OPTS = [
  "Policy / procedure document",
  "Runbook / SOP",
  "Screenshot / config export",
  "Sample log / report",
  "SOC 2 or auditor letter",
  "Third-party pen test / scan report",
  "Training completion record",
  "None on file",
] as const;

// TURN 3 — in_scope_frameworks: multi-enum drawn from FRAMEWORK_OPTIONS so
// callers cannot invent alternative framework names.
export const CYBER_IN_SCOPE_FRAMEWORKS = FRAMEWORK_OPTIONS;

// ITEM 315 — § 7122 auditor-engagement status. LITERAL COPY of
// src/pages/CPPACybersecurity.enums.ts CYBER_AUDITOR_ENGAGEMENT. Parity with
// the form module and with the deliverables builder is asserted in
// src/registry/__tests__/cppa-cyber-deliverables.test.ts.
export const CYBER_AUDITOR_ENGAGEMENT_OPTIONS = [
  "No auditor engaged yet",
  "Internal auditor identified, reporting line not yet settled",
  "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility",
  "Internal auditor engaged, reports to the executive responsible for the cybersecurity program",
  "External auditor engaged",
  "External auditor engaged, independence confirmed in writing",
] as const;


// ITEM 315 — § 7122 auditor-engagement status. LITERAL COPY of
// src/pages/CPPACybersecurity.enums.ts CYBER_AUDITOR_ENGAGEMENT. Parity with
// the form module and with the deliverables builder is asserted in
// src/registry/__tests__/cppa-cyber-deliverables.test.ts.
export const CYBER_AUDITOR_ENGAGEMENT_OPTIONS = [
  "No auditor engaged yet",
  "Internal auditor identified, reporting line not yet settled",
  "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility",
  "Internal auditor engaged, reports to the executive responsible for the cybersecurity program",
  "External auditor engaged",
  "External auditor engaged, independence confirmed in writing",
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
    // TURN 3 — scope framing fields (optional; feed C-C scope justification).
    { key: "profile.in_scope_frameworks", kind: "multi-enum", required: "optional",
      options: CYBER_IN_SCOPE_FRAMEWORKS, askEligible: true },
    { key: "profile.audit_scope_rationale", kind: "narrative", required: "optional",
      askEligible: true },
    // ITEM 315 — § 7122 independence inputs (optional; feed the
    // independence determination and the § 7122(g) retention finding).
    { key: "profile.auditor_engagement_status", kind: "enum", required: "optional",
      options: CYBER_AUDITOR_ENGAGEMENT_OPTIONS, askEligible: true },
    { key: "profile.prior_audit_scope", kind: "narrative", required: "optional",
      askEligible: true },
    // controls[]
    { key: "controls[].key",     kind: "enum",      required: "always",
      options: CYBER_CONTROL_SLUGS },
    { key: "controls[].label",   kind: "text",      required: "always" },
    { key: "controls[].maturity", kind: "enum",     required: "optional",
      options: CYBER_MATURITY_OPTIONS, askEligible: true },
    { key: "controls[].notes",   kind: "narrative", required: "optional" },
    // TURN 3 — per-component evidence-availability checklist.
    { key: "controls[].evidence", kind: "multi-enum", required: "optional",
      options: CYBER_EVIDENCE_OPTS, askEligible: true },
  ],
};
