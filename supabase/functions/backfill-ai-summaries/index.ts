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
            content: `You are a privacy regulatory analyst.
Return ONLY valid JSON. No preamble, no markdown.

Analyze this article.
Title: ${title}
Description: ${summary || "No description."}
Source: ${sourceName || "Unknown"}

If not about privacy regulation, return: {"skip": true}

Otherwise return JSON with fields:
- why_it_matters (string)
- takeaways (array of strings)
- compliance_impact (string)
- who_should_care (one of: "DPO", "Privacy Counsel", "Compliance Manager", "CISO", "All privacy professionals")
- urgency (one of: "Immediate", "This quarter", "Monitor")
- legal_weight (one of: "Binding", "Enforcement", "Guidance", "Proposal", "Commentary")
- source_strength (one of: "Official", "Credible", "Secondary")
- cross_jurisdiction_signal (string or null)`,
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

  const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN");
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  console.log("AUTH DEBUG: secret set?", !!ADMIN_SECRET, "token length:", token.length, "match:", token === ADMIN_SECRET);
  if (!ADMIN_SECRET || token !== ADMIN_SECRET)
    return new Response(JSON.stringify({ error: "Unauthorized", debug: { secretSet: !!ADMIN_SECRET, tokenLength: token.length } }), {
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
    .is("ai_summary", null)
    .order("published_at", { ascending: false })
    .limit(batchSize);

  const { count } = await supabase
    .from("updates")
    .select("id", { count: "exact", head: true })
    .is("ai_summary", null);

  let updated = 0,
    skipped = 0;

  for (const article of articles ?? []) {
    const aiSummary = await generateAISummary(
      article.title,
      article.summary,
      article.source_name,
      anthropicKey
    );
    if (aiSummary) {
      await supabase
        .from("updates")
        .update({ ai_summary: aiSummary })
        .eq("id", article.id);
      updated++;
    } else {
      await supabase
        .from("updates")
        .update({ ai_summary: { skipped: true } })
        .eq("id", article.id);
      skipped++;
    }
    await new Promise((r) => setTimeout(r, 500)); // rate limit between articles
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
