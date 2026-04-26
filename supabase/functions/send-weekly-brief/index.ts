// send-weekly-brief
// Fetches the latest weekly brief, queries confirmed subscribers, joins to
// profiles for preferred_language, translates the brief once per required
// language via translate-weekly-brief (with built-in caching + fallback),
// and dispatches per-recipient emails through the shared Resend helper.
//
// Auth: ADMIN_SECRET_TOKEN bearer (same pattern as generate-weekly-brief).
// Dry-run: while RESEND_API_KEY is unset, sendEmail() no-ops and returns
// { skipped: true }. This function still runs end-to-end so logs reveal
// exactly which subscribers would have been emailed in which language.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Build the canonical English HTML body of the brief. Kept simple — the
// translator preserves structure/HTML, and sections may be null.
function renderBriefHtml(brief: any): string {
  const sections: Array<[string, string | null | undefined]> = [
    ["Executive Summary", brief.executive_summary],
    ["US Federal", brief.us_federal],
    ["US States", brief.us_states],
    ["EU & UK", brief.eu_uk],
    ["Global Developments", brief.global_developments],
    ["AI Governance", brief.ai_governance],
    ["Biometric Data", brief.biometric_data],
    ["Privacy Litigation", brief.privacy_litigation],
    ["AdTech & Advertising", brief.adtech_advertising],
    ["Enforcement Trends", brief.enforcement_trends],
    ["Cross-Jurisdiction Patterns", brief.cross_jurisdiction_patterns],
    ["Trend Signal", brief.trend_signal],
    ["Why This Matters", brief.why_this_matters],
  ];

  const body = sections
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(([h, v]) => `<h2>${h}</h2>\n<div>${v}</div>`)
    .join("\n");

  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111">
<h1>${brief.headline}</h1>
<p style="color:#666;font-size:14px">${brief.week_label}</p>
${body}
<hr style="margin-top:32px;border:none;border-top:1px solid #eee">
<p style="font-size:12px;color:#888">EndUserPrivacy Weekly Intelligence Brief</p>
</body></html>`;
}

async function translateForLanguage(
  briefDate: string,
  languageCode: string,
  englishContent: string,
): Promise<{ content: string; fallback: boolean; fromCache: boolean }> {
  if (languageCode === "en") {
    return { content: englishContent, fallback: false, fromCache: false };
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/translate-weekly-brief`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        brief_date: briefDate,
        language_code: languageCode,
        english_content: englishContent,
      }),
    });
    if (!r.ok) {
      console.error(`[send-weekly-brief] translate ${languageCode} HTTP ${r.status}`);
      return { content: englishContent, fallback: true, fromCache: false };
    }
    const data = await r.json();
    return {
      content: data.translated_content ?? englishContent,
      fallback: !!data.fallback,
      fromCache: !!data.from_cache,
    };
  } catch (e) {
    console.error(`[send-weekly-brief] translate ${languageCode} threw:`, (e as Error).message);
    return { content: englishContent, fallback: true, fromCache: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // --- Auth ---
  const auth = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!ADMIN_SECRET || auth !== ADMIN_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // --- Step 1: latest weekly brief ---
  const { data: brief, error: briefErr } = await supabase
    .from("weekly_briefs")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (briefErr || !brief) {
    console.error("[send-weekly-brief] no brief found", briefErr);
    return json({ error: "No weekly brief available" }, 404);
  }

  const briefDate = (brief.published_at as string).slice(0, 10); // YYYY-MM-DD
  const englishHtml = renderBriefHtml(brief);
  const englishSubject = `${brief.headline} — ${brief.week_label}`;

  // --- Step 2: confirmed subscribers + preferred_language ---
  // email_signups has no FK to profiles; join in code by email -> auth user -> profile.
  const { data: signups, error: signupErr } = await supabase
    .from("email_signups")
    .select("email")
    .eq("confirmed", true)
    .is("unsubscribed_at", null);

  if (signupErr) {
    console.error("[send-weekly-brief] subscriber query failed", signupErr);
    return json({ error: "subscriber query failed" }, 500);
  }

  const recipients = (signups ?? []).map((r) => r.email).filter(Boolean);
  if (recipients.length === 0) {
    return json({ ok: true, sent: 0, skipped: 0, note: "No confirmed subscribers" });
  }

  // Map email -> preferred_language by paging through auth users (admin API).
  // Subscriber lists are small enough (sub-10k) that this is fine.
  const emailToLang = new Map<string, string>();
  try {
    let page = 1;
    const perPage = 1000;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[send-weekly-brief] listUsers failed", error);
        break;
      }
      const users = data?.users ?? [];
      if (users.length === 0) break;

      const ids = users.map((u) => u.id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, preferred_language")
        .in("id", ids);
      const langById = new Map<string, string>();
      (profs ?? []).forEach((p: any) => langById.set(p.id, p.preferred_language || "en"));

      for (const u of users) {
        if (!u.email) continue;
        emailToLang.set(u.email.toLowerCase(), langById.get(u.id) || "en");
      }

      if (users.length < perPage) break;
      page += 1;
      if (page > 20) break; // safety
    }
  } catch (e) {
    console.error("[send-weekly-brief] preferred_language lookup threw:", (e as Error).message);
  }

  // --- Step 3: group recipients by language ---
  const byLang = new Map<string, string[]>();
  for (const email of recipients) {
    const lang = emailToLang.get(email.toLowerCase()) || "en";
    if (!byLang.has(lang)) byLang.set(lang, []);
    byLang.get(lang)!.push(email);
  }

  console.log(
    `[send-weekly-brief] dispatching brief ${briefDate} to ${recipients.length} subscribers across ${byLang.size} language(s):`,
    Object.fromEntries([...byLang.entries()].map(([k, v]) => [k, v.length])),
  );

  // --- Step 4: translate once per language, then send ---
  const stats = {
    total: recipients.length,
    sent: 0,
    skipped: 0,
    errors: 0,
    by_language: {} as Record<string, { count: number; fallback: boolean; from_cache: boolean }>,
  };

  // Step 4: translate all required languages in parallel, then send
  const translationEntries = await Promise.all(
    [...byLang.entries()].map(async ([lang, emails]) => {
      const result = await translateForLanguage(briefDate, lang, englishHtml);
      return { lang, emails, ...result };
    })
  );

  for (const { lang, emails, content, fallback, fromCache } of translationEntries) {
    stats.by_language[lang] = { count: emails.length, fallback, from_cache: fromCache };
    const subject = englishSubject;
    for (const to of emails) {
      try {
        const res = await sendEmail({
          to,
          subject,
          html: content,
          tags: [
            { name: "type", value: "weekly_brief" },
            { name: "lang", value: lang },
            { name: "brief_date", value: briefDate },
          ],
        });
        if (res.skipped) stats.skipped += 1;
        else if (res.error) stats.errors += 1;
        else stats.sent += 1;
      } catch (e) {
        stats.errors += 1;
        console.error(`[send-weekly-brief] send failed for ${to}:`, (e as Error).message);
      }
    }
  }

  console.log("[send-weekly-brief] done", stats);
  return json({ ok: true, brief_date: briefDate, ...stats });
});
