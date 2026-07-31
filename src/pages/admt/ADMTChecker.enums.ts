// ADMT Checker — enum option sets for the `admt_detail` (aka `adv`) nested
// intake object. Extracted into a standalone module so both the intake page
// and the refine surface's structured editor can import them without
// introducing an import cycle. Do not re-declare these literals anywhere.

export const ADMT_VENDOR_STATUS_OPTS = ["Service provider", "Contractor", "Third party", "Unsure"];
export const ADMT_VENDOR_DOCS_OPTS = ["Model card / datasheet", "Validation report", "Bias-testing report", "SOC 2 / pen test", "DPIA", "None on file"];
export const ADMT_YES_NO_OPTS = ["Yes", "No"];
export const ADMT_YES_NO_UNSURE_OPTS = ["Yes", "No", "Unsure"];
export const ADMT_HOSTING_OPTS = ["Hosted internally", "Hosted by the vendor", "Hybrid"];
export const ADMT_MODEL_TYPE_OPTS = ["Rules engine", "Statistical model", "ML classifier", "Ranking / recommender", "Generative AI", "Biometric", "Emotion recognition", "Identity verification"];
export const ADMT_DECISION_EFFECT_OPTS = ["Provision", "Denial", "Ranking", "Eligibility", "Pricing", "Allocation", "Assignment", "Promotion / demotion", "Suspension / termination", "Compensation", "Credentialing", "Diagnosis / care / treatment"];
export const ADMT_DECISION_CADENCE_OPTS = ["One-time", "Repeated", "Continuous", "Systematic"];
export const ADMT_SOLE_FACTOR_OPTS = ["Sole factor — output alone determines the outcome", "Material factor — heavily weighted alongside others", "One of many factors"];
export const ADMT_SOLELY_ADVERTISING_OPTS = ["Yes — solely advertising", "No"];

// TURN 2 — new intake fields (parity mirror of contract options).
export const ADMT_AFFECTED_POPULATION_BAND_OPTS = [
  "Under 1,000",
  "1,000 – 10,000",
  "10,001 – 100,000",
  "100,001 – 1,000,000",
  "Over 1,000,000",
  "Unsure",
];
export const ADMT_ROLE_ROSTER_OPTS = [
  "Executive sponsor",
  "Privacy officer / DPO",
  "Legal counsel",
  "Product owner",
  "Data scientist / ML engineer",
  "Security officer",
  "Human reviewer",
  "Consumer-request handler",
  "Vendor manager",
];

// ITEM 308 — § 7221(b)(2) exception evidence (Chapter 3 (E)(1) intake additions).
export const ADMT_SOLE_USE_ATTESTATION_OPTS = [
  "Yes — solely to assess ability to perform",
  "No — the output is also used for other purposes",
  "Unsure",
];
export const ADMT_NONDISCRIM_TESTING_OPTS = [
  "Yes — documented testing record",
  "Testing performed but not documented",
  "No testing performed",
  "Unsure",
];
