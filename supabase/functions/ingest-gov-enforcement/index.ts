// Ingest enforcement actions from global DPA and government sources via Jina Reader.
// Dual-writes to both enforcement_actions (enforcement corpus for compliance tools)
// and updates (subscriber feed and weekly brief via AI enrichment).
// Government regulatory press releases and enforcement notices are public domain.
// All eight DPA scrape sources added 2026-05-19: OAIC, Datatilsynet DK/NO,
// PDPC Singapore, OPC Canada, Texas AG, Colorado AG, HHS OCR.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JINA = "https://r.jina.ai/";

interface SourceEntry {
  regulator: string;
  jurisdiction: string;
  law: string;
  url: string;
  source: string;
  secondHop?: boolean;
  ftcPage?: number;
}

const SOURCES: SourceEntry[] = [
  { regulator: "ICO", jurisdiction: "United Kingdom", law: "UK GDPR", url: "https://ico.org.uk/action-weve-taken/enforcement/", source: "ICO" },
  { regulator: "ICO", jurisdiction: "United Kingdom", law: "UK GDPR", url: "https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/", source: "ICO News" },
  // FTC cases-and-proceedings index — pages 0-10 (authoritative enforcement list).
  // Each entry uses secondHop to follow case summary pages and pull the
  // Decision/Final/Consent/Stipulated Order PDF as primary_source_url.
  ...Array.from({ length: 11 }, (_, i): SourceEntry => ({
    regulator: "FTC",
    jurisdiction: "United States",
    law: "FTC Act / COPPA / FCRA",
    url: i === 0
      ? "https://www.ftc.gov/enforcement/cases-proceedings"
      : `https://www.ftc.gov/enforcement/cases-proceedings?page=${i}`,
    source: "FTC",
    secondHop: true,
    ftcPage: i,
  })),
  { regulator: "HHS OCR", jurisdiction: "United States", law: "HIPAA", url: "https://www.hhs.gov/hipaa/for-professionals/compliance-enforcement/agreements/index.html", source: "HHS-OCR" },
  { regulator: "DPC Ireland", jurisdiction: "Ireland", law: "GDPR / Data Protection Act 2018", url: "https://www.dataprotection.ie/en/news-media/latest-news", source: "DPC Ireland" },
  { regulator: "Gibson Dunn", jurisdiction: "EU", law: "GDPR", url: "https://www.gibsondunn.com/topic/european-data-protection-newsletter/", source: "Gibson Dunn" },
  { regulator: "UODO", jurisdiction: "Poland", law: "GDPR (Poland)", url: "https://uodo.gov.pl/en/p/news-and-events", source: "UODO Poland" },
  { regulator: "OAIC", jurisdiction: "Australia", law: "Privacy Act 1988", url: "https://www.oaic.gov.au/news/media-centre", source: "OAIC" },
  { regulator: "Datatilsynet DK", jurisdiction: "Denmark", law: "GDPR (Denmark)", url: "https://www.datatilsynet.dk/english/news", source: "Datatilsynet DK" },
  { regulator: "Datatilsynet NO", jurisdiction: "Norway", law: "GDPR (Norway)", url: "https://www.datatilsynet.no/en/news/", source: "Datatilsynet NO" },
  { regulator: "PDPC Singapore", jurisdiction: "Singapore", law: "PDPA 2012", url: "https://www.pdpc.gov.sg/news-and-events/announcements", source: "PDPC Singapore" },
  { regulator: "OPC Canada", jurisdiction: "Canada", law: "PIPEDA / Privacy Act", url: "https://www.priv.gc.ca/en/news-and-events/news-and-announcements/", source: "OPC Canada" },
  { regulator: "Texas AG", jurisdiction: "Texas", law: "TDPSA", url: "https://www.texasattorneygeneral.gov/news/press-releases", source: "Texas AG" },
  { regulator: "Colorado AG", jurisdiction: "Colorado", law: "CPA", url: "https://coag.gov/press-releases/", source: "Colorado AG" },
];

