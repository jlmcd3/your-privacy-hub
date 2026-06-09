/**
 * Canonical taxonomy shared by the weekly brief preferences UI
 * (`src/pages/BriefPreferences.tsx`) and the watchlist UI
 * (`src/components/watchlist/WatchlistManager.tsx`).
 *
 * Slug strings are stable identifiers. They are persisted in
 * `user_brief_preferences.{industries,jurisdictions,topics}` and in
 * `user_watchlist.slug`, and they are the join key for downstream
 * personalisation (INDUSTRY_SHORT_LABELS, JURISDICTION_SHORT_LABELS,
 * INDUSTRY_KEYWORDS, etc.). Do not rename existing slugs — only add new
 * entries at the end of each list.
 */

export interface TaxonomyItem {
  /** Stable identifier. Also used as `user_watchlist.slug`. */
  id: string;
  /** Display label. */
  label: string;
  /** Single-character emoji used as both BriefPreferences icon and watchlist flag. */
  icon: string;
  /** Optional short description (used by BriefPreferences toggles, ignored by watchlist chips). */
  description?: string;
}

export const INDUSTRIES: TaxonomyItem[] = [
  { id: "online-web",         label: "Online & Web Services",            icon: "🌐" },
  { id: "mobile-apps",        label: "Mobile Applications",              icon: "📱" },
  { id: "adtech",             label: "AdTech & Digital Media",           icon: "📊" },
  { id: "ai-companies",       label: "AI & Machine Learning",            icon: "🤖" },
  { id: "healthcare",         label: "Healthcare & Life Sciences",       icon: "🏥" },
  { id: "financial",          label: "Financial Services & Fintech",     icon: "🏦" },
  { id: "hr-employment",      label: "HR & Employment Data",             icon: "👔" },
  { id: "children-edtech",    label: "Children & EdTech",                icon: "👶" },
  { id: "retail-ecom",        label: "Retail & E-Commerce",              icon: "🛒" },
  { id: "data-brokers",       label: "Data Brokers",                     icon: "📂" },
  { id: "legal-services",     label: "Law Firm / Legal Services",        icon: "⚖️" },
  { id: "insurance",          label: "Insurance",                        icon: "🛡️" },
  { id: "telecom",            label: "Telecommunications",               icon: "📞" },
  { id: "gaming",             label: "Gaming & Entertainment",           icon: "🎮" },
  { id: "automotive",         label: "Automotive & Connected Vehicles",  icon: "🚗" },
  { id: "smart-home",         label: "Smart Home & IoT",                 icon: "🏠" },
  { id: "nonprofit",          label: "Non-Profit & NGO",                 icon: "🤝" },
  { id: "media-publishing",   label: "Media & Publishing",               icon: "📰" },
  { id: "government",         label: "Government & Public Sector",       icon: "🏛️" },
  { id: "cybersecurity",      label: "Cybersecurity",                    icon: "🔒" },
  { id: "real-estate",        label: "Real Estate & PropTech",           icon: "🏘️" },
  { id: "education",          label: "Education (Higher Ed)",            icon: "🎓" },
  { id: "consulting",         label: "Consulting & Advisory",            icon: "💼" },
  { id: "pharma",             label: "Pharma & Clinical Research",       icon: "💊" },
  { id: "social_media",       label: "Social Media & Platforms",         icon: "📱" },
  { id: "travel_hospitality", label: "Travel & Hospitality",             icon: "✈️" },
  { id: "biotech_genomics",   label: "Biotech & Genomics",               icon: "🧬" },
  { id: "energy_utilities",   label: "Energy & Utilities",               icon: "⚡" },
  { id: "identity_kyc",       label: "Identity Verification & KYC",      icon: "🪪" },
  { id: "manufacturing_iot",  label: "Manufacturing & Industrial IoT",   icon: "🏭" },
  { id: "cpg_loyalty",        label: "Consumer Goods & Loyalty Programs",icon: "🛍️" },
];

