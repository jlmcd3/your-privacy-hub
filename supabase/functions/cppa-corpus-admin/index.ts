// Admin CRUD for cppa_authorities, cppa_deadlines, cppa_corpus_settings,
// cppa_ingestion_log. Requires admin role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function getAdminUser(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  if (!token) return null;
  const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } } = await tmp.auth.getUser(token);
  if (!user) return null;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) return null;
  return user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const user = await getAdminUser(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "";
  let body: any = {};
  if (req.method !== "GET") {
    try { body = await req.json(); } catch { /* ignore */ }
  }

  try {
    switch (action) {
      case "list_authorities": {
        const status = url.searchParams.get("status");
        const verified = url.searchParams.get("verified"); // "true" | "false" | null
        const authType = url.searchParams.get("authority_type");
        const topic = url.searchParams.get("topic");
        let q = admin.from("cppa_authorities").select("*").order("citation");
        if (status) q = q.eq("status", status);
        if (authType) q = q.eq("authority_type", authType);
        if (verified === "true") q = q.not("verified_by", "is", null);
        if (verified === "false") q = q.is("verified_by", null);
        if (topic) q = q.contains("topics", [topic]);
        const { data, error } = await q.limit(500);
        if (error) throw error;

        const { count: total } = await admin
          .from("cppa_authorities")
          .select("*", { count: "exact", head: true })
          .eq("status", "current");
        const { count: verifiedCount } = await admin
          .from("cppa_authorities")
          .select("*", { count: "exact", head: true })
          .eq("status", "current")
          .not("verified_by", "is", null);
        return json({ rows: data, counts: { total, verified: verifiedCount } });
      }

      case "update_authority": {
        const { id, title, plain_summary, topics } = body;
        if (!id) return json({ error: "id required" }, 400);
        const patch: any = { updated_at: new Date().toISOString() };
        if (typeof title === "string") patch.title = title;
        if (typeof plain_summary === "string") patch.plain_summary = plain_summary;
        if (Array.isArray(topics)) patch.topics = topics;
        const { data, error } = await admin
          .from("cppa_authorities").update(patch).eq("id", id).select().single();
        if (error) throw error;
        return json({ row: data });
      }

      case "verify_authority": {
        const { id } = body;
        if (!id) return json({ error: "id required" }, 400);
        const { data, error } = await admin
          .from("cppa_authorities")
          .update({
            verified_by: user.email ?? user.id,
            verified_at: new Date().toISOString().slice(0, 10),
          })
          .eq("id", id).select().single();
        if (error) throw error;
        return json({ row: data });
      }

      case "quarantine_authority": {
        const { id } = body;
        if (!id) return json({ error: "id required" }, 400);
        const { data, error } = await admin
          .from("cppa_authorities")
          .update({ status: "quarantined" })
          .eq("id", id).select().single();
        if (error) throw error;
        return json({ row: data });
      }

      case "list_deadlines": {
        const { data, error } = await admin
          .from("cppa_deadlines").select("*").order("compliance_deadline", { ascending: true });
        if (error) throw error;
        // Also surface deadline_text suggestions from ingestion log
        const { data: suggestions } = await admin
          .from("cppa_ingestion_log")
          .select("citation, details, created_at")
          .not("details->>deadline_text", "is", null)
          .order("created_at", { ascending: false })
          .limit(50);
        return json({ rows: data, suggestions: suggestions ?? [] });
      }

      case "upsert_deadline": {
        const { id, ...rest } = body;
        rest.updated_at = new Date().toISOString();
        let res;
        if (id) {
          res = await admin.from("cppa_deadlines").update(rest).eq("id", id).select().single();
        } else {
          res = await admin.from("cppa_deadlines").insert(rest).select().single();
        }
        if (res.error) throw res.error;
        return json({ row: res.data });
      }

      case "verify_deadline": {
        const { id } = body;
        if (!id) return json({ error: "id required" }, 400);
        const { data, error } = await admin
          .from("cppa_deadlines")
          .update({
            verified_by: user.email ?? user.id,
            verified_at: new Date().toISOString().slice(0, 10),
          })
          .eq("id", id).select().single();
        if (error) throw error;
        return json({ row: data });
      }

      case "delete_deadline": {
        const { id } = body;
        if (!id) return json({ error: "id required" }, 400);
        const { error } = await admin.from("cppa_deadlines").delete().eq("id", id);
        if (error) throw error;
        return json({ success: true });
      }

      case "list_ingestion_log": {
        const { data, error } = await admin
          .from("cppa_ingestion_log").select("*")
          .order("created_at", { ascending: false }).limit(200);
        if (error) throw error;
        return json({ rows: data });
      }

      case "get_settings": {
        const { data, error } = await admin
          .from("cppa_corpus_settings").select("*").eq("id", 1).single();
        if (error) throw error;
        return json({ settings: data });
      }

      case "update_settings": {
        const patch: any = { updated_at: new Date().toISOString() };
        if (typeof body.verified_only_mode === "boolean") patch.verified_only_mode = body.verified_only_mode;
        if (typeof body.corpus_marked_complete === "boolean") patch.corpus_marked_complete = body.corpus_marked_complete;
        const { data, error } = await admin
          .from("cppa_corpus_settings").update(patch).eq("id", 1).select().single();
        if (error) throw error;
        return json({ settings: data });
      }

      default:
        return json({ error: "unknown action" }, 400);
    }
  } catch (e) {
    console.error("cppa-corpus-admin error:", e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
