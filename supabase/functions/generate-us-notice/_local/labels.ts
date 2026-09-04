// supabase/functions/generate-us-notice/_local/labels.ts
//
// DOC 181 (2026-09-04) — reader labels for the US notice intake. Mirrors the
// option lists in src/data/us-notice-questions/*.ts byte-for-byte; keep in
// sync if an option code changes. formatUsAnswer() is the single writer for
// reader labels on the US side (the spine formats nothing itself). Free-text
// answers (the stress/sample fixtures supply strings, not code arrays) pass
// through verbatim; genuine option codes render their label.

export const US_OPTION_LABELS: Record<string, Record<string, string>> = {
  data_categories: {
    identifiers: "Identifiers (name, email, IP address, account ID)",
    commercial: "Commercial information (purchases, transactions, browsing history)",
    internet_activity: "Internet or network activity (usage data, cookies)",
    geolocation: "Geolocation data",
    audio_visual: "Audio, visual, or electronic data",
    professional: "Professional or employment-related information",
    education: "Education information",
    financial: "Financial information (account numbers, payment card data)",
    health_medical: "Health or medical data",
    biometric: "Biometric data",
    race_ethnicity: "Racial or ethnic origin",
    religion: "Religious beliefs",
    sexual_orientation: "Sexual orientation or gender identity",
    citizenship: "Citizenship or immigration status",
    mental_health: "Mental health data",
    children: "Children's data (under 13 or under 16)",
    other: "Other",
  },
  collection_purposes: {
    service_delivery: "To provide our product or service",
    account_management: "To manage customer accounts",
    marketing: "For marketing and promotional communications",
    analytics: "For analytics and product improvement",
    advertising: "For advertising and targeted ads",
    legal_compliance: "To comply with legal obligations",
    security: "For security and fraud prevention",
    research: "For research and development",
    other: "Other",
  },
  third_party_categories: {
    service_providers: "Service providers (hosting, payment, email platforms)",
    analytics: "Analytics and measurement providers",
    advertising: "Advertising and marketing partners",
    social_media: "Social media platforms",
    business_partners: "Business partners",
    affiliates: "Affiliated companies",
    law_enforcement: "Government agencies or law enforcement (when required by law)",
    other: "Other",
  },
  sale_or_sharing: {
    sell_and_share: "Yes — we both sell data and use it for targeted advertising",
    sell_only: "Yes — we sell personal data to third parties for their own use",
    share_only: "Yes — we share data for targeted/behavioural advertising",
    no: "No — we don't sell or share for advertising",
    neither: "No — we don't sell or share for advertising",
    not_sure: "Not sure — flag for review",
  },
  vam_controller_processor_role: {
    controller: "Controller — we decide the purposes and means of processing",
    processor: "Processor — we process on behalf of others",
    both: "Both, depending on the data",
    unsure: "Unsure — flag for review",
  },
  vam_sensitive_data_consent: {
    yes_consent: "Yes — we obtain opt-in consent",
    no_sensitive: "We don't process sensitive data",
    no_consent: "No — we process without explicit consent",
    unsure: "Unsure",
  },
  vam_targeted_advertising_optout: {
    yes_link_and_uoom: "Yes — opt-out link and we honour Universal Opt-Out Mechanisms (e.g. GPC)",
    yes_link_only: "Yes — opt-out link, but we don't process UOOM signals",
    no: "No — we don't provide an opt-out",
    not_applicable: "Not applicable — we don't engage in targeted advertising",
  },
  md_data_minimisation: {
    yes_strict: "Yes — strictly limited to what's necessary for the requested service",
    broader: "We collect broader data for analytics, marketing, or other purposes",
    unsure: "Unsure — flag for review",
  },
  fl_scope_confirmation: {
    yes: "Yes — we meet the FDBR controller threshold",
    no: "No — we do not meet the threshold",
    unsure: "Unsure — flag for legal review",
  },
};

/** Reader-label form of an answer: arrays map each code (unknown codes and
 *  free text pass through verbatim), scalars likewise. */
export function formatUsAnswer(key: string, value: unknown): string {
  if (value == null) return "";
  const map = US_OPTION_LABELS[key];
  if (Array.isArray(value)) return value.map((v) => map?.[String(v)] ?? String(v)).join(", ");
  if (typeof value === "string") return map?.[value] ?? value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** Raw-code array form of a multi-select answer; a free-text string that is
 *  not an option code yields [] so callers fall back to the verbatim text. */
export function usAnswerCodes(key: string, value: unknown): string[] {
  const map = US_OPTION_LABELS[key];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string" && map && Object.prototype.hasOwnProperty.call(map, value)) return [value];
  return [];
}
