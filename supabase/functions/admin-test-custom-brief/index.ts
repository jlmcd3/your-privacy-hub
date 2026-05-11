// Admin-only wrapper around generate-custom-brief used exclusively by the
// /admin/test-brief page. Verifies the caller is an admin, ensures the
// caller's profile is_pro=true (restoring afterwards), upserts brief
// preferences for the caller, and invokes generate-custom-brief with the
// service-side ADMIN_SECRET_TOKEN.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    if (!ADMIN_SECRET) {
      return new Response(
        JSON.stringify({ error: "ADMIN_SECRET_TOKEN not set on server" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── 1. Validate caller via JWT (must be authenticated admin) ────────────
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Read prefs from body ─────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const prefs = body?.prefs || {};
    const industries: string[] = Array.isArray(prefs.industries)
      ? prefs.industries
      : [];
    const jurisdictions: string[] = Array.isArray(prefs.jurisdictions)
      ? prefs.jurisdictions
      : [];
    const topics: string[] = Array.isArray(prefs.topics) ? prefs.topics : [];
    const format: string = typeof prefs.format === "string" ? prefs.format : "full";

    // ── 3. Upsert user_brief_preferences ────────────────────────────────────
    const { error: prefsErr } = await admin
      .from("user_brief_preferences")
      .upsert(
        {
          user_id: userId,
          industries,
          jurisdictions,
          topics,
          format,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    if (prefsErr) throw new Error(`prefs upsert: ${prefsErr.message}`);

    // ── 4. Ensure is_pro=true (record original to restore) ──────────────────
    const { data: prof } = await admin
      .from("profiles")
      .select("is_pro")
      .eq("id", userId)
      .single();
    const wasPro = !!prof?.is_pro;
    if (!wasPro) {
      await admin.from("profiles").update({ is_pro: true }).eq("id", userId);
    }

    // ── 5. Note baseline custom_briefs count BEFORE invoking ────────────────
    const beforeIso = new Date().toISOString();

    // ── 6. Invoke generate-custom-brief with admin token ────────────────────
    let invokeOk = false;
    let invokeError: string | null = null;
    let processed = 0;
    try {
      const resp = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-custom-brief`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ADMIN_SECRET}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: userId }),
        }
      );
      const txt = await resp.text();
      if (!resp.ok) {
        invokeError = `generate-custom-brief ${resp.status}: ${txt.slice(0, 500)}`;
      } else {
        invokeOk = true;
        try {
          processed = JSON.parse(txt).processed ?? 0;
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      invokeError = (e as Error).message;
    }

    // ── 7. Restore is_pro if we toggled it ──────────────────────────────────
    if (!wasPro) {
      await admin.from("profiles").update({ is_pro: false }).eq("id", userId);
    }

    // ── 8. Find the new custom_brief row, if any ────────────────────────────
    const { data: newRow } = await admin
      .from("custom_briefs")
      .select("id, custom_sections, generated_at, generation_model, articles_used")
      .eq("user_id", userId)
      .gt("generated_at", beforeIso)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        ok: invokeOk,
        processed,
        invokeError,
        custom_brief: newRow,
      }),
      {
        status: invokeOk ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("admin-test-custom-brief error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
