// Weekly cron: find generated RoPA sessions ~11 months old and email the owner
// if there are relevant regulatory updates since their last document. Rate-limit
// to one reminder per client per 7 days. Skip if the client already has an
// in-progress refresh session.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";

const TOPIC_TO_TEMPLATE_KEYS: Record<string, string[]> = {
  "ai-privacy": ["marketing_analytics", "tech_it_systems", "hr_recruitment", "customer_support"],
  "ai-governance": ["tech_it_systems", "hr_recruitment", "marketing_analytics"],
  "children-privacy": ["marketing_email", "marketing_social", "customer_accounts"],
  "health-hipaa": ["hr_benefits", "customer_accounts", "third_party_vendors"],
  "data-breaches": ["tech_security", "tech_it_systems", "tech_cloud"],
  "adtech": ["marketing_advertising", "marketing_analytics", "marketing_social"],
  "cookie-consent": ["marketing_analytics", "marketing_advertising"],
  "biometric-data": ["hr_monitoring", "tech_security", "customer_kyc"],
  "data-transfers": ["tech_cloud", "third_party_transfers", "third_party_vendors"],
  "cross-border": ["third_party_transfers", "tech_cloud"],
  "data-brokers": ["third_party_sharing", "marketing_analytics"],
  "employee-privacy": ["hr_payroll", "hr_recruitment", "hr_performance", "hr_monitoring"],
  "privacy-litigation": ["legal_compliance", "legal_contracts"],
  "enforcement": ["legal_compliance"],
  "apac-latam": ["third_party_transfers", "tech_cloud"],
};

