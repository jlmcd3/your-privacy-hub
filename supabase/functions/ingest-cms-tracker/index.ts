// Ingest fines listed on enforcementtracker.com (CMS GDPR Enforcement Tracker).
// Uses the site's DataTables JSON endpoint to retrieve the full dataset (~3,000 fines).
// Public-interest aggregator of European GDPR fines.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DATA_URL = "https://www.enforcementtracker.com/data4sfk3j4hwe324kjhfdwe.json";
const REFERER = "https://www.enforcementtracker.com/";

// Strip HTML tags and decode a minimal set of entities.
function stripHtml(s: string): string {
  if (!s) return "";
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Extract first href from an HTML cell.
function extractHref(s: string): string | null {
  if (!s) return null;
  const m = s.match(/href=['"]([^'"]+)['"]/i);
  return m ? m[1] : null;
}

// Extract country name. Cell looks like:
// <img src='./flags/flag_austria.png' alt='AUSTRIA' ...><br />AUSTRIA
function parseCountry(s: string): string {
  const alt = s.match(/alt=['"]([^'"]+)['"]/i);
  if (alt) {
    const v = alt[1].trim();
    // Title-case
    return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
  }
  return stripHtml(s);
}

// Parse a fine amount string like "4,800" or "1,200,000" into a number (EUR).
function parseFineEur(s: string): number | null {
  if (!s) return null;
  const cleaned = s.replace(/[^\d.,-]/g, "");
  if (!cleaned) return null;
  // CMS uses commas as thousands separators; strip them.
  const n = parseFloat(cleaned.replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

interface ParsedRow {
  etid: string;
  country: string;
  authority: string;
  date: string;
  fine_amount: string;
  fine_eur: number | null;
  controller: string;
  sector: string;
  articles: string;
  type: string;
  summary: string;
  source_url: string | null;
  permalink: string;
}

function parseRow(row: unknown[]): ParsedRow | null {
  if (!Array.isArray(row) || row.length < 13) return null;
  const etidRaw = String(row[1] ?? "").trim();
  const etidMatch = etidRaw.match(/ETid-(\d+)/i);
  if (!etidMatch) return null;
  const etidNum = etidMatch[1];

  const country = parseCountry(String(row[2] ?? ""));
  const authority = stripHtml(String(row[3] ?? "")) || "Unknown DPA";
  const date = String(row[4] ?? "").trim(); // already YYYY-MM-DD
  const fineAmount = stripHtml(String(row[5] ?? ""));
  const controller = stripHtml(String(row[6] ?? ""));
  const sector = stripHtml(String(row[7] ?? ""));
  const articles = stripHtml(String(row[8] ?? ""));
  const type = stripHtml(String(row[9] ?? ""));
  const summary = stripHtml(String(row[10] ?? ""));
  const sourceUrl = extractHref(String(row[11] ?? ""));
  const permalink = `https://www.enforcementtracker.com/ETid-${etidNum}`;

  return {
    etid: `cms:ETid-${etidNum}`,
    country,
    authority,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
    fine_amount: fineAmount,
    fine_eur: parseFineEur(fineAmount),
    controller,
    sector,
    articles,
    type,
    summary,
    source_url: sourceUrl,
    permalink,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") ?? "0"); // 0 = all
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const dryRun = url.searchParams.get("dry") === "1";

  let fetched = 0, parsed = 0, inserted = 0, skipped = 0, errors = 0;

  try {
    const res = await fetch(DATA_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EndUserPrivacy-Bot/1.0)",
        "Referer": REFERER,
        "Accept": "application/json,*/*",
      },
    });
    if (!res.ok) throw new Error(`Data endpoint failed: ${res.status}`);
    const json = await res.json();
    const rows: unknown[][] = json?.data ?? [];
    fetched = rows.length;
    console.log(`CMS Tracker: fetched ${fetched} rows from data endpoint`);

    const sliced = rows.slice(offset, limit > 0 ? offset + limit : undefined);

    if (dryRun) {
      const sample = sliced.slice(0, 3).map(parseRow);
      return new Response(
        JSON.stringify({ fetched, will_process: sliced.length, sample }, null, 2),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Bulk-fetch existing ETIDs in chunks to avoid N round-trips.
    const allIds = sliced
      .map((r) => parseRow(r))
      .filter((r): r is ParsedRow => !!r)
      .map((r) => r.etid);

    const existingIds = new Set<string>();
    const chunkSize = 500;
    for (let i = 0; i < allIds.length; i += chunkSize) {
      const chunk = allIds.slice(i, i + chunkSize);
      const { data, error } = await supabase
        .from("enforcement_actions")
        .select("etid")
        .in("etid", chunk);
      if (error) {
        console.error("existing lookup", error.message);
        continue;
      }
      for (const r of data ?? []) if (r.etid) existingIds.add(r.etid);
    }
    console.log(`CMS Tracker: ${existingIds.size} already in DB, ${allIds.length - existingIds.size} new`);

    // Build insert batch and insert in chunks.
    const toInsert: Record<string, unknown>[] = [];
    for (const raw of sliced) {
      const r = parseRow(raw);
      if (!r) continue;
      parsed++;
      if (existingIds.has(r.etid)) { skipped++; continue; }

      toInsert.push({
        etid: r.etid,
        source_database: "CMS",
        source_url: r.source_url || r.permalink,
        regulator: r.authority,
        jurisdiction: r.country || "EU",
        subject: r.controller || null,
        sector: r.sector || null,
        law: "GDPR",
        violation: r.articles || null,
        action_type: r.type || null,
        raw_text: r.summary || null,
        decision_date: r.date || null,
        fine_amount: r.fine_amount || null,
        fine_eur: r.fine_eur,
        fine_eur_equivalent: r.fine_eur,
      });
    }

    const insertChunk = 200;
    for (let i = 0; i < toInsert.length; i += insertChunk) {
      const batch = toInsert.slice(i, i + insertChunk);
      const { error, count } = await supabase
        .from("enforcement_actions")
        .insert(batch, { count: "exact" });
      if (error) {
        errors += batch.length;
        console.error(`insert batch ${i}-${i + batch.length}:`, error.message);
      } else {
        inserted += count ?? batch.length;
      }
    }
  } catch (e) {
    errors++;
    console.error("ingest-cms-tracker fatal:", (e as Error).message);
    return new Response(
      JSON.stringify({ error: (e as Error).message, fetched, parsed, inserted, skipped, errors }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ fetched, parsed, inserted, skipped, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
