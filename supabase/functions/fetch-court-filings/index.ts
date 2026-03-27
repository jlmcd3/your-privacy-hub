import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const SEARCH_TERMS = [
  "BIPA biometric",
  "VPPA video privacy",
  "CIPA wiretap privacy",
  "CCPA class action",
  "facial recognition privacy lawsuit",
];

Deno.serve(async () => {
  const results = { inserted: 0, skipped: 0, errors: [] as string[] };
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];

  for (const term of SEARCH_TERMS) {
    try {
      const url = `https://www.courtlistener.com/api/rest/v4/dockets/?q=${encodeURIComponent(term)}&type=r&order_by=date_created&filed_after=${since}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "EndUserPrivacy/1.0 (contact@enduserprivacy.com)" },
        signal: AbortSignal.timeout(12000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      for (const docket of (json.results || []).slice(0, 5)) {
        const company = docket.case_name || "Privacy lawsuit";
        const court = docket.court_id?.toUpperCase() || "Federal";
        const docketNum = docket.docket_number || "N/A";
        const filed = docket.date_filed || "recently";
        const articleUrl = `https://www.courtlistener.com${docket.absolute_url}`;
        const tags: string[] = ["privacy-litigation"];
        if (term.includes("BIPA") || company.toLowerCase().includes("bipa")) tags.push("biometric-data");

        const { error } = await supabase.from("updates").upsert({
          title: `Privacy Lawsuit Filed: ${company} — ${court}`.slice(0, 400),
          summary: `Case filed ${filed}. Docket: ${docketNum}. Query: ${term}.`.slice(0, 500),
          url: articleUrl,
          source_name: "CourtListener",
          source_domain: "courtlistener.com",
          category: "enforcement",
          topic_tags: tags,
          regulator: "Federal Court",
          published_at: docket.date_filed ? new Date(docket.date_filed).toISOString() : new Date().toISOString(),
          is_premium: false,
        }, { onConflict: "url", ignoreDuplicates: true });

        if (error) results.skipped++;
        else results.inserted++;
      }
    } catch (e: any) {
      results.errors.push(`CourtListener [${term}]: ${e.message}`);
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
