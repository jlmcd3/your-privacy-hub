// Retrieval API for enforcement context. Used by tools (LIA/DPIA/Governance) to
// surface most relevant enforcement actions for a given processing activity.
// Caches responses keyed on the request signature for 2h.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ITEM 354 — enforcement surface gate (one shared implementation, REUSE LAW).
import {
  applyGateQuery,
  filterSurfaceRows,
  gateAudit,
  GATE_COLUMNS,
} from "../_shared/enforcement/surface-gate.ts";

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

// Set membership helpers (case-insensitive on a normalised lower value)
const EU_SET = new Set(EU_EEA_MEMBER_STATES.map((v) => v.toLowerCase()));
const UK_SET = new Set(UK_VALUES.map((v) => v.toLowerCase()));

type AuthorityTier = 1 | 2 | 3 | null;
type TierLabel = "in_regime" | "cross_channel_persuasive" | "non_eu_uk_supportive" | null;

function resolveTier(
  regime: string | undefined,
  jurisdiction: string | null | undefined,
): { authority_tier: AuthorityTier; tier_label: TierLabel } {
  if (regime !== "gdpr" && regime !== "uk_gdpr") {
    return { authority_tier: null, tier_label: null };
  }
  const j = (jurisdiction || "").toLowerCase().trim();
  const inEu = EU_SET.has(j);
  const inUk = UK_SET.has(j);
  if (regime === "gdpr") {
    if (inEu) return { authority_tier: 1, tier_label: "in_regime" };
    if (inUk) return { authority_tier: 2, tier_label: "cross_channel_persuasive" };
    return { authority_tier: 3, tier_label: "non_eu_uk_supportive" };
  }
  // uk_gdpr
  if (inUk) return { authority_tier: 1, tier_label: "in_regime" };
  if (inEu) return { authority_tier: 2, tier_label: "cross_channel_persuasive" };
  return { authority_tier: 3, tier_label: "non_eu_uk_supportive" };
}

