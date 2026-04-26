// Resend gateway helper.
// Architected so that adding RESEND_API_KEY later is the ONLY change required —
// no code edits needed. While the key is missing, sendEmail() logs a warning
// and returns { skipped: true } instead of throwing, so cron jobs keep running.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export interface SendEmailArgs {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export async function sendEmail(args: SendEmailArgs): Promise<{ id?: string; skipped?: boolean; error?: string }> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  if (!resendKey) {
    console.warn("[resend] RESEND_API_KEY not set — skipping email", {
      to: args.to,
      subject: args.subject,
    });
    return { skipped: true };
  }
  if (!lovableKey) {
    return { skipped: true, error: "LOVABLE_API_KEY missing" };
  }

  const from = args.from || "Your Privacy Hub <brief@yourprivacyhub.com>";

  const resp = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(args.to) ? args.to : [args.to],
      subject: args.subject,
      html: args.html,
      ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      ...(args.tags ? { tags: args.tags } : {}),
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("[resend] send failed", resp.status, txt);
    return { error: `Resend ${resp.status}: ${txt}` };
  }
  const data = await resp.json().catch(() => ({}));
  return { id: data.id };
}
