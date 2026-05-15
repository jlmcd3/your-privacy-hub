import { ArticleItem } from '@/components/ArticleCard';

export function generateInvestigationPrompt(item: ArticleItem): string {
  // ── Context fields ───────────────────────────────────────
  const jurisdictions = (item.direct_jurisdictions ?? []).join(', ') || null;
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
