// Canonical sector options used across onboarding, client management, etc.
export const SECTORS = [
  'Technology',
  'Financial Services',
  'Healthcare',
  'Legal',
  'Retail',
  'Manufacturing',
  'Government',
  'Consulting',
  'Other',
] as const;

export type Sector = (typeof SECTORS)[number];
