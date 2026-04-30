// translate-report
// ─────────────────────────────────────────────────────────────────────────────
// Shared translation service used by every report tool (Biometric, DPA, DPIA,
// LI, Governance, IR Playbook, Registration, Briefs).
//
// Auth: requires a valid Supabase user JWT in the Authorization header.
//       The user must own the source report row.
//
// Inputs (POST JSON):
//   {
//     report_type: 'biometric'|'dpa'|'dpia'|'li'|'governance'|'ir'|'registration',
//     report_id:   uuid,
//     target_lang: 'de'|'fr'|'es'|'it'|'nl'|'pl'|...
//   }
//
// Behaviour:
//   1. Loads the source report (RLS-scoped to the caller).
//   2. Computes a sha256 of the source content.
//   3. Returns cached translation if (report, lang, hash) already exists.
//   4. Otherwise calls Lovable AI Gateway with a domain-specific prompt that
//      injects the GDPR glossary terms for the target language as hard constraints.
//   5. Caches the result and returns it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash"; // good balance of quality + cost for translation

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  pt: "Portuguese",
  sv: "Swedish",
  da: "Danish",
  fi: "Finnish",
  cs: "Czech",
  ro: "Romanian",
  el: "Greek",
};

// Maps report_type → table name and the JSONB column that holds the translatable content.
const REPORT_SOURCES: Record<
  string,
  { table: string; contentCol: string; textCol?: string }
