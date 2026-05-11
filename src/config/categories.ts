// Single source of truth for article category badges.
// Used by ArticleCard.tsx and UpdateDetail.tsx so the same slug renders
// the same label and color in feed cards and on the detail page.

export const CATEGORY_COLORS: Record<string, string> = {
  // Canonical (slug) keys — match what's stored in the database
  enforcement: 'bg-red-50 text-red-700 border border-red-200',
  legislation: 'bg-blue-50 text-blue-700 border border-blue-200',
  guidance: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  opinion: 'bg-purple-50 text-purple-700 border border-purple-200',
  'eu-uk': 'bg-blue-50 text-blue-700 border border-blue-200',
  'us-federal': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'us-states': 'bg-violet-50 text-violet-700 border border-violet-200',
  global: 'bg-teal-50 text-teal-700 border border-teal-200',
  'ai-privacy': 'bg-purple-50 text-purple-700 border border-purple-200',
  'ai-regulation': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  adtech: 'bg-orange-50 text-orange-700 border border-orange-200',
  'data-breach': 'bg-orange-50 text-orange-700 border border-orange-200',
  // Display-label aliases (back-compat — some legacy data uses display strings)
  Enforcement: 'bg-red-50 text-red-700 border border-red-200',
  'EU & UK': 'bg-blue-50 text-blue-700 border border-blue-200',
  'U.S. Federal': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'U.S. States': 'bg-violet-50 text-violet-700 border border-violet-200',
  Global: 'bg-teal-50 text-teal-700 border border-teal-200',
  'AI & Privacy': 'bg-purple-50 text-purple-700 border border-purple-200',
};

export const CATEGORY_LABELS: Record<string, string> = {
  enforcement: 'Enforcement',
  legislation: 'Legislation',
  guidance: 'Guidance',
  opinion: 'Opinion',
  'eu-uk': 'EU & UK',
  'us-federal': 'U.S. Federal',
  'us-states': 'U.S. States',
  global: 'Global',
  'ai-privacy': 'AI & Privacy',
  'ai-regulation': 'AI Regulation',
  adtech: 'AdTech',
  'data-breach': 'Data Breach',
};

export const categoryClass = (cat?: string | null) =>
  CATEGORY_COLORS[cat || ''] || 'bg-gray-50 text-gray-600 border border-gray-200';

export const categoryLabel = (cat?: string | null) =>
  CATEGORY_LABELS[cat || ''] || cat || '';

// Canonical badge class — keep all variants visually consistent.
export const CATEGORY_BADGE_CLASS =
  'text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md';
