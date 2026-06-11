// Ingest U.S. STATE privacy bills via the LegiScan API.
// Mirrors the structure of ingest-legislation-us (Congress.gov).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  startRun, finishRun, upsertBill, newRunCounts, validateBill, reject,
  matchTopicKeywords, normalizeStage, markStaleBills, type NormalizedBill,
} from "../_shared/legislation-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SOURCE = "us-states-legiscan";

const SEARCHES: { query: string; tag: string }[] = [
  {
    query: '"consumer privacy" OR "personal information protection" OR "data privacy"',
    tag: "search:consumer-privacy",
  },
  {
    query: '"biometric privacy" OR "data broker" OR "age-appropriate design" OR "children\'s online safety"',
    tag: "search:biometric-broker-youth",
  },
  {
    query: '"health data privacy" OR "genetic privacy" OR "automated decision" OR "artificial intelligence accountability"',
    tag: "search:health-adm-ai",
  },
];

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LEGISCAN_API_KEY = Deno.env.get("LEGISCAN_API_KEY");
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const startedMs = Date.now();
  const counts = newRunCounts();
  let runId: string | null = null;

  try {
    runId = await startRun(supabase, SOURCE);
    if (!LEGISCAN_API_KEY) throw new Error("LEGISCAN_API_KEY not configured");

    const seenBillIds = new Set<string>();

    for (const search of SEARCHES) {
      let pageTotal = 4;
      for (let page = 1; page <= Math.min(4, pageTotal); page++) {
        const url = `https://api.legiscan.com/?key=${LEGISCAN_API_KEY}&op=getSearch&state=ALL&year=2&page=${page}&query=${encodeURIComponent(search.query)}`;
        await sleep(200);
        const res = await fetch(url);
        if (!res.ok) {
          reject(counts, undefined, `legiscan_http_${res.status}_q${SEARCHES.indexOf(search)}_p${page}`);
          break;
        }
        const json = await res.json();
        if (json?.status === "ERROR") {
          const alert = json?.alert?.message ?? "unknown";
          reject(counts, undefined, `legiscan_error_${alert}`);
          break;
        }

        const sr = json?.searchresult;
        if (!sr) break;

        let entries: any[] = [];
        let summary: any = null;
        if (Array.isArray(sr)) {
          entries = sr;
        } else {
          for (const [k, v] of Object.entries(sr)) {
            if (k === "summary") { summary = v; continue; }
            entries.push(v);
          }
        }

        if (summary?.page_total) pageTotal = Number(summary.page_total) || pageTotal;
        if (entries.length === 0) break;
        counts.fetched += entries.length;

        for (const result of entries) {
          try {
            const state: string = result?.state ?? "";
            if (state === "US") continue;

            const relevance = Number(result?.relevance ?? 0);
            if (relevance < 50) continue;

            const billId = result?.bill_id;
            if (!billId) { reject(counts, result?.title, "missing_bill_id"); continue; }
            const billIdStr = String(billId);
            if (seenBillIds.has(billIdStr)) continue;
            seenBillIds.add(billIdStr);

            const stateName = STATE_NAMES[state];
            const title: string = result?.title ?? "";
            if (!stateName) { reject(counts, title, "unknown_state_code"); continue; }

            const kw = matchTopicKeywords(title);
            const matched = kw.length > 0 ? kw : [search.tag];

            const lastAction: string = result?.last_action ?? "";
            const lastActionDate: string = result?.last_action_date ?? "";

            const bill: NormalizedBill = {
              source: SOURCE,
              external_id: billIdStr,
              jurisdiction: stateName,
              iso2: "US",
              jurisdiction_slug: null,
              region: "Americas",
              bill_name: title,
              bill_number: result?.bill_number ?? "",
              stage: normalizeStage(lastAction),
              summary: lastAction || null,
              key_provisions: [],
              source_url: result?.url ?? null,
              source_name: "LegiScan",
              introduced_at: null,
              source_last_action_at: lastActionDate ? lastActionDate.slice(0, 10) : null,
              matched_keywords: matched,
              raw_payload: {
                state,
                relevance,
                change_hash: result?.change_hash,
                text_url: result?.text_url,
              },
            };

            const err = validateBill(bill);
            if (err) { reject(counts, title, err); continue; }
            await upsertBill(supabase, bill, counts);
          } catch (e) {
            reject(counts, result?.title, `exception:${(e as Error).message}`);
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
