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
  "ai-privacy": ["purpose", "data_categories", "lawful_basis"],
  "ai-governance": ["purpose", "lawful_basis"],
  "children-privacy": ["data_subjects", "lawful_basis"],
  "health-hipaa": ["data_categories", "lawful_basis", "retention_period"],
  "data-breaches": ["security_measures", "incident_log", "access_controls"],
  "adtech": ["lawful_basis", "uses_processors", "transfer_mechanism"],
  "cookie-consent": ["lawful_basis", "unsubscribe_mechanism"],
  "biometric-data": ["data_categories", "lawful_basis"],
  "data-transfers": ["transfer_mechanism", "uses_processors"],
  "cross-border": ["transfer_mechanism", "uses_processors"],
  "data-brokers": ["uses_processors", "processor_platform"],
  "employee-privacy": ["lawful_basis", "data_categories"],
  "privacy-litigation": ["lawful_basis", "purpose"],
};
