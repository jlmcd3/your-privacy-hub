import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const CONGRESS_KEY = Deno.env.get("CONGRESS_API_KEY");

const SEARCH_TERMS = [
  "privacy data protection",
  "American Data Privacy Protection",
  "COPPA children online privacy",
  "Kids Online Safety",
  "artificial intelligence governance",
];

import { startRun, finishRun, failRun } from "../_shared/run-logger.ts";

Deno.serve(async () => {
  const run = await startRun(supabase, "fetch-congress-bills", { terms: SEARCH_TERMS.length });

  if (!CONGRESS_KEY) {
    await failRun(supabase, run, new Error("CONGRESS_API_KEY not set"));
    return new Response(
      JSON.stringify({ error: "CONGRESS_API_KEY not set — register free at api.congress.gov" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const results = { inserted: 0, skipped: 0, errors: [] as string[] };

  try {
    for (const term of SEARCH_TERMS) {
      try {
        const url = `https://api.congress.gov/v3/bill?query=${encodeURIComponent(term)}&sort=updateDate+desc&limit=10&api_key=${CONGRESS_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        for (const bill of (json.bills || [])) {
          const billTitle = bill.title || bill.shortTitle || "Privacy Bill";
          const congress = bill.congress || "";
          const billType = (bill.type || "").toLowerCase();
          const billNum = bill.number || "";
          const latestAction = bill.latestAction?.text || "";
          const actionDate = bill.latestAction?.actionDate || "";
          const billUrl = `https://www.congress.gov/bill/${congress}th-congress/${billType}-bill/${billNum}`;

          const { error } = await supabase.from("updates").upsert({
            title: `${billTitle} (${bill.type || ""}${billNum}, ${congress}th Congress)`.slice(0, 400),
            summary: (latestAction || "See Congress.gov for latest action.").slice(0, 500),
            url: billUrl,
            source_name: "Congress.gov",
            source_domain: "congress.gov",
            category: "us-federal",
            topic_tags: ["us-legislation"],
            regulator: "U.S. Congress",
            published_at: actionDate ? new Date(actionDate).toISOString() : new Date().toISOString(),
            is_premium: false,
            ai_summary: { legal_weight: "Proposal", source_strength: "Primary regulator" },
          }, { onConflict: "url", ignoreDuplicates: true });

          if (error) results.skipped++;
          else results.inserted++;
        }
      } catch (e: any) {
        results.errors.push(`Congress [${term}]: ${e.message}`);
      }
    }
  } catch (e) {
    await failRun(supabase, run, e, { inserted: results.inserted, skipped: results.skipped });
    return new Response(JSON.stringify({ ...results, error: (e as Error).message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  await finishRun(supabase, run, {
    inserted: results.inserted,
    skipped: results.skipped,
    fetched: results.inserted + results.skipped,
    metadata: { errors: results.errors },
  });

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
