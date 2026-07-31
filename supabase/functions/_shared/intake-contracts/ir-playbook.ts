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

// ── ITEM 312 (Chapter 8 rebuild) — fields the Art. 33/34 determinations
// cannot be run without. Checked against the existing contract first: none of
// these existed, and `discoveryDateTime` (Op. 1's anchor) is untouched.
const ENCRYPTION_STATUS = [
  "All affected data encrypted / rendered unintelligible",
  "Some affected data encrypted",
  "No affected data encrypted",
  "Unknown",
] as const;
const KEY_STATUS = [
  "Keys not compromised",
  "Keys compromised or possibly compromised",
  "Not applicable — no encryption",
  "Unknown",
] as const;
const AWARENESS_CONFIRMATION = [
  "Confirmed — discovery timestamp verified as the moment of awareness",
  "Assumed — detection timestamp treated as awareness pending confirmation",
  "Unknown",
] as const;

export {
  CAUSES as IR_CAUSES,
  DATA_TYPES as IR_DATA_TYPES,
  COUNTS as IR_COUNTS,
  JURISDICTIONS as IR_JURISDICTIONS,
  CONTAINED as IR_CONTAINED,
  ORG_TYPES as IR_ORG_TYPES,
  ENCRYPTION_STATUS as IR_ENCRYPTION_STATUS,
  KEY_STATUS as IR_KEY_STATUS,
  AWARENESS_CONFIRMATION as IR_AWARENESS_CONFIRMATION,
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
    // ITEM 312 — Art. 34(3)(a) is unanswerable without these two.
    { key: "encryptionStatus", kind: "enum", required: "optional", options: ENCRYPTION_STATUS },
    { key: "encryptionKeyStatus", kind: "enum", required: "optional", options: KEY_STATUS },
    // ITEM 312 — Art. 33(3)(a) asks for approximate numbers of BOTH.
    { key: "affectedRecordCount", kind: "text", required: "optional" },
    { key: "affectedDataSubjectCount", kind: "text", required: "optional" },
    // ITEM 312 — the confirmed-vs-assumed flag Op. 1's own logic signals it needs.
    { key: "awarenessConfirmed", kind: "enum", required: "optional", options: AWARENESS_CONFIRMATION },
  ],
};

