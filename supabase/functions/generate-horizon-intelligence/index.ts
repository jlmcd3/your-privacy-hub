// Generates weekly Regulatory Horizon entries by analyzing the past 14 days
// of `updates` and synthesizing forward-looking signals via Lovable AI.
//
// Trigger: pg_cron weekly OR manual POST with { admin_token }.
// Output: rows inserted into public.horizon_intelligence for the current ISO week.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface HorizonRow {
  jurisdiction: string | null;
  sector: string | null;
  anticipated_development: string;
  confidence: "high" | "medium" | "low";
  timeline_label: string;
  source_signal: string;
  recommended_action: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const adminToken = Deno.env.get("ADMIN_SECRET_TOKEN");
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (!adminToken || body.admin_token !== adminToken) {
        return new Response(JSON.stringify({ error: "unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const since = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();
    const enforcementSince = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const [{ data: updates, error }, { data: enforcement, error: enfErr }] = await Promise.all([
      supabase
        .from("updates")
        .select("title, summary, regulator, direct_jurisdictions, topic_tags, published_at")
        .gte("published_at", since)
        .order("published_at", { ascending: false })
        .limit(80),
      supabase
        .from("enforcement_actions")
        .select("regulator, jurisdiction, subject, sector, law, violation, key_compliance_failure, decision_date, fine_eur_equivalent, precedent_significance, violation_types")
        .gte("enrichment_version", 1)
        .gte("decision_date", enforcementSince)
        .order("precedent_significance", { ascending: false, nullsFirst: false })
        .order("decision_date", { ascending: false, nullsFirst: false })
        .limit(40),
    ]);
    if (error) throw error;
    if (enfErr) throw enfErr;

    const updatesCorpus = (updates ?? [])
      .map(
        (u: any, i: number) =>
          `[U${i + 1}] ${u.title}\n  Regulator: ${u.regulator ?? "?"} | Jurisdictions: ${(u.direct_jurisdictions ?? []).join(", ")}\n  Topics: ${(u.topic_tags ?? []).join(", ")}\n  Summary: ${(u.summary ?? "").slice(0, 320)}`
      )
      .join("\n\n");

    const enforcementCorpus = (enforcement ?? [])
      .map(
        (e: any, i: number) =>
          `[E${i + 1}] ${e.regulator} v. ${e.subject ?? "?"} (${e.jurisdiction}, ${e.decision_date ?? "?"})\n  Law: ${e.law ?? "?"} | Sector: ${e.sector ?? "?"} | Fine: ${e.fine_eur_equivalent ? `€${Math.round(e.fine_eur_equivalent).toLocaleString()}` : "n/a"} | Significance: ${e.precedent_significance ?? "?"}/5\n  Violation types: ${(e.violation_types ?? []).join(", ")}\n  Key failure: ${(e.key_compliance_failure ?? e.violation ?? "").slice(0, 280)}`
      )
      .join("\n\n");

    const corpus = `## RECENT REGULATORY UPDATES (last 14 days)\n\n${updatesCorpus}\n\n\n## RECENT ENFORCEMENT ACTIONS (last 90 days, ranked by precedent significance)\n\n${enforcementCorpus}`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content:
              "You are a privacy regulatory analyst. Given recent regulatory developments, produce 6-10 forward-looking 'Regulatory Horizon' entries: anticipated developments in the next 1-12 months. Return JSON only.",
          },
          {
            role: "user",
            content: `Recent updates (last 14 days):\n\n${corpus}\n\nReturn JSON: { "items": [ { "jurisdiction": string|null, "sector": string|null, "anticipated_development": string (one sentence), "confidence": "high"|"medium"|"low", "timeline_label": "30 days"|"60-90 days"|"3-6 months"|"6-12 months", "source_signal": string (brief evidence), "recommended_action": string (one practical step) } ] }`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text();
      return new Response(JSON.stringify({ error: "ai_failed", detail: t }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const items: HorizonRow[] = parsed.items ?? [];

    const weekOf = new Date();
    weekOf.setUTCHours(0, 0, 0, 0);
    const dow = weekOf.getUTCDay();
    weekOf.setUTCDate(weekOf.getUTCDate() - ((dow + 6) % 7)); // Monday
    const weekIso = weekOf.toISOString().slice(0, 10);

    const rows = items.slice(0, 12).map((it) => ({
      week_of: weekIso,
      jurisdiction: it.jurisdiction,
      sector: it.sector,
      anticipated_development: it.anticipated_development,
      confidence: it.confidence,
      timeline_label: it.timeline_label,
      source_signal: it.source_signal,
      recommended_action: it.recommended_action,
    }));

    if (rows.length) {
      const { error: insErr } = await supabase.from("horizon_intelligence").insert(rows);
      if (insErr) throw insErr;
    }

    return new Response(JSON.stringify({ inserted: rows.length, week_of: weekIso }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
