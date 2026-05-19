import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: articles, error } = await supabase
      .from("updates")
      .select("id, title, source_tier, enrichment_quality, ai_summary, contextual_record")
      .eq("source_tier", 1)
      .order("published_at", { ascending: false })
      .limit(80);

    if (error) throw error;

    // Filter in JS: needs basic enrichment + missing contextual
    const needsBackfill = (articles || []).filter((a: any) => {
      const ai = a.ai_summary || {};
      const hasBasic = !!ai.why_it_matters;
      const missingContext = !a.contextual_record || a.enrichment_quality !== "contextual";
      return hasBasic && missingContext;
    }).slice(0, 20);

    if (needsBackfill.length === 0) {
      return new Response(JSON.stringify({
        success: true, message: "No articles require backfill", processed: 0,
        succeeded: 0, skipped: 0, failed: 0, total_found: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const results = { succeeded: 0, skipped: 0, failed: 0, errors: [] as string[] };

    for (const article of needsBackfill) {
      try {
        const resp = await fetch(`${baseUrl}/functions/v1/enrich-with-context`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ article_id: article.id, force: false }),
        });
        const data = await resp.json();
        if (data.skipped) results.skipped++;
        else if (data.success) results.succeeded++;
        else {
          results.failed++;
          results.errors.push(`${article.id}: ${data.error || "unknown error"}`);
        }
        await new Promise((r) => setTimeout(r, 500));
      } catch (e) {
        results.failed++;
        results.errors.push(`${article.id}: ${(e as Error).message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true, total_found: needsBackfill.length, ...results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
