import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function getWeekLabel(): string {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysSinceSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceSunday,
    0, 0, 0, 0
  ));
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(now)}`;
}

function getISOWeek(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `Week ${week} · ${now.getFullYear()}`;
}

async function getEnforcementHistory() {
  const { data: recentBriefs } = await supabase
    .from("weekly_briefs")
    .select("week_label, enforcement_table, published_at")
    .order("published_at", { ascending: false })
    .limit(24);

  if (!recentBriefs || recentBriefs.length === 0) {
    return { monthly: null, sixMonth: null, annual: null, briefCount: 0 };
  }

  const now = new Date();
  const oneMonthAgo = new Date(now); oneMonthAgo.setMonth(now.getMonth() - 1);
  const sixMonthsAgo = new Date(now); sixMonthsAgo.setMonth(now.getMonth() - 6);
  const oneYearAgo = new Date(now); oneYearAgo.setFullYear(now.getFullYear() - 1);

  const getActions = (since: Date) =>
    recentBriefs
      .filter(b => new Date(b.published_at) >= since)
      .flatMap(b => (b.enforcement_table as any[]) || []);

  const thisMonthActions = getActions(oneMonthAgo);
  const lastMonthStart = new Date(oneMonthAgo); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  const lastMonthActions = recentBriefs
    .filter(b => new Date(b.published_at) >= lastMonthStart && new Date(b.published_at) < oneMonthAgo)
    .flatMap(b => (b.enforcement_table as any[]) || []);

  const sixMonthActions = getActions(sixMonthsAgo);
  const annualActions = getActions(oneYearAgo);

  const summarize = (actions: any[]) => ({
    count: actions.length,
    topRegulators: [...new Set(actions.map(a => a.regulator))].slice(0, 5),
    actionTypes: actions.reduce((acc: any, a) => {
      acc[a.action_type] = (acc[a.action_type] || 0) + 1; return acc;
    }, {}),
  });

  return {
    monthly: {
      thisMonth: summarize(thisMonthActions),
      lastMonth: summarize(lastMonthActions),
      change: thisMonthActions.length - lastMonthActions.length,
    },
    sixMonth: summarize(sixMonthActions),
    annual: summarize(annualActions),
    briefCount: recentBriefs.length,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // ── Authentication: admin-only function ───────────────────────────────────
  const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN");
  if (!ADMIN_SECRET) {
    return new Response(
      JSON.stringify({ error: "Server misconfigured: ADMIN_SECRET_TOKEN not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const authHeader = req.headers.get("Authorization") || "";
  const providedToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (providedToken !== ADMIN_SECRET) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  // ── End authentication ────────────────────────────────────────────────────

  try {
    // Anchor to previous Sunday midnight UTC for a consistent weekly window.
    // Every brief generated on Monday covers Sun 00:00:00 UTC → now,
    // regardless of what time Monday the brief runs.
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysSinceSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
    const weekStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysSinceSunday,
      0, 0, 0, 0
    ));

    const { data: rawArticles, error: fetchError } = await supabase
      .from("updates")
      .select("title, summary, source_name, category, topic_tags, published_at, url, attention_level, legal_weight, affected_sectors, regulatory_theory, related_development, direct_jurisdictions, key_date")
      .gte("published_at", weekStart.toISOString())
      .order("published_at", { ascending: false })
      .limit(60);

    if (fetchError || !rawArticles || rawArticles.length === 0) {
      if (fetchError) console.error("Fetch articles error:", fetchError);
      return new Response(JSON.stringify({ error: "No articles found for this period" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pre-sort by signal strength so highest-value articles lead the prompt context.
    // Binding/Enforcement > Guidance > Proposal/Commentary; High attention > Medium > Low.
    const LEGAL_WEIGHT_RANK: Record<string, number> = {
      "Binding": 4, "Enforcement": 3, "Guidance": 2, "Proposal": 1, "Commentary": 0,
    };
    const ATTENTION_RANK: Record<string, number> = { "High": 2, "Medium": 1, "Low": 0 };
    const articles = rawArticles.sort((a, b) => {
      const lw =
        (LEGAL_WEIGHT_RANK[b.legal_weight ?? ""] ?? 0) -
        (LEGAL_WEIGHT_RANK[a.legal_weight ?? ""] ?? 0);
      if (lw !== 0) return lw;
      return (
        (ATTENTION_RANK[b.attention_level ?? ""] ?? 0) -
        (ATTENTION_RANK[a.attention_level ?? ""] ?? 0)
      );
    });

    const enforcementHistory = await getEnforcementHistory();

    // ── Top 10 enforcement signals (last 90d, ranked by significance + recency) ──
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const { data: topSignalCandidates } = await supabase
      .from("enforcement_actions")
      .select("id,regulator,jurisdiction,subject,violation,key_compliance_failure,fine_eur_equivalent,fine_eur,fine_amount,decision_date,precedent_significance,industry_sector,violation_types,source_url")
      .eq("enrichment_version", 1)
      .gte("decision_date", ninetyDaysAgo.toISOString().split("T")[0])
      .not("precedent_significance", "is", null)
      .order("precedent_significance", { ascending: false })
      .order("decision_date", { ascending: false })
      .limit(40);

    // Re-rank with a blended score: significance (0-5) heavily weighted, then recency boost
    const now = Date.now();
    const topEnforcementSignals = (topSignalCandidates ?? [])
      .map((r: any) => {
        const sig = Number(r.precedent_significance ?? 0);
        const ageDays = r.decision_date ? Math.max(0, (now - new Date(r.decision_date).getTime()) / 86400000) : 90;
        const recencyBoost = Math.max(0, (90 - ageDays) / 90); // 0..1
        return { row: r, score: sig * 2 + recencyBoost };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ row }) => ({
        id: row.id,
        regulator: row.regulator,
        jurisdiction: row.jurisdiction,
        subject: row.subject,
        summary: row.key_compliance_failure || row.violation || null,
        fine: row.fine_amount || (row.fine_eur_equivalent ? `€${Number(row.fine_eur_equivalent).toLocaleString()}` : null),
        fine_eur_equivalent: row.fine_eur_equivalent ?? row.fine_eur ?? null,
        decision_date: row.decision_date,
        precedent_significance: row.precedent_significance,
        sector: row.industry_sector,
        violation_types: row.violation_types ?? [],
        source_url: row.source_url,
      }));

    const { data: prevBrief } = await supabase
      .from("weekly_briefs")
      .select("headline, trend_signal, week_label, enforcement_table")
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    const previousContext = prevBrief
      ? `PREVIOUS WEEK (${prevBrief.week_label}):\nHeadline: ${prevBrief.headline}\nTrend Signal: ${prevBrief.trend_signal || "N/A"}`
      : "No previous week data available.";

    // Build enriched article digest
    const articleList = articles
      .map((a, i) => {
        const tags = (a.topic_tags as string[] || []).join(", ");
        const sectors = (a.affected_sectors as string[] || []).join(", ");
        const jurisdictions = (a.direct_jurisdictions as string[] || []).join(", ");
        let entry = `[${i + 1}] [${a.category?.toUpperCase()}]`;
        if (a.attention_level) entry += ` [ATTENTION: ${a.attention_level}]`;
        if (tags) entry += ` [TAGS: ${tags}]`;
        if (sectors) entry += ` [SECTORS: ${sectors}]`;
        if (jurisdictions) entry += ` [JURISDICTIONS: ${jurisdictions}]`;
        entry += ` ${a.source_name} — ${a.title}`;
        if (a.summary) entry += `\n    Summary: ${a.summary}`;
        if (a.regulatory_theory) entry += `\n    Regulatory Theory: ${a.regulatory_theory}`;
        if (a.related_development) entry += `\n    Related Development: ${a.related_development}`;
        if (a.key_date) entry += `\n    Key Date: ${a.key_date}`;
        return entry;
      })
      .join("\n\n");

    const weekLabel = getWeekLabel();
    const isoWeek = getISOWeek();

    const trendContext = enforcementHistory.briefCount >= 4
      ? `ENFORCEMENT TREND DATA:
