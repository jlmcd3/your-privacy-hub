// Shared slug → display label map. Preserves correct capitalization
// (U.S., EU & UK, etc.) per the project's capitalization rule.
// Use formatFilterLabel for any user-facing rendering of a slug.

export const FILTER_LABELS: Record<string, string> = {
  // Regions / jurisdictions
  'us-federal': 'U.S. Federal',
  'us-states': 'U.S. States',
  'eu-uk': 'EU & UK',
  'global': 'Global',
  // Topics
  'enforcement': 'Enforcement',
  'ai-privacy': 'AI & Privacy',
  'adtech': 'AdTech & Advertising',
  'health-hipaa': 'Health & HIPAA',
  'children-privacy': "Children's Privacy",
  'data-breaches': 'Data Breaches',
  'cross-border': 'Cross-Border Transfers',
  'biometric-data': 'Biometric Data',
  'employee-privacy': 'Employee Privacy',
  'cookie-consent': 'Cookie Consent',
};

export function formatFilterLabel(slug: string): string {
  if (!slug) return '';
  if (FILTER_LABELS[slug]) return FILTER_LABELS[slug];
  return String(slug)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
