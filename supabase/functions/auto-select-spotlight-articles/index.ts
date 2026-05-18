// Daily homepage spotlight selector.
// Picks the SINGLE highest-applicability recent article and writes it to
// slot 1 of homepage_spotlight for today. The homepage renders this one
// article at three tiers (anonymous / free / paid) so visitors see exactly
// the same story progressively unlocked.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Score: lower is better. Combines attention level + a small recency bonus.
const SEVERITY_SCORE: Record<string, number> = {
  "WATCH CLOSELY": 0,
  "MONITOR": 10,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const today = new Date().toISOString().split("T")[0];
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  // Pull recent, enriched, non-hidden articles. Require ai_summary so the
  // paid tier has something meaningful to render.
  const { data: articles, error } = await supabase
    .from("updates")
    .select("id, direct_jurisdictions, attention_level, published_at, category, ai_summary, why_it_matters_short")
    .gte("created_at", cutoff)
    .eq("is_hidden", false)
    .not("ai_summary", "is", null)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error || !articles || articles.length === 0) {
    return new Response(
      JSON.stringify({ error: error?.message ?? "No eligible articles found" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Score each article: severity is primary, recency (hours since published) is tiebreaker.
  const now = Date.now();
  const scored = articles.map((a) => {
    const sev = SEVERITY_SCORE[a.attention_level ?? ""] ?? 20;
    const publishedMs = a.published_at ? new Date(a.published_at).getTime() : now - 48 * 3600 * 1000;
    const hoursOld = Math.max(0, (now - publishedMs) / (3600 * 1000));
    // Recency adds up to ~5 points across 48h; severity gap (10) still dominates.
    const recencyPenalty = Math.min(5, hoursOld / 10);
    return { article: a, score: sev + recencyPenalty };
  });
  scored.sort((a, b) => a.score - b.score);

  const top = scored[0].article;

  // Clear any existing rows for today, then write a single slot-1 entry.
  const { error: deleteError } = await supabase
    .from("homepage_spotlight")
    .delete()
    .eq("spotlight_date", today);

  if (deleteError) {
    return new Response(
      JSON.stringify({ error: `clear failed: ${deleteError.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { error: insertError } = await supabase
    .from("homepage_spotlight")
    .insert([{ spotlight_date: today, slot: 1, update_id: top.id }]);

  if (insertError) {
    return new Response(
      JSON.stringify({ error: insertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      date: today,
      selected: {
        id: top.id,
        jurisdiction: top.jurisdiction,
        attention_level: top.attention_level,
        published_at: top.published_at,
        category: top.category,
      },
      considered: articles.length,
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
