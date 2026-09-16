// LIA (Legitimate Interests Assessment) — enum option sets extracted into a
// standalone module so both the intake page and shared components (refine
// surface) can import them without a page↔shared-component cycle.
// Content-anchored: page re-exports from here.
//
// RC-FLIP-3 — extraction from src/pages/LIAssessment.tsx. The LIAssessment
// chunk was the site of the TDZ ReferenceError on the Governance route
// because Rollup hoisted these bindings out of the page and reused them from
// the shared refine surface. Anchoring to a standalone module breaks the
// cycle.

export const DATA_CATEGORIES = [
  "Contact data", "Purchase/transaction history", "Browsing/behavioural data",
  "Location data", "Employment data", "Financial data", "Health or medical data",
  "Biometric data", "Special category data", "Communications data", "Device/technical data", "Other",
];
export const RELATIONSHIPS = [
  "Existing customer", "Prospective customer", "Employee", "Former employee",
  "Website visitor (no account)", "B2B contact", "Member of the public", "Other",
];
export const JURISDICTIONS = [
  "EU (GDPR)", "United Kingdom (UK GDPR)", "United States — Federal",
  "California (CCPA/CPRA)", "Other US States", "Canada", "Brazil (LGPD)",
  "Australia", "Singapore", "Other",
];

// DOC 189 (2026-09-05, CEO-approved wording; the PN-L6 resolution) — the
// two device-access questions that feed the ePrivacy gate directly instead
// of leaving it to lexicons over the free-text description. Q2 is shown only
// when Q1 is "Yes". Verbatim copies live in the intake contract
// (_shared/intake-contracts/li-assessment.ts).
export const DEVICE_ACCESS_OPTS = ["Yes", "No", "Not sure"];
export const DEVICE_ACCESS_NECESSITY_OPTS = [
  "Yes — all of it is strictly necessary",
  "No — some or all of it goes further",
  "Not sure",
];

// DOC 206E (2026-09-07, CEO-approved 206D §3 / doc 210 ruling A2-4/A2-5) —
// the four closed-list fields (N1, N4, N4b, N6) that convert families
// F2/F3/F6/F10 from "information required" into a real determination.
// Verbatim copies live in the intake contract
// (_shared/intake-contracts/li-assessment.ts). Byte-for-byte per spec —
// do not add, rename or reorder options.
export const ART9_CONDITIONS = [
  "Explicit consent (Art. 9(2)(a))",
  "Employment, social security or social protection law (Art. 9(2)(b))",
  "Vital interests (Art. 9(2)(c))",
  "Not-for-profit body's legitimate activities (Art. 9(2)(d))",
  "Data manifestly made public by the individual (Art. 9(2)(e))",
  "Legal claims or judicial acts (Art. 9(2)(f))",
  "Substantial public interest (Art. 9(2)(g))",
  "Health or social care (Art. 9(2)(h))",
  "Public health (Art. 9(2)(i))",
  "Archiving, research or statistics (Art. 9(2)(j))",
  "None identified",
  "Not yet assessed",
  // LIA master review (2026-09-15, F12) — biometric data outside the Art. 9(1)
  // unique-identification purpose (verbatim copy in the contract).
  "Not applicable — the biometric data is not used to uniquely identify individuals",
];
export const MARKETING_CHANNELS = [
  "Automated calls (recorded messages)",
  "Live calls",
  "Email or SMS to individuals",
  "Post",
  "Online advertising",
  "None of these",
];
export const MARKETING_CONSENT_BASES = [
  "Consent obtained",
  "Soft opt-in (existing customers; the organisation's own similar products or services)",
  "Soft opt-in (charity supporters)",
  "None",
  "Not yet assessed",
];
export const ACHIEVABLE_WITHOUT_PERSONAL_DATA = [
  "Yes — the purpose could be achieved without personal data, or with anonymised or synthetic data",
  "No — personal data is required (explain why below)",
  "Not assessed",
];

// LIA master review (2026-09-15) — closed lists the full intake used to
// inline, plus the new questions. Verbatim copies of the contract lists
// (_shared/intake-contracts/li-assessment.ts); parity enforced by the test.
export const STATED_PURPOSE_STATUS_OPTS = [
  "Published in our current privacy notice",
  "Proposed wording — not yet published",
  "Not yet drafted",
];
export const CHILDREN_AGE_BAND_OPTS = ["Under 13", "13 to 15", "16 to 17", "Mixed ages", "Not known"];
export const BIOMETRIC_UNIQUE_ID_OPTS = ["Yes", "No", "Not sure"];
export const APPROVAL_STATUS_OPTS = ["Approved", "Approval pending", "Not yet submitted for approval", "Not applicable"];
export const RELATIONSHIP_CATEGORY_OPTS = [
  "Customer", "Employee", "Prospect", "Member of the public — no relationship",
  "Mixed — more than one relationship", "Other",
];
export const POTENTIAL_HARM_SEVERITY_OPTS = [
  "Negligible — annoyance only",
  "Limited — minor inconvenience or unwanted contact",
  "Significant — discrimination, financial loss, reputational damage",
  "Severe — physical safety, identity theft, loss of livelihood",
  "Not assessed",
];
// F05 — the vulnerable-group list gains two children entries so the age band
// drives the selection instead of an inferred "under 16"; F16 — "None" is
// exclusive on the page.
export const VULNERABLE_GROUP_OPTS = [
  "Children under 16",
  "Children aged 16 or 17",
  "Children (age range not established)",
  "Patients / health context",
  "Employees",
  "Job applicants",
  "Financially vulnerable",
  "Other",
  "None",
];
export const VULNERABLE_GROUP_EXCLUSIVE = "None";
// F16 — harms: "None identified" and "Unknown" are honest, exclusive answers.
export const HARM_OPTS = [
  "Financial loss",
  "Discrimination or unfair treatment",
  "Reputational damage",
  "Loss of autonomy or control over data",
  "Distress or intrusion",
  "Exclusion from a service",
  "Physical safety risk",
  "Identity theft or fraud exposure",
  "None identified",
  "Unknown",
];
export const HARM_EXCLUSIVE = ["None identified", "Unknown"];
// F16 — safeguards: "None in place yet" is an honest, exclusive answer.
export const SAFEGUARD_OPTS = [
  "Encryption at rest and in transit",
  "Pseudonymisation",
  "Access controls / least privilege",
  "Retention limits",
  "Independent oversight (DPO / privacy committee)",
  "DPIA completed",
  "Vendor due diligence",
  "Notice at collection (privacy information given when the data is collected)",
  "Opt-out offered",
  "Other",
  "None in place yet",
];
export const SAFEGUARD_EXCLUSIVE = "None in place yet";
export const MARKETING_CHANNELS_EXCLUSIVE = "None of these";
