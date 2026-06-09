import {
  ROLE_LABELS,
  ROLE_INVESTIGATION_FOCUS,
  INDUSTRY_SHORT_LABELS,
  JURISDICTION_SHORT_LABELS,
} from '@/config/expertiseMaps';

export interface SubscriberContext {
  role?: string;
  industries?: string[];
  jurisdictions?: string[];
  topics?: string[];
  watchlist?: Array<{
    type: string; // 'jurisdiction' | 'topic'
    slug: string;
    label: string;
    flag?: string;
  }>;
}

export function generateResearchInvestigationPrompt(
  sectionHeading: string,
  synthesisText: string,
  userContext: SubscriberContext
): string {
  const { role, industries = [], jurisdictions = [], topics = [] } = userContext;

  const hasContext = !!role || industries.length > 0 || jurisdictions.length > 0;

  const aboutLines: string[] = [];
  if (role && ROLE_LABELS[role]) {
    aboutLines.push(`Role: ${ROLE_LABELS[role]}`);
  }
  if (industries.length > 0) {
    const industryLabels = industries
      .map((i) => INDUSTRY_SHORT_LABELS[i] ?? i)
      .join(', ');
    aboutLines.push(`Industry / sector: ${industryLabels}`);
  }
  if (jurisdictions.length > 0) {
    const jurLabels = jurisdictions
      .map((j) => JURISDICTION_SHORT_LABELS[j] ?? j)
      .join(', ');
    aboutLines.push(`Primary jurisdictions: ${jurLabels}`);
  }
  if (topics.length > 0) {
    aboutLines.push(`Topic focus areas: ${topics.join(', ')}`);
  }

  const aboutSection = hasContext
    ? `ABOUT YOU:\n${aboutLines.join('\n')}\n\nADDITIONAL ORGANIZATION CONTEXT:\n[Add specifics: organization size, key data processing activities, existing compliance certifications, or anything else relevant to this investigation.]`
    : `ABOUT YOUR ORGANIZATION:\n[Describe your organization: industry/sector, size, primary data processing activities, jurisdictions where you operate, and any relevant compliance programs.]\n\nNote: Set your brief preferences at /brief-preferences to have this section pre-filled automatically.`;

  const roleFocus = role && ROLE_INVESTIGATION_FOCUS[role]
    ? ROLE_INVESTIGATION_FOCUS[role]
    : '';

  const tasks: string[] = [];

  tasks.push(
    '1. Based on the developments described above, what new or changed ' +
      'compliance obligations apply to our organization specifically? ' +
      'Identify each obligation, the specific regulation and article that ' +
      'creates it, and the deadline or trigger event.'
  );

  if (roleFocus) {
    tasks.push(
      `2. ${roleFocus} What are the top two implications of these developments for our organization from this perspective, and what specific actions does each require?`
    );
  } else {
    tasks.push(
      '2. What are the two most important practical implications of these developments for a compliance program like ours? What specific actions does each require?'
    );
  }

  if (industries.length > 0) {
    const industryLabels = industries
      .map((i) => INDUSTRY_SHORT_LABELS[i] ?? i)
      .join(' and ');
    tasks.push(
      `3. Our organization operates in ${industryLabels}. Are there sector-specific ` +
        'obligations, exemptions, or enforcement patterns that apply to these ' +
        'developments in our industry? Name any relevant sector-specific regulators, ' +
        'guidance, or precedent.'
    );
  } else {
    tasks.push(
      '3. Are there industry-specific obligations, exemptions, or enforcement patterns ' +
        'that apply here? Name any relevant sector-specific regulators or guidance.'
    );
  }

  if (jurisdictions.length > 0) {
    const jurLabels = jurisdictions
      .map((j) => JURISDICTION_SHORT_LABELS[j] ?? j)
      .join(', ');
    tasks.push(
      `4. We operate primarily in: ${jurLabels}. For each of these jurisdictions, ` +
        'what specifically do these developments require or signal? Note any ' +
        'jurisdiction where the obligation is unclear or under active regulatory ' +
        'development, and flag any cross-jurisdiction conflicts we need to resolve.'
    );
  } else {
    tasks.push(
      '4. What jurisdiction-specific requirements do these developments create? ' +
        'Are there any cross-border conflicts or inconsistencies we need to navigate?'
    );
  }

  tasks.push(
    '5. Provide a prioritized action list in three tiers:\n' +
      '   IMMEDIATE (within 7 days): [specific action — name the regulation and owner role]\n' +
      '   THIS QUARTER: [specific action — name the regulation and owner role]\n' +
      '   MONITOR: [development to watch — no current action required]'
  );

  tasks.push(
    '6. Draft a concise two-paragraph internal memo summarizing the risk ' +
      'and recommended response. Write it for a non-specialist leadership ' +
      'audience. Lead with what action is needed, not the regulatory background.'
  );

  const tasksBlock = tasks.join('\n\n');
  const divider = '─'.repeat(60);

  return `You are a senior privacy counsel advising our organization. A recent regulatory development in a specific area of privacy law requires your analysis. Review the topic, the recent developments, and our organizational context — then complete each investigation task.

${divider}
TOPIC AREA: ${sectionHeading}

RECENT DEVELOPMENTS (last 30 days):
${synthesisText}
${divider}

${aboutSection}

${divider}

INVESTIGATION TASKS:

${tasksBlock}

${divider}

After completing the tasks above, close with a prioritized action list using the three-tier format from Task 5. Each action must name a specific regulation, article number where applicable, and an owner role (DPO / Legal Counsel / CISO / Compliance Manager / Board).`;
}
