// Curate ~500 privacy/tech/legal images from Unsplash into the article-images
// storage bucket and the article_image_pool table.
//
// Auth: Bearer JWT of an admin user (verified via has_role).
// Optional body: { perQuery?: number, queries?: Array<{q,category}> }

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UnsplashPhoto {
  id: string;
  urls: { regular: string; small: string };
  width: number;
  height: number;
  user: { name: string; links: { html: string } };
}

// More editorial / abstract / architectural prompts. Avoids stock-photo
// clichés (padlocks on keyboards, hooded hackers, binary code, robots, etc.)
// in favour of real-world places, documents, and minimal abstract textures
// that read as serious editorial photography.
const DEFAULT_QUERIES: Array<{ q: string; category: string }> = [
  // privacy / law — abstract/editorial
  { q: "modernist architecture detail", category: "global" },
  { q: "newspaper print closeup", category: "global" },
  { q: "library archive", category: "global" },
  { q: "minimal office interior", category: "global" },
  { q: "glass building facade", category: "global" },
  // enforcement — real institutions, no gavel cliché
  { q: "courthouse exterior architecture", category: "enforcement" },
  { q: "marble columns government", category: "enforcement" },
  { q: "legal document signing pen", category: "enforcement" },
  { q: "courtroom interior empty", category: "enforcement" },
  // us federal
  { q: "us capitol building dusk", category: "us-federal" },
  { q: "supreme court building washington", category: "us-federal" },
  { q: "washington dc monument", category: "us-federal" },
  // us states
  { q: "california state capitol sacramento", category: "us-states" },
  { q: "texas state capitol austin", category: "us-states" },
  { q: "new york state capitol albany", category: "us-states" },
  // eu / uk
  { q: "european parliament strasbourg", category: "eu-uk" },
  { q: "european commission berlaymont", category: "eu-uk" },
  { q: "westminster london parliament", category: "eu-uk" },
  { q: "european union flags brussels", category: "eu-uk" },
  // ai-privacy — abstract, no robots
  { q: "abstract data visualization", category: "ai-privacy" },
  { q: "minimal geometric pattern blue", category: "ai-privacy" },
  { q: "fiber optic light abstract", category: "ai-privacy" },
  { q: "server room minimal", category: "ai-privacy" },
  // adtech — editorial
  { q: "billboard urban skyline night", category: "adtech" },
  { q: "newsstand magazines", category: "adtech" },
  { q: "city street advertising", category: "adtech" },
  // global / data
  { q: "data center hallway", category: "global" },
  { q: "satellite earth from space", category: "global" },
  { q: "fiber cable abstract", category: "global" },
  { q: "world map paper", category: "global" },
];

// Curated Unsplash collection IDs that bias toward editorial/architectural
// quality. These are appended to every query to nudge results toward the
// editorial aesthetic.
const EDITORIAL_COLLECTIONS = "317099,3694365,1538150,4332580";

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

  // Auth: either admin JWT (Bearer) OR x-admin-token matching ADMIN_SECRET_TOKEN.
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const adminToken = req.headers.get("x-admin-token");
  const tokenMatches = adminToken && adminToken === Deno.env.get("ADMIN_SECRET_TOKEN");
  let authorized = !!tokenMatches;
  if (!authorized) {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (jwt) {
      const { data: userData } = await adminClient.auth.getUser(jwt);
      const userId = userData?.user?.id;
      if (userId) {
        const { data: roleRow } = await adminClient.rpc("has_role", {
          _user_id: userId, _role: "admin",
        });
        if (roleRow) authorized = true;
      }
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

  const supabase = adminClient;

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
