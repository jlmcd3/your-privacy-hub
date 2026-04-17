// Ingest fines listed on enforcementtracker.com (CMS) via Jina Reader.
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

const JINA = "https://r.jina.ai/";
const TARGET = "https://www.enforcementtracker.com/";

async function jinaFetch(targetUrl: string): Promise<string> {
  const jinaKey = Deno.env.get("JINA_API_KEY");
  const headers: Record<string, string> = { "User-Agent": "EndUserPrivacy-Bot/1.0" };
  if (jinaKey) headers["Authorization"] = `Bearer ${jinaKey}`;
  const res = await fetch(JINA + targetUrl, { headers });
  if (!res.ok) throw new Error(`Jina failed: ${res.status}`);
  return await res.text();
}

// Parse markdown table rows of the form: | ETid-NNNN | date | country | fine | controller | sector | ... |
function parseRows(markdown: string) {
  const rows: Array<Record<string, string>> = [];
  const lines = markdown.split("\n");
  for (const line of lines) {
    // Match ETid-NNNN id token anywhere on the line
    const idMatch = line.match(/(ETid-\d{3,6})/);
    if (!idMatch) continue;
    const etid = idMatch[1];

    // Split by pipe if it's a table row, otherwise by whitespace
    const cells = line.includes("|")
      ? line.split("|").map((c) => c.trim()).filter(Boolean)
      : line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);

    const dateCell = cells.find((c) => /^\d{4}-\d{2}-\d{2}$/.test(c));
    const fineCell = cells.find((c) => /(€|EUR)/i.test(c));
    const country = cells.find((c) => /^[A-Z][a-zA-Z\s]+$/.test(c) && c.length < 30 && !/(€|ETid)/.test(c));

    let fine_eur: number | null = null;
    if (fineCell) {
      const numStr = fineCell.replace(/[^\d.,]/g, "").replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
      const n = parseFloat(numStr);
      if (!isNaN(n)) fine_eur = n;
    }

    rows.push({
      etid,
      date: dateCell ?? "",
      country: country ?? "",
      fine_amount: fineCell ?? "",
      fine_eur: fine_eur != null ? String(fine_eur) : "",
      controller: cells.slice(-3, -2)[0] ?? "",
      sector: cells.slice(-2, -1)[0] ?? "",
    });
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const pages = Math.min(parseInt(url.searchParams.get("pages") ?? "1"), 20);

  let inserted = 0, skipped = 0, errors = 0;

  for (let p = 1; p <= pages; p++) {
    try {
      const target = p === 1 ? TARGET : `${TARGET}?page=${p}`;
      const md = await jinaFetch(target);
      const rows = parseRows(md);
      console.log(`page ${p}: ${rows.length} rows parsed`);

      for (const r of rows) {
        if (!r.etid) continue;
        const id = `cms:${r.etid}`;
        const { data: existing } = await supabase
          .from("enforcement_actions")
          .select("id")
          .eq("etid", id)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const { error } = await supabase.from("enforcement_actions").insert({
          etid: id,
          source_database: "CMS",
          source_url: TARGET,
          regulator: "Unknown DPA",
          jurisdiction: r.country || "EU",
          subject: r.controller || null,
          sector: r.sector || null,
          law: "GDPR",
          decision_date: r.date || null,
          fine_amount: r.fine_amount || null,
          fine_eur: r.fine_eur ? Number(r.fine_eur) : null,
        });
        if (error) { errors++; console.error("insert", id, error.message); }
        else inserted++;
      }
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      errors++;
      console.error(`page ${p}`, (e as Error).message);
    }
  }

  return new Response(JSON.stringify({ inserted, skipped, errors }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
