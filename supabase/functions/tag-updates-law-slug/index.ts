// Backfills public.updates.law_slug by matching title/category/summary
// against the law alias list. Idempotent — only tags rows where law_slug IS NULL.
// Scheduled via pg_cron (daily).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { detectLawSlug } from "../_shared/lawAliases.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data: rows, error } = await supabase
      .from("updates")
      .select("id, title, category, summary")
      .is("law_slug", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) throw error;

    let tagged = 0;
    const updates: Array<{ id: string; law_slug: string }> = [];
    for (const r of rows ?? []) {
      const slug = detectLawSlug(r.title, r.category, r.summary);
      if (slug) updates.push({ id: r.id as string, law_slug: slug });
    }

    // Batch in chunks to avoid PostgREST payload limits
    for (let i = 0; i < updates.length; i += 100) {
      const chunk = updates.slice(i, i + 100);
      for (const u of chunk) {
        const { error: upErr } = await supabase
          .from("updates")
          .update({ law_slug: u.law_slug })
          .eq("id", u.id);
        if (!upErr) tagged++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: rows?.length ?? 0, tagged }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
