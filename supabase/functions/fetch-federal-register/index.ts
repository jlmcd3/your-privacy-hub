import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startRun, finishRun, failRun } from "../_shared/run-logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Federal Register agency slugs. NOTE: there is no separate slug for
// "HHS Office for Civil Rights" — the API only recognises the parent
// "health-and-human-services-department". Using the wrong slug returns
// HTTP 400 {"errors":{"agencies":"invalid value"}} and (because all
// agencies were previously bundled into one request) wiped out the
// entire run. We now query per-agency so a single bad slug only skips
// that one agency.
const AGENCIES = [
  "federal-trade-commission",
  "health-and-human-services-department", // covers OCR / HIPAA
  "consumer-financial-protection-bureau",
  "national-institute-of-standards-and-technology",
  "federal-communications-commission",
];

const TYPES = ["RULE", "PRORULE", "NOTICE"];

async function fetchAgency(agencySlug: string, since: string) {
  const url = new URL("https://www.federalregister.gov/api/v1/articles.json");
  url.searchParams.append("conditions[agencies][]", agencySlug);
  for (const t of TYPES) url.searchParams.append("conditions[type][]", t);
  url.searchParams.set("conditions[publication_date][gte]", since);
  url.searchParams.set("order", "newest");
  url.searchParams.set("per_page", "20");

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.results || [];
}

Deno.serve(async () => {
  const run = await startRun(supabase, "fetch-federal-register", { agencies: AGENCIES.length });
  const results = { inserted: 0, skipped: 0, fetched: 0, errors: [] as string[] };
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];

  try {
    for (const agency of AGENCIES) {
      let docs: any[] = [];
      try {
        docs = await fetchAgency(agency, since);
      } catch (e: any) {
        results.errors.push(`${agency}: ${e.message}`);
        continue;
      }

      for (const doc of docs) {
        results.fetched++;
        const docUrl = doc.html_url || doc.pdf_url || "";
        if (!docUrl) {
          results.skipped++;
          continue;
        }
        // Filter out low-value federal notices: meetings and job postings.
        const titleLower = (doc.title || "").toLowerCase();
        if (
          /notice of (a |an )?(public )?meeting/.test(titleLower) ||
          /sunshine act meeting/.test(titleLower) ||
          /notice of (a |an )?(available )?position/.test(titleLower) ||
          /notice of (a |an )?(job )?(opening|vacancy)/.test(titleLower)
        ) {
          results.skipped++;
          continue;
        }
        const legalWeight = doc.type === "Rule" || doc.type === "RULE" ? "Binding" : "Proposal";
        const agencyName = doc.agencies?.[0]?.name || "Federal Agency";

        const { error } = await supabase.from("updates").upsert(
          {
            title: (doc.title || "Federal Register Notice").slice(0, 400),
            summary: (doc.abstract || doc.excerpt || `${doc.type} published by ${agencyName}`).slice(0, 500),
            url: docUrl,
            source_name: "Federal Register",
            source_domain: "federalregister.gov",
            category: "us-federal",
            topic_tags: ["us-rulemaking"],
            regulator: agencyName,
            published_at: doc.publication_date
              ? new Date(doc.publication_date).toISOString()
              : new Date().toISOString(),
            is_premium: false,
            ai_summary: { legal_weight: legalWeight, source_strength: "Primary regulator" },
          },
          { onConflict: "url", ignoreDuplicates: true },
        );

        if (error) {
          results.skipped++;
          results.errors.push(`upsert ${docUrl}: ${error.message}`);
        } else {
          results.inserted++;
        }
      }
    }
  } catch (e: any) {
    results.errors.push(`FedReg fatal: ${e.message}`);
    await failRun(supabase, run, e, { inserted: results.inserted, skipped: results.skipped });
    return new Response(JSON.stringify(results), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  await finishRun(supabase, run, {
    inserted: results.inserted,
    skipped: results.skipped,
    fetched: results.fetched,
    metadata: { errors: results.errors },
  });

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
