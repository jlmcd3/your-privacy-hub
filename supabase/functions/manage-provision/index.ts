// RC-B B5 — admin CRUD for provision_texts. Approve = paste excerpt + plain requirements.
// Action-logged. Admin-only via has_role(_uid, 'admin').
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { writeActionLog } from "../_shared/write-action-log.ts";
import { seedProvisionRegistry } from "../_shared/provision-store.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return json({ error: "unauthenticated" }, 401);
  const anonClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await anonClient.auth.getUser();
  if (userErr || !userData.user) return json({ error: "unauthenticated" }, 401);
  const uid = userData.user.id;
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: uid, _role: "admin" });
  if (!isAdmin) return json({ error: "forbidden" }, 403);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }
  const action = String(body?.action ?? "");

  if (action === "seed") {
    const r = await seedProvisionRegistry(supabase);
    await writeActionLog(supabase, { actor_user_id: uid, action: "provision_seed", target_table: "provision_texts", target_id: null, payload: {}, result: r, ok: true });
    return json({ ok: true, ...r });
  }

  if (action === "list") {
    const status = body?.status ? { status: body.status } : {};
    const q = supabase.from("provision_texts").select("*").order("key");
    const { data, error } = status.status ? await q.eq("status", status.status) : await q;
    if (error) return json({ error: error.message }, 500);
    return json({ items: data ?? [] });
  }

  if (action === "approve") {
    const key = String(body?.key ?? "");
    const excerpt = String(body?.verbatim_excerpt ?? "");
    const plain = Array.isArray(body?.plain_requirements) ? body.plain_requirements : [];
    if (!key || !excerpt.trim()) return json({ error: "key_and_excerpt_required" }, 400);
    const { error } = await supabase.from("provision_texts").update({
      verbatim_excerpt: excerpt,
      plain_requirements: plain,
      status: "approved",
      approved_by: uid,
      last_verified_at: new Date().toISOString(),
    }).eq("key", key);
    if (error) return json({ error: error.message }, 500);
    await writeActionLog(supabase, { actor_user_id: uid, action: "provision_approved", target_table: "provision_texts", target_id: null, payload: { key }, ok: true });
    return json({ ok: true });
  }

  if (action === "upsert") {
    const row = body?.row ?? {};
    if (!row?.key || !row?.citation) return json({ error: "key_and_citation_required" }, 400);
    const { error } = await supabase.from("provision_texts").upsert(row, { onConflict: "key" });
    if (error) return json({ error: error.message }, 500);
    await writeActionLog(supabase, { actor_user_id: uid, action: "provision_upsert", target_table: "provision_texts", target_id: null, payload: { key: row.key }, ok: true });
    return json({ ok: true });
  }

  return json({ error: "unknown_action" }, 400);
});
