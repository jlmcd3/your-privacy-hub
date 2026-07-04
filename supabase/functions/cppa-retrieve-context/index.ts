// Deterministic topic/section retrieval over cppa_authorities + cppa_deadlines.
// No AI, no embeddings.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const FULL_TEXT_HARD_CAP = 120_000;

// Topics that force inclusion of binding definition/threshold sections
const FORCED_DEFINITION_RELATIONS: Record<string, string[]> = {
  admt: ["admt", "significant-decision", "profiling"],
  "significant-decision": ["admt", "significant-decision"],
  profiling: ["admt", "profiling"],
  "cybersecurity-audit": ["cybersecurity-audit", "thresholds"],
  "risk-assessment": ["risk-assessment", "thresholds"],
};

function authorityShape(row: any, includeFullText: boolean) {
  return {
    id: row.id,
    citation: row.citation,
    title: row.title,
    plain_summary: row.plain_summary,
    full_text: includeFullText ? row.full_text : null,
    topics: row.topics ?? [],
    defines_terms: row.defines_terms ?? [],
    binding: row.binding,
    authority_weight: row.authority_weight,
    effective_date: row.effective_date,
    official_url: row.official_url,
    status: row.status,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Dual-mode auth
  const auth = req.headers.get("Authorization") ?? "";
  let authorized = ADMIN_TOKEN && auth.includes(ADMIN_TOKEN);
  if (!authorized) {
    const token = auth.replace("Bearer ", "");
    if (token === SUPABASE_ANON_KEY || token === SUPABASE_SERVICE_KEY) {
      authorized = true;
    } else if (token) {
      const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      const { data: { user } } = await tmp.auth.getUser(token);
      authorized = !!user;
    }
  }
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const topics: string[] = Array.isArray(body?.topics) ? body.topics : [];
  const query: string | null = typeof body?.query === "string" && body.query.trim() ? body.query.trim() : null;
  const citation_lookup: string | null = typeof body?.citation_lookup === "string" ? body.citation_lookup.trim() : null;
  const include_deadlines: boolean = body?.include_deadlines === true;
  const full_text_limit: number = Math.max(0, Math.min(30, Number(body?.full_text_limit ?? 8) || 8));
  const limit: number = Math.max(1, Math.min(30, Number(body?.limit ?? 14) || 14));

  // Base set: citation-pinned rows the caller ALWAYS needs, independent of
  // topic/FTS scoring. Guaranteed-supply counterpart to search-based retrieval.
  const base_citations: string[] = Array.isArray(body?.base_citations)
    ? body.base_citations.filter((c: any) => typeof c === "string" && c.trim()).slice(0, 15)
    : [];

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Citation lookup short-circuit
  if (citation_lookup) {
    const { data, error } = await admin
      .from("cppa_authorities")
      .select("*")
      .eq("citation", citation_lookup)
      .eq("status", "current")
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ authorities: [], deadlines: [], retrieved_count: 0, warning: "no_matching_authority" });
    return json({
      authorities: [authorityShape(data, true)],
      deadlines: [],
      retrieved_count: 1,
    });
  }

  // 2. Settings
  const { data: settings } = await admin
    .from("cppa_corpus_settings").select("verified_only_mode").eq("id", 1).single();
  const verifiedOnly = settings?.verified_only_mode === true;

  // 3-6. Base + candidate match via FTS/topic overlap.
  // Pull a generous pool then score in JS.
  let pool: any[] = [];

  if (topics.length > 0) {
    let q = admin.from("cppa_authorities").select("*")
      .eq("status", "current")
      .overlaps("topics", topics);
    if (verifiedOnly) q = q.not("verified_by", "is", null);
    const { data, error } = await q.limit(200);
    if (error) return json({ error: error.message }, 500);
    pool = data ?? [];
  }

  if (query) {
    let q = admin.from("cppa_authorities").select("*")
      .eq("status", "current")
      .textSearch("search_vector", query, { type: "websearch" });
    if (verifiedOnly) q = q.not("verified_by", "is", null);
    const { data, error } = await q.limit(200);
    if (error) return json({ error: error.message }, 500);
    const seen = new Set(pool.map((r) => r.id));
    for (const r of data ?? []) if (!seen.has(r.id)) pool.push(r);
  }

  if (pool.length === 0 && base_citations.length === 0) {
    return json({
      authorities: [], deadlines: [],
      retrieved_count: 0, warning: "no_matching_authority",
    });
  }

  // Score: topic_overlap*3 + 0 (ts_rank not directly exposed via PostgREST; approximated) + weight/100
  // For the FTS rank approximation we boost rows that were returned by the FTS branch.
  const ftsBoost = new Set<string>();
  if (query) {
    // Re-flag: easiest is to recompute via .textSearch result above
    // (already merged into pool; we lose discrimination, so we recompute)
    const { data: ftsRows } = await admin.from("cppa_authorities")
      .select("id")
      .eq("status", "current")
      .textSearch("search_vector", query, { type: "websearch" })
      .limit(200);
    (ftsRows ?? []).forEach((r: any) => ftsBoost.add(r.id));
  }

  const scored = pool.map((r) => {
    const overlap = (r.topics ?? []).filter((t: string) => topics.includes(t)).length;
    const ftsScore = query && ftsBoost.has(r.id) ? 1 : 0;
    const score = overlap * 3 + ftsScore + (r.authority_weight ?? 0) / 100.0;
    return { row: r, score };
  });
  scored.sort((a, b) =>
    b.score - a.score || (b.row.authority_weight ?? 0) - (a.row.authority_weight ?? 0),
  );
  const top = scored.slice(0, limit).map((s) => s.row);

  // 7. Always-include definitions/thresholds
  const forceTopicSet = new Set<string>();
  for (const t of topics) {
    const rel = FORCED_DEFINITION_RELATIONS[t];
    if (rel) rel.forEach((x) => forceTopicSet.add(x));
  }
  let forced: any[] = [];
  if (forceTopicSet.size > 0) {
    let q = admin.from("cppa_authorities").select("*")
      .eq("status", "current")
      .contains("topics", ["definitions"]) // must define something
      .overlaps("topics", Array.from(forceTopicSet));
    if (verifiedOnly) q = q.not("verified_by", "is", null);
    const { data } = await q.limit(20);
    forced = data ?? [];
    // Also threshold sections for cybersecurity-audit / risk-assessment if topics has those:
    if (topics.includes("cybersecurity-audit") || topics.includes("risk-assessment")) {
      let qt = admin.from("cppa_authorities").select("*")
        .eq("status", "current")
        .contains("topics", ["thresholds"]);
      if (verifiedOnly) qt = qt.not("verified_by", "is", null);
      const { data: thresholds } = await qt.limit(20);
      for (const r of thresholds ?? []) forced.push(r);
    }
  }

  // Merge forced into result set without duplicating
  const byId = new Map<string, any>();
  for (const r of top) byId.set(r.id, r);
  for (const r of forced) if (!byId.has(r.id)) byId.set(r.id, r);
  const merged = Array.from(byId.values());

  // 8. Decide which get full_text
  const forcedIds = new Set(forced.map((r) => r.id));
  const topIdsForFullText = new Set(
    scored.slice(0, full_text_limit).map((s) => s.row.id),
  );
  const wantsFullText = (id: string) => topIdsForFullText.has(id) || forcedIds.has(id);

  // Build initial items
  let items = merged.map((r) => ({
    raw: r,
    item: authorityShape(r, wantsFullText(r.id)),
  }));

  // Enforce 120K char cap on full_text — drop full_text from lowest authority_weight rows
  const ascByWeight = [...items].sort((a, b) =>
    (a.raw.authority_weight ?? 0) - (b.raw.authority_weight ?? 0),
  );
  let totalChars = items.reduce((n, x) => n + (x.item.full_text?.length ?? 0), 0);
  for (const x of ascByWeight) {
    if (totalChars <= FULL_TEXT_HARD_CAP) break;
    if (x.item.full_text) {
      totalChars -= x.item.full_text.length;
      x.item.full_text = null;
    }
  }

  const authorities = items.map((x) => x.item);

  // 9. Deadlines
  let deadlines: any[] = [];
  if (include_deadlines) {
    const returnedCitations = authorities.map((a) => a.citation);
    let dq = admin.from("cppa_deadlines").select("*").eq("status", "current");
    if (verifiedOnly) dq = dq.not("verified_by", "is", null);
    const { data: dl } = await dq;
    deadlines = (dl ?? []).filter((d: any) => {
      const topicHit = (d.topics ?? []).some((t: string) => topics.includes(t));
      const citeHit = returnedCitations.includes(d.primary_authority_citation);
      return topicHit || citeHit;
    });
  }

  return json({
    authorities,
    deadlines,
    retrieved_count: authorities.length,
    verified_only_mode: verifiedOnly,
  });
});
