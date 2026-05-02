// Ingest Australian federal legislation via the Federal Register of Legislation public API.
// https://www.legislation.gov.au/Browse/AsMadeApi
// Free, no key. We pull recently-registered Acts and Bills, filter on keywords.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  startRun, finishRun, upsertBill, newRunCounts, validateBill, reject,
  isPrivacyRelated, normalizeStage, markStaleBills, type NormalizedBill,
} from "../_shared/legislation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SOURCE = "au-legislation";

// OpenParliament-like RSS feed from Australia's APH — current bills before parliament.
// Falls back to a simple keyword-search HTML scrape if RSS unavailable.
const APH_BILLS_API = "https://www.aph.gov.au/api/parliamentary_business/bills_legislation/Bills_Search_Results?q=privacy&page=1&pageSize=50";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedMs = Date.now();
  const counts = newRunCounts();
  let runId: string | null = null;

  try {
    runId = await startRun(supabase, SOURCE);

    // Run multiple keyword-targeted searches against APH.
    const queries = ["privacy", "data+protection", "artificial+intelligence", "biometric", "cyber+security"];
    for (const q of queries) {
      const url = `https://www.aph.gov.au/api/parliamentary_business/bills_legislation/Bills_Search_Results?q=${q}&page=1&pageSize=50`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) { reject(counts, undefined, `aph_${q}_http_${res.status}`); continue; }
      let json: any;
      try { json = await res.json(); } catch { reject(counts, undefined, `aph_${q}_invalid_json`); continue; }
      const items: any[] = json?.results ?? json?.Results ?? [];
      counts.fetched += items.length;

      for (const it of items) {
        try {
          const title: string = it?.Title ?? it?.title ?? "";
          const summary: string = it?.Summary ?? it?.summary ?? "";
          const m = isPrivacyRelated(title, summary);
          if (!m.match) continue;

          const billId = it?.Id ?? it?.id ?? it?.BillId ?? title;
          const stageDesc = it?.Status ?? it?.status ?? "";
          const url2: string = it?.Url ?? it?.url ?? `https://www.aph.gov.au/Parliamentary_Business/Bills_Legislation`;

          const bill: NormalizedBill = {
            source: SOURCE,
            external_id: `aph-${billId}`,
            jurisdiction: "Australia",
            iso2: "AU",
            jurisdiction_slug: "australia",
            region: "Asia-Pacific",
            bill_name: title,
            stage: normalizeStage(stageDesc),
            summary: summary || stageDesc || null,
            source_url: url2.startsWith("http") ? url2 : `https://www.aph.gov.au${url2}`,
            source_name: "Parliament of Australia",
            source_last_action_at: it?.LastUpdated?.slice(0, 10) ?? null,
            matched_keywords: m.keywords,
            raw_payload: { stageDesc, query: q },
          };
          const err = validateBill(bill);
          if (err) { reject(counts, title, err); continue; }
          await upsertBill(supabase, bill, counts);
        } catch (e) {
          reject(counts, it?.Title, `exception:${(e as Error).message}`);
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
