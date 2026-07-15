// admin-traffic-aggregate — MC-S3
// Admin-only aggregator over public.user_events. Returns ONLY aggregates;
// never raw rows, never per-user trails. No IP-derived data beyond the
// existing country/region already stored on user_events.
//
// Fixed baseline window: `data_since` (default 2026-07-12). Also computes
// rolling 24h/7d/30d for the pages panel.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_SINCE = "2026-07-12T00:00:00Z";
// Funnel stage order — page_view is context only, kept first for reference.
// Config-extensible: appending an event_type here will surface it in the
// funnel automatically once the aggregator sees it in Phase 0 output.
const FUNNEL_STAGES = [
  "page_view",
  "sample_report_view",
  "sample_opened",
  "subscribe_cta_click",
  "tool_start_click",
  "tool_started",
  "signup_initiated",
  "checkout_started",
];

type Row = {
  event_type: string;
  event_data: Record<string, unknown> | null;
  page_path: string | null;
  session_id: string | null;
  country: string | null;
  region: string | null;
  created_at: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const caller = await verifyCaller(req, "admin");
  if (!caller.ok) {
    return new Response(JSON.stringify({ error: caller.error }), {
      status: caller.status ?? 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { since?: string } = {};
  try {
    if (req.method === "POST") body = await req.json();
  } catch { /* empty body ok */ }
  const since = typeof body.since === "string" && body.since
    ? body.since
    : DEFAULT_SINCE;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Pull the aggregation set in batches. Aggregates only ever leave this
  // function; the raw array stays server-side.
  const rows: Row[] = [];
  const batch = 1000;
  let offset = 0;
  // Hard cap to avoid runaway; log-only for now.
  const HARD_CAP = 50_000;
  while (rows.length < HARD_CAP) {
    const { data, error } = await supabase
      .from("user_events")
      .select("event_type,event_data,page_path,session_id,country,region,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(offset, offset + batch - 1);
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const chunk = (data ?? []) as Row[];
    rows.push(...chunk);
    if (chunk.length < batch) break;
    offset += batch;
  }

  const now = Date.now();
  const d24 = now - 24 * 3600 * 1000;
  const d7 = now - 7 * 24 * 3600 * 1000;
  const d30 = now - 30 * 24 * 3600 * 1000;

  // ---- distinct event types ----
  const eventTypeCounts = new Map<string, number>();
  for (const r of rows) {
    eventTypeCounts.set(r.event_type, (eventTypeCounts.get(r.event_type) ?? 0) + 1);
  }
  const event_types = Array.from(eventTypeCounts.entries())
    .map(([event_type, count]) => ({ event_type, count }))
    .sort((a, b) => b.count - a.count);

  // ---- US vs EU geography (from event_data.geography) ----
  const geoBuckets: Record<"us" | "eu", { sessions: Set<string>; tool_started: number; checkout_started: number; sample_opened: number }>
    = {
      us: { sessions: new Set(), tool_started: 0, checkout_started: 0, sample_opened: 0 },
      eu: { sessions: new Set(), tool_started: 0, checkout_started: 0, sample_opened: 0 },
    };
  for (const r of rows) {
    const g = (r.event_data as { geography?: unknown } | null)?.geography;
    if (g !== "us" && g !== "eu") continue;
    const b = geoBuckets[g];
    if (r.session_id) b.sessions.add(r.session_id);
    if (r.event_type === "tool_started") b.tool_started++;
    if (r.event_type === "checkout_started") b.checkout_started++;
    if (r.event_type === "sample_opened") b.sample_opened++;
  }
  const us_vs_eu = {
    us: {
      sessions: geoBuckets.us.sessions.size,
      tool_started: geoBuckets.us.tool_started,
      checkout_started: geoBuckets.us.checkout_started,
      sample_opened: geoBuckets.us.sample_opened,
    },
    eu: {
      sessions: geoBuckets.eu.sessions.size,
      tool_started: geoBuckets.eu.tool_started,
      checkout_started: geoBuckets.eu.checkout_started,
      sample_opened: geoBuckets.eu.sample_opened,
    },
  };

  // ---- pages: views + uniques per page_path, 24h/7d/30d ----
  type PageAgg = {
    views_24h: number; views_7d: number; views_30d: number;
    u24: Set<string>; u7: Set<string>; u30: Set<string>;
  };
  const pagesMap = new Map<string, PageAgg>();
  for (const r of rows) {
    if (r.event_type !== "page_view" || !r.page_path) continue;
    const t = Date.parse(r.created_at);
    let agg = pagesMap.get(r.page_path);
    if (!agg) {
      agg = { views_24h: 0, views_7d: 0, views_30d: 0, u24: new Set(), u7: new Set(), u30: new Set() };
      pagesMap.set(r.page_path, agg);
    }
    if (t >= d30) { agg.views_30d++; if (r.session_id) agg.u30.add(r.session_id); }
    if (t >= d7)  { agg.views_7d++;  if (r.session_id) agg.u7.add(r.session_id); }
    if (t >= d24) { agg.views_24h++; if (r.session_id) agg.u24.add(r.session_id); }
  }
  const pages = Array.from(pagesMap.entries()).map(([page_path, a]) => ({
    page_path,
    views_24h: a.views_24h,
    views_7d: a.views_7d,
    views_30d: a.views_30d,
    uniques_24h: a.u24.size,
    uniques_7d: a.u7.size,
    uniques_30d: a.u30.size,
  })).sort((a, b) => b.views_7d - a.views_7d);

  // ---- geography (country/region) ----
  const countryMap = new Map<string, { count: number; sessions: Set<string>; regions: Map<string, number> }>();
  for (const r of rows) {
    if (!r.country) continue;
    let c = countryMap.get(r.country);
    if (!c) {
      c = { count: 0, sessions: new Set(), regions: new Map() };
      countryMap.set(r.country, c);
    }
    c.count++;
    if (r.session_id) c.sessions.add(r.session_id);
    if (r.region) c.regions.set(r.region, (c.regions.get(r.region) ?? 0) + 1);
  }
  const geography = Array.from(countryMap.entries()).map(([country, v]) => ({
    country,
    events: v.count,
    sessions: v.sessions.size,
    regions: Array.from(v.regions.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count),
  })).sort((a, b) => b.events - a.events);

  // ---- funnel: sessions that hit each stage at least once ----
  const sessionsByStage = new Map<string, Set<string>>();
  const countsByStage = new Map<string, number>();
  for (const stage of FUNNEL_STAGES) sessionsByStage.set(stage, new Set());
  // Also observe any event_type in-window that isn't in FUNNEL_STAGES → append.
  const observedStages = new Set<string>(FUNNEL_STAGES);
  for (const r of rows) {
    if (!observedStages.has(r.event_type)) continue; // config-extensible: unknowns skipped
    countsByStage.set(r.event_type, (countsByStage.get(r.event_type) ?? 0) + 1);
    if (r.session_id) sessionsByStage.get(r.event_type)!.add(r.session_id);
  }
  const funnel = FUNNEL_STAGES.filter((s) => (countsByStage.get(s) ?? 0) > 0 || s === "page_view").map((stage, i, arr) => {
    const sessions = sessionsByStage.get(stage)!.size;
    const prev = i > 0 ? sessionsByStage.get(arr[i - 1])!.size : sessions;
    const conversion_pct = i === 0 || prev === 0 ? null : Math.round((sessions / prev) * 1000) / 10;
    return {
      event_type: stage,
      count: countsByStage.get(stage) ?? 0,
      sessions,
      conversion_from_prev_pct: conversion_pct,
      context_only: stage === "page_view",
    };
  });

  // ---- campaigns: UTM split ----
  type CampaignAgg = {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    sessions: Set<string>;
    events: number;
    pages: Map<string, number>;
  };
  const campaignMap = new Map<string, CampaignAgg>();
  for (const r of rows) {
    const d = (r.event_data ?? {}) as Record<string, unknown>;
    const source = (d.utm_source as string) || null;
    const medium = (d.utm_medium as string) || null;
    const campaign = (d.utm_campaign as string) || null;
    if (!source && !medium && !campaign) continue;
    const key = `${source ?? ""}|${medium ?? ""}|${campaign ?? ""}`;
    let agg = campaignMap.get(key);
    if (!agg) {
      agg = { utm_source: source, utm_medium: medium, utm_campaign: campaign, sessions: new Set(), events: 0, pages: new Map() };
      campaignMap.set(key, agg);
    }
    agg.events++;
    if (r.session_id) agg.sessions.add(r.session_id);
    if (r.page_path) agg.pages.set(r.page_path, (agg.pages.get(r.page_path) ?? 0) + 1);
  }
  const campaigns = Array.from(campaignMap.values()).map((a) => ({
    utm_source: a.utm_source,
    utm_medium: a.utm_medium,
    utm_campaign: a.utm_campaign,
    sessions: a.sessions.size,
    events: a.events,
    top_pages: Array.from(a.pages.entries())
      .map(([page_path, count]) => ({ page_path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
  })).sort((a, b) => b.sessions - a.sessions);

  const totalSessions = new Set(rows.map((r) => r.session_id).filter(Boolean)).size;

  return new Response(JSON.stringify({
    data_since: since,
    generated_at: new Date().toISOString(),
    total_rows: rows.length,
    total_sessions: totalSessions,
    event_types,
    us_vs_eu,
    pages,
    geography,
    funnel,
    funnel_stages: FUNNEL_STAGES,
    campaigns,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
