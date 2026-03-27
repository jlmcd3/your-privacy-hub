import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async () => {
  const results = { inserted: 0, skipped: 0, errors: [] as string[] };
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  try {
    const searchUrl = [
      "https://efts.sec.gov/LATEST/search-index",
      `?q=%22Item+1.05%22+%22cybersecurity+incident%22`,
      `&dateRange=custom&startdt=${since}&enddt=${today}`,
      `&forms=8-K`,
    ].join("");

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": "EndUserPrivacy/1.0 contact@enduserprivacy.com",
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const hits = json.hits?.hits || [];

    for (const hit of hits.slice(0, 10)) {
      const src = hit._source || {};
      const companyNames: string[] = src.display_names || [];
      const company = companyNames[0] || src.entity_name || "Public Company";
      const fileDate: string = src.file_date || src.period_of_report || today;
      const entityId: string = src.entity_id || "";
      const accessionNo: string = (src.accession_no || "").replace(/-/g, "");

      const filingUrl = accessionNo && entityId
        ? `https://www.sec.gov/Archives/edgar/data/${entityId}/${accessionNo}/${accessionNo}-index.htm`
        : `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&dateb=&owner=include&count=40`;

      const { error } = await supabase.from("updates").upsert({
        title: `SEC Breach Disclosure: ${company} — Item 1.05 Cybersecurity Incident`.slice(0, 400),
        summary: `${company} disclosed a material cybersecurity incident (8-K Item 1.05) on ${fileDate}. Required under SEC cybersecurity disclosure rules (December 2023).`.slice(0, 500),
        url: filingUrl,
        source_name: "SEC EDGAR",
        source_domain: "sec.gov",
        category: "enforcement",
        topic_tags: ["data-breaches"],
        regulator: "Securities and Exchange Commission",
        published_at: new Date(fileDate).toISOString(),
        is_premium: false,
        ai_summary: {
          legal_weight: "Enforcement",
          source_strength: "Primary regulator",
          urgency: "Immediate",
        },
      }, { onConflict: "url", ignoreDuplicates: true });

      if (error) results.skipped++;
      else results.inserted++;
    }
  } catch (e: any) {
    results.errors.push(`SEC EDGAR: ${e.message}`);
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