export const JURISDICTIONS: TaxonomyItem[] = [
  { id: "eu-all",     label: "EU (All Member States)",       icon: "🇪🇺" },
  { id: "uk",         label: "United Kingdom",                icon: "🇬🇧" },
  { id: "us-federal", label: "U.S. Federal",                  icon: "🇺🇸" },
  { id: "us-ca",      label: "U.S. — California (CPRA)",      icon: "🍊" },
  { id: "us-states",  label: "U.S. States (all)",             icon: "🗺️" },
  { id: "apac",       label: "Asia-Pacific",                  icon: "🌏" },
  { id: "latam",      label: "Latin America",                 icon: "🌎" },
  { id: "mea",        label: "Middle East & Africa",          icon: "🌍" },
  { id: "canada",     label: "Canada",                        icon: "🇨🇦" },
  { id: "australia",  label: "Australia & NZ",                icon: "🇦🇺" },
  { id: "india",      label: "India (DPDP Act)",              icon: "🇮🇳" },
  { id: "global",     label: "Global / Multinational",        icon: "🌐" },
];

export const TOPICS: TaxonomyItem[] = [
  {
    id: "us-state-laws",
    label: "US State Privacy Laws",
    icon: "🗺️",
    description: "New state laws, AG enforcement, CPPA actions, and compliance deadlines across all 50 states",
  },
  {
    id: "gdpr-enforcement",
    label: "GDPR Enforcement & DPA Activity",
    icon: "🇪🇺",
    description: "DPA fines, EDPB binding decisions, cross-border enforcement, and legal precedent",
  },
  {
    id: "ai-act-compliance",
    label: "EU AI Act Compliance",
    icon: "🤖",
    description: "AI Act implementation phases, GPAI code updates, prohibited AI, and GDPR intersection",
  },
  {
    id: "children-privacy",
    label: "Children's Privacy & Age Verification",
    icon: "👶",
    description: "COPPA enforcement, KOSA developments, UK AADC, and platform-specific obligations",
  },
  {
    id: "adtech-consent",
    label: "AdTech, Consent & Cookie Compliance",
    icon: "🍪",
    description: "TCF updates, cookie enforcement actions, Privacy Sandbox changes, FTC surveillance rules",
  },
  {
    id: "data-transfers",
    label: "Cross-Border Data Transfers",
    icon: "🔀",
    description: "DPF status, SCC updates, LGPD transfers, APAC mechanisms, and Schrems litigation",
  },
  {
    id: "health-data",
    label: "Health & Medical Data Privacy",
    icon: "🏥",
    description: "HIPAA enforcement, FTC health data actions, state health laws, and health AI obligations",
  },
  {
    id: "privacy-litigation",
    label: "Privacy Litigation & Class Actions",
    icon: "🏛️",
    description: "BIPA filings, VPPA cases, CIPA wiretap suits, MDL proceedings, settlement watch",
  },
  {
    id: "biometric-data",
    label: "Biometric Data Privacy",
    icon: "👁️",
    description: "BIPA class action tracker, state biometric laws, AI Act biometric provisions",
  },
  {
    id: "data-breach-response",
    label: "Data Breach & Incident Response",
    icon: "🔓",
    description: "Breach notification law changes, SEC disclosure rules, enforcement for late reporting",
  },
];

/**
 * Single-select choices shared by /brief-preferences and /watchlist.
 * ROLES persists to `profiles.brief_role` (id string).
 * BRIEF_FORMATS persists to `user_brief_preferences.format` (id string).
 */
export const ROLES: TaxonomyItem[] = [
  { id: "general_counsel", label: "General Counsel / CLO",            icon: "⚖️" },
  { id: "cpo_dpo",         label: "CPO / DPO / Privacy Officer",      icon: "🛡️" },
  { id: "privacy_counsel", label: "Privacy / Product Counsel",        icon: "📋" },
  { id: "privacy_ops",     label: "Privacy Operations / Compliance",  icon: "⚙️" },
  { id: "ciso_security",   label: "CISO / Security Leader",           icon: "🔒" },
  { id: "outside_counsel", label: "Outside Counsel / Consultant",     icon: "🏛️" },
  { id: "policy_affairs",  label: "Public Policy / Regulatory Affairs", icon: "📣" },
];

export const BRIEF_FORMATS: TaxonomyItem[] = [
  { id: "full",         label: "Full 9-section report",   icon: "📄" },
  { id: "exec-only",    label: "Executive summary only",  icon: "⚡" },
  { id: "actions-only", label: "Action items only",       icon: "🎯" },
];

