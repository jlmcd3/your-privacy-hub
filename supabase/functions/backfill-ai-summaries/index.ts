import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateAISummary } from "../_shared/ai-validation.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ── Throttle & Retry helpers ───────────────────────────────────────
// Pace calls to stay well under Anthropic Tier-1/2 RPM, ITPM and OTPM limits.
// At ~4s spacing we make ~15 requests/min — safely below 50 RPM Tier-1 ceiling,
// and (with max_tokens=2500 below) ~37,500 reserved OTPM, well under Tier-2's 16k+ headroom over a minute.
const AI_CALL_DELAY_MS = 4000;
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
  maxRetries = 5
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    await throttle();
    const res = await fetch(url, init);
    if (res.status === 429 && attempt < maxRetries) {
      // User-initiated calls share Anthropic quota with backfill. On 429, back off
      // aggressively (min 60s, honor retry-after) so user calls always get the runway.
      const retryAfter = parseInt(res.headers.get("retry-after") || "0", 10);
      const backoff = Math.min(
        300000, // hard cap 5 min
        Math.max(
          60000,                             // floor: 60s — long enough to clear a per-minute window
          retryAfter * 1000,                 // honor Anthropic's hint
          5000 * Math.pow(2, attempt)        // exp backoff: 5s, 10s, 20s, 40s, 80s
        )
      );
      console.warn(`Anthropic 429 — yielding to user traffic; backing off ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, backoff));
      continue;
    }
    if ((res.status === 529 || res.status === 503) && attempt < maxRetries) {
      // Anthropic overloaded — same yield-to-user logic
      const backoff = Math.min(120000, 10000 * Math.pow(2, attempt));
      console.warn(`Anthropic ${res.status} overloaded — backing off ${backoff}ms`);
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

// Non-editorial organizational noise (job postings, events, RFPs) — never worth analyzing
const NON_EDITORIAL_PATTERNS = [
  /\b(internship|intern\s+(program|opportunity|position)|apprenticeship)\b/i,
  /\b(we[''']re\s+hiring|now\s+hiring|join\s+(our|the)\s+team|career\s+opportunit|job\s+(opening|vacancy|posting)|vacancy|vacancies)\b/i,
  /\b(open\s+position|positions?\s+available|recruiting\s+for|apply\s+(now|today|by))\b/i,
  /\b(call\s+for\s+(papers|proposals|nominations|speakers|applications)|cfp\b|request\s+for\s+(proposals?|tender|quotation)|rfp\b|rft\b|rfq\b)\b/i,
  /\b(save\s+the\s+date|register\s+(now|today)\s+for|webinar\s+invitation|event\s+registration|tickets?\s+on\s+sale)\b/i,
  /\b(annual\s+report|membership\s+(renewal|drive)|board\s+(election|elections|nomination))\b/i,
  /\b(newsletter\s+sign[\s-]?up|subscribe\s+to\s+our)\b/i,
];

function isNonEditorial(title: string, summary: string | null): boolean {
  const text = title + " " + (summary || "");
  return NON_EDITORIAL_PATTERNS.some(p => p.test(text));
}

// Source-tier inference for retrospective enrichment. Primary = official regulator
// domains; Secondary = recognised legal-analysis blogs / IAPP; Tertiary = everything
// else (commercial news, civil society, unknown).
const TIER_1_DOMAINS = [
  "edpb.europa.eu", "edps.europa.eu", "ec.europa.eu", "ico.org.uk", "cnil.fr",
  "garanteprivacy.it", "aepd.es", "bfdi.bund.de", "datatilsynet.dk", "datainspektionen.se",
  "datatilsynet.no", "dataprotection.ie", "autoriteitpersoonsgegevens.nl", "uodo.gov.pl",
  "ftc.gov", "hhs.gov", "sec.gov", "cfpb.gov", "dfs.ny.gov", "oag.ca.gov", "cppa.ca.gov",
  "oaic.gov.au", "priv.gc.ca", "cai.gouv.qc.ca", "gov.br/anpd", "pdpc.gov.sg",
  "ppc.go.jp", "pipc.go.kr", "edoeb.admin.ch", "pcpd.org.hk",
];
const TIER_2_DOMAINS = [
  "iapp.org", "out-law.com", "twobirds.com", "linklaters.com", "fieldfisher.com",
  "dlapiper.com", "cms-lawnow.com", "cliffordchance.com", "freshfields.com", "hsfnotes.com",
  "aoshearman.com", "wsgr.com", "morganlewis.com", "huntonprivacyblog.com", "ropesgray.com",
  "bakermckenzie.com", "mwe.com", "perkinscoie.com",
];
function inferSourceTier(sourceDomain: string | null | undefined): 1 | 2 | 3 {
  if (!sourceDomain) return 3;
  const d = sourceDomain.toLowerCase().replace(/^www\./, "");
  if (TIER_1_DOMAINS.some(t => d === t || d.endsWith("." + t) || d.includes(t))) return 1;
  if (TIER_2_DOMAINS.some(t => d === t || d.endsWith("." + t))) return 2;
  return 3;
}

async function generateAISummary(
  title: string,
  summary: string | null,
  sourceName: string | null,
  sourceDomain: string | null,
  apiKey: string
): Promise<EnrichResult> {
  const sourceTier = inferSourceTier(sourceDomain);
  const textLen = (summary || "").length;
  try {
    const res = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        // 2500 is comfortably above the ~1.5–2k tokens our enrichment JSON actually uses,
        // and keeps reserved OTPM low so we don't trip Anthropic's per-minute output ceiling.
        max_tokens: 2500,
        system: `You are a privacy regulatory intelligence analyst processing articles retrospectively for a professional-grade compliance platform serving Data Protection Officers, General Counsel, and privacy lawyers at multinational organizations.

Your task: analyze each article and return a single valid JSON object. Return ONLY the JSON — no preamble, no markdown, no explanation.

GOVERNING PRINCIPLES — apply without exception:

SOURCE FIDELITY: Every specific factual claim — fine amounts, deadlines, case reference numbers, regulatory instrument names, named decision outcomes — must appear verbatim in the provided article text. If a specific fact is not in the article text, return null for that field. Do not infer facts from regulatory context. Do not use training knowledge to supply facts the article does not state.

SOURCE CALIBRATION: Match your voice to your source.
- Primary regulator source (official DPA website, government publication): direct declarative voice.
- Legal analysis source (law firm blog, IAPP, legal commentary): explicit attribution. "According to [source], ..."
- Media/civil society source: explicit attribution. "[Source] reports that..."
Never present a secondary source's interpretation as if it were the primary regulator's position.

NO SPECULATION: Do not predict regulatory outcomes, future enforcement, or what regulators are "likely" to do. The only permitted forward-looking statements are deadlines explicitly stated in the article text with a specific date.

THIN SOURCE DISCIPLINE: If the article text is a short RSS summary (under 150 words), you will have insufficient basis for specific action items, case references, or deadline claims. Return null or [] for fields that cannot be grounded. Validator requires why_it_matters (>= 10 chars), compliance_impact (>= 5 chars), and takeaways (>= 1 non-empty string). For thin sources, write GENERAL versions of these — do not invent specifics to fill them.

QUALITY STANDARDS:
1. Information not present in the article → return null. Never infer or fabricate.
2. Legal weight hierarchy: Binding > Enforcement > Guidance > Proposal > Commentary. Based on document TYPE, not topic importance.
3. affected_jurisdictions: only where direct compliance obligation is stated in article.
4. regulatory_theory: name doctrine only when source supports it. Return null for Commentary/Proposal.
5. LEAD STORY DISCIPLINE: The enrichment subject is the development described in the
   article's headline and opening sentence — not the longest paragraph, not background
   context, and not historical text used to explain the new development.
   Background sections are identifiable by phrases like "Originally enacted in...",
   "The existing law requires...", "Under the prior framework...", "Since 2022...",
   "CTDPA was enacted in...". These are NEVER the lead story even when they dominate
   word count.
   When an article contains both a background date and a later effective or signed date,
   the later date anchors the lead story. Use it as a tiebreaker when the headline is
   ambiguous.
6. ATTRIBUTION ACCURACY: When attributing content to a media or third-party publication
   in any field, use the exact source name from the Source field provided in the user
   prompt. Do not substitute, infer, or abbreviate the publication name from training
   knowledge. If the Source field says "Economic Times", write "Economic Times" — not
   "Times of India", not "ET", not "the Times". This rule applies to every output field
   without exception.`,
        messages: [
          {
            role: "user",
            content: `Analyze this privacy and data protection article and return a JSON enrichment object.

Title: ${title}
Description: ${summary || "No description available."}
Source: ${sourceName || "Unknown"}

This article is being enriched retrospectively.
Source tier: ${sourceTier} (${sourceTier === 1 ? "PRIMARY regulator — direct declarative voice" : sourceTier === 2 ? "SECONDARY legal analysis — use attribution" : "TERTIARY media/unknown — strict attribution, extra caution on specifics"}).
Available text length: ${textLen} characters.
${sourceTier === 3 || textLen < 100 ? "APPLY THIN SOURCE DISCIPLINE — return null/[] for fields that cannot be grounded in this text." : ""}

NOTE: This article has already been confirmed as relevant to privacy/data protection/compliance. Do NOT apply a relevance filter.

SOURCE FACT EXTRACTION (internal — do not output):
Before generating ANY field, mentally enumerate every specific, actionable fact stated in the Description above. Do not work from a predetermined checklist — surface whatever the source actually contains. Examples of fact types worth capturing if present: fines, deadlines, rollout dates, effective dates, program status changes (launched / paused / sunset), case or docket numbers, article or section numbers, named regulators, named companies, jurisdictions, sectoral scope, legal theories, procedural posture. If a fact is not explicitly in the source, it does not exist for this enrichment — do not import it from training knowledge.

Then populate fields ONLY from the facts you extracted. If a field has no supporting fact, return null (or [] for arrays, or a clearly-marked general statement where the schema requires a string). It is better to return null than to generalise.

Return this JSON object:
{
  "why_it_matters_short": "ONE sentence (max 25 words). Name regulator and stake. CONSTRAINT: only facts in Description; if too thin, write a general statement.",
  "why_it_matters": "2 sentences (>= 10 chars). Sentence 1: compliance implication. Sentence 2: regulator, jurisdiction, legal basis. CONSTRAINT: apply SOURCE CALIBRATION; attribute secondary-source claims.",
  "related_signals": [
    { "label": "Short pattern observation grounded in SOURCE TEXT. CONSTRAINT: only include signals the article itself states. Do not generate from training knowledge. Return [] otherwise.", "kind": "pattern | precedent | trend" }
  ],
  "takeaways": ["1-3 strings (validator requires >= 1). Each cites a specific regulator/law/deadline/date STATED IN SOURCE. If thin source, ONE general takeaway."],
  "compliance_impact": "One sentence (>= 5 chars). Specific organisation type + specific action grounded in extracted facts. If no immediate action is compelled by the source, write: 'Monitor — [specific named development from source] before [specific named trigger from source].' Do not use a generic 'monitor developments' phrase.",
  "who_should_care": "DPO | Privacy Counsel | Compliance Manager | CISO | All privacy professionals",
  "urgency": "Immediate | This quarter | Monitor",
  "legal_weight": "Binding | Enforcement | Guidance | Proposal | Commentary — based on document TYPE.",
  "source_strength": "Primary regulator | Legal analysis | Media coverage",
  "cross_jurisdiction_signal": "Only if article EXPLICITLY states coordinated multi-regulator action. Otherwise null.",
  "risk_level": "Low | Medium | High | Critical",
  "affected_jurisdictions": ["Slugs where direct compliance obligations stated in article. Use only: eu, united-kingdom, us-federal, california, texas, new-york, france, germany, italy, spain, ireland, netherlands, poland, belgium, denmark, sweden, norway, australia, canada, brazil, singapore, japan, south-korea, india, switzerland, hong-kong, china, israel, thailand, philippines, mexico"],
  "precedent_novelty": "new_theory | confirms_existing | reverses_prior | routine",
  "regulatory_theory": "Legal doctrine in one sentence. Required for Binding/Enforcement only. Null for Commentary/Proposal. Do not fabricate doctrine names.",
  "action_items": [
    {
      "role": "DPO | Privacy Counsel | CISO | Compliance Manager",
      "action": "Specific action naming a law/regulator FROM SOURCE TEXT and tied to a dated obligation or concrete compliance step. CONSTRAINT: no invented article numbers or deadlines.",
      "timeframe": "Immediate (within 7 days) | This quarter"
    }
  ],
  // ACTION ITEM DISCIPLINE: Return action_items: [] unless the source names BOTH (a) a specific law/regulator AND (b) a dated obligation or concrete step.
  // A Monitor-level observation is NOT an action item. Do NOT reclassify it as "Immediate" or "This quarter" to fill the array.
  // "Monitor" is FORBIDDEN as a timeframe value here. Empty arrays are expected for commentary, opinion, and thin sources.

  "key_date": "YYYY-MM-DD ONLY if explicitly stated in source. Return null otherwise. NEVER estimate.",
  "entities": {
    "regulators": ["Official abbreviated names NAMED IN ARTICLE. Empty if none."],
    "companies": ["Subjects of regulatory action NAMED IN ARTICLE. No training-knowledge entities. Empty if none."],
    "laws": ["Laws with article numbers WHERE STATED IN ARTICLE. No training-knowledge citations. Empty if none."],
    "case_references": ["Case identifiers STATED VERBATIM IN ARTICLE. Do not generate. Empty if none."]
  },
  "defense_considerations": "For Binding/Enforcement only: one sentence on strongest distinguishing factor. Null otherwise.",
  "source_fidelity_note": "Short note: e.g. 'RSS summary only (${textLen} chars, tier ${sourceTier}) — specific claims limited.'"
}

Generate 0-3 action_items. Return [] if source does not support specific named-law actions. For entities: populate ONLY from content present in the article — not from training knowledge.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`Anthropic non-OK ${res.status}: ${body.slice(0, 500)}`);
      // 4xx (except 429) = permanent for this request shape; 5xx/429 = transient (retry later)
      const transient = res.status === 429 || res.status >= 500 ||
        body.includes("usage limit") || body.includes("rate_limit");
      return { kind: transient ? "transient_error" : "permanent_error", detail: `${res.status}` };
    }
    const data = await res.json();
    if (data.stop_reason === "max_tokens") {
      console.error(`Anthropic response truncated (max_tokens) for "${title.slice(0, 80)}"`);
    }
    const text: string = data.content?.[0]?.text ?? "";
    if (!text) {
      console.error("Anthropic returned empty content");
      return { kind: "transient_error", detail: "empty_content" };
    }

    // Strip markdown code fences if present
    let cleaned = text
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      console.error(`No JSON object boundaries found. Raw text: ${text.slice(0, 300)}`);
      return { kind: "permanent_error", detail: "no_json_boundaries" };
    }
    cleaned = cleaned.substring(start, end + 1);

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (_e) {
      const repaired = cleaned
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, "");
      try {
        parsed = JSON.parse(repaired);
      } catch (e2) {
        console.error(`JSON.parse failed: ${(e2 as Error).message}. Snippet: ${cleaned.slice(0, 300)}…${cleaned.slice(-200)}`);
        return { kind: "permanent_error", detail: "json_parse_failed" };
      }
    }
    if (parsed.skip) return { kind: "model_skip", detail: parsed.skip_reason || "model_declined" };

    const v = validateAISummary(parsed, { fn: "backfill-ai-summaries", title });
    if (!v.ok) {
      return { kind: "permanent_error", detail: `schema_invalid:${v.errors[0] ?? "unknown"}` };
    }
    return { kind: "ok", data: v.data };
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`generateAISummary threw: ${msg}`);
    const transient = msg.includes("timeout") || msg.includes("network") || msg.includes("fetch");
    return { kind: transient ? "transient_error" : "permanent_error", detail: msg };
  }
}

