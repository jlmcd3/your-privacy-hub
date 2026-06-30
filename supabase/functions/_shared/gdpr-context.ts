// Shared GDPR authority retrieval: deterministic article + recital lookup
// with a non-fatal semantic EDPB-guideline fallback. Mirrors the
// deterministic-first + semantic-fallback pattern from run-cppa-cybersecurity (S2-4).

type SupabaseLike = {
  from: (t: string) => any;
  rpc: (name: string, args: any) => Promise<{ data: any; error: any }>;
};

export interface GetGdprContextOpts {
  articles: string[];
  jurisdiction: "eu" | "uk";
  semanticQuery?: string;
  recitals?: number[];
  guidelineArticles?: string[];
  maxChars?: number;
}

export interface GdprContextResult {
  block: string;
  meta: {
    attempted: boolean;
    jurisdiction: "eu" | "uk";
    requested_articles: string[];
    matched_articles: string[];
    uk_fallback_to_eu: string[];
    missing_articles: string[];
    recitals_requested: number[];
    recitals_matched: number[];
    guideline_hits: number;
    semantic_attempted: boolean;
    semantic_error?: string;
    truncated: boolean;
    final_chars: number;
    /** Ready-made array for verifyCitations' RetrievalPayload.gdprCites. */
    gdprCites: string[];
  };
}

const EMBED_INPUT_MAX = 6000;

async function embedQuery(query: string, apiKey: string): Promise<number[] | null> {
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/text-embedding-3-small",
        input: query.slice(0, EMBED_INPUT_MAX),
        dimensions: 1536,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      console.warn(`[gdpr-context] embed HTTP ${r.status}`);
      return null;
    }
    const d = await r.json();
    const v = d?.data?.[0]?.embedding;
    return Array.isArray(v) ? v : null;
  } catch (e) {
    console.warn(`[gdpr-context] embed threw: ${String(e).slice(0, 200)}`);
    return null;
  }
}

