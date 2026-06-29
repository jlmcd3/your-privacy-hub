import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAISummary, checkDateConsistency } from "../_shared/ai-validation.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Relevance & categorization (mirrors fetch-updates logic) ──────
const REQUIRED_KEYWORDS = [
  "privacy", "data protection", "personal data", "gdpr", "ccpa", "cpra",
  "data breach", "data security", "surveillance", "tracking", "consent",
  "data subject", "data controller", "data processor",
  "opt-out", "opt out", "cookie", "biometric",
  "edpb", "ico ", "cnil", "dpc ", "anpd", "cppa", "ftc ", "nist",
  "information commissioner", "data protection authority", "dpa ",
  "attorney general", "privacy commissioner",
  "lgpd", "pipl", "pdpa", "tdpsa", "vcdpa", "coppa", "hipaa",
  "privacy act", "privacy law", "privacy regulation", "privacy rule",
  "privacy bill", "privacy legislation", "data privacy",
  "privacy fine", "privacy penalty", "privacy enforcement",
  "ai privacy", "ai regulation", "ai act", "facial recognition",
  "generative ai", "algorithmic", "automated decision",
  "real-time bidding", "programmatic advertising", "consent management",
  "cookie consent", "third-party cookie", "behavioral advertising",
  "targeted advertising", "commercial surveillance", "privacy sandbox",
  "dpdp act", "digital personal data protection", "pdpc",
  "admt", "automated decision making technology",
  "8-k cybersecurity", "material cybersecurity incident",
  "duaa", "data use and access act",
  "ai act enforcement", "high-risk ai",
];

const EXCLUSION_KEYWORDS = [
  "freedom of information", "foia request", "public records request",
  "net neutrality", "section 230", "copyright infringement",
  "free speech", "first amendment", "open source license",
  "patent lawsuit", "antitrust", "merger review",
  "trade secret", "whistleblower",
];

const BREACH_ANNOUNCEMENT_PATTERNS = [
  /\bannounce[sd]?\s+data\s+breach/i,
  /\bdata\s+breach\s+(affects?|impacts?|exposes?|compromises?)\b/i,
  /\bdata\s+breach\s+more\s+than\s+\d/i,
  /\b\d[\d,]+\s+(individuals?|patients?|customers?|records?|accounts?)\s+(affected|exposed|compromised|impacted)/i,
  /\bnotif(y|ies|ied|ying)\s+(patients?|customers?|individuals?|consumers?)\s+(of|about)\s+(a\s+)?data\s+breach/i,
  /\bdata\s+breach\s+(notification|notice|disclosure|report)\b/i,
  /\bsecurity\s+incident\s+(notification|notice|disclosure)\b/i,
  /\b(ransomware|phishing|malware)\s+attack\b/i,
  /\bunauthorized\s+access\s+to\s+(patient|customer|employee|personal)\b/i,
  /\bbreach\s+(litigation|settlement|class\s+action)\b/i,
  /\bsettlement\s+(reached|approved|agreement)\b/i,
  /\bpays?\s+\$[\d.]+[MBK]?\s+to\s+settle\b/i,
  /\bdata\s+breach\s+settlement\b/i,
];

const REGULATORY_OVERRIDE_PATTERNS = [
  /\b(new|proposed|enacted|signed|passed|amended)\s+(law|bill|regulation|statute|act|rule|ordinance)\b/i,
  /\b(rulemaking|notice of proposed|final rule|enforcement action by)\b/i,
  /\b(guidance|guidelines?|opinion|recommendation)\s+(issued|published|released|adopted)\s+by\b/i,
  /\b(dpa|regulator|authority|commission|commissioner)\s+(issues?|publishes?|announces?|releases?|adopts?)\b/i,
  /\b(fine[sd]?|penalt(y|ies)|sanction[sed]?)\s+(by|from|imposed)\b/i,
  /\b(gdpr|ccpa|cpra|tdpsa|vcdpa|ctdpa|coppa|hipaa|lgpd|pipl|pdpa|dpdp|ai act|duaa)\s+(enforcement|compliance|violation|fine|amendment|update)\b/i,
];

