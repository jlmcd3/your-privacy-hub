// Admin-only cascade delete for RoPA sessions and individual generated documents.
// Validates the caller's JWT and confirms admin role via service-role lookup in
// public.user_roles. All deletes run with service-role to bypass per-row RLS so
// admins can clean up documents in any workspace.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type DocResource =
  | "ropa_document"
  | "us_notice_document"
  | "eu_notice_document"
  | "registration_document";

type SessionResource = "ropa_session";

type Body =
  | { type: DocResource; id: string }
  | { type: SessionResource; id: string };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "missing_auth" });

  // Validate token + load user
  const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "invalid_token" });
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: roles, error: roleErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"]);
  if (roleErr) return json(500, { error: "role_check_failed" });
  if (!roles || roles.length === 0) return json(403, { error: "not_admin" });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { error: "invalid_json" });
  }
  if (!body?.type || !body?.id) return json(400, { error: "missing_fields" });

  try {
    switch (body.type) {
      case "ropa_document":
        return await deleteRopaDocument(admin, body.id);
      case "us_notice_document":
        return await deleteSimpleDoc(admin, "us_notice_documents", "us-notices", body.id);
      case "eu_notice_document":
        return await deleteSimpleDoc(admin, "eu_notice_documents", "eu-notices", body.id);
      case "registration_document":
        return await deleteRegistrationDoc(admin, body.id);
      case "ropa_session":
        return await deleteRopaSession(admin, body.id);
      default:
        return json(400, { error: "unknown_type" });
    }
  } catch (err) {
    console.error("[admin-delete] error", err);
    return json(500, { error: err instanceof Error ? err.message : "delete_failed" });
  }
});

async function deleteSimpleDoc(
  admin: ReturnType<typeof createClient>,
  table: string,
  bucket: string,
  id: string,
) {
  const { data: row, error: selErr } = await admin
    .from(table)
    .select("id, file_path")
    .eq("id", id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!row) return json(404, { error: "not_found" });
  if (row.file_path) {
    const { error: stErr } = await admin.storage.from(bucket).remove([row.file_path]);
    if (stErr) console.warn("[admin-delete] storage warn", stErr);
  }
  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) throw error;
  return json(200, { ok: true });
}

async function deleteRopaDocument(admin: ReturnType<typeof createClient>, id: string) {
  return deleteSimpleDoc(admin, "ropa_document_versions", "ropa-documents", id);
}

async function deleteRegistrationDoc(admin: ReturnType<typeof createClient>, id: string) {
  // Registration docs store content inline (no storage bucket file).
  const { data: row, error: selErr } = await admin
    .from("registration_documents")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!row) return json(404, { error: "not_found" });
  const { error } = await admin.from("registration_documents").delete().eq("id", id);
  if (error) throw error;
  return json(200, { ok: true });
}

async function deleteRopaSession(admin: ReturnType<typeof createClient>, sessionId: string) {
  // 1. Remove stored document files (best-effort).
  const { data: docs } = await admin
    .from("ropa_document_versions")
    .select("file_path")
    .eq("session_id", sessionId);
  const paths = (docs ?? []).map((d: { file_path: string }) => d.file_path).filter(Boolean);
  if (paths.length > 0) {
    const { error: stErr } = await admin.storage.from("ropa-documents").remove(paths);
    if (stErr) console.warn("[admin-delete] ropa storage warn", stErr);
  }

  // 2. Delete child rows.
  const childTables = [
    "ropa_document_versions",
    "ropa_answers",
    "ropa_flags",
    "ropa_processing_activities",
    "ropa_noted_regulatory_updates",
  ];
  for (const t of childTables) {
    const { error } = await admin.from(t).delete().eq("session_id", sessionId);
    if (error) throw new Error(`${t}: ${error.message}`);
  }

  // 3. Refresh cycles / reminders link via source/new session ids.
  await admin
    .from("ropa_refresh_cycles")
    .delete()
    .or(`source_session_id.eq.${sessionId},new_session_id.eq.${sessionId}`);
  await admin
    .from("ropa_refresh_reminders")
    .delete()
    .eq("source_session_id", sessionId);

  // 4. The session row itself.
  const { error } = await admin.from("ropa_sessions").delete().eq("id", sessionId);
  if (error) throw error;
  return json(200, { ok: true });
}
