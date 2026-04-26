import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Dual-mode auth
  const auth = req.headers.get("Authorization") ?? "";
  let authorized = ADMIN_TOKEN && auth.includes(ADMIN_TOKEN);
  if (!authorized) {
    const token = auth.replace("Bearer ", "");
    if (token === SUPABASE_ANON_KEY || token === SUPABASE_SERVICE_KEY) {
      authorized = true;
    } else {
      const tmpClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user } } = await tmpClient.auth.getUser(token);
      authorized = !!user;
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Parse topic_area from query params or body
  const url = new URL(req.url);
  let topicArea = url.searchParams.get("topic_area");
  const periodDays = parseInt(url.searchParams.get("period_days") ?? "90", 10);

  if (!topicArea && req.method === "POST") {
    try {
      const body = await req.json();
      topicArea = body.topic_area ?? null;
    } catch { /* ignore */ }
  }

  if (!topicArea) {
    return new Response(
      JSON.stringify({ error: "topic_area parameter is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Calculate date window
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const startStr = periodStart.toISOString().split("T")[0];
  const endStr = periodEnd.toISOString().split("T")[0];

  // Build search terms from topic_area
  const TOPIC_SEARCH_TERMS: Record<string, string[]> = {
    "children-privacy": ["children", "child", "COPPA", "kids", "minors", "age verification", "age assurance", "youth"],
    "biometric": ["biometric", "BIPA", "facial recognition", "fingerprint", "iris", "voice recognition"],
    "adtech": ["adtech", "advertising", "tracking", "cookies", "consent", "programmatic", "RTB", "targeted advertising"],
    "ai-governance": ["artificial intelligence", "AI", "algorithm", "automated decision", "machine learning", "AI Act"],
    "health-data": ["health", "HIPAA", "medical", "patient", "telehealth", "PHI", "health data"],
    "cross-border": ["cross-border", "transfer", "adequacy", "SCCs", "data localization", "Schrems"],
    "enforcement": ["fine", "penalty", "enforcement", "sanction", "violation", "settlement"],
  };

  const searchTerms = TOPIC_SEARCH_TERMS[topicArea] ?? [topicArea.replace(/-/g, " ")];

  // Fetch articles from the period that match the topic
  // Use title/summary text matching and enrichment fields
  const { data: articles, error } = await supabase
    .from("updates")
    .select("id, title, summary, category, published_at, ai_summary, regulatory_theory, affected_sectors, attention_level, related_development")
    .gte("published_at", periodStart.toISOString())
    .lte("published_at", periodEnd.toISOString())
    .order("published_at", { ascending: false })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Filter articles matching the topic
  const matchingArticles = (articles ?? []).filter((a: any) => {
    const text = `${a.title} ${a.summary ?? ""} ${a.regulatory_theory ?? ""} ${(a.affected_sectors ?? []).join(" ")} ${a.category}`.toLowerCase();
    return searchTerms.some((term) => text.includes(term.toLowerCase()));
  });

  if (matchingArticles.length < 3) {
    return new Response(
      JSON.stringify({
        ok: true,
        topic_area: topicArea,
        message: `Only ${matchingArticles.length} articles found for this topic in the last ${periodDays} days. Need at least 3 for synthesis.`,
        article_count: matchingArticles.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Build digest for Claude
  const digest = matchingArticles.slice(0, 50).map((a: any) => ({
    title: a.title,
    date: a.published_at?.split("T")[0],
    category: a.category,
    summary: a.ai_summary?.why_it_matters ?? a.summary ?? "",
    regulatory_theory: a.regulatory_theory ?? null,
    sectors: a.affected_sectors ?? null,
    attention: a.attention_level ?? null,
  }));

  const prompt = `You are a senior privacy regulatory analyst conducting a ${periodDays}-day longitudinal analysis of the topic "${topicArea.replace(/-/g, " ")}".

Given the following ${matchingArticles.length} articles from ${startStr} to ${endStr}, generate a structured longitudinal synthesis.

Return ONLY a JSON object (no markdown, no preamble) with this exact schema:
{
  "summary": "A 3-5 sentence plain-English narrative synthesis of what has happened in this topic area over the past ${periodDays} days. Report factually. Use hedging language like 'this may indicate' rather than asserting conclusions.",
  "key_observations": [
    "Specific factual observation 1",
    "Specific factual observation 2",
    "Specific factual observation 3"
  ],
  "jurisdictions_active": ["jurisdiction names with notable activity"],
  "sectors_affected": ["industry sectors most affected"],
  "direction": "Intensifying|Stable|Cooling|Mixed",
  "notable_shifts": "One sentence describing any notable shift in regulatory approach or enforcement intensity, or null if none detected"
}

Generate 4-6 key_observations. Each should be a specific, factual statement citing concrete developments.
Focus on patterns, trends, and trajectory — not individual article summaries.

Articles:\n${JSON.stringify(digest, null, 2)}`;

  // Call Claude
  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!aiRes.ok) {
    const errBody = await aiRes.text();
    console.error("Anthropic API error:", aiRes.status, errBody);
    return new Response(
      JSON.stringify({ error: "Anthropic API error", status: aiRes.status, body: errBody }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const aiData = await aiRes.json();
  const rawText = aiData.content?.[0]?.text ?? "";

  let synthesis: any;
  try {
    synthesis = JSON.parse(rawText.replace(/^```json\n?|\n?```$/g, "").trim());
  } catch {
    return new Response(
      JSON.stringify({ error: "Claude parse error", raw: rawText.slice(0, 500) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Insert into longitudinal_signals
  const { error: insertError } = await supabase
    .from("longitudinal_signals")
    .insert({
      topic_area: topicArea,
      period_days: periodDays,
      period_start: startStr,
      period_end: endStr,
      summary: synthesis.summary ?? null,
      key_observations: synthesis.key_observations ?? [],
      jurisdictions_active: synthesis.jurisdictions_active ?? [],
      sectors_affected: synthesis.sectors_affected ?? [],
      article_count: matchingArticles.length,
      source_article_ids: matchingArticles.slice(0, 50).map((a: any) => a.id),
    });

  if (insertError) {
    return new Response(
      JSON.stringify({ error: insertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      topic_area: topicArea,
      period_days: periodDays,
      article_count: matchingArticles.length,
      summary_preview: (synthesis.summary ?? "").slice(0, 200),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
