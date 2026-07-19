import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ADVISORY_VOICE_RULES } from "../_shared/advisory-voice.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function fetchRelevantArticles(
  categories: string[],
  tags: string[],
  limit = 15,
) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabase
    .from("updates")
    .select("id, title, why_it_matters_short, ai_summary, category, published_at, source_name")
    .gte("published_at", thirtyDaysAgo.toISOString())
    .not("ai_summary", "is", null)
    .order("published_at", { ascending: false });

  if (categories.length > 0) {
    query = query.in("category", categories);
  }

  const { data } = await query.limit(limit * 2);
  if (!data) return [];

  if (tags.length > 0) {
    const tagged = data.filter((a: any) => {
      const articleTags: string[] = a.ai_summary?.topic_tags ?? [];
      return tags.some((t) => articleTags.includes(t));
    });
    if (tagged.length >= 3) return tagged.slice(0, limit);
  }

  return data.slice(0, limit);
}

function buildArticleDigest(articles: any[]): string {
  if (articles.length === 0) return "No articles found for this topic in the last 30 days.";
  return articles.map((a, i) => {
    const why = a.why_it_matters_short ?? a.ai_summary?.why_it_matters_short ?? "";
    const impact = a.ai_summary?.compliance_impact ?? "";
    return `[${i + 1}] ${a.source_name} — ${a.title} (${a.published_at?.slice(0, 10)})
${why ? `  Why it matters: ${why}` : ""}
${impact ? `  Compliance impact: ${impact}` : ""}`.trim();
  }).join("\n\n");
}

async function generateSynthesis(
  sectionHeading: string,
  pageSlug: string,
  articles: any[],
  model: string,
): Promise<{ synthesis_text: string; headlines: Array<{ title: string; source_article_id: string | null; why_it_matters: string }> }> {
  const articleCount = articles.length;
  const digest = buildArticleDigest(articles);

  // Pass an explicit id index so the model can attribute headlines back to article rows.
  const idIndex = articles.map((a: any, i: number) => `[${i + 1}] id=${a.id}`).join("\n");

  const systemPrompt = `You are a senior privacy regulatory analyst at a leading intelligence firm. You write tiered research topic intelligence for DPOs and privacy counsel.

You will return STRICT JSON ONLY, with this exact shape:
{
  "headlines": [
    { "ref": <number>, "title": <string>, "why_it_matters": <string> }
  ],
  "synthesis_text": <string>
}

HEADLINES (3–5 items):
- Pick the 3–5 most consequential developments from the supplied articles, ordered by legal weight (binding enforcement > regulatory guidance > commentary).
- "ref" MUST be the bracket number of the source article from the digest (e.g. 1, 2, 3).
- "title" is a tight one-line headline (no more than ~110 characters). Do not copy the source headline verbatim if it is vague — rewrite for clarity. Name the regulator/jurisdiction where helpful.
- "why_it_matters" is ONE sentence (max ~180 chars) explaining the compliance implication for the practitioner. Concrete, not generic.

SYNTHESIS_TEXT (2–3 paragraphs, plain prose):
1. No headings. No bullets. No preamble.
2. LEGAL WEIGHT HIERARCHY: Lead with the highest-weight development. Never open with a law-firm blog when a regulatory decision is present.
3. Be specific: name the regulator, the decision/guidance title, fines, and the precise compliance obligation it creates — but ONLY as these appear in the supplied articles.
4. SOURCE FIDELITY (non-negotiable): every regulator, statute, fine, case, and date in headlines and synthesis_text MUST come from the digest above. Do not invent comparators or precedents from outside knowledge.
5. SOURCE CALIBRATION: Direct declarative voice for official regulatory sources; attribution ("According to reported accounts...", "Coverage suggests...") for secondary sources.
6. If there are no significant developments, write one paragraph naming exactly what to monitor and why — do not pad with speculation.
7. Write directly to the practitioner using "you" and "your".
8. Do not start with "In the last 30 days" or similar time phrases.

Return JSON only. No markdown fences. No commentary.`;

  const userPrompt = `Section: "${sectionHeading}" (on the ${pageSlug} research page)

Source articles from the last 30 days (${articleCount} articles):

${digest}

Article id index (use these refs in headlines[].ref):
${idIndex}

Return the JSON object now.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 3200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
  const data = await response.json();
  const raw = (data.content?.[0]?.text ?? "").trim();

  // Strip accidental code fences and parse.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: any = {};
  try {
    parsed = JSON.parse(cleaned);
  } catch (_e) {
    // Fallback: treat the whole response as prose; no headlines.
    return { synthesis_text: raw, headlines: [] };
  }

  const headlines = Array.isArray(parsed.headlines)
    ? parsed.headlines
        .map((h: any) => {
          const refIdx = Number(h?.ref);
          const src = Number.isFinite(refIdx) && refIdx >= 1 && refIdx <= articles.length
            ? articles[refIdx - 1]
            : null;
          return {
            title: String(h?.title ?? "").trim(),
            source_article_id: src?.id ?? null,
            why_it_matters: String(h?.why_it_matters ?? "").trim(),
          };
        })
        .filter((h: any) => h.title)
        .slice(0, 5)
    : [];

  return {
    synthesis_text: String(parsed.synthesis_text ?? "").trim(),
    headlines,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const targetKey = url.searchParams.get("key");

  try {
    let query = supabase
      .from("research_syntheses")
      .select("section_key, page_slug, section_heading, model_used, topic_filters, valid_until");

    if (targetKey) {
      query = query.eq("section_key", targetKey);
    } else {
      query = query.or(`valid_until.is.null,valid_until.lt.${new Date().toISOString()}`);
    }

    const { data: sections, error } = await query;
    if (error) throw error;
    if (!sections || sections.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "All sections up to date", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = { processed: 0, failed: 0, errors: [] as string[] };

    const BATCH_SIZE = 5;
    for (let i = 0; i < sections.length; i += BATCH_SIZE) {
      const batch = sections.slice(i, i + BATCH_SIZE);

      await Promise.all(batch.map(async (section: any) => {
        try {
          const filters = section.topic_filters as {
            categories: string[];
            tags: string[];
          };

          const articles = await fetchRelevantArticles(
            filters.categories ?? [],
            filters.tags ?? [],
          );

          const { synthesis_text: synthesisText, headlines } = await generateSynthesis(
            section.section_heading,
            section.page_slug,
            articles,
            section.model_used,
          );

          const now = new Date();
          const validUntil = new Date(now);
          validUntil.setDate(validUntil.getDate() + 3);

          const { error: upsertError } = await supabase
            .from("research_syntheses")
            .update({
              synthesis_text: synthesisText,
              headlines,
              article_ids_used: articles.map((a: any) => a.id),
              article_count: articles.length,
              generated_at: now.toISOString(),
              valid_until: validUntil.toISOString(),
            })
            .eq("section_key", section.section_key);

          if (upsertError) throw upsertError;
          results.processed++;
        } catch (e: any) {
          results.failed++;
          results.errors.push(`${section.section_key}: ${e.message}`);
          console.error(`Failed to generate synthesis for ${section.section_key}:`, e);
        }
      }));

      if (i + BATCH_SIZE < sections.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-research-syntheses error:", e);
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