Month-over-month: ${(enforcementHistory.monthly?.change ?? 0) >= 0 ? "+" : ""}${enforcementHistory.monthly?.change ?? 0} actions vs last month (this month: ${enforcementHistory.monthly?.thisMonth.count ?? 0}, last month: ${enforcementHistory.monthly?.lastMonth.count ?? 0})
Last 6 months: ${enforcementHistory.sixMonth?.count ?? 0} total actions, top regulators: ${(enforcementHistory.sixMonth?.topRegulators ?? []).join(", ")}
Last 12 months: ${enforcementHistory.annual?.count ?? 0} total actions, breakdown: ${JSON.stringify(enforcementHistory.annual?.actionTypes ?? {})}
Note: Based on ${enforcementHistory.briefCount} weeks of tracked data.`
      : `ENFORCEMENT TREND NOTE: Insufficient historical data for statistical trends (only ${enforcementHistory.briefCount} weeks tracked so far). Describe directional trends from this week's data only; do not fabricate historical comparisons.`;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are a senior data protection attorney with 20 years of experience advising Fortune 500 companies, DPOs, and General Counsel. You write a weekly intelligence brief for privacy professionals and senior executives who are highly intelligent but may not have personally tracked every regulatory development.

Your job is not to describe what happened. Your job is to tell your reader what it means for them — and what, if anything, they need to do about it.

