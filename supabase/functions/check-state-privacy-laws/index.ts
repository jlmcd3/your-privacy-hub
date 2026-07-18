// Bi-monthly check for newly enacted US state comprehensive privacy laws.
// Inserts CANDIDATE rows that an admin must confirm before any UI data changes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FUNCTION_NAME = "check-state-privacy-laws";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const ADMIN_EMAIL =
      Deno.env.get("ADMIN_NOTIFICATION_EMAIL") ||
      Deno.env.get("ALERT_EMAIL");

    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Load the canonical state list from the bundled JSON via raw GitHub-style fetch is not available.
    // Instead fetch the data from the database overrides + a static fallback list.
    // For source of truth we read the static JSON shipped with the function.
    const usStates: any[] = await import("./us_state_privacy_authorities.json", {
      assert: { type: "json" },
    }).then((m) => m.default);

    // Apply any confirmed overrides so we don't re-flag laws an admin already confirmed.
    const { data: overrides } = await admin
      .from("state_law_overrides")
      .select("state_slug, statute_status, statute_name");
    const overrideMap = new Map(
      (overrides || []).map((o: any) => [o.state_slug, o]),
    );

    const merged = usStates.map((s: any) => {
      const ov = overrideMap.get(s.slug);
      return {
        slug: s.slug,
        state: s.state,
        status: ov?.statute_status || s.statute_status || "None",
        statute_name: ov?.statute_name || s.statute_name,
      };
    });

    const noLawStates = merged
      .filter((s) => (s.status || "None").toLowerCase() !== "enacted")
      .map((s) => s.state);

    // Last run timestamp
    const { data: prevRun } = await admin
      .from("function_run_log")
      .select("last_run_at")
      .eq("function_name", FUNCTION_NAME)
      .maybeSingle();
    const sinceDate = prevRun?.last_run_at
      ? new Date(prevRun.last_run_at).toISOString().slice(0, 10)
      : "2024-01-01";

    const systemPrompt =
      "You are a legal research assistant specialising in US state privacy law. " +
      "Your job is to identify newly enacted comprehensive consumer privacy laws. " +
      "Be conservative — only report laws that have been signed by the governor and enacted into law. " +
      "Do not report bills that are only pending, proposed, or passed one chamber. " +
      "Only report comprehensive consumer privacy laws, not sector-specific laws " +
      "(not HIPAA-equivalents, not children's laws, not financial privacy laws). " +
      "Respond ONLY with valid JSON.";

    const userPrompt =
      `Check for any new comprehensive state consumer privacy laws enacted in the United States since ${sinceDate}. ` +
      `The following states currently have NO enacted comprehensive privacy law: ${noLawStates.join(", ")}. ` +
      `Have any of these states enacted a new comprehensive consumer privacy law? Search the web for the most recent information.\n\n` +
      `Respond with a JSON array. Each element should be:\n` +
      `{\n  state_name: string,\n  law_name: string,\n  effective_date: string (YYYY-MM-DD or 'TBD'),\n  enforcement_authority: string,\n  statute_url: string (official government URL if known),\n  confidence: 'high' | 'medium' | 'low',\n  source_notes: string (brief description of what you found)\n}\n\n` +
      `If no new laws have been enacted, respond with an empty array: []`;

    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicResp.ok) {
      const txt = await anthropicResp.text();
      throw new Error(`Anthropic API ${anthropicResp.status}: ${txt}`);
    }
    const ai = await anthropicResp.json();

    // Find the final text block
    const textBlock = (ai.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("\n");

    let detected: any[] = [];
    try {
      const match = textBlock.match(/\[[\s\S]*\]/);
      detected = match ? JSON.parse(match[0]) : [];
    } catch (e) {
      console.error("JSON parse failed:", e, textBlock);
      detected = [];
    }

    const inserted: any[] = [];
    for (const item of detected) {
      if (!item?.state_name) continue;
      const slug = slugify(item.state_name);
      const { data: existing } = await admin
        .from("state_law_update_candidates")
        .select("id")
        .eq("state_slug", slug)
        .eq("status", "pending")
        .maybeSingle();
      if (existing) continue;

      const { data: row } = await admin
        .from("state_law_update_candidates")
        .insert({
          state_slug: slug,
          state_name: item.state_name,
          detected_law_name: item.law_name,
          detected_effective_date: item.effective_date,
          detected_authority: item.enforcement_authority,
          detected_statute_url: item.statute_url,
          source_summary: item.source_notes,
          confidence: ["high", "medium", "low"].includes(item.confidence)
            ? item.confidence
            : "low",
        })
        .select()
        .single();
      if (row) inserted.push(row);
    }

    // Email admin if any new candidates
    if (inserted.length > 0 && ADMIN_EMAIL && RESEND_API_KEY) {
      const next = new Date();
      const day = next.getUTCDate();
      next.setUTCDate(day < 15 ? 15 : 1);
      if (day >= 15) next.setUTCMonth(next.getUTCMonth() + 1);

      const lines = inserted
        .map(
          (c) =>
            `• ${c.state_name} — ${c.detected_law_name || "(unnamed)"} (confidence: ${c.confidence})\n  ${c.source_summary || ""}`,
        )
        .join("\n\n");

      const siteUrl = "https://enduserprivacy.com";
      const body =
        `The automated privacy law monitor has detected ${inserted.length} potential new state privacy law(s) that may require updating the site.\n\n` +
        `These are CANDIDATES only — they have not been applied to the site. Each requires your confirmation.\n\n` +
        `Laws detected:\n\n${lines}\n\n` +
        `Review and confirm at: ${siteUrl}/admin/law-updates\n\n` +
        `This check ran at ${new Date().toISOString()}. Next check: ${next.toISOString().slice(0, 10)}.`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "End User Privacy <support@enduserprivacy.com>",
          to: [ADMIN_EMAIL],
          subject: `EUP: ${inserted.length} new state privacy law(s) detected — confirmation required`,
          text: body,
        }),
      });
    }

    // Update run log
    await admin.from("function_run_log").upsert({
      function_name: FUNCTION_NAME,
      last_run_at: new Date().toISOString(),
      last_result: { detected_count: detected.length, inserted_count: inserted.length },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        detected: detected.length,
        inserted: inserted.length,
        candidates: inserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("check-state-privacy-laws error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
