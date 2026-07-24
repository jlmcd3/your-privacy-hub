// RENDER-PDF-WORKER — DS-T2
// Drains pdf_render_queue: for each pending row, invokes generate-report-pdf
// (which already knows how to build every tool's PDF from its DB row), then
// on success marks queue row 'done', updates the paired delivery_contracts
// row to terminal_state='delivered', and emails the user with a signed URL.
// Runs every 60s via pg_cron.
//
// Build stamp: render-pdf-worker@2026-07-24T11:15:00Z

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { invokeGated } from "../_shared/invoke-gated.ts";
import { sendEmail } from "../_shared/resend.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://www.enduserprivacy.com";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;

// Map contract.tool → generate-report-pdf tool_type.
// Mirrors qa-pdf-export.ts TOOL_SLUG_TO_PDF_TYPE plus friendlier user-side aliases.
const TOOL_TO_PDF_TYPE: Record<string, string> = {
  "cppa-admt": "cppa_admt",
  "cppa-risk": "cppa_risk",
  "cppa-cyber": "cppa_cybersecurity",
  "governance": "governance_assessment",
  "dpia": "dpia_framework",
  "lia": "li_assessment",
  "dpa": "dpa_generator",
  "dpa-generator": "dpa_generator",
  "ir": "ir_playbook",
  "ir-playbook": "ir_playbook",
  "biometric": "biometric_checker",
  "biometric-checker": "biometric_checker",
  "registration": "registration_assessment",
};

interface QueueRow {
  id: string;
  run_class: "customer" | "harness";
  tool: string;
  subject_table: string;
  subject_id: string;
  user_id: string | null;
  contract_id: string | null;
  attempts: number;
}

async function fetchUserEmail(admin: any, userId: string | null): Promise<string | null> {
  if (!userId) return null;
  const { data } = await admin.from("profiles").select("email").eq("id", userId).maybeSingle();
  return (data?.email as string | null) ?? null;
}

async function notifyUser(admin: any, row: QueueRow, pdfUrl: string) {
  const email = await fetchUserEmail(admin, row.user_id);
  const subject = "Your report is ready — PDF attached";
  const link = pdfUrl.startsWith("http") ? pdfUrl : `${APP_URL}${pdfUrl}`;
  const body = `
    <p>Your <strong>${row.tool}</strong> report finished rendering.</p>
    <p><a href="${link}" style="color:#2a9d8f;font-weight:600">Download your PDF</a> (link valid for 1 hour).</p>
    <p>You already have the on-screen report from earlier; this PDF is the same content in downloadable form.</p>
    <p style="color:#666;font-size:12px">EndUserPrivacy · this is a delivery notification, not marketing.</p>
  `;
  if (email) {
    const res = await sendEmail({ to: email, subject, html: body });
    console.log(JSON.stringify({ evt: "pdf_notify_email", queue_id: row.id, email_ok: !res.error, skipped: !!res.skipped }));
  }
  // Also record a user_events row so the dashboard can surface "PDF ready"
  // even if the email is skipped (missing RESEND_API_KEY etc.).
  try {
    await admin.from("user_events").insert({
      user_id: row.user_id,
      event_type: "pdf_ready",
      event_data: { tool: row.tool, pdf_url: link, subject_id: row.subject_id, subject_table: row.subject_table },
    });
  } catch (e) {
    console.warn("[render-pdf-worker] user_events insert failed", (e as Error).message);
  }
  await admin.from("pdf_render_queue").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
}

async function processOne(admin: any, row: QueueRow) {
  const toolType = TOOL_TO_PDF_TYPE[row.tool];
  if (!toolType) {
    await admin.from("pdf_render_queue").update({
      status: "failed",
      last_error: `no PDF renderer mapping for tool=${row.tool}`,
      attempts: row.attempts + 1,
    }).eq("id", row.id);
    return { id: row.id, ok: false, reason: "no_renderer" };
  }

  await admin.from("pdf_render_queue").update({
    status: "rendering", attempts: row.attempts + 1,
  }).eq("id", row.id);

  try {
    const inv = await invokeGated(
      "generate-report-pdf",
      { tool_type: toolType, assessment_id: row.subject_id },
      { timeoutMs: 90_000, maxBodyChars: 0 },
    );
    if (!inv.ok) throw new Error(`generate-report-pdf ${inv.status}: ${inv.body.slice(0, 200)}`);
    let pdfUrl: string | null = null;
    try { pdfUrl = JSON.parse(inv.body)?.pdf_url ?? null; } catch { /* */ }
    if (!pdfUrl) throw new Error("no pdf_url in generate-report-pdf response");

    await admin.from("pdf_render_queue").update({
      status: "done", pdf_path: pdfUrl, last_error: null,
    }).eq("id", row.id);

    // Flip paired contract to 'delivered'.
    if (row.contract_id) {
      await admin.from("delivery_contracts").update({
        terminal_state: "delivered",
        heartbeat_at: new Date().toISOString(),
      }).eq("id", row.contract_id)
        .in("terminal_state", ["delivered_html_pdf_queued", null]);
    }

    await notifyUser(admin, row, pdfUrl);
    return { id: row.id, ok: true };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 400);
    const attempts = row.attempts + 1;
    const finalFail = attempts >= MAX_ATTEMPTS;
    await admin.from("pdf_render_queue").update({
      status: finalFail ? "failed" : "pending",
      last_error: msg,
    }).eq("id", row.id);
    if (finalFail && row.contract_id) {
      await admin.from("delivery_contracts").update({
        terminal_state: "admin_escalated",
        last_error: `pdf render exhausted ${MAX_ATTEMPTS} attempts: ${msg}`,
      }).eq("id", row.contract_id).is("terminal_state", null);
    }
    return { id: row.id, ok: false, reason: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const started = Date.now();
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: rows, error } = await admin
    .from("pdf_render_queue")
    .select("id, run_class, tool, subject_table, subject_id, user_id, contract_id, attempts")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const results: unknown[] = [];
  for (const r of (rows ?? []) as QueueRow[]) {
    results.push(await processOne(admin, r));
  }

  return new Response(JSON.stringify({
    scanned: rows?.length ?? 0,
    results,
    duration_ms: Date.now() - started,
    build: "render-pdf-worker@2026-07-24T11:15:00Z",
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
