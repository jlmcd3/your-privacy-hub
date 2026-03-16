import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FRENCH = ["le ", "la ", "les ", "de ", "du ", "des ", "délibération", "données", "traitement", "personnes"];
const GERMAN = ["der ", "die ", "das ", "datenschutz", "und ", "werden"];
const SPANISH = ["el ", "la ", "los ", "protección", "también", "para "];

function isLikelyNonEnglish(text: string): boolean {
  const lower = text.toLowerCase();
  const fr = FRENCH.filter((w) => lower.includes(w)).length;
  const de = GERMAN.filter((w) => lower.includes(w)).length;
  const es = SPANISH.filter((w) => lower.includes(w)).length;
  return fr >= 3 || de >= 3 || es >= 3;
}

async function translateArticle(
  article: { id: string; title: string; summary: string | null },
  apiKey: string
): Promise<{ id: string; title: string; summary: string | null; wasTranslated: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const summaryText = article.summary || "(no summary)";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Translate this privacy/data protection article title and summary to English. Return ONLY valid JSON with keys "title" and "summary". Title: ${article.title} Summary: ${summaryText}`,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Anthropic API error:", response.status);
      return { ...article, wasTranslated: false };
    }

    const result = await response.json();
    const text = result.content?.[0]?.text;
    if (!text) return { ...article, wasTranslated: false };

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { ...article, wasTranslated: false };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      id: article.id,
      title: parsed.title || article.title,
      summary: parsed.summary || article.summary,
      wasTranslated: true,
    };
  } catch (e) {
    clearTimeout(timeout);
    console.error("Translation failed for article:", article.id, e);
    return { ...article, wasTranslated: false };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { articles } = await req.json();
    if (!Array.isArray(articles)) {
      return new Response(JSON.stringify({ error: "articles must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = await Promise.all(
      articles.map((article: any) => {
        const combined = (article.title || "") + " " + (article.summary || "");
        if (isLikelyNonEnglish(combined)) {
          return translateArticle(article, apiKey);
        }
        return Promise.resolve({ ...article, wasTranslated: false });
      })
    );

    return new Response(JSON.stringify({ articles: results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-articles error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
