// Ingests FSOR (Final Statement of Reasons) commentary chunks.
// Input: { fsor_package, source_url?, units: [{ agency_response, regulation_citation?, comment_text?, page_ref?, related_citations? }] }
// For each unit: Claude tags + summarises, Lovable AI Gateway embeds, upserts row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

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

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMS = 1536;

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}
function fixOcrSpaces(text: string): string {
  if (!text) return text;
  let t = text.replace(/\s+/g, " ").trim();
  t = t.replace(/\b([A-Za-z]) ([a-z]{2,})/g, "$1$2");
  t = t.replace(/([a-z]{2,}) ([a-z])\b/g, "$1$2");
  t = t.replace(/\b([A-Za-z]{2}) ([a-z])\b/g, (match, p1, p2) => {
    const joined = p1 + p2;
    const commonWords = new Set(["the","and","for","not","but","are","was","has","had","its","that","this","with","from","they","have","been","will","when","also","into","more","each","such","than","then","some","only","must","does","were","what","who","how","any","all","may","can"]);
    return commonWords.has(joined.toLowerCase()) ? joined : match;
  });
  return t;
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function callClaude(system: string, user: string, max_tokens = 600): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  return d.content?.[0]?.text || "";
}

async function embed(text: string): Promise<number[]> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
      dimensions: EMBEDDING_DIMS,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`Embed ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const v = d?.data?.[0]?.embedding;
  if (!Array.isArray(v) || v.length !== EMBEDDING_DIMS) {
    throw new Error(`Bad embedding shape: len=${v?.length}`);
  }
  return v;
}

interface UnitInput {
  agency_response: string;
  regulation_citation?: string;
  comment_text?: string;
  page_ref?: string;
  related_citations?: string[];
}

async function tagUnit(u: UnitInput): Promise<{
  comment_summary: string;
  regulation_citation: string;
  related_citations: string[];
  topic_tags: string[];
}> {
  const system =
    "You are a California privacy law librarian indexing a Final Statement of Reasons (FSOR) " +
    "from the California Privacy Protection Agency. Return ONLY valid JSON. No interpretation, " +
    "no legal advice, no outside knowledge.";
  const user =
`Index this FSOR comment/response unit.

${u.comment_text ? `COMMENT (from public commenter):\n${u.comment_text}\n\n` : ""}AGENCY RESPONSE:
${u.agency_response}

${u.regulation_citation ? `KNOWN REGULATION CITATION: ${u.regulation_citation}` : ""}

Return JSON:
{
  "comment_summary": "ONE sentence (max 240 chars) summarising what the public comment asked for or argued. If no comment text provided, summarise what issue the Agency is addressing.",
  "regulation_citation": "the PRIMARY regulation section this discusses, in form like '11 CCR § 7152' or '11 CCR § 7152(a)(3)'. If KNOWN REGULATION CITATION provided and accurate, use it. If multiple, pick the most central.",
  "related_citations": ["any OTHER regulation sections mentioned, in same format; else []"],
  "topic_tags": ["from this controlled list ONLY: consumer-rights, right-to-know, right-to-delete, right-to-correct, right-to-opt-out, opt-out-sale-sharing, opt-out-preference-signals, gpc, opt-out-link, sensitive-pi, limit-sensitive-pi, notice-at-collection, privacy-policy, notice-content, admt, significant-decision, profiling, pre-use-notice, risk-assessment, attestation, cybersecurity-audit, service-provider, contractor, third-party, contract-requirements, data-retention, data-minimisation, purpose-limitation, breach, private-right-of-action, enforcement, penalty, cure-period, thresholds, employee-data, verifiable-request, authorized-agent, financial-incentive, non-discrimination, definitions"]
}`;
  const txt = await callClaude(system, user, 500);
  let parsed: any = {};
  try { parsed = JSON.parse(stripFences(txt)); }
  catch {
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) try { parsed = JSON.parse(m[0]); } catch { /* */ }
  }
  const tags: string[] = Array.isArray(parsed.topic_tags)
    ? parsed.topic_tags.filter((t: any) => typeof t === "string" && ALLOWED_TOPICS.has(t))
    : [];
  const related: string[] = Array.isArray(parsed.related_citations)
    ? parsed.related_citations.filter((t: any) => typeof t === "string" && t.length > 0)
    : [];
  return {
    comment_summary: typeof parsed.comment_summary === "string" ? parsed.comment_summary.trim().slice(0, 280) : "",
    regulation_citation: typeof parsed.regulation_citation === "string" && parsed.regulation_citation.trim()
      ? parsed.regulation_citation.trim()
      : (u.regulation_citation ?? ""),
    related_citations: Array.from(new Set(related)),
    topic_tags: Array.from(new Set(tags)),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const xAdmin = req.headers.get("x-admin-token") ?? "";
  const bearer = auth.replace("Bearer ", "");
  const authorized =
    (ADMIN_TOKEN && (auth.includes(ADMIN_TOKEN) || xAdmin === ADMIN_TOKEN)) ||
    bearer === SUPABASE_SERVICE_KEY;
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const fsor_package: string = String(body?.fsor_package ?? "").trim();
  const source_url: string | null = body?.source_url ?? null;
  const units: UnitInput[] = Array.isArray(body?.units) ? body.units : [];

  if (!fsor_package) return json({ error: "fsor_package required" }, 400);
  if (units.length === 0) return json({ error: "units required (non-empty array)" }, 400);
  if (units.length > 50) return json({ error: "max 50 units per call" }, 400);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const results: Array<{ index: number; status: string; id?: string; reason?: string }> = [];
  let inserted = 0, skipped = 0, failed = 0;

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    try {
      const resp = (u.agency_response ?? "").trim();
      if (resp.length < 40) {
        results.push({ index: i, status: "skipped", reason: "response_too_short" });
        skipped++;
        continue;
      }

      const hashSource = `${fsor_package}|${u.regulation_citation ?? ""}|${resp}`;
      const content_hash = await sha256(hashSource);

      const { data: existing } = await admin
        .from("cppa_fsor_commentary")
        .select("id")
        .eq("fsor_package", fsor_package)
        .eq("content_hash", content_hash)
        .maybeSingle();
      if (existing) {
        results.push({ index: i, status: "skipped", reason: "duplicate", id: existing.id });
        skipped++;
        continue;
      }

      const tagged = await tagUnit(u);
      if (!tagged.regulation_citation) {
        results.push({ index: i, status: "skipped", reason: "no_citation" });
        skipped++;
        continue;
      }

      const embedText =
        `Regulation: ${tagged.regulation_citation}\n` +
        `Topics: ${tagged.topic_tags.join(", ")}\n` +
        `Comment: ${tagged.comment_summary}\n` +
        `Agency response: ${resp}`;
      const embedding = await embed(embedText);

      const { data: ins, error: insErr } = await admin
        .from("cppa_fsor_commentary")
        .insert({
          fsor_package,
          regulation_citation: tagged.regulation_citation,
          related_citations: tagged.related_citations,
          topic_tags: tagged.topic_tags,
          comment_summary: tagged.comment_summary,
          agency_response: resp,
          page_ref: u.page_ref ?? null,
          source_url,
          embedding: embedding as any,
          embedding_model: EMBEDDING_MODEL,
          content_hash,
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);

      results.push({ index: i, status: "inserted", id: ins.id });
      inserted++;
    } catch (e) {
      console.error(`unit ${i} failed:`, e);
      results.push({ index: i, status: "failed", reason: String(e).slice(0, 200) });
      failed++;
    }
  }

  return json({
    fsor_package,
    inserted,
    skipped,
    failed,
    total: units.length,
    results,
  });
});
