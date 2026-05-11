// Batch 5 — Backfill action_items, precedent_novelty, enrichment_quality,
// source_tier, and contextual_teaser for existing `updates` rows that already
// have an ai_summary but are missing one or more of these enrichment fields.
// Paginated, safe to call repeatedly. Default 20 rows per call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Source tier classification (mirrors fetch-updates) ─────────────
const TIER_1_DOMAINS = [
  "edpb.europa.eu", "edps.europa.eu", "ec.europa.eu", "europarl.europa.eu",
  "ico.org.uk", "cnil.fr", "garanteprivacy.it", "aepd.es", "bfdi.bund.de",
  "datenschutz", "datatilsynet", "dataprotection.ie", "dataprotection.gov",
  "ftc.gov", "cppa.ca.gov", "oag.ca.gov", "hhs.gov", "sec.gov", "justice.gov",
  "congress.gov", "federalregister.gov", "supremecourt.gov", "courtlistener.com",
  "coe.int", "oaic.gov.au", "pdpc.gov.sg", "priv.gc.ca", "pcpd.org.hk",
  "gdprhub.eu",
];
const TIER_2_DOMAINS = [
  "huntonprivacyblog.com", "hunton.com", "out-law.com", "twobirds.com",
  "cms.law", "cliffordchance.com", "aoshearman.com", "freshfields.com",
  "hsfnotes.com", "dataprotectionreport.com", "linklaters.com",
  "wilmerhale.com", "insideprivacy.com", "datamatters.sidley.com",
  "dlapiper.com", "gtlaw-dataprivacydish.com", "alstonprivacy.com",
  "privacyandcybersecuritylaw.com", "hoganlovells.com", "bakermckenzie.com",
  "jdsupra.com",
];
function inferSourceTier(domain: string | null): 1 | 2 | 3 {
  const d = (domain || "").toLowerCase();
  if (TIER_1_DOMAINS.some((t) => d.includes(t))) return 1;
  if (TIER_2_DOMAINS.some((t) => d.includes(t))) return 2;
  return 3;
}

function assessEnrichmentQuality(
  aiSummary: any,
  entities: any,
): "high" | "standard" | "low" {
  if (!aiSummary) return "low";
  const hasRegulator = (entities?.regulators?.length ?? 0) > 0 ||
    /\b(ICO|EDPB|CNIL|FTC|CPPA|BfDI|Garante|AEPD|DPC|DPA|supervisory authority)\b/i
      .test(aiSummary.why_it_matters_short ?? "");
  const hasLawRef = /(Article|Art\.|GDPR|CCPA|CPRA|BIPA|§|Regulation)\s*\d*/i
    .test(aiSummary.why_it_matters ?? "");
  const hasSpecificAction = (aiSummary.action_items ?? [])
    .some((a: any) =>
      /(Article|§|GDPR|CCPA|CPRA|ICO|EDPB|CNIL|FTC)/i.test(a?.action ?? "")
    );
  if (hasRegulator && hasLawRef && hasSpecificAction) return "high";
  if (hasRegulator || hasLawRef) return "standard";
  return "low";
}

async function generateActionsAndNovelty(
  title: string,
  fullWhy: string | null,
  summary: string | null,
  apiKey: string,
): Promise<
  {
    action_items?: Array<{ action: string; deadline?: string; severity?: string }>;
    precedent_novelty?: string;
  } | null
> {
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
        max_tokens: 600,
        system:
          "You produce concise privacy-regulatory metadata. Reply with one valid JSON object only — no preamble, no markdown.",
        messages: [{
          role: "user",
          content: `Given this privacy article, produce action items and a precedent novelty classification.

Title: ${title}
Why it matters: ${fullWhy || "(none)"}
Article summary: ${(summary || "").slice(0, 800)}

Return JSON:
{
  "action_items": [
    { "action": "Specific compliance step naming a regulator or law (e.g. 'Update Art. 13 GDPR notices to disclose...'). NOT generic ('monitor', 'review').", "deadline": "YYYY-MM-DD or null", "severity": "high | medium | low" }
  ],
  "precedent_novelty": "new_theory | confirms_existing | reverses_prior | routine"
}

Generate 1–3 action_items. If no specific named-law action applies, return []. Do not fabricate.`,
        }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (!text) return null;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    const result: any = {};
    if (Array.isArray(parsed.action_items)) {
      result.action_items = parsed.action_items
        .filter((a: any) => a && typeof a.action === "string" && a.action.trim())
        .slice(0, 3);
    }
    if (
      typeof parsed.precedent_novelty === "string" &&
      ["new_theory", "confirms_existing", "reverses_prior", "routine"]
        .includes(parsed.precedent_novelty)
    ) {
      result.precedent_novelty = parsed.precedent_novelty;
    }
    return result;
  } catch {
    return null;
  }
}

