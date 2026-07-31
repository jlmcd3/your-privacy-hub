/**
 * ITEM 317 — client-side option lists for the biometric intake extension.
 *
 * These are the SAME literals the intake contract declares in
 * `supabase/functions/_shared/intake-contracts/biometric-checker.ts`. The guard
 * test in `src/registry/__tests__/biometric-deliverables.test.ts` asserts the
 * two lists are identical, so the form can never offer a value `validateIntake`
 * would reject.
 */

export const BIO_TRI = ["Yes", "No", "Not known"] as const;

export const BIO_NOTICE = [
  "Written notice given before collection",
  "Notice given before collection, but not in writing",
  "No notice given before collection",
  "Not known",
] as const;

export const BIO_CONSENT_ARTIFACT = [
  "Standalone written release signed before collection",
  "Electronic signature captured in the enrolment flow",
  "Release executed as a condition of employment (onboarding paperwork)",
  "Clickwrap or in-product acceptance",
  "Verbal consent only",
  "No consent obtained",
  "Not known",
] as const;

export const BIO_DISCLOSURE_BASES = [
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
