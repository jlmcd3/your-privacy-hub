// Ingest decision summaries from GDPRhub (gdprhub.eu, run by noyb.eu) as LEADS
// for enforcement_actions.
//
// Shape follows ingest-cms-tracker: this function produces leads only. It writes
// GDPRhub's curated English summary into legacy_summary_text/legacy_summary_url
// (secondary summary, CC-BY-SA attributed to the GDPRhub page URL) and, where
// GDPRhub cites one, the underlying regulator/court decision URL into
// primary_source_url with primary_source_status='pending_fetch' so the existing
// fetch-and-extract-primary-source + verification-scan pipeline picks the row up.
// No GDPRhub-specific verification path.
//
// GDPRhub runs MediaWiki 1.43 and exposes the action API at /api.php, so this
// uses the structured API (category members + page wikitext) rather than HTML.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const API = "https://gdprhub.eu/api.php";
const UA = "EndUserPrivacy-Bot/1.0 (corpus ingestion; contact via enduserprivacy.com)";

// Priority order: CNIL, DPC, UODO first (worst verified coverage), then the rest.
const PRIORITY_CATEGORIES = ["CNIL (France)", "DPC (Ireland)", "UODO (Poland)"];

// ---------------------------------------------------------------- wiki helpers

async function api(params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const res = await fetch(`${API}?${qs}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`GDPRhub API ${res.status} for ${params.action}/${params.list ?? params.prop}`);
  return await res.json();
}

interface CatPage { pageid: number; title: string }

async function listCategoryMembers(
  category: string,
  limit: number,
  cmcontinue: string | null,
): Promise<{ pages: CatPage[]; cmcontinue: string | null }> {
  const params: Record<string, string> = {
    action: "query",
    list: "categorymembers",
    cmtitle: `Category:${category}`,
    cmlimit: String(limit),
    cmnamespace: "0",
    cmsort: "sortkey",
  };
  if (cmcontinue) params.cmcontinue = cmcontinue;
  const json = await api(params);
  return {
    pages: (json?.query?.categorymembers ?? []) as CatPage[],
    cmcontinue: json?.continue?.cmcontinue ?? null,
  };
}

async function fetchWikitext(pageids: number[]): Promise<Map<number, { title: string; text: string }>> {
  const out = new Map<number, { title: string; text: string }>();
  const chunk = 20; // MediaWiki content query limit for anonymous clients
  for (let i = 0; i < pageids.length; i += chunk) {
    const json = await api({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      pageids: pageids.slice(i, i + chunk).join("|"),
    });
    for (const p of json?.query?.pages ?? []) {
      const text = p?.revisions?.[0]?.slots?.main?.content;
      if (typeof text === "string") out.set(p.pageid, { title: p.title, text });
    }
  }
  return out;
}

// Parse the |Key=Value fields of the DPAdecisionBOX infobox.
function parseInfobox(wikitext: string): Record<string, string> {
  const start = wikitext.indexOf("{{DPAdecisionBOX");
  if (start < 0) return {};
  // Walk to the matching close of the template.
  let depth = 0;
  let end = wikitext.length;
  for (let i = start; i < wikitext.length - 1; i++) {
    if (wikitext[i] === "{" && wikitext[i + 1] === "{") { depth++; i++; continue; }
    if (wikitext[i] === "}" && wikitext[i + 1] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
      i++;
    }
  }
  const body = wikitext.slice(start, end);
  const fields: Record<string, string> = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*\|\s*([A-Za-z0-9_() -]+?)\s*=\s*(.*)$/);
    if (!m) continue;
    const v = m[2].trim();
    if (v) fields[m[1].trim()] = v;
  }
  return { __body_end: String(end), ...fields };
}

// Strip wiki markup down to readable prose for legacy_summary_text.
function wikiToText(s: string): string {
  return s
    .replace(/\{\{[^{}]*\}\}/g, " ")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, " ")
    .replace(/<ref[^>]*\/>/gi, " ")
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, "$1")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/\[(https?:\/\/\S+)\s+([^\]]+)\]/g, "$2")
    .replace(/<[^>]+>/g, " ")
    .replace(/'''?/g, "")
    .replace(/^\s*={2,}\s*(.*?)\s*={2,}\s*$/gm, "\n$1\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// "05.12.2024" -> "2024-12-05"; also tolerates ISO input.
function parseDate(s: string | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  let m = t.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return t;
  return null;
}

function parseAmount(s: string | undefined): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  // GDPRhub uses comma thousands separators, dot decimal.
  const n = parseFloat(cleaned.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function norm(s: string | null | undefined): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function regulatorsMatch(a: string, b: string): boolean {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

interface Lead {
  etid: string;
  pageid: number;
  page_url: string;
  regulator: string;
  jurisdiction: string;
  case_reference: string | null;
  decision_date: string | null;
  subject: string | null;
  fine_amount: string | null;
  fine_eur: number | null;
  currency: string | null;
  articles: string[];
  action_type: string | null;
  summary: string;
  primary_source_url: string | null;
}

function buildLead(pageid: number, title: string, wikitext: string): Lead | null {
  const f = parseInfobox(wikitext);
  const abbrev = f.DPA_Abbrevation || f.DPA_Abbreviation || "";
  const jurisdiction = f.Jurisdiction || "";
  if (!abbrev || !jurisdiction) return null;

  const bodyEnd = parseInt(f.__body_end ?? "0");
  const prose = wikiToText(wikitext.slice(bodyEnd + 2));
  if (prose.length < 120) return null; // stub page, not a usable summary

  const currency = f.Currency || null;
  const amount = parseAmount(f.Fine);
  const articles: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const a = f[`GDPR_Article_${i}`];
    if (a) articles.push(a);
  }

  const primary = f.Original_Source_Link_1 || f.Original_Source_Link_2 || null;
  const primaryOk = primary && /^https?:\/\//i.test(primary) && !/gdprhub\.eu/i.test(primary)
    ? primary
    : null;

  return {
    etid: `gdprhub:${pageid}`,
    pageid,
    page_url: `https://gdprhub.eu/index.php?title=${encodeURIComponent(title.replace(/ /g, "_"))}`,
    regulator: abbrev,
    jurisdiction,
    case_reference: f.Case_Number_Name || f.ECLI || null,
    decision_date: parseDate(f.Date_Decided) ?? parseDate(f.Date_Published),
    subject: f.Party_Name_1 || null,
    fine_amount: amount !== null ? `${currency ? currency + " " : ""}${f.Fine}`.trim() : null,
    fine_eur: currency && currency.toUpperCase() === "EUR" ? amount : null,
    currency,
    articles,
    action_type: f.Type || null,
    summary: prose.slice(0, 40000),
    primary_source_url: primaryOk,
  };
}

