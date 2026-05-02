// Ingest EU legislation via the Publications Office Cellar SPARQL endpoint.
// Endpoint: https://publications.europa.eu/webapi/rdf/sparql  (free, no key, official)
// Docs: https://op.europa.eu/en/web/cellar/cellar-data
//
// We query for Regulations (REG), Directives (DIR), and Decisions (DEC) published since
// 2023-01-01 whose English title contains any of our topic keywords. Cellar returns CELEX
// identifiers which we use as a stable external_id and to build the canonical EUR-Lex URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  startRun, finishRun, upsertBill, newRunCounts, validateBill, reject,
  isPrivacyRelated, normalizeStage, markStaleBills, type NormalizedBill,
} from "../_shared/legislation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SOURCE = "eu-cellar";
const SPARQL_ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";

// Topic phrases we ask Cellar to filter on server-side (cheap CONTAINS) — we then
// re-validate locally with the full TOPIC_KEYWORDS allowlist via isPrivacyRelated.
const TITLE_FILTERS = [
  "data protection", "privacy", "personal data",
  "artificial intelligence", "biometric",
  "cybersecurity", "cyber security",
  "online safety", "data broker",
];

// Resource types: Regulation, Directive, Decision, plus legislative proposals (COM docs).
const RESOURCE_TYPES = ["REG", "DIR", "DEC", "PROP_REG", "PROP_DIR", "PROP_DEC"];

function buildSparql(): string {
  const titleFilter = TITLE_FILTERS
    .map((t) => `CONTAINS(LCASE(STR(?title)), "${t}")`)
    .join(" || ");
  const typeValues = RESOURCE_TYPES
    .map((t) => `<http://publications.europa.eu/resource/authority/resource-type/${t}>`)
    .join(" ");
  return `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?work ?title ?date ?celex WHERE {
  VALUES ?rtype { ${typeValues} }
  ?work cdm:work_date_document ?date ;
        cdm:resource_legal_id_celex ?celex ;
        cdm:work_has_resource-type ?rtype .
  ?expr cdm:expression_belongs_to_work ?work ;
        cdm:expression_title ?title ;
        cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
  FILTER(?date >= "2023-01-01"^^<http://www.w3.org/2001/XMLSchema#date>)
  FILTER(${titleFilter})
}
ORDER BY DESC(?date)
LIMIT 200`.trim();
}

interface SparqlBinding {
  work: { value: string };
  title: { value: string };
  date: { value: string };
  celex: { value: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedMs = Date.now();
  const counts = newRunCounts();
  let runId: string | null = null;

  try {
    runId = await startRun(supabase, SOURCE);

    const sparql = buildSparql();
    const res = await fetch(SPARQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Accept": "application/sparql-results+json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "EndUserPrivacyBot/1.0 (+https://enduserprivacy.com)",
      },
      body: "query=" + encodeURIComponent(sparql),
    });
    if (!res.ok) throw new Error(`cellar_sparql_http_${res.status}`);
    const json = await res.json() as { results?: { bindings?: SparqlBinding[] } };
    const bindings = json?.results?.bindings ?? [];
    counts.fetched = bindings.length;

    for (const b of bindings) {
      try {
        const title = b.title?.value ?? "";
        const celex = b.celex?.value ?? "";
        const date = b.date?.value ?? null; // already YYYY-MM-DD
        if (!title || !celex) { reject(counts, title, "missing_title_or_celex"); continue; }

        // Local re-validation with full keyword allowlist.
        const m = isPrivacyRelated(title);
        if (!m.match) { reject(counts, title, "no_topic_match_local"); continue; }

        // Determine stage from CELEX sector + descriptor.
        // CELEX format: <sector><year><type-letter><number>. Letter R=regulation, L=directive,
        // D=decision (all enacted). Sector 5 with type PC = legislative proposal (in progress).
        let stage = "enacted";
        if (/^5/.test(celex) || /PC/.test(celex)) stage = "introduced";

        const bill: NormalizedBill = {
          source: SOURCE,
          external_id: `celex-${celex}`,
          jurisdiction: "European Union",
          iso2: "EU",
          jurisdiction_slug: "european-union",
          region: "Europe",
          bill_name: title,
          stage: normalizeStage(stage),
          summary: title,
          source_url: `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`,
          source_name: "EUR-Lex (Cellar)",
          source_last_action_at: date,
          matched_keywords: m.keywords,
          raw_payload: { celex, work: b.work?.value },
        };
        const err = validateBill(bill);
        if (err) { reject(counts, title, err); continue; }
        await upsertBill(supabase, bill, counts);
      } catch (e) {
        reject(counts, b.title?.value, `exception:${(e as Error).message}`);
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
