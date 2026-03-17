import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "No API key" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

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

  // Get all Pro subscribers with preferences
  const { data: proUsers } = await supabase
    .from("profiles")
    .select("id")
    .eq("is_pro", true);

  if (!proUsers || proUsers.length === 0) {
    return new Response(JSON.stringify({ success: true, processed: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let processed = 0;

  for (const user of proUsers) {
    const { data: prefs } = await supabase
      .from("user_brief_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!prefs) continue;

    const industryList = (prefs.industries || []).join(", ") || "General (no specific industry set)";
    const jurisdictionList = (prefs.jurisdictions || []).join(", ") || "All jurisdictions";
    const topicList = (prefs.topics || []).join(", ") || "All topics";

    const briefContent = `
Executive Summary: ${latestBrief.executive_summary || ""}
US Federal: ${latestBrief.us_federal || ""}
US States: ${latestBrief.us_states || ""}
EU & UK: ${latestBrief.eu_uk || ""}
Global: ${latestBrief.global_developments || ""}
AI Governance: ${latestBrief.ai_governance || ""}
Biometric: ${latestBrief.biometric_data || ""}
Litigation: ${latestBrief.privacy_litigation || ""}
Enforcement Trends: ${latestBrief.enforcement_trends || ""}
Why This Matters: ${latestBrief.why_this_matters || ""}
    `.trim();

    const customPrompt = `You are a privacy regulatory analyst creating a personalized brief addendum for a specific subscriber.

SUBSCRIBER PROFILE:
- Industry focus: ${industryList}
- Priority jurisdictions: ${jurisdictionList}  
- Subject-matter focus: ${topicList}

FULL WEEKLY BRIEF CONTENT:
${briefContent.substring(0, 6000)}

Create a personalized "Your Custom Focus" addendum with EXACTLY these three sections as a JSON object:

{
  "industry_focus": "2-3 paragraphs specifically analyzing this week's developments through the lens of the subscriber's industry (${industryList}). Name specific compliance obligations, risks, or opportunities relevant to this sector from this week's brief. Be concrete — name specific laws, regulators, deadlines. If no industry-specific developments this week, say so and provide the most relevant adjacent development. ~200 words.",
  
  "jurisdiction_focus": "2 paragraphs highlighting developments in the subscriber's priority jurisdictions (${jurisdictionList}). Extract and amplify the most important items from those regions in this week's brief. Add any jurisdiction-specific context not covered in the main brief. ~150 words.",
  
  "topic_focus": "2 paragraphs on the subscriber's subject-matter priorities (${topicList}). What happened this week in these topic areas? What should they be watching in the next 30 days specifically in these areas? ~150 words."
}

Return ONLY the JSON object. No preamble.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          messages: [{ role: "user", content: customPrompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) continue;
      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;
      const customSections = JSON.parse(jsonMatch[0]);

      await supabase.from("custom_briefs").insert({
        user_id: user.id,
        base_brief_id: latestBrief.id,
        week_label: latestBrief.week_label,
        custom_sections: customSections,
        preferences_snapshot: prefs,
        generated_at: new Date().toISOString(),
      });
      processed++;
    } catch (e) {
      console.error(`Custom brief failed for user ${user.id}:`, e);
    }
  }

  return new Response(JSON.stringify({ success: true, processed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
