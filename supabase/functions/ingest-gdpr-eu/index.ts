// Ingests the EU GDPR (Regulation 2016/679) consolidated text from EUR-Lex.
// Parses recitals (1)..(173) and Articles 1..99 into gdpr_recitals / gdpr_articles.
// Embeds body_text via Lovable AI Gateway. Idempotent via sha256(body_text).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  EU_SOURCE_URL as SOURCE_URL,
  htmlToText,
  parseRecitals,
  parseArticles,
  sha256,
} from "../_shared/gdpr-parsers.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const EMBED_INPUT_MAX = 6000;
const EMBED_GAP_MS = 150;

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


async function embed(text: string): Promise<number[]> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, EMBED_INPUT_MAX),
      dimensions: EMBEDDING_DIMS,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`Embed ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const v = d?.data?.[0]?.embedding;
  if (!Array.isArray(v) || v.length !== EMBEDDING_DIMS) {
    throw new Error(`Bad embedding shape: len=${v?.length}`);
  }
  return v;
}

// --- Main handler --------------------------------------------------------------

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
  const dry_run: boolean = Boolean(body?.dry_run);
  const only_articles: string[] | null = Array.isArray(body?.only_articles) && body.only_articles.length > 0
    ? body.only_articles.map((s: any) => String(s))
    : null;

  // 1. Fetch EUR-Lex HTML
  let html: string;
  try {
    const r = await fetch(SOURCE_URL, {
      headers: {
        "User-Agent": "EndUserPrivacy-GDPRIngest/1.0 (+https://enduserprivacy.com; contact: ops@enduserprivacy.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) return json({ error: `EUR-Lex fetch failed: ${r.status}` }, 502);
    html = await r.text();
  } catch (e) {
    return json({ error: `EUR-Lex fetch error: ${String(e).slice(0, 300)}` }, 502);
  }

  const text = htmlToText(html);

  // 2. Parse
  const recitals = parseRecitals(text);
  const articles = parseArticles(text);

  if (dry_run) {
    return json({
      dry_run: true,
      parsed: {
        recitals: recitals.length,
        articles: articles.length,
        first_recital: recitals[0],
        sample_article: articles.find((a) => a.number === "6") ?? articles[0],
      },
      expected: { recitals: 173, articles: 99 },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let recitals_inserted = 0, recitals_unchanged = 0;
  let articles_inserted = 0, articles_updated = 0, articles_unchanged = 0;
  let embed_failures = 0;

  // 3. Upsert recitals
  for (const rec of recitals) {
    const content_hash = await sha256(rec.body);
    const { data: existing } = await admin
      .from("gdpr_recitals")
      .select("id, content_hash")
      .eq("jurisdiction", "eu")
      .eq("recital_number", rec.number)
      .maybeSingle();
    if (existing && (existing as any).content_hash === content_hash) {
      recitals_unchanged++;
      continue;
    }
    let embedding: number[] | null = null;
    try {
      embedding = await embed(rec.body);
    } catch (e) {
      console.error(`embed recital ${rec.number} failed:`, String(e).slice(0, 200));
      embed_failures++;
    }
    const row: any = {
      jurisdiction: "eu",
      recital_number: rec.number,
      body_text: rec.body,
      source_url: SOURCE_URL,
      content_hash,
      embedding: embedding as any,
      embedding_model: embedding ? EMBEDDING_MODEL : null,
    };
    if (existing) {
      const { error } = await admin.from("gdpr_recitals").update(row).eq("id", (existing as any).id);
      if (error) console.error(`recital ${rec.number} update error:`, error.message);
    } else {
      const { error } = await admin.from("gdpr_recitals").insert(row);
      if (error) console.error(`recital ${rec.number} insert error:`, error.message);
      else recitals_inserted++;
    }
    if (embedding) await new Promise((res) => setTimeout(res, EMBED_GAP_MS));
  }

  // 4. Upsert articles
  const articlesToProcess = only_articles
    ? articles.filter((a) => only_articles.includes(a.number))
    : articles;

  for (const art of articlesToProcess) {
    const content_hash = await sha256(art.body);
    const { data: existing } = await admin
      .from("gdpr_articles")
      .select("id, content_hash")
      .eq("jurisdiction", "eu")
      .eq("article_number", art.number)
      .maybeSingle();
    if (existing && (existing as any).content_hash === content_hash) {
      articles_unchanged++;
      continue;
    }
    let embedding: number[] | null = null;
    try {
      embedding = await embed(art.body);
    } catch (e) {
      console.error(`embed article ${art.number} failed:`, String(e).slice(0, 200));
      embed_failures++;
    }
    const row: any = {
      jurisdiction: "eu",
      article_number: art.number,
      article_title: art.title || null,
      chapter: art.chapter,
      body_text: art.body,
      source_url: SOURCE_URL,
      content_hash,
      embedding: embedding as any,
      embedding_model: embedding ? EMBEDDING_MODEL : null,
    };
    if (existing) {
      const { error } = await admin.from("gdpr_articles").update(row).eq("id", (existing as any).id);
      if (error) console.error(`article ${art.number} update error:`, error.message);
      else articles_updated++;
    } else {
      const { error } = await admin.from("gdpr_articles").insert(row);
      if (error) console.error(`article ${art.number} insert error:`, error.message);
      else articles_inserted++;
    }
    if (embedding) await new Promise((res) => setTimeout(res, EMBED_GAP_MS));
  }

  // 5. Sanity warnings
  const warnings: string[] = [];
  if (recitals.length !== 173) warnings.push(`expected 173 recitals, parsed ${recitals.length}`);
  if (articles.length !== 99) warnings.push(`expected 99 articles, parsed ${articles.length}`);
  if (warnings.length) console.warn("ingest-gdpr-eu sanity:", warnings.join("; "));

  return json({
    source_url: SOURCE_URL,
    parsed: { recitals: recitals.length, articles: articles.length },
    counts: {
      recitals_inserted,
      recitals_unchanged,
      articles_inserted,
      articles_updated,
      articles_unchanged,
      embed_failures,
    },
    warnings,
  });
});
