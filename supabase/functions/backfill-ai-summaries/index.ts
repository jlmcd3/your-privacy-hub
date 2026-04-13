import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

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

// Patterns that indicate a breach announcement rather than regulatory/legal content
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

function isBreachAnnouncement(title: string, summary: string | null): boolean {
  const text = title + " " + (summary || "");
  const isBreach = BREACH_ANNOUNCEMENT_PATTERNS.some(p => p.test(text));
  if (!isBreach) return false;
  const isRegulatory = REGULATORY_OVERRIDE_PATTERNS.some(p => p.test(text));
  return !isRegulatory;
}

async function generateAISummary(
  title: string,
  summary: string | null,
  sourceName: string | null,
  apiKey: string
) {
  try {
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `You are a privacy regulatory analyst. Return ONLY valid JSON. No preamble, no markdown.

Analyze this article.
Title: ${title}
Description: ${summary || "No description."}
Source: ${sourceName || "Unknown"}

IMPORTANT: Only articles about privacy LAWS, STATUTES, REGULATIONS, ENFORCEMENT ACTIONS by regulators, and COMPLIANCE OBLIGATIONS are relevant.
Articles that merely announce a data breach, security incident, or lawsuit settlement WITHOUT discussing the underlying law or regulatory response are NOT relevant.

If not about privacy regulation/law, return: {"skip": true}

Otherwise return JSON with these exact fields:
- why_it_matters (string: one to two sentences explaining what this development means for privacy professionals)
- takeaways (array of 2-4 strings: specific, plain-English observations)
- compliance_impact (string: one sentence describing what this may mean in practice)
- who_should_care (one of: "Privacy leads", "Compliance teams", "Legal teams", "Security teams", "All privacy professionals")
- urgency (one of: "High", "Medium", "Low")
- legal_weight (one of: "In effect", "Enforcement action", "Guidance issued", "Proposed", "Commentary")
- source_strength (one of: "Official", "Credible", "Secondary")
- cross_jurisdiction_signal (string or null: if multiple jurisdictions are involved, note it briefly)
- regulatory_theory (string or null: the core regulatory principle at issue, in plain English)
- affected_sectors (array of strings or null: industry sectors most relevant to this development)
- related_development (string or null: a prior case, decision, or development this connects to, if clearly applicable)
- attention_level (one of: "High", "Medium", "Low": overall priority signal for professionals)
- key_date (string in YYYY-MM-DD format or null: a specific regulatory implementation or deadline date if mentioned)
- li_relevant (boolean: true if this article contains any of the following: (1) a formal DPA or EDPB enforcement decision or ruling that evaluates a legitimate interest claim; (2) official guidance, opinion, or framework from a DPA or the EDPB addressing whether a type of processing can rely on legitimate interests; (3) regulatory commentary, public statement, or expressed concern from a DPA about legitimate interest claims; (4) a complaint rejection or supervisory closure that implicitly validates an LI basis. false otherwise)`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text;
    const match = text?.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    return parsed.skip ? null : parsed;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  // Accept either ADMIN_SECRET_TOKEN or a valid Supabase JWT
  const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN");
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  
  let authorized = false;
  if (ADMIN_SECRET && token === ADMIN_SECRET) {
    authorized = true;
  } else {
    // Check if it's a valid authenticated user JWT
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data } = await authClient.auth.getUser();
    if (data?.user) authorized = true;
  }
  
  if (!authorized)
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey)
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }),
      { status: 500 }
    );

  const url = new URL(req.url);
  const batchSize = Math.min(
    parseInt(url.searchParams.get("batch") || "20"),
    100
  );

  const { data: articles } = await supabase
    .from("updates")
    .select("id, title, summary, source_name")
    .or('ai_summary.is.null,enrichment_version.lt.2')
    .order("published_at", { ascending: false })
    .limit(batchSize);

  const { count } = await supabase
    .from("updates")
    .select("id", { count: "exact", head: true })
    .or('ai_summary.is.null,enrichment_version.lt.2');

  let updated = 0,
    skipped = 0;

  for (const article of articles ?? []) {
    // Pre-filter: skip breach announcements that aren't about regulation
    if (isBreachAnnouncement(article.title, article.summary)) {
      await supabase
        .from("updates")
        .update({ ai_summary: { skipped: true, reason: "breach_announcement" }, enrichment_version: 2 })
        .eq("id", article.id);
      skipped++;
      continue;
    }

    const aiSummary = await generateAISummary(
      article.title,
      article.summary,
      article.source_name,
      anthropicKey
    );
    if (aiSummary) {
      await supabase
        .from("updates")
        .update({
          ai_summary: aiSummary,
          enrichment_version: 2,
          regulatory_theory: aiSummary.regulatory_theory ?? null,
          affected_sectors: aiSummary.affected_sectors ?? null,
          related_development: aiSummary.related_development ?? null,
          attention_level: aiSummary.attention_level ?? null,
          key_date: aiSummary.key_date ? new Date(aiSummary.key_date) : null,
        })
        .eq("id", article.id);
      updated++;
    } else {
      await supabase
        .from("updates")
        .update({ ai_summary: { skipped: true }, enrichment_version: 2 })
        .eq("id", article.id);
      skipped++;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  return new Response(
    JSON.stringify({
      total_missing: count,
      processed: articles?.length,
      updated,
      skipped,
      remaining: Math.max(0, (count ?? 0) - (articles?.length ?? 0)),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
