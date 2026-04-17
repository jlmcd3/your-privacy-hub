// Ingest enforcement decisions from GDPRHub (CC-licensed wiki).
// Uses MediaWiki API to enumerate "Category:Decisions" pages, then Jina Reader to extract content.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MEDIAWIKI_API = "https://gdprhub.eu/api.php";
const JINA = "https://r.jina.ai/";

async function listDecisionPages(category: string, limit: number, cmcontinue?: string) {
  const url = new URL(MEDIAWIKI_API);
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "categorymembers");
  url.searchParams.set("cmtitle", category);
  url.searchParams.set("cmlimit", String(limit));
  url.searchParams.set("cmtype", "page");
  url.searchParams.set("format", "json");
  if (cmcontinue) url.searchParams.set("cmcontinue", cmcontinue);
  const res = await fetch(url.toString(), { headers: { "User-Agent": "EndUserPrivacy-Bot/1.0" } });
  if (!res.ok) throw new Error(`MediaWiki list failed: ${res.status}`);
  return await res.json();
}

async function fetchPageMarkdown(pageTitle: string): Promise<string> {
  const pageUrl = `https://gdprhub.eu/index.php?title=${encodeURIComponent(pageTitle)}`;
  const jinaKey = Deno.env.get("JINA_API_KEY");
  const headers: Record<string, string> = { "User-Agent": "EndUserPrivacy-Bot/1.0" };
  if (jinaKey) headers["Authorization"] = `Bearer ${jinaKey}`;
  const res = await fetch(JINA + pageUrl, { headers });
  if (!res.ok) throw new Error(`Jina failed for ${pageTitle}: ${res.status}`);
  return await res.text();
}

function parseDecision(title: string, markdown: string) {
  // Extract regulator/jurisdiction from title pattern, e.g. "CNIL (France) - SAN-2024-001"
  const m = title.match(/^([A-Za-zÀ-ÿ.\s&]+?)\s*\(([^)]+)\)\s*-\s*(.+)$/);
  const regulator = m?.[1]?.trim() ?? "Unknown";
  const jurisdiction = m?.[2]?.trim() ?? "EU";
  const caseRef = m?.[3]?.trim() ?? title;

  // Extract first decision date (yyyy-mm-dd or dd.mm.yyyy)
  const dateIso = markdown.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1];
  const dateEu = markdown.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  let decision_date: string | null = null;
  if (dateIso) decision_date = dateIso;
  else if (dateEu) decision_date = `${dateEu[3]}-${dateEu[2].padStart(2, "0")}-${dateEu[1].padStart(2, "0")}`;

  // Fine: capture e.g. "EUR 1,000,000" or "€1.000.000"
  const fineMatch = markdown.match(/(?:EUR|€)\s?([\d.,]+)/i);
  let fine_eur: number | null = null;
  let fine_amount: string | null = null;
  if (fineMatch) {
    fine_amount = fineMatch[0];
    const num = fineMatch[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
    const parsed = parseFloat(num);
    if (!isNaN(parsed)) fine_eur = parsed;
  }

  // Subject (controller): try to extract from common labels
  const subject = markdown.match(/Controller[:\s]+([^\n]{2,120})/i)?.[1]?.trim()
    ?? markdown.match(/Defendant[:\s]+([^\n]{2,120})/i)?.[1]?.trim()
    ?? null;

  return {
    etid: `gdprhub:${title}`,
    source_database: "GDPRHub",
    source_url: `https://gdprhub.eu/index.php?title=${encodeURIComponent(title)}`,
    regulator,
    jurisdiction,
    subject,
    law: "GDPR",
    decision_date,
    fine_amount,
    fine_eur,
    raw_text: markdown.slice(0, 50000),
    violation: caseRef,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const max = Math.min(parseInt(url.searchParams.get("max") ?? "50"), 500);
  const yearsParam = url.searchParams.get("years");
  const currentYear = new Date().getUTCFullYear();
  const years = yearsParam
    ? yearsParam.split(",").map((y) => y.trim()).filter(Boolean)
    : [String(currentYear), String(currentYear - 1), String(currentYear - 2)];

  let inserted = 0, skipped = 0, errors = 0;
  const perYear: Record<string, number> = {};

  try {
    let remaining = max;

    for (const year of years) {
      if (remaining <= 0) break;
      const category = `Category:${year}`;
      let cont: string | undefined = undefined;
      perYear[year] = 0;

      while (remaining > 0) {
        const batch = Math.min(remaining, 50);
        const data = await listDecisionPages(category, batch, cont);
        const members: Array<{ title: string }> = data?.query?.categorymembers ?? [];
        const nextContinue = data?.continue?.cmcontinue;

        for (const m of members) {
          if (remaining <= 0) break;
          try {
            const etid = `gdprhub:${m.title}`;
            const { data: existing } = await supabase
              .from("enforcement_actions")
              .select("id")
              .eq("etid", etid)
              .maybeSingle();
            if (existing) { skipped++; remaining--; continue; }

            const md = await fetchPageMarkdown(m.title);
            const row = parseDecision(m.title, md);
            const { error } = await supabase.from("enforcement_actions").insert(row);
            if (error) { errors++; console.error("insert", m.title, error.message); }
            else { inserted++; perYear[year]++; }
            remaining--;
            await new Promise((r) => setTimeout(r, 400));
          } catch (e) {
            errors++;
            console.error("page", m.title, (e as Error).message);
          }
        }

        if (!nextContinue || members.length === 0) break;
        cont = nextContinue;
      }
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, inserted, skipped, errors, perYear }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ inserted, skipped, errors, perYear }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
