// track-geo — record a page_view with country/region derived from request
// headers. RAW IP addresses are NEVER persisted; only the resolved
// country/region codes are written to user_events.
//
// Header resolution order:
//   1) cf-ipcountry / cf-region-code   (Cloudflare edge — primary in prod)
//   2) x-vercel-ip-country / x-vercel-ip-country-region  (Vercel edge, if present)
//   3) accept-language first token country hint  (weak fallback; region left null)
//
// Anonymous callers permitted — verify_jwt is off; we treat user_id as null
// when no Authorization header is presented.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESOLVED_COUNTRY_HEADER = "cf-ipcountry"; // primary header — name recorded in action log for evidence
const RESOLVED_REGION_HEADER = "cf-region-code";

function pickCountry(h: Headers): { country: string | null; source: string | null } {
  const cf = h.get("cf-ipcountry");
  if (cf) return { country: cf.toUpperCase(), source: "cf-ipcountry" };
  const vc = h.get("x-vercel-ip-country");
  if (vc) return { country: vc.toUpperCase(), source: "x-vercel-ip-country" };
  return { country: null, source: null };
}

function pickRegion(h: Headers): string | null {
  return h.get("cf-region-code") ?? h.get("x-vercel-ip-country-region") ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  let body: {
    event_type?: string;
    page_path?: string;
    session_id?: string;
    event_data?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const event_type = typeof body.event_type === "string" && body.event_type.length > 0
    ? body.event_type
    : "page_view";
  const page_path = typeof body.page_path === "string" ? body.page_path.slice(0, 512) : null;
  const session_id = typeof body.session_id === "string" ? body.session_id.slice(0, 128) : null;
  const event_data = (body.event_data && typeof body.event_data === "object") ? body.event_data : {};

  // Optional: identify signed-in user if a bearer token was provided.
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const anon = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      const { data } = await anon.auth.getUser(authHeader.slice(7).trim());
      userId = data?.user?.id ?? null;
    } catch { /* anonymous */ }
  }

  const { country, source: countrySource } = pickCountry(req.headers);
  const region = pickRegion(req.headers);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await supabase.from("user_events").insert({
    user_id: userId,
    session_id,
    event_type,
    event_data,     // NOTE: caller controls this; we do NOT stash any IP here.
    page_path,
    country,
    region,
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    country,
    region,
    country_source_header: countrySource ?? RESOLVED_COUNTRY_HEADER,
    region_source_header: region ? RESOLVED_REGION_HEADER : null,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
