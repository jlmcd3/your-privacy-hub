// build-sample-preview — admin-guarded publish-time step that computes the
// truncated public preview of a published sample report.
//
// Approved scope 2026-09-04 ("Truncated Sample Documents"): the public
// /samples pages read `sample_reports_public`, which exposes ONLY the
// preview columns this function writes. Rows without a preview render the
// fail-closed state, so the withheld content can never leak by omission.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPreviewForRow } from "../_shared/sample-preview-build.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const buildForRow = (admin: ReturnType<typeof createClient>, id: string) =>
  buildPreviewForRow(admin, id);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Same authorization contract as save-sample-report: shared admin token or
  // an authenticated user holding the `admin` app_role.
  const headerToken = req.headers.get("x-admin-token") ?? "";
  let authorized = Boolean(ADMIN_TOKEN) && headerToken === ADMIN_TOKEN;
  if (!authorized) {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader.startsWith("Bearer ")) {
      try {
        const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const token = authHeader.replace("Bearer ", "");
        const { data: claims } = await userClient.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (userId) {
          const probe = createClient(SUPABASE_URL, SERVICE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: role } = await probe
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .eq("role", "admin")
            .maybeSingle();
          if (role) authorized = true;
        }
      } catch { /* fall through */ }
    }
  }
  if (!authorized) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* optional */ }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const id = typeof body.id === "string" ? body.id : null;
    if (id) return json({ ok: true, results: [await buildForRow(admin, id)] });

    // No id → rebuild every published row.
    const { data: rows, error } = await admin
      .from("sample_reports")
      .select("id")
      .eq("status", "published");
    if (error) throw new Error(error.message);

    const results: unknown[] = [];
    const failures: unknown[] = [];
    for (const row of (rows ?? []) as { id: string }[]) {
      try {
        results.push(await buildForRow(admin, row.id));
      } catch (e) {
        failures.push({ id: row.id, error: (e as Error).message });
      }
    }
    return json({ ok: failures.length === 0, results, failures });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
