// Backfill `why_it_matters_short` + `related_signals` for `updates` rows that
// already have an `ai_summary` but are missing the new short/signals fields.
// Designed for safe, paginated batches (default 25 rows per call).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateShortAndSignals(
  title: string,
  fullWhy: string | null,
  summary: string | null,
  apiKey: string,
): Promise<{ short?: string; signals?: Array<{ label: string; kind?: string }> } | null> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: "You produce concise privacy-regulatory metadata. Reply with one valid JSON object only — no preamble, no markdown.",
        messages: [{
          role: "user",
          content: `Given this privacy article, produce two fields:

Title: ${title}
Existing 2-sentence "Why it matters": ${fullWhy || "(none)"}
Article summary: ${(summary || "").slice(0, 600)}

Return JSON:
{
  "why_it_matters_short": "ONE sentence, max 25 words. Name the regulator and the stake. No generic phrasing.",
  "related_signals": [
    { "label": "Short pattern/precedent observation, e.g. '3rd CCPA action this quarter' or 'Mirrors EDPB binding decision 02/2026'", "kind": "pattern | precedent | trend" }
  ]
}

Return 1–3 signals if a meaningful pattern is evident; return [] if none. No fabrication.`,
        }],
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    return {
      short: typeof parsed.why_it_matters_short === "string" ? parsed.why_it_matters_short.trim() : undefined,
      signals: Array.isArray(parsed.related_signals)
        ? parsed.related_signals
            .filter((s: any) => s && typeof s.label === "string" && s.label.trim())
            .slice(0, 4)
        : undefined,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25"), 100);

  // Find rows that have ai_summary.why_it_matters but are missing the new short field.
  const { data: rows, error } = await supabase
    .from("updates")
    .select("id, title, summary, ai_summary, why_it_matters_short, related_signals")
    .not("ai_summary", "is", null)
    .is("why_it_matters_short", null)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  let updated = 0;
  let failed = 0;
  for (const row of rows || []) {
    const fullWhy = (row.ai_summary as any)?.why_it_matters || null;
    const result = await generateShortAndSignals(row.title, fullWhy, row.summary, apiKey);
    if (!result || (!result.short && !result.signals)) {
      failed++;
      continue;
    }
    const patch: Record<string, unknown> = {};
    if (result.short) patch.why_it_matters_short = result.short;
    if (result.signals && result.signals.length > 0) patch.related_signals = result.signals;
    if (Object.keys(patch).length === 0) {
      failed++;
      continue;
    }
    const { error: upErr } = await supabase.from("updates").update(patch).eq("id", row.id);
    if (upErr) failed++;
    else updated++;
    // Pace Anthropic
    await new Promise((r) => setTimeout(r, 250));
  }

  return new Response(
    JSON.stringify({ scanned: rows?.length || 0, updated, failed }),
    { headers: { ...corsHeaders, "content-type": "application/json" } },
  );
});
