// Daily homepage spotlight selector.
// Picks 3 highest-severity recent articles — one US, one EU/UK, one Global —
// and upserts them into homepage_spotlight for today's date so all visitors
// see the same curated set for the entire day.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const today = new Date().toISOString().split("T")[0];
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: articles, error } = await supabase
    .from("updates")
    .select("id, jurisdiction, attention_level, published_at, category")
    .gte("created_at", cutoff)
    .eq("is_hidden", false)
    .not("ai_summary", "is", null)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error || !articles || articles.length === 0) {
    return new Response(
      JSON.stringify({ error: error?.message ?? "No articles found" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const severityOrder: Record<string, number> = {
    "WATCH CLOSELY": 0,
    "MONITOR": 1,
  };
  const sorted = [...articles].sort((a, b) => {
    const aScore = severityOrder[a.attention_level ?? ""] ?? 2;
    const bScore = severityOrder[b.attention_level ?? ""] ?? 2;
    return aScore - bScore;
  });

  const isUS = (j: string | null) => {
    if (!j) return false;
    const u = j.toUpperCase();
    return (
      u.includes("U.S.") || u.includes("FEDERAL") || u.includes("CCPA") ||
      u.includes("CPPA") || u.includes("STATE") || u.includes("UNITED STATES")
    );
  };
  const isEU = (j: string | null) => {
    if (!j) return false;
    const u = j.toUpperCase();
    return (
      u.includes("EU") || u.includes("UK") || u.includes("GDPR") ||
      u.includes("EUROPEAN") || u.includes("ICO") || u.includes("CNIL")
    );
  };

  const used = new Set<string>();
  const pick = (predicate: (j: string | null) => boolean) => {
    const found = sorted.find((a) => predicate(a.jurisdiction) && !used.has(a.id));
    if (found) used.add(found.id);
    return found ?? null;
  };

  const usArticle = pick(isUS);
  const euArticle = pick(isEU);
  const globalArticle = pick((j) => !isUS(j) && !isEU(j));

  const fillSlot = () => {
    const found = sorted.find((a) => !used.has(a.id));
    if (found) used.add(found.id);
    return found ?? null;
  };

  const slot1 = usArticle ?? fillSlot();
  const slot2 = euArticle ?? fillSlot();
  const slot3 = globalArticle ?? fillSlot();

  if (!slot1 || !slot2 || !slot3) {
    return new Response(
      JSON.stringify({ error: "Not enough articles to fill 3 spotlight slots" }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { error: upsertError } = await supabase
    .from("homepage_spotlight")
    .upsert(
      [
        { spotlight_date: today, slot: 1, update_id: slot1.id },
        { spotlight_date: today, slot: 2, update_id: slot2.id },
        { spotlight_date: today, slot: 3, update_id: slot3.id },
      ],
      { onConflict: "spotlight_date,slot" },
    );

  if (upsertError) {
    return new Response(
      JSON.stringify({ error: upsertError.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      date: today,
      slots: {
        1: { id: slot1.id, jurisdiction: slot1.jurisdiction, severity: slot1.attention_level },
        2: { id: slot2.id, jurisdiction: slot2.jurisdiction, severity: slot2.attention_level },
        3: { id: slot3.id, jurisdiction: slot3.jurisdiction, severity: slot3.attention_level },
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
