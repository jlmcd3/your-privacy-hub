// One-shot: uploads the bundled EUP "Privacy Intelligence" tile (base64) to the
// article-images bucket and registers it in article_image_pool as source='eup-tile'.
// Auth: x-admin-token: <ADMIN_SECRET_TOKEN>

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const adminToken = req.headers.get("x-admin-token");
  if (!adminToken || adminToken !== Deno.env.get("ADMIN_SECRET_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Pull the asset over HTTP from the deployed site itself so we don't need
  // to bundle binary into the function. The asset is referenced from the app
  // and is also accessible at the public site root once deployed.
  const tileUrl = (await req.json().catch(() => ({}))).tileUrl
    || "https://enduserprivacy.lovable.app/eup-intelligence-tile.jpg";

  const resp = await fetch(tileUrl);
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: `failed to fetch tile: ${resp.status}` }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const bytes = new Uint8Array(await resp.arrayBuffer());

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const path = "eup-tile/privacy-intelligence.jpg";
  const { error: upErr } = await supabase.storage
    .from("article-images")
    .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (upErr) {
    return new Response(JSON.stringify({ error: upErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: pub } = supabase.storage.from("article-images").getPublicUrl(path);
  const publicUrl = pub.publicUrl;

  await supabase
    .from("article_image_pool")
    .upsert(
      {
        storage_path: path,
        public_url: publicUrl,
        category: "brand",
        source: "eup-tile",
        source_id: "privacy-intelligence",
        query: "EUP brand tile",
        width: 1024,
        height: 1024,
      },
      { onConflict: "source,source_id" },
    );

  return new Response(JSON.stringify({ ok: true, public_url: publicUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
