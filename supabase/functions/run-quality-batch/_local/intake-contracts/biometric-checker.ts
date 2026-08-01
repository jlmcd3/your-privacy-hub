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
  // BIO-REG-W1-S3 — Singapore added as a discrete registry-backed enum.
  "Singapore (PDPA)",
] as const;

// ITEM 317 — the intake previously asked what data the organisation processes
// but not what it DOES about it, which made per-duty analysis structurally
// impossible. These option lists mirror src/registry/biometric-intake-options.ts
// exactly; a guard test asserts the two stay identical.
const TRI = ["Yes", "No", "Not known"] as const;
const NOTICE = [
  "Written notice given before collection",
  "Notice given before collection, but not in writing",
  "No notice given before collection",
  "Not known",
] as const;
const CONSENT_ARTIFACT = [
  "Standalone written release signed before collection",
  "Electronic signature captured in the enrolment flow",
  "Release executed as a condition of employment (onboarding paperwork)",
  "Clickwrap or in-product acceptance",
  "Verbal consent only",
  "No consent obtained",
  "Not known",
] as const;
const DISCLOSURE_BASES = [
  "No disclosures are made",
  "Subject consent to the disclosure",
  "Subject consent for identification on disappearance or death",
  "Completes a financial transaction the subject requested or authorised",
  "Required by law",
  "Warrant or subpoena",
  "Necessary to provide a product or service the subject requested",
  "Third party contractually promises no further disclosure",
  "To prepare for or respond to litigation",
] as const;

export {
  TYPES as BIO_TYPES,
  ORG as BIO_ORG,
  PURPOSE as BIO_PURPOSE,
  JURS as BIO_JURS,
  TRI as BIO_TRI,
  NOTICE as BIO_NOTICE,
  CONSENT_ARTIFACT as BIO_CONSENT_ARTIFACT,
  DISCLOSURE_BASES as BIO_DISCLOSURE_BASES,
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

    // ── ITEM 317 intake extension ────────────────────────────────────────
    // Scope and characterisation facts.
    { key: "data_source_description", kind: "text", required: "optional" },
    { key: "healthcare_tpo_context", kind: "enum", required: "optional", options: TRI },
    { key: "entity_is_government", kind: "enum", required: "optional", options: TRI },
    { key: "glba_financial_institution", kind: "enum", required: "optional", options: TRI },

    // Permission artifacts (BIPA § 15(b), CUBI § 503.001(b), RCW 19.375.020(1)).
    { key: "notice_before_collection", kind: "enum", required: "optional", options: NOTICE },
    { key: "consent_artifact_type", kind: "enum", required: "optional", options: CONSENT_ARTIFACT },
    { key: "release_artifact_description", kind: "text", required: "optional" },

    // Retention and destruction (BIPA § 15(a), CUBI § 503.001(c)(3), RCW 19.375.020(4)).
    { key: "retention_schedule_text", kind: "text", required: "optional" },
    { key: "retention_policy_public", kind: "enum", required: "optional", options: TRI },
    { key: "destruction_trigger", kind: "text", required: "optional" },

    // Profit and disclosure (BIPA § 15(c)/(d), CUBI § 503.001(c)(1), RCW 19.375.020(3)).
    { key: "sells_or_profits", kind: "enum", required: "optional", options: TRI },
    { key: "disclosure_recipients", kind: "text", required: "optional" },
    { key: "disclosure_bases", kind: "multi-enum", required: "optional", options: DISCLOSURE_BASES },

    // Security (BIPA § 15(e), CUBI § 503.001(c)(2), RCW 19.375.020(4)(a)).
    { key: "security_measures_description", kind: "text", required: "optional" },
    { key: "protection_parity", kind: "enum", required: "optional", options: TRI },

    // Texas-specific facts the one-year clock and its qualifiers turn on.
    { key: "tx_destruction_within_one_year", kind: "enum", required: "optional", options: TRI },
    { key: "tx_longer_retention_required_by_law", kind: "enum", required: "optional", options: TRI },
    { key: "tx_employer_security_collection", kind: "enum", required: "optional", options: TRI },
    { key: "tx_ai_training_use", kind: "enum", required: "optional", options: TRI },

    // Washington-specific facts the enrollment predicate turns on.
    { key: "wa_enrolls_in_database", kind: "enum", required: "optional", options: TRI },
    { key: "wa_commercial_purpose", kind: "enum", required: "optional", options: TRI },
    { key: "wa_security_purpose_only", kind: "enum", required: "optional", options: TRI },

    // Item 323 — RCW 19.373 (My Health My Data Act). A DISTINCT Washington
    // authority from RCW 19.375: its own predicate, its own duties, its own
    // enforcement route. Never merged with the wa_* fields above.
    { key: "wa_mhmda_health_inference", kind: "enum", required: "optional", options: TRI },
    { key: "wa_mhmda_privacy_policy_published", kind: "enum", required: "optional", options: TRI },
    { key: "wa_mhmda_collection_consent", kind: "enum", required: "optional", options: TRI },
    { key: "wa_mhmda_share_consent_separate", kind: "enum", required: "optional", options: TRI },
    { key: "wa_mhmda_geofence_health_facility", kind: "enum", required: "optional", options: TRI },
  ],
};

