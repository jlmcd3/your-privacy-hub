// Ingest EU legislative proposals via the European Parliament's Legislative Observatory (OEIL) RSS feeds.
// We use targeted keyword RSS searches — free, no key.
// https://oeil.secure.europarl.europa.eu
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  startRun, finishRun, upsertBill, newRunCounts, validateBill, reject,
  isPrivacyRelated, normalizeStage, markStaleBills, type NormalizedBill,
} from "../_shared/legislation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SOURCE = "eu-parliament";

// Search EUR-Lex for recent legislative proposals matching privacy keywords.
// EUR-Lex Webservice has a SOAP API requiring registration — instead we use the public
// EUR-Lex search RSS which is free and unauthenticated.
const QUERIES = [
  "data+protection",
  "privacy",
  "artificial+intelligence",
  "biometric",
  "cybersecurity",
];

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

// Very small RSS parser sufficient for EUR-Lex feeds.
function parseRss(xml: string): { title: string; link: string; desc: string; pubDate?: string }[] {
  const items: { title: string; link: string; desc: string; pubDate?: string }[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(block);
      if (!r) return "";
      return r[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
    };
    items.push({
      title: stripHtml(get("title")),
      link: get("link"),
      desc: stripHtml(get("description")),
      pubDate: get("pubDate"),
    });
  }
  return items;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedMs = Date.now();
  const counts = newRunCounts();
  let runId: string | null = null;

  try {
    runId = await startRun(supabase, SOURCE);

    for (const q of QUERIES) {
      const url = `https://eur-lex.europa.eu/EN/search-results-rss?DTS_DOM=ALL&DTS_SUBDOM=LEGISLATION&type=quick&qid=${Date.now()}&text=${q}&lang=en`;
      const res = await fetch(url, { headers: { Accept: "application/rss+xml,application/xml,text/xml" } });
      if (!res.ok) { reject(counts, undefined, `rss_${q}_http_${res.status}`); continue; }
      const xml = await res.text();
      const items = parseRss(xml);
      counts.fetched += items.length;

      for (const it of items.slice(0, 50)) {
        try {
          const title = it.title;
          const summary = it.desc;
          const m = isPrivacyRelated(title, summary);
          if (!m.match) continue;

          // Extract CELEX or doc id from link as external_id.
          const idMatch = /uri=([A-Z0-9_:%.-]+)/.exec(it.link) || /CELEX[:%3A]([A-Z0-9]+)/i.exec(it.link);
          const externalId = idMatch ? decodeURIComponent(idMatch[1]).replace(/[^A-Z0-9._:-]/gi, "_") : it.link.slice(-64);

          let pub: string | null = null;
          if (it.pubDate) {
            const d = new Date(it.pubDate);
            if (!isNaN(d.getTime())) pub = d.toISOString().slice(0, 10);
          }

          const bill: NormalizedBill = {
            source: SOURCE,
            external_id: externalId,
            jurisdiction: "European Union",
            iso2: "EU",
            jurisdiction_slug: "european-union",
            region: "Europe",
            bill_name: title,
            stage: normalizeStage(summary), // best-effort; EUR-Lex RSS lacks a clean stage
            summary,
            source_url: it.link,
            source_name: "EUR-Lex",
            source_last_action_at: pub,
            matched_keywords: m.keywords,
            raw_payload: { query: q, pubDate: it.pubDate },
          };
          const err = validateBill(bill);
          if (err) { reject(counts, title, err); continue; }
          await upsertBill(supabase, bill, counts);
        } catch (e) {
          reject(counts, it.title, `exception:${(e as Error).message}`);
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