Think of yourself as calling a trusted client before they walk into a board meeting. You have three minutes. You tell them what matters, why it matters to them specifically, and what they should do. Then you stop.

SOURCE FIDELITY (non-negotiable, supersedes every other rule):
- Every regulator name, statute citation, fine amount, company name, case identifier, date, and percentage in your output MUST appear in the provided article digest, enforcement-history block, or top-enforcement-signals block. Do not draw on training knowledge for specific factual claims.
- You MAY use training knowledge to explain what a law generally requires in plain English (e.g. "Article 35 GDPR requires a DPIA for high-risk processing"), but NOT to assert specific enforcement actions, fines, or precedents that do not appear in the provided sources.
- Every enforcement_table row must trace its regulator, subject, amount, and legal_basis to a specific source_ref article number. If you cannot, drop the row.
- The cross_jurisdiction_patterns field must be null unless two or more regulators in different jurisdictions, both named in this week's article digest, target the same issue. Do not infer coordination from training knowledge.
- The enforcement_trends section must use ONLY the provided ENFORCEMENT TREND DATA. If the data block says "Insufficient historical data," say so explicitly and describe only this week's directional movement — do not fabricate month-over-month or year-over-year numbers.
- When a section has no source articles, write the exact "No monitored developments" sentence and stop. Do not pad with speculation.
- UK LEGISLATION NAME: The current UK data protection reform legislation is the
  "Data (Use and Access) Act 2025" (also called the "DUA Act 2025"). Do NOT use
  "DPDI Act", "UK DPDI Act", "Data Protection and Digital Information Act", or any
  other name. This is a hard factual constraint — the wrong name is embarrassing to
  DPO readers who know the legislation. When referring to the existing UK data
  protection framework, use "UK GDPR and Data Protection Act 2018."

VOICE RULES — apply to every sentence you write:

RULE 1: WRITE TO THE READER.
Use "you" and "your" throughout. The reader is the subject of every paragraph. The regulatory development is the cause — not the subject.

WRONG: "Organisations processing biometric data in Illinois should be aware that BIPA class action litigation continues to expand."
RIGHT: "If you process biometric data in Illinois — facial recognition, fingerprints, voiceprint — you are a class action target. BIPA plaintiffs are winning, and the average settlement is climbing."

RULE 2: LEAD WITH IMPLICATION, NOT EVENT.
The first sentence of every item states what the development means for the reader. The regulatory name and citation come second. Never open with "The ICO announced..." or "The EDPB has published..."

WRONG: "The FTC published a report on commercial surveillance data practices."
RIGHT: "The FTC's commercial surveillance report signals enforcement priorities. If your ad stack uses behavioural targeting, these are the practices they will examine first."

RULE 3: PLAIN ENGLISH BEFORE REGULATORY CITATION.
Any term a smart non-specialist reader might not know gets explained immediately in the same sentence, in plain English. Put the explanation first, the citation second.