type EnrichResult =
  | { kind: "ok"; data: Record<string, unknown> }
  | { kind: "model_skip"; detail: string }
  | { kind: "permanent_error"; detail: string }
  | { kind: "transient_error"; detail: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  // Accept either ADMIN_SECRET_TOKEN from scheduled/internal callers or a valid Supabase JWT.
  const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN");
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  const adminHeader = req.headers.get("x-admin-token") || "";
  
  let authorized = false;
  if (ADMIN_SECRET && (token === ADMIN_SECRET || adminHeader === ADMIN_SECRET)) {
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

  // Optional JSON body for advanced parameters (force_reenrich, since, limit)
  let body: Record<string, unknown> = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { body = {}; }
  }

  // Batch size: query param `batch` OR body `limit` (default 25, hard cap 100)
  const requestedBatch =
    (typeof body.limit === "number" ? body.limit : parseInt(url.searchParams.get("batch") || url.searchParams.get("limit") || "25"));
  const batchSize = Math.min(Math.max(1, requestedBatch || 25), 100);

  // force_reenrich: when true, process rows even if ai_summary is already populated
  const forceReenrich =
    body.force_reenrich === true || url.searchParams.get("force_reenrich") === "true";

  // since: ISO date string — restrict to articles with published_at >= since
  const since =
    (typeof body.since === "string" ? body.since : url.searchParams.get("since")) || null;

  // ids: comma-separated list of specific article IDs to re-enrich (targeted backfill)
  const idsParam =
    (typeof body.ids === "string" ? body.ids : url.searchParams.get("ids")) || null;
  const targetIds = idsParam ? idsParam.split(",").map((s: string) => s.trim()).filter(Boolean) : null;

  // Current enrichment target — bump if you change the prompt
  const TARGET_ENRICHMENT_VERSION = 4;

  let articleQuery = supabase
    .from("updates")
    .select("id, title, summary, source_name, source_domain");

  if (targetIds && targetIds.length > 0) {
    // Explicit ID list: process these rows regardless of enrichment state.
    // Ignores force_reenrich, since, and batchSize when IDs are provided.
    articleQuery = articleQuery.in("id", targetIds);
  } else if (forceReenrich) {
    // Re-enrich rows that haven't yet been processed by the new prompt.
    // (Without this filter, batches keep re-processing the same top rows.)
    articleQuery = articleQuery.or(
      `enrichment_version.is.null,enrichment_version.lt.${TARGET_ENRICHMENT_VERSION}`
    );
    if (since) {
      articleQuery = articleQuery.gte('published_at', since);
    }
  } else {
    articleQuery = articleQuery.is('ai_summary', null);
    if (since) {
      articleQuery = articleQuery.gte('published_at', since);
    }
  }

  const { data: articles } = await articleQuery
    .order("published_at", { ascending: false })
    .limit(targetIds && targetIds.length > 0 ? targetIds.length : batchSize);

  let countQuery = supabase
    .from("updates")
    .select("id", { count: "exact", head: true });
  if (forceReenrich) {
    countQuery = countQuery.or(
      `enrichment_version.is.null,enrichment_version.lt.${TARGET_ENRICHMENT_VERSION}`
    );
  } else {
    countQuery = countQuery.is('ai_summary', null);
  }
  if (since) countQuery = countQuery.gte('published_at', since);
  const { count } = await countQuery;



  let updated = 0,
    skipped = 0,
    deferred = 0;

  for (const article of articles ?? []) {
    if (isNonEditorial(article.title, article.summary)) {
      await supabase
        .from("updates")
        .update({ ai_summary: { skipped: true, reason: "non_editorial" }, enrichment_version: 4 })
        .eq("id", article.id);
      skipped++;
      continue;
    }

    if (isBreachAnnouncement(article.title, article.summary)) {
      await supabase
        .from("updates")
        .update({ ai_summary: { skipped: true, reason: "breach_announcement" }, enrichment_version: 4 })
        .eq("id", article.id);
      skipped++;
      continue;
    }

    const result = await generateAISummary(
      article.title,
      article.summary,
      article.source_name,
      (article as { source_domain?: string | null }).source_domain ?? null,
      anthropicKey
    );

    if (result.kind === "ok") {
      const aiSummary = result.data as Record<string, any>;
      const updatePayload: Record<string, any> = {
        ai_summary: aiSummary,
        enrichment_version: 4,
      };
      if (Array.isArray(aiSummary.affected_jurisdictions) && aiSummary.affected_jurisdictions.length > 0) {
        updatePayload.affected_jurisdictions = aiSummary.affected_jurisdictions;
      }
      if (typeof aiSummary.regulatory_theory === "string" && aiSummary.regulatory_theory.trim()) {
        updatePayload.regulatory_theory = aiSummary.regulatory_theory;
      }
      if (Array.isArray(aiSummary.action_items) && aiSummary.action_items.length > 0) {
        // Server-side enforcement of the Monitor ban: drop any item with timeframe "Monitor"
        // so the model cannot bypass the prompt rule. Empty arrays are valid output.
        const filtered = (aiSummary.action_items as any[]).filter((a: any) => {
          const tf = typeof a?.timeframe === "string" ? a.timeframe.trim().toLowerCase() : "";
          return tf !== "monitor";
        });
        if (filtered.length > 0) updatePayload.action_items = filtered;
      }
      if (typeof aiSummary.key_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(aiSummary.key_date)) {
        updatePayload.key_date = aiSummary.key_date;
      }
      if (aiSummary.entities && typeof aiSummary.entities === "object") {
        updatePayload.entities = aiSummary.entities;
      }
      if (typeof aiSummary.defense_considerations === "string" && aiSummary.defense_considerations.trim()) {
        updatePayload.defense_considerations = aiSummary.defense_considerations;
      }
      if (typeof aiSummary.urgency === "string" && aiSummary.urgency.trim()) {
        const urgencyMap: Record<string, string> = {
          "Immediate": "High",
          "This quarter": "Medium",
          "Monitor": "Low",
        };
        const mapped = urgencyMap[aiSummary.urgency.trim()];
        if (mapped) updatePayload.attention_level = mapped;
      }
      await supabase.from("updates").update(updatePayload).eq("id", article.id);
      updated++;
    } else if (result.kind === "model_skip" || result.kind === "permanent_error") {
      // Genuine skip — mark so we don't retry forever
      await supabase
        .from("updates")
        .update({
          ai_summary: { skipped: true, reason: result.kind, detail: result.detail },
          enrichment_version: 4,
        })
        .eq("id", article.id);
      skipped++;
    } else {
      // transient_error — leave article alone so next run can retry
      deferred++;
    }
    // throttle() inside fetchWithRetry already enforces AI_CALL_DELAY_MS spacing
  }

  return new Response(
    JSON.stringify({
      total_missing: count,
      scanned: articles?.length ?? 0,
      processed: articles?.length ?? 0,
      updated,
      skipped,
      deferred,
      force_reenrich: forceReenrich,
      since,
      remaining: Math.max(0, (count ?? 0) - (articles?.length ?? 0)),
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});

