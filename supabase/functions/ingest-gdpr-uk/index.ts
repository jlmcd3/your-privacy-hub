// Ingests the UK GDPR (Retained Regulation 2016/679) article-by-article from legislation.gov.uk.
// Parses CLML XML per article, strips F-code amendment markers and commentary, embeds, upserts.
// Idempotent via sha256(body_text). UK recitals are intentionally NOT ingested.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  UK_INSERTED_IDS,
  ukArticleXmlUrl,
  ukArticleSourceUrl,
  parseUkArticleXml,
  sha256,
} from "../_shared/gdpr-parsers.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const EMBED_INPUT_MAX = 6000;
const FETCH_GAP_MS = 250;
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

type ParsedArticle = { number: string; title: string; body: string };

// --- Main handler -------------------------------------------------------------

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

  // Build identifier list: "1".."99" + UK inserted IDs.
  const allIds: string[] = [];
  for (let n = 1; n <= 99; n++) allIds.push(String(n));
  allIds.push(...UK_INSERTED_IDS);
  const ids = only_articles ? allIds.filter((id) => only_articles.includes(id)) : allIds;

  const userAgent = "EndUserPrivacy-UKGDPRIngest/1.0 (+https://enduserprivacy.com; contact: ops@enduserprivacy.com)";

  const parsed: ParsedArticle[] = [];
  const fetch_skipped: Array<{ id: string; status: number }> = [];
  const fetch_errors: Array<{ id: string; error: string }> = [];

  for (const id of ids) {
    const xmlUrl = ukArticleXmlUrl(id);
    try {
      const r = await fetch(xmlUrl, {
        headers: { "User-Agent": userAgent, "Accept": "application/xml,text/xml" },
        signal: AbortSignal.timeout(30_000),
      });
      if (r.status === 404) {
        fetch_skipped.push({ id, status: 404 });
        console.warn(`uk-gdpr article ${id}: 404 (skipping)`);
      } else if (!r.ok) {
        fetch_errors.push({ id, error: `http ${r.status}` });
        console.error(`uk-gdpr article ${id}: http ${r.status}`);
      } else {
        const xml = await r.text();
        const art = parseArticleXml(xml, id);
        if (art) parsed.push(art);
        else fetch_errors.push({ id, error: "empty_after_parse" });
      }
    } catch (e) {
      fetch_errors.push({ id, error: String(e).slice(0, 200) });
      console.error(`uk-gdpr article ${id} fetch error:`, String(e).slice(0, 200));
    }
    await new Promise((res) => setTimeout(res, FETCH_GAP_MS));
  }

  if (dry_run) {
    return json({
      dry_run: true,
      parsed_count: parsed.length,
      skipped: fetch_skipped,
      errors: fetch_errors,
      sample: parsed.find((a) => a.number === "6") ?? parsed[0] ?? null,
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let articles_inserted = 0, articles_updated = 0, articles_unchanged = 0;
  let embed_failures = 0;

  for (const art of parsed) {
    const content_hash = await sha256(art.body);
    const sourceUrl = `https://www.legislation.gov.uk/eur/2016/679/article/${art.number}`;

    const { data: existing } = await admin
      .from("gdpr_articles")
      .select("id, content_hash")
      .eq("jurisdiction", "uk")
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
      console.error(`embed uk article ${art.number} failed:`, String(e).slice(0, 200));
      embed_failures++;
    }

    const row: any = {
      jurisdiction: "uk",
      article_number: art.number,
      article_title: art.title || null,
      body_text: art.body,
      source_url: sourceUrl,
      content_hash,
      embedding: embedding as any,
      embedding_model: embedding ? EMBEDDING_MODEL : null,
    };
    if (existing) {
      const { error } = await admin.from("gdpr_articles").update(row).eq("id", (existing as any).id);
      if (error) console.error(`uk article ${art.number} update error:`, error.message);
      else articles_updated++;
    } else {
      const { error } = await admin.from("gdpr_articles").insert(row);
      if (error) console.error(`uk article ${art.number} insert error:`, error.message);
      else articles_inserted++;
    }
    if (embedding) await new Promise((res) => setTimeout(res, EMBED_GAP_MS));
  }

  return json({
    parsed: parsed.length,
    requested: ids.length,
    fetch_skipped,
    fetch_errors,
    counts: {
      articles_inserted,
      articles_updated,
      articles_unchanged,
      embed_failures,
    },
  });
});
