// translate-weekly-brief
// Server-side translation of the weekly Intelligence brief into a target
// language, with a per-(brief_date, language_code) cache in `brief_translations`.
//
// Auth model: this function is called server-side only. We require the caller
// to present the project's SERVICE_ROLE key in the Authorization header
// ("Bearer <service-role>"). It must NEVER be invoked from the browser.
//
// Failure semantics: on ANY error (Anthropic failure, parse error, exception),
// we return HTTP 200 with { fallback: true, translated_content: <english> }
// so the weekly send flow can silently deliver English without breakage.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  pt: "Portuguese",
  sv: "Swedish",
  ja: "Japanese",
  ko: "Korean",
  "zh-CN": "Chinese (Simplified)",
  ar: "Arabic",
  tr: "Turkish",
  da: "Danish",
  no: "Norwegian",
  fi: "Finnish",
  cs: "Czech",
  ro: "Romanian",
  el: "Greek",
  th: "Thai",
  id: "Indonesian",
  hi: "Hindi",
  he: "Hebrew",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fallback(englishContent: string) {
  return jsonResponse({
    translated_content: englishContent,
    from_cache: false,
    fallback: true,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

  // --- Auth: require service-role bearer token ---
  const authHeader = req.headers.get("authorization") ?? "";
  const presented = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!presented || presented !== SERVICE_KEY) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // --- Parse body (cannot fall back yet — we don't have english_content) ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const brief_date = typeof body?.brief_date === "string" ? body.brief_date : null;
  const language_code = typeof body?.language_code === "string" ? body.language_code : null;
  const english_content = typeof body?.english_content === "string" ? body.english_content : null;

  if (!brief_date || !language_code || !english_content) {
    return jsonResponse(
      { error: "brief_date, language_code, and english_content are required" },
      400,
    );
  }

  // No-op shortcut: if target is English, just return as-is (counts as cache miss
  // but no translation work — we don't even cache it).
  if (language_code === "en") {
    return jsonResponse({
      translated_content: english_content,
      from_cache: false,
      fallback: false,
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // --- Step 1: Cache check ---
  try {
    const { data: cached, error: cacheErr } = await supabase
      .from("brief_translations")
      .select("translated_content")
      .eq("brief_date", brief_date)
      .eq("language_code", language_code)
      .maybeSingle();

    if (!cacheErr && cached?.translated_content) {
      return jsonResponse({
        translated_content: cached.translated_content,
        from_cache: true,
        fallback: false,
      });
    }
  } catch (e) {
    console.error("[translate-weekly-brief] cache lookup failed:", (e as Error).message);
    // continue to translation attempt
  }

  // --- Step 2: Translate via Anthropic ---
  if (!ANTHROPIC_KEY) {
    console.error("[translate-weekly-brief] ANTHROPIC_API_KEY missing");
    return fallback(english_content);
  }

  const targetLanguageName = LANGUAGE_NAMES[language_code] ?? language_code;

  const systemPrompt =
`You are a professional legal and regulatory translator specialising in privacy law, data protection, and technology regulation. Translate the following weekly privacy intelligence brief from English into ${targetLanguageName}.

Requirements:
- Preserve all legal and regulatory terminology with precision
- Maintain the original structure, section headings, and formatting
- Preserve any HTML or markdown formatting present in the source
- Match the tone: authoritative, clear, professional
- Do not add commentary, explanations, or translator's notes
- Do not translate proper nouns: authority names (e.g. CNIL, BfDI, ICO), regulation names (e.g. GDPR, CCPA, LGPD), and organisation names should remain in their original form
- Return only the translated text, nothing else`;

  let translated: string | null = null;

  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: english_content }],
      }),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.error("[translate-weekly-brief] Anthropic non-2xx:", r.status, txt.slice(0, 500));
      return fallback(english_content);
    }

    const data = await r.json();
    // Anthropic messages API: { content: [{ type: 'text', text: '...' }, ...] }
    const block = Array.isArray(data?.content)
      ? data.content.find((b: any) => b?.type === "text" && typeof b?.text === "string")
      : null;
    translated = block?.text?.trim() ?? null;

    if (!translated) {
      console.error("[translate-weekly-brief] Anthropic returned empty text block");
      return fallback(english_content);
    }
  } catch (e) {
    console.error("[translate-weekly-brief] Anthropic call threw:", (e as Error).message);
    return fallback(english_content);
  }

  // --- Step 3: Cache write (ignore unique-violation race) ---
  try {
    const { error: insertErr } = await supabase
      .from("brief_translations")
      .insert({
        brief_date,
        language_code,
        translated_content: translated,
      });

    if (insertErr) {
      // Postgres unique_violation = 23505. supabase-js exposes .code.
      const code = (insertErr as any)?.code ?? "";
      if (code !== "23505") {
        console.error("[translate-weekly-brief] cache write failed:", insertErr);
      }
      // either way, return the freshly-translated content
    }
  } catch (e) {
    console.error("[translate-weekly-brief] cache write threw:", (e as Error).message);
  }

  // --- Step 4: Return ---
  return jsonResponse({
    translated_content: translated,
    from_cache: false,
    fallback: false,
  });
});
