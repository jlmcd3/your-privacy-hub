// harness-delete — deletes a row created by /admin/tests-realworld.
// Whitelisted tables only. Caller must be admin/moderator AND own the
// matching harness_artifacts row. Supports two modes:
//   { artifact_id }                 — delete one ledger row + its target
//   { delete_all: true }            — delete every harness row for the caller
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Tables the harness is allowed to write/delete. Keep in sync with runners.
const ALLOWED_TABLES = new Set<string>([
  "li_assessments",
  "dpia_frameworks",
  "governance_assessments",
  "biometric_assessments",
  "dpa_documents",
  "ir_playbooks",
  "custom_briefs",
]);

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "missing_jwt" });

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: "invalid_jwt" });
  const userId = userData.user.id;

  // Admin check via has_role
  const { data: isAdminData } = await userClient.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  const { data: isModData } = await userClient.rpc("has_role", {
    _user_id: userId,
    _role: "moderator",
  });
  if (!isAdminData && !isModData) return json(403, { error: "forbidden" });

  let body: { artifact_id?: string; delete_all?: boolean } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const admin = createClient(url, service);

  // Pull the ledger rows we'll delete.
  let ledgerRows: { id: string; target_table: string; target_id: string }[] = [];
  if (body.delete_all) {
    const { data, error } = await admin
      .from("harness_artifacts")
      .select("id, target_table, target_id")
      .eq("admin_user_id", userId);
    if (error) return json(500, { error: error.message });
    ledgerRows = data || [];
  } else if (body.artifact_id) {
    const { data, error } = await admin
      .from("harness_artifacts")
      .select("id, target_table, target_id")
      .eq("admin_user_id", userId)
      .eq("id", body.artifact_id)
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    if (!data) return json(404, { error: "artifact_not_found" });
    ledgerRows = [data];
  } else {
    return json(400, { error: "missing_artifact_id_or_delete_all" });
  }

  const results: { id: string; target_table: string; target_id: string; ok: boolean; error?: string }[] = [];
  for (const row of ledgerRows) {
    if (!ALLOWED_TABLES.has(row.target_table)) {
      results.push({ ...row, ok: false, error: "table_not_whitelisted" });
      continue;
    }
    const { error: delErr } = await admin
      .from(row.target_table)
      .delete()
      .eq("id", row.target_id);
    if (delErr) {
      results.push({ ...row, ok: false, error: delErr.message });
      continue;
    }
    await admin.from("harness_artifacts").delete().eq("id", row.id);
    results.push({ ...row, ok: true });
  }

  return json(200, { deleted: results.filter(r => r.ok).length, results });
});