interface Query {
  tool?: string;
  data_categories?: string[];
  jurisdictions?: string[];
  sector?: string;
  biometric?: boolean;
  breach?: boolean;
  limit?: number;
  articles?: string[];
  regime?: string;  // "gdpr" | "uk_gdpr" | "ccpa"
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ENFORCEMENT_SELECT = "id, regulator, jurisdiction, subject, sector, industry_sector, law, violation, key_compliance_failure, preventive_measures, decision_date, fine_eur_equivalent, fine_amount, fine_verified, source_url, precedent_significance, data_categories, violation_types, tool_relevance, breach_related, biometric_related, statutory_provisions, provisions_normalized, enrichment_version, source_database, " + GATE_COLUMNS;

function applyCommonFilters(q: any, query: Query) {
  let out = q;
  if (query.sector) out = out.eq("industry_sector", query.sector);
  if (query.biometric) out = out.eq("biometric_related", true);
  if (query.breach) out = out.eq("breach_related", true);
  // ITEM 354: the enforcement surface gate replaces the former inline
  // SWEEP-2 T11 requires_review filter. Applies to every tier / fallback
  // query in this module. `preserved` profile keeps prior behaviour.
  out = applyGateQuery(out, query.tool);
  return out;
}

function applyContentFilters(q: any, query: Query) {
  let out = q;
  if (query.data_categories?.length) out = out.overlaps("data_categories", query.data_categories);
  if (query.articles?.length) out = out.overlaps("provisions_normalized", query.articles);
  return out;
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
  const cacheKey = await sha256(JSON.stringify({ ...q, limit, v: 4 }));

  const { data: cached } = await supabase
    .from("enforcement_context_cache")
    .select("response, created_at")
    .eq("cache_key", cacheKey)
    .maybeSingle();

  if (cached && Date.now() - new Date(cached.created_at).getTime() < 7200000) {
    return new Response(JSON.stringify({ ...cached.response, cached: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const isTiered = q.regime === "gdpr" || q.regime === "uk_gdpr";

  // For non-tiered regimes / no regime: keep prior behaviour unchanged.
  if (!isTiered) {
    return await runUntiered(q, limit, cacheKey);
  }

  // ── TIERED RETRIEVAL (GDPR / UK GDPR) ──────────────────────────────────────
  const regimeCfg = REGIME_CONFIG[q.regime!];
  const homeList = regimeCfg.jurisdictions;
  const otherList = q.regime === "gdpr" ? UK_VALUES : EU_EEA_MEMBER_STATES;
  const otherRegimeCfg = q.regime === "gdpr" ? REGIME_CONFIG.uk_gdpr : REGIME_CONFIG.gdpr;
  const lawOr = (cfg: { lawPatterns: string[] }) =>
    [...cfg.lawPatterns.map((p) => `law.ilike.${p}`), "law.is.null"].join(",");

  // ── TIER 1: in-regime, verified ──
  let t1q = supabase.from("enforcement_actions").select(ENFORCEMENT_SELECT)
    .gte("enrichment_version", 1).not("source_database", "is", null)
    .in("jurisdiction", homeList)
    .or(lawOr(regimeCfg))
    .order("precedent_significance", { ascending: false, nullsFirst: false })
    .order("decision_date", { ascending: false, nullsFirst: false })
    .limit(limit * 4);
  t1q = applyCommonFilters(applyContentFilters(t1q, q), q);
  const { data: t1Rows, error: t1Err } = await t1q;
  if (t1Err) {
    return new Response(JSON.stringify({ error: t1Err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  let tier1: any[] = (t1Rows ?? []).map((r: any) => ({ ...r, verified: true, ...resolveTier(q.regime, r.jurisdiction) }));
  let fallbackUsed: string | null = null;

  // Tier-1 content-filter fallback (kept from prompt A): drop content filters, keep jurisdiction/regime gate.
  if (tier1.length === 0 && (q.articles?.length || q.data_categories?.length)) {
    let fb = supabase.from("enforcement_actions").select(ENFORCEMENT_SELECT)
      .gte("enrichment_version", 1).not("source_database", "is", null)
      .in("jurisdiction", homeList)
      .or(lawOr(regimeCfg))
      .order("precedent_significance", { ascending: false, nullsFirst: false })
      .limit(limit * 4);
    fb = applyCommonFilters(fb, q);
    const { data: fbRows } = await fb;
    tier1 = (fbRows ?? []).map((r: any) => ({ ...r, verified: true, ...resolveTier(q.regime, r.jurisdiction) }));
    if (tier1.length > 0) fallbackUsed = "tier1_dropped_content_filters";
  }

  // Tier-1 unverified secondary pool (from prompt A) — only ever in tier 1.
  if (tier1.length < limit) {
    const need = (limit - tier1.length) * 2;
    let sec = supabase.from("enforcement_actions").select(ENFORCEMENT_SELECT)
      .or("enrichment_version.is.null,enrichment_version.lt.1,source_database.is.null")
      .in("jurisdiction", homeList)
      .or(lawOr(regimeCfg))
      .order("decision_date", { ascending: false, nullsFirst: false })
      .limit(need);
    sec = applyCommonFilters(sec, q);
    const { data: secRows } = await sec;
    const existing = new Set(tier1.map((r) => r.id));
    const unv = (secRows ?? []).filter((r: any) => !existing.has(r.id))
      .map((r: any) => ({ ...r, verified: false, ...resolveTier(q.regime, r.jurisdiction) }));
    if (unv.length) {
      tier1 = [...tier1, ...unv];
      fallbackUsed = fallbackUsed ? `${fallbackUsed}+tier1_unverified_pool` : "tier1_unverified_pool";
    }
  }

  // ── TIER 2: cross-channel persuasive (verified only, cap 2) ──
  // Only run if tier1 under-filled OR tier1 lacked any row overlapping requested data_categories.
  const t1HasDcOverlap = !q.data_categories?.length
    ? true
    : tier1.some((r) => Array.isArray(r.data_categories) && r.data_categories.some((c: string) => q.data_categories!.includes(c)));
  let tier2: any[] = [];
  if (tier1.length < limit || !t1HasDcOverlap) {
    let t2q = supabase.from("enforcement_actions").select(ENFORCEMENT_SELECT)
      .gte("enrichment_version", 1).not("source_database", "is", null)
      .in("jurisdiction", otherList)
      .or(lawOr(otherRegimeCfg))
      .order("precedent_significance", { ascending: false, nullsFirst: false })
      .order("decision_date", { ascending: false, nullsFirst: false })
      .limit(6);
    t2q = applyCommonFilters(applyContentFilters(t2q, q), q);
    const { data: t2Rows } = await t2q;
    tier2 = (t2Rows ?? []).slice(0, 2).map((r: any) => ({ ...r, verified: true, ...resolveTier(q.regime, r.jurisdiction) }));
  }

  // ── TIER 3: non-EU/UK supportive (verified only, cap 2, requires topical overlap) ──
  let tier3: any[] = [];
  const wantTier3 = (q.data_categories?.length ?? 0) > 0 || (q.articles?.length ?? 0) > 0;
  if (wantTier3) {
    const banned = [...new Set([...homeList, ...otherList].map((v) => v.toLowerCase()))];
    // Collect violation_types from tier1+tier2 results (for the article-mode overlap requirement).
    const knownVtypes = new Set<string>();
    for (const r of [...tier1, ...tier2]) {
      if (Array.isArray(r.violation_types)) for (const v of r.violation_types) knownVtypes.add(String(v));
    }

    let t3q = supabase.from("enforcement_actions").select(ENFORCEMENT_SELECT)
      .gte("enrichment_version", 1).not("source_database", "is", null)
      .order("precedent_significance", { ascending: false, nullsFirst: false })
      .order("decision_date", { ascending: false, nullsFirst: false })
      .limit(20);
    t3q = applyCommonFilters(t3q, q);
    // Topical overlap requirement: data_categories OR violation_types overlap.
    const overlapOr: string[] = [];
    if (q.data_categories?.length) {
      // PostgREST overlaps via or filter requires array literal; build "{a,b,c}"
      const arr = `{${q.data_categories.map((c) => `"${c.replace(/"/g, '\\"')}"`).join(",")}}`;
      overlapOr.push(`data_categories.ov.${arr}`);
    }
    if (q.articles?.length && knownVtypes.size > 0) {
      const arr = `{${Array.from(knownVtypes).slice(0, 20).map((c) => `"${c.replace(/"/g, '\\"')}"`).join(",")}}`;
      overlapOr.push(`violation_types.ov.${arr}`);
    }
    if (overlapOr.length === 0) {
      // Tier 3 must have a topical anchor; if none possible, skip.
      tier3 = [];
    } else {
      t3q = t3q.or(overlapOr.join(","));
      const { data: t3Rows } = await t3q;
      const blocked = new Set(banned);
      tier3 = (t3Rows ?? [])
        .filter((r: any) => !blocked.has(String(r.jurisdiction || "").toLowerCase()))
        .slice(0, 2)
        .map((r: any) => ({ ...r, verified: true, ...resolveTier(q.regime, r.jurisdiction) }));
    }
  }

  // ── Score & combine ──
  const scoreRow = (r: any) => {
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
    if (r.verified === false) score -= 100;
    if (r.authority_tier === 2) score -= 5;
    if (r.authority_tier === 3) score -= 10;
    return score;
  };

  const t1Sorted = tier1.map((r) => ({ row: r, score: scoreRow(r) }))
    .sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.row);
  const seen = new Set(t1Sorted.map((r) => r.id));
  const t2Sorted = tier2.filter((r) => !seen.has(r.id))
    .map((r) => ({ row: r, score: scoreRow(r) }))
    .sort((a, b) => b.score - a.score).slice(0, 2).map((x) => x.row);
  for (const r of t2Sorted) seen.add(r.id);
  const t3Sorted = tier3.filter((r) => !seen.has(r.id))
    .map((r) => ({ row: r, score: scoreRow(r) }))
    .sort((a, b) => b.score - a.score).slice(0, 2).map((x) => x.row);

  // Quality gate: drop rows without a subject/name or with precedent_significance < 2.
  // These are low-signal matches that produce "Unnamed action" or weak analogies.
  const qualityFilter = (r: any) =>
    typeof r?.subject === "string" && r.subject.trim().length > 0 &&
    (r?.precedent_significance ?? 0) >= 2;
  const results = filterSurfaceRows(
    [...t1Sorted, ...t2Sorted, ...t3Sorted].filter(qualityFilter),
    { product: q.tool },
  );
  const totalMatched = tier1.length + tier2.length + tier3.length;


  const note = results.length === 0
    ? "no_jurisdictional_precedent"
    : fallbackUsed;

  const response = {
    count: results.length,
    total_matched: totalMatched,
    results,
    regime: q.regime ?? null,
    jurisdiction_whitelist_size: homeList.length,
    tier_counts: { tier1: t1Sorted.length, tier2: t2Sorted.length, tier3: t3Sorted.length },
    surface_gate: gateAudit([...t1Sorted, ...t2Sorted, ...t3Sorted], { product: q.tool }),
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

// ─────────────────────────────────────────────────────────────────────────────
// Untiered path (regime missing or 'ccpa'/other): preserves prior behaviour.
// ─────────────────────────────────────────────────────────────────────────────
async function runUntiered(q: Query, limit: number, cacheKey: string): Promise<Response> {
  const regimeCfg = q.regime ? REGIME_CONFIG[q.regime] : undefined;
  let jurisdictionWhitelist: string[] | undefined;
  if (q.jurisdictions?.length) {
    const aliases: Record<string, string[]> = {
      "United Kingdom": UK_VALUES, "United Kingdom (UK GDPR)": UK_VALUES,
      "UK": UK_VALUES, "GB": UK_VALUES,
      "EU (GDPR)": EU_EEA_MEMBER_STATES, "European Union": EU_EEA_MEMBER_STATES,
      "EU": EU_EEA_MEMBER_STATES, "EEA": EU_EEA_MEMBER_STATES,
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

  let query = supabase.from("enforcement_actions").select(ENFORCEMENT_SELECT)
    .gte("enrichment_version", 1).not("source_database", "is", null)
    .order("precedent_significance", { ascending: false, nullsFirst: false })
    .order("decision_date", { ascending: false, nullsFirst: false })
    .limit(limit * 4);
  query = applyContentFilters(query, q);
  query = applyCommonFilters(query, q);
  if (jurisdictionWhitelist) query = query.in("jurisdiction", jurisdictionWhitelist);
  if (regimeCfg?.lawPatterns?.length) {
    const orExpr = [...regimeCfg.lawPatterns.map((p) => `law.ilike.${p}`), "law.is.null"].join(",");
    query = query.or(orExpr);
  }
  const { data: rows, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  let finalRows = (rows ?? []).map((r: any) => ({ ...r, verified: true, authority_tier: null, tier_label: null }));
  let fallbackUsed: string | null = null;
  if (finalRows.length === 0 && (q.articles?.length || q.data_categories?.length)) {
    let fb = supabase.from("enforcement_actions").select(ENFORCEMENT_SELECT)
      .gte("enrichment_version", 1).not("source_database", "is", null)
      .order("precedent_significance", { ascending: false, nullsFirst: false })
      .limit(limit * 4);
    fb = applyCommonFilters(fb, q);
    if (jurisdictionWhitelist) fb = fb.in("jurisdiction", jurisdictionWhitelist);
    if (regimeCfg?.lawPatterns?.length) {
      fb = fb.or([...regimeCfg.lawPatterns.map((p) => `law.ilike.${p}`), "law.is.null"].join(","));
    }
    const { data: fbRows } = await fb;
    finalRows = (fbRows ?? []).map((r: any) => ({ ...r, verified: true, authority_tier: null, tier_label: null }));
    if (finalRows.length > 0) fallbackUsed = "dropped_content_filters_kept_jurisdiction";
  }
  if (finalRows.length < limit) {
    const need = (limit - finalRows.length) * 2;
    let sec = supabase.from("enforcement_actions").select(ENFORCEMENT_SELECT)
      .or("enrichment_version.is.null,enrichment_version.lt.1,source_database.is.null")
      .order("decision_date", { ascending: false, nullsFirst: false })
      .limit(need);
    sec = applyCommonFilters(sec, q);
    if (jurisdictionWhitelist) sec = sec.in("jurisdiction", jurisdictionWhitelist);
    if (regimeCfg?.lawPatterns?.length) {
      sec = sec.or([...regimeCfg.lawPatterns.map((p) => `law.ilike.${p}`), "law.is.null"].join(","));
    }
    const { data: secRows } = await sec;
    const existingIds = new Set(finalRows.map((r: any) => r.id));
    const unverified = (secRows ?? []).filter((r: any) => !existingIds.has(r.id))
      .map((r: any) => ({ ...r, verified: false, authority_tier: null, tier_label: null }));
    if (unverified.length) {
      finalRows = [...finalRows, ...unverified];
      fallbackUsed = fallbackUsed ? `${fallbackUsed}+secondary_unverified_pool` : "secondary_unverified_pool";
    }
  }
  const scored = finalRows.map((r: any) => {
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
    if (r.verified === false) score -= 100;
    return { row: r, score };
  }).sort((a, b) => b.score - a.score).slice(0, limit).map((x) => x.row)
    .filter((r: any) =>
      typeof r?.subject === "string" && r.subject.trim().length > 0 &&
      (r?.precedent_significance ?? 0) >= 2);
  const gatedScored = filterSurfaceRows(scored, { product: q.tool });
  const note = gatedScored.length === 0
    ? (jurisdictionWhitelist || regimeCfg ? "no_jurisdictional_precedent" : "no_match")
    : fallbackUsed;
  const response = {
    count: gatedScored.length, total_matched: finalRows.length, results: gatedScored,
    surface_gate: gateAudit(scored, { product: q.tool }),
    regime: q.regime ?? null,
    jurisdiction_whitelist_size: jurisdictionWhitelist?.length ?? null,
    note, cached: false,
  };

  await supabase.from("enforcement_context_cache").upsert({
    cache_key: cacheKey, response, created_at: new Date().toISOString(),
  });
  return new Response(JSON.stringify(response),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