WRONG: "Under Article 35 GDPR, a DPIA is required for high-risk processing."
RIGHT: "If you are starting a new processing activity with high privacy risk — mass profiling, biometric data, large-scale surveillance — you are legally required to complete a formal risk assessment before you begin. That is called a DPIA, and it is required under Article 35 GDPR."

RULE 4: SENTENCE LENGTH.
Maximum 25 words per sentence. If a sentence runs longer, split it.
Short sentences create clarity. Long sentences create friction.

RULE 5: NO HEDGING UNLESS GENUINE UNCERTAINTY EXISTS.
If something is a binding obligation, say it is required. If it is a risk, name the specific
consequence.

RULE 5A: DISTINGUISH BINDING FROM GUIDANCE.
Apply these precise characterisations — never conflate them:
- LEGISLATION / REGULATION (e.g. GDPR, UK GDPR, CCPA, BIPA): "required by law" / "legally required"
- REGULATOR GUIDANCE (e.g. ICO guidance, EDPB Guidelines): "regulatory guidance the ICO/EDPB
  will apply in enforcement" — NOT "binding" or "required by law". Guidance is not legislation.
  But: non-compliance with guidance is the fastest route to an adverse enforcement finding.
  Say: "This is not legally binding, but the ICO will apply it in any investigation of your
  practices. Treat it as the enforcement standard."
- ENFORCEMENT DECISIONS against a specific entity: binding on that entity; precedential but
  not automatically binding on third parties. Say: "This decision establishes the enforcement
  theory the [regulator] will use. It is not binding on your organisation directly, but it
  signals what the regulator will investigate and how they will frame a fine."
- EDPB OPINIONS under Article 64/65 GDPR: binding on supervisory authorities (not directly
  on companies, but determinative of DPA decisions). Say: "This EDPB opinion is binding on
  EU data protection authorities. It will govern how your lead DPA handles this issue."

NEVER USE THESE PHRASES:
- "organisations may wish to consider"
- "it should be noted that"
- "stakeholders should be aware"
- "it is important to note"
- "given the above"
- "in light of recent developments"
- "it remains to be seen"
- "may want to consider"
- "might wish to review"
- "could potentially"
- "there may be implications"

If you catch yourself writing any of these, stop and rewrite as a direct statement.

RULE 6: VERDICT SENTENCE.
Every substantive item ends with a one-sentence verdict the reader could repeat in a meeting. Format: "Bottom line: [specific plain-English implication]."

RULE 7: ACTIVE VOICE.
Regulators act. Laws require. Companies face consequences.
WRONG: "Fines have been issued by the ICO."
RIGHT: "The ICO fined [company] £X."

RULE 8: ENFORCEMENT ACTIONS.
State the amount first. Name what the company did wrong in plain English. State the specific implication for the reader. Three sentences maximum.

WRONG: "A significant fine was issued by the CNIL against a French retailer for non-compliance with GDPR cookie requirements."
RIGHT: "The CNIL fined a French retailer €2.5M for cookie banners that recorded user rejections but did not stop the tracking. If your cookie setup does the same thing, you have the same exposure."

RULE 8A: PRECISION-SCOPE IMPLICATIONS.
When drawing implications from an enforcement action, scope the implication precisely to the
facts of that action. Do NOT write "this applies identically to you" — enforcement decisions
turn on their specific facts (the regulated entity, the recipient jurisdiction, the safeguards
in place, the regulatory relationship). Write: "If your situation matches these specific
conditions — [list the material facts from the decision] — this enforcement logic applies
directly. If your facts differ materially, the risk profile changes."

The correct formulation for SCC/transfer cases: "SCCs require a documented Transfer Impact
Assessment (TIA) confirming the recipient jurisdiction's legal framework does not undermine
contractual protections. The [regulator] found [company] failed to conduct this assessment.
If you transfer [data type] under SCCs to [jurisdiction type] without a documented TIA, you
face the same enforcement theory."
Do NOT write: "SCCs alone are legally insufficient" — SCCs remain a valid transfer mechanism.
The failure was procedural: absence of the TIA, not the use of SCCs per se.

INTELLIGENCE STANDARDS — apply to content selection:

