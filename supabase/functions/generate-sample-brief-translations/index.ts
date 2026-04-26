// generate-sample-brief-translations
// Admin-only: translates the public Sample Brief into all 23 supported
// non-English languages in parallel via translate-weekly-brief, then upserts
// each result into sample_brief_translations (public-readable cache).
//
// Uses a fixed brief_date "2026-03-11" so translate-weekly-brief's cache
// (brief_translations) doesn't collide with any real weekly brief.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN")!;

const SAMPLE_BRIEF_DATE = "2026-03-11";

const TARGET_LANGUAGES = [
  "fr", "de", "es", "it", "nl", "pl", "pt", "sv",
  "ja", "ko", "zh-CN",
  "ar", "tr", "da", "no", "fi", "cs", "ro", "el",
  "th", "id", "hi", "he",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function translateOne(
  lang: string,
  englishContent: string,
): Promise<{ lang: string; ok: true; content: string } | { lang: string; ok: false; reason: string }> {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/translate-weekly-brief`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        brief_date: SAMPLE_BRIEF_DATE,
        language_code: lang,
        english_content: englishContent,
      }),
    });
    if (!r.ok) {
      return { lang, ok: false, reason: `HTTP ${r.status}` };
    }
    const data = await r.json();
    if (data?.fallback) {
      return { lang, ok: false, reason: "translator returned fallback" };
    }
    if (typeof data?.translated_content !== "string" || !data.translated_content.trim()) {
      return { lang, ok: false, reason: "empty translated_content" };
    }
    return { lang, ok: true, content: data.translated_content };
  } catch (e) {
    return { lang, ok: false, reason: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Auth
  const auth = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!ADMIN_SECRET || auth !== ADMIN_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  // Body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const englishContent = typeof body?.english_content === "string" ? body.english_content : "";
  if (!englishContent.trim()) {
    return json({ error: "english_content is required" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Translate all in parallel
  const results = await Promise.all(
    TARGET_LANGUAGES.map((lang) => translateOne(lang, englishContent)),
  );

  const failed: string[] = [];
  const failureDetails: Record<string, string> = {};
  let translated = 0;

  // Upsert successes
  await Promise.all(
    results.map(async (r) => {
      if (!r.ok) {
        failed.push(r.lang);
        failureDetails[r.lang] = r.reason;
        console.error(`[generate-sample-brief-translations] ${r.lang} failed: ${r.reason}`);
        return;
      }
      const { error } = await supabase
        .from("sample_brief_translations")
        .upsert(
          {
            language_code: r.lang,
            translated_content: r.content,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "language_code" },
        );
      if (error) {
        failed.push(r.lang);
        failureDetails[r.lang] = `upsert failed: ${error.message}`;
        console.error(`[generate-sample-brief-translations] ${r.lang} upsert failed`, error);
      } else {
        translated += 1;
      }
    }),
  );

  return json({
    success: true,
    translated,
    failed,
    failureDetails,
  });
});
