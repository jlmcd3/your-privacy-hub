import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });

  const thirtyOneDaysAgo = new Date(Date.now() - 31 * 86400000).toISOString();

  const { data: recentEntries } = await supabase
    .from("li_tracker_entries")
    .select("*")
    .or(`created_at.gte.${thirtyOneDaysAgo},updated_at.gte.${thirtyOneDaysAgo}`);

  if (!recentEntries || recentEntries.length < 3) {
    return new Response(JSON.stringify({ skipped: true, reason: "fewer than 3 new/updated rows" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), { status: 500 });

  const entriesSummary = recentEntries.map(e =>
    `${e.processing_activity} | ${e.outcome} | ${e.signal_type} | ${e.dpa_source} (${e.jurisdiction}) | ${e.summary}`
  ).join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You are a privacy regulatory analyst. Based on the following new or updated entries in a legitimate interest tracker for the past month, write a 2-3 sentence factual summary of observable trends or notable developments. Focus on patterns across jurisdictions or signal types. Do not editorialize. Do not use the phrases 'AI-generated' or 'AI-synthesized'. Return only the summary text, no formatting.\n\n${entriesSummary}`,
      }],
    }),
  });

  if (!res.ok) return new Response(JSON.stringify({ error: "Claude API error" }), { status: 500 });

  const data = await res.json();
  const summaryText = data.content?.[0]?.text?.trim();
  if (!summaryText) return new Response(JSON.stringify({ error: "Empty response" }), { status: 500 });

  const today = new Date();
  const periodStart = new Date(Date.now() - 31 * 86400000);

  await supabase.from("li_trend_summaries").insert({
    summary: summaryText,
    period_start: periodStart.toISOString().split("T")[0],
    period_end: today.toISOString().split("T")[0],
  });

  return new Response(JSON.stringify({ success: true, summary: summaryText }), {
    headers: { "Content-Type": "application/json" },
  });
});
