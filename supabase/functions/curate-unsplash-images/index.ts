// Curate ~500 privacy/tech/legal images from Unsplash into the article-images
// storage bucket and the article_image_pool table.
//
// Auth: requires header `x-admin-token: <ADMIN_SECRET_TOKEN>`.
// Optional body: { perQuery?: number, queries?: string[] }
//
// Designed to be re-runnable: existing (source, source_id) pairs are skipped.

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

interface UnsplashPhoto {
  id: string;
  urls: { regular: string; small: string };
  width: number;
  height: number;
  user: { name: string; links: { html: string } };
}

const DEFAULT_QUERIES: Array<{ q: string; category: string }> = [
  // privacy / law
  { q: "data privacy", category: "global" },
  { q: "cybersecurity lock", category: "global" },
  { q: "encryption", category: "global" },
  { q: "padlock keyboard", category: "global" },
  { q: "privacy shield", category: "global" },
  { q: "fingerprint biometric", category: "ai-privacy" },
  { q: "facial recognition", category: "ai-privacy" },
  { q: "surveillance camera", category: "enforcement" },
  { q: "courthouse columns", category: "enforcement" },
  { q: "judge gavel", category: "enforcement" },
  { q: "law books", category: "enforcement" },
  { q: "legal contract signing", category: "enforcement" },
  { q: "us capitol washington", category: "us-federal" },
  { q: "supreme court us", category: "us-federal" },
  { q: "white house washington", category: "us-federal" },
  { q: "state capitol building", category: "us-states" },
  { q: "california sacramento", category: "us-states" },
  { q: "european parliament", category: "eu-uk" },
  { q: "european commission brussels", category: "eu-uk" },
  { q: "uk parliament london", category: "eu-uk" },
  { q: "european flag", category: "eu-uk" },
  { q: "world map technology", category: "global" },
  { q: "global network", category: "global" },
  { q: "data center servers", category: "global" },
  { q: "cloud computing", category: "global" },
  // adtech
  { q: "digital advertising", category: "adtech" },
  { q: "billboard city", category: "adtech" },
  { q: "smartphone apps", category: "adtech" },
  { q: "browser cookies", category: "adtech" },
  { q: "marketing analytics", category: "adtech" },
  // ai
  { q: "artificial intelligence circuit", category: "ai-privacy" },
  { q: "machine learning", category: "ai-privacy" },
  { q: "neural network abstract", category: "ai-privacy" },
  { q: "robot ai", category: "ai-privacy" },
  { q: "ai chatbot", category: "ai-privacy" },
  // generic tech
  { q: "fiber optic", category: "global" },
  { q: "binary code", category: "global" },
  { q: "circuit board", category: "global" },
  { q: "abstract technology blue", category: "global" },
  { q: "office laptop work", category: "global" },
];

async function uploadToStorage(
  supabase: any,
  imageBytes: Uint8Array,
  path: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from("article-images")
    .upload(path, imageBytes, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (error) throw error;
  const { data } = supabase.storage.from("article-images").getPublicUrl(path);
  return data.publicUrl;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminToken = req.headers.get("x-admin-token");
  if (!adminToken || adminToken !== Deno.env.get("ADMIN_SECRET_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
  if (!unsplashKey) {
    return new Response(JSON.stringify({ error: "missing UNSPLASH_ACCESS_KEY" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch (_) {}
  const perQuery = Math.min(Math.max(Number(body.perQuery ?? 14), 1), 30);
  const queries: Array<{ q: string; category: string }> =
    Array.isArray(body.queries) && body.queries.length > 0
      ? body.queries
      : DEFAULT_QUERIES;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const results = {
    queries_run: 0,
    fetched: 0,
    inserted: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const { q, category } of queries) {
    results.queries_run++;
    try {
      const url = new URL("https://api.unsplash.com/search/photos");
      url.searchParams.set("query", q);
      url.searchParams.set("per_page", String(perQuery));
      url.searchParams.set("orientation", "landscape");
      url.searchParams.set("content_filter", "high");

      const resp = await fetch(url, {
        headers: { Authorization: `Client-ID ${unsplashKey}` },
      });
      if (!resp.ok) {
        results.errors.push(`${q}: HTTP ${resp.status}`);
        continue;
      }
      const data = await resp.json();
      const photos = (data.results || []) as UnsplashPhoto[];
      results.fetched += photos.length;

      for (const photo of photos) {
        // Skip if already in pool
        const { data: existing } = await supabase
          .from("article_image_pool")
          .select("id")
          .eq("source", "unsplash")
          .eq("source_id", photo.id)
          .maybeSingle();
        if (existing) {
          results.skipped++;
          continue;
        }

        try {
          // Download image
          const imgResp = await fetch(photo.urls.regular);
          if (!imgResp.ok) {
            results.errors.push(`${photo.id}: download HTTP ${imgResp.status}`);
            continue;
          }
          const bytes = new Uint8Array(await imgResp.arrayBuffer());
          const path = `unsplash/${category}/${photo.id}.jpg`;
          const publicUrl = await uploadToStorage(supabase, bytes, path);

          await supabase.from("article_image_pool").insert({
            storage_path: path,
            public_url: publicUrl,
            category,
            source: "unsplash",
            source_id: photo.id,
            photographer_name: photo.user?.name ?? null,
            photographer_url: photo.user?.links?.html ?? null,
            query: q,
            width: photo.width,
            height: photo.height,
          });
          results.inserted++;
        } catch (e) {
          results.errors.push(`${photo.id}: ${(e as Error).message}`);
        }
        // Light pacing
        await new Promise((r) => setTimeout(r, 60));
      }
      // Pace per query (Unsplash demo limit: 50/hr; production: 5000/hr)
      await new Promise((r) => setTimeout(r, 250));
    } catch (e) {
      results.errors.push(`${q}: ${(e as Error).message}`);
    }
  }

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
