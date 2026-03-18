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
  const start = new Date(now);
  start.setDate(now.getDate() - 7);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
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

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: articles, error: fetchError } = await supabase
      .from("updates")
      .select("title, summary, source_name, category, topic_tags, published_at, url")
      .gte("published_at", sevenDaysAgo.toISOString())
      .order("published_at", { ascending: false })
      .limit(40);

    if (fetchError || !articles || articles.length === 0) {
      return new Response(JSON.stringify({ error: "No articles found", detail: fetchError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const enforcementHistory = await getEnforcementHistory();

    const { data: prevBrief } = await supabase
      .from("weekly_briefs")
      .select("headline, trend_signal, week_label, enforcement_table")
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    const previousContext = prevBrief
      ? `PREVIOUS WEEK (${prevBrief.week_label}):\nHeadline: ${prevBrief.headline}\nTrend Signal: ${prevBrief.trend_signal || "N/A"}`
      : "No previous week data available.";

    const articleList = articles
      .map((a, i) => {
        const tags = (a.topic_tags as string[] || []).join(", ");
        return `[${i + 1}] [${a.category?.toUpperCase()}]${tags ? ` [TAGS: ${tags}]` : ""} ${a.source_name} — ${a.title}${a.summary ? `\n    Summary: ${a.summary}` : ""}`;
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

    const systemPrompt = `You are the lead analyst at EndUserPrivacy.com, a premium privacy regulatory intelligence platform whose subscribers include DPOs, privacy lawyers, General Counsel, and Chief Privacy Officers at multinational companies. Your Weekly Intelligence Brief is their primary trusted source for global privacy regulatory developments, with PARTICULAR DEPTH in advertising technology (AdTech) compliance — covering the IAB Transparency & Consent Framework (TCF), FTC commercial surveillance enforcement, cookie consent enforcement by European DPAs, programmatic advertising data flows, and the transition to cookieless advertising infrastructure.

Your AdTech expertise covers:
- IAB Europe TCF and its legal status across EU member states
- Belgian APD, CNIL, ICO enforcement against TCF-reliant consent mechanisms
- FTC commercial surveillance rulemaking and behavioral advertising
- Google Privacy Sandbox / Topics API / Protected Audience API
- Cookie deprecation and identity resolution alternatives
- EDPB guidance on consent for tracking cookies
- DAA/NAI self-regulatory frameworks and their relationship to legal enforcement
- DSA advertising transparency obligations for platforms
- COPPA enforcement in ad-supported environments
- Children's advertising: CARU guidelines, FTC endorsement guides
- Cross-context behavioral advertising under CPRA
- Real-time bidding (RTB) data flows and special category data
- Data clean rooms and their privacy compliance framework

Your writing standard: Every sentence must carry specific, actionable intelligence. Name the exact regulator, regulation, jurisdiction, and article/section number where applicable. No filler. No hedging. No generic statements like "organizations should consider" — instead say exactly what they must do, by when, under which law, enforced by whom.

Citation format: When referencing a source article, embed [ref:N] inline in the text immediately after the claim it supports. Example: "The ICO issued a £12.7M fine against TikTok [ref:1] for children's data violations."

Format: Return ONLY a valid JSON object matching the schema exactly. No markdown, no preamble.`;

    const userPrompt = `PREVIOUS WEEK CONTEXT:
${previousContext}

${trendContext}

ARTICLES THIS WEEK (${weekLabel}):
${articleList}

STRICT ACCURACY RULES — violations invalidate this brief:
1. Every enforcement_table entry MUST cite a specific article number as source_ref: "[N]"
2. Fine amounts must appear verbatim in the source articles — write "Not disclosed" if absent
3. Do not invent facts, names, dates, or amounts not present in the articles
4. The enforcement_trends section MUST use the quantitative data provided above (or acknowledge insufficient data)
5. Every substantive claim in narrative sections should have an inline [ref:N] citation
6. If a dedicated section (AI, biometric, litigation) has no source articles this week, write the exact phrase: "No monitored developments in this category this week." followed by what to watch for in the next 30 days

Generate the Weekly Intelligence Brief as a JSON object with EXACTLY these fields:

{
  "headline": "25-35 word headline capturing the single most significant development this week. Must name specific regulators or regulations. Not generic.",

  "executive_summary": "4-5 paragraphs of authoritative executive synthesis. ~400 words. Use [ref:N] citations throughout.",

  "us_federal": "3-4 paragraphs on FTC, Congressional bills, NIST/HHS/FCC actions, 30-day outlook. ~250 words. Use [ref:N] citations.",

  "us_states": "3-4 paragraphs on state law enactments, highest-risk states, compliance items, advancing bills. ~300 words. Use [ref:N] citations.",

  "eu_uk": "3-4 paragraphs on EDPB, individual DPA actions with fines, UK-specific, cross-border patterns. ~350 words. Use [ref:N] citations.",

  "global_developments": "3 paragraphs: APAC, LATAM, Middle East/Africa. ~250 words. Use [ref:N] citations.",

  "ai_governance": "2-3 paragraphs on AI and privacy regulatory developments (EU AI Act, EDPB AI guidance, automated decision enforcement, LLM scraping). If none: 'No monitored developments in this category this week.' ~200 words.",

  "adtech_advertising": "2-3 paragraphs on advertising technology privacy regulation. Cover IAB TCF, cookie consent enforcement, FTC commercial surveillance, Privacy Sandbox, EDPB cookie guidance, programmatic RTB compliance, DSA advertising obligations, COPPA in ad-supported environments. If none: 'No monitored AdTech regulatory developments this week.' then name 2-3 developments to watch. Use [ref:N]. ~200 words.",

  "biometric_data": "2 paragraphs on biometric privacy (facial recognition, BIPA, voiceprint, age verification). If none: 'No monitored developments in this category this week.' ~150 words.",

  "privacy_litigation": "2-3 paragraphs on privacy lawsuits (BIPA, CCPA, VPPA, CIPA class actions). If none: 'No monitored litigation developments this week.' ~200 words.",

  "enforcement_table": [{"regulator":"Name","jurisdiction":"Country/State","action_type":"Fine|Investigation opened|Guidance issued|Lawsuit filed|Settlement|Rulemaking","subject":"Company","amount":"Exact figure or Not disclosed","legal_basis":"Specific regulation","significance":"Why it matters","source_ref":"[N]"}],

  "enforcement_trends": "3 paragraphs: month-over-month using provided data, 3-6 month patterns, year-over-year context. ~300 words.",

  "trend_signal": "2 paragraphs: most important forward-looking signal, specific 30-90 day prediction. ~200 words.",

  "why_this_matters": "3 paragraphs for GC/CPO: urgent action this week, 30-day action, 30-90 day horizon. ~300 words."
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
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
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
        trend_signal: brief.trend_signal,
        why_this_matters: brief.why_this_matters,
        source_map: sourceMap,
        article_count: articles.length,
        published_at: new Date().toISOString(),
        verification_report: verificationReport,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: "Failed to store brief", detail: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ success: true, id: inserted.id, week: isoWeek, article_count: articles.length, verification: verificationReport }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
