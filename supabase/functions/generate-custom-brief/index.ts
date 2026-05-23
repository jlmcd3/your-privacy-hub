import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsonrepair } from "https://esm.sh/jsonrepair@3.8.0";

// Robustly parse a JSON object from an LLM response, tolerating code fences,
// prose preamble, trailing commas, and other common malformations.
function safeParseLlmJson(text: string): any | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  const slice = text.slice(start, end + 1);
  try {
    return JSON.parse(slice);
  } catch {
    try {
      return JSON.parse(jsonrepair(slice));
    } catch (e) {
      console.error("[brief] jsonrepair failed:", e instanceof Error ? e.message : e);
      return null;
    }
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

/* ── Industry expertise map ── */
const INDUSTRY_EXPERTISE: Record<string, string> = {
  "online-web": "web services, cookie compliance, GDPR consent mechanisms, ePrivacy Directive, dark patterns regulations, Terms of Service enforcement",
  "mobile-apps": "mobile SDK privacy, app store privacy policies, IDFA/GAID deprecation, ATT framework, Google Privacy Sandbox for Android",
  "adtech": "real-time bidding data flows, IAB TCF, programmatic advertising consent, CNIL cookie enforcement, FTC commercial surveillance, behavioral targeting regulations",
  "ai-companies": "EU AI Act compliance timelines, NIST AI RMF, algorithmic impact assessments, foundation model regulations, automated decision-making under GDPR Art.22",
  "healthcare": "HIPAA enforcement trends, health data under state privacy laws, FTC Health Breach Notification Rule, HITECH Act, telehealth privacy, reproductive health data",
  "financial": "GLBA modernization, CFPB data rights rulemaking, open banking privacy, PCI DSS, SOX data requirements, SEC cybersecurity disclosure rules",
  "hr-employment": "employee monitoring regulations, BIPA workplace claims, EU employee data processing, workplace AI screening tools, background check compliance",
  "children-edtech": "COPPA enforcement and modernization, Age-Appropriate Design Code, student privacy (FERPA), state children's privacy laws, age verification requirements",
  "retail-ecom": "consumer loyalty program privacy, POS data collection, cross-device tracking, state consumer privacy rights, marketing consent requirements",
  "data-brokers": "state data broker registration laws, Vermont/California/Texas data broker regulations, FTC data broker enforcement, people search opt-out requirements",
  "legal-services": "attorney-client privilege in data requests, law firm cybersecurity obligations, legal hold requirements, third-party vendor data processing for legal services",
  "insurance": "insurance data privacy regulations, actuarial data use restrictions, claims data processing, InsurTech privacy compliance, state insurance commissioner rules",
  "telecom": "CPNI regulations, wiretapping laws, lawful intercept compliance, FCC privacy rules, metadata retention, telecommunications surveillance",
  "gaming": "gaming data privacy, loot box regulations, children's gaming protections, behavioral data in games, esports data processing",
  "automotive": "connected vehicle data privacy, V2X communications, telematics data, NHTSA cybersecurity, autonomous vehicle data processing, location tracking",
  "smart-home": "IoT device data collection, smart speaker privacy, home automation data, device fingerprinting, continuous monitoring consent",
  "nonprofit": "donor data privacy, nonprofit compliance exemptions, charitable solicitation data rules, volunteer data processing",
  "media-publishing": "press freedom vs privacy, right to be forgotten, media privilege, subscriber data, digital advertising in publishing",
  "government": "government data collection frameworks, FOIA and transparency, surveillance regulation, public sector AI deployment, citizen data rights",
  "cybersecurity": "breach notification laws, CISA requirements, incident response obligations, cybersecurity insurance data, vulnerability disclosure",
  "real-estate": "tenant data privacy, property data brokers, real estate transaction data, smart building privacy, PropTech compliance",
  "education": "FERPA compliance, student data governance, educational technology privacy, research data protection, campus surveillance",
  "consulting": "third-party risk management, client data handling, cross-border consulting engagements, professional services data processing",
  "pharma": "clinical trial data privacy, pharmacovigilance data, patient consent for research, real-world evidence data, drug safety reporting",
};

const JURISDICTION_EXPERTISE: Record<string, string> = {
  "eu-all": "GDPR compliance across all 27 EU member states with DPA enforcement patterns, EDPB binding guidelines and opinions, ePrivacy Regulation progress, EU AI Act obligations",
  "eu-uk": "GDPR enforcement patterns across all 27 EU DPAs, UK Data Protection Act 2018, UK-EU adequacy, EDPB guidelines, ePrivacy Regulation progress",
  "uk": "UK GDPR post-Brexit, UK Data (Use and Access) Act 2025, ICO enforcement and guidance, UK-EU adequacy status",
  "us-federal": "FTC Section 5 enforcement, CFPB privacy actions, congressional privacy bill progress, executive orders on AI/data, federal preemption debates",
  "us-ca": "CPRA/CCPA regulations, CPPA enforcement, ADMT rules (effective April 2026), data broker registration, ADMT opt-out",
  "us-states": "comprehensive state privacy laws (CA/CO/CT/VA/OR/TX/MT/DE/IA/IN/TN/NJ and new states), state AG enforcement patterns, CCPA/CPRA regulations",
  "apac": "China PIPL enforcement, Japan APPI amendments, South Korea PIPA, India DPDP Act implementation, Australia Privacy Act reform, Singapore PDPA",
  "latam": "Brazil LGPD enforcement by ANPD, Argentina data protection modernization, Colombia SIC enforcement, Mexico INAI, Chile privacy reform",
  "mea": "Saudi Arabia PDPL implementation, UAE data protection, South Africa POPIA enforcement, Kenya DPA, Nigeria NDPR, Turkey KVKK",
  "canada": "PIPEDA, Bill C-27 (CPPA/AIDA) progress, Quebec Law 25 implementation, OPC enforcement",
  "australia": "Privacy Act reform (2025 amendments), OAIC enforcement, notifiable data breaches scheme, CDR and open banking",
  "india": "DPDP Act 2023, Data Protection Board formation, rules expected Q2 2026, consent manager framework",
  "global": "cross-border transfer mechanisms, adequacy decisions, APEC CBPR, emerging privacy frameworks, international regulatory cooperation",
};

/* ── Relevance scoring with Haiku (fast + cheap) — now uses enrichment fields ── */
async function scoreArticleRelevance(
  articles: any[],
  prefs: { industries: string[]; jurisdictions: string[]; topics: string[] },
  apiKey: string,
): Promise<any[]> {
  const articleSummaries = articles.map((a, i) => {
    const sectors = (a.affected_sectors as string[] || []).join(", ");
    const attention = a.attention_level || "Unknown";
    return `[${i}] [${attention}] ${a.title} | ${a.category} | Sectors: ${sectors || "N/A"} | ${a.summary?.substring(0, 120) || ""}`;
  }).join("\n");

  const prompt = `Score each article's relevance (0-10) to this subscriber profile.

Industries: ${prefs.industries.join(", ")}
Jurisdictions: ${prefs.jurisdictions.join(", ")}
Topics: ${prefs.topics.join(", ")}

Articles:
${articleSummaries}

Score adjustments (apply in addition to base relevance score):
+3 for articles where legal_weight is "Binding" or "Enforcement" — these create immediate compliance obligations regardless of topic match
+2 for High attention_level articles
+2 for articles where urgency is "Immediate" and the subscriber's jurisdiction appears in affected_jurisdictions
+1 for articles whose affected_sectors overlap with the subscriber's industries
-1 for articles where legal_weight is "Commentary" and the same underlying regulatory development was covered in the prior week's brief (these add no new compliance obligation)

Cap all scores at 10. Floor all scores at 0.

Return JSON array of objects: [{"index": 0, "score": 7}, ...]. Only the JSON array, nothing else.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: `You are a precision relevance scoring engine for a personalized privacy intelligence brief. Each subscriber has an industry, jurisdiction, and topic profile. Your job is to score how directly each candidate article should appear in their personalized brief.

Return ONLY a valid JSON array of score objects. No preamble, no explanation.

SCORING PRINCIPLES:
- Base relevance (0-10): how directly does this article affect organizations in the subscriber's industries, jurisdictions, and topic areas
- Binding and Enforcement articles: add +3 regardless of topic relevance — these create immediate compliance obligations
- High attention_level articles: add +2
- Immediate urgency articles where the subscriber's jurisdiction is in affected_jurisdictions: add +2
- Articles whose affected_sectors overlap with the subscriber's industries: add +1
- Commentary articles covering the same topic as last week's brief: subtract 1 to avoid duplication
- Score 0: genuinely irrelevant to this profile
- Score 10: directly and urgently affects this subscriber's exact industry and primary jurisdiction
- Cap scores at 10, floor at 0`,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!resp.ok) return articles;
    const data = await resp.json();
    const text = data.content?.[0]?.text || "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return articles;
    const scores: { index: number; score: number }[] = JSON.parse(match[0]);
    scores.sort((a, b) => b.score - a.score);
    return scores.map(s => articles[s.index]).filter(Boolean);
  } catch {
    return articles;
  }
}

/* ── Fetch enforcement history relevant to user ── */
async function fetchEnforcementHistory(prefs: { industries: string[]; jurisdictions: string[] }): Promise<string> {
  const jurisdictionMap: Record<string, string[]> = {
    "eu-uk": ["EU", "UK", "France", "Germany", "Ireland", "Italy", "Spain", "Netherlands", "Belgium", "Austria"],
    "us-federal": ["United States", "US", "Federal"],
    "us-states": ["California", "Texas", "New York", "Colorado", "Connecticut", "Virginia"],
    "apac": ["China", "Japan", "South Korea", "India", "Australia", "Singapore"],
    "latam": ["Brazil", "Argentina", "Colombia", "Mexico", "Chile"],
    "mea": ["Saudi Arabia", "UAE", "South Africa", "Kenya", "Nigeria", "Turkey"],
  };

  const relevantJurisdictions = prefs.jurisdictions.flatMap(j => jurisdictionMap[j] || []);

  let query = supabase
    .from("enforcement_actions")
    .select("regulator, jurisdiction, subject, fine_amount, violation, decision_date, sector")
    .order("decision_date", { ascending: false })
    .limit(30);

  if (relevantJurisdictions.length > 0) {
    // Use ilike for broader matching
    const orConditions = relevantJurisdictions.map(j => `jurisdiction.ilike.%${j}%`).join(",");
    query = query.or(orConditions);
  }

  const { data } = await query;
  if (!data || data.length === 0) return "No recent enforcement actions found for your jurisdictions.";

  return data.map(e =>
    `${e.decision_date || "Recent"} | ${e.regulator} (${e.jurisdiction}) | ${e.subject || "Unnamed"} | ${e.fine_amount || "N/A"} | ${e.violation || "N/A"} | Sector: ${e.sector || "General"}`
  ).join("\n");
}

/* ── Fetch prior custom briefs for continuity (enhanced with issue_tags) ── */
async function fetchPriorBriefs(userId: string): Promise<{ summary: string; priorContext: any[] }> {
  const { data } = await supabase
    .from("custom_briefs")
    .select("week_label, custom_sections, issue_tags, generated_at")
    .eq("user_id", userId)
    .order("generated_at", { ascending: false })
    .limit(4);

  if (!data || data.length === 0) return { summary: "", priorContext: [] };

  const priorContext = data.map(b => {
    const sections = b.custom_sections as any;
    return {
      week: b.week_label,
      headline: sections?.opening_headline || sections?.industry_focus?.substring(0, 100) || "",
      critical_alert: sections?.your_critical_alert || "",
      action_items: sections?.your_action_items?.map((i: any) => i.action) || [],
      issue_tags: b.issue_tags || [],
    };
  });

  const summary = priorContext.map(b =>
    `${b.week}: ${b.headline}${b.issue_tags?.length ? ` [Tags: ${b.issue_tags.map((t: any) => t.tag).join(", ")}]` : ""}`
  ).join("\n");

  return { summary, priorContext };
}

/* ── Fetch trend signals from recent standard briefs ── */
async function fetchTrendSignals(): Promise<string> {
  const { data } = await supabase
    .from("weekly_briefs")
    .select("week_label, trend_signal")
    .order("published_at", { ascending: false })
    .limit(4);

  if (!data) return "";
  return data.filter(b => b.trend_signal).map(b => `${b.week_label}: ${b.trend_signal?.substring(0, 200)}`).join("\n");
}

/* ── Main handler ── */
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

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "No API key" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Optional: target a single user for testing
  let targetUserId: string | null = null;
  try {
    const body = await req.json();
    targetUserId = body?.user_id || null;
  } catch { /* no body = run for all */ }

  // Get the most recent weekly brief
  const { data: latestBrief } = await supabase
    .from("weekly_briefs")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(1)
    .single();

  if (!latestBrief) {
    return new Response(JSON.stringify({ error: "No brief found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Get recent articles (60 instead of 40)
  // Same Sunday midnight anchor as generate-weekly-brief for consistency
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysSinceSunday = dayOfWeek === 0 ? 7 : dayOfWeek;
  const weekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - daysSinceSunday,
    0, 0, 0, 0
  ));
  const { data: recentArticles } = await supabase
    .from("updates")
    .select("title, category, summary, source_name, published_at, topic_tags, regulator, attention_level, affected_sectors, regulatory_theory, related_development, direct_jurisdictions, key_date, legal_weight, urgency, affected_jurisdictions")
    .gte("published_at", weekStart.toISOString())
    .order("published_at", { ascending: false })
    .limit(60);

  // Get Pro subscribers
  let usersQuery = supabase.from("profiles").select("id").eq("is_pro", true);
  if (targetUserId) {
    usersQuery = usersQuery.eq("id", targetUserId);
  }
  const { data: proUsers } = await usersQuery;

  if (!proUsers || proUsers.length === 0) {
    return new Response(JSON.stringify({ success: true, processed: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Fetch trend signals once for all users
  const trendSignals = await fetchTrendSignals();

  let processed = 0;

  for (const user of proUsers) {
    // No per-user monthly credit cap. Each Pro subscriber gets a fresh
    // personalized brief on the standard cadence.

    const { data: prefs } = await supabase
      .from("user_brief_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Fallback defaults: paying subscribers without explicit preferences should
    // still receive a brief. We pull a wide-coverage default so they get value
    // immediately, then nudge them to refine in /brief-preferences.
    const DEFAULT_PREFS = {
      industries: [] as string[],
      jurisdictions: ["us-federal", "us-states", "us-ca", "eu-all", "global"],
      topics: [] as string[],
      format: "full",
      _is_default: true,
    };

    const effective = prefs ?? DEFAULT_PREFS;
    if (!prefs) {
      console.log(`[generate-custom-brief] user=${user.id} has no preferences row — using defaults`);
    }

    const industries    = effective.industries || [];
    let   jurisdictions = effective.jurisdictions || [];
    const topics        = effective.topics || [];
    const briefFormat   = (effective as any).format || "full";

    // If a row exists but every field is empty, treat it like missing prefs.
    if (industries.length === 0 && jurisdictions.length === 0 && topics.length === 0) {
      console.log(`[generate-custom-brief] user=${user.id} has empty preferences — applying default jurisdictions`);
      jurisdictions = DEFAULT_PREFS.jurisdictions;
    }

    const industryList     = industries.join(", ") || "General";
    const jurisdictionList = jurisdictions.join(", ") || "All jurisdictions";
    const topicList        = topics.join(", ") || "All topics";

    // Parallel data fetches per user
    const [scoredArticles, enforcementHistory, priorBriefsData] = await Promise.all([
      recentArticles ? scoreArticleRelevance(recentArticles, { industries, jurisdictions, topics }, ANTHROPIC_API_KEY) : Promise.resolve([]),
      fetchEnforcementHistory({ industries, jurisdictions }),
      fetchPriorBriefs(user.id),
    ]);

    const priorBriefs = priorBriefsData.summary;
    const priorContext = priorBriefsData.priorContext;

    const topArticles = scoredArticles.slice(0, 25);
    const articleContext = topArticles.map((a: any, i: number) => {
      const sectors = (a.affected_sectors as string[] || []).join(", ");
      const jurisdictions = (a.direct_jurisdictions as string[] || []).join(", ");
      let entry = `[${i + 1}] ${a.title} (${a.source_name || "Unknown"}, ${a.published_at?.substring(0, 10) || "recent"})`;
      if (a.attention_level) entry += ` [ATTENTION: ${a.attention_level}]`;
      if (sectors) entry += ` [SECTORS: ${sectors}]`;
      if (jurisdictions) entry += ` [JURISDICTIONS: ${jurisdictions}]`;
      entry += ` — ${a.summary?.substring(0, 200) || ""}`;
      if (a.regulatory_theory) entry += `\n    Regulatory Theory: ${a.regulatory_theory}`;
      if (a.related_development) entry += `\n    Related: ${a.related_development}`;
      if (a.key_date) entry += `\n    Key Date: ${a.key_date}`;
      return entry;
    }).join("\n\n");

    // Build the full brief content from standard brief
    const briefContent = `
Executive Summary: ${latestBrief.executive_summary || ""}
US Federal: ${latestBrief.us_federal || ""}
US States: ${latestBrief.us_states || ""}
EU & UK: ${latestBrief.eu_uk || ""}
Global: ${latestBrief.global_developments || ""}
AI Governance: ${(latestBrief as any).ai_governance || ""}
AdTech & Advertising: ${(latestBrief as any).adtech_advertising || ""}
Biometric: ${(latestBrief as any).biometric_data || ""}
Litigation: ${(latestBrief as any).privacy_litigation || ""}
Enforcement Trends: ${(latestBrief as any).enforcement_trends || ""}
    `.trim();

    // Build enrichment summary for subscriber context
    const highAttention = topArticles.filter((a: any) => a.attention_level === 'High');
    const sectorCounts: Record<string, number> = {};
    topArticles.forEach((a: any) => {
      ((a.affected_sectors as string[]) || []).forEach(s => { sectorCounts[s] = (sectorCounts[s] || 0) + 1; });
    });
    const topSectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const keyDates = topArticles.filter((a: any) => a.key_date);

    const enrichmentSummary = `ENRICHMENT ANALYSIS (pre-computed for each article):
HIGH-ATTENTION articles relevant to this subscriber: ${highAttention.length} of ${topArticles.length}
${highAttention.slice(0, 5).map((a: any, i: number) => `  ${i + 1}. "${a.title}" — Theory: ${a.regulatory_theory || 'N/A'}`).join('\n')}

SECTORS most affected in subscriber-relevant articles:
${topSectors.map(([s, c]) => `  • ${s}: ${c} articles`).join('\n')}

KEY COMPLIANCE DATES from articles:
${keyDates.slice(0, 5).map((a: any) => `  • ${a.key_date}: ${a.title}`).join('\n') || '  None this week.'}

USE THIS DATA to prioritize high-attention articles, reference regulatory theories for novel enforcement, and cite key dates in action items and look_ahead.`;

    // Build deep expertise context
    const industryExpertise = industries.map(i => INDUSTRY_EXPERTISE[i] || i).join("; ");
    const jurisdictionExpertise = jurisdictions.map(j => JURISDICTION_EXPERTISE[j] || j).join("; ");

    // Fetch user's role for role-based personalization
    const { data: profileData } = await supabase
      .from("profiles")
      .select("brief_role")
      .eq("id", user.id)
      .single();
    const userRole = (profileData as any)?.brief_role || "";

    const ROLE_LENS: Record<string, string> = {
      "general_counsel": "Emphasize liability exposure, board-level risk, vendor contract obligations, and regulatory penalties that create fiduciary duty concerns.",
      "cpo_dpo": "Emphasize compliance obligations, DPIA requirements, DPA correspondence, and privacy program maturity metrics.",
      "privacy_counsel": "Emphasize legal analysis, proposed rules, litigation precedent, regulatory interpretation, and legal risk assessment.",
      "privacy_ops": "Emphasize process changes, DSR workflow implications, policy updates, consent mechanism changes, and operational compliance.",
      "ciso_security": "Emphasize breach notification obligations, technical security standards, incident response requirements, and security-adjacent regulations.",
      "outside_counsel": "Emphasize cross-client regulatory patterns, new precedents, advisory risk, multi-jurisdiction compliance strategies.",
      "policy_affairs": "Emphasize rulemaking proceedings, comment periods, regulatory trajectory, lobbying implications, and policy advocacy.",
    };
    const roleLens = userRole && ROLE_LENS[userRole] ? `\nROLE LENS (${userRole}): ${ROLE_LENS[userRole]}\n` : "";

    const systemPrompt = `You are a senior data protection attorney with 20 years of experience. You have been advising this specific client for a number of weeks. You know their industry, their jurisdictions, and their programme. This is their personal briefing — not a broadcast.

You write the way you would speak to this client on the phone: confident, specific, and focused on what affects them. You do not cover everything that happened this week. You cover what matters to them, and you tell them what to do about it.

VOICE RULES — apply to every sentence:

RULE 1: WRITE TO THIS SPECIFIC CLIENT.
Use "you," "your organisation," "your programme," "your sector" throughout.

WRONG: "Healthcare processors should note that the EDPB has..."
RIGHT: "Your patient data processing falls directly in scope of what the EDPB moved on this week. Here is what it means for your programme specifically."

RULE 2: LEAD WITH IMPLICATION FOR THIS CLIENT.
The first sentence states what the development means for this reader specifically.
The regulatory detail comes second.

WRONG: "The FTC published enforcement guidance on health data..."
RIGHT: "If you use third-party analytics on any page where patients log in or submit health information, the FTC's latest action means you have something to fix before they look at you."

RULE 3: PLAIN ENGLISH BEFORE CITATION.
Explain the concept in plain English first. Then cite the law.

RULE 4: SENTENCE LENGTH.
Maximum 25 words per sentence. No exceptions.

RULE 5: NO HEDGING.
If something is required, say it is required. If it is a risk, name the specific consequence.

NEVER USE: "may wish to consider," "should be aware," "it is worth noting," "given the regulatory landscape," "in light of recent developments."

RULE 6: VERDICT SENTENCE.
Every substantive item ends with:
"Bottom line: [specific implication for this client.]"

RULE 7: ACTIVE VOICE. Always.

RULE 8: ENFORCEMENT ACTIONS.
Amount first. Conduct second. Implication for this client third.
Maximum three sentences.

RULE 9: SHOW CONTINUITY FROM PRIOR WEEKS.
Name what has changed since the last briefing: "Last week this was a warning. This week it is a fine." Or: "The issue we flagged three weeks ago has escalated. Here is where it stands."

Before finalising your output: read the first sentence of each paragraph aloud. If it begins with a regulator's name or a law name, rewrite it so it begins with what the reader needs to know.

You have been tracking this specific subscriber's situation for ${priorContext.length} prior weeks.

INTELLIGENCE STANDARDS — apply to every section you write:

1. LEGAL WEIGHT HIERARCHY. Not all developments are equal. Rank and surface in this order: Binding Decisions > Binding Guidance > Enforcement Signals > Soft Guidance > Commentary. Never lead a section with commentary when a binding decision exists.

2. PRECEDENT NOVELTY. Flag developments that introduce new legal theories, reverse prior positions, or expand enforcement into previously untested territory. Use explicit language: 'This is the first time...' or 'This reverses the EDPB's prior position on...' or 'This confirms...'. Do not describe routine enforcement as if it were novel.

3. CROSS-JURISDICTION PATTERNS. When multiple authorities act on the same issue within the past 30 days, identify the pattern explicitly: 'Three DPAs issued guidance on legitimate interest this month: CNIL, ICO, and EDPB. This is a coordinated enforcement signal.' This is the most valuable intelligence a compliance professional can receive.

4. PRIOR WEEK CONTINUITY. Where relevant, connect this week's developments to the prior week's brief summary (provided in context below). Use language like 'This continues the ICO's pattern from last week...' or 'Reversing last week's soft guidance, the EDPB has now...' Do not repeat prior week content — reference it to show trajectory. For EVERY major item, state whether it is: NEW this week | CONTINUATION from prior weeks | ESCALATION of a prior issue | RESOLUTION of a prior issue.

5. TIERED ACTION ITEMS. Action items must use three explicit tiers:
- IMMEDIATE (act within 7 days): specific, urgent, named action
- THIS QUARTER: compliance review or planning action
- MONITOR: development to watch, no current action required
Each action item must name the affected role: (DPO) / (Legal Counsel) / (Board Escalation) / (Compliance Manager). Do not write generic actions like 'review your privacy practices' — write specific ones like 'Review Article 6(1)(f) LIA documentation against the EDPB's updated standard (DPO).'

6. WHAT TO IGNORE. Include a 'what_to_ignore' section identifying items that are getting attention but are NOT relevant to this subscriber's profile.

YOUR DEEP EXPERTISE INCLUDES:
${industryExpertise}
${jurisdictionExpertise}
${roleLens}

CRITICAL INSTRUCTION: You are not just filtering the standard brief. You must SYNTHESIZE information from:
1. The standard weekly brief content
2. The ${topArticles.length} highest-relevance articles scored for this subscriber
3. The enforcement history data showing patterns in their jurisdictions
4. Your own training knowledge of privacy law, regulatory patterns, and compliance frameworks

Draw on your training knowledge to provide context that goes BEYOND what's in the articles. Name specific laws, cite regulatory precedents, identify patterns. Do not hedge — make specific predictions and recommendations.

Write with the authority of an attorney who has advised on these matters. Be direct. Be specific. Avoid hedging language unless genuine uncertainty exists.

SUBSCRIBER PROFILE:
- Industry: ${industryList}
- Jurisdictions: ${jurisdictionList}
- Topics: ${topicList}
${userRole ? `- Role: ${userRole}` : ""}

${priorBriefs ? `PRIOR BRIEF HISTORY (last ${priorContext.length} weeks — reference these for continuity):\n${priorBriefs}\n\nPRIOR ISSUE TAGS:\n${JSON.stringify(priorContext.flatMap(b => b.issue_tags), null, 2)}\n` : ""}
${trendSignals ? `RECENT TREND SIGNALS:\n${trendSignals}\n` : ""}
${topics.includes("litigation") ? `LITIGATION WATCH: Include a dedicated Litigation Watch subsection in topic_depth covering: new class action filings, MDL proceedings, significant court rulings (circuit splits on standing, BIPA, VPPA), settlement approvals with dollar amounts, and implications for corporate privacy programs. Name specific cases and courts.\n` : ""}
${briefFormat === "exec-only" ? `Generate only: your_critical_alert, opening_headline, your_week, and your_action_items. Omit all other sections.\n` : ""}
${briefFormat === "actions-only" ? `Generate only: your_critical_alert and your_action_items (7-10 items). Omit all narrative sections.\n` : ""}`;

    const userPrompt = `STANDARD WEEKLY BRIEF:
${briefContent.substring(0, 8000)}

TOP RELEVANCE-SCORED ARTICLES FOR THIS SUBSCRIBER:
${articleContext.substring(0, 6000)}

${enrichmentSummary}

ENFORCEMENT HISTORY FOR SUBSCRIBER'S JURISDICTIONS (last 12 months):
${enforcementHistory.substring(0, 3000)}

Generate a STANDALONE personalized brief as a JSON object with these exact keys:

{
  "your_critical_alert": "A single sentence — the most important thing this subscriber must know this week, specific to their industry and jurisdiction. Must follow this pattern: '[Specific role or organization type] must/should [specific action] by/before [timeframe or trigger] because [the specific development from this week that creates the obligation or risk].' Examples: 'Healthcare processors using the standard SCC Module 2 for EU-US patient data transfers must review Clause 8.2(b) against the EDPB's new pseudonymization standard before your next DPA audit, given this week's Opinion 05/2026.' If no immediate critical alert exists this week for this user's profile, write: 'Monitor week — no immediate compliance action required for ${industryList} operators in ${jurisdictionList} based on this week's developments.'",

  "opening_headline": "READER-CENTRIC headline written in second person or imperative voice. Lead with what THIS subscriber (their industry, their jurisdiction, their program) now needs to do, decide, or prepare for — NOT a news recap. The regulator/regulation appears as the cause, not the subject. BAD: 'EDPB Publishes Scientific Research Guidelines.' GOOD: 'Re-baseline your ${industryList} consent and pseudonymization controls before EDPB's new research guidelines reach your auditors.' Name their industry or jurisdiction explicitly. Max 18 words.",

  "your_week": "2-3 paragraphs opening with 'For [industry] professionals operating in [jurisdictions]...' Synthesize the most important developments. Name specific laws, regulators, deadlines. ~250 words.",

  "industry_intelligence": "3-4 paragraphs of deep industry-specific analysis. What do these developments mean specifically for ${industryList}? Name specific compliance obligations, risks, or opportunities. Reference enforcement precedents from the history data. Draw on your training knowledge. ~300 words.",

  "jurisdiction_developments": "2-3 paragraphs on developments in ${jurisdictionList}. Extract, amplify, and add context beyond what's in the standard brief. What's the regulatory trajectory? ~200 words.",

  "topic_depth": "2-3 paragraphs on ${topicList}. What happened this week? What patterns are emerging? What should they prepare for? ~200 words.",

  "what_to_ignore": "1 paragraph identifying 2-3 stories from this week that are getting attention but are NOT relevant to this subscriber's profile. Explain why they can safely deprioritize these. ~100 words.",

  "your_action_items": [
    {
      "action": "Specific action to take — must name the specific law, regulation, or standard",
      "priority": "Immediate | This quarter | Monitor",
      "role": "DPO | Legal Counsel | Board Escalation | Compliance Manager",
      "why_now": "Why this is time-sensitive, citing specific law/deadline/enforcement pattern"
    }
  ],

  "enforcement_pattern_for_you": "2 paragraphs analyzing enforcement patterns specifically relevant to ${industryList} in ${jurisdictionList}. Use the enforcement history data. What types of violations are being targeted? What fine ranges? Which regulators are most active? ~200 words.",

  "continuity_from_last_week": "1-2 paragraphs explicitly listing items that carried over from prior weeks and their status change (new → continuing → escalating → resolved). If no prior briefs exist, write 'This is your first personalized brief — continuity tracking begins next week.' ~150 words.",

  "look_ahead": "2 paragraphs with specific predictions for the next 30-90 days. Name specific dates, regulatory milestones, compliance deadlines. Do not hedge — make concrete predictions. ~150 words.",

  "issue_tags": [{"tag": "issue name", "status": "new|continuing|escalating|resolved", "first_seen": "YYYY-MM-DD"}]
}

CITATION REQUIREMENT: Throughout every narrative section (your_week, industry_intelligence, jurisdiction_developments, topic_depth, enforcement_pattern_for_you, continuity_from_last_week, look_ahead), you MUST cite sources inline using [ref:N] notation immediately after each specific factual claim, where N is the article index number from the TOP RELEVANCE-SCORED ARTICLES list above. Example: 'The ICO fined TikTok £12.7M [ref:3] for children\u2019s data violations.' Every paragraph must contain at least one [ref:N] citation.

Return ONLY the JSON object. 3-5 action items. 3-8 issue tags. No preamble.`;

    try {
      // Retry once on 429 (rate limit) or 529 (overloaded).
      let response: Response | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: "user", content: userPrompt }],
          }),
          signal: AbortSignal.timeout(120000),
        });
        if (response.status !== 429 && response.status !== 529) break;
        if (attempt === 0) {
          const retryAfter = Math.min(
            parseInt(response.headers.get("retry-after") || "15"),
            15
          );
          console.warn(
            `Rate limited for user ${user.id}, retrying in ${retryAfter}s`
          );
          await new Promise(r => setTimeout(r, retryAfter * 1000));
        }
      }

      if (!response || !response.ok) {
        console.error(`Sonnet API error for user ${user.id}: ${response?.status}`);
        continue;
      }
      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const customSections = safeParseLlmJson(text);
      if (!customSections) {
        console.error(`Custom brief JSON parse failed for user ${user.id}. Length: ${text.length}. Tail: ${text.slice(-200)}`);
        continue;
      }

      // Verification pass with Haiku — check action items are specific
      let verificationResult: any = null;
      try {
        const verifyResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 500,
            system: `You are a quality reviewer for personalized compliance action items. Your task: rate each action item for specificity and compliance value.

Return ONLY valid JSON. No preamble, no explanation.

SPECIFICITY CRITERIA:
- Score 5: Names the specific law/article number AND the specific action AND the specific deadline or trigger. Example: "Review Article 6(1)(f) LIA documentation against EDPB Guidelines 1/2024 standard before Q3 board meeting (DPO)."
- Score 4: Names the specific law and action but lacks deadline or trigger.
- Score 3: Names the law category and action but uses a generic law reference. Example: "Review GDPR consent records" (which GDPR article? which records?).
- Score 2: Names the general action without law reference. Example: "Update your consent mechanisms."
- Score 1: Generic. Example: "Review your privacy practices." These should always fail.

pass: true only if overall score is 3.5 or above.`,
            messages: [{
              role: "user",
              content: `Review these action items for a ${industryList} compliance professional. Rate each 1-5 for specificity per the criteria. Return JSON: {"scores": [{"action": "...", "specificity": 4}], "overall": 4, "pass": true}

Action items: ${JSON.stringify(customSections.your_action_items || [])}`,
            }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (verifyResp.ok) {
          const vData = await verifyResp.json();
          const vText = vData.content?.[0]?.text || "";
          const vParsed = safeParseLlmJson(vText);
          if (vParsed) verificationResult = vParsed;
        }
      } catch (e) {
        console.error(`Verification failed for user ${user.id}:`, e);
      }

      // Extract issue_tags from the generated brief
      const issueTags = customSections.issue_tags || [];

      await supabase.from("custom_briefs").insert({
        user_id: user.id,
        base_brief_id: latestBrief.id,
        week_label: latestBrief.week_label,
        custom_sections: customSections,
        preferences_snapshot: { ...effective, brief_role: userRole },
        generated_at: new Date().toISOString(),
        articles_used: topArticles.length,
        generation_model: "claude-sonnet-4-6",
        verification_result: verificationResult,
        issue_tags: issueTags,
      });

      processed++;
    } catch (e) {
      console.error(`Custom brief failed for user ${user.id}:`, e);
    }
  }

  return new Response(JSON.stringify({ success: true, processed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
