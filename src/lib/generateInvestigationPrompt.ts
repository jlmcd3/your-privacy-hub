import { ArticleItem } from '@/components/ArticleCard';

export function generateInvestigationPrompt(item: ArticleItem): string {
  // ── Context fields ───────────────────────────────────────
  const jurisdictions = item.jurisdiction || null;
  const sectors       = (item.affected_sectors ?? []).slice(0, 3).join(', ') || null;
  const legalWeight   = item.ai_summary?.legal_weight || null;
  const impact        = item.ai_summary?.compliance_impact
                        || item.ai_summary?.why_it_matters
                        || null;
  const regTheory     = item.regulatory_theory || null;
  const firstAction   = item.action_items?.[0]?.action || null;
  const novelty       = item.precedent_novelty || null;
  const category      = (item.category ?? '').toLowerCase();

  // ── Context block ─────────────────────────────────────────
  const contextLines: string[] = [
    `REGULATORY DEVELOPMENT: ${item.title}`,
  ];
  if (jurisdictions) contextLines.push(`JURISDICTION: ${jurisdictions}`);
  if (sectors)       contextLines.push(`AFFECTED SECTORS: ${sectors}`);
  if (legalWeight)   contextLines.push(`LEGAL WEIGHT: ${legalWeight}`);
  if (regTheory)     contextLines.push(`REGULATORY THEORY: ${regTheory}`);
  if (impact)        contextLines.push(`\nCOMPLIANCE CONCERN:\n${impact}`);
  if (firstAction)   contextLines.push(`\nRECOMMENDED FIRST ACTION:\n${firstAction}`);

  // ── Investigation tasks ───────────────────────────────────
  const tasks: string[] = [];

  tasks.push(
    '1. Does this development create new or modified compliance obligations ' +
    'for our organization? Identify them specifically, citing the applicable ' +
    'regulation and article number where possible.'
  );

  tasks.push(
    regTheory
      ? `2. Explain the "${regTheory}" regulatory theory in plain English. ` +
        'Assess concretely how it applies to our processing activities and ' +
        'what it requires us to change, add, or document.'
      : '2. Explain the core legal theory underpinning this development in ' +
        'plain English. Assess how it applies to our processing activities.'
  );

  tasks.push(
    '3. What documentation, controls, or policy updates would demonstrate ' +
    'compliance to a regulator? List them in priority order with an owner ' +
    'role for each (e.g. DPO, Legal Counsel, Engineering, Board).'
  );

  // Novelty-aware task 4
  if (novelty === 'new_theory' || novelty === 'reverses') {
    tasks.push(
      '4. This development introduces a new or reversed legal position. ' +
      'How should we update our legal risk register? Who in our organization ' +
      'needs to be briefed, and what is the appropriate escalation path?'
    );
  } else {
    tasks.push(
      '4. Are there related regulatory developments, upcoming deadlines, or ' +
      'connected enforcement actions we should track alongside this one? ' +
      'Flag any 30–90 day horizon items.'
    );
  }

  // Category-specific task 5
  if (category.includes('biometric')) {
    tasks.push(
      '5. Does this affect our biometric data collection, storage, or ' +
      'processing programs? What specific consent, disclosure, or deletion ' +
      'obligations apply to us?'
    );
  } else if (category.includes('breach') || category.includes('incident')) {
    tasks.push(
      '5. Does this change our incident response or breach notification ' +
      'obligations? Identify any new timelines, notification thresholds, ' +
      'or documentation requirements.'
    );
  } else if (category.includes('ai') || category.includes('artificial intelligence')) {
    tasks.push(
      '5. How does this affect our use of AI or automated decision-making ' +
      'systems? What transparency, human oversight, or impact assessment ' +
      'obligations now apply?'
    );
  } else if (category.includes('transfer') || category.includes('cross-border')) {
    tasks.push(
      '5. Does this affect our cross-border data transfer mechanisms, ' +
      'standard contractual clauses, or adequacy reliance? What do we need ' +
      'to review or update?'
    );
  } else {
    tasks.push(
      '5. What is the realistic enforcement risk profile for an organization ' +
      'like ours if we do not act on this? Assess likelihood, potential ' +
      'penalty range, and any reputational factors.'
    );
  }

  tasks.push(
    '6. Draft a concise two-paragraph internal memo summarizing the risk ' +
    'and recommended response. Write it for a non-specialist leadership ' +
    'audience. Lead with what action is needed, not with the regulatory ' +
    'background.'
  );

  // ── Assemble final prompt ─────────────────────────────────
  return `You are a senior privacy counsel advising our organization. \
A regulatory development requires your analysis. Review the context \
below, then complete each investigation task in order.

${'─'.repeat(60)}
${contextLines.join('\n')}
${'─'.repeat(60)}

ABOUT OUR ORGANIZATION:
[Replace this section before sending. Describe: your industry \
and sector, organization size, key data processing activities, \
jurisdictions where you operate, and any relevant existing \
compliance programs or certifications.]

${'─'.repeat(60)}

INVESTIGATION TASKS:

${tasks.join('\n\n')}

${'─'.repeat(60)}

After completing the tasks above, close with a prioritized \
action list: IMMEDIATE (within 7 days) / THIS QUARTER / MONITOR. \
Each action should name a specific owner role.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Personalised variant — uses subscriber context (role / industries /
// jurisdictions / topics / watchlist) when available, otherwise produces the
// same well-formed prompt as the function above.
// ─────────────────────────────────────────────────────────────────────────────

import type { SubscriberContext } from '@/lib/generateResearchInvestigationPrompt';
import {
  ROLE_LABELS,
  ROLE_INVESTIGATION_FOCUS,
  INDUSTRY_SHORT_LABELS,
  JURISDICTION_SHORT_LABELS,
} from '@/config/expertiseMaps';

function resolveRoleLabel(role: string | undefined): string | null {
  if (!role) return null;
  return ROLE_LABELS[role] ?? null;
}

function resolveIndustryLabels(ids: string[] | undefined): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map((id) => INDUSTRY_SHORT_LABELS[id] ?? null).filter(Boolean) as string[];
}

function resolveJurisdictionLabels(ids: string[] | undefined): string[] {
  if (!ids || ids.length === 0) return [];
  return ids.map((id) => JURISDICTION_SHORT_LABELS[id] ?? null).filter(Boolean) as string[];
}

/**
 * Keyword fallback for industry-typed watchlist items.
 *
 * The `affected_sectors` column on `updates` is not currently populated by the
 * enrichment pipeline, so industry matches must be inferred from article text.
 * Keys are the `sec-*` slugs used by WatchlistManager.
 */
export const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  'sec-healthcare':      ['hipaa', 'health', 'medical', 'hospital', 'clinical', 'patient data', 'phi'],
  'sec-financial':       ['glba', 'bank', 'fintech', 'financial', 'lending', 'payment', 'credit'],
  'sec-adtech':          ['adtech', 'advertising', 'ad-tech', 'tracking pixel', 'cookie', 'programmatic'],
  'sec-ai-companies':    ['ai ', 'artificial intelligence', 'machine learning', 'llm', 'generative ai', 'automated decision'],
  'sec-children-edtech': ['child', 'minor', 'coppa', 'student', 'edtech', 'education technology', 'school'],
  'sec-data-brokers':    ['data broker', 'data brokerage', 'reseller', 'people search'],
  'sec-retail-ecom':     ['retail', 'e-commerce', 'ecommerce', 'consumer goods', 'merchant'],
  'sec-hr-employment':   ['employee', 'employment', 'workplace', 'hr ', 'human resources', 'workforce'],
  'sec-telecom':         ['telecom', 'carrier', 'isp', 'broadband', 'wireless', 'cpni'],
  'sec-automotive':      ['vehicle', 'automotive', 'connected car', 'telematics', 'oem'],
  'sec-government':      ['government', 'public sector', 'agency', 'federal', 'state agency', 'municipal'],
  'sec-pharma':          ['pharma', 'pharmaceutical', 'clinical trial', 'drug', 'life sciences'],
};

/**
 * Match watchlist items to the article. Both sides are normalised to lowercase
 * and trimmed. We require BOTH sides to be non-empty before using
 * reverse-`includes` checks — otherwise `someLabel.includes('')` would always
 * be true and every watchlist item would match every blank-field article.
 */
function detectWatchlistMatches(
  item: ArticleItem,
  watchlist: NonNullable<SubscriberContext['watchlist']>
): NonNullable<SubscriberContext['watchlist']> {
  if (!watchlist || watchlist.length === 0) return [];

  const articleJurisdiction = (item.jurisdiction ?? '').toLowerCase().trim();
  const articleCategory = (item.category ?? '').toLowerCase().trim();
  const firstJurToken = articleJurisdiction.split(',')[0]?.trim() ?? '';

  // Pre-compute a lowercased text blob for industry keyword matching.
  const articleText = (
    (item.title ?? '') + ' ' +
    (item.ai_summary?.why_it_matters ?? '') + ' ' +
    (item.ai_summary?.compliance_impact ?? '') + ' ' +
    (item.category ?? '')
  ).toLowerCase();

  return watchlist.filter((w) => {
    const label = (w.label ?? '').toLowerCase().trim();
    const slug = (w.slug ?? '').toLowerCase().trim();
    if (!label && !slug) return false;

    if (w.type === 'jurisdiction') {
      if (!articleJurisdiction) return false;
      if (label && articleJurisdiction.includes(label)) return true;
      if (slug && articleJurisdiction.includes(slug)) return true;
      if (firstJurToken && label && label.includes(firstJurToken)) return true;
      return false;
    }
    if (w.type === 'topic') {
      if (!articleCategory) return false;
      if (label && articleCategory.includes(label)) return true;
      if (slug && articleCategory.includes(slug)) return true;
      if (label && label.includes(articleCategory)) return true;
      return false;
    }
    if (w.type === 'industry') {
      // Keyword fallback — affected_sectors is not reliably populated.
      const keywords = INDUSTRY_KEYWORDS[slug] ?? (label ? [label] : []);
      if (keywords.length === 0 || !articleText.trim()) return false;
      return keywords.some((k) => k && articleText.includes(k));
    }
    return false;
  });
}

export function generatePersonalizedInvestigationPrompt(
  item: ArticleItem,
  context?: SubscriberContext
): string {
  // 1. Resolve article fields
  const articleJurisdiction = item.jurisdiction || null;
  const articleSectors = (item.affected_sectors ?? []).slice(0, 3).join(', ') || null;
  const legalWeight = item.ai_summary?.legal_weight || null;
  const impact =
    item.ai_summary?.compliance_impact || item.ai_summary?.why_it_matters || null;
  const regTheory = item.regulatory_theory || null;
  const firstAction = item.action_items?.[0]?.action || null;
  const novelty = item.precedent_novelty || null;
  const category = (item.category ?? '').toLowerCase();

  // 2. Resolve subscriber context fields
  const role = context?.role || undefined;
  const industries = context?.industries ?? [];
  const jurisdictions = context?.jurisdictions ?? [];
  const topics = context?.topics ?? [];
  const watchlist = context?.watchlist ?? [];

  const roleLabel = resolveRoleLabel(role);
  const roleFocus = (role && ROLE_INVESTIGATION_FOCUS[role]) || null;
  const industryLabels = resolveIndustryLabels(industries);
  const jurisdictionLabels = resolveJurisdictionLabels(jurisdictions);

  const watchlistJurisdictions = watchlist.filter((w) => w.type === 'jurisdiction');
  const watchlistTopics = watchlist.filter((w) => w.type === 'topic');
  const watchlistJurLabels = watchlistJurisdictions.map((w) => w.label).filter(Boolean);
  const watchlistTopicLabels = watchlistTopics.map((w) => w.label).filter(Boolean);

  const hasAnyContext = !!(
    roleLabel ||
    industryLabels.length > 0 ||
    jurisdictionLabels.length > 0 ||
    watchlistJurLabels.length > 0 ||
    topics.length > 0 ||
    watchlistTopicLabels.length > 0
  );

  const matchedWatchlistItems = detectWatchlistMatches(item, watchlist);
  const hasWatchlistMatch = matchedWatchlistItems.length > 0;

  // 3. Article context block
  const contextLines: string[] = [`REGULATORY DEVELOPMENT: ${item.title}`];
  if (articleJurisdiction) contextLines.push(`JURISDICTION: ${articleJurisdiction}`);
  if (articleSectors) contextLines.push(`AFFECTED SECTORS: ${articleSectors}`);
  if (legalWeight) contextLines.push(`LEGAL WEIGHT: ${legalWeight}`);
  if (regTheory) contextLines.push(`REGULATORY THEORY: ${regTheory}`);
  if (impact) contextLines.push(`\nCOMPLIANCE CONCERN:\n${impact}`);
  if (firstAction) contextLines.push(`\nRECOMMENDED FIRST ACTION:\n${firstAction}`);

  // 4. Watchlist match banner
  let watchlistMatchBanner = '';
  if (hasWatchlistMatch) {
    const matchedLabels = matchedWatchlistItems.map((w) => w.label).join(', ');
    watchlistMatchBanner =
      `⚑ WATCHLIST MATCH: This article involves ${matchedLabels}, ` +
      `which you are actively tracking. Pay particular attention to ` +
      `the jurisdiction-specific and topic-specific tasks below.\n\n`;
  }

  // 5. "ABOUT" section
  let aboutSection: string;
  if (!hasAnyContext) {
    aboutSection =
      `ABOUT OUR ORGANIZATION:\n` +
      `[Replace this section before sending. Describe: your industry and sector, ` +
      `organization size, key data processing activities, jurisdictions where you ` +
      `operate, and any relevant existing compliance programs or certifications.]\n\n` +
      `Tip: Visit /brief-preferences to set your role, sector, and jurisdictions, ` +
      `and /watchlist to track specific areas. Your preferences will pre-fill this ` +
      `section automatically for every future investigation prompt.`;
  } else {
    const aboutLines: string[] = [];
    if (roleLabel) aboutLines.push(`Role: ${roleLabel}`);
    if (industryLabels.length > 0) {
      aboutLines.push(`Industry / sector: ${industryLabels.join(', ')}`);
    }
    if (jurisdictionLabels.length > 0) {
      aboutLines.push(
        `Jurisdictions (compliance footprint): ${jurisdictionLabels.join(', ')}`
      );
    }
    if (watchlistJurLabels.length > 0) {
      aboutLines.push(
        `Jurisdictions (actively monitoring on Watchlist): ${watchlistJurLabels.join(', ')}`
      );
    }
    if (topics.length > 0) {
      aboutLines.push(`Regulatory focus areas: ${topics.join(', ')}`);
    }
    if (watchlistTopicLabels.length > 0) {
      aboutLines.push(`Topics on Watchlist: ${watchlistTopicLabels.join(', ')}`);
    }
    aboutSection =
      `ABOUT OUR ORGANIZATION:\n` +
      aboutLines.join('\n') +
      `\n\nADDITIONAL CONTEXT:\n` +
      `[Optional: add organization size, key data processing activities, ` +
      `relevant compliance certifications, or any other context useful for ` +
      `this specific investigation.]`;
  }

  // 6. Tasks
  const tasks: string[] = [];
  tasks.push(
    '1. Does this development create new or modified compliance obligations ' +
      'for our organization? Identify them specifically, citing the applicable ' +
      'regulation and article number where possible.'
  );

  if (roleFocus) {
    tasks.push(
      `2. ${roleFocus} Given this development, what are the top two implications ` +
        `for our organization from this perspective, and what specific actions ` +
        `does each require?`
    );
  } else if (regTheory) {
    tasks.push(
      `2. Explain the "${regTheory}" regulatory theory in plain English. ` +
        `Assess concretely how it applies to our processing activities and ` +
        `what it requires us to change, add, or document.`
    );
  } else {
    tasks.push(
      '2. Explain the core legal theory underpinning this development in ' +
        'plain English. Assess how it applies to our processing activities.'
    );
  }

  if (industryLabels.length > 0) {
    tasks.push(
      `3. Our organization operates in ${industryLabels.join(' and ')}. ` +
        `Are there sector-specific obligations, exemptions, or enforcement patterns ` +
        `that apply to this development in our industry? Name any relevant ` +
        `sector-specific regulators, guidance, or precedent.`
    );
  } else {
    tasks.push(
      '3. What documentation, controls, or policy updates would demonstrate ' +
        'compliance to a regulator? List them in priority order with an owner ' +
        'role for each (e.g. DPO, Legal Counsel, Engineering, Board).'
    );
  }

  const hasWatchlistJurs = watchlistJurLabels.length > 0;
  const hasPrefJurs = jurisdictionLabels.length > 0;

  if (hasWatchlistJurs && hasPrefJurs) {
    tasks.push(
      `4. You are actively monitoring ${watchlistJurLabels.join(', ')} on your ` +
        `Watchlist. For each, provide a specific assessment of what this development ` +
        `requires or signals. Then address the broader implications for your compliance ` +
        `footprint: ${jurisdictionLabels.join(', ')}. Note any jurisdiction where ` +
        `the obligation is unclear, and flag any cross-jurisdiction conflicts.`
    );
  } else if (hasWatchlistJurs && !hasPrefJurs) {
    tasks.push(
      `4. You are actively monitoring ${watchlistJurLabels.join(', ')} on your ` +
        `Watchlist. For each, provide a specific assessment of what this development ` +
        `requires or signals. Are there any cross-jurisdiction conflicts or ` +
        `inconsistencies that need to be navigated?`
    );
  } else if (!hasWatchlistJurs && hasPrefJurs) {
    tasks.push(
      `4. We operate primarily in: ${jurisdictionLabels.join(', ')}. For each of ` +
        `these jurisdictions, what specifically do these developments require or ` +
        `signal? Note any jurisdiction where the obligation is unclear or under ` +
        `active regulatory development, and flag any cross-jurisdiction conflicts ` +
        `we need to resolve.`
    );
  } else if (novelty === 'new_theory' || novelty === 'reverses') {
    tasks.push(
      '4. This development introduces a new or reversed legal position. ' +
        'How should we update our legal risk register? Who in our organization ' +
        'needs to be briefed, and what is the appropriate escalation path?'
    );
  } else {
    tasks.push(
      '4. Are there related regulatory developments, upcoming deadlines, or ' +
        'connected enforcement actions we should track alongside this one? ' +
        'Flag any 30–90 day horizon items.'
    );
  }

  if (category.includes('biometric')) {
    tasks.push(
      '5. Does this affect our biometric data collection, storage, or ' +
        'processing programs? What specific consent, disclosure, or deletion ' +
        'obligations apply to us?'
    );
  } else if (category.includes('breach') || category.includes('incident')) {
    tasks.push(
      '5. Does this change our incident response or breach notification ' +
        'obligations? Identify any new timelines, notification thresholds, ' +
        'or documentation requirements.'
    );
  } else if (category.includes('ai') || category.includes('artificial intelligence')) {
    tasks.push(
      '5. How does this affect our use of AI or automated decision-making ' +
        'systems? What transparency, human oversight, or impact assessment ' +
        'obligations now apply?'
    );
  } else if (category.includes('transfer') || category.includes('cross-border')) {
    tasks.push(
      '5. Does this affect our cross-border data transfer mechanisms, ' +
        'standard contractual clauses, or adequacy reliance? What do we need ' +
        'to review or update?'
    );
  } else {
    tasks.push(
      '5. What is the realistic enforcement risk profile for an organization ' +
        'like ours if we do not act on this? Assess likelihood, potential ' +
        'penalty range, and any reputational factors.'
    );
  }

  tasks.push(
    '6. Draft a concise two-paragraph internal memo summarizing the risk ' +
      'and recommended response. Write it for a non-specialist leadership ' +
      'audience. Lead with what action is needed, not with the regulatory ' +
      'background.'
  );

  // 7. Assemble
  const divider = '─'.repeat(60);
  return (
    `You are a senior privacy counsel advising our organization. ` +
    `A regulatory development requires your analysis. Review the context ` +
    `below, then complete each investigation task in order.\n\n` +
    `${divider}\n` +
    `${watchlistMatchBanner}` +
    `${contextLines.join('\n')}\n` +
    `${divider}\n\n` +
    `${aboutSection}\n\n` +
    `${divider}\n\n` +
    `INVESTIGATION TASKS:\n\n` +
    `${tasks.join('\n\n')}\n\n` +
    `${divider}\n\n` +
    `After completing the tasks above, close with a prioritized ` +
    `action list: IMMEDIATE (within 7 days) / THIS QUARTER / MONITOR. ` +
    `Each action should name a specific owner role.`
  );
}