// First-person "we updated our privacy policy" company announcements — pure noise.
const POLICY_UPDATE_NOTICE_PATTERNS = [
  /\b(we|we[''']ve|we\s+have|we\s+are|we[''']re)\s+(updated|updating|revised|revising|changed|changing|made\s+changes\s+to)\s+(our|the)\s+privacy\s+(policy|notice|statement)\b/i,
  /\b(update|updates|changes|revision|amendment)s?\s+to\s+(our|the)\s+privacy\s+(policy|notice|statement)\b/i,
  /\b(our|the)\s+(new|updated|revised)\s+privacy\s+(policy|notice|statement)\b/i,
  /\bnotice\s+of\s+(changes?|updates?|amendments?)\s+to\s+(our|the)?\s*privacy\s+(policy|notice|statement)\b/i,
  /^\s*privacy\s+(policy|notice|statement)\s+(update|notice|change|revision)s?\s*$/i,
];

function isRelevant(title: string, description: string): boolean {
  const text = (title + " " + (description || "")).toLowerCase();
  const titleLower = title.toLowerCase();

  // Drop company "we updated our privacy policy" announcements.
  const combined = title + " " + (description || "");
  if (POLICY_UPDATE_NOTICE_PATTERNS.some(p => p.test(combined))) return false;

  // Filter out breach announcements unless they're about regulatory action
  const isBreach = BREACH_ANNOUNCEMENT_PATTERNS.some(p => p.test(title + " " + (description || "")));
  if (isBreach) {
    const isRegulatory = REGULATORY_OVERRIDE_PATTERNS.some(p => p.test(title + " " + (description || "")));
    if (!isRegulatory) return false;
  }

  const TITLE_KEYWORDS = [
    "privacy", "data protection", "gdpr", "ccpa", "cpra",
    "enforcement", "fine", "penalty", "regulator", "dpa", "edpb",
    "cnil", "ftc ", "cppa", "lgpd", "pipl", "ai act", "biometric",
    "personal data", "data security", "privacy law", "consent",
    "adtech", "cookie consent", "behavioral advertising",
    "dpdp act", "india privacy", "australia privacy", "brazil lgpd",
    "eu ai act", "automated decision", "data broker",
    "new law", "new regulation", "proposed rule", "final rule",
    "rulemaking", "legislative", "statute", "enacted", "compliance",
  ];
  const titleHasKeyword = TITLE_KEYWORDS.some(k => titleLower.includes(k));
  if (!titleHasKeyword) return false;
  const isExcluded = EXCLUSION_KEYWORDS.some(k => text.includes(k));
  if (isExcluded) return false;
  const matchCount = REQUIRED_KEYWORDS.filter(k => text.includes(k.toLowerCase())).length;
  return matchCount >= 2;
}

function categorize(title: string, description: string): string {
  const text = (title + " " + description).toLowerCase();
  if (/\b(class action|lawsuit filed|bipa|vppa|cipa|wiretap|settlement reached|jury verdict)\b/.test(text)) return "enforcement";
  if (/\b(adtech|ad tech|real-time bidding|programmatic|tcf|cookie consent|privacy sandbox|behavioral advertising|targeted advertising)\b/.test(text)) return "adtech";
  if (/\b(dpdp act|digital personal data protection|india privacy|pdpc singapore|oaic australia|pipc korea|anpd brazil|lgpd enforcement)\b/.test(text)) return "global";
  if (/\b(admt|automated decision.making technology|california delete act|data broker registry)\b/.test(text)) return "us-states";
  if (/\b(8-k cybersecurity|material cybersecurity incident)\b/.test(text)) return "enforcement";
  if (/\b(eu ai act|ai act enforcement|high.risk ai|gpai)\b/.test(text)) return "ai-privacy";
  if (/\b(duaa|data use and access act)\b/.test(text)) return "eu-uk";
  if (/\b(fine|penalty|enforcement action|sued|lawsuit|violation|sanction)\b/.test(text)) return "enforcement";
  if (/\b(ai\b|artificial intelligence|machine learning|biometric|facial recognition)\b/.test(text)) return "ai-privacy";
  if (/\b(california|texas|virginia|colorado|connecticut|utah|cppa|ccpa|cpra|tdpsa|vcdpa)\b/.test(text)) return "us-states";
  if (/\b(ftc|congress|federal privacy|hipaa|coppa|senate|house bill|federal trade)\b/.test(text)) return "us-federal";
  if (/\b(gdpr|edpb|ico|cnil|dpc|european|eu data|uk gdpr|britain)\b/.test(text)) return "eu-uk";
  return "global";
}

