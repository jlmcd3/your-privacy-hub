import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const AGENCIES = [
  "federal-trade-commission",
  "hhs-office-for-civil-rights",
  "consumer-financial-protection-bureau",
  "national-institute-of-standards-and-technology",
  "federal-communications-commission",
];

Deno.serve(async () => {
  const results = { inserted: 0, skipped: 0, errors: [] as string[] };
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    const agencyParams = AGENCIES.map(a => `conditions[agencies][]=${a}`).join("&");
    const typeParams = ["RULE","PRORULE","NOTICE"].map(t => `conditions[type][]=${t}`).join("&");
    const url = `https://www.federalregister.gov/api/v1/articles.json?${agencyParams}&${typeParams}&conditions[publication_date][gte]=${since}&order=newest&per_page=20`;

    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    for (const doc of (json.results || [])) {
      const docUrl = doc.html_url || doc.pdf_url || "";
      if (!docUrl) continue;
      const legalWeight = doc.type === "RULE" ? "Binding" : "Proposal";
      const agencyName = doc.agencies?.[0]?.name || "Federal Agency";

      const { error } = await supabase.from("updates").upsert({
        title: (doc.title || "Federal Register Notice").slice(0, 400),
        summary: (doc.abstract || doc.excerpt || `${doc.type} published by ${agencyName}`).slice(0, 500),
        url: docUrl,
        source_name: "Federal Register",
        source_domain: "federalregister.gov",
        category: "us-federal",
        topic_tags: ["us-rulemaking"],
        regulator: agencyName,
        published_at: doc.publication_date ? new Date(doc.publication_date).toISOString() : new Date().toISOString(),
        is_premium: false,
        ai_summary: { legal_weight: legalWeight, source_strength: "Primary regulator" },
      }, { onConflict: "url", ignoreDuplicates: true });

      if (error) results.skipped++;
      else results.inserted++;
    }
  } catch (e: any) {
    results.errors.push(`FedReg: ${e.message}`);
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
