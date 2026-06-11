// Retrieval API for enforcement context. Used by tools (LIA/DPIA/Governance) to
// surface most relevant enforcement actions for a given processing activity.
// Caches responses keyed on the request signature for 24h.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Query {
  tool?: string;             // "LIA" | "DPIA" | "Governance" | etc.
  data_categories?: string[];
  jurisdictions?: string[];
  sector?: string;
  biometric?: boolean;
  breach?: boolean;
  limit?: number;
  articles?: string[];       // canonical provision keys e.g. ["gdpr:6"] — primary-query-only filter
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let q: Query = {};
  if (req.method === "POST") q = await req.json().catch(() => ({}));
  else {
    const u = new URL(req.url);
    q = {
      tool: u.searchParams.get("tool") ?? undefined,
      data_categories: u.searchParams.get("data_categories")?.split(",").filter(Boolean),
      jurisdictions: u.searchParams.get("jurisdictions")?.split(",").filter(Boolean),
      sector: u.searchParams.get("sector") ?? undefined,
      biometric: u.searchParams.get("biometric") === "true" ? true : undefined,
      breach: u.searchParams.get("breach") === "true" ? true : undefined,
      limit: u.searchParams.get("limit") ? parseInt(u.searchParams.get("limit")!) : undefined,
      articles: u.searchParams.get("articles")?.split(",").filter(Boolean),
    };
  }

  const limit = Math.min(q.limit ?? 8, 25);
  const cacheKey = await sha256(JSON.stringify({ ...q, limit }));

  // Check cache (2h TTL — short enough to recover from empty-result edge cases within a working session)
  const { data: cached } = await supabase
    .from("enforcement_context_cache")
    .select("response, created_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.created_at).getTime() < 7200000) {
    return new Response(JSON.stringify({ ...cached.response, cached: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let query = supabase
    .from("enforcement_actions")
    .select("id, regulator, jurisdiction, subject, sector, industry_sector, law, violation, key_compliance_failure, preventive_measures, decision_date, fine_eur_equivalent, fine_amount, source_url, precedent_significance, data_categories, violation_types, tool_relevance, breach_related, biometric_related")
    .gte("enrichment_version", 1)
    .not("source_database", "is", null)
    .order("precedent_significance", { ascending: false, nullsFirst: false })
    .order("decision_date", { ascending: false, nullsFirst: false })
    .limit(limit * 4); // overfetch then re-rank

  // tool_relevance is now a soft preference (scoring boost only), not a hard filter
  if (q.data_categories?.length) query = query.overlaps("data_categories", q.data_categories);
  if (q.jurisdictions?.length) {
    const jurisdictionAliases: Record<string, string[]> = {
      "United Kingdom": ["United Kingdom", "UK", "GB", "England", "Great Britain"],
      "UK": ["United Kingdom", "UK", "GB", "England", "Great Britain"],
      "GB": ["United Kingdom", "UK", "GB", "England", "Great Britain"],
      "United States": ["United States", "USA", "US", "United States of America"],
      "USA": ["United States", "USA", "US", "United States of America"],
      "US": ["United States", "USA", "US", "United States of America"],
      "Germany": ["Germany", "Deutschland", "DE"],
      "DE": ["Germany", "Deutschland", "DE"],
      "France": ["France", "FR"],
      "Ireland": ["Ireland", "IE"],
      "Netherlands": ["Netherlands", "The Netherlands", "NL"],
      "Italy": ["Italy", "IT"],
      "Spain": ["Spain", "ES"],
      "California": ["California", "US-CA"],
      "US-CA": ["California", "US-CA"],
    };
    const expanded = [...new Set(q.jurisdictions.flatMap((j) => jurisdictionAliases[j] ?? [j]))];
    query = query.in("jurisdiction", expanded);
  }
  if (q.sector) query = query.eq("industry_sector", q.sector);
  if (q.biometric) query = query.eq("biometric_related", true);
  if (q.breach) query = query.eq("breach_related", true);

  const { data: rows, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let finalRows = rows ?? [];

  // Fallback: if primary query returns nothing, re-run without jurisdiction filter
  if (finalRows.length === 0 && q.jurisdictions?.length) {
    let fallbackQuery = supabase
      .from("enforcement_actions")
      .select("id, regulator, jurisdiction, subject, sector, industry_sector, law, violation, key_compliance_failure, preventive_measures, decision_date, fine_eur_equivalent, fine_amount, source_url, precedent_significance, data_categories, violation_types, tool_relevance, breach_related, biometric_related")
      .gte("enrichment_version", 1)
      .not("source_database", "is", null)
      .order("precedent_significance", { ascending: false, nullsFirst: false })
      .limit(limit * 4);

    if (q.data_categories?.length) {
      fallbackQuery = fallbackQuery.overlaps("data_categories", q.data_categories);
    }
    if (q.biometric) fallbackQuery = fallbackQuery.eq("biometric_related", true);
    if (q.breach) fallbackQuery = fallbackQuery.eq("breach_related", true);

    const { data: fallbackRows } = await fallbackQuery;
    finalRows = fallbackRows ?? [];
  }

  // Score & re-rank
  const scored = finalRows.map((r) => {
    let score = (r.precedent_significance ?? 1) * 2;
    if (q.data_categories?.length && r.data_categories) {
      const overlap = r.data_categories.filter((c: string) => q.data_categories!.includes(c)).length;
      score += overlap * 3;
    }
    if (q.tool && r.tool_relevance?.includes(q.tool)) score += 4;
    if (q.sector && r.industry_sector === q.sector) score += 2;
    if (r.fine_eur_equivalent) score += Math.min(3, Math.log10(r.fine_eur_equivalent) - 4);
    return { row: r, score };
  }).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.row);

  const response = { count: scored.length, total_matched: finalRows.length, results: scored, cached: false };

  await supabase.from("enforcement_context_cache").upsert({
    cache_key: cacheKey,
    response,
    created_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify(response),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