function assignTopicTags(title: string, description: string): string[] {
  const text = (title + " " + (description || "")).toLowerCase();
  const tags: string[] = [];
  if (/\b(ai act|ai governance|artificial intelligence|ai regulation|foundation model|generative ai)\b/.test(text)) tags.push("ai-governance");
  if (/\b(data breach|breach notification|incident response|ransomware|data leak)\b/.test(text)) tags.push("data-breaches");
  if (/\b(biometric|facial recognition|fingerprint|iris scan|voiceprint)\b/.test(text)) tags.push("biometric-data");
  if (/\b(cross-border|data transfer|adequacy decision|standard contractual|binding corporate rules)\b/.test(text)) tags.push("data-transfers");
  if (/\b(children|child|coppa|age verification|minors|under 13|parental consent)\b/.test(text)) tags.push("children-privacy");
  if (/\b(adtech|ad tech|cookie|consent banner|tracking pixel|targeted advertising|behavioral advertising|programmatic|privacy sandbox|iab|commercial surveillance|cross.site tracking)\b/.test(text)) tags.push("adtech");
  if (/\b(bipa|vppa|cipa|wiretap act|class action privacy|privacy litigation|class certified)\b/.test(text)) tags.push("privacy-litigation");
  if (/\b(dpdp act|pdpl vietnam|appi japan|pipc|pdpc|oaic|lgpd|pdpa|anpd)\b/.test(text)) tags.push("apac-latam");
  if (/\b(data broker|data broker registry|people search|broker opt.out|drop system)\b/.test(text)) tags.push("data-brokers");
  return tags;
}

const TEMPLATED_IMAGE_HOSTS = [
  "images.bannerbear.com",
  "bannerbear.com",
  "og-image.vercel.app",
  "dynamic-og-image-generator.vercel.app",
];

