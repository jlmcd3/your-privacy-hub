// Ingest Australian federal bills by scraping the Parliament of Australia public Bills
// Search Results page (https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results).
//
// Why scrape: APH's machine-readable ParlInfo / RSS endpoints are now behind an Azure
// WAF JS challenge (returns 403 to bots). The www.aph.gov.au search page itself returns
// scrapeable HTML and accepts simple GET parameters (q, st=1 sort by date, sr=1 desc,
// ps=50 page size, pnu=48 current Parliament). We then locally re-validate against the
// full topic-keyword allowlist.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  startRun, finishRun, upsertBill, newRunCounts, validateBill, reject,
  isPrivacyRelated, normalizeStage, markStaleBills, type NormalizedBill,
} from "../_shared/legislation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SOURCE = "au-aph";

// Server-side keyword filters (these limit the result set). Local re-validation runs on
// the returned title against the full TOPIC_KEYWORDS allowlist.
const QUERIES = [
  "privacy", "data+protection", "personal+information",
  "artificial+intelligence", "biometric", "facial+recognition",
  "online+safety", "cyber+security", "data+breach",
];

// Pull current (48th) and immediately-previous (47th) Parliament so we don't lose bills
// the day after a parliament rolls over.
const PARLIAMENTS = ["48", "47"];

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

interface ScrapedBill {
  bId: string;
  title: string;
  date: string | null;
  status: string;
  chamber: string;
  portfolio: string;
}

function parseAphResults(html: string): ScrapedBill[] {
  const out: ScrapedBill[] = [];
  // Each result: <h4><a href="/Parliamentary_Business/.../Result?bId=XXX">TITLE</a></h4>
  // followed (within ~2KB) by a <dl> with Date / Chamber / Status / Portfolio rows.
  const re = /<h4[^>]*>\s*<a[^>]*href="\/Parliamentary_Business\/Bills_Legislation\/Bills_Search_Results\/Result\?bId=([^"]+)"[^>]*>([^<]+)<\/a>\s*<\/h4>([\s\S]{0,3000}?)<\/dl>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const bId = m[1];
    const title = decodeHtml(m[2]).trim();
    const meta = m[3];
    const get = (label: string): string => {
      const r = new RegExp(`<dt>\\s*${label}\\s*</dt>\\s*<dd>\\s*([^<&]+)`, "i").exec(meta);
      return r ? decodeHtml(r[1]).trim() : "";
    };
    const dateRaw = get("Date");
    let date: string | null = null;
    if (dateRaw) {
      const d = new Date(dateRaw);
      if (!isNaN(d.getTime())) date = d.toISOString().slice(0, 10);
    }
    out.push({
      bId,
      title,
      date,
      status: get("Status"),
      chamber: get("Chamber"),
      portfolio: get("Portfolio"),
    });
  }
  return out;
}

function mapStatus(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("act") || s.includes("assented")) return "enacted";
  if (s.includes("passed both")) return "passed";
  if (s.includes("before senate") || s.includes("before house")) return "introduced";
  if (s.includes("committee")) return "committee";
  if (s.includes("not proceeding") || s.includes("withdrawn") || s.includes("negatived")) return "failed";
  return normalizeStage(status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedMs = Date.now();
  const counts = newRunCounts();
  let runId: string | null = null;
  const seen = new Set<string>();

  try {
    runId = await startRun(supabase, SOURCE);

    for (const pnu of PARLIAMENTS) {
      for (const q of QUERIES) {
        const url = `https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results?drt=0&drv=0&drvH=0&pnu=${pnu}&pnuH=0&ps=50&q=${q}&st=1&sr=1`;
        const res = await fetch(url, {
          headers: {
            "Accept": "text/html",
            "User-Agent": "EndUserPrivacyBot/1.0 (+https://enduserprivacy.com)",
          },
        });
        if (!res.ok) { reject(counts, undefined, `aph_${q}_p${pnu}_http_${res.status}`); continue; }
        const html = await res.text();
        const items = parseAphResults(html);
        counts.fetched += items.length;

        for (const it of items) {
          try {
            if (seen.has(it.bId)) continue;
            seen.add(it.bId);

            const m = isPrivacyRelated(it.title);
            if (!m.match) { reject(counts, it.title, "no_topic_match_local"); continue; }

            const summaryParts = [it.status, it.chamber, it.portfolio].filter(Boolean);
            const bill: NormalizedBill = {
              source: SOURCE,
              external_id: `aph-${it.bId}`,
              jurisdiction: "Australia",
              iso2: "AU",
              jurisdiction_slug: "australia",
              region: "Asia-Pacific",
              bill_name: it.title,
              stage: mapStatus(it.status),
              summary: summaryParts.join(" • ") || it.title,
              source_url: `https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation/Bills_Search_Results/Result?bId=${it.bId}`,
              source_name: "Parliament of Australia",
              source_last_action_at: it.date,
              matched_keywords: m.keywords,
              raw_payload: { query: q, parliament: pnu, status: it.status, chamber: it.chamber, portfolio: it.portfolio },
            };
            const err = validateBill(bill);
            if (err) { reject(counts, it.title, err); continue; }
            await upsertBill(supabase, bill, counts);
          } catch (e) {
            reject(counts, it.title, `exception:${(e as Error).message}`);
          }
        }
      }
    }

    await markStaleBills(supabase, SOURCE);
    await finishRun(supabase, runId, startedMs, counts, "success");
    return new Response(JSON.stringify({ ok: true, counts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = (e as Error).message;
    if (runId) await finishRun(supabase, runId, startedMs, counts, "failed", msg);
    return new Response(JSON.stringify({ ok: false, error: msg, counts }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
