/**
 * LIA pilot assisted-input pill sets — Doc U v2/v3/v3.1.
 *
 * Snippets VERBATIM from EUP_DocU_LIA_Pilot_Snippet_Pack_SIGNOFF
 * (team-finalized). Four fields × 6 pills = 24 pills, each C2-tagged.
 *
 * PERMANENTLY EXCLUDED — no pills, ever (balancing-test narrative,
 * the legal heart of an LIA): interestStatement, statedPurpose,
 * alternatives, whyConsentNotUsed, reasonableExpectationDetail,
 * potentialHarmDetail.
 *
 * Wiring sites: processing_description is authored in
 * src/pages/LIAssessment.tsx (the LIA intake author page — the pack
 * note referenced LegitimateInterestTracker.tsx by name, but that
 * file is the public enforcement tracker and does not author the
 * field; the actual author page is LIAssessment.tsx). Fields 2–4
 * are authored in src/pages/LIAssessmentIntake.tsx.
 *
 * Content rules verified: descriptive/neutral, no legal conclusions,
 * banned word "gap" absent, exactly 6 pills per field.
 */
import type { AssistedInputFieldConfig } from ".";

const processing_description: AssistedInputFieldConfig = {
  fieldId: "processing_description",
  pills: [
    { id: "direct_marketing", label: "Direct marketing campaigns to existing customers", snippet: "Direct marketing campaigns to existing customers", keywords: ["marketing"] },
    { id: "fraud_security", label: "Fraud detection and account-security risk scoring", snippet: "Fraud detection and account-security risk scoring", keywords: ["fraud", "security"] },
    { id: "employee_monitoring", label: "Employee monitoring during working hours", snippet: "Employee monitoring during working hours", keywords: ["employee", "workplace", "monitoring"] },
    { id: "behavioral_targeting", label: "Behavioural tracking for audience targeting", snippet: "Behavioural tracking for audience targeting", keywords: ["behavioral", "tracking", "targeting"] },
    { id: "product_analytics", label: "Product analytics and usage statistics", snippet: "Product analytics and usage statistics", keywords: ["analytics", "statistics"] },
    { id: "network_security", label: "Network / system security monitoring", snippet: "Network / system security monitoring", keywords: ["security", "network", "system"] },
  ],
};

const pseudonymisationOptions: AssistedInputFieldConfig = {
  fieldId: "pseudonymisationOptions",
  pills: [
    { id: "hashed_ingest", label: "Direct identifiers hashed at ingest", snippet: "Direct identifiers hashed at ingest", keywords: ["analytics"] },
    { id: "salted_key_sep", label: "Salted pseudonymisation with key held separately", snippet: "Salted pseudonymisation with key held separately", keywords: ["analytics"] },
    { id: "aggregate_only", label: "Aggregate-only reporting, no row-level export", snippet: "Aggregate-only reporting, no row-level export", keywords: ["statistics"] },
    { id: "k_anonymity", label: "K-anonymity threshold applied", snippet: "K-anonymity threshold applied", keywords: ["analytics"] },
    { id: "not_applied", label: "Not applied — full identifiers required", snippet: "Not applied — full identifiers required", keywords: ["analytics"] },
    { id: "not_documented", label: "Not currently documented", snippet: "Not currently documented", keywords: ["analytics"] },
  ],
};

const optOutMechanism: AssistedInputFieldConfig = {
  fieldId: "optOutMechanism",
  pills: [
    { id: "one_click_unsub", label: "One-click unsubscribe link in every message", snippet: "One-click unsubscribe link in every message", keywords: ["marketing"] },
    { id: "account_toggle", label: "Account-level preference toggle", snippet: "Account-level preference toggle", keywords: ["administration"] },
    { id: "privacy_email_sla", label: "Designated privacy email monitored within stated SLA", snippet: "Designated privacy email monitored within stated SLA", keywords: ["administration", "customer"] },
    { id: "in_app_control", label: "In-app opt-out control at point of collection", snippet: "In-app opt-out control at point of collection", keywords: ["administration"] },
    { id: "gpc_signal", label: "Global Privacy Control signal honoured", snippet: "Global Privacy Control signal honoured", keywords: ["behavioral", "tracking"] },
    { id: "not_applicable", label: "Not applicable — no ongoing processing after purpose fulfilled", snippet: "Not applicable — no ongoing processing after purpose fulfilled", keywords: ["administration"] },
  ],
};

const employmentSafeguards: AssistedInputFieldConfig = {
  fieldId: "employmentSafeguards",
  pills: [
    { id: "works_council", label: "Works-council consultation completed", snippet: "Works-council consultation completed", keywords: ["employee", "workplace"] },
    { id: "advance_notice", label: "Advance transparency notice to affected workers", snippet: "Advance transparency notice to affected workers", keywords: ["employee"] },
    { id: "no_covert", label: "No covert monitoring — controls disclosed", snippet: "No covert monitoring — controls disclosed", keywords: ["employee", "monitoring"] },
    { id: "stated_purpose_only", label: "Data used only for stated employment purpose", snippet: "Data used only for stated employment purpose", keywords: ["worker"] },
    { id: "independent_review", label: "Independent review of adverse actions", snippet: "Independent review of adverse actions", keywords: ["workplace"] },
    { id: "retention_limited", label: "Retention limited to employment relationship", snippet: "Retention limited to employment relationship", keywords: ["employee"] },
  ],
};

export const LIA_PILOT_ASSISTED_INPUT: Readonly<
  Record<string, AssistedInputFieldConfig>
> = Object.freeze({
  processing_description,
  pseudonymisationOptions,
  optOutMechanism,
  employmentSafeguards,
});