// Second-hop fetcher: given an FTC case summary page URL, find the Decision and
// Order (or equivalent) PDF link. Returns null if none found.
const FTC_PRIORITY: RegExp[] = [
  /^decision\s+and\s+order$/i,
  /^final\s+order$/i,
  /^consent\s+order$/i,
  /^stipulated\s+(final\s+)?order$/i,
  /^agreement\s+containing\s+consent\s+order$/i,
  /^complaint\s+and\s+stipulated\s+order$/i,
  /^order$/i,
  /^complaint$/i,
  /^analysis\s+of\s+proposed\s+consent\s+order/i,
];

async function extractDecisionAndOrderDetail(
  caseSummaryUrl: string,
): Promise<{ url: string; anchor: string; isFallback: boolean } | null> {
  try {
    const md = await jinaFetch(caseSummaryUrl);
    const FTC_PDF_RE = /\[([^\]]+)\]\((https:\/\/www\.ftc\.gov\/system\/files\/ftc_gov\/pdf\/[^\s)]+\.pdf)[^)]*\)/gi;
    const found: Array<{ anchor: string; url: string }> = [];
    let m: RegExpExecArray | null;
    FTC_PDF_RE.lastIndex = 0;
    while ((m = FTC_PDF_RE.exec(md)) !== null) {
      found.push({ anchor: m[1].trim(), url: m[2] });
    }
    if (found.length === 0) return null;
    for (const pattern of FTC_PRIORITY) {
      const match = found.find((f) => pattern.test(f.anchor));
      if (match) return { url: match.url, anchor: match.anchor, isFallback: false };
    }
    return { url: found[0].url, anchor: found[0].anchor, isFallback: true };
  } catch {
    return null;
  }
}

async function extractDecisionAndOrderUrl(
  caseSummaryUrl: string,
): Promise<string | null> {
  const d = await extractDecisionAndOrderDetail(caseSummaryUrl);
  return d ? d.url : null;
}


async function jinaFetch(targetUrl: string): Promise<string> {
  const jinaKey = Deno.env.get("JINA_API_KEY");
  const headers: Record<string, string> = { "User-Agent": "EndUserPrivacy-Bot/1.0" };
  if (jinaKey) headers["Authorization"] = `Bearer ${jinaKey}`;
  const res = await fetch(JINA + targetUrl, { headers });
  if (!res.ok) throw new Error(`Jina failed: ${res.status}`);
  return await res.text();
}

// ── AI enrichment for updates table ───────────────────────────────
async function generateUpdateSummary(
  title: string,
  description: string,
  sourceName: string,
  regulator: string,
  jurisdiction: string,
  apiKey: string,
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        system: `You are a senior privacy regulatory analyst at a leading intelligence firm.
Analyse this enforcement action or regulatory announcement and return a single valid JSON object.
Return ONLY the JSON — no preamble, no markdown, no explanation.

VOICE: Write in direct, active voice. Lead with the compliance implication, not the regulatory action.
Do not extrapolate beyond what the title and description directly support.

SOURCE: This content comes from an official regulatory authority (${regulator}, ${jurisdiction}).
Write in direct declarative voice — this is a primary source.`,
        messages: [{
          role: "user",
          content: `Regulator: ${regulator}
Jurisdiction: ${jurisdiction}
Title: ${title}
Description: ${description || "No description available."}
Source: ${sourceName}

Return this JSON object:
{
  "why_it_matters_short": "ONE sentence (max 25 words). Name the regulator and what organisations must do or avoid.",
  "why_it_matters": "2 sentences. Lead with the compliance implication, then name the regulator, jurisdiction, and legal basis.",
  "takeaways": ["1-3 specific factual points. Each must name a regulator, law, or deadline."],
  "compliance_impact": "One sentence naming the specific organisation type and the specific action required. If monitoring only, write: 'Monitor — [what specifically] before [trigger or timeframe].'",
  "affected_jurisdictions": ["Use only these slugs: eu, united-kingdom, us-federal, california, texas, new-york, france, germany, italy, spain, ireland, netherlands, poland, belgium, denmark, sweden, norway, australia, canada, brazil, singapore, japan, south-korea, india, switzerland, hong-kong"],
  "legal_weight": "Binding | Enforcement | Guidance | Proposal | Commentary",
  "attention_level": "High | Medium | Low",
  "regulatory_theory": "The legal doctrine or principle in one sentence, or null for Commentary.",
  "action_items": [
    { "role": "DPO | Privacy Counsel | CISO | Compliance Manager", "action": "Specific step naming regulator or law", "timeframe": "Immediate (within 7 days) | This quarter | Monitor" }
  ],
  "defense_considerations": "One sentence on the strongest distinguishing factor or defence, or null.",
  "entities": {
    "regulators": ["Official abbreviated names of regulatory authorities named"],
    "companies": ["Organisations subject to this action — from content only, not training knowledge"],
    "laws": ["Specific laws with article numbers where stated"],
    "case_references": ["Case names or guidance document identifiers from content only"]
  }
}`,
        }],
      }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content?.[0]?.text || "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

