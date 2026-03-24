import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/* ── Relevance scoring with Haiku (fast + cheap) ── */
async function scoreArticleRelevance(
  articles: any[],
  prefs: { industries: string[]; jurisdictions: string[]; topics: string[] },
  apiKey: string,
): Promise<any[]> {
  const articleSummaries = articles.map((a, i) => `[${i}] ${a.title} | ${a.category} | ${a.summary?.substring(0, 120) || ""}`).join("\n");

  const prompt = `Score each article's relevance (0-10) to this subscriber profile:
Industries: ${prefs.industries.join(", ")}
Jurisdictions: ${prefs.jurisdictions.join(", ")}
Topics: ${prefs.topics.join(", ")}

Articles:
${articleSummaries}

Return JSON array of objects: [{"index": 0, "score": 7}, ...]. Only the JSON array, nothing else.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
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
    // Sort by score descending, return top articles
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
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentArticles } = await supabase
    .from("updates")
    .select("title, category, summary, source_name, published_at, topic_tags, regulator")
    .gte("published_at", oneWeekAgo)
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
    const { data: prefs } = await supabase
      .from("user_brief_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!prefs) continue;

    const industries = prefs.industries || [];
    const jurisdictions = prefs.jurisdictions || [];
    const topics = prefs.topics || [];
    const briefFormat = (prefs as any).format || "full";

    if (industries.length === 0 && jurisdictions.length === 0 && topics.length === 0) continue;

    const industryList = industries.join(", ") || "General";
    const jurisdictionList = jurisdictions.join(", ") || "All jurisdictions";
    const topicList = topics.join(", ") || "All topics";

    // Parallel data fetches per user
    const [scoredArticles, enforcementHistory, priorBriefsData] = await Promise.all([
      recentArticles ? scoreArticleRelevance(recentArticles, { industries, jurisdictions, topics }, ANTHROPIC_API_KEY) : Promise.resolve([]),
      fetchEnforcementHistory({ industries, jurisdictions }),
      fetchPriorBriefs(user.id),
    ]);

    const priorBriefs = priorBriefsData.summary;
    const priorContext = priorBriefsData.priorContext;

    const topArticles = scoredArticles.slice(0, 25);
    const articleContext = topArticles.map((a: any, i: number) =>
      `[${i + 1}] ${a.title} (${a.source_name || "Unknown"}, ${a.published_at?.substring(0, 10) || "recent"}) — ${a.summary?.substring(0, 200) || ""}`
    ).join("\n\n");

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

    const systemPrompt = `You are a dedicated privacy regulatory analyst who has been tracking this specific subscriber's situation for ${priorContext.length} prior weeks.

YOUR DEEP EXPERTISE INCLUDES:
${industryExpertise}
${jurisdictionExpertise}
${roleLens}

CRITICAL INSTRUCTION: You are not just filtering the standard brief. You must SYNTHESIZE information from:
1. The standard weekly brief content
2. The ${topArticles.length} highest-relevance articles scored for this subscriber
3. The enforcement history data showing patterns in their jurisdictions
4. Your own training knowledge of privacy law, regulatory patterns, and compliance frameworks
5. The prior brief history — for EVERY major item, state whether it is: NEW this week | CONTINUATION from prior weeks | ESCALATION of a prior issue | RESOLUTION of a prior issue

Draw on your training knowledge to provide context that goes BEYOND what's in the articles. Name specific laws, cite regulatory precedents, identify patterns. Do not hedge — make specific predictions and recommendations.

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

ENFORCEMENT HISTORY FOR SUBSCRIBER'S JURISDICTIONS (last 12 months):
${enforcementHistory.substring(0, 3000)}

Generate a STANDALONE personalized brief as a JSON object with these exact keys:

{
  "your_critical_alert": "A single sentence — the most important thing this subscriber must know this week, specific to their industry and jurisdiction. Must follow this pattern: '[Specific role or organization type] must/should [specific action] by/before [timeframe or trigger] because [the specific development from this week that creates the obligation or risk].' Examples: 'Healthcare processors using the standard SCC Module 2 for EU-US patient data transfers must review Clause 8.2(b) against the EDPB's new pseudonymization standard before your next DPA audit, given this week's Opinion 05/2026.' If no immediate critical alert exists this week for this user's profile, write: 'Monitor week — no immediate compliance action required for ${industryList} operators in ${jurisdictionList} based on this week's developments.'",

  "opening_headline": "A punchy, specific headline naming the subscriber's industry and the #1 development this week. Max 15 words.",

  "your_week": "2-3 paragraphs opening with 'For [industry] professionals operating in [jurisdictions]...' Synthesize the most important developments. Name specific laws, regulators, deadlines. ~250 words.",

  "industry_intelligence": "3-4 paragraphs of deep industry-specific analysis. What do these developments mean specifically for ${industryList}? Name specific compliance obligations, risks, or opportunities. Reference enforcement precedents from the history data. Draw on your training knowledge. ~300 words.",

  "jurisdiction_developments": "2-3 paragraphs on developments in ${jurisdictionList}. Extract, amplify, and add context beyond what's in the standard brief. What's the regulatory trajectory? ~200 words.",

  "topic_depth": "2-3 paragraphs on ${topicList}. What happened this week? What patterns are emerging? What should they prepare for? ~200 words.",

  "what_to_ignore": "1 paragraph identifying 2-3 stories from this week that are getting attention but are NOT relevant to this subscriber's profile. Explain why they can safely deprioritize these. ~100 words.",

  "your_action_items": [
    {
      "action": "Specific action to take",
      "priority": "Immediate | This quarter | Monitor",
      "why_now": "Why this is time-sensitive, citing specific law/deadline/enforcement pattern"
    }
  ],

  "enforcement_pattern_for_you": "2 paragraphs analyzing enforcement patterns specifically relevant to ${industryList} in ${jurisdictionList}. Use the enforcement history data. What types of violations are being targeted? What fine ranges? Which regulators are most active? ~200 words.",

  "look_ahead": "2 paragraphs with specific predictions for the next 30-90 days. Name specific dates, regulatory milestones, compliance deadlines. Do not hedge — make concrete predictions. ~150 words."
}

CITATION REQUIREMENT: Throughout every narrative section (your_week, industry_intelligence, jurisdiction_developments, topic_depth, enforcement_pattern_for_you, look_ahead), you MUST cite sources inline using [ref:N] notation immediately after each specific factual claim, where N is the article index number from the TOP RELEVANCE-SCORED ARTICLES list above. Example: 'The ICO fined TikTok £12.7M [ref:3] for children\u2019s data violations.' Every paragraph must contain at least one [ref:N] citation.

Return ONLY the JSON object. 3-5 action items. No preamble.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!response.ok) {
        console.error(`Sonnet API error for user ${user.id}: ${response.status}`);
        continue;
      }
      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const customSections = JSON.parse(jsonMatch[0]);

      // Verification pass with Haiku — check action items are specific
      let verificationResult: any = null;
      try {
        const verifyResp = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 500,
            messages: [{
              role: "user",
              content: `Review these action items for a ${industryList} compliance professional. Are they specific enough (naming laws, deadlines, consequences)? Rate each 1-5 for specificity. Return JSON: {"scores": [{"action": "...", "specificity": 4}], "overall": 4, "pass": true}

Action items: ${JSON.stringify(customSections.your_action_items || [])}`,
            }],
          }),
          signal: AbortSignal.timeout(15000),
        });
        if (verifyResp.ok) {
          const vData = await verifyResp.json();
          const vText = vData.content?.[0]?.text || "";
          const vMatch = vText.match(/\{[\s\S]*\}/);
          if (vMatch) verificationResult = JSON.parse(vMatch[0]);
        }
      } catch (e) {
        console.error(`Verification failed for user ${user.id}:`, e);
      }

      await supabase.from("custom_briefs").insert({
        user_id: user.id,
        base_brief_id: latestBrief.id,
        week_label: latestBrief.week_label,
        custom_sections: customSections,
        preferences_snapshot: prefs,
        generated_at: new Date().toISOString(),
        articles_used: topArticles.length,
        generation_model: "claude-sonnet-4-20250514",
        verification_result: verificationResult,
      });
      processed++;
    } catch (e) {
      console.error(`Custom brief failed for user ${user.id}:`, e);
    }
  }

  return new Response(JSON.stringify({ success: true, processed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
