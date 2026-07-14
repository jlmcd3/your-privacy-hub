// CPPA Cybersecurity — enum option sets extracted into a standalone module so
// shared components (refine surface) and edge-function mirrors can import
// without pulling the full page module. Content-anchored: intake page imports
// MATURITY from here; do not re-declare these literals anywhere else.
//
// RC-FLIP-2 — extracted from src/pages/CPPACybersecurity.tsx to break a
// page↔shared-component circular import that caused a runtime TDZ crash on
// the Governance route (chunk-graph contamination via LIAssessment chunk).

export const MATURITY = [
  "Not implemented",
  "Ad hoc / informal",
  "Documented, partially implemented",
  "Implemented across organization",
  "Implemented with continuous monitoring",
] as const;
