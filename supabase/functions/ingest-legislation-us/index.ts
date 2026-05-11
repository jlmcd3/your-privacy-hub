// Ingest US federal bills from Congress.gov (current congress) and filter on privacy keywords.
// Uses the existing CONGRESS_API_KEY secret. Free, well-documented JSON API.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  startRun, finishRun, upsertBill, newRunCounts, validateBill, reject,
  isPrivacyRelated, normalizeStage, markStaleBills, type NormalizedBill,
} from "../_shared/legislation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCE = "us-congress";
const BASE = "https://api.congress.gov/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const CONGRESS_API_KEY = Deno.env.get("CONGRESS_API_KEY");
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const startedMs = Date.now();
  const counts = newRunCounts();
  let runId: string | null = null;

  try {
    runId = await startRun(supabase, SOURCE);
    if (!CONGRESS_API_KEY) throw new Error("CONGRESS_API_KEY not configured");

    // Pull recent bills, paginate up to 4 pages of 250.
    const congress = 119; // 119th Congress (2025-2027). Update annually.
    for (const billType of ["hr", "s"]) {
      for (let offset = 0; offset < 1000; offset += 250) {
        const url = `${BASE}/bill/${congress}/${billType}?api_key=${CONGRESS_API_KEY}&format=json&limit=250&offset=${offset}&sort=updateDate+desc`;
        const res = await fetch(url);
        if (!res.ok) {
          reject(counts, undefined, `list_${billType}_${offset}_http_${res.status}`);
          break;
        }
        const json = await res.json();
        const bills = json?.bills ?? [];
        if (!bills.length) break;
        counts.fetched += bills.length;

        for (const b of bills) {
          try {
            const title: string = b?.title ?? "";
            const number: string = b?.number ? `${billType.toUpperCase()}.${b.number}` : "";
            const externalId = `${congress}-${billType}-${b?.number}`;

            // Cheap keyword pre-filter on title only (skips API call for irrelevant bills).
            const titleMatch = isPrivacyRelated(title);
            if (!titleMatch.match) {
              counts.unchanged += 0; // not counted as rejected; just skipped silently
              continue;
            }

            // Fetch detail for summary.
            const detailUrl = `${BASE}/bill/${congress}/${billType}/${b.number}?api_key=${CONGRESS_API_KEY}&format=json`;
            const dRes = await fetch(detailUrl);
            const detail = dRes.ok ? await dRes.json() : null;
            const summary: string =
              detail?.bill?.summaries?.[0]?.text?.replace(/<[^>]+>/g, "").trim() ?? "";

            const combined = isPrivacyRelated(title, summary);
            if (!combined.match) {
              reject(counts, title, "no_topic_keywords");
              continue;
            }

            const latestAction = b?.latestAction?.text ?? "";
            const stage = normalizeStage(latestAction);
            const introducedAt = b?.introducedDate ?? null;
            const lastAction = b?.latestAction?.actionDate ?? b?.updateDate ?? null;

            const bill: NormalizedBill = {
              source: SOURCE,
              external_id: externalId,
              jurisdiction: "United States",
              iso2: "US",
              jurisdiction_slug: null, // no jurisdiction page for US Federal yet
              region: "Americas",
              bill_name: title,
              bill_number: number,
              stage,
              summary: summary || latestAction || null,
              key_provisions: [],
              source_url: `https://www.congress.gov/bill/${congress}th-congress/${billType === "hr" ? "house-bill" : "senate-bill"}/${b.number}`,
              source_name: "Congress.gov",
              introduced_at: introducedAt,
              source_last_action_at: lastAction ? lastAction.slice(0, 10) : null,
              matched_keywords: combined.keywords,
              raw_payload: { latestAction, congress, billType, number: b.number },
            };

            const err = validateBill(bill);
            if (err) { reject(counts, title, err); continue; }
            await upsertBill(supabase, bill, counts);

            // Be polite to Congress.gov.
            await new Promise((r) => setTimeout(r, 50));
          } catch (e) {
            reject(counts, b?.title, `exception:${(e as Error).message}`);
          }
        }
      }
    }

    await markStaleBills(supabase, SOURCE);
    await finishRun(supabase, runId, startedMs, counts, "success");
    return new Response(JSON.stringify({ ok: true, counts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (runId) await finishRun(supabase, runId, startedMs, counts, "failed", msg);
    return new Response(JSON.stringify({ ok: false, error: msg, counts }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
