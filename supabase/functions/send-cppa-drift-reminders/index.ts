// CPPA drift reminder email dispatcher.
// Scans cppa_drift_reminders for reminders that are due (scheduled_for <= now,
// sent_at IS NULL, dismissed_at IS NULL) and sends a Resend email to the user.
// Idempotent — marks sent_at after successful delivery so reruns are safe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function renderEmail(args: {
  assessmentDate: string;
  priorScore?: number | null;
  reRunUrl: string;
  priorUrl: string;
}): string {
  return `<!doctype html>
<html>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 16px">Time to re-run your CPPA Cybersecurity assessment</h2>
  <p>It has been close to a year since your last CPPA Cybersecurity assessment on <strong>${new Date(args.assessmentDate).toDateString()}</strong>.</p>
  ${args.priorScore !== null && args.priorScore !== undefined ? `<p>Your prior overall score was <strong>${args.priorScore}</strong>.</p>` : ""}
  <p>Re-running now produces a side-by-side drift comparison so you can show the auditor what changed over the year and evidence remediation progress against § 7122(a) controls.</p>
  <p>
    <a href="${args.reRunUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Re-run for drift comparison</a>
  </p>
  <p style="margin-top:12px">
    <a href="${args.priorUrl}" style="color:#0f172a;text-decoration:underline">View prior assessment</a>
  </p>
  <p style="color:#64748b;font-size:12px;margin-top:32px">EndUserPrivacy — automated assessment reminder.</p>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stats = { scanned: 0, sent: 0, skipped: 0, errors: 0 };

  try {
    const { data: reminders, error } = await supabase
      .from("cppa_drift_reminders")
      .select("id, user_id, assessment_id, scheduled_for")
      .lte("scheduled_for", new Date().toISOString())
      .is("sent_at", null)
      .is("dismissed_at", null)
      .order("scheduled_for", { ascending: true });

    if (error) throw error;

    for (const r of reminders || []) {
      stats.scanned++;

      // Look up user email via auth admin
      const { data: { user } } = await supabase.auth.admin.getUserById(r.user_id);
      const recipient = user?.email;
      if (!recipient) {
        stats.skipped++;
        continue;
      }

      // Look up prior assessment for score + date
      const { data: assessment } = await supabase
        .from("cppa_assessments")
        .select("created_at, report_data")
        .eq("id", r.assessment_id)
        .maybeSingle();

      const priorScore = assessment?.report_data?.overall_score ?? null;
      const assessmentDate = assessment?.created_at || r.scheduled_for;

      const reRunUrl = `https://enduserprivacy.com/cppa-cybersecurity?from=${r.assessment_id}`;
      const priorUrl = `https://enduserprivacy.com/cppa-cybersecurity/result/${r.assessment_id}`;

      const result = await sendEmail({
        to: recipient,
        subject: "Re-run your CPPA Cybersecurity assessment — drift comparison ready",
        html: renderEmail({ assessmentDate, priorScore, reRunUrl, priorUrl }),
        tags: [
          { name: "category", value: "cppa_drift_reminder" },
          { name: "assessment_id", value: r.assessment_id },
        ],
      });

      if (result.error) {
        stats.errors++;
        console.error("[send-cppa-drift-reminders] email failed", result.error, { recipient, reminderId: r.id });
        continue;
      }

      if (result.skipped) {
        stats.skipped++;
        console.warn("[send-cppa-drift-reminders] email skipped (provider not configured)", { recipient, reminderId: r.id });
        continue;
      }

      // Mark as sent
      const { error: updErr } = await supabase
        .from("cppa_drift_reminders")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", r.id);

      if (updErr) {
        console.error("[send-cppa-drift-reminders] failed to mark sent", updErr);
        stats.errors++;
        continue;
      }

      stats.sent++;
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[send-cppa-drift-reminders] error", e);
    return new Response(JSON.stringify({ error: (e as Error).message, stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