// --------------------------------------------------------------------- ingest

async function findExisting(lead: Lead): Promise<{ id: string; primary_source_url: string | null; case_reference: string | null; legacy_summary_text: string | null } | null> {
  // 1. Our own etid (idempotent re-runs).
  const byEtid = await supabase
    .from("enforcement_actions")
    .select("id, primary_source_url, case_reference, legacy_summary_text")
    .eq("etid", lead.etid)
    .maybeSingle();
  if (byEtid.data) return byEtid.data as any;

  // 2. Dedupe on regulator + case_reference + decision_date against rows the CMS
  //    (or per-regulator) import already created.
  if (lead.case_reference && lead.decision_date) {
    const { data } = await supabase
      .from("enforcement_actions")
      .select("id, regulator, primary_source_url, case_reference, legacy_summary_text")
      .eq("decision_date", lead.decision_date)
      .ilike("case_reference", lead.case_reference)
      .limit(20);
    for (const r of data ?? []) {
      if (regulatorsMatch(r.regulator, lead.regulator)) return r as any;
    }
  }

  // 3. Fallback for decisions GDPRhub gives no case number for.
  if (lead.decision_date && lead.subject) {
    const { data } = await supabase
      .from("enforcement_actions")
      .select("id, regulator, subject, primary_source_url, case_reference, legacy_summary_text")
      .eq("decision_date", lead.decision_date)
      .is("case_reference", null)
      .limit(50);
    for (const r of data ?? []) {
      if (regulatorsMatch(r.regulator, lead.regulator) && norm(r.subject) === norm(lead.subject)) {
        return r as any;
      }
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: any = {};
  try { body = await req.json(); } catch { /* GET / empty body */ }
  const url = new URL(req.url);
  const num = (k: string, d: number) =>
    parseInt(String(body[k] ?? url.searchParams.get(k) ?? d)) || d;

  const categories: string[] = Array.isArray(body.categories) && body.categories.length
    ? body.categories
    : PRIORITY_CATEGORIES;
  const batchSize = Math.min(num("batch_size", 50), 100);
  const cursors: Record<string, string | null> = body.cursors ?? {};
  const dryRun = body.dry === true || url.searchParams.get("dry") === "1";

  const stats = {
    categories_run: [] as string[],
    pages_seen: 0,
    parsed: 0,
    unparseable: 0,
    created: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    with_primary_source_url: 0,
    without_primary_source_url: 0,
  };
  const nextCursors: Record<string, string | null> = {};
  const samples: unknown[] = [];

  try {
    for (const category of categories) {
      const { pages, cmcontinue } = await listCategoryMembers(
        category,
        batchSize,
        cursors[category] ?? null,
      );
      stats.categories_run.push(category);
      nextCursors[category] = cmcontinue;
      stats.pages_seen += pages.length;
      if (!pages.length) continue;

      const contents = await fetchWikitext(pages.map((p) => p.pageid));

      for (const p of pages) {
        const c = contents.get(p.pageid);
        if (!c) { stats.unparseable++; continue; }
        const lead = buildLead(p.pageid, c.title, c.text);
        if (!lead) { stats.unparseable++; continue; }
        stats.parsed++;
        if (lead.primary_source_url) stats.with_primary_source_url++;
        else stats.without_primary_source_url++;

        if (dryRun) {
          if (samples.length < 3) samples.push({ ...lead, summary: lead.summary.slice(0, 400) });
          continue;
        }

        try {
          const existing = await findExisting(lead);
          if (existing) {
            const patch: Record<string, unknown> = {};
            if (!existing.legacy_summary_text) {
              patch.legacy_summary_text = lead.summary;
              patch.legacy_summary_url = lead.page_url; // CC-BY-SA attribution
            }
            if (!existing.case_reference && lead.case_reference) {
              patch.case_reference = lead.case_reference;
              patch.case_reference_extraction_method = "manual";
            }
            if (!existing.primary_source_url && lead.primary_source_url) {
              patch.primary_source_url = lead.primary_source_url;
              patch.primary_source_status = "pending_fetch";
              patch.primary_source_url_discovered_at = new Date().toISOString();
            }
            if (Object.keys(patch).length === 0) { stats.unchanged++; continue; }
            const { error } = await supabase
              .from("enforcement_actions")
              .update(patch)
              .eq("id", existing.id);
            if (error) throw new Error(error.message);
            stats.updated++;
          } else {
            const { error } = await supabase.from("enforcement_actions").insert({
              etid: lead.etid,
              source_database: "GDPRhub",
              source_url: lead.page_url,
              regulator: lead.regulator,
              jurisdiction: lead.jurisdiction,
              subject: lead.subject,
              law: "GDPR",
              violation: lead.articles.join(", ") || null,
              action_type: lead.action_type,
              decision_date: lead.decision_date,
              case_reference: lead.case_reference,
              case_reference_extraction_method: lead.case_reference ? "manual" : "none",
              fine_amount: lead.fine_amount,
              fine_eur: lead.fine_eur,
              fine_eur_equivalent: lead.fine_eur,
              fine_currency: lead.currency,
              fine_amount_local: lead.fine_amount,
              // CC-BY-SA: curated secondary summary + attribution URL.
              legacy_summary_text: lead.summary,
              legacy_summary_url: lead.page_url,
              primary_source_url: lead.primary_source_url,
              primary_source_status: lead.primary_source_url ? "pending_fetch" : "discovered_no_link",
              primary_source_url_discovered_at: lead.primary_source_url ? new Date().toISOString() : null,
              verification_status: "unverified",
              ingestion_method: "gdprhub_api",
              ingestion_confidence: lead.primary_source_url ? "medium" : "low",
            });
            if (error) throw new Error(error.message);
            stats.created++;
          }
        } catch (e) {
          stats.errors++;
          console.error(`gdprhub row ${lead.etid}:`, (e as Error).message);
        }
      }
    }
  } catch (e) {
    console.error("ingest-gdprhub fatal:", (e as Error).message);
    return new Response(
      JSON.stringify({ error: (e as Error).message, ...stats, cursors: nextCursors }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ...stats, cursors: nextCursors, ...(dryRun ? { dry_run: true, samples } : {}) }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
