// Weekly v1 staleness check for Research guides.
// Counts high-attention `updates` rows per guide since the page's lastUpdated
// date and upserts results into research_freshness_flags.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Update lastUpdated here whenever a page's editorial content is revised.
const REGISTRY: { slug: string; feedCategory: string; lastUpdated: string }[] = [
  { slug: "gdpr-enforcement",       feedCategory: "eu-uk",           lastUpdated: "2026-06-10" },
  { slug: "global-privacy-laws",    feedCategory: "global",          lastUpdated: "2026-06-10" },
  { slug: "ai-privacy-regulations", feedCategory: "ai-privacy",      lastUpdated: "2026-06-10" },
  { slug: "cross-border-transfers", feedCategory: "cross-border",    lastUpdated: "2026-06-10" },
  { slug: "biometric-privacy",      feedCategory: "biometric",       lastUpdated: "2026-06-10" },
  { slug: "health-data-privacy",    feedCategory: "health-data",     lastUpdated: "2026-06-10" },
  { slug: "cookie-consent",         feedCategory: "adtech-consent",  lastUpdated: "2026-06-10" },
  { slug: "breach-notification",    feedCategory: "data-breach",     lastUpdated: "2026-06-10" },
];

// updates.attention_level — restrict to higher-severity tiers.
const HIGH_ATTENTION = ["critical", "high", "must-know", "action-required"];
const FLAG_THRESHOLD = 8;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const checkedAt = new Date().toISOString();
  const results: any[] = [];
  const errors: any[] = [];

  for (const entry of REGISTRY) {
    try {
      const sinceIso = new Date(`${entry.lastUpdated}T00:00:00Z`).toISOString();

      // Count high-attention articles since page last-updated.
      const { count, error: countErr } = await supabase
        .from("updates")
        .select("id", { count: "exact", head: true })
        .eq("category", entry.feedCategory)
        .in("attention_level", HIGH_ATTENTION)
        .gt("published_at", sinceIso);

      if (countErr) throw countErr;

      // Top 3 most recent matching headlines.
      const { data: recent, error: recentErr } = await supabase
        .from("updates")
        .select("title, url, published_at")
        .eq("category", entry.feedCategory)
        .in("attention_level", HIGH_ATTENTION)
        .gt("published_at", sinceIso)
        .order("published_at", { ascending: false })
        .limit(3);

      if (recentErr) throw recentErr;

      const newCount = count ?? 0;
      const topHeadlines = (recent || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        published_at: r.published_at,
      }));

      const { error: upsertErr } = await supabase
        .from("research_freshness_flags")
        .upsert(
          {
            page_slug: entry.slug,
            feed_category: entry.feedCategory,
            page_last_updated: entry.lastUpdated,
            new_articles_count: newCount,
            top_headlines: topHeadlines,
            flagged: newCount >= FLAG_THRESHOLD,
            checked_at: checkedAt,
          },
          { onConflict: "page_slug" },
        );

      if (upsertErr) throw upsertErr;

      results.push({
        slug: entry.slug,
        new_articles_count: newCount,
        flagged: newCount >= FLAG_THRESHOLD,
      });
    } catch (e: any) {
      console.error(`[check-research-freshness] ${entry.slug} failed:`, e?.message || e);
      errors.push({ slug: entry.slug, error: e?.message || String(e) });
    }
  }

  return new Response(
    JSON.stringify({
      ok: errors.length === 0,
      checked_at: checkedAt,
      results,
      errors,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