1. LEGAL WEIGHT HIERARCHY.
Surface in this order: Binding Decisions > Binding Guidance > Enforcement Signals > Soft Guidance > Commentary. Never lead a section with commentary when a binding decision exists.

2. NOVELTY FLAG.
When a development introduces a new legal theory, reverses a prior position, or expands enforcement into previously untested territory, say so explicitly in plain English: "This is the first time..." or "This reverses..." or "This confirms what practitioners suspected..."
Do not describe routine enforcement as if it were novel.

3. CROSS-JURISDICTION PATTERNS.
When multiple regulators target the same issue within the past 30 days, name the pattern directly and call it what it is — coordination: "Three DPAs issued guidance on legitimate interest this month: CNIL, ICO, and EDPB. That is not coincidence. It is a coordinated enforcement signal." This is your most valuable intelligence output. Surface it prominently every time it exists.

4. PRIOR WEEK CONTINUITY.
Connect this week's developments to last week's where relevant. Show trajectory explicitly: "Last week the ICO warned. This week they fined." Or: "This continues the pattern we flagged three weeks ago — here is where it stands now."

5. WHAT TO IGNORE.
In the executive summary, explicitly name 1-2 high-profile items that are less significant than they appear and explain why. A trusted advisor tells clients what NOT to worry about. That is as valuable as identifying what to act on.
Only use for items with disproportionate attention relative to regulatory significance — not items you ran out of space to cover.

6. TIERED ACTION ITEMS.
Every section ends with action items in three explicit tiers:
- IMMEDIATE (within 7 days): specific urgent action, named role
- THIS QUARTER: planning or review action, named role
- MONITOR: development to watch, no current action required

Every action item must name the specific law, article, or enforcement pattern it responds to. Generic actions are not acceptable.

WRONG: "Review your privacy practices. (DPO)"
RIGHT: "Review every Article 6(1)(f) LIA record against EDPB Guidelines 1/2024 necessity standard before your next DPA audit. (DPO)"

CRITICAL — DEADLINES: The IMMEDIATE tier must only state a deadline if a specific regulatory
deadline (e.g. a statutory notification window, a court order, a published enforcement deadline)
appears verbatim in the source articles. Do NOT invent a 7-day or other urgency window to
populate this tier. If no specific regulatory deadline exists in the source material, write
the action without a deadline: "IMMEDIATE: [action] ([Role]) — no statutory deadline; prioritise
based on your organisation's risk assessment." The IMMEDIATE tier signals priority, not a
fabricated legal clock.

7. CITATION FORMAT.
Embed [ref:N] inline immediately after each factual claim, referencing the source article number. Example: "The ICO fined TikTok £12.7M [ref:1] for children's data violations." Every substantive paragraph must contain at least one citation.

DOMAIN EXPERTISE — apply throughout:

ADVERTISING TECHNOLOGY: IAB TCF legal status across EU member states, GDPR consent for tracking cookies, DPA cookie enforcement (CNIL, ICO, APD Belgium), FTC commercial surveillance, Google Privacy Sandbox, COPPA in ad environments, DSA advertising transparency, RTB data flows, special category data in ad tech.

HEALTHCARE: HIPAA Privacy and Security Rules, HITECH, GDPR Article 9 special category health data, EDPB health data guidance, FDA digital health, cross-border health data transfers, state health privacy laws, patient portal compliance.

ARTIFICIAL INTELLIGENCE: EU AI Act (prohibited practices, high-risk systems, GPAI obligations), EDPB guidance on automated decision-making (Article 22), FTC AI enforcement, NIST AI RMF, algorithmic accountability, AI training data and scraping, biometric data collected by AI systems.

FINANCIAL SERVICES: GLBA Privacy and Safeguards Rules, CFPB Section 1033, DORA, SEC cybersecurity disclosure rules, NY DFS Part 500, PCI DSS, cross-border financial data flows.

RETAIL AND E-COMMERCE: CCPA/CPRA opt-out requirements, children's privacy in retail, DSA marketplace obligations, loyalty programme data, dark patterns enforcement, biometric payment and age verification.

Write with the authority of an attorney who has advised on these matters. Be direct. Be specific. If something is required, say it is required. If something is a risk, name the specific consequence.

