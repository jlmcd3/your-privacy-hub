// Retrieval API for enforcement context. Used by tools (LIA/DPIA/Governance) to
// surface most relevant enforcement actions for a given processing activity.
// Caches responses keyed on the request signature for 2h.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────────────────────────────────────────────────────────
// Regime → jurisdiction whitelist + law-name pattern. Used as defence-in-depth
// so an EU GDPR query can never return a US/CA/AU enforcement action.
// ─────────────────────────────────────────────────────────────────────────────
const EU_EEA_MEMBER_STATES = [
  // EU 27
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czech Republic", "Czechia",
  "Denmark", "Estonia", "Finland", "France", "Germany", "Deutschland", "Greece",
  "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta",
  "Netherlands", "The Netherlands", "Poland", "Portugal", "Romania", "Slovakia",
  "Slovenia", "Spain", "Sweden",
  // EEA additions
  "Norway", "Iceland", "Liechtenstein",
  // Supranational
  "EU", "EU (GDPR)", "European Union", "EEA", "EDPB",
  // ISO codes occasionally found in feeds
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
  "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","IS","LI",
];

const UK_VALUES = ["United Kingdom", "United Kingdom (UK GDPR)", "UK", "GB", "England", "Great Britain", "Scotland", "Wales", "Northern Ireland"];

const REGIME_CONFIG: Record<string, { jurisdictions: string[]; lawPatterns: string[] }> = {
  gdpr:    { jurisdictions: EU_EEA_MEMBER_STATES, lawPatterns: ["%gdpr%", "%general data protection%", "%2016/679%", "%lopdgdd%", "%codice privacy%", "%bdsg%", "%loi informatique%"] },
  uk_gdpr: { jurisdictions: UK_VALUES, lawPatterns: ["%uk gdpr%", "%data protection act 2018%", "%dpa 2018%", "%pecr%"] },
  ccpa:    { jurisdictions: ["California", "US-CA"], lawPatterns: ["%ccpa%", "%cpra%", "%california consumer privacy%"] },
};