function isTemplatedImage(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;
  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    return TEMPLATED_IMAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const FALLBACK_IMAGES: Record<string, string> = {
  "us-federal": "https://picsum.photos/seed/federal-law/400/200",
  "us-states": "https://picsum.photos/seed/state-capitol/400/200",
  "eu-uk": "https://picsum.photos/seed/european-union/400/200",
  "global": "https://picsum.photos/seed/global-privacy/400/200",
  "enforcement": "https://picsum.photos/seed/legal-court/400/200",
  "ai-privacy": "https://picsum.photos/seed/artificial-intelligence/400/200",
  "adtech": "https://picsum.photos/seed/advertising-technology/400/200",
};

// ── Throttle & Retry helpers ───────────────────────────────────────
const AI_CALL_DELAY_MS = 500;
let lastAiCallTime = 0;

async function throttle() {
  const now = Date.now();
  const elapsed = now - lastAiCallTime;
  if (elapsed < AI_CALL_DELAY_MS) {
    await new Promise(r => setTimeout(r, AI_CALL_DELAY_MS - elapsed));
  }
  lastAiCallTime = Date.now();
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await throttle();
    const res = await fetch(url, init);
    if (res.status === 429 && attempt < maxRetries) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
      const backoff = Math.max(retryAfter * 1000, 1000 * Math.pow(2, attempt));
      console.warn(`Anthropic 429 — retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, backoff));
      continue;
    }
    return res;
  }
  throw new Error("Max retries exceeded");
}

import { startRun, finishRun, failRun } from "../_shared/run-logger.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const run = await startRun(supabase, "fetch-newsapi");
  const results = { inserted: 0, skipped: 0, skipped_existing: 0, summaries_generated: 0, validation_failed: 0, errors: [] as string[] };
  const newsApiKey = Deno.env.get("NEWSAPI_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!newsApiKey) {
    await failRun(supabase, run, new Error("NEWSAPI_KEY not set"));
    return new Response(JSON.stringify({ error: "NEWSAPI_KEY not set" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  // Pre-fetch all existing URLs so duplicate NewsAPI results do not spend time
  // on AI enrichment and do not get counted as new inserts.
  const { data: existingRows } = await supabase
    .from("updates")
    .select("url");
  const existingUrls = new Set((existingRows || []).map((r: { url: string }) => r.url));

  // 25 queries x 2 runs/day = 50 requests/day (free tier limit: 100/day)
  // Original 18 queries are preserved; 7 new queries added below.
  const queries = [
    // Original queries (preserved from fetch-updates)
    "data privacy regulation enforcement",
    "GDPR privacy fine",
    "privacy law compliance",
    "AdTech advertising privacy regulation",
    "cookie consent enforcement GDPR",
    "FTC commercial surveillance advertising",
    "IAB TCF transparency consent framework",
    "behavioral advertising privacy law",
    "third party cookie privacy",
    "programmatic advertising regulation",
    "California CPPA privacy enforcement",
    "Texas TDPSA data privacy",
    "HHS OCR HIPAA enforcement fine",
    "AEPD Spain GDPR fine",
    "Netherlands AP Autoriteit Persoonsgegevens",
    "Italian Garante data protection",
    "EU legislative privacy regulation",
    "state attorney general privacy enforcement",
    // New queries
    "India DPDP Digital Personal Data Protection Act",
    "Australia privacy act OAIC enforcement",
    "EU AI Act high-risk enforcement compliance 2026",
    "California ADMT automated decision making privacy CPPA",
    "BIPA biometric class action settlement Illinois",
    "UK Data Use Access Act DUAA ICO guidance",
    "data broker registry delete request opt out privacy",
  ];

  for (const q of queries) {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&language=en&sortBy=publishedAt&pageSize=10&apiKey=${newsApiKey}`,
        { signal: AbortSignal.timeout(10000) }
      );
      const json = await res.json();

      for (const article of json.articles || []) {
        if (!article.title || !article.url || article.title === "[Removed]") continue;
        if (existingUrls.has(article.url)) { results.skipped_existing++; continue; }
        if (!isRelevant(article.title, article.description || "")) { results.skipped++; continue; }

        const domain = new URL(article.url).hostname.replace("www.", "");
        const category = categorize(article.title, article.description || "");

        const row: Record<string, unknown> = {
          title: article.title.slice(0, 400),
          summary: (article.description || "").slice(0, 500) || null,
          url: article.url,
          source_name: article.source?.name || domain,
          source_domain: domain,
          // Use the article's own image if NewsAPI provides one; otherwise leave
          // null so assign-fallback-images can fill from the curated pool / brand tile.
          image_url: isTemplatedImage(article.urlToImage) ? null : (article.urlToImage || null),
          category,
          topic_tags: assignTopicTags(article.title, article.description || ""),
          regulator: article.source?.name || "",
          published_at: article.publishedAt || new Date().toISOString(),
          is_premium: false,
        };

        if (anthropicKey) {
          try {
            const todayDay = new Date().toISOString().slice(0, 10);
            const pubDateObj = new Date(article.publishedAt || todayDay);
            const pubDay = isNaN(pubDateObj.getTime()) ? todayDay : pubDateObj.toISOString().slice(0, 10);
            const dateContext = `DATE CONTEXT: Today's date is ${todayDay}. This article was published on ${pubDay}. Every date you write must be consistent with these. If the source text does not state an explicit year for an event, refer to the event by month or relative phrasing WITHOUT guessing a year. Never date the article's own events to a year earlier than its publication date.\n\n`;
            const systemPrompt = `You are a privacy regulatory intelligence analyst processing commercial news articles for a compliance platform.

IMPORTANT: These articles come from commercial news sources (NewsAPI). They are TERTIARY sources — journalist reports, not official regulatory publications. Apply strict source calibration.

GOVERNING PRINCIPLES:

SOURCE CALIBRATION: All claims must be attributed. Use "According to [source name], ..." or "[Source] reports that ..." for all specific factual claims. Never present a journalist's summary of a regulatory development as if it were the regulator's statement.

SOURCE FIDELITY: Every specific fact — fine amounts, case numbers, deadlines — must appear in the article title or description. If not stated, return null. A news headline about a fine does not give you the exact fine amount unless the amount is in the title or description provided.

NO SPECULATION: Do not predict enforcement consequences, regulatory outcomes, or what authorities will do next. Report only what the article states.

THIN SOURCE DISCIPLINE: NewsAPI descriptions are often 1-3 sentences. Generate a minimal object. Return null or [] for any field that cannot be grounded in those sentences. NOTE: the validator requires why_it_matters (>= 10 chars), compliance_impact (>= 5 chars), and takeaways (>= 1 non-empty string). For thin sources, write GENERAL attributed versions of these — do not invent specifics to fill them.

VOICE: Attribution is mandatory. "The ICO has announced..." is acceptable only if the article text states this. "The ICO is likely to..." is never acceptable.

Return ONLY valid JSON. No preamble, no explanation.`;
            const baseUserContent = `Analyze this privacy/data protection news article.

Title: ${article.title}
Description: ${article.description || "No description available."}
Source: ${article.source?.name || "Unknown"}

SOURCE TEXT LENGTH: ${(article.description || "").length} characters. This is a commercial news article — apply strict source calibration and attribution.

STEP 1 — RELEVANCE CHECK: Return {"skip": true} if no meaningful connection to privacy law, data protection regulation, enforcement, or compliance.

STEP 2 — If relevant, return:
{
  "why_it_matters_short": "ONE sentence (max 25 words). Attribute to source if specific: 'According to [source], ...' Include regulator and stake.",

  "why_it_matters": "2 sentences (>= 10 chars). Sentence 1: compliance implication attributed to the news source. Sentence 2: regulator, jurisdiction, legal basis as reported. Use attribution throughout — 'The article reports that...' or '[Source name] states...'",

  "takeaways": ["1-2 strings (validator requires >= 1). Each attributed to the source. No specific legal citations unless stated in article text."],

  "compliance_impact": "One sentence (>= 5 chars). Must reflect only what the article states. If unclear from the article: 'Monitor — see primary regulatory source for compliance implications.'",

  "who_should_care": "DPO | Privacy Counsel | Compliance Manager | CISO | All privacy professionals",

  "urgency": "Immediate | This quarter | Monitor — default to Monitor for news articles unless article explicitly states an urgent deadline",

  "legal_weight": "Commentary",

  "source_strength": "Media coverage",

  "cross_jurisdiction_signal": "Only if article explicitly reports coordinated multi-regulator action. Otherwise null.",

  "risk_level": "Low | Medium | High | Critical",

  "affected_jurisdictions": ["Conservative. Include only jurisdictions explicitly named in the article as being directly affected. Use only these slugs: eu, united-kingdom, us-federal, california, texas, new-york, france, germany, italy, spain, ireland, netherlands, poland, belgium, denmark, sweden, norway, australia, canada, brazil, singapore, japan, south-korea, india, switzerland, hong-kong, china, israel, thailand, philippines, mexico"],

  "precedent_novelty": "new_theory | confirms_existing | reverses_prior | routine",

  "regulatory_theory": "Only if article explicitly describes a legal theory. Return null if article is general news coverage.",

  "action_items": [],

  "key_date": "YYYY-MM-DD only if explicitly stated in article text. Return null otherwise.",

  "entities": {
    "regulators": ["Named in article text only."],
    "companies": ["Named in article text as subjects of regulatory action only."],
    "laws": ["Named in article text only. No training-knowledge citations."],
    "case_references": ["Named verbatim in article text only. Return [] if none."]
  },

  "defense_considerations": null,

  "source_fidelity_note": "news-article: ${(article.description||'').length} chars available"
}`;
            const aiCtx = { fn: "fetch-newsapi", title: article.title, url: article.url };
            const callOnce = async (correction: string | null): Promise<any | null> => {
              const userContent = dateContext + baseUserContent + (correction
                ? `\n\nCORRECTION REQUIRED: your previous draft contained date errors: ${correction}. Re-generate the full JSON with all dates consistent with the DATE CONTEXT block. If the source does not state a year, omit the year.`
                : "");
              const aiRes = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
                body: JSON.stringify({
                  model: "claude-sonnet-4-6",
                  max_tokens: 4000,
                  system: systemPrompt,
                  messages: [{ role: "user", content: userContent }],
                }),
                signal: AbortSignal.timeout(15000),
              });
              if (!aiRes.ok) return null;
              const aiData = await aiRes.json();
              const aiText = aiData.content?.[0]?.text || "";
              const match = aiText.match(/\{[\s\S]*\}/);
              if (!match) return null;
              try { return JSON.parse(match[0]); } catch { return null; }
            };

            const first = await callOnce(null);
            if (first && !first.skip) {
              const v = validateAISummary(first, aiCtx);
              if (!v.ok) {
                results.validation_failed++;
              } else {
                let summary = v.data as Record<string, any>;
                const d1 = checkDateConsistency(JSON.stringify(summary), pubDay, aiCtx);
                if (!d1.ok) {
                  const found = d1.issues.map(i => i.found).join(", ");
                  const retry = await callOnce(found).catch(() => null);
                  let useRetry = false;
                  if (retry && !retry.skip) {
                    const v2 = validateAISummary(retry, aiCtx);
                    if (v2.ok) {
                      const d2 = checkDateConsistency(JSON.stringify(v2.data), pubDay, aiCtx);
                      summary = v2.data as Record<string, any>;
                      useRetry = true;
                      if (!d2.ok) {
                        console.error(JSON.stringify({ evt: "date_inconsistency_unresolved", fn: "fetch-newsapi", articleId: null, title: article.title, issues: d2.issues }));
                      }
                    }
                  }
                  if (!useRetry) {
                    console.error(JSON.stringify({ evt: "date_inconsistency_unresolved", fn: "fetch-newsapi", articleId: null, title: article.title, issues: d1.issues }));
                  }
                }
                row.ai_summary = summary;
                if (Array.isArray(summary.affected_jurisdictions) && summary.affected_jurisdictions.length > 0) {
                  row.affected_jurisdictions = summary.affected_jurisdictions;
                }
                if (typeof summary.regulatory_theory === "string" && summary.regulatory_theory.trim()) {
                  row.regulatory_theory = summary.regulatory_theory;
                }
                if (Array.isArray(summary.action_items) && summary.action_items.length > 0) {
                  row.action_items = summary.action_items;
                }
                if (typeof summary.key_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(summary.key_date)) {
                  row.key_date = summary.key_date;
                }
                if (typeof summary.why_it_matters_short === "string" && summary.why_it_matters_short.trim()) {
                  row.why_it_matters_short = summary.why_it_matters_short.trim();
                }
                if (summary.entities && typeof summary.entities === "object") {
                  row.entities = summary.entities;
                }
                if (typeof summary.defense_considerations === "string" && summary.defense_considerations.trim()) {
                  row.defense_considerations = summary.defense_considerations;
                }
                results.summaries_generated++;
              }
            }
          } catch { /* AI enrichment is best-effort */ }
        }

        const { error } = await supabase
          .from("updates")
          .upsert(row, { onConflict: "url", ignoreDuplicates: true });
        if (!error) {
          results.inserted++;
          existingUrls.add(article.url);
        } else results.skipped++;
      }
    } catch (e: any) {
      results.errors.push(`NewsAPI [${q}]: ${e.message}`);
    }
  }

  await finishRun(supabase, run, {
    inserted: results.inserted,
    skipped: results.skipped,
    enriched: results.summaries_generated,
    metadata: { errors: results.errors.slice(0, 10), skipped_existing: results.skipped_existing },
  });

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