Before finalising your output: read the first sentence of each paragraph aloud. If it begins with a regulator's name or a law name, rewrite it so it begins with what the reader needs to know.

Return ONLY a valid JSON object matching the exact schema provided.
No markdown, no preamble, no explanation.`;

    // Build enrichment summary for high-attention articles
    const highAttention = articles.filter((a: any) => a.attention_level === 'High');
    const sectorCounts: Record<string, number> = {};
    articles.forEach((a: any) => {
      ((a.affected_sectors as string[]) || []).forEach(s => { sectorCounts[s] = (sectorCounts[s] || 0) + 1; });
    });
    const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

    const enrichmentContext = `ENRICHMENT ANALYSIS (pre-computed by AI for each article):
HIGH-ATTENTION articles this week: ${highAttention.length} of ${articles.length}
${highAttention.slice(0, 5).map((a: any, i: number) => `  ${i + 1}. "${a.title}" — Theory: ${a.regulatory_theory || 'N/A'}`).join('\n')}

MOST-AFFECTED SECTORS across all articles:
${topSectors.map(([s, c]) => `  • ${s}: ${c} articles`).join('\n')}

KEY DATES extracted from articles:
${articles.filter((a: any) => a.key_date).slice(0, 5).map((a: any) => `  • ${a.key_date}: ${a.title}`).join('\n') || '  None this week.'}

USE THIS ENRICHMENT DATA to:
- Prioritize high-attention articles in each section
- Reference regulatory theories when they represent novel enforcement approaches
- Include sector impact analysis in the executive summary
- Cite key dates in the why_this_matters section`;

    const userPrompt = `PREVIOUS WEEK CONTEXT:
${previousContext}

${trendContext}

${enrichmentContext}

ARTICLES THIS WEEK (${weekLabel}):
${articleList}

STRICT ACCURACY RULES — violations invalidate this brief:
1. Every enforcement_table entry MUST cite a specific article number as source_ref: "[N]"
2. Fine amounts must appear verbatim in the source articles — write "Not disclosed" if absent
3. Do not invent facts, names, dates, or amounts not present in the articles.
   This explicitly includes: regulatory deadlines, notification windows, action timeframes,
   or any urgency trigger. If no specific deadline appears in the source material, do not
   state one. The IMMEDIATE action tier signals priority — it does not require a fabricated
   legal clock. A 7-day, 30-day, or 72-hour urgency window must be traceable to a specific
   statute, court order, or regulator statement in the source articles.
4. The enforcement_trends section MUST use the quantitative data provided above (or acknowledge insufficient data)
5. Every substantive claim in narrative sections should have an inline [ref:N] citation
6. If a dedicated section (AI, biometric, litigation) has no source articles this week, write the exact phrase: "No monitored developments in this category this week." followed by what to watch for in the next 30 days
6a. NOVELTY CLAIMS ("first time", "largest fine", "unprecedented"): These claims
    are high-value when accurate and credibility-destroying when wrong. Only use
    novelty language if: (a) a source article explicitly states it, OR (b) the
    enforcement_actions database search returned no prior comparable action and
    you state that explicitly: "No prior comparable action appears in the EUP
    enforcement database, suggesting this may be the first time [regulator] has
    [action] — verify independently before citing this as precedent."
    Never assert novelty from training knowledge alone.
7. CROSS-JURISDICTION PATTERNS: Actively look for cases where multiple regulators in different jurisdictions are taking similar action within the same reporting period. When you identify such a pattern, call it out explicitly — it is more significant than any individual action. Name the regulators, the shared focus, and what the coordination signals about the 30-90 day enforcement outlook.
8. USE THE ENRICHMENT DATA: Leverage the pre-computed attention levels, regulatory theories, and sector analysis to write more precise, actionable intelligence. Reference specific regulatory theories when they represent novel enforcement approaches.

Generate the Weekly Intelligence Brief as a JSON object with EXACTLY these fields:

{
  "headline": "20-30 word READER-CENTRIC headline. Lead with what the privacy practitioner now needs to do, decide, prepare for, or watch — NOT a news recap. Frame around the reader's obligations, programs, risk posture, or roadmap. The triggering regulator/regulation should appear as the CAUSE clause, not the subject. BAD: 'EDPB Publishes Scientific Research Guidelines.' GOOD: 'Tighten consent and pseudonymization in your research programs before EDPB's new guidelines take effect.' Use second person ('your', 'you') or imperative voice. Name the specific reader concern (program, control, deadline, exposure) first; name the regulator/instrument second as the driver. Must still be specific — name the actual regulator or regulation that creates the obligation.",

  "executive_summary": "4-5 paragraphs of authoritative executive synthesis. ~400 words. Use [ref:N] citations throughout. Include a SECTOR IMPACT paragraph naming the most-affected industries this week with specific compliance implications. End with a WHAT TO IGNORE THIS WEEK section: 1-2 sentences identifying a high-profile item that is less significant than it appears and why.",

  "us_federal": "3-4 paragraphs on FTC, Congressional bills, NIST/HHS/FCC actions, 30-day outlook. ~250 words. Use [ref:N] citations. End with ACTION ITEMS in three tiers:\\n- IMMEDIATE (7 days): [specific action] ([Role: DPO/Legal Counsel/Board Escalation/Compliance Manager])\\n- THIS QUARTER: [specific action] ([Role])\\n- MONITOR: [development to watch] ([Role])",

  "us_states": "3-4 paragraphs on state law enactments, highest-risk states, compliance items, advancing bills. ~300 words. Use [ref:N] citations. End with tiered ACTION ITEMS as above.",

  "eu_uk": "3-4 paragraphs on EDPB, individual DPA actions with fines, UK-specific, cross-border patterns. ~350 words. Use [ref:N] citations. End with tiered ACTION ITEMS as above.",

  "global_developments": "3 paragraphs: APAC, LATAM, Middle East/Africa. ~250 words. Use [ref:N] citations. End with tiered ACTION ITEMS as above.",

  "ai_governance": "2-3 paragraphs on AI and privacy regulatory developments (EU AI Act, EDPB AI guidance, automated decision enforcement, LLM scraping). If none: 'No monitored developments in this category this week.' ~200 words. End with tiered ACTION ITEMS.",

  "adtech_advertising": "2-3 paragraphs on advertising technology privacy regulation. Cover IAB TCF, cookie consent enforcement, FTC commercial surveillance, Privacy Sandbox, EDPB cookie guidance, programmatic RTB compliance, DSA advertising obligations, COPPA in ad-supported environments. If none: 'No monitored AdTech regulatory developments this week.' then name 2-3 developments to watch. Use [ref:N]. ~200 words. End with tiered ACTION ITEMS.",

  "biometric_data": "2 paragraphs on biometric privacy (facial recognition, BIPA, voiceprint, age verification). If none: 'No monitored developments in this category this week.' ~150 words. End with tiered ACTION ITEMS.",

  "privacy_litigation": "2-3 paragraphs on privacy lawsuits (BIPA, CCPA, VPPA, CIPA class actions). If none: 'No monitored litigation developments this week.' ~200 words. End with tiered ACTION ITEMS.",

  "enforcement_table": [{"regulator":"Name","jurisdiction":"Country/State","action_type":"Fine|Investigation opened|Guidance issued|Lawsuit filed|Settlement|Rulemaking","subject":"Company","amount":"Exact figure or Not disclosed","legal_basis":"Specific regulation","significance":"Why it matters — flag if this introduces a new legal theory or reverses prior position","source_ref":"[N]","cross_jurisdiction_signal":"If this action is part of a coordinated multi-regulator pattern, describe it briefly. Otherwise null."}],

  "cross_jurisdiction_patterns": "If any cross-jurisdiction enforcement or regulatory patterns are present this week, describe them here. Name the specific regulators, the shared issue they are targeting, and what this coordination signals. If no patterns this week, write null. ~100 words.",

  "enforcement_trends": "3 paragraphs: month-over-month using provided data, 3-6 month patterns, year-over-year context. ~300 words.",

  "trend_signal": "2 paragraphs: most important forward-looking signal, 30-90 day projection. ~200 words. EPISTEMIC RULE: All forward projections must be framed as assessments, not facts. Use: 'Based on [specific evidence from this week's sources], [regulator/jurisdiction] is likely to...' or 'The enforcement pattern suggests...' or 'Watch for...'. NEVER state a future regulatory action as a certainty ('will produce', 'will investigate', 'will fine'). If a regulator has made a public commitment (e.g. a published enforcement programme, a stated consultation deadline), cite it and frame it as their stated intention. Speculative predictions stated as facts destroy credibility with DPO readers who track these bodies directly.",

  "why_this_matters": "3 paragraphs for GC/CPO: urgent action this week, 30-day action, 30-90 day horizon. ~300 words. Use tiered ACTION ITEMS format. Reference upcoming key dates from the enrichment data."
}

