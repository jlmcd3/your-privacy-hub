// LIA (Legitimate Interest Assessment) — enum option sets extracted into a
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