> = {
  biometric:    { table: "biometric_assessments",   contentCol: "report_data", textCol: "analysis_text" },
  dpa:          { table: "dpa_documents",           contentCol: "report_data", textCol: "document_text" },
  dpia:         { table: "dpia_frameworks",         contentCol: "report_data" },
  li:           { table: "li_assessments",          contentCol: "report_data" },
  governance:   { table: "governance_assessments",  contentCol: "report_data" },
  ir:           { table: "ir_playbooks",            contentCol: "report_data", textCol: "playbook_text" },
  registration: { table: "registration_assessments", contentCol: "result_summary" },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    if (!LOVABLE_API_KEY) {
      return jsonResponse({ error: "AI not configured" }, 500);
    }

    // ── Auth ────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userRes?.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const user = userRes.user;

    // ── Validate input ──────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { report_type, report_id, target_lang } = body ?? {};
    if (
      typeof report_type !== "string" ||
      typeof report_id !== "string" ||
      typeof target_lang !== "string"
    ) {
      return jsonResponse({ error: "Missing report_type, report_id, or target_lang" }, 400);
    }
    const langName = LANGUAGE_NAMES[target_lang];
    if (!langName) return jsonResponse({ error: `Unsupported language: ${target_lang}` }, 400);
    if (target_lang === "en") return jsonResponse({ translated_content: null, note: "Source is already English" });

    const source = REPORT_SOURCES[report_type];
    if (!source) return jsonResponse({ error: `Unknown report_type: ${report_type}` }, 400);

    // ── Service-role client for cache + glossary reads/writes ───────────
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ── Load source report (scoped to caller via user_id check) ─────────
    const cols = ["id", "user_id", source.contentCol, ...(source.textCol ? [source.textCol] : [])].join(", ");
    const { data: row, error: rowErr } = await admin
      .from(source.table)
      .select(cols)
      .eq("id", report_id)
      .maybeSingle();

    if (rowErr) {
      console.error("translate-report: source lookup failed", rowErr);
      return jsonResponse({ error: "Source lookup failed" }, 500);
    }
    if (!row) return jsonResponse({ error: "Report not found" }, 404);
    if ((row as any).user_id !== user.id) return jsonResponse({ error: "Forbidden" }, 403);

    const sourceContent = (row as any)[source.contentCol];
    const sourceText = source.textCol ? (row as any)[source.textCol] : null;
    if (!sourceContent && !sourceText) {
      return jsonResponse({ error: "Report has no translatable content yet" }, 400);
    }

    // ── Compute hash for cache key ──────────────────────────────────────
    const hashInput = JSON.stringify({ c: sourceContent ?? null, t: sourceText ?? null });
    const contentHash = await sha256(hashInput);

    // ── Cache hit? ──────────────────────────────────────────────────────
    const { data: cached } = await admin
      .from("report_translations")
      .select("translated_content, created_at")
      .eq("report_type", report_type)
      .eq("report_id", report_id)
      .eq("target_lang", target_lang)
      .eq("content_hash", contentHash)
      .maybeSingle();
    if (cached) {
      return jsonResponse({
        translated_content: cached.translated_content,
        cached: true,
        created_at: cached.created_at,
      });
    }

    // ── Load glossary for this language ─────────────────────────────────
    const { data: glossary } = await admin
      .from("translation_glossary")
      .select("source_term, target_term, authority")
      .eq("target_lang", target_lang)
      .eq("source_lang", "en")
      .eq("domain", "gdpr");

    const glossaryBlock = (glossary ?? [])
      .map((g) => `  • "${g.source_term}" → "${g.target_term}"${g.authority ? `   (${g.authority})` : ""}`)
      .join("\n");

    // ── Build the translation payload ───────────────────────────────────
    // We translate one big JSON envelope so the AI returns the same shape.
    const envelope = {
      report_data: sourceContent ?? null,
      ...(source.textCol ? { [source.textCol]: sourceText ?? null } : {}),
    };

    const systemPrompt = `You are a professional EU privacy-law translator. You translate compliance reports
between English and ${langName}.

GLOSSARY — these are the official statutory terms from the GDPR / national
implementing law in ${langName}. You MUST use these exact translations whenever
the English term appears, regardless of context or stylistic preference. Do not
substitute synonyms. Preserve case where natural in the target language.

${glossaryBlock || "  (no glossary entries — use standard GDPR terminology)"}

Other rules:
1. Preserve the EXACT JSON structure of the input. Translate only string values.
2. Do NOT translate keys, UUIDs, dates, URLs, code identifiers, monetary amounts,
   regulator acronyms (ICO, CNIL, BfDI, AEPD, Garante, AP, UODO, EDPB), citation
   markers like [ref:N] or [1], or proper names of companies/people/laws.
3. Article references stay in their original form: "GDPR Art. 6(1)(f)" → may be
   localised ("RGPD art. 6, par. 1, point f") only if standard in the target
   jurisdiction; otherwise keep the English form.
4. Do not summarise, expand, or reorder content. One source sentence → one target
   sentence whenever possible.
5. Maintain the formal, advisory tone appropriate for a legal/compliance audience.
6. Return ONLY valid JSON matching the input shape. No markdown, no commentary.`;

    const userPrompt = `Translate the following compliance report into ${langName}.
Return the same JSON shape with translated string values.

INPUT JSON:
${JSON.stringify(envelope, null, 2)}`;

    // ── Call Lovable AI Gateway ─────────────────────────────────────────
    const aiResp = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResp.status === 429) {
      return jsonResponse({ error: "Rate limit reached. Please try again in a moment." }, 429);
    }
    if (aiResp.status === 402) {
      return jsonResponse({ error: "AI translation credits exhausted. Please contact support." }, 402);
    }
    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("translate-report: AI gateway error", aiResp.status, errText.slice(0, 500));
      return jsonResponse({ error: "Translation service failed" }, 502);
    }

    const aiData = await aiResp.json();
    const raw = aiData?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") {
      return jsonResponse({ error: "Translation returned no content" }, 502);
    }

    let translated: any;
    try {
      translated = JSON.parse(raw);
    } catch {
      // Strip code fences if present
      const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
      translated = JSON.parse(stripped);
    }

    // ── Cache result ────────────────────────────────────────────────────
    const { error: cacheErr } = await admin.from("report_translations").insert({
      report_type,
      report_id,
      target_lang,
      source_lang: "en",
      content_hash: contentHash,
      translated_content: translated,
      model: MODEL,
      user_id: user.id,
    });
    if (cacheErr) {
      console.warn("translate-report: cache write failed (non-fatal)", cacheErr);
    }

    return jsonResponse({
      translated_content: translated,
      cached: false,
      glossary_terms_applied: (glossary ?? []).length,
    });
  } catch (e) {
    console.error("translate-report fatal", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
