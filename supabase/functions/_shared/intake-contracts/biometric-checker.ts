// RC-REM-P1-C — Biometric Checker intake contract.
//
// Intake shape verified against src/pages/BiometricChecker.tsx form state
// (~L58) and inline option lists (TYPES / ORG / PURPOSE / JURS, L41–L44).
// Post-ruling: no enrolledCount.

import type { IntakeContract } from "./types.ts";

const TYPES = [
  "Facial geometry / facial recognition",
  "Fingerprint / palm print",
  "Voiceprint / speaker recognition",
  "Iris or retina scan",
  "Gait analysis",
  "Vein pattern recognition",
  "Other biometric identifier",
] as const;
const ORG = [
  "Employer (employee biometrics)",
  "Consumer app or platform",
  "Healthcare provider",
  "Financial institution / fintech",
  "Security / access control provider",
  "Research organisation",
  "Other",
] as const;
const PURPOSE = [
  "Time & attendance / workforce management",
  "Physical access control",
  "Customer authentication",
  "Surveillance / monitoring",
  "Research or product development",
  "Other",
] as const;
const JURS = [
  "EU / EEA (GDPR)",
  "United Kingdom (UK GDPR)",
  "Illinois, USA (BIPA)",
  "Texas, USA (CUBI)",
  "Washington state, USA",
  // BIO-REG-W1-S2b — discrete registry-backed US enum entries. Each maps
  // directly to a Wave-1/Wave-2 registered jurisdiction via
  // biometric-select.ts. "Other US state" remains for everything else.
  "California, USA (CCPA/CPRA)",
  "Colorado, USA (CPA)",
  "New York, USA (SHIELD)",
  "Other US state",
  "United States — Federal (FTC)",
  "Canada (PIPEDA / provincial)",
  "Australia (Privacy Act)",
] as const;

export {
  TYPES as BIO_TYPES,
  ORG as BIO_ORG,
  PURPOSE as BIO_PURPOSE,
  JURS as BIO_JURS,
};

export const biometricCheckerContract: IntakeContract = {
  tool_type: "biometric_checker",
  table: "biometric_assessments",
  fields: [
    { key: "orgName", kind: "text", required: "always" },
    { key: "biometricTypes", kind: "multi-enum", required: "always", options: TYPES },
    { key: "orgType", kind: "enum", required: "always", options: ORG },
    { key: "purpose", kind: "enum", required: "always", options: PURPOSE },
    { key: "jurisdictions", kind: "multi-enum", required: "always", options: JURS },
    // W3-T3 — optional free-text naming the specific US state(s) when the
    // "Other US state" jurisdiction is selected. Present ⇒ the generator
    // produces a single conditional-framework section for that state
    // instead of the compact unresolved candidate-statute block.
    { key: "other_state_names", kind: "text", required: "optional" },
  ],
};

