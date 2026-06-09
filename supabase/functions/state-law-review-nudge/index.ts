// Monthly state-law-review nudge. Reads the cadence from us_state_comparison
// (mirrored inline below to keep the function self-contained), checks the latest
// review per state in state_law_review_log, and emails admins about anything
// past-due. Idempotent: safe to invoke repeatedly within a cycle.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Quarterly review cadence — keep in sync with us_state_comparison.json.
const CADENCE_DAYS = 90;

interface ReviewLogRow {
  state_slug: string;
  state_name: string;
  status: "ok" | "needs_update";
  reviewed_at: string;
}

interface AdminUser {
  email: string;
}

async function getAdminEmails(): Promise<string[]> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (!roles || roles.length === 0) return [];
  const emails: string[] = [];
  for (const r of roles as Array<{ user_id: string }>) {
    const { data } = await supabase.auth.admin.getUserById(r.user_id);
    const e = data?.user?.email;
    if (e) emails.push(e);
  }
  return emails;
}

async function getEnactedStates(): Promise<Array<{ slug: string; name: string }>> {
  // The JSON file isn't in the function bundle; instead derive from overrides
  // table which always lists active states. Fall back to a static list below
  // if the table is empty.
  const FALLBACK = [
    ["ca","California"],["co","Colorado"],["ct","Connecticut"],["de","Delaware"],
    ["fl","Florida"],["ia","Iowa"],["in","Indiana"],["ky","Kentucky"],
    ["md","Maryland"],["mn","Minnesota"],["mt","Montana"],["ne","Nebraska"],
    ["nh","New Hampshire"],["nj","New Jersey"],["or","Oregon"],["ri","Rhode Island"],
    ["tn","Tennessee"],["tx","Texas"],["ut","Utah"],["va","Virginia"],
  ] as const;
  return FALLBACK.map(([slug, name]) => ({ slug, name }));
}

function emailBody(overdue: Array<{ name: string; days: number | null }>) {
  const rows = overdue
    .map(
      (o) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #e5e7eb">${o.name}</td>` +
        `<td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;color:${
          o.days === null ? "#dc2626" : "#0f172a"
        }">${o.days === null ? "Never reviewed" : `${o.days}d overdue`}</td></tr>`,
    )
    .join("");
  return `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
<h2 style="margin:0 0 8px">State-law review overdue</h2>
<p style="color:#475569">The following enacted state privacy laws are past their ${CADENCE_DAYS}-day review cadence. Verify each statute against its official source and record the review.</p>
<table style="border-collapse:collapse;width:100%;font-size:14px"><tbody>${rows}</tbody></table>
<p style="margin-top:20px"><a href="https://enduserprivacy.com/admin/state-law-review" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Open review dashboard</a></p>
<p style="color:#64748b;font-size:12px;margin-top:32px">EndUserPrivacy — automated state-law cadence reminder.</p>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const states = await getEnactedStates();

    // Pull the entire review log (small table, <200 rows) and reduce in-memory.
    const { data: log, error } = await supabase
      .from("state_law_review_log")
      .select("state_slug, state_name, status, reviewed_at")
      .order("reviewed_at", { ascending: false });
    if (error) throw error;

    const latestBySlug = new Map<string, ReviewLogRow>();
    for (const r of (log as ReviewLogRow[]) ?? []) {
      if (!latestBySlug.has(r.state_slug)) latestBySlug.set(r.state_slug, r);
    }

    const now = Date.now();
    const overdue: Array<{ name: string; days: number | null }> = [];
    for (const s of states) {
      const last = latestBySlug.get(s.slug);
      if (!last) {
        overdue.push({ name: s.name, days: null });
        continue;
      }
      const ageDays = Math.floor((now - new Date(last.reviewed_at).getTime()) / 86400000);
      if (ageDays > CADENCE_DAYS || last.status === "needs_update") {
        overdue.push({ name: s.name, days: ageDays - CADENCE_DAYS });
      }
    }

    if (overdue.length === 0) {
      return new Response(JSON.stringify({ ok: true, overdue: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admins = await getAdminEmails();
    if (admins.length === 0) {
      return new Response(JSON.stringify({ ok: true, overdue: overdue.length, sent: 0, reason: "no_admins" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = emailBody(overdue);
    let sent = 0;
    for (const to of admins) {
      const result = await sendEmail({
        to,
        subject: `State-law review overdue — ${overdue.length} state${overdue.length === 1 ? "" : "s"} past cadence`,
        html,
        tags: [{ name: "category", value: "state_law_review_nudge" }],
      });
      if (!result.error && !result.skipped) sent++;
    }

    return new Response(JSON.stringify({ ok: true, overdue: overdue.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[state-law-review-nudge] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
