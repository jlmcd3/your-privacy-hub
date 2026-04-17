// Ingest enforcement actions from US/UK government sources:
//   - ICO (UK) action listing
//   - FTC privacy/security press releases
//   - HHS OCR breach portal & resolution agreements
// Uses Jina Reader for HTML→markdown extraction. Government records are public domain.
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

const SOURCES = [
  { regulator: "ICO", jurisdiction: "United Kingdom", law: "UK GDPR", url: "https://ico.org.uk/action-weve-taken/enforcement/", source: "ICO" },
  { regulator: "FTC", jurisdiction: "United States", law: "FTC Act / COPPA", url: "https://www.ftc.gov/news-events/topics/protecting-consumer-privacy-security/privacy-security-enforcement", source: "FTC" },
  { regulator: "HHS OCR", jurisdiction: "United States", law: "HIPAA", url: "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html", source: "HHS-OCR" },
];

async function jinaFetch(targetUrl: string): Promise<string> {
  const jinaKey = Deno.env.get("JINA_API_KEY");
  const headers: Record<string, string> = { "User-Agent": "EndUserPrivacy-Bot/1.0" };
  if (jinaKey) headers["Authorization"] = `Bearer ${jinaKey}`;
  const res = await fetch(JINA + targetUrl, { headers });
  if (!res.ok) throw new Error(`Jina failed: ${res.status}`);
  return await res.text();
}

// Extract markdown links + nearby date as candidate actions
function extractActions(markdown: string, src: typeof SOURCES[number]) {
  const out: Array<{ title: string; url: string; date: string | null }> = [];
  // Match markdown links: [title](url)
  const linkRe = /\[([^\]]{8,200})\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(markdown)) !== null) {
    const title = m[1].trim();
    const href = m[2];
    // Only keep links that look like enforcement actions on the regulator's domain
    const host = new URL(href).hostname;
    const expectedHost = new URL(src.url).hostname;
    if (!host.includes(expectedHost.split(".").slice(-2).join("."))) continue;

    // Look for a date within 200 chars surrounding the match
    const ctx = markdown.slice(Math.max(0, m.index - 200), m.index + 200);
    const dIso = ctx.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] ?? null;
    const dHuman = ctx.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
    let date: string | null = dIso;
    if (!date && dHuman) {
      const months: Record<string, string> = { january:"01", february:"02", march:"03", april:"04", may:"05", june:"06", july:"07", august:"08", september:"09", october:"10", november:"11", december:"12" };
      date = `${dHuman[3]}-${months[dHuman[2].toLowerCase()]}-${dHuman[1].padStart(2,"0")}`;
    }
    out.push({ title, url: href, date });
  }
  // De-dup by url
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let inserted = 0, skipped = 0, errors = 0;
  const summary: Record<string, number> = {};

  for (const src of SOURCES) {
    try {
      const md = await jinaFetch(src.url);
      const actions = extractActions(md, src);
      summary[src.source] = actions.length;
      console.log(`${src.source}: ${actions.length} candidate actions`);

      for (const a of actions) {
        const etid = `${src.source.toLowerCase()}:${a.url}`;
        const { data: existing } = await supabase
          .from("enforcement_actions")
          .select("id")
          .eq("etid", etid)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const fineMatch = a.title.match(/[£$€]\s?([\d,.]+)\s?(million|m|k|thousand)?/i);
        let fine_eur: number | null = null;
        let fine_amount: string | null = null;
        if (fineMatch) {
          fine_amount = fineMatch[0];
          let n = parseFloat(fineMatch[1].replace(/,/g, ""));
          if (/million|m\b/i.test(fineMatch[2] || "")) n *= 1_000_000;
          if (/thousand|k\b/i.test(fineMatch[2] || "")) n *= 1_000;
          if (!isNaN(n)) fine_eur = n; // currency normalization happens in enrichment
        }

        const { error } = await supabase.from("enforcement_actions").insert({
          etid,
          source_database: src.source,
          source_url: a.url,
          regulator: src.regulator,
          jurisdiction: src.jurisdiction,
          law: src.law,
          subject: null,
          violation: a.title,
          decision_date: a.date,
          fine_amount,
          fine_eur,
        });
        if (error) { errors++; console.error("insert", etid, error.message); }
        else inserted++;
      }
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      errors++;
      console.error(src.source, (e as Error).message);
    }
  }

  return new Response(JSON.stringify({ inserted, skipped, errors, summary }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
