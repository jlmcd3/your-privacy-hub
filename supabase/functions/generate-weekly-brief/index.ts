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
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return `${fmt(start)} – ${fmt(now)}`;
}

function getISOWeek(): string {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `Week ${week} · ${now.getFullYear()}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Pull last 7 days of articles from updates table ────────────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: articles, error: fetchError } = await supabase
      .from("updates")
      .select("title, summary, source_name, category, published_at, url")
      .gte("published_at", sevenDaysAgo.toISOString())
      .order("published_at", { ascending: false })
      .limit(25);

    if (fetchError || !articles || articles.length === 0) {
      return new Response(
        JSON.stringify({ error: "No articles found for this week", detail: fetchError }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Fetch previous week's brief for trend comparison ──────────────
    const { data: prevBrief } = await supabase
      .from("weekly_briefs")
      .select("headline, trend_signal, week_label")
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    const previousContext = prevBrief
      ? `PREVIOUS WEEK (${prevBrief.week_label}):\nHeadline: ${prevBrief.headline}\nTrend Signal: ${prevBrief.trend_signal || "N/A"}`
      : "No previous week data available.";

    // ── Format articles for the prompt ────────────────────────────────
    const articleList = articles
      .map(
        (a, i) =>
          `[${i + 1}] [${a.category?.toUpperCase()}] ${a.source_name} — ${a.title}${a.summary ? `\n    Summary: ${a.summary}` : ""}`
      )
      .join("\n\n");

    const weekLabel = getWeekLabel();
    const isoWeek = getISOWeek();

    // ── Call Lovable AI Gateway ───────────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are the lead analyst at a premium privacy regulatory intelligence platform used by DPOs, privacy lawyers, and compliance professionals at multinational companies. Your weekly brief is the most trusted synthesis of global privacy regulatory developments in the industry. Write with authoritative precision — no filler, no hedging, no generic statements. Every sentence must contain specific, actionable intelligence. Use the exact regulator names, regulation names, and jurisdictions from the source material. Format all output as valid JSON exactly matching the schema provided.`;

    const userPrompt = `PREVIOUS WEEK CONTEXT (use for trend comparison in trend_signal field):
${previousContext}

Here are all regulatory updates published this week (${weekLabel}):

${articleList}

STRICT RULES — violations will cause this brief to be rejected:
1. Every entry in enforcement_table MUST be sourced from a numbered article above. Add a source_ref field with the article number (e.g. '[3]').
2. Every fine amount must appear verbatim in the source articles. If the amount is not explicitly stated, write 'Not disclosed' — never estimate.
3. The trend_signal MUST compare this week's developments to the previous week context provided above.
4. If a regional section has no source articles, write exactly: 'No monitored developments in this category this week.'
5. Do not invent facts, names, amounts, or dates not present in the source articles.

Generate a complete Weekly Intelligence Brief as a JSON object with exactly these fields:

{
  "headline": "A single punchy 20-30 word headline capturing the most significant theme of the week — specific, not generic. Must name specific regulators or regulations.",
  "executive_summary": "3-4 paragraphs of authoritative executive synthesis. Cover: (1) the dominant regulatory theme of the week and why it matters, (2) the most significant enforcement or guidance action and its practical implications, (3) what compliance teams should be doing right now in response. Be specific — name regulators, cite exact guidance documents or actions. No generic statements. ~300 words.",
  "us_federal": "2-3 paragraphs covering all US federal developments this week — FTC, Congress, NIST, HHS, etc. If no federal developments, say 'No significant US federal developments this week' and explain what to watch for next week.",
  "us_states": "2-3 paragraphs covering all US state privacy developments — new laws, enforcement actions, agency guidance, AG actions. Call out the 3 highest-risk states for enforcement right now. If sparse, note what's on the horizon.",
  "eu_uk": "2-3 paragraphs covering GDPR, EDPB, UK ICO, individual DPAs (CNIL, DPC, etc.). Identify the most active enforcement authority this week and what it signals about their agenda.",
  "global_developments": "2-3 paragraphs on non-EU/non-US developments — APAC, LATAM, Middle East, Africa. Focus on developments with cross-border implications for multinationals.",
  "enforcement_table": [
    {
      "regulator": "Regulator name",
      "jurisdiction": "Country/State",
      "action_type": "Fine | Investigation | Guidance | Lawsuit | Rulemaking",
      "subject": "Who or what sector was targeted",
      "amount": "exact figure or Not disclosed",
      "legal_basis": "specific regulation and article/section if stated, else N/A",
      "significance": "One sentence on why this matters",
      "source_ref": "[article number]"
    }
  ],
  "trend_signal": "The single most important forward-looking signal from this week's data — what pattern is emerging, what regulators are telegraphing, what companies should prepare for in the next 30-90 days. 2 paragraphs. Be specific and predictive. Compare to previous week's trends.",
  "why_this_matters": "2 paragraphs written for a busy General Counsel or Chief Privacy Officer who has 2 minutes to read this. What are the top 3 things they need to act on this week? Bullet-point style, actionable."
}

Return ONLY the JSON object. No preamble, no explanation, no markdown code fences.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("AI gateway error:", status, err);
      return new Response(
        JSON.stringify({ error: "AI gateway error", detail: err }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.choices?.[0]?.message?.content || "";

    let brief: any;
    try {
      brief = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return new Response(
          JSON.stringify({ error: "Failed to parse AI response", raw: rawText.slice(0, 500) }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      brief = JSON.parse(jsonMatch[0]);
    }

    // ── Verification pass ─────────────────────────────────────────────
    const verifyPrompt = `You are a fact-checker for a regulatory intelligence publication. Review this generated Weekly Intelligence Brief against its source articles. Return ONLY valid JSON.

SOURCE ARTICLES:
${articleList}

GENERATED BRIEF ENFORCEMENT TABLE:
${JSON.stringify(brief.enforcement_table || [])}

Check each enforcement_table entry. For each entry, verify the fine amount and regulator name appear in the source articles. Return:
{"verified": true/false, "issues": ["list any unverified amounts or names"], "quality_score": 1-10, "fabricated_facts": ["any facts not in source articles"]}`;

    const verifyResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: verifyPrompt }],
      }),
    });

    let verificationReport = null;
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      const verifyText = verifyData.choices?.[0]?.message?.content || "";
      try {
        const verifyJson = verifyText.match(/\{[\s\S]*\}/);
        if (verifyJson) verificationReport = JSON.parse(verifyJson[0]);
      } catch { /* ignore verification parse errors */ }
    }

    // ── Store in database ──────────────────────────────────────────────
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
        enforcement_table: brief.enforcement_table,
        trend_signal: brief.trend_signal,
        why_this_matters: brief.why_this_matters,
        article_count: articles.length,
        published_at: new Date().toISOString(),
        verification_report: verificationReport,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: "Failed to store brief", detail: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: inserted.id, week: isoWeek, article_count: articles.length, verification: verificationReport }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-weekly-brief error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
