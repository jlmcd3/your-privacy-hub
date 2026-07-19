import type { QualifierNotes } from "./statutes.types";

/**
 * STATES-1a/1b qualifier notes for the U.S. state comparison matrix.
 *
 * Keys are "STATE_ABBR:PROVISION_INDEX" and match the STATUTES map in
 * `statutes.ts`. Notes render inside the ✓ / Limited / Conditional tooltip
 * beneath the cite. Keep concise (<160 chars).
 */
export const QUALIFIER_NOTES: QualifierNotes = {
  // California — private right of action is limited to defined data-breach categories.
  "CA:10":
    "Limited: private right of action lies only for breaches of specified unencrypted/unredacted PI (§ 1798.150(a)).",

  // Delaware — DPIA required only when the processing activity presents a heightened risk of harm.
  "DE:8":
    "Conditional: DPIA required only for heightened-risk processing (targeted ads, sale, sensitive data, profiling with legal effects).",

  // Florida — no private cause of action.
  "FL:10":
    "No private cause of action; enforcement by the Department of Legal Affairs (§ 501.72(8)).",

  // Vermont — Attorney General enforcement; the Act expressly bars a private right of action.
  "VT:10":
    "No private right of action (§ 2415j(a)); AG enforces via Vermont Consumer Protection Act, ch. 63.",

  // Minnesota — PRoA absent; statute confirms exclusive AG enforcement.
  "MN:10":
    "No private right of action (§ 325M.20(d)); AG has exclusive enforcement.",

  // STATES-1b DPIA sweep — conditional cells triggered by heightened-risk categories.
  "FL:8":
    "Conditional: data protection assessments required for sale, targeted advertising, sensitive-data processing, and heightened-risk profiling (§ 501.713).",
  "IN:8":
    "Conditional: DPIA required for heightened-risk processing per IC § 24-15-6-1 (sale, targeted ads, sensitive data, profiling with legal effects).",
  "KY:8":
    "Conditional: DPIA required for heightened-risk processing per KRS § 367.3617.",
  "MT:8":
    "Conditional: DPIA required for heightened-risk processing per Mont. Code § 30-14-2812.",
  "NE:8":
    "Conditional: DPIA required for heightened-risk processing per Neb. Rev. Stat. § 87-1112.",
  "NH:8":
    "Conditional: DPIA required for heightened-risk processing per RSA 507-H:6.",
};
