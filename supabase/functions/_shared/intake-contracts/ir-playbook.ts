// RC-REM-P1-C — IR Playbook intake contract.
//
// Intake shape verified against src/pages/IRPlaybook.tsx form state (~L90)
// and inline lists (CAUSES / DATA_TYPES / COUNTS / JUR_GROUPS / ORG_TYPES,
// L36–L71). Post-rulings: no changes to shape.

import type { IntakeContract } from "./types.ts";

const CAUSES = [
  "Unauthorized external access / cyberattack",
  "Ransomware or malware",
  "Phishing / credential compromise",
  "Insider threat",
  "Lost or stolen device",
  "Accidental disclosure",
  "Unknown / still investigating",
] as const;
const DATA_TYPES = [
  "Names and contact details", "Financial / payment data",
  "Health / medical records", "Government IDs / SSN",
  "Passwords / credentials", "Location data", "Children's data",
  "Biometric data", "Special category data",
] as const;
const COUNTS = [
  "Fewer than 100", "100–1,000", "1,000–10,000",
  "10,000–100,000", "More than 100,000", "Unknown",
] as const;
const JURISDICTIONS = [
  // EU / EEA
  "United Kingdom", "Ireland", "France", "Germany", "Spain", "Italy",
  "Netherlands", "Belgium", "Sweden", "Denmark", "Poland", "Greece",
  "Portugal", "Austria", "Finland", "Norway", "Luxembourg", "EU/EEA",
  // US Federal
  "United States (HIPAA)", "United States (FTC)", "United States (SEC)",
  // US States
  "California", "Texas", "New York", "Connecticut", "Colorado", "Virginia",
  "Florida", "Washington", "Illinois", "Massachusetts", "Oregon", "Other US State",
  // Canada
  "Canada (PIPEDA)", "Quebec (Law 25)", "Alberta (PIPA)",
  "British Columbia (PIPA)", "Ontario (PHIPA)",
  // APAC
  "Australia", "Singapore", "Japan",
] as const;
const CONTAINED = ["Yes", "No", "Unknown"] as const;
const ORG_TYPES = [
  "Company", "Public authority", "Healthcare provider",
  "Financial institution", "Other",
] as const;

export {
  CAUSES as IR_CAUSES,
  DATA_TYPES as IR_DATA_TYPES,
  COUNTS as IR_COUNTS,
  JURISDICTIONS as IR_JURISDICTIONS,
  CONTAINED as IR_CONTAINED,
  ORG_TYPES as IR_ORG_TYPES,
};

export const irPlaybookContract: IntakeContract = {
  tool_type: "ir_playbook",
  table: "ir_playbooks",
  fields: [
    { key: "organizationName", kind: "text", required: "always" },
    { key: "discoveryDateTime", kind: "date", required: "always" },
    { key: "cause", kind: "enum", required: "always", options: CAUSES },
    { key: "dataTypes", kind: "multi-enum", required: "always", options: DATA_TYPES },
    { key: "affectedCount", kind: "enum", required: "always", options: COUNTS },
    { key: "jurisdictions", kind: "multi-enum", required: "always", options: JURISDICTIONS },
    { key: "processorInvolved", kind: "boolean", required: "optional" },
    { key: "processorName", kind: "text", required: "optional" },
    { key: "contained", kind: "enum", required: "always", options: CONTAINED },
    { key: "organisationType", kind: "enum", required: "always", options: ORG_TYPES },
  ],
};