export async function getGdprContext(
  supabase: SupabaseLike,
  opts: GetGdprContextOpts,
): Promise<GdprContextResult> {
  const maxChars = opts.maxChars ?? 12000;
  const meta: GdprContextResult["meta"] = {
    attempted: true,
    jurisdiction: opts.jurisdiction,
    requested_articles: [...opts.articles],
    matched_articles: [],
    uk_fallback_to_eu: [],
    missing_articles: [],
    recitals_requested: opts.recitals ? [...opts.recitals] : [],
    recitals_matched: [],
    guideline_hits: 0,
    semantic_attempted: false,
    truncated: false,
    final_chars: 0,
    gdprCites: [],
  };

  // (1) Articles in requested jurisdiction
  let articles: any[] = [];
  try {
    const { data } = await supabase
      .from("gdpr_articles")
      .select("article_number, article_title, body_text, jurisdiction")
      .eq("jurisdiction", opts.jurisdiction)
      .in("article_number", opts.articles);
    articles = data ?? [];
  } catch (e) {
    console.warn(`[gdpr-context] article lookup failed: ${String(e).slice(0, 200)}`);
  }
  const foundNums = new Set(articles.map((a) => String(a.article_number)));

  // (1b) UK fallback to EU for missing articles
  if (opts.jurisdiction === "uk") {
    const missing = opts.articles.filter((n) => !foundNums.has(n));
    if (missing.length) {
      try {
        const { data: euFallback } = await supabase
          .from("gdpr_articles")
          .select("article_number, article_title, body_text, jurisdiction")
          .eq("jurisdiction", "eu")
          .in("article_number", missing);
        for (const row of euFallback ?? []) {
          articles.push(row);
          meta.uk_fallback_to_eu.push(String(row.article_number));
          foundNums.add(String(row.article_number));
        }
      } catch (e) {
        console.warn(`[gdpr-context] uk->eu fallback failed: ${String(e).slice(0, 200)}`);
      }
    }
  }
  meta.matched_articles = articles.map((a) => String(a.article_number));
  meta.missing_articles = opts.articles.filter((n) => !foundNums.has(n));

  // (2) Recitals (always EU)
  let recitals: any[] = [];
  if (opts.recitals && opts.recitals.length) {
    try {
      const { data } = await supabase
        .from("gdpr_recitals")
        .select("recital_number, body_text")
        .eq("jurisdiction", "eu")
        .in("recital_number", opts.recitals);
      recitals = data ?? [];
      meta.recitals_matched = recitals.map((r) => Number(r.recital_number));
    } catch (e) {
      console.warn(`[gdpr-context] recital lookup failed: ${String(e).slice(0, 200)}`);
    }
  }

  // (3) Semantic EDPB guideline lookup (non-fatal)
  let guidelineHits: any[] = [];
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (opts.semanticQuery && apiKey) {
    meta.semantic_attempted = true;
    try {
      const embedding = await embedQuery(opts.semanticQuery, apiKey);
      if (embedding) {
        const { data, error } = await supabase.rpc("match_edpb_guidelines", {
          query_embedding: embedding,
          article_filter: opts.guidelineArticles && opts.guidelineArticles.length
            ? opts.guidelineArticles
            : null,
          match_count: 4,
        });
        if (error) {
          meta.semantic_error = error.message;
          console.warn(`[gdpr-context] match_edpb_guidelines error: ${error.message}`);
        } else if (Array.isArray(data)) {
          guidelineHits = data;
          meta.guideline_hits = data.length;
        }
      } else {
        meta.semantic_error = "embed_failed";
      }
    } catch (e) {
      meta.semantic_error = String(e).slice(0, 200);
      console.warn(`[gdpr-context] semantic step threw: ${meta.semantic_error}`);
    }
  }

  // (4) Assemble block — articles first (never truncated), then recitals,
  //     then guidelines. If over cap, drop guidelines, then recitals.
  const articleBlocks = articles
    .sort((a, b) => String(a.article_number).localeCompare(String(b.article_number), undefined, { numeric: true }))
    .map((a) => {
      const jur = String(a.jurisdiction || opts.jurisdiction).toUpperCase();
      const title = a.article_title ? ` ${a.article_title}` : "";
      return `[Art. ${a.article_number} ${jur}]${title}\n${a.body_text || ""}`;
    });
  const recitalBlocks = recitals
    .sort((a, b) => Number(a.recital_number) - Number(b.recital_number))
    .map((r) => `[Recital ${r.recital_number}] ${r.body_text || ""}`);
  const guidelineBlocks = guidelineHits.map((g) => {
    const heading = g.section_heading || g.title || g.guideline_ref;
    return `[EDPB ${g.guideline_ref} — ${heading}] ${g.excerpt_text || ""} (interpretive guidance, non-verbatim summary permitted)`;
  });

  const header = "GDPR AUTHORITY CONTEXT";
  const notes: string[] = [];
  if (meta.uk_fallback_to_eu.length) {
    notes.push(`Note: UK text for Article(s) ${meta.uk_fallback_to_eu.join(", ")} not in store; EU text shown as fallback.`);
  }
  if (meta.missing_articles.length) {
    notes.push(`Note: Article(s) ${meta.missing_articles.join(", ")} were not available in the corpus.`);
  }

  const join = (parts: string[]) => parts.filter(Boolean).join("\n\n");
  let body = join([
    header,
    notes.join("\n"),
    articleBlocks.join("\n\n"),
    recitalBlocks.join("\n\n"),
    guidelineBlocks.join("\n\n"),
  ]);

  if (body.length > maxChars) {
    // Drop guideline blocks first
    body = join([
      header,
      notes.join("\n"),
      articleBlocks.join("\n\n"),
      recitalBlocks.join("\n\n"),
    ]);
    meta.truncated = true;
  }
  if (body.length > maxChars) {
    // Then drop recitals
    body = join([
      header,
      notes.join("\n"),
      articleBlocks.join("\n\n"),
    ]);
  }
  if (body.length > maxChars) {
    // Last resort: hard cap (never drops requested articles, just trims tail of last one)
    body = body.slice(0, maxChars);
  }

  meta.final_chars = body.length;

  // Build gdprCites: ready-made array matching the bracket tokens emitted
  // above (e.g. "Art. 6 EU", "Recital 47", "EDPB Guidelines 1/2024 — …").
  const gdprCites: string[] = [];
  for (const a of articles) {
    const jur = String(a.jurisdiction || opts.jurisdiction).toUpperCase();
    gdprCites.push(`Art. ${a.article_number} ${jur}`);
  }
  for (const r of recitals) {
    gdprCites.push(`Recital ${r.recital_number}`);
  }
  for (const g of guidelineHits) {
    const heading = g.section_heading || g.title || g.guideline_ref;
    gdprCites.push(`EDPB ${g.guideline_ref} — ${heading}`);
  }
  // De-duplicate: identical Art./Recital/EDPB entries (e.g. WP248 matched by
  // several articles) must appear once. Order preserved (first occurrence wins).
  meta.gdprCites = [...new Set(gdprCites)];

  return { block: body, meta };
}