interface Query {
  tool?: string;
  data_categories?: string[];
  jurisdictions?: string[];
  sector?: string;
  biometric?: boolean;
  breach?: boolean;
  limit?: number;
  articles?: string[];
  regime?: string;  // "gdpr" | "uk_gdpr" | "ccpa" — preferred way to constrain by regulatory regime
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
      regime: u.searchParams.get("regime") ?? undefined,
    };
  }

  const limit = Math.min(q.limit ?? 8, 25);
  const cacheKey = await sha256(JSON.stringify({ ...q, limit, v: 2 }));

  const { data: cached } = await supabase
    .from("enforcement_context_cache")
    .select("response, created_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.created_at).getTime() < 7200000) {
    return new Response(JSON.stringify({ ...cached.response, cached: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // ── Resolve regime constraints (defence in depth) ─────────────────────────
  const regimeCfg = q.regime ? REGIME_CONFIG[q.regime] : undefined;
  // Effective jurisdiction whitelist: explicit > regime > none
  let jurisdictionWhitelist: string[] | undefined;
  if (q.jurisdictions?.length) {
    // Per-jurisdiction aliases (kept narrow; regime handles bulk expansion)
    const aliases: Record<string, string[]> = {
      "United Kingdom": UK_VALUES,
      "United Kingdom (UK GDPR)": UK_VALUES,
      "UK": UK_VALUES, "GB": UK_VALUES,
      "EU (GDPR)": EU_EEA_MEMBER_STATES,
      "European Union": EU_EEA_MEMBER_STATES,
      "EU": EU_EEA_MEMBER_STATES,
      "EEA": EU_EEA_MEMBER_STATES,
      "United States": ["United States", "USA", "US", "United States of America"],
      "US": ["United States", "USA", "US", "United States of America"],
      "Germany": ["Germany", "Deutschland", "DE"],
      "Czech Republic": ["Czech Republic", "Czechia", "CZ"],
      "Netherlands": ["Netherlands", "The Netherlands", "NL"],
      "California": ["California", "US-CA"],
    };
    jurisdictionWhitelist = [...new Set(q.jurisdictions.flatMap((j) => aliases[j] ?? [j]))];
  } else if (regimeCfg) {
    jurisdictionWhitelist = regimeCfg.jurisdictions;
  }

  let query = supabase
    .from("enforcement_actions")
    .select("id, regulator, jurisdiction, subject, sector, industry_sector, law, violation, key_compliance_failure, preventive_measures, decision_date, fine_eur_equivalent, fine_amount, source_url, precedent_significance, data_categories, violation_types, tool_relevance, breach_related, biometric_related, statutory_provisions, provisions_normalized")
    .gte("enrichment_version", 1)
    .not("source_database", "is", null)
    .order("precedent_significance", { ascending: false, nullsFirst: false })
    .order("decision_date", { ascending: false, nullsFirst: false })
    .limit(limit * 4);

  if (q.data_categories?.length) query = query.overlaps("data_categories", q.data_categories);
  if (q.articles?.length) query = query.overlaps("provisions_normalized", q.articles);
  if (jurisdictionWhitelist) query = query.in("jurisdiction", jurisdictionWhitelist);
  // Regime law filter as defence-in-depth (OR across patterns)
  if (regimeCfg?.lawPatterns?.length) {
    const orExpr = regimeCfg.lawPatterns.map((p) => `law.ilike.${p}`).join(",");
    query = query.or(orExpr);
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
  let fallbackUsed: string | null = null;

  // Controlled fallback: if primary returned nothing AND we had narrow content
  // filters (articles/data_categories), re-run WITHOUT those but KEEP the
  // jurisdiction/regime gate. We will never widen jurisdiction/regime silently.
  if (finalRows.length === 0 && (q.articles?.length || q.data_categories?.length)) {
    let fb = supabase
      .from("enforcement_actions")
      .select("id, regulator, jurisdiction, subject, sector, industry_sector, law, violation, key_compliance_failure, preventive_measures, decision_date, fine_eur_equivalent, fine_amount, source_url, precedent_significance, data_categories, violation_types, tool_relevance, breach_related, biometric_related, statutory_provisions, provisions_normalized")
      .gte("enrichment_version", 1)
      .not("source_database", "is", null)
      .order("precedent_significance", { ascending: false, nullsFirst: false })
      .limit(limit * 4);
    if (jurisdictionWhitelist) fb = fb.in("jurisdiction", jurisdictionWhitelist);
    if (regimeCfg?.lawPatterns?.length) {
      fb = fb.or(regimeCfg.lawPatterns.map((p) => `law.ilike.${p}`).join(","));
    }
    if (q.biometric) fb = fb.eq("biometric_related", true);
    if (q.breach) fb = fb.eq("breach_related", true);
    const { data: fbRows } = await fb;
    finalRows = fbRows ?? [];
    if (finalRows.length > 0) fallbackUsed = "dropped_content_filters_kept_jurisdiction";
  }

  const scored = finalRows.map((r) => {
    let score = (r.precedent_significance ?? 1) * 2;
    if (q.data_categories?.length && r.data_categories) {
      const overlap = r.data_categories.filter((c: string) => q.data_categories!.includes(c)).length;
      score += overlap * 3;
    }
    if (q.articles?.length && r.provisions_normalized?.length) {
      const provOverlap = r.provisions_normalized.some((p: string) => q.articles!.includes(p));
      if (provOverlap) score += 3;
    }
    if (q.tool && r.tool_relevance?.includes(q.tool)) score += 4;
    if (q.sector && r.industry_sector === q.sector) score += 2;
    if (r.fine_eur_equivalent) score += Math.min(3, Math.log10(r.fine_eur_equivalent) - 4);
    return { row: r, score };
  }).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.row);

  const note = scored.length === 0
    ? (jurisdictionWhitelist || regimeCfg ? "no_jurisdictional_precedent" : "no_match")
    : (fallbackUsed ?? null);

  const response = {
    count: scored.length,
    total_matched: finalRows.length,
    results: scored,
    regime: q.regime ?? null,
    jurisdiction_whitelist_size: jurisdictionWhitelist?.length ?? null,
    note,
    cached: false,
  };

  await supabase.from("enforcement_context_cache").upsert({
    cache_key: cacheKey,
    response,
    created_at: new Date().toISOString(),
  });

  return new Response(JSON.stringify(response),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
