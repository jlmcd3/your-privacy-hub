// activate-us-state-law
// Operational tool to activate a previously-pending US state privacy law.
//
// Performs:
//   STEP 1 — Updates `us_state_privacy_laws` to flip the state to active and
//            set the official law metadata.
//   STEP 3 — Notifies clients with existing US notices about the new law,
//            rate-limited to one notification per (client, state) via the
//            `us_state_law_notifications` table.
//
// Step 2 (adding question addons) is a code change in
// `src/data/us-notice-questions/virginia-model-questions.ts` —
// see `VIRGINIA_MODEL_STATE_ADDONS`.
//
// Auth: requires header `x-admin-token: ${ADMIN_SECRET_TOKEN}` since this is
// an internal/operational endpoint, not user-facing.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmail } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

interface ActivateBody {
  state_code: string;
  effective_date: string; // YYYY-MM-DD
  law_name: string;
  framework_type?: "ccpa" | "virginia_model" | "maryland" | "florida";
  applicability_threshold?: string;
  enforcement_body?: string;
  enforcement_url?: string;
  notify?: boolean; // default true
  dry_run?: boolean; // default false
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildEmailHtml(args: {
  stateName: string;
  lawName: string;
  effectiveDate: string;
  threshold?: string;
  updateUrl: string;
}) {
  const { stateName, lawName, effectiveDate, threshold, updateUrl } = args;
  return `<!doctype html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px;line-height:1.55">
  <h2 style="margin:0 0 16px;font-size:20px">${stateName} privacy law is now active</h2>
  <p>The <strong>${lawName}</strong> takes effect on <strong>${effectiveDate}</strong>.</p>
  ${threshold ? `<p><strong>Applicability:</strong> ${threshold}</p>` : ""}
  <p>If you process personal data of ${stateName} residents above the applicability threshold, your existing US privacy notices may need updates to reflect ${stateName}-specific obligations.</p>
  <p style="margin:24px 0">
    <a href="${updateUrl}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600">Update your notices →</a>
  </p>
  <p style="color:#666;font-size:13px;margin-top:32px">You're receiving this because you have an existing US Privacy Notice on EndUserPrivacy. We send at most one alert per newly-activated state law.</p>
</body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  // Admin auth
  const adminToken = Deno.env.get("ADMIN_SECRET_TOKEN");
  if (!adminToken) return json(500, { error: "ADMIN_SECRET_TOKEN not configured" });
  if (req.headers.get("x-admin-token") !== adminToken) {
    return json(401, { error: "Unauthorized" });
  }

  let body: ActivateBody;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  // Minimal validation
  if (!body.state_code || !/^[A-Z]{2}$/.test(body.state_code)) {
    return json(400, { error: "state_code must be a 2-letter uppercase US code" });
  }
  if (!body.effective_date || !/^\d{4}-\d{2}-\d{2}$/.test(body.effective_date)) {
    return json(400, { error: "effective_date must be YYYY-MM-DD" });
  }
  if (!body.law_name || body.law_name.trim().length < 3) {
    return json(400, { error: "law_name is required" });
  }
  const frameworkType = body.framework_type ?? "virginia_model";
  if (!["ccpa", "virginia_model", "maryland", "florida"].includes(frameworkType)) {
    return json(400, { error: "framework_type invalid" });
  }
  const notify = body.notify !== false;
  const dryRun = body.dry_run === true;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // STEP 1 — Activate the state.
  const { data: existing, error: fetchErr } = await supabase
    .from("us_state_privacy_laws")
    .select("state_code, state_name, is_active, framework_type")
    .eq("state_code", body.state_code)
    .maybeSingle();

  if (fetchErr) return json(500, { error: `Lookup failed: ${fetchErr.message}` });
  if (!existing) return json(404, { error: `Unknown state_code: ${body.state_code}` });

  const wasAlreadyActive = existing.is_active === true;
  const stateName = existing.state_name;

  if (!dryRun) {
    const { error: updateErr } = await supabase
      .from("us_state_privacy_laws")
      .update({
        is_active: true,
        effective_date: body.effective_date,
        law_name: body.law_name,
        framework_type: frameworkType,
        ...(body.applicability_threshold ? { applicability_threshold: body.applicability_threshold } : {}),
        ...(body.enforcement_body ? { enforcement_body: body.enforcement_body } : {}),
        ...(body.enforcement_url ? { enforcement_url: body.enforcement_url } : {}),
      })
      .eq("state_code", body.state_code);
    if (updateErr) return json(500, { error: `Activation failed: ${updateErr.message}` });
  }

  // STEP 3 — Notify clients with existing US notices.
  const notificationsResult: {
    candidates: number;
    sent: number;
    skipped_already_notified: number;
    skipped_no_email: number;
    failed: number;
    errors: Array<{ client_id: string; error: string }>;
  } = {
    candidates: 0,
    sent: 0,
    skipped_already_notified: 0,
    skipped_no_email: 0,
    failed: 0,
    errors: [],
  };

  if (notify) {
    // Identify candidate clients: those with at least one US notice session.
    // (Cross-referencing notice content for "significant data in the new state"
    // would require richer signal than we currently store — we conservatively
    // notify all clients with US notices and let them decide if they're in scope.)
    const { data: sessions, error: sessErr } = await supabase
      .from("us_notice_sessions")
      .select("client_id");
    if (sessErr) return json(500, { error: `Session lookup failed: ${sessErr.message}` });

    const clientIds = Array.from(new Set((sessions ?? []).map((s) => s.client_id)));
    notificationsResult.candidates = clientIds.length;

    if (clientIds.length > 0) {
      const { data: clients, error: clientsErr } = await supabase
        .from("clients")
        .select("id, owner_id")
        .in("id", clientIds);
      if (clientsErr) return json(500, { error: `Client lookup failed: ${clientsErr.message}` });

      // Already-notified set.
      const { data: alreadyNotified, error: notifErr } = await supabase
        .from("us_state_law_notifications")
        .select("client_id")
        .eq("state_code", body.state_code);
      if (notifErr) return json(500, { error: `Notification log lookup failed: ${notifErr.message}` });
      const notifiedSet = new Set((alreadyNotified ?? []).map((n) => n.client_id));

      // Resolve owner emails via the auth admin API (one batch call).
      const ownerIds = Array.from(
        new Set((clients ?? []).map((c) => c.owner_id).filter(Boolean)),
      );
      const ownerEmail = new Map<string, string>();
      // Page through users until we cover all needed owners (typical projects: small).
      let page = 1;
      while (ownerIds.length > ownerEmail.size) {
        const { data: usersPage, error: usersErr } = await supabase.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (usersErr) {
          console.error("[activate-us-state-law] listUsers failed", usersErr);
          break;
        }
        if (!usersPage?.users || usersPage.users.length === 0) break;
        for (const u of usersPage.users) {
          if (u.email && ownerIds.includes(u.id)) ownerEmail.set(u.id, u.email);
        }
        if (usersPage.users.length < 1000) break;
        page++;
        if (page > 20) break; // safety
      }

      const updateUrl = `https://enduserprivacy.com/us-notices`;

      for (const client of clients ?? []) {
        if (notifiedSet.has(client.id)) {
          notificationsResult.skipped_already_notified++;
          continue;
        }
        const email = ownerEmail.get(client.owner_id);
        if (!email) {
          notificationsResult.skipped_no_email++;
          continue;
        }

        if (dryRun) {
          notificationsResult.sent++;
          continue;
        }

        const html = buildEmailHtml({
          stateName,
          lawName: body.law_name,
          effectiveDate: body.effective_date,
          threshold: body.applicability_threshold,
          updateUrl,
        });

        const result = await sendEmail({
          to: email,
          subject: `${stateName} privacy law is now active — your notices may need updating`,
          html,
          tags: [
            { name: "type", value: "state_law_activation" },
            { name: "state", value: body.state_code },
          ],
        });

        if (result.error) {
          notificationsResult.failed++;
          notificationsResult.errors.push({ client_id: client.id, error: result.error });
          // Log failed attempt so we don't retry repeatedly on the same broken address.
          await supabase.from("us_state_law_notifications").insert({
            client_id: client.id,
            state_code: body.state_code,
            user_id: client.owner_id,
            recipient_email: email,
            delivery_status: "failed",
            error: result.error,
          });
          continue;
        }

        // Skipped (no RESEND_API_KEY) or sent — record either way to honour rate limit.
        await supabase.from("us_state_law_notifications").insert({
          client_id: client.id,
          state_code: body.state_code,
          user_id: client.owner_id,
          recipient_email: email,
          delivery_status: result.skipped ? "skipped" : "sent",
          resend_message_id: result.id ?? null,
        });
        notificationsResult.sent++;
      }
    }
  }

  return json(200, {
    ok: true,
    dry_run: dryRun,
    state_code: body.state_code,
    state_name: stateName,
    was_already_active: wasAlreadyActive,
    activated: !dryRun,
    notifications: notify ? notificationsResult : { skipped: true },
  });
});
