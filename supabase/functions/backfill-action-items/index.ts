// Batch 5 — Backfill action_items, precedent_novelty, enrichment_quality,
// source_tier, and contextual_teaser for existing `updates` rows that already
// have an ai_summary but are missing one or more of these enrichment fields.
// Paginated, safe to call repeatedly. Default 20 rows per call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateActionItemsPatch } from "../_shared/ai-validation.ts";

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
          "You produce concise privacy-regulatory metadata grounded STRICTLY in the source text provided. Reply with one valid JSON object only — no preamble, no markdown.\n\nSOURCE FIDELITY RULES:\n- Only produce action_items that follow directly from a regulator, law, or obligation explicitly named in the source text.\n- Only classify precedent_novelty using cues present in the source text. If the source does not discuss prior practice, use \"routine\".\n- Never invent regulators, articles, deadlines, sectors, or enforcement patterns. If the source is thin or generic, return an empty action_items array.\n\nACTION ITEM DISCIPLINE (HARD RULES):\n- An action item REQUIRES (a) a specific named law/regulation/regulator from the source AND (b) a dated obligation, deadline, or concrete compliance step tied to that named item.\n- If the source does not name a specific law, regulator, or dated obligation, return action_items: []. A \"Monitor\"-level observation is NOT an action item.\n- Do NOT reclassify a Monitor observation as \"Immediate\" or \"This quarter\" to fill the array. Empty is correct and expected.\n- \"Monitor\" is FORBIDDEN as a timeframe value. Only \"Immediate (within 7 days)\" or \"This quarter\" are allowed, and only when (a) and (b) above are both satisfied.",
        messages: [{
          role: "user",
          content: `Given this privacy article, produce action items and a precedent novelty classification — grounded ONLY in the text below.

Title: ${title}
Why it matters: ${fullWhy || "(none)"}
Article summary: ${(summary || "").slice(0, 800)}

Return JSON:
{
  "action_items": [
    { "role": "DPO | Privacy Counsel | CISO | Compliance Manager", "action": "Specific compliance step that names a regulator or law EXPLICITLY mentioned in the source above (e.g. 'Update Art. 13 GDPR notices to disclose new AI processing purpose'). NOT generic ('monitor', 'review'). NOT inferred from outside knowledge.", "timeframe": "Immediate (within 7 days) | This quarter" }
  ],
  "precedent_novelty": "new_theory | confirms_existing | reverses_prior | routine"
}

Generate 0–3 action_items. Return [] if the source does not name a specific law/regulator/dated obligation. A Monitor-level observation is NOT an action item — do not invent an Immediate or This-quarter item just to fill the array. Empty is the correct answer for thin or commentary sources.`,
        }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const text = json.content?.[0]?.text;
    if (!text) return null;
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    const v = validateActionItemsPatch(parsed, { fn: "backfill-action-items", title });
    if (!v.ok) return null;
    const data = v.data;
    const result: any = {};
    if (Array.isArray(data.action_items)) {
      result.action_items = (data.action_items as any[])
        .filter((a: any) => a && typeof a.action === "string" && a.action.trim())
        .slice(0, 3);
    }
    if (
      typeof data.precedent_novelty === "string" &&
      ["new_theory", "confirms_existing", "reverses_prior", "routine"]
        .includes(data.precedent_novelty)
    ) {
      result.precedent_novelty = data.precedent_novelty;
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

Write ONE sentence (max 30 words) that describes the TYPE of contextual intelligence available — name the specific jurisdiction or regulator and the nature of the insight (divergence from prior enforcement, confirmation of emerging trend, novel regulatory theory, relevant historical precedent).
DO NOT reveal the specific content. The reader should understand the insight is real and specific but not be able to act on it without subscribing.
WRONG: "This development reveals an important pattern in EU enforcement practices that has significant implications for data processors."
RIGHT: "The CNIL's position here diverges from both the EDPB and ICO, creating a jurisdiction-specific compliance gap for organisations operating across all three."
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
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);
  const concurrency = Math.min(
    Math.max(parseInt(url.searchParams.get("concurrency") || "5"), 1),
    10,
  );
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
    concurrency,
  };

  async function processRow(row: any) {
    const ai = (row.ai_summary as any) || {};
    const patch: Record<string, unknown> = {};

    // 1. source_tier (deterministic)
    if (row.source_tier == null) {
      patch.source_tier = inferSourceTier(row.source_domain);
      stats.tier_set++;
    }

    // 2. action_items + precedent_novelty (AI) — run in parallel with teaser below
    const needsActions = mode !== "tier" && mode !== "quality" &&
      mode !== "teaser" &&
      (!Array.isArray(row.action_items) || row.action_items.length === 0 ||
        !row.precedent_novelty);

    // 4-prep. teaser eligibility uses pre-existing tier/quality (deterministic)
    const preTier = (patch.source_tier ?? row.source_tier) as 1 | 2 | 3 | null;
    const whyShort = row.why_it_matters_short ||
      (typeof ai.why_it_matters_short === "string"
        ? ai.why_it_matters_short
        : null);
    // We need a quality estimate to gate teaser; if not set yet, compute provisional
    // using existing action_items (will be re-evaluated post-action below if needed).
    const provisionalQuality = row.enrichment_quality ??
      assessEnrichmentQuality(
        { ...ai, action_items: row.action_items ?? ai.action_items ?? [] },
        ai.entities,
      );
    const wantsTeaser = !row.contextual_teaser && preTier === 1 &&
      provisionalQuality !== "low" && !!whyShort;

    const [actionsRes, teaserRes] = await Promise.all([
      needsActions
        ? generateActionsAndNovelty(
          row.title,
          ai.why_it_matters || null,
          row.summary,
          apiKey!,
        )
        : Promise.resolve(null),
      wantsTeaser
        ? generateContextualTeaser(whyShort!, apiKey!)
        : Promise.resolve(null),
    ]);

    if (actionsRes?.action_items && actionsRes.action_items.length > 0) {
      patch.action_items = actionsRes.action_items;
      stats.actions_generated++;
    }
    if (actionsRes?.precedent_novelty) {
      patch.precedent_novelty = actionsRes.precedent_novelty;
    }

    // 3. enrichment_quality — recompute now that action_items may exist
    if (row.enrichment_quality == null) {
      const mergedSummary = {
        ...ai,
        action_items: patch.action_items ?? row.action_items ??
          ai.action_items ?? [],
      };
      patch.enrichment_quality = assessEnrichmentQuality(
        mergedSummary,
        ai.entities,
      );
      stats.quality_set++;
    }

    if (teaserRes) {
      patch.contextual_teaser = teaserRes;
      stats.teasers_generated++;
    }

    if (Object.keys(patch).length === 0) return;

    const { error: upErr } = await supabase
      .from("updates")
      .update(patch)
      .eq("id", row.id);
    if (upErr) stats.failed++;
    else stats.updated++;
  }

  // Process in parallel chunks of `concurrency` rows.
  const all = rows || [];
  for (let i = 0; i < all.length; i += concurrency) {
    const chunk = all.slice(i, i + concurrency);
    await Promise.all(chunk.map((r) => processRow(r).catch(() => {
      stats.failed++;
    })));
  }

  return new Response(JSON.stringify(stats), {
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
});
