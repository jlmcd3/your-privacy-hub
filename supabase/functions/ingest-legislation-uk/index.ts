// Ingest UK Parliament bills via the open Bills API. No key required.
// https://bills-api.parliament.uk
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  startRun, finishRun, upsertBill, newRunCounts, validateBill, reject,
  isPrivacyRelated, normalizeStage, markStaleBills, type NormalizedBill,
} from "../_shared/legislation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SOURCE = "uk-parliament";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const startedMs = Date.now();
  const counts = newRunCounts();
  let runId: string | null = null;

  try {
    runId = await startRun(supabase, SOURCE);

    // Pull bills updated in the last ~180 days, then keyword-filter.
    for (let skip = 0; skip < 600; skip += 100) {
      const url = `https://bills-api.parliament.uk/api/v1/Bills?SortOrder=DateUpdatedDescending&Take=100&Skip=${skip}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) { reject(counts, undefined, `list_http_${res.status}`); break; }
      const json = await res.json();
      const items = json?.items ?? [];
      if (!items.length) break;
      counts.fetched += items.length;

      for (const it of items) {
        try {
          const title: string = it?.shortTitle ?? it?.longTitle ?? "";
          const summary: string = it?.summary ?? "";
          const m = isPrivacyRelated(title, summary);
          if (!m.match) continue;

          const stageDesc = it?.currentStage?.description ?? it?.currentHouse ?? "";
          const stage = normalizeStage(
            it?.isAct ? "enacted" : it?.billWithdrawn ? "withdrawn" : stageDesc,
          );
          const externalId = `bill-${it?.billId}`;

          const bill: NormalizedBill = {
            source: SOURCE,
            external_id: externalId,
            jurisdiction: "United Kingdom",
            iso2: "GB",
            jurisdiction_slug: "united-kingdom",
            region: "Europe",
            bill_name: title,
            bill_number: it?.billId ? String(it.billId) : null,
            stage,
            summary: summary || stageDesc || null,
            key_provisions: [],
            source_url: `https://bills.parliament.uk/bills/${it?.billId}`,
            source_name: "UK Parliament",
            introduced_at: it?.introducedSittingDate?.slice(0, 10) ?? null,
            source_last_action_at: it?.lastUpdate?.slice(0, 10) ?? null,
            matched_keywords: m.keywords,
            raw_payload: { stageDesc, isAct: it?.isAct, withdrawn: it?.billWithdrawn },
          };
          const err = validateBill(bill);
          if (err) { reject(counts, title, err); continue; }
          await upsertBill(supabase, bill, counts);
        } catch (e) {
          reject(counts, it?.shortTitle, `exception:${(e as Error).message}`);
        }
      }
      if (items.length < 100) break;
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
