// Backfill / assign fallback images on `updates` rows that have no image_url
// or that currently use picsum.photos. Pulls from article_image_pool by
// category. Articles that have no curated photo are left with a null
// image_url — the render-time branded SVG tile (ArticleFallbackImage) is
// the visual fallback and no longer needs a pre-assigned raster tile.
//
// Auth: Bearer JWT of an admin user (verified via has_role).
// Body (optional): { limit?: number, onlyCategory?: string }

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple deterministic hash → integer in [0, n)
function hashIndex(seed: string, n: number): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h ^ seed.charCodeAt(i)) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return n > 0 ? h % n : 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
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
      const { data: userData } = await supabase.auth.getUser(jwt);
      const userId = userData?.user?.id;
      if (userId) {
        const { data: hasAdmin } = await supabase.rpc("has_role", {
          _user_id: userId, _role: "admin",
        });
        if (hasAdmin) authorized = true;
      }
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: any = {};
  try { body = await req.json(); } catch (_) {}
  const limit = Math.min(Math.max(Number(body.limit ?? 1000), 1), 5000);
  const onlyCategory: string | undefined = body.onlyCategory;

  // 1. Load pool grouped by category — only approved curated images.
  const { data: poolRows, error: poolErr } = await supabase
    .from("article_image_pool")
    .select("id, public_url, category, source, approval_status")
    .eq("approval_status", "approved")
    .neq("source", "eup-tile");
  if (poolErr) {
    return new Response(JSON.stringify({ error: poolErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pool = poolRows || [];
  if (pool.length === 0) {
    return new Response(JSON.stringify({ error: "image pool empty — run curate-unsplash-images first" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const byCategory: Record<string, any[]> = {};
  for (const r of pool) {
    const c = (r as any).category || "global";
    (byCategory[c] ||= []).push(r);
  }
  const allPool = pool;

  // 2. Find updates needing an image — null OR picsum OR previously assigned
  // to the retired EUP tile source.
  let q = supabase
    .from("updates")
    .select("id, category, image_source")
    .or("image_url.is.null,image_url.ilike.%picsum.photos%,image_source.eq.eup-tile")
    .limit(limit);
  if (onlyCategory) q = q.eq("category", onlyCategory);
  const { data: rows, error: rowsErr } = await q;
  if (rowsErr) {
    return new Response(JSON.stringify({ error: rowsErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let assignedPool = 0;
  const errors: string[] = [];

  for (const row of rows || []) {
    const id = (row as any).id as string;
    const cat = ((row as any).category as string) || "global";
    const bucket = byCategory[cat]?.length ? byCategory[cat] : allPool;
    const pick = bucket[hashIndex(`pool:${id}`, bucket.length)];

    const { error: upErr } = await supabase
      .from("updates")
      .update({ image_url: pick.public_url, image_source: "pool" })
      .eq("id", id);
    if (upErr) errors.push(`${id}: ${upErr.message}`);
    else assignedPool++;
  }

  return new Response(
    JSON.stringify({
      considered: rows?.length || 0,
      assigned_pool: assignedPool,
      errors: errors.slice(0, 20),
      error_count: errors.length,
    }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
