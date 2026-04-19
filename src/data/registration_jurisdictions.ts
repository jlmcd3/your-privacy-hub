// Curated jurisdiction list for the registration assessment intake form.
// Codes match jurisdiction_requirements.jurisdiction_code.

export interface JurisdictionOption {
  code: string;
  name: string;
  region: string;
}

export const JURISDICTION_OPTIONS: JurisdictionOption[] = [
  // EU
  { code: "AT", name: "Austria", region: "EU" },
  { code: "BE", name: "Belgium", region: "EU" },
  { code: "BG", name: "Bulgaria", region: "EU" },
  { code: "HR", name: "Croatia", region: "EU" },
  { code: "CY", name: "Cyprus", region: "EU" },
  { code: "CZ", name: "Czechia", region: "EU" },
  { code: "DK", name: "Denmark", region: "EU" },
  { code: "EE", name: "Estonia", region: "EU" },
  { code: "FI", name: "Finland", region: "EU" },
  { code: "FR", name: "France", region: "EU" },
  { code: "DE", name: "Germany", region: "EU" },
  { code: "GR", name: "Greece", region: "EU" },
  { code: "HU", name: "Hungary", region: "EU" },
  { code: "IE", name: "Ireland", region: "EU" },
  { code: "IT", name: "Italy", region: "EU" },
  { code: "LV", name: "Latvia", region: "EU" },
  { code: "LT", name: "Lithuania", region: "EU" },
  { code: "LU", name: "Luxembourg", region: "EU" },
  { code: "MT", name: "Malta", region: "EU" },
  { code: "NL", name: "Netherlands", region: "EU" },
  { code: "PL", name: "Poland", region: "EU" },
  { code: "PT", name: "Portugal", region: "EU" },
  { code: "RO", name: "Romania", region: "EU" },
  { code: "SK", name: "Slovakia", region: "EU" },
  { code: "SI", name: "Slovenia", region: "EU" },
  { code: "ES", name: "Spain", region: "EU" },
  { code: "SE", name: "Sweden", region: "EU" },
  // EEA
  { code: "NO", name: "Norway", region: "EEA" },
  { code: "IS", name: "Iceland", region: "EEA" },
  { code: "LI", name: "Liechtenstein", region: "EEA" },
  // Europe non-EU
  { code: "UK", name: "United Kingdom", region: "Europe" },
  { code: "CH", name: "Switzerland", region: "Europe" },
  // North America
  { code: "US", name: "United States (federal / nationwide)", region: "North America" },
  { code: "US-CA", name: "California (US)", region: "North America" },
  { code: "US-CO", name: "Colorado (US)", region: "North America" },
  { code: "US-CT", name: "Connecticut (US)", region: "North America" },
  { code: "US-IL", name: "Illinois (US — BIPA)", region: "North America" },
  { code: "US-OR", name: "Oregon (US)", region: "North America" },
  { code: "US-TX", name: "Texas (US)", region: "North America" },
  { code: "US-UT", name: "Utah (US)", region: "North America" },
  { code: "US-VA", name: "Virginia (US)", region: "North America" },
  { code: "US-VT", name: "Vermont (US)", region: "North America" },
  { code: "US-WA", name: "Washington (US — My Health My Data)", region: "North America" },
  { code: "CA", name: "Canada (federal)", region: "North America" },
  { code: "CA-QC", name: "Quebec (Canada)", region: "North America" },
  // Latin America
  { code: "BR", name: "Brazil", region: "Latin America" },
  { code: "AR", name: "Argentina", region: "Latin America" },
  { code: "MX", name: "Mexico", region: "Latin America" },
  // APAC
  { code: "SG", name: "Singapore", region: "APAC" },
  { code: "JP", name: "Japan", region: "APAC" },
  { code: "KR", name: "South Korea", region: "APAC" },
  { code: "AU", name: "Australia", region: "APAC" },
  { code: "NZ", name: "New Zealand", region: "APAC" },
  { code: "IN", name: "India", region: "APAC" },
  // MENA
  { code: "AE", name: "UAE", region: "MENA" },
  { code: "SA", name: "Saudi Arabia", region: "MENA" },
  { code: "IL", name: "Israel", region: "MENA" },
  // Africa
  { code: "ZA", name: "South Africa", region: "Africa" },
  { code: "NG", name: "Nigeria", region: "Africa" },
  { code: "KE", name: "Kenya", region: "Africa" },
];

export const ORG_SIZES = [
  { value: "micro", label: "Micro (1–9 employees)" },
  { value: "small", label: "Small (10–49)" },
  { value: "medium", label: "Medium (50–249)" },
  { value: "large", label: "Large (250–999)" },
  { value: "enterprise", label: "Enterprise (1,000+)" },
];

export const INDUSTRIES = [
  "SaaS / Software",
  "E-commerce",
  "Healthcare",
  "Financial services",
  "AdTech / MarTech",
  "Education",
  "Media / Publishing",
  "Manufacturing",
  "Public sector",
  "Other",
];

const SHARE_KEY = "regmgr_assessment_token_v1";
export function rememberAssessmentToken(token: string) {
  try { localStorage.setItem(SHARE_KEY, token); } catch { /* noop */ }
}
export function recallAssessmentToken(): string | null {
  try { return localStorage.getItem(SHARE_KEY); } catch { return null; }
}
