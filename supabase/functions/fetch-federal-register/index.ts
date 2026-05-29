import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startRun, finishRun, failRun } from "../_shared/run-logger.ts";
import { isPrivacyRelated } from "../_shared/legislation-engine.ts";

// Additional privacy/security terms specific to federal regulator output that
// the shared legislation keyword set may miss. Combined with the shared list,
// these keep Federal Register ingestion narrowly scoped to privacy / data /
// cybersecurity / AI rulemakings.
const EXTRA_PRIVACY_KEYWORDS = [
  "hipaa", "health insurance portability", "protected health information",
  "glba", "gramm-leach", "coppa", "ferpa",
  "safeguards rule", "red flags rule",
  "data broker", "dark pattern", "geolocation", "tracking technologies",
  "identity theft", "telemarketing", "robocall", "tcpa", "do not call",
  "unfair or deceptive", "consumer review", "ai risk management",
  "encryption", "ransomware", "incident reporting",
];

function isFederalPrivacyRelevant(...texts: (string | null | undefined)[]): boolean {
  const combined = texts.filter(Boolean).join(" \n ").toLowerCase();
  if (!combined) return false;
  if (isPrivacyRelated(combined).match) return true;
  return EXTRA_PRIVACY_KEYWORDS.some((kw) => combined.includes(kw));
}

// Hard exclusions: even if a stray keyword matches, these are clearly not
// privacy/data-protection content and should never land in the feed.
const EXCLUSION_PATTERNS: RegExp[] = [
  /notice of (a |an )?(public |closed )?meeting/i,
  /sunshine act meeting/i,
  /notice of (a |an )?(available )?position/i,
  /notice of (a |an )?(job )?(opening|vacancy)/i,
  /advisory committee/i,
  /\binformation collection\b/i,
  /paperwork reduction act/i,
  /agency information collection/i,
  /medicaid|medicare|hospital inpatient|prospective payment/i,
  /vaccine injury|clinical electronic|clinical trial|product-specific guidance/i,
  /food and drug|new animal drug|infant formula|cigarette package/i,
  /tropical disease|communicable disease|public health service act/i,
  /patent term restoration/i,
  /scientific review|national cancer institute|national institute on/i,
  /grant (application|award|opportunity)/i,
  /budget (request|submission)/i,
];

function isExcluded(title: string, summary: string): boolean {
  const blob = `${title}\n${summary}`;
  return EXCLUSION_PATTERNS.some((re) => re.test(blob));
}

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
  const results = { inserted: 0, skipped: 0, fetched: 0, filtered_irrelevant: 0, errors: [] as string[] };
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
        const title = doc.title || "";
        const summary = doc.abstract || doc.excerpt || "";

        // Hard exclusions: meetings, PRA notices, FDA drug clearances, Medicaid,
        // grants, job postings, vaccine/clinical, etc.
        if (isExcluded(title, summary)) {
          results.filtered_irrelevant++;
          continue;
        }

        // Privacy / data protection / cybersecurity / AI relevance gate.
        // Title OR abstract must contain a topic keyword.
        if (!isFederalPrivacyRelevant(title, summary)) {
          results.filtered_irrelevant++;
          continue;
        }

        const legalWeight = doc.type === "Rule" || doc.type === "RULE" ? "Binding" : "Proposal";
        const agencyName = doc.agencies?.[0]?.name || "Federal Agency";

        const { error } = await supabase.from("updates").upsert(
          {
            title: (title || "Federal Register Notice").slice(0, 400),
            summary: (summary || `${doc.type} published by ${agencyName}`).slice(0, 500),
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
            // Leave ai_summary NULL so backfill-ai-summaries cron enriches it on the next pass.
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
    metadata: { errors: results.errors, filtered_irrelevant: results.filtered_irrelevant },
  });

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
});