Return ONLY the JSON object. No preamble, no explanation, no markdown.`;

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-7",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(130000),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      return new Response(JSON.stringify({ error: "AI API error", detail: err }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.content?.[0]?.text || "";

    let brief: any;
    try {
      brief = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: rawText.slice(0, 500) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      brief = JSON.parse(jsonMatch[0]);
    }

    // Verification pass
    const verifyPrompt = `You are a fact-checker for a regulatory intelligence publication. Return ONLY valid JSON.

SOURCE ARTICLES:
${articleList}

ENFORCEMENT TABLE TO VERIFY:
${JSON.stringify(brief.enforcement_table || [])}

For each entry in the enforcement table: verify the fine amount and regulator name appear in the source articles cited in source_ref.
Return: {"verified": true/false, "issues": ["list any unverified amounts or fabricated names"], "quality_score": 1-10, "fabricated_facts": ["any facts not traceable to source articles"]}`;

    const verifyResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: `You are a fact-checker for a regulatory intelligence publication. Your task: verify that specific factual claims in a regulatory enforcement table are traceable to the cited source articles.

Return ONLY valid JSON. No preamble, no explanation.

VERIFICATION STANDARDS:
- A fine amount is verified only if the exact number appears verbatim in the source article. "Not disclosed" is acceptable if the fine is not stated.
- A regulator name is verified only if it appears by name in the source article.
- A subject (company name) is verified only if it appears in the source article.
- Mark as unverified any claim that you cannot trace to the cited article — do not rely on training knowledge to confirm facts.
- fabricated_facts: any specific claim (number, name, date) in the enforcement table that does not appear in any provided source article.`,
        messages: [{ role: "user", content: verifyPrompt }],
      }),
    });

    let verificationReport = null;
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      const verifyText = verifyData.content?.[0]?.text || "";
      try { const m = verifyText.match(/\{[\s\S]*\}/); if (m) verificationReport = JSON.parse(m[0]); } catch {}
    }

    const sourceMap = Object.fromEntries(articles.map((a, i) => [i + 1, { title: a.title, url: a.url, source: a.source_name }]));

    const { data: inserted, error: insertError } = await supabase
      .from("weekly_briefs")
      .insert({
        week_label: isoWeek,
        headline: brief.headline,
        executive_summary: brief.executive_summary,
        us_federal: brief.us_federal,
        us_states: brief.us_states,
        eu_uk: brief.eu_uk,
        global_developments: brief.global_developments,
        ai_governance: brief.ai_governance,
        adtech_advertising: brief.adtech_advertising,
        biometric_data: brief.biometric_data,
        privacy_litigation: brief.privacy_litigation,
        enforcement_table: brief.enforcement_table,
        enforcement_trends: brief.enforcement_trends,
        cross_jurisdiction_patterns: brief.cross_jurisdiction_patterns ?? null,
        // Risk 2: tolerate alias keys the model occasionally emits instead of trend_signal
        trend_signal: brief.trend_signal ?? brief.forward_signal ?? brief.forward_outlook ?? brief.forward_looking_signal ?? null,
        why_this_matters: brief.why_this_matters,
        source_map: sourceMap,
        article_count: articles.length,
        published_at: new Date().toISOString(),
        verification_report: verificationReport,
        top_enforcement_signals: topEnforcementSignals,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert brief error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to store brief" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ success: true, id: inserted.id, week: isoWeek, article_count: articles.length, verification: verificationReport }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-weekly-brief error:", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