async function generateContextualTeaser(
  whyShort: string,
  apiKey: string,
): Promise<string | null> {
  try {
    const prompt =
      `Given this regulatory development: "${whyShort}"

Write ONE sentence (max 30 words) that describes the TYPE of contextual intelligence available — mention the jurisdiction or regulator and the nature of the pattern (e.g. divergence from prior enforcement focus, confirmation of emerging trend, relevant precedent history).
DO NOT reveal the specific content. The reader should understand the insight is real and specific but not be able to act on it without a subscription.
Return only the sentence, no quotes, no preamble.`;
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content?.[0]?.text || "").trim().replace(
      /^["']|["']$/g,
      "",
    );
    if (text.length > 20 && text.length < 240) return text;
    return null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      },
    );
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
  const mode = url.searchParams.get("mode") || "all"; // all | actions | tier | quality | teaser

  // Pull rows that have ai_summary but are missing one of the Batch 4/5 fields.
  const { data: rows, error } = await supabase
    .from("updates")
    .select(
      "id, title, summary, source_domain, ai_summary, action_items, precedent_novelty, enrichment_quality, source_tier, contextual_teaser, why_it_matters_short",
    )
    .not("ai_summary", "is", null)
    .or(
      "action_items.is.null,precedent_novelty.is.null,enrichment_quality.is.null,source_tier.is.null",
    )
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }

  const stats = {
    scanned: rows?.length || 0,
    updated: 0,
    failed: 0,
    teasers_generated: 0,
    actions_generated: 0,
    tier_set: 0,
    quality_set: 0,
  };

  for (const row of rows || []) {
    const ai = (row.ai_summary as any) || {};
    const patch: Record<string, unknown> = {};

    // 1. source_tier (deterministic, no AI)
    if (row.source_tier == null) {
      patch.source_tier = inferSourceTier(row.source_domain);
      stats.tier_set++;
    }

    // 2. action_items + precedent_novelty (AI)
    const needsActions = mode !== "tier" && mode !== "quality" &&
      mode !== "teaser" &&
      (!Array.isArray(row.action_items) || row.action_items.length === 0 ||
        !row.precedent_novelty);
    if (needsActions) {
      const out = await generateActionsAndNovelty(
        row.title,
        ai.why_it_matters || null,
        row.summary,
        apiKey,
      );
      if (out?.action_items && out.action_items.length > 0) {
        patch.action_items = out.action_items;
        stats.actions_generated++;
      }
      if (out?.precedent_novelty) {
        patch.precedent_novelty = out.precedent_novelty;
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    // 3. enrichment_quality (deterministic, depends on action_items)
    if (row.enrichment_quality == null) {
      const mergedSummary = {
        ...ai,
        action_items: patch.action_items ?? row.action_items ?? ai.action_items ??
          [],
      };
      patch.enrichment_quality = assessEnrichmentQuality(
        mergedSummary,
        ai.entities,
      );
      stats.quality_set++;
    }

    // 4. contextual_teaser (tier-1 + non-low quality)
    const finalTier = (patch.source_tier ?? row.source_tier) as
      | 1
      | 2
      | 3
      | null;
    const finalQuality = (patch.enrichment_quality ?? row.enrichment_quality) as
      | string
      | null;
    const whyShort = row.why_it_matters_short ||
      (typeof ai.why_it_matters_short === "string"
        ? ai.why_it_matters_short
        : null);
    if (
      !row.contextual_teaser &&
      finalTier === 1 &&
      finalQuality && finalQuality !== "low" &&
      whyShort
    ) {
      const teaser = await generateContextualTeaser(whyShort, apiKey);
      if (teaser) {
        patch.contextual_teaser = teaser;
        stats.teasers_generated++;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (Object.keys(patch).length === 0) continue;

    const { error: upErr } = await supabase
      .from("updates")
      .update(patch)
      .eq("id", row.id);
    if (upErr) stats.failed++;
    else stats.updated++;
  }

  return new Response(JSON.stringify(stats), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
