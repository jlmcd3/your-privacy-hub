export type PlatformRegion = "US" | "EU" | "UK" | "AU" | "Other";

export interface Platform {
  value: string;
  label: string;
  region: PlatformRegion;
}

export const ROPA_PLATFORMS: Platform[] = [
  // Payroll / HR
  { value: "adp", label: "ADP", region: "US" },
  { value: "sage_payroll", label: "Sage Payroll", region: "UK" },
  { value: "xero", label: "Xero", region: "Other" },
  { value: "bamboohr", label: "BambooHR", region: "US" },
  { value: "workday", label: "Workday", region: "US" },
  { value: "gusto", label: "Gusto", region: "US" },
  { value: "workable", label: "Workable", region: "EU" },
  { value: "greenhouse", label: "Greenhouse", region: "US" },
  { value: "teamtailor", label: "Teamtailor", region: "EU" },
  { value: "lattice", label: "Lattice", region: "US" },
  { value: "fifteen_five", label: "15Five", region: "US" },
  { value: "linkedin_recruiter", label: "LinkedIn Recruiter", region: "US" },
  // Marketing email
  { value: "mailchimp", label: "Mailchimp", region: "US" },
  { value: "hubspot", label: "HubSpot", region: "US" },
  { value: "klaviyo", label: "Klaviyo", region: "US" },
  { value: "campaign_monitor", label: "Campaign Monitor", region: "AU" },
  { value: "brevo", label: "Brevo (Sendinblue)", region: "EU" },
  // Analytics
  { value: "google_analytics", label: "Google Analytics", region: "US" },
  { value: "hotjar", label: "Hotjar", region: "EU" },
  { value: "mixpanel", label: "Mixpanel", region: "US" },
  { value: "amplitude", label: "Amplitude", region: "US" },
  { value: "matomo", label: "Matomo", region: "EU" },
  { value: "plausible", label: "Plausible", region: "EU" },
  // Ads
  { value: "google_ads", label: "Google Ads", region: "US" },
  { value: "meta_ads", label: "Meta Ads", region: "US" },
  { value: "linkedin_ads", label: "LinkedIn Ads", region: "US" },
  { value: "tiktok_ads", label: "TikTok Ads", region: "Other" },
  // CRM / Customer
  { value: "salesforce", label: "Salesforce", region: "US" },
  { value: "pipedrive", label: "Pipedrive", region: "EU" },
  { value: "zoho", label: "Zoho", region: "US" },
  { value: "shopify", label: "Shopify", region: "US" },
  { value: "zendesk", label: "Zendesk", region: "US" },
  { value: "freshdesk", label: "Freshdesk", region: "US" },
  { value: "intercom", label: "Intercom", region: "US" },
  // KYC
  { value: "onfido", label: "Onfido", region: "UK" },
  { value: "jumio", label: "Jumio", region: "US" },
  { value: "lexisnexis", label: "LexisNexis", region: "US" },
  // Cloud / IT
  { value: "microsoft_365", label: "Microsoft 365", region: "US" },
  { value: "google_workspace", label: "Google Workspace", region: "US" },
  { value: "aws", label: "AWS", region: "US" },
  { value: "azure", label: "Azure", region: "US" },
  { value: "gcp", label: "Google Cloud Platform", region: "US" },
  { value: "dropbox", label: "Dropbox", region: "US" },
  { value: "box", label: "Box", region: "US" },
  { value: "slack", label: "Slack", region: "US" },
  { value: "teams", label: "Microsoft Teams", region: "US" },
  { value: "zoom", label: "Zoom", region: "US" },
  { value: "notion", label: "Notion", region: "US" },
  { value: "monday", label: "Monday", region: "US" },
  { value: "jira", label: "Jira / Atlassian", region: "AU" },
  { value: "servicenow", label: "ServiceNow", region: "US" },
  // Finance / Legal
  { value: "quickbooks", label: "QuickBooks", region: "US" },
  { value: "sage", label: "Sage", region: "UK" },
  { value: "freeagent", label: "FreeAgent", region: "UK" },
  { value: "freshbooks", label: "Freshbooks", region: "US" },
  { value: "stripe", label: "Stripe", region: "US" },
  { value: "paypal", label: "PayPal", region: "US" },
  { value: "docusign", label: "DocuSign", region: "US" },
  { value: "adobe_sign", label: "Adobe Sign", region: "US" },
  { value: "pandadoc", label: "PandaDoc", region: "US" },
  { value: "ironclad", label: "Ironclad", region: "US" },
  // Catch-all
  { value: "other_us", label: "Other (US-based)", region: "US" },
  { value: "other_eu", label: "Other (EU/UK-based)", region: "EU" },
  { value: "other", label: "Other / Unknown", region: "Other" },
];
