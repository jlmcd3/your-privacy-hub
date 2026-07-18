// Weekly drift detection — FULLY AUTONOMOUS.
// 1. Scans recent updates for tracked-law + drift-keyword matches.
// 2. Uses Lovable AI to verify whether the article actually announces a date change
//    and extract the new date / status (delay, injunction, repeal).
// 3. If confidence is high, auto-applies the change:
//      - inserts a new regulatory_milestones row with the revised date
//      - marks the old milestone superseded_by = new row
// 4. Records every action in regulatory_drift_alerts (auto-applied or skipped).
// 5. Sends an informational digest to ALERT_EMAIL — no human action required to keep
//    the public /calendar accurate; the email is for awareness only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { LAW_ALIASES, DRIFT_KEYWORDS, detectLawSlug } from "../_shared/lawAliases.ts";

const LOOKBACK_DAYS = 30;
const CONFIDENCE_THRESHOLD = 0.8;

interface Verdict {
  confirmed: boolean;
  confidence: number;
  change_type: "delay" | "injunction" | "repeal" | "amendment" | "none";
  new_date: string | null;   // ISO yyyy-mm-dd or null
  rationale: string;
}

async function verifyWithLLM(args: {
  lawSlug: string;
  currentDate: string;
  currentTitle: string;
  articleTitle: string;
  articleSummary: string;
  articleUrl: string;
}): Promise<Verdict | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const prompt = `You are verifying whether a news item reports a real change to a tracked privacy/AI regulation's effective or enforcement date.

TRACKED LAW: ${args.lawSlug}
CURRENT MILESTONE: "${args.currentTitle}" — date ${args.currentDate}

NEWS ITEM TITLE: ${args.articleTitle}
NEWS ITEM SUMMARY: ${args.articleSummary}
SOURCE URL: ${args.articleUrl}

SOURCE FIDELITY (non-negotiable):
- Base your verdict ONLY on the news item title and summary above. Do not draw on training knowledge to confirm or extrapolate dates.
- "confirmed" may be true ONLY if the article text itself explicitly and unambiguously states a date change, court injunction, repeal, or amendment that supersedes the current milestone. A general mention of the law is not enough.
- "new_date" must be a date that appears verbatim in the article title or summary, normalised to YYYY-MM-DD. If no specific date appears in the text, set new_date to null even if you believe one exists.
- If the article is commentary, speculation, or merely cites the existing milestone, set confirmed=false and change_type="none".
- Set confidence below 0.5 whenever the article text is ambiguous about which milestone, which jurisdiction, or which date is affected.

Decide:
- confirmed: true ONLY if the article unambiguously reports a date change, court injunction, repeal, or amendment that supersedes the current milestone.
- confidence: 0.0–1.0 (your certainty, grounded in the article text only).
- change_type: "delay" | "injunction" | "repeal" | "amendment" | "none"
- new_date: extracted new effective date as YYYY-MM-DD (must appear verbatim in the article text), or null if unknown / fully blocked / not stated.
- rationale: one sentence quoting or paraphrasing the article text that supports your verdict.

Return STRICT JSON only, no prose, no markdown:
{"confirmed":bool,"confidence":num,"change_type":str,"new_date":str|null,"rationale":str}`;

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(text);
    return {
      confirmed: !!parsed.confirmed,
      confidence: Number(parsed.confidence) || 0,
      change_type: parsed.change_type ?? "none",
      new_date: parsed.new_date || null,
      rationale: String(parsed.rationale ?? ""),
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: recent, error } = await supabase
      .from("updates")
      .select("id, title, summary, category, url, law_slug, published_at")
      .gte("published_at", since)
      .eq("is_hidden", false)
      .limit(500);
    if (error) throw error;

    const { data: milestones } = await supabase
      .from("regulatory_milestones")
      .select("id, law_slug, title, milestone_date, milestone_type, jurisdiction, description")
      .is("superseded_by", null);

    const msByLaw = new Map<string, Array<{ id: string; title: string; date: string; type: string; jurisdiction: string; description: string | null }>>();
    for (const m of milestones ?? []) {
      const arr = msByLaw.get(m.law_slug as string) ?? [];
      arr.push({
        id: m.id as string,
        title: m.title as string,
        date: m.milestone_date as string,
        type: m.milestone_type as string,
        jurisdiction: m.jurisdiction as string,
        description: (m.description as string | null) ?? null,
      });
      msByLaw.set(m.law_slug as string, arr);
    }

    type ActionRow = {
      milestone_id: string | null;
      law_slug: string;
      signal_keyword: string;
      matched_update_id: string;
      matched_update_title: string;
      matched_update_url: string;
      reviewed: boolean;
      reviewed_at: string | null;
      resolution: string;
    };
    const actions: ActionRow[] = [];
    let autoApplied = 0;
    let lowConfidence = 0;

    for (const u of recent ?? []) {
      const haystack = `${u.title ?? ""} ${u.summary ?? ""}`.toLowerCase();
      const matchedKeyword = DRIFT_KEYWORDS.find((k) => haystack.includes(k));
      if (!matchedKeyword) continue;

      const slug = u.law_slug ?? detectLawSlug(u.title, u.category, u.summary);
      if (!slug) continue;

      const lawMilestones = msByLaw.get(slug) ?? [];
      if (lawMilestones.length === 0) continue;

      // Dedup: skip if we already processed this update for this law
      const { data: existing } = await supabase
        .from("regulatory_drift_alerts")
        .select("id")
        .eq("matched_update_id", u.id as string)
        .eq("law_slug", slug)
        .limit(1);
      if (existing && existing.length > 0) continue;

      // Verify with LLM against the nearest-future milestone
      const target = lawMilestones[0];
      const verdict = await verifyWithLLM({
        lawSlug: slug,
        currentDate: target.date,
        currentTitle: target.title,
        articleTitle: u.title as string,
        articleSummary: (u.summary as string) ?? "",
        articleUrl: u.url as string,
      });

      if (!verdict || !verdict.confirmed || verdict.confidence < CONFIDENCE_THRESHOLD) {
        lowConfidence++;
        actions.push({
          milestone_id: target.id,
          law_slug: slug,
          signal_keyword: matchedKeyword,
          matched_update_id: u.id as string,
          matched_update_title: u.title as string,
          matched_update_url: u.url as string,
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          resolution: verdict
            ? `skipped: ${verdict.change_type} confidence=${verdict.confidence.toFixed(2)} — ${verdict.rationale}`
            : "skipped: llm unavailable or invalid response",
        });
        continue;
      }

      // High-confidence change → auto-apply
      let newMilestoneId: string | null = null;

      if (verdict.change_type === "delay" || verdict.change_type === "amendment") {
        if (verdict.new_date) {
          const { data: ins, error: insErr } = await supabase
            .from("regulatory_milestones")
            .insert({
              law_slug: slug,
              milestone_type: target.type,
              milestone_date: verdict.new_date,
              title: `${target.title} (Updated)`,
              description: `${target.description ?? ""}\n\nUpdated from ${target.date} based on: ${u.title}`.trim(),
              jurisdiction: target.jurisdiction,
              source_url: u.url as string,
              verified_at: new Date().toISOString(),
              notes: `Auto-applied by regulatory-drift-detect. Verdict: ${verdict.rationale}`,
            })
            .select("id")
            .single();
          if (!insErr && ins) newMilestoneId = ins.id as string;
        }
      } else if (verdict.change_type === "injunction" || verdict.change_type === "repeal") {
        // Block/repeal: create a marker milestone with a far-future date and note
        const { data: ins } = await supabase
          .from("regulatory_milestones")
          .insert({
            law_slug: slug,
            milestone_type: verdict.change_type === "repeal" ? "review_date" : "review_date",
            milestone_date: verdict.new_date ?? "2099-12-31",
            title: `${target.title} — ${verdict.change_type === "repeal" ? "Repealed" : "Enjoined"}`,
            description: `Original date ${target.date} is no longer in force.\nSource: ${u.title}`,
            jurisdiction: target.jurisdiction,
            source_url: u.url as string,
            verified_at: new Date().toISOString(),
            notes: `Auto-applied by regulatory-drift-detect. ${verdict.rationale}`,
          })
          .select("id")
          .single();
        if (ins) newMilestoneId = ins.id as string;
      }

      if (newMilestoneId) {
        await supabase
          .from("regulatory_milestones")
          .update({ superseded_by: newMilestoneId })
          .eq("id", target.id);
        autoApplied++;
        actions.push({
          milestone_id: target.id,
          law_slug: slug,
          signal_keyword: matchedKeyword,
          matched_update_id: u.id as string,
          matched_update_title: u.title as string,
          matched_update_url: u.url as string,
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          resolution: `auto-applied: ${verdict.change_type} → ${verdict.new_date ?? "blocked"} (confidence ${verdict.confidence.toFixed(2)})`,
        });
      } else {
        actions.push({
          milestone_id: target.id,
          law_slug: slug,
          signal_keyword: matchedKeyword,
          matched_update_id: u.id as string,
          matched_update_title: u.title as string,
          matched_update_url: u.url as string,
          reviewed: true,
          reviewed_at: new Date().toISOString(),
          resolution: `confirmed but no actionable date extracted (${verdict.change_type})`,
        });
      }
    }

    // Persist alert rows
    if (actions.length > 0) {
      await supabase.from("regulatory_drift_alerts").insert(actions);
    }

    // Informational digest
    const alertEmail = Deno.env.get("ALERT_EMAIL");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (actions.length > 0 && alertEmail && resendKey && lovableKey) {
      const rows = actions
        .slice(0, 30)
        .map(
          (a) =>
            `<tr>
              <td style="padding:6px 10px;border-bottom:1px solid #eee;"><strong>${a.law_slug}</strong></td>
              <td style="padding:6px 10px;border-bottom:1px solid #eee;">${a.resolution}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #eee;"><a href="${a.matched_update_url}">${a.matched_update_title}</a></td>
            </tr>`
        )
        .join("");
      const html = `
        <div style="font-family:system-ui,sans-serif;max-width:680px;">
          <h2 style="color:#0d1f35;margin:0 0 8px;">Regulatory calendar — automated update</h2>
          <p style="color:#444;">${autoApplied} milestone${autoApplied === 1 ? "" : "s"} auto-updated, ${lowConfidence} signal${lowConfidence === 1 ? "" : "s"} discarded as low-confidence. <strong>No action required</strong> — the public /calendar already reflects these changes.</p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead><tr style="background:#f5f5f5;">
              <th style="padding:6px 10px;text-align:left;">Law</th>
              <th style="padding:6px 10px;text-align:left;">Action</th>
              <th style="padding:6px 10px;text-align:left;">Source</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="color:#888;font-size:12px;margin-top:16px;">
            Auto-applied by regulatory-drift-detect using Lovable AI verification (threshold ${CONFIDENCE_THRESHOLD}). Superseded milestones remain in the database for audit.
          </p>
        </div>`;

      await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": resendKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "End User Privacy <support@enduserprivacy.com>",
          to: [alertEmail],
          subject: `[Calendar] ${autoApplied} auto-update${autoApplied === 1 ? "" : "s"}, ${lowConfidence} discarded`,
          html,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        scanned: recent?.length ?? 0,
        actions: actions.length,
        auto_applied: autoApplied,
        low_confidence: lowConfidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
