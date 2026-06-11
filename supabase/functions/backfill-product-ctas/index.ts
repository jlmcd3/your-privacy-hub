// Admin-guarded backfill: recompute product_ctas for existing updates rows.
// Body: { dry_run?: boolean, limit?: number }
// Returns: { scanned, matched, updated, by_slug }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { matchProductCtas } from "../_shared/product-triggers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Auth: x-admin-token OR admin JWT
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
          _user_id: userId,
          _role: "admin",
        });
        if (hasAdmin) authorized = true;
      }
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { dry_run?: boolean; limit?: number } = {};
  try { body = await req.json(); } catch { /* allow empty body */ }
  const dryRun = body.dry_run === true;
  const limit = typeof body.limit === "number" && body.limit > 0 ? body.limit : null;

  const PAGE_SIZE = 200;
  let offset = 0;
  let scanned = 0;
  let matched = 0;
  let updated = 0;
  const bySlug: Record<string, number> = {};

  while (true) {
    if (limit !== null && scanned >= limit) break;
    const pageSize = limit !== null ? Math.min(PAGE_SIZE, limit - scanned) : PAGE_SIZE;

    const { data: rows, error } = await supabase
      .from("updates")
      .select("id, title, ai_summary, product_ctas")
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return new Response(JSON.stringify({ error: error.message, scanned, matched, updated, by_slug: bySlug }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!rows || rows.length === 0) break;

    for (const r of rows as Array<{ id: string; title: string | null; ai_summary: any; product_ctas: any }>) {
      scanned++;
      const ai = r.ai_summary ?? {};
      const text = [r.title, ai?.why_it_matters, ai?.why_it_matters_short, ai?.compliance_impact]
        .filter(Boolean)
        .join(" ");
      const ctas = matchProductCtas(text);
      if (ctas.length > 0) {
        matched++;
        for (const c of ctas) bySlug[c.slug] = (bySlug[c.slug] ?? 0) + 1;
      }
      if (!dryRun) {
        const { error: upErr } = await supabase
          .from("updates")
          .update({ product_ctas: ctas })
          .eq("id", r.id);
        if (!upErr) updated++;
      }
    }

    offset += rows.length;
    if (rows.length < pageSize) break;
  }

  return new Response(JSON.stringify({ scanned, matched, updated, by_slug: bySlug, dry_run: dryRun }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
