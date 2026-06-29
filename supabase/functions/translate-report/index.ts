// translate-report
// User-callable, on-demand translation of any generated report into one of 23
// languages. Mirrors translate-weekly-brief's structure-preservation prompt
// + cache pattern, with two differences:
//   - user JWT required (ownership check on the underlying report row)
//   - a hard 4-language cap per (tool_type, report_id)
//
// Cost model: Haiku ~$0.01–0.03/translation, cached forever per (report, language), capped at 4 languages/report.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// VERIFIED list: must match SampleBriefLanguageToggle.tsx (23 codes).
const ALLOWED_LANGUAGES = new Set([
  "fr","de","es","pt","ja","zh-CN","ar","ko","it","nl","pl","sv",
  "da","no","fi","cs","ro","el","tr","th","id","hi","he",
]);

const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French", de: "German", es: "Spanish", pt: "Portuguese",
  ja: "Japanese", "zh-CN": "Chinese (Simplified)", ar: "Arabic",
  ko: "Korean", it: "Italian", nl: "Dutch", pl: "Polish",
  sv: "Swedish", da: "Danish", no: "Norwegian", fi: "Finnish",
  cs: "Czech", ro: "Romanian", el: "Greek", tr: "Turkish",
  th: "Thai", id: "Indonesian", hi: "Hindi", he: "Hebrew",
};

const TRANSLATION_NOTICE =
  "Machine translation provided for convenience. The English original is the authoritative version of this document. Statutory citations refer to the official texts; official language versions are available from EUR-Lex or the issuing regulator.";

// Map tool_type -> result table + text columns. Ownership is via user_id
// directly unless `ownerVia` says otherwise (sessions/documents that route
// through `clients.owner_id`).
type ToolSource = {
  table: string;
  textColumns: string[];
  ownerVia?: { joinTable: string; joinColumn: string; ownerColumn: string };
};

