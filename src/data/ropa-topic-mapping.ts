// Maps article topic_tags to the RoPA activity template_keys they typically affect.
// Used by both get-ropa-regulatory-updates (server) and the refresh UI (client) so
// changes here propagate everywhere. Keep keys lowercase, hyphenated to match
// public.updates.topic_tags.

export const TOPIC_TO_TEMPLATE_KEYS: Record<string, string[]> = {
  "ai-privacy": ["marketing_analytics", "tech_it_systems", "hr_recruitment", "customer_support"],
  "ai-governance": ["tech_it_systems", "hr_recruitment", "marketing_analytics"],
  "children-privacy": ["marketing_email", "marketing_social", "customer_accounts"],
  "health-hipaa": ["hr_benefits", "customer_accounts", "third_party_vendors"],
  "data-breaches": ["tech_security", "tech_it_systems", "tech_cloud"],
  "adtech": ["marketing_advertising", "marketing_analytics", "marketing_social"],
  "cookie-consent": ["marketing_analytics", "marketing_advertising"],
  "biometric-data": ["hr_monitoring", "tech_security", "customer_kyc"],
  "data-transfers": ["tech_cloud", "third_party_transfers", "third_party_vendors"],
  "cross-border": ["third_party_transfers", "tech_cloud"],
  "data-brokers": ["third_party_sharing", "marketing_analytics"],
  "employee-privacy": ["hr_payroll", "hr_recruitment", "hr_performance", "hr_monitoring"],
  "privacy-litigation": ["legal_compliance", "legal_contracts"],
  "enforcement": ["legal_compliance"],
  "apac-latam": ["third_party_transfers", "tech_cloud"],
};

// Question keys most likely to be affected by each topic. Used to highlight the
// first relevant question when the user clicks "Review this activity".
export const TOPIC_TO_QUESTION_KEYS: Record<string, string[]> = {
  "ai-privacy": ["automated_decision_making", "data_categories", "lawful_basis"],
  "ai-governance": ["automated_decision_making", "dpia_required"],
  "children-privacy": ["data_subjects", "lawful_basis", "parental_consent"],
  "health-hipaa": ["special_category_data", "data_categories"],
  "data-breaches": ["security_measures", "breach_notification"],
  "adtech": ["lawful_basis", "third_party_recipients", "international_transfers"],
  "cookie-consent": ["lawful_basis", "consent_mechanism"],
  "biometric-data": ["special_category_data", "lawful_basis"],
  "data-transfers": ["international_transfers", "transfer_safeguards"],
  "cross-border": ["international_transfers", "transfer_safeguards"],
  "data-brokers": ["third_party_recipients", "data_sources"],
  "employee-privacy": ["lawful_basis", "data_categories"],
  "privacy-litigation": ["lawful_basis", "dpia_required"],
};
