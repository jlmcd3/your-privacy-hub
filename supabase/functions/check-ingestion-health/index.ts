// Periodic health-check for ingestion jobs.
// Sends an alert email to ALERT_EMAIL when any of the following is true:
//   1. A run has been "running" for more than 10 minutes (stuck/timed out).
//   2. A given job has 2+ consecutive non-success runs (repeated failures).
//   3. A given job has not had a successful run in the last 8 hours (silent stall).
// Each alert condition is throttled to at most one email every 6 hours via
// the `ingestion_alert_state` table.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Jobs we monitor. Add more here if new ingestion functions are introduced.
const MONITORED_JOBS = ["fetch-updates", "fetch-newsapi"];

// Tunables
const STUCK_MINUTES = 10;        // run still "running" beyond this is stuck
const NO_SUCCESS_HOURS = 8;      // alert if no successful run in this window
const THROTTLE_HOURS = 6;        // suppress repeat alerts for the same key
const CONSECUTIVE_FAIL_THRESHOLD = 2;

interface Alert {
  key: string;
  subject: string;
  body: string;
}

async function alreadyAlertedRecently(key: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - THROTTLE_HOURS * 3600_000).toISOString();
  const { data } = await supabase
    .from("ingestion_alert_state")
    .select("alert_key, last_alerted_at")
    .eq("alert_key", key)
    .gte("last_alerted_at", cutoff)
    .maybeSingle();
  return !!data;
}

async function recordAlertSent(key: string, payload: unknown) {
  await supabase
    .from("ingestion_alert_state")
    .upsert(
      { alert_key: key, last_alerted_at: new Date().toISOString(), last_payload: payload as any },
      { onConflict: "alert_key" },
    );
}

async function checkStuckRuns(): Promise<Alert[]> {
  const cutoff = new Date(Date.now() - STUCK_MINUTES * 60_000).toISOString();
  const { data, error } = await supabase
    .from("ingestion_runs")
    .select("id, job_name, status, run_at, started_at")
    .eq("status", "running")
    .lt("run_at", cutoff);
  if (error) {
    console.error("checkStuckRuns query failed:", error);
    return [];
  }
  return (data ?? []).map((r) => {
    const ageMin = Math.round((Date.now() - new Date(r.run_at).getTime()) / 60_000);
    return {
      key: `stuck:${r.id}`,
      subject: `[Ingestion alert] ${r.job_name ?? "unknown job"} stuck in 'running' for ${ageMin}m`,
      body: `Run ID: ${r.id}\nJob: ${r.job_name}\nStarted: ${r.run_at}\nStill marked as 'running' after ${ageMin} minutes (threshold: ${STUCK_MINUTES}m).\n\nThis usually indicates the function timed out before it could record completion. Check the function logs and consider marking this run as 'error'.`,
    };
  });
}

async function checkConsecutiveFailures(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  for (const job of MONITORED_JOBS) {
    const { data, error } = await supabase
      .from("ingestion_runs")
      .select("id, status, run_at, error_message")
      .eq("job_name", job)
      .order("run_at", { ascending: false })
      .limit(CONSECUTIVE_FAIL_THRESHOLD);
    if (error) {
      console.error(`checkConsecutiveFailures(${job}) failed:`, error);
      continue;
    }
    const recent = data ?? [];
    if (recent.length < CONSECUTIVE_FAIL_THRESHOLD) continue;
    const allFailed = recent.every((r) => r.status === "error");
    if (!allFailed) continue;
    const lastErr = recent[0]?.error_message ?? "(no error message recorded)";
    alerts.push({
      key: `consecutive-failures:${job}`,
      subject: `[Ingestion alert] ${job} has failed ${CONSECUTIVE_FAIL_THRESHOLD} runs in a row`,
      body: `Job: ${job}\nThe last ${CONSECUTIVE_FAIL_THRESHOLD} runs all ended with status 'error'.\nMost recent error: ${lastErr}\n\nRecent runs:\n` +
        recent.map((r) => `- ${r.run_at}  ${r.status}  ${r.error_message ?? ""}`).join("\n"),
    });
  }
  return alerts;
}

async function checkNoRecentSuccess(): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const cutoff = new Date(Date.now() - NO_SUCCESS_HOURS * 3600_000).toISOString();
  for (const job of MONITORED_JOBS) {
    const { data, error } = await supabase
      .from("ingestion_runs")
      .select("id, run_at")
      .eq("job_name", job)
      .eq("status", "success")
      .gte("run_at", cutoff)
      .limit(1);
    if (error) {
      console.error(`checkNoRecentSuccess(${job}) failed:`, error);
      continue;
    }
    if ((data ?? []).length > 0) continue;
    alerts.push({
      key: `no-success:${job}`,
      subject: `[Ingestion alert] ${job} has had no successful run in ${NO_SUCCESS_HOURS}h`,
      body: `Job: ${job}\nNo run with status 'success' has been recorded in the past ${NO_SUCCESS_HOURS} hours.\n\nThe scheduled cron may have stopped firing, or every recent attempt has failed. Check pg_cron + function logs.`,
    });
  }
  return alerts;
}

async function sendAlertEmail(to: string, subject: string, body: string): Promise<boolean | "skipped"> {
  const html = `
    <h2 style="font-family:Arial,sans-serif;color:#0a2540">${subject.replace(/^\[[^\]]+\]\s*/, "")}</h2>
    <pre style="font-family:Menlo,Consolas,monospace;font-size:13px;background:#f6f8fa;padding:14px;border-radius:8px;white-space:pre-wrap">${body}</pre>
    <p style="font-family:Arial,sans-serif;font-size:12px;color:#666">Sent by check-ingestion-health · ${new Date().toISOString()}</p>
  `;

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    // No transport configured yet — log the alert so it's visible in function
    // logs, and return "skipped" so we don't burn the throttle window.
    console.warn("[alert:skipped — RESEND_API_KEY not set]", subject, "\n", body);
    return "skipped";
  }

  // Resend can send from onboarding@resend.dev without domain verification.
  // Once a verified sender is configured at Resend, swap FROM_ADDRESS via secret.
  const from = Deno.env.get("ALERT_FROM_ADDRESS")
    || "EndUserPrivacy Alerts <onboarding@resend.dev>";

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (r.ok) return true;
    const txt = await r.text();
    console.error("Resend send failed:", r.status, txt);
    return false;
  } catch (e) {
    console.error("Resend send threw:", (e as Error).message);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const alertEmail = Deno.env.get("ALERT_EMAIL");
    if (!alertEmail) {
      return new Response(
        JSON.stringify({ error: "ALERT_EMAIL secret is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const all: Alert[] = [
      ...(await checkStuckRuns()),
      ...(await checkConsecutiveFailures()),
      ...(await checkNoRecentSuccess()),
    ];

    const sent: string[] = [];
    const skipped: string[] = [];

    for (const alert of all) {
      if (await alreadyAlertedRecently(alert.key)) {
        skipped.push(alert.key);
        continue;
      }
      const ok = await sendAlertEmail(alertEmail, alert.subject, alert.body);
      if (ok === true) {
        await recordAlertSent(alert.key, { subject: alert.subject });
        sent.push(alert.key);
      } else if (ok === "skipped") {
        skipped.push(`${alert.key} (no transport)`);
      }
    }

    return new Response(
      JSON.stringify({
        checked_at: new Date().toISOString(),
        alerts_found: all.length,
        sent,
        throttled: skipped,
        transport: Deno.env.get("RESEND_API_KEY") ? "resend" : "none",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("check-ingestion-health error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
