// One-shot admin: delete legacy EUP-tile assets from the public
// `article-images` bucket. Guarded by ADMIN_SECRET_TOKEN header.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = req.headers.get("x-admin-token");
  const expected = Deno.env.get("ADMIN_SECRET_TOKEN");
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: before } = await supabase.storage
    .from("article-images")
    .list("eup-tile", { limit: 1000 });

  const paths = (before || []).map((o) => `eup-tile/${o.name}`);
  let removed: string[] = [];
  let error: string | null = null;
  if (paths.length) {
    const { data, error: err } = await supabase.storage
      .from("article-images")
      .remove(paths);
    removed = (data || []).map((o: any) => o.name || "");
    error = err?.message ?? null;
  }

  const { data: after } = await supabase.storage
    .from("article-images")
    .list("eup-tile", { limit: 1000 });

  return new Response(
    JSON.stringify({ before: paths, removed, error, after: after || [] }, null, 2),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
