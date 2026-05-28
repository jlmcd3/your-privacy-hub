// track3-kickoff: thin admin-authenticated wrapper that forwards to the
// Track 3 discovery or extraction orchestrator using the server-side
// ADMIN_SECRET_TOKEN. Lets the Lovable agent / admins trigger phases
// without needing to know the admin token client-side.
//
// Auth: caller must be a logged-in user with role 'admin' (checked via
// public.has_role using the JWT-derived user id).
//
// Body: {
//   phase: "discovery" | "extraction",
//   regulator_canonical: string,
//   max_rows?: number,
//   dry_run?: boolean
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "missing bearer token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

  // Resolve user from JWT.
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "invalid token" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify admin role via service-role client (bypass RLS).
  const svc = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });
  const { data: hasAdmin, error: roleErr } = await svc.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (roleErr || !hasAdmin) {
    return new Response(JSON.stringify({ error: "forbidden: admin only" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    phase?: "discovery" | "extraction";
    regulator_canonical?: string;
    max_rows?: number;
    dry_run?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const phase = body.phase;
  if (phase !== "discovery" && phase !== "extraction") {
    return new Response(JSON.stringify({ error: "phase must be 'discovery' or 'extraction'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.regulator_canonical) {
    return new Response(JSON.stringify({ error: "regulator_canonical required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const target =
    phase === "discovery"
      ? "track3-discovery-orchestrator"
      : "track3-extract-orchestrator";

  const r = await fetch(`${SUPABASE_URL}/functions/v1/${target}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
    },
    body: JSON.stringify({
      regulator_canonical: body.regulator_canonical,
      max_rows: body.max_rows,
      dry_run: body.dry_run,
    }),
  });
  const text = await r.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  return new Response(JSON.stringify({ ok: r.ok, status: r.status, target, response: json }), {
    status: r.ok ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
