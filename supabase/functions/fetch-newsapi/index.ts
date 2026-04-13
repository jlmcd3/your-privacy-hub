import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function isRelevant(title: string, description: string): boolean {
  const text = (title + " " + (description || "")).toLowerCase();
  const titleLower = title.toLowerCase();

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const results = { inserted: 0, skipped: 0, skipped_existing: 0, summaries_generated: 0, errors: [] as string[] };
  const newsApiKey = Deno.env.get("NEWSAPI_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!newsApiKey) {
    return new Response(JSON.stringify({ error: "NEWSAPI_KEY not set" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  // Pre-fetch URLs that already have AI summaries to skip redundant calls
  const { data: existingRows } = await supabase
    .from("updates")
    .select("url")
    .not("ai_summary", "is", null);
  const existingUrlsWithSummary = new Set((existingRows || []).map((r: { url: string }) => r.url));

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
        if (!isRelevant(article.title, article.description || "")) { results.skipped++; continue; }

        const domain = new URL(article.url).hostname.replace("www.", "");
        const category = categorize(article.title, article.description || "");

        const row: Record<string, unknown> = {
          title: article.title.slice(0, 400),
          summary: (article.description || "").slice(0, 500) || null,
          url: article.url,
          source_name: article.source?.name || domain,
          source_domain: domain,
          image_url: article.urlToImage || FALLBACK_IMAGES[category],
          category,
          topic_tags: assignTopicTags(article.title, article.description || ""),
          regulator: article.source?.name || "",
          published_at: article.publishedAt || new Date().toISOString(),
          is_premium: false,
        };

        if (anthropicKey && !existingUrlsWithSummary.has(article.url)) {
          try {
            const aiRes = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "x-api-key": anthropicKey,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
              },
              body: JSON.stringify({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1000,
                system: `You are a privacy regulatory analyst. Return ONLY valid JSON. If the article is not genuinely about privacy regulation, data protection law, or compliance obligations, return {"skip": true}.`,
                messages: [{
                  role: "user",
                  content: `Analyze: Title: ${article.title}\nDescription: ${article.description || ""}\nSource: ${article.source?.name || ""}\n\nReturn JSON with: why_it_matters, takeaways (array), compliance_impact, who_should_care, urgency (Immediate|This Quarter|Monitor), legal_weight (Binding|Enforcement|Guidance|Proposal|Commentary), source_strength, cross_jurisdiction_signal, risk_level (Low|Medium|High|Critical). Or {"skip":true} if not relevant.`,
                }],
              }),
              signal: AbortSignal.timeout(15000),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const aiText = aiData.content?.[0]?.text || "";
              const match = aiText.match(/\{[\s\S]*\}/);
              if (match) {
                const parsed = JSON.parse(match[0]);
                if (!parsed.skip) { row.ai_summary = parsed; results.summaries_generated++; }
              }
            }
          } catch { /* AI enrichment is best-effort */ }
        }

        const { error } = await supabase
          .from("updates")
          .upsert(row, { onConflict: "url", ignoreDuplicates: true });
        if (!error) results.inserted++;
        else results.skipped++;
      }
    } catch (e: any) {
      results.errors.push(`NewsAPI [${q}]: ${e.message}`);
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
