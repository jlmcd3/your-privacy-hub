// Catalogues ONE CPPA/CCPA legal authority per call into cppa_authorities.
// Does NOT write deadlines (those are human-verified).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_AUTHORITY_TYPES = new Set(["statute", "regulation", "guidance"]);
const ALLOWED_SOURCES = new Set(["CCPA", "CPPA_REGS", "CPPA_GUIDANCE"]);

const ALLOWED_TOPICS = new Set([
  "consumer-rights","right-to-know","right-to-delete","right-to-correct",
  "right-to-opt-out","opt-out-sale-sharing","opt-out-preference-signals","gpc",
  "opt-out-link","sensitive-pi","limit-sensitive-pi","notice-at-collection",
  "privacy-policy","notice-content","admt","significant-decision","profiling",
  "pre-use-notice","risk-assessment","attestation","cybersecurity-audit",
  "service-provider","contractor","third-party","contract-requirements",
  "data-retention","data-minimisation","purpose-limitation","breach",
  "private-right-of-action","enforcement","penalty","cure-period","thresholds",
  "employee-data","verifiable-request","authorized-agent","financial-incentive",
  "non-discrimination","definitions",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

async function callAnthropic(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Admin-only: write path. Require admin token or service role.
  const auth = req.headers.get("Authorization") ?? "";
  const xAdmin = req.headers.get("x-admin-token") ?? "";
  const bearer = auth.replace("Bearer ", "");
  const authorized =
    (ADMIN_TOKEN && (auth.includes(ADMIN_TOKEN) || xAdmin === ADMIN_TOKEN)) ||
    bearer === SUPABASE_SERVICE_KEY;
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const citation: string = String(body?.citation ?? "").trim();
  const authority_type: string = String(body?.authority_type ?? "").trim();
  const source: string = String(body?.source ?? "").trim();
  const raw_text: string = String(body?.raw_text ?? "");
  const official_url: string | null = body?.official_url ?? null;
  const effective_date: string | null = body?.effective_date ?? null;
  const force: boolean = body?.force === true;

  if (!citation) return json({ error: "citation required" }, 400);
  if (!ALLOWED_AUTHORITY_TYPES.has(authority_type)) {
    return json({ error: "invalid authority_type" }, 400);
  }
  if (!ALLOWED_SOURCES.has(source)) {
    return json({ error: "invalid source" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Step 1: guardrails
  if (!raw_text || raw_text.trim().length < 40) {
    await admin.from("cppa_ingestion_log").insert({
      run_type: "manual",
      source_url: official_url,
      citation,
      change_detected: false,
      details: { skipped: true, reason: "empty_text" },
    });
    return json({ skipped: true, reason: "empty_text" });
  }

  if (!force) {
    const { data: existing } = await admin
      .from("cppa_authorities")
      .select("id, verified_by")
      .eq("citation", citation)
      .eq("status", "current")
      .maybeSingle();
    if (existing?.verified_by) {
      return json({ skipped: true, reason: "already_verified", id: existing.id });
    }
  }

  // Step 2: model call
  const system =
    "You are a California privacy law librarian. Your only task is to convert a single provided legal " +
    "authority into a structured catalog record. You work ONLY from the text provided. You never add " +
    "legal interpretation, never infer obligations not present in the text, never draw on outside " +
    "knowledge, and never invent a title or summary for text that is missing or unreadable. Return " +
    "ONLY valid JSON, no markdown, no preamble.";

  const userPrompt =
`Convert this authority into a catalog record using ONLY the provided text.

CITATION: ${citation}
TYPE: ${authority_type}
SOURCE: ${source}
EFFECTIVE DATE (if supplied): ${effective_date ?? ""}

FULL TEXT:
${raw_text}

If the FULL TEXT is empty, truncated to the point of being unusable, or is not a legal
provision, return exactly: {"error":"invalid_input"}

Otherwise return JSON:
{
  "title": "the section's official heading, verbatim if present; otherwise a neutral label in square brackets, e.g. [Untitled — opt-out request timing]",
  "plain_summary": "2-3 sentences describing ONLY what this section says or requires. No interpretation, no comparison to other law, no advice.",
  "topics": ["tags from this controlled list ONLY: consumer-rights, right-to-know, right-to-delete, right-to-correct, right-to-opt-out, opt-out-sale-sharing, opt-out-preference-signals, gpc, opt-out-link, sensitive-pi, limit-sensitive-pi, notice-at-collection, privacy-policy, notice-content, admt, significant-decision, profiling, pre-use-notice, risk-assessment, attestation, cybersecurity-audit, service-provider, contractor, third-party, contract-requirements, data-retention, data-minimisation, purpose-limitation, breach, private-right-of-action, enforcement, penalty, cure-period, thresholds, employee-data, verifiable-request, authorized-agent, financial-incentive, non-discrimination, definitions"],
  "defines_terms": ["if this section defines terms, list the exact terms defined; else []"],
  "mentions_deadline": true or false,
  "deadline_text": "if mentions_deadline, quote the exact sentence(s) stating the date, period, or revenue tier, VERBATIM. Never compute or infer a date. else null"
}

Rules:
- Use ONLY topics from the controlled list; omit any that do not clearly apply.
- title must be verbatim if a heading exists; never invent one.
- deadline_text must be a verbatim quote, never a computed or inferred date.
- If a definitions section defines a term tied to a topic area (e.g. it defines "automated decisionmaking technology" or "significant decision"), include BOTH "definitions" AND the related topic tag(s) (e.g. "admt", "significant-decision") in topics, and list the terms in defines_terms.`;

  let text: string;
  try { text = await callAnthropic(system, userPrompt); }
  catch (e) {
    console.error("Anthropic error:", e);
    return json({ error: "model_call_failed", detail: String(e) }, 502);
  }

  // Step 3: parse JSON
  let parsed: any = {};
  try { parsed = JSON.parse(stripFences(text)); }
  catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) try { parsed = JSON.parse(m[0]); } catch { /* ignore */ }
  }

  if (parsed?.error === "invalid_input") {
    await admin.from("cppa_ingestion_log").insert({
      run_type: "manual",
      source_url: official_url,
      citation,
      change_detected: false,
      details: { skipped: true, reason: "invalid_input" },
    });
    return json({ skipped: true, reason: "invalid_input" });
  }

  // Sanitise topics
  const rawTopics: string[] = Array.isArray(parsed?.topics) ? parsed.topics : [];
  const topics = Array.from(new Set(rawTopics.filter((t) => ALLOWED_TOPICS.has(t))));
  const defines_terms: string[] = Array.isArray(parsed?.defines_terms)
    ? parsed.defines_terms.filter((t: any) => typeof t === "string" && t.length > 0)
    : [];
  const title = typeof parsed?.title === "string" && parsed.title.trim().length > 0
    ? parsed.title.trim()
    : `[Untitled — ${citation}]`;
  const plain_summary = typeof parsed?.plain_summary === "string"
    ? parsed.plain_summary.trim()
    : null;
  const mentions_deadline = parsed?.mentions_deadline === true;
  const deadline_text = mentions_deadline && typeof parsed?.deadline_text === "string"
    ? parsed.deadline_text
    : null;

  // Step 4: derive binding / authority_weight
  let binding = true;
  let authority_weight = 100;
  if (authority_type === "regulation") { binding = true; authority_weight = 90; }
  else if (authority_type === "guidance") { binding = false; authority_weight = 40; }

  // Step 5: versioned write
  let recordId: string | null = null;
  let mode: "insert" | "supersede" = "insert";
  let supersededVerified = false;

  const { data: current } = await admin
    .from("cppa_authorities")
    .select("id, verified_by")
    .eq("citation", citation)
    .eq("status", "current")
    .maybeSingle();

  if (!current) {
    const { data, error } = await admin
      .from("cppa_authorities")
      .insert({
        citation,
        authority_type,
        source,
        title,
        full_text: raw_text,
        plain_summary,
        topics,
        defines_terms,
        binding,
        authority_weight,
        effective_date,
        official_url,
        status: "current",
      })
      .select("id")
      .single();
    if (error) {
      console.error("Insert error:", error);
      return json({ error: "insert_failed", detail: error.message }, 500);
    }
    recordId = data.id;
  } else if (force) {
    mode = "supersede";
    supersededVerified = !!current.verified_by;
    const { data, error } = await admin.rpc("cppa_supersede_and_insert", {
      p_citation: citation,
      p_authority_type: authority_type,
      p_source: source,
      p_title: title,
      p_full_text: raw_text,
      p_plain_summary: plain_summary,
      p_topics: topics,
      p_defines_terms: defines_terms,
      p_binding: binding,
      p_authority_weight: authority_weight,
      p_effective_date: effective_date,
      p_official_url: official_url,
    });
    if (error) {
      console.error("Supersede error:", error);
      return json({ error: "supersede_failed", detail: error.message }, 500);
    }
    recordId = data as string;
    if (supersededVerified) {
      console.warn(
        `[cppa-ingest] Superseded a previously verified row for ${citation}; needs re-review.`,
      );
    }
  }
  // (current exists, not force, not verified → still skip? Spec says verified-only blocks.
  //  Unverified current rows without force: we treat as no-op skip.)
  else {
    return json({ skipped: true, reason: "current_exists_no_force", id: current.id });
  }

  // Step 6: deadline → log only
  if (mentions_deadline && deadline_text) {
    await admin.from("cppa_ingestion_log").insert({
      run_type: "manual",
      source_url: official_url,
      citation,
      change_detected: false,
      details: {
        deadline_text,
        citation,
        note: "Mentions deadline — create verified row via admin page.",
      },
    });
  }

  // Step 7: log run
  await admin.from("cppa_ingestion_log").insert({
    run_type: "manual",
    source_url: official_url,
    citation,
    authorities_added: mode === "insert" ? 1 : 0,
    authorities_updated: mode === "supersede" ? 1 : 0,
    change_detected: mode === "supersede",
    details: {
      mode,
      superseded_verified: supersededVerified,
      topics,
      defines_terms,
    },
  });

  return json({
    success: true,
    id: recordId,
    mode,
    superseded_verified: supersededVerified,
    topics,
    defines_terms,
    mentions_deadline,
  });
});
