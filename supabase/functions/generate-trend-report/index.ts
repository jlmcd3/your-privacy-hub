import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN")!;

Deno.serve(async (req) => {
  // Auth
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.includes(ADMIN_TOKEN)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Fetch last 50 articles with their ai_summary
  const { data: articles, error } = await supabase
    .from("updates")
    .select("id, title, summary, category, published_at, ai_summary")
    .order("published_at", { ascending: false })
    .limit(50);

  if (error || !articles?.length) {
    return new Response(JSON.stringify({ error: error?.message ?? "No articles" }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  // Build article digest for Claude
  const digest = articles.map((a: any) => ({
    title: a.title,
    category: a.category,
    date: a.published_at?.split("T")[0],
    why_it_matters: a.ai_summary?.why_it_matters ?? a.summary ?? "",
    urgency: a.ai_summary?.urgency ?? null,
    risk_level: a.ai_summary?.risk_level ?? null,
    jurisdictions: a.ai_summary?.cross_jurisdiction_signal ?? null,
  }));

  const prompt = `You are a senior privacy regulatory analyst.
Given the following ${articles.length} recent privacy regulatory developments,
generate a structured intelligence synthesis.

Return ONLY a JSON object (no markdown, no preamble) with this exact schema:
{
  "top_trends": [
    {
      "title": "2-6 word trend title",
      "summary": "1-2 sentence plain-English summary of what is happening",
      "evidence_count": <number of articles supporting this trend>,
      "jurisdictions": ["jurisdiction names"],
      "industries": ["affected industry names"]
    }
  ],
  "emerging_risks": [
    {
      "title": "Risk title",
      "summary": "What the risk is and why it matters for compliance teams",
      "risk_level": "Low|Medium|High|Critical",
      "affected_industries": ["industry names"]
    }
  ],
  "affected_industries": ["top 5 industries mentioned across all articles"],
  "jurisdictions": ["top 5 jurisdictions mentioned"],
  "regulatory_patterns": [
    {
      "pattern": "Pattern name",
      "description": "What pattern is emerging",
      "evidence": "1 sentence citing specific example"
    }
  ],
  "confidence_score": <0.0-1.0, how confident you are in this synthesis>
}

Generate 3 top_trends, 2-3 emerging_risks, 2-3 regulatory_patterns.
Be specific, actionable, and focused on compliance implications.

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
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const aiData = await aiRes.json();
  const rawText = aiData.content?.[0]?.text ?? "";

  let synthesis: any;
  try {
    synthesis = JSON.parse(rawText.replace(/^```json\n?|\n?```$/g, "").trim());
  } catch {
    return new Response(JSON.stringify({ error: "Claude parse error", raw: rawText }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  // Upsert into trend_reports
  const today = new Date().toISOString().split("T")[0];
  const { error: upsertError } = await supabase
    .from("trend_reports")
    .upsert({
      date: today,
      period: "daily",
      top_trends: synthesis.top_trends ?? [],
      emerging_risks: synthesis.emerging_risks ?? [],
      affected_industries: synthesis.affected_industries ?? [],
      jurisdictions: synthesis.jurisdictions ?? [],
      regulatory_patterns: synthesis.regulatory_patterns ?? [],
      confidence_score: synthesis.confidence_score ?? 0,
      article_count: articles.length,
      source_article_ids: articles.map((a: any) => a.id),
    }, { onConflict: "date,period" });

  if (upsertError) {
    return new Response(JSON.stringify({ error: upsertError.message }), {
      status: 500, headers: { "Content-Type": "application/json" }
    });
  }

  return new Response(
    JSON.stringify({ ok: true, date: today, article_count: articles.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
