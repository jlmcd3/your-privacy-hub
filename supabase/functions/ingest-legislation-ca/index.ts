// Ingest Canadian federal bills via LEGISinfo Open Data (parl.ca). No key required.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  startRun, finishRun, upsertBill, newRunCounts, validateBill, reject,
  isPrivacyRelated, normalizeStage, markStaleBills, type NormalizedBill,
} from "../_shared/legislation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SOURCE = "ca-parliament";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedMs = Date.now();
  const counts = newRunCounts();
  let runId: string | null = null;

  try {
    runId = await startRun(supabase, SOURCE);

    // Current parliament (44th, may need update annually) - LEGISinfo JSON export.
    const url = "https://www.parl.ca/legisinfo/en/bills/json?parlsession=44-1&page=1";
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`legisinfo_http_${res.status}`);
    const items: any[] = await res.json();
    counts.fetched = items.length;

    for (const it of items) {
      try {
        const title: string = it?.LongTitleEn ?? it?.ShortTitleEn ?? "";
        const summary: string = it?.NoteEn ?? "";
        const m = isPrivacyRelated(title, summary);
        if (!m.match) continue;

        const number = it?.NumberCode ?? "";
        const externalId = `${it?.ParliamentNumber ?? "44"}-${it?.SessionNumber ?? "1"}-${number}`;
        const stageDesc = it?.StatusNameEn ?? it?.LatestCompletedBillStageNameEn ?? "";

        const bill: NormalizedBill = {
          source: SOURCE,
          external_id: externalId,
          jurisdiction: "Canada",
          iso2: "CA",
          jurisdiction_slug: "canada",
          region: "Americas",
          bill_name: title,
          bill_number: number,
          stage: normalizeStage(it?.ReceivedRoyalAssentDateTime ? "enacted" : stageDesc),
          summary: summary || stageDesc || null,
          source_url: `https://www.parl.ca/legisinfo/en/bill/${it?.ParliamentNumber}-${it?.SessionNumber}/${number}`,
          source_name: "LEGISinfo (Parliament of Canada)",
          introduced_at: it?.PassedHouseFirstReadingDateTime?.slice(0, 10) ?? null,
          source_last_action_at: it?.LatestBillEventDateTime?.slice(0, 10) ?? null,
          matched_keywords: m.keywords,
          raw_payload: { stageDesc },
        };
        const err = validateBill(bill);
        if (err) { reject(counts, title, err); continue; }
        await upsertBill(supabase, bill, counts);
      } catch (e) {
        reject(counts, it?.ShortTitleEn, `exception:${(e as Error).message}`);
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
