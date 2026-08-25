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

// TURN 3 — per-component evidence-availability checklist (ISO 19011 evidence
// typing surface). Parity mirror of intake-contracts/cppa-cybersecurity.ts
// CYBER_EVIDENCE_OPTS. Enforced in cppaCyberTurn3Parity.test.ts.
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

// TURN 3 — framework multi-select for in_scope_frameworks. Parity mirror of
// FRAMEWORK_OPTIONS in the intake contract.
export const CYBER_IN_SCOPE_FRAMEWORKS = [
  "NIST CSF",
  "ISO 27001",
  "SOC 2",
  "HITRUST",
  "PCI DSS",
  "None / informal",
  "Other",
] as const;

// ITEM 315 — § 7122 auditor-engagement status. Content-anchored: the edge
// contract copies this list verbatim (supabase/functions/_shared/ltp/
// cppa-cyber-deliverables/build.ts CYBER_AUDITOR_ENGAGEMENT_OPTIONS) and
// parity is asserted in cppa-cyber-deliverables.test.ts.
export const CYBER_AUDITOR_ENGAGEMENT = [
  "No auditor engaged yet",
  "Internal auditor identified, reporting line not yet settled",
  "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility",
  "Internal auditor engaged, reports to the executive responsible for the cybersecurity program",
  "External auditor engaged",
  "External auditor engaged, independence confirmed in writing",
] as const;

// C1.2 (2026-08-25) — § 7120(a)-(b) audit-applicability predicate inputs.
// VERBATIM reuse of the identical, already-ratified, already-live fields
// from src/pages/CPPARiskAssessment.enums.ts (REVENUE_OPTS, CONSUMER_OPTS,
// Q5_SELL_SHARE_OPTS, SHARE_REVENUE_50PCT_OPTS, Q15_SENSITIVE_PI_OPTS,
// SPI_VOLUME_OPTS) — same statutory tests (§ 1798.140(d)(1)(A)/(C),
// § 7120(b)(2)(A)-(B)), same option wording, no new customer-facing text
// authored. Content-anchored: the edge contract
// (_shared/intake-contracts/cppa-cybersecurity.ts) copies these literally;
// parity is asserted in _tests/intake-contracts.test.ts.
export const CYBER_REVENUE_OPTS = ["Under $25M", "$25M to under $50M", "$50M to $100M", "Over $100M"] as const;
export const CYBER_CONSUMER_OPTS = ["Under 100,000", "100,000 to under 250,000", "250,000 to under 1,000,000", "1,000,000 or more"] as const;
export const CYBER_SELL_SHARE_OPTS = ["Yes — sell only", "Yes — share for advertising only", "Both", "No"] as const;
export const CYBER_SHARE_REVENUE_50PCT_OPTS = ["Yes", "No", "Unsure"] as const;
export const CYBER_SENSITIVE_PI_OPTS = ["Yes", "No", "Unsure"] as const;
export const CYBER_SPI_VOLUME_OPTS = ["Fewer than 50,000", "50,000 or more", "Unsure"] as const;
