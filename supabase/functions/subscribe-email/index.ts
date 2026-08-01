// subscribe-email — public email capture.
// Hardened 2026-07-10: origin-reflecting CORS, per-IP fixed-window rate limit
// (10 req / 10 min), first-party honeypot ("company_website"), stricter email
// validation. No third-party CAPTCHA. Logs are id/count only (no PII).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeadersFor, corsPreflight } from "./_local/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for") ?? "";
  const first = xff.split(",")[0]?.trim();
  return first || req.headers.get("cf-connecting-ip") || "unknown";
}

Deno.serve(async (req) => {
  const pf = corsPreflight(req);
  if (pf) return pf;
  const cors = corsHeadersFor(req);
  const jsonHeaders = { ...cors, "Content-Type": "application/json" };

  try {
    const body = await req.json().catch(() => ({}));
    const { email, source, company_website } = body ?? {};

    // Honeypot — bots fill hidden fields, humans never see them.
    if (typeof company_website === "string" && company_website.length > 0) {
      // Return success to avoid signaling the trap; do nothing.
      return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
    }

    // Stricter email validation
    if (
      !email ||
      typeof email !== "string" ||
      email.length > 255 ||
      !EMAIL_RE.test(email)
    ) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    // Source validation (optional, alphanumerics + dashes/underscores, ≤64 chars)
    let safeSource = "website";
    if (source !== undefined && source !== null) {
      if (
        typeof source !== "string" ||
        source.length > 64 ||
        !/^[a-zA-Z0-9_-]+$/.test(source)
      ) {
        return new Response(JSON.stringify({ error: "Invalid source" }), {
          status: 400,
          headers: jsonHeaders,
        });
      }
      safeSource = source;
    }

    // Per-IP rate limit: 10 requests per 10 minutes.
    const ip = clientIp(req);
    const { data: allowed, error: rlErr } = await supabase.rpc("consume_rate_limit", {
      _key: `subscribe-email:${ip}`,
      _window_seconds: 600,
      _max: 10,
    });
    if (rlErr) {
      console.error("rate-limit rpc failed:", rlErr.message);
    } else if (allowed === false) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: jsonHeaders,
      });
    }

    const { error } = await supabase
      .from("email_signups")
      .insert({
        email: email.toLowerCase().trim(),
        confirmed: false,
        source: safeSource,
      });

    if (error) {
      if (error.code === "23505") {
        return new Response(JSON.stringify({ error: "already_subscribed" }), {
          status: 409,
          headers: jsonHeaders,
        });
      }
      throw error;
    }

    return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
  } catch (e: any) {
    // Log only error class, never email/PII.
    console.error("subscribe-email error:", e?.name ?? "unknown");
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
