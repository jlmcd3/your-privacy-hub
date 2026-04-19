// Cron-driven renewal reminder dispatcher.
// Scans registration_filings for filings expiring in 90/60/30/7 days, and sends
// a Resend email per (order, jurisdiction, window). Idempotent — checks
// renewal_notifications to avoid duplicates.

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

const WINDOWS = [
  { days: 90, type: "renewal_reminder_90" },
  { days: 60, type: "renewal_reminder_60" },
  { days: 30, type: "renewal_reminder_30" },
  { days: 7, type: "renewal_reminder_7" },
];

function renderEmail(args: {
  jurisdiction_code: string;
  expires_at: string;
  days_until: number;
  order_id: string;
  filing_reference?: string | null;
}): string {
  const url = `https://privacy-guardian-v3.lovable.app/registration-manager/order/${args.order_id}`;
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="margin:0 0 16px">Registration renewal due in ${args.days_until} days</h2>
  <p>Your data protection registration in <strong>${args.jurisdiction_code}</strong> expires on <strong>${new Date(args.expires_at).toDateString()}</strong>.</p>
  ${args.filing_reference ? `<p>Filing reference: <code>${args.filing_reference}</code></p>` : ""}
  <p>Open your order to regenerate the renewal documents and submit them to the authority:</p>
  <p><a href="${url}" style="display:inline-block;background:#0f172a;color:#fff;padding:10px 16px;text-decoration:none;border-radius:6px">Open registration order</a></p>
  <p style="color:#64748b;font-size:12px;margin-top:32px">EndUserPrivacy — automated renewal reminder.</p>
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stats = { scanned: 0, sent: 0, skipped: 0, errors: 0 };
  try {
    for (const w of WINDOWS) {
      const target = new Date();
      target.setDate(target.getDate() + w.days);
      const dayStart = new Date(target.toDateString()).toISOString();
      const dayEnd = new Date(new Date(target.toDateString()).getTime() + 86400000).toISOString();

      const { data: filings, error } = await supabase
        .from("registration_filings")
        .select("id,order_id,jurisdiction_code,expires_at,filing_reference")
        .gte("expires_at", dayStart)
        .lt("expires_at", dayEnd);
      if (error) throw error;

      for (const f of filings || []) {
        stats.scanned++;
        // Already notified for this window?
        const { data: existing } = await supabase
          .from("renewal_notifications")
          .select("id")
          .eq("filing_id", f.id)
          .eq("notification_type", w.type)
          .maybeSingle();
        if (existing) {
          stats.skipped++;
          continue;
        }

        // Look up recipient via order → user → auth.users
        const { data: order } = await supabase
          .from("registration_orders")
          .select("user_id,organization_snapshot")
          .eq("id", f.order_id)
          .single();
        if (!order?.user_id) { stats.skipped++; continue; }

        const { data: { user } } = await supabase.auth.admin.getUserById(order.user_id);
        const recipient = (order.organization_snapshot as any)?.contact_email || user?.email;
        if (!recipient) { stats.skipped++; continue; }

        const result = await sendEmail({
          to: recipient,
          subject: `Renewal due in ${w.days} days — ${f.jurisdiction_code} registration`,
          html: renderEmail({
            jurisdiction_code: f.jurisdiction_code,
            expires_at: f.expires_at!,
            days_until: w.days,
            order_id: f.order_id,
            filing_reference: f.filing_reference,
          }),
          tags: [{ name: "category", value: "renewal_reminder" }, { name: "window_days", value: String(w.days) }],
        });

        await supabase.from("renewal_notifications").insert({
          order_id: f.order_id,
          filing_id: f.id,
          notification_type: w.type,
          recipient_email: recipient,
          delivery_status: result.skipped ? "skipped_no_provider" : result.error ? "failed" : "sent",
        });

        if (result.error) stats.errors++;
        else stats.sent++;
      }
    }

    return new Response(JSON.stringify({ ok: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-renewal-reminders error", e);
    return new Response(JSON.stringify({ error: (e as Error).message, stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