// Extract markdown links + nearby date as candidate actions
function extractActions(markdown: string, src: typeof SOURCES[number]) {
  const out: Array<{ title: string; url: string; date: string | null }> = [];
  // Match markdown links: [title](url)
  const linkRe = /\[([^\]]{8,200})\]\((https?:\/\/[^\s)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(markdown)) !== null) {
    const title = m[1].trim();
    const href = m[2];
    // Only keep links that look like enforcement actions on the regulator's domain
    const host = new URL(href).hostname;
    const expectedHost = new URL(src.url).hostname;
    if (!host.includes(expectedHost.split(".").slice(-2).join("."))) continue;

    // Look for a date within 200 chars surrounding the match
    const ctx = markdown.slice(Math.max(0, m.index - 200), m.index + 200);
    const dIso = ctx.match(/\b(20\d{2}-\d{2}-\d{2})\b/)?.[1] ?? null;
    const dHuman = ctx.match(/\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})\b/i);
    let date: string | null = dIso;
    if (!date && dHuman) {
      const months: Record<string, string> = { january:"01", february:"02", march:"03", april:"04", may:"05", june:"06", july:"07", august:"08", september:"09", october:"10", november:"11", december:"12" };
      date = `${dHuman[3]}-${months[dHuman[2].toLowerCase()]}-${dHuman[1].padStart(2,"0")}`;
    }
    out.push({ title, url: href, date });
  }
  // De-dup by url
  const seen = new Set<string>();
  return out.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dry_run") === "true";
  const ftcPageParam = url.searchParams.get("ftc_page");
  const ftcPagesParam = url.searchParams.get("ftc_pages"); // e.g. "0-2" or "0,1,2"
  const onlyFtc = ftcPageParam !== null || ftcPagesParam !== null;

  let ftcPageFilter: Set<number> | null = null;
  if (ftcPageParam !== null) {
    ftcPageFilter = new Set([parseInt(ftcPageParam, 10)]);
  } else if (ftcPagesParam !== null) {
    ftcPageFilter = new Set<number>();
    if (ftcPagesParam.includes("-")) {
      const [a, b] = ftcPagesParam.split("-").map((s) => parseInt(s, 10));
      for (let i = a; i <= b; i++) ftcPageFilter.add(i);
    } else {
      for (const s of ftcPagesParam.split(",")) ftcPageFilter.add(parseInt(s, 10));
    }
  }

  const activeSources = SOURCES.filter((s) => {
    if (onlyFtc) {
      if (s.source !== "FTC") return false;
      if (ftcPageFilter && (s.ftcPage === undefined || !ftcPageFilter.has(s.ftcPage))) return false;
      return true;
      if (src.secondHop) {
        for (const a of actions) {
          await new Promise((r) => setTimeout(r, 1000));
          const detail = await extractDecisionAndOrderDetail(a.url);
          const pdfUrl = detail ? detail.url : null;
          (a as any).primarySourceUrl = pdfUrl;
          if (pdfUrl) pdfFound++; else pdfMissing++;
          if (samples.length < 10) {
            samples.push({
              title: a.title,
              case_url: a.url,
              decision_pdf_url: pdfUrl,
              matched_anchor: detail?.anchor ?? null,
              is_fallback: detail?.isFallback ?? null,
              proposed_etid: `${src.source.toLowerCase()}:${a.url}`,
            });
          }
        }
      }

      // (nav, footer, blog, and policy links share the ftc.gov host).
      if (src.secondHop && src.source === "FTC") {
        const caseRe = /^https:\/\/www\.ftc\.gov\/(legal-library\/browse|enforcement)\/cases-proceedings\/[a-z0-9][^/?#]+\/?$/i;
        actions = actions.filter((a) => caseRe.test(a.url));
      }

      summary[`${src.source}${src.ftcPage !== undefined ? `:p${src.ftcPage}` : ""}`] = actions.length;
      console.log(`${src.source}${src.ftcPage !== undefined ? ` page=${src.ftcPage}` : ""}: ${actions.length} candidate actions`);

      // Second-hop enrichment for FTC case summaries.
      if (src.secondHop) {
        for (const a of actions) {
          await new Promise((r) => setTimeout(r, 1000));
          const pdfUrl = await extractDecisionAndOrderUrl(a.url);
          (a as any).primarySourceUrl = pdfUrl;
          if (pdfUrl) pdfFound++; else pdfMissing++;
          if (samples.length < 5) {
            samples.push({
              title: a.title,
              case_url: a.url,
              decision_pdf_url: pdfUrl,
              proposed_etid: `${src.source.toLowerCase()}:${a.url}`,
            });
          }
        }
      }

      for (const a of actions) {
        const etid = `${src.source.toLowerCase()}:${a.url}`;
        const { data: existing } = await supabase
          .from("enforcement_actions")
          .select("id")
          .eq("etid", etid)
          .maybeSingle();
        if (existing) { skipped++; continue; }

        const fineMatch = a.title.match(/[£$€]\s?([\d,.]+)\s?(million|m|k|thousand)?/i);
        let fine_eur: number | null = null;
        let fine_amount: string | null = null;
        if (fineMatch) {
          fine_amount = fineMatch[0];
          let n = parseFloat(fineMatch[1].replace(/,/g, ""));
          if (/million|m\b/i.test(fineMatch[2] || "")) n *= 1_000_000;
          if (/thousand|k\b/i.test(fineMatch[2] || "")) n *= 1_000;
          if (!isNaN(n)) fine_eur = n;
        }

        const primarySourceUrl = (a as any).primarySourceUrl ?? null;
        const baseRow: Record<string, unknown> = {
          etid,
          source_database: src.source,
          source_url: a.url,
          regulator: src.regulator,
          jurisdiction: src.jurisdiction,
          law: src.law,
          subject: null,
          violation: a.title,
          decision_date: a.date,
          fine_amount,
          fine_eur,
        };
        if (src.secondHop) {
          baseRow.primary_source_url = primarySourceUrl;
          baseRow.primary_source_status = primarySourceUrl ? "pending_fetch" : "pending_discovery";
          baseRow.primary_source_url_discovered_at = new Date().toISOString();
          baseRow.legacy_enrichment_version = 2;
        }

        if (dryRun) {
          inserted++; // count would-be inserts
          // Legacy match preview
          if (src.secondHop && a.title && a.title.length > 20) {
            const { data: legacyRows } = await supabase
              .from("enforcement_actions")
              .select("id")
              .eq("regulator", "FTC")
              .is("primary_source_url", null)
              .ilike("violation", `%${a.title.slice(0, 40)}%`)
              .limit(1);
            if (legacyRows && legacyRows.length > 0) legacyUpdated++;
          }
          continue;
        }

        const { error } = await supabase.from("enforcement_actions").insert(baseRow);
        if (error) {
          errors++;
          console.error("insert enforcement_actions", etid, error.message);
          continue;
        }
        inserted++;

        // Legacy dedup: link case_url + primary PDF onto a matching legacy row.
        if (src.secondHop && a.title && a.title.length > 20) {
          const { data: legacyRows } = await supabase
            .from("enforcement_actions")
            .select("id, violation, source_url")
            .eq("regulator", "FTC")
            .is("primary_source_url", null)
            .ilike("violation", `%${a.title.slice(0, 40)}%`)
            .limit(1);
          if (legacyRows && legacyRows.length > 0) {
            const { error: updErr } = await supabase
              .from("enforcement_actions")
              .update({
                source_url: a.url,
                primary_source_url: primarySourceUrl,
                primary_source_status: primarySourceUrl ? "pending_fetch" : "pending_discovery",
                primary_source_url_discovered_at: new Date().toISOString(),
              })
              .eq("id", legacyRows[0].id);
            if (!updErr) legacyUpdated++;
          }
        }

        // Dual-write to updates table (skip for FTC second-hop scrape: cases
        // index entries aren't suitable for the subscriber feed — handled by
        // existing weekly brief pipeline instead).
        if (anthropicKey && !src.secondHop) {
          try {
            const aiSummary = await generateUpdateSummary(
              a.title, a.title, src.source, src.regulator, src.jurisdiction, anthropicKey,
            );
            if (aiSummary && aiSummary.legal_weight !== undefined) {
              const updateRow: Record<string, unknown> = {
                url: a.url,
                title: a.title,
                summary: a.title,
                source_name: src.source,
                source_url: src.url,
                category: "enforcement",
                published_at: a.date ? new Date(a.date).toISOString() : new Date().toISOString(),
                source_tier: 1,
                legal_weight: aiSummary.legal_weight ?? "Enforcement",
                attention_level: aiSummary.attention_level ?? "High",
                why_it_matters_short: aiSummary.why_it_matters_short ?? null,
                why_it_matters: aiSummary.why_it_matters ?? null,
                compliance_impact: aiSummary.compliance_impact ?? null,
                takeaways: aiSummary.takeaways ?? [],
                affected_jurisdictions: aiSummary.affected_jurisdictions ?? [],
                regulatory_theory: aiSummary.regulatory_theory ?? null,
                action_items: aiSummary.action_items ?? [],
                defense_considerations: aiSummary.defense_considerations ?? null,
                entities: aiSummary.entities ?? {},
                ai_summary: aiSummary,
                direct_jurisdictions: Array.isArray(aiSummary.affected_jurisdictions)
                  ? aiSummary.affected_jurisdictions : [],
              };
              const { error: updateErr } = await supabase
                .from("updates")
                .upsert(updateRow, { onConflict: "url", ignoreDuplicates: true });
              if (updateErr) console.error("dual-write updates failed", a.url, updateErr.message);
            }
          } catch (aiErr) {
            console.error("generateUpdateSummary failed", a.url, aiErr);
          }
        }
      }
      await new Promise((r) => setTimeout(r, 800));
    } catch (e) {
      errors++;
      console.error(src.source, (e as Error).message);
    }
  }

  const finalResult = {
    dry_run: dryRun,
    ftc_pages: ftcPageFilter ? [...ftcPageFilter] : null,
    inserted, skipped, errors, legacy_updated: legacyUpdated,
    pdf_found: pdfFound, pdf_missing: pdfMissing,
    summary, samples,
  };
  console.log("FINAL_RESULT", JSON.stringify(finalResult));
  return new Response(JSON.stringify(finalResult),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

