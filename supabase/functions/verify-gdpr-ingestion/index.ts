// Verifies stored GDPR articles match their authoritative sources by
// re-fetching, re-parsing with the shared parsers, and comparing
// sha256(body_text) against the stored content_hash.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EU_SOURCE_URL,
  SOURCE_FETCH_HEADERS,
  htmlToText,
  parseArticles,
  parseUkArticleXml,
  ukArticleXmlUrl,
  sha256,
} from "../_shared/gdpr-parsers.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const FETCH_GAP_MS = 250;
const USER_AGENT =
  "EndUserPrivacy-GDPRVerify/1.0 (+https://enduserprivacy.com; contact: ops@enduserprivacy.com)";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ArticleResult {
  article_number: string;
  status: "match" | "MISMATCH" | "missing_in_db" | "missing_in_source";
  stored_chars: number | null;
  source_chars: number | null;
  first_divergence_at?: number;
  stored_excerpt?: string;
  source_excerpt?: string;
  error?: string;
}

function firstDivergence(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a.charCodeAt(i) !== b.charCodeAt(i)) return i;
  return a.length === b.length ? -1 : n;
}

function excerptAround(s: string, idx: number, span = 80): string {
  const start = Math.max(0, idx - span);
  const end = Math.min(s.length, idx + span);
  return (start > 0 ? "…" : "") + s.slice(start, end) + (end < s.length ? "…" : "");
}

async function verifyEu(
  admin: ReturnType<typeof createClient>,
  articles: string[],
): Promise<ArticleResult[]> {
  const results: ArticleResult[] = [];
  let parsedByNum = new Map<string, string>();
  try {
    const r = await fetch(EU_SOURCE_URL, {
      headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) throw new Error(`EUR-Lex http ${r.status}`);
    const html = await r.text();
    const text = htmlToText(html);
    const parsed = parseArticles(text);
    for (const a of parsed) parsedByNum.set(a.number, a.body);
  } catch (e) {
    return articles.map((n) => ({
      article_number: n,
      status: "missing_in_source" as const,
      stored_chars: null,
      source_chars: null,
      error: `source_fetch_failed: ${String(e).slice(0, 200)}`,
    }));
  }

  for (const num of articles) {
    const { data: stored } = await admin
      .from("gdpr_articles")
      .select("content_hash, body_text")
      .eq("jurisdiction", "eu")
      .eq("article_number", num)
      .maybeSingle();
    const sourceBody = parsedByNum.get(num) ?? null;

    if (!stored && !sourceBody) {
      results.push({ article_number: num, status: "missing_in_source", stored_chars: null, source_chars: null });
      continue;
    }
    if (!stored) {
      results.push({ article_number: num, status: "missing_in_db", stored_chars: null, source_chars: sourceBody!.length });
      continue;
    }
    if (!sourceBody) {
      results.push({ article_number: num, status: "missing_in_source", stored_chars: (stored as any).body_text?.length ?? 0, source_chars: null });
      continue;
    }
    const storedHash = (stored as any).content_hash as string;
    const storedBody = (stored as any).body_text as string;
    const sourceHash = await sha256(sourceBody);
    if (storedHash === sourceHash) {
      results.push({ article_number: num, status: "match", stored_chars: storedBody.length, source_chars: sourceBody.length });
    } else {
      const idx = firstDivergence(storedBody, sourceBody);
      results.push({
        article_number: num,
        status: "MISMATCH",
        stored_chars: storedBody.length,
        source_chars: sourceBody.length,
        first_divergence_at: idx,
        stored_excerpt: excerptAround(storedBody, idx),
        source_excerpt: excerptAround(sourceBody, idx),
      });
    }
  }
  return results;
}

async function verifyUk(
  admin: ReturnType<typeof createClient>,
  articles: string[],
): Promise<ArticleResult[]> {
  const results: ArticleResult[] = [];
  for (const num of articles) {
    let sourceBody: string | null = null;
    let fetchError: string | null = null;
    try {
      const r = await fetch(ukArticleXmlUrl(num), {
        headers: { "User-Agent": USER_AGENT, "Accept": "application/xml,text/xml" },
        signal: AbortSignal.timeout(30_000),
      });
      if (r.status === 404) {
        fetchError = "source_404";
      } else if (!r.ok) {
        fetchError = `http ${r.status}`;
      } else {
        const xml = await r.text();
        const parsed = parseUkArticleXml(xml, num);
        if (parsed) sourceBody = parsed.body;
        else fetchError = "empty_after_parse";
      }
    } catch (e) {
      fetchError = String(e).slice(0, 200);
    }
    await new Promise((res) => setTimeout(res, FETCH_GAP_MS));

    const { data: stored } = await admin
      .from("gdpr_articles")
      .select("content_hash, body_text")
      .eq("jurisdiction", "uk")
      .eq("article_number", num)
      .maybeSingle();

    if (!stored && !sourceBody) {
      results.push({
        article_number: num,
        status: "missing_in_source",
        stored_chars: null,
        source_chars: null,
        error: fetchError ?? undefined,
      });
      continue;
    }
    if (!stored) {
      results.push({ article_number: num, status: "missing_in_db", stored_chars: null, source_chars: sourceBody!.length });
      continue;
    }
    if (!sourceBody) {
      results.push({
        article_number: num,
        status: "missing_in_source",
        stored_chars: (stored as any).body_text?.length ?? 0,
        source_chars: null,
        error: fetchError ?? undefined,
      });
      continue;
    }
    const storedHash = (stored as any).content_hash as string;
    const storedBody = (stored as any).body_text as string;
    const sourceHash = await sha256(sourceBody);
    if (storedHash === sourceHash) {
      results.push({ article_number: num, status: "match", stored_chars: storedBody.length, source_chars: sourceBody.length });
    } else {
      const idx = firstDivergence(storedBody, sourceBody);
      results.push({
        article_number: num,
        status: "MISMATCH",
        stored_chars: storedBody.length,
        source_chars: sourceBody.length,
        first_divergence_at: idx,
        stored_excerpt: excerptAround(storedBody, idx),
        source_excerpt: excerptAround(sourceBody, idx),
      });
    }
  }
  return results;
}

function summarize(arr: ArticleResult[]) {
  return {
    total: arr.length,
    matches: arr.filter((x) => x.status === "match").length,
    mismatches: arr.filter((x) => x.status === "MISMATCH").length,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const xAdmin = req.headers.get("x-admin-token") ?? "";
  const bearer = auth.replace("Bearer ", "");
  const authorized =
    (ADMIN_TOKEN && (auth.includes(ADMIN_TOKEN) || xAdmin === ADMIN_TOKEN)) ||
    bearer === SUPABASE_SERVICE_KEY;
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const jurisdiction: "eu" | "uk" | "both" =
    body?.jurisdiction === "eu" || body?.jurisdiction === "uk" ? body.jurisdiction : "both";
  const articles: string[] = Array.isArray(body?.articles) && body.articles.length > 0
    ? body.articles.map((s: any) => String(s))
    : ["4", "6", "28", "33", "35"];

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const out: Record<string, unknown> = { requested: { jurisdiction, articles } };

  if (jurisdiction === "eu" || jurisdiction === "both") {
    const eu = await verifyEu(admin, articles);
    out.eu = { results: eu, summary: summarize(eu) };
  }
  if (jurisdiction === "uk" || jurisdiction === "both") {
    const uk = await verifyUk(admin, articles);
    out.uk = { results: uk, summary: summarize(uk) };
  }

  return json(out);
});