function urgencyOf(level: string | null): "high" | "medium" | null {
  if (!level) return null;
  const v = level.toLowerCase();
  if (["urgent", "critical", "high"].includes(v)) return "high";
  if (["important", "medium", "moderate"].includes(v)) return "medium";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Eligible: generated, completed_at between 11 and 14 months ago, no newer
    // sibling session, no in-progress refresh.
    const now = new Date();
    const elevenMonthsAgo = new Date(now); elevenMonthsAgo.setMonth(now.getMonth() - 11);
    const fourteenMonthsAgo = new Date(now); fourteenMonthsAgo.setMonth(now.getMonth() - 14);

    const { data: candidates, error: cErr } = await admin
      .from("ropa_sessions")
      .select("id, client_id, completed_at, version_number")
      .eq("status", "generated")
      .gte("completed_at", fourteenMonthsAgo.toISOString())
      .lte("completed_at", elevenMonthsAgo.toISOString());
    if (cErr) throw cErr;

    let processed = 0;
    let emailed = 0;
    const skipped: Array<{ session_id: string; reason: string }> = [];

    for (const session of candidates || []) {
      processed++;

      // Skip if there's a more recent generated session for the same client
      const { data: newer } = await admin
        .from("ropa_sessions")
        .select("id")
        .eq("client_id", session.client_id)
        .gt("completed_at", session.completed_at!)
        .eq("status", "generated")
        .limit(1);
      if (newer && newer.length > 0) {
        skipped.push({ session_id: session.id, reason: "newer_session" });
        continue;
      }

      // Skip if there's an in-progress refresh
      const { data: inProgress } = await admin
        .from("ropa_sessions")
        .select("id")
        .eq("client_id", session.client_id)
        .eq("is_refresh", true)
        .eq("status", "in_progress")
        .limit(1);
      if (inProgress && inProgress.length > 0) {
        skipped.push({ session_id: session.id, reason: "refresh_in_progress" });
        continue;
      }

      // Rate limit: 7 days
      const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: recentReminder } = await admin
        .from("ropa_refresh_reminders")
        .select("id")
        .eq("client_id", session.client_id)
        .gte("sent_at", sevenDaysAgo.toISOString())
        .limit(1);
      if (recentReminder && recentReminder.length > 0) {
        skipped.push({ session_id: session.id, reason: "recently_emailed" });
        continue;
      }

      // Find relevant updates
      const { data: jurisdictions } = await admin
        .from("ropa_jurisdiction_selections")
        .select("jurisdiction_code, jurisdiction_name")
        .eq("client_id", session.client_id);
      const jurCodes = (jurisdictions || []).map((j) => j.jurisdiction_code);
      if (jurCodes.length === 0) {
        skipped.push({ session_id: session.id, reason: "no_jurisdictions" });
        continue;
      }

      const { data: activities } = await admin
        .from("ropa_processing_activities")
        .select("template_key")
        .eq("session_id", session.id);
      const activeTpl = new Set(
        (activities || []).map((a) => a.template_key).filter((k): k is string => Boolean(k)),
      );

      const { data: rawUpdates } = await admin
        .from("updates")
        .select("id, title, attention_level, topic_tags, direct_jurisdictions, affected_jurisdictions, why_it_matters_short")
        .gte("published_at", session.completed_at!)
        .eq("is_hidden", false)
        .order("published_at", { ascending: false })
        .limit(50);

      const matched: Array<{ title: string; jurisdiction: string; urgency: string; why: string }> = [];
      for (const u of rawUpdates || []) {
        const urg = urgencyOf(u.attention_level);
        if (!urg) continue;
        const all = new Set([...(u.direct_jurisdictions || []), ...(u.affected_jurisdictions || [])]);
        const matchingJurs = jurCodes.filter((c) => all.has(c));
        if (matchingJurs.length === 0) continue;

        const tags: string[] = u.topic_tags || [];
        const hasRelevantTpl = tags.some((t) =>
          (TOPIC_TO_TEMPLATE_KEYS[t] || []).some((k) => activeTpl.has(k)),
        );
        if (!hasRelevantTpl) continue;

        const jurName = (jurisdictions || []).find((j) => j.jurisdiction_code === matchingJurs[0])?.jurisdiction_name
          || matchingJurs[0];
        matched.push({
          title: u.title,
          jurisdiction: jurName,
          urgency: urg,
          why: u.why_it_matters_short || "",
        });
      }

      if (matched.length === 0) {
        skipped.push({ session_id: session.id, reason: "no_relevant_updates" });
        continue;
      }

      // Find owner email
      const { data: client } = await admin
        .from("clients")
        .select("owner_id, name")
        .eq("id", session.client_id)
        .maybeSingle();
      if (!client?.owner_id) {
        skipped.push({ session_id: session.id, reason: "no_owner" });
        continue;
      }
      const { data: userResp } = await admin.auth.admin.getUserById(client.owner_id);
      const recipientEmail = userResp?.user?.email;
      if (!recipientEmail) {
        skipped.push({ session_id: session.id, reason: "no_owner_email" });
        continue;
      }

      const refreshUrl = "https://enduserprivacy.com/ropa/refresh/" + session.id;
      const jurChips = (jurisdictions || []).map((j) => j.jurisdiction_name).join(", ");
      const top = matched.slice(0, 5);
      const itemsHtml = top
        .map(
          (m) => `<li style="margin-bottom:12px"><strong>${escapeHtml(m.title)}</strong><br>
            <span style="color:#666">${escapeHtml(m.jurisdiction)} · ${m.urgency.toUpperCase()}</span>
            ${m.why ? `<br><span>${escapeHtml(m.why)}</span>` : ""}</li>`,
        )
        .join("");

      const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="font-family: Georgia, serif; color: #111;">Your RoPA is due for review</h2>
  <p>Hi,</p>
  <p>It's been about 11 months since you last generated a Record of Processing Activities for <strong>${escapeHtml(client.name || "your organisation")}</strong>. Since then, ${matched.length} regulatory ${matched.length === 1 ? "development" : "developments"} ${matched.length === 1 ? "has" : "have"} occurred in your monitored jurisdictions that may affect your records.</p>
  <p style="font-size:13px;color:#666"><strong>Jurisdictions monitored:</strong> ${escapeHtml(jurChips)}</p>
  <h3>Top developments to consider</h3>
  <ul style="padding-left:18px">${itemsHtml}</ul>
  <p style="margin-top:24px">
    <a href="${refreshUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px">Start refresh →</a>
  </p>
  <p style="font-size:12px;color:#999;margin-top:32px">You're receiving this because you have a generated RoPA on EndUserPrivacy.com. We send at most one of these per week per organisation.</p>
</div>`;

      const result = await sendEmail({
        to: recipientEmail,
        subject: `Your RoPA is due for review — ${matched.length} regulatory developments to consider`,
        html,
        tags: [{ name: "type", value: "ropa_refresh_reminder" }],
      });

      if (result.error) {
        console.error("send failed", session.id, result.error);
        skipped.push({ session_id: session.id, reason: `send_failed:${result.error}` });
        continue;
      }

      await admin.from("ropa_refresh_reminders").insert({
        client_id: session.client_id,
        source_session_id: session.id,
        updates_count: matched.length,
        recipient_email: recipientEmail,
      });

      if (!result.skipped) emailed++;
    }

    return new Response(
      JSON.stringify({ processed, emailed, skipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (err) {
    console.error("ropa-refresh-reminders error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