const TOOL_SOURCES: Record<string, ToolSource> = {
  li_assessment:         { table: "li_assessments",         textColumns: ["report_data"] },
  dpia_framework:        { table: "dpia_frameworks",        textColumns: ["report_data"] },
  governance_assessment: { table: "governance_assessments", textColumns: ["report_data"] },
  dpa:                   { table: "dpa_documents",          textColumns: ["report_data", "document_text"] },
  ir_playbook:           { table: "ir_playbooks",           textColumns: ["report_data", "playbook_text"] },
  biometric:             { table: "biometric_assessments",  textColumns: ["report_data", "analysis_text"] },
  cppa_risk:             { table: "cppa_assessments",       textColumns: ["report_data", "document_a_text", "document_b_text"] },
  cppa_cyber:            { table: "cppa_assessments",       textColumns: ["report_data", "document_a_text", "document_b_text"] },
  // RoPA / notices: generated documents live as files in storage. The row
  // itself carries no translatable prose, so we accept the request, verify
  // ownership, and return NOT_TRANSLATABLE for now.
  ropa:        { table: "ropa_sessions",        textColumns: [], ownerVia: { joinTable: "clients", joinColumn: "client_id", ownerColumn: "owner_id" } },
  us_notice:   { table: "us_notice_sessions",   textColumns: [], ownerVia: { joinTable: "clients", joinColumn: "client_id", ownerColumn: "owner_id" } },
  eu_notice:   { table: "eu_notice_sessions",   textColumns: [], ownerVia: { joinTable: "clients", joinColumn: "client_id", ownerColumn: "owner_id" } },
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripFences(s: string): string {
  let t = s.trim();
  // ```json\n...\n```
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  // --- Auth: user JWT required ---
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  const user = userRes?.user;
  if (userErr || !user) return json({ error: "Unauthorized" }, 401);

  // --- Body ---
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body" }, 400); }
  const tool_type = typeof body?.tool_type === "string" ? body.tool_type : null;
  const report_id = typeof body?.report_id === "string" ? body.report_id : null;
  const language_code = typeof body?.language_code === "string" ? body.language_code : null;
  if (!tool_type || !report_id || !language_code) {
    return json({ error: "tool_type, report_id, and language_code are required" }, 400);
  }

  // English shortcut
  if (language_code === "en") return json({ english: true });

  if (!ALLOWED_LANGUAGES.has(language_code)) {
    return json({ error: `Unsupported language: ${language_code}` }, 400);
  }

  const source = TOOL_SOURCES[tool_type];
  if (!source) return json({ error: `Unknown tool_type: ${tool_type}` }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // --- Fetch row + ownership check ---
  const { data: row, error: rowErr } = await admin
    .from(source.table)
    .select("*")
    .eq("id", report_id)
    .maybeSingle();
  if (rowErr) return json({ error: "Lookup failed", detail: rowErr.message }, 500);
  if (!row) return json({ error: "Report not found" }, 404);

  let isOwner = false;
  if (source.ownerVia) {
    const clientId = (row as any)[source.ownerVia.joinColumn];
    if (clientId) {
      const { data: joinRow } = await admin
        .from(source.ownerVia.joinTable)
        .select(source.ownerVia.ownerColumn)
        .eq("id", clientId)
        .maybeSingle();
      isOwner = !!joinRow && (joinRow as any)[source.ownerVia.ownerColumn] === user.id;
    }
  } else {
    isOwner = (row as any).user_id === user.id;
  }
  if (!isOwner) return json({ error: "Forbidden" }, 403);

  // --- Cache check (schema: report_type, target_lang, translated_content) ---
  const { data: cached } = await admin
    .from("report_translations")
    .select("translated_content")
    .eq("report_type", tool_type)
    .eq("report_id", report_id)
    .eq("target_lang", language_code)
    .maybeSingle();
  if (cached?.translated_content) {
    return json({ translated_payload: cached.translated_content, from_cache: true });
  }

  // --- 4-language cap (count existing distinct languages for this report) ---
  const { count: cachedCount } = await admin
    .from("report_translations")
    .select("target_lang", { count: "exact", head: true })
    .eq("report_type", tool_type)
    .eq("report_id", report_id);
  if ((cachedCount ?? 0) >= 4) {
    return json(
      { error: "TRANSLATION_LIMIT: This report has reached its limit of 4 translated languages." },
      403,
    );
  }

  // --- Build translatable payload from text columns ---
  const payload: Record<string, unknown> = {};
  for (const col of source.textColumns) {
    const v = (row as any)[col];
    if (v !== null && v !== undefined && !(typeof v === "string" && v.trim() === "")) {
      payload[col] = v;
    }
  }
  if (Object.keys(payload).length === 0) {
    return json(
      { error: "NOT_TRANSLATABLE: This document type does not yet support translation." },
      400,
    );
  }

  if (!ANTHROPIC_KEY) {
    return json({ error: "Translation service unavailable" }, 502);
  }

  const targetLanguageName = LANGUAGE_NAMES[language_code] ?? language_code;

  const systemPrompt =
`You are a professional legal and regulatory translator specialising in privacy law, data protection, and technology regulation. Translate the JSON payload below from English into ${targetLanguageName}.

Requirements:
- Translate ALL human-readable string values into ${targetLanguageName}.
- Preserve JSON structure exactly: every key, array length, nesting, and non-string value unchanged.
- NEVER translate: citation markers like [Art. 6(1)(f)], [Recital 47], [E1], [A2], [F3], [EDPB ...]; statutory citation strings (e.g. "GDPR Article 6(1)", "Cal. Civ. Code § 1798.140"); regulator names; URLs; dates; numbers; enum-like status values.
- Return ONLY the translated JSON, no fences, no commentary.`;

  async function translateOnce(): Promise<any> {
    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 16000,
        system: systemPrompt,
        messages: [{ role: "user", content: JSON.stringify(payload) }],
      }),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`Anthropic ${r.status}: ${t.slice(0, 400)}`);
    }
    const data = await r.json();
    const block = Array.isArray(data?.content)
      ? data.content.find((b: any) => b?.type === "text" && typeof b?.text === "string")
      : null;
    const text = block?.text?.trim();
    if (!text) throw new Error("Empty translation text");
    return JSON.parse(stripFences(text));
  }

  let translated: any;
  try {
    translated = await translateOnce();
  } catch (e1) {
    console.error("[translate-report] first attempt failed:", (e1 as Error).message);
    try {
      translated = await translateOnce();
    } catch (e2) {
      console.error("[translate-report] retry failed:", (e2 as Error).message);
      return json({ error: "Translation failed" }, 502);
    }
  }

  // --- Disclaimer injection ---
  if (translated && typeof translated === "object" && !Array.isArray(translated)) {
    (translated as Record<string, unknown>).translation_notice = TRANSLATION_NOTICE;
  } else {
    translated = { content: translated, translation_notice: TRANSLATION_NOTICE };
  }

  // --- Cache insert (best effort). content_hash is NOT NULL; derive from payload. ---
  const payloadJson = JSON.stringify(payload);
  const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payloadJson));
  const contentHash = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const { error: insertErr } = await admin.from("report_translations").insert({
    user_id: user.id,
    report_type: tool_type,
    report_id,
    target_lang: language_code,
    source_lang: "en",
    content_hash: contentHash,
    translated_content: translated,
    model: ANTHROPIC_MODEL,
  });
  if (insertErr) {
    const code = (insertErr as any)?.code ?? "";
    if (code !== "23505") {
      console.error("[translate-report] cache write failed:", insertErr.message);
    }
  }

  return json({ translated_payload: translated, from_cache: false });
});
