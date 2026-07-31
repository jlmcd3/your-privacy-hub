/**
 * ITEM 305 — analytic-deliverable ENUMS (Deno side).
 *
 * IMPORT-VS-LITERAL: Supabase edge-function bundling only ships files
 * under supabase/functions/, so these option sets cannot import from
 * src/pages/CPPARiskAssessment.enums.ts at deploy time. They are copied
 * VERBATIM here and parity with the form module is asserted mechanically
 * in ./cppa-risk-analytics.test.ts (Deno, full workspace read access).
 *
 * Single source of truth for authoring: src/pages/CPPARiskAssessment.enums.ts.
 */

export const NECESSITY_STATUS_OPTS = [
  "Necessary to the stated purpose",
  "Collected but not necessary to the stated purpose",
  "Unsure",
] as const;

export const HARM_PATHWAY_OPTS = [
  "(A) Unauthorized access, destruction, use, modification, or disclosure",
  "(B) Unlawful discrimination on protected characteristics",
  "(C) Impairment of consumer control over personal information",
  "(D) Coercion or compulsion, including dark patterns",
  "(E) Economic harms",
  "(F) Physical harms",
  "(G) Reputational harms",
  "(H) Psychological harms",
] as const;

export const HARM_LIKELIHOOD_OPTS = ["Unlikely", "Possible", "Likely", "Highly likely"] as const;

export const HARM_SEVERITY_OPTS = ["Minimal", "Moderate", "Significant", "Severe"] as const;

export const SAFEGUARD_STATUS_OPTS = [
  "Implemented and tested",
  "Implemented, not tested",
  "Planned, not yet implemented",
  "None",
] as const;

/** § 7152(a)(4) enumerates exactly these four beneficiary classes. */
export const BENEFICIARY_CLASSES = [
  "the business",
  "the consumer",
  "other stakeholders",
  "the public",
] as const;

export type NecessityStatus = typeof NECESSITY_STATUS_OPTS[number];
export type HarmLikelihood = typeof HARM_LIKELIHOOD_OPTS[number];
export type HarmSeverity = typeof HARM_SEVERITY_OPTS[number];
export type SafeguardStatus = typeof SAFEGUARD_STATUS_OPTS[number];
export type BeneficiaryClass = typeof BENEFICIARY_CLASSES[number];
