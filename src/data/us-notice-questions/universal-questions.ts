import type { Question } from "./types";

export const UNIVERSAL_US_NOTICE_QUESTIONS: Question[] = [
  {
    key: "business_name",
    text: "What is the legal name of your business?",
    whyWeAsk: "All US state privacy notices must identify the controller by name.",
    type: "text_short",
    isRequired: true,
  },
  {
    key: "business_description",
    text: "In one or two sentences, what does your business do?",
    whyWeAsk:
      "Helps contextualise data collection — required by CCPA and most state laws.",
    type: "text_long",
    isRequired: true,
  },
  {
    key: "contact_email",
    text: "What email address should individuals use to exercise their privacy rights?",
    whyWeAsk:
      "All US state laws require a specific contact method for rights requests.",
    type: "text_short",
    isRequired: true,
  },
  {
    key: "data_categories",
    text: "What categories of personal data does your business collect from individuals?",
    whyWeAsk:
      "Every US state law requires disclosure of the categories of data collected. [CCPA § 1798.100, Virginia CDPA § 59.1-578]",
    type: "multi_choice",
    options: [
      { value: "identifiers", label: "Identifiers (name, email, IP address, account ID)" },
      { value: "commercial", label: "Commercial information (purchases, transactions, browsing history)" },
      { value: "internet_activity", label: "Internet or network activity (usage data, cookies)" },
      { value: "geolocation", label: "Geolocation data" },
      { value: "audio_visual", label: "Audio, visual, or electronic data" },
      { value: "professional", label: "Professional or employment-related information" },
      { value: "education", label: "Education information" },
      { value: "financial", label: "Financial information (account numbers, payment card data)" },
      { value: "health_medical", label: "Health or medical data" },
      { value: "biometric", label: "Biometric data" },
      { value: "race_ethnicity", label: "Racial or ethnic origin" },
      { value: "religion", label: "Religious beliefs" },
      { value: "sexual_orientation", label: "Sexual orientation or gender identity" },
      { value: "citizenship", label: "Citizenship or immigration status" },
      { value: "mental_health", label: "Mental health data" },
      { value: "children", label: "Children's data (under 13 or under 16)" },
      { value: "other", label: "Other — I will specify" },
    ],
    isRequired: true,
    flagIf: [
      {
        operator: "contains",
        value: ["biometric", "health_medical", "mental_health", "sexual_orientation", "race_ethnicity"],
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Sensitive personal data detected.",
        consequence:
          "CCPA/CPRA and most Virginia-model states require specific disclosures and opt-out rights for sensitive data categories.",
      },
      {
        operator: "contains",
        value: "children",
        flagType: "high_risk_activity",
        severity: "warning",
        message: "Children's data requires special treatment.",
        consequence:
          "CCPA requires opt-in consent for data from children 13–15. COPPA requires verifiable parental consent for under-13. Confirm applicability against your organization's authoritative records before relying on this determination.",
      },
    ],
  },
  {
    key: "collection_purposes",
    text: "What are the main purposes for which you collect personal data?",
    whyWeAsk:
      "All US state laws require disclosure of the purposes for data collection.",
    type: "multi_choice",
    options: [
      { value: "service_delivery", label: "To provide our product or service" },
      { value: "account_management", label: "To manage customer accounts" },
      { value: "marketing", label: "For marketing and promotional communications" },
      { value: "analytics", label: "For analytics and product improvement" },
      { value: "advertising", label: "For advertising and targeted ads" },
      { value: "legal_compliance", label: "To comply with legal obligations" },
      { value: "security", label: "For security and fraud prevention" },
      { value: "research", label: "For research and development" },
      { value: "other", label: "Other" },
    ],
    isRequired: true,
  },
  {
    key: "third_party_sharing",
    text: "Do you share personal data with third-party companies?",
    whyWeAsk:
      "Disclosure of third-party sharing is required by all US state privacy laws.",
    type: "yes_no",
    isRequired: true,
  },
  {
    key: "third_party_categories",
    text: "What categories of third parties do you share data with?",
    whyWeAsk:
      "All US state laws require disclosure of third-party recipient categories. [Virginia CDPA § 59.1-578(B)(3)]",
    type: "multi_choice",
    options: [
      { value: "service_providers", label: "Service providers (hosting, payment, email platforms)" },
      { value: "analytics", label: "Analytics and measurement providers" },
      { value: "advertising", label: "Advertising and marketing partners" },
      { value: "social_media", label: "Social media platforms" },
      { value: "business_partners", label: "Business partners" },
      { value: "affiliates", label: "Affiliated companies" },
      { value: "law_enforcement", label: "Government agencies or law enforcement (when required by law)" },
      { value: "other", label: "Other" },
    ],
    isRequired: true,
    showIf: { questionKey: "third_party_sharing", operator: "equals", value: "yes" },
  },
  {
    key: "sale_or_sharing",
    text: "Do you sell personal data, or share it with third parties for cross-context behavioural advertising?",
    whyWeAsk:
      "CCPA defines 'sale' broadly. Virginia and other state laws require disclosure of targeted advertising use. This drives the opt-out right in your notice. [CCPA § 1798.140(ad), Virginia CDPA § 59.1-578(B)(4)]",
    type: "single_choice",
    options: [
      { value: "sell_and_share", label: "Yes — we both sell data and use it for targeted advertising" },
      { value: "sell_only", label: "Yes — we sell personal data to third parties for their own use" },
      { value: "share_only", label: "Yes — we share data for targeted/behavioural advertising" },
      { value: "no", label: "No — we don't sell or share for advertising" },
      { value: "not_sure", label: "Not sure — flag for review" },
    ],
    isRequired: true,
    flagIf: [
      {
        operator: "contains",
        value: ["sell_and_share", "sell_only", "share_only"],
        flagType: "recommendation",
        severity: "info",
        message: "Do Not Sell or Share link required on your website.",
        consequence:
          "California, Colorado, Connecticut, Virginia, and most other US state laws require a \"Do Not Sell or Share My Personal Information\" opt-out mechanism.",
      },
    ],
  },
  {
    key: "retention_general",
    text: "How long do you generally retain personal data?",
    whyWeAsk:
      "CCPA/CPRA requires retention period disclosure. Virginia model states recommend but do not always mandate it.",
    type: "date_or_period",
    isRequired: false,
  },
  {
    key: "tools_used",
    text: "Which of these tools or platforms does your website or app use?",
    whyWeAsk:
      "Third-party tools often involve data sharing that must be disclosed.",
    type: "platform_search",
    isRequired: false,
  },
];
