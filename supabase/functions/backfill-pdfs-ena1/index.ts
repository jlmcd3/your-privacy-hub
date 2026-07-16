// ENA-1 task 3 — one-shot admin backfill: iterate completed governance/li/dpia
// rows missing pdf_url and invoke generate-report-pdf via invokeGated. Throttled,
// returns per-attempt result. Admin-JWT gated.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { invokeGated } from "../_shared/invoke-gated.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const SPECS = [
  { table: "governance_assessments", tool_type: "governance_assessment" },
  { table: "li_assessments",         tool_type: "li_assessment" },
  { table: "dpia_frameworks",        tool_type: "dpia_framework" },
];

async function sleep(ms: number) { await new Promise(r => setTimeout(r, ms)); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Admin gate
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
  const isSR = token === SERVICE_KEY;
  if (!isSR) {
    const uc = createClient(SUPABASE_URL, ANON_KEY);
    const { data: claims } = await uc.auth.getClaims(token);
    const uid = claims?.claims?.sub as string | undefined;
    if (!uid) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
    const { data: isAdm } = await admin.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdm) return new Response(JSON.stringify({ error: "admin_only" }), { status: 403, headers: cors });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Number(body?.limit) || 300, 300);
  const concurrency = Math.min(Math.max(Number(body?.concurrency) || 3, 1), 5);
  const delayMs = Math.max(Number(body?.delay_ms) || 500, 0);

  const results: any[] = [];
  const summary: Record<string, { attempted: number; succeeded: number; failed: number; failure_ids: string[] }> = {};

  for (const spec of SPECS) {
    summary[spec.table] = { attempted: 0, succeeded: 0, failed: 0, failure_ids: [] };
    const { data: rows } = await admin.from(spec.table)
      .select("id").eq("status", "complete").is("pdf_url", null).limit(limit);
    const ids: string[] = (rows ?? []).map((r: any) => r.id);

    // Process with limited concurrency
    let i = 0;
    async function worker() {
      while (i < ids.length) {
        const idx = i++;
        const id = ids[idx];
        summary[spec.table].attempted++;
        const res = await invokeGated("generate-report-pdf", {
          tool_type: spec.tool_type, assessment_id: id,
        }, { timeoutMs: 120_000 });
        if (res.ok) {
          summary[spec.table].succeeded++;
          results.push({ table: spec.table, id, status: res.status, ok: true });
        } else {
          summary[spec.table].failed++;
          summary[spec.table].failure_ids.push(id);
          results.push({ table: spec.table, id, status: res.status, ok: false, body: res.body?.slice(0, 200), error: res.error });
        }
        if (delayMs) await sleep(delayMs);
      }
    }
    await Promise.all(Array.from({ length: concurrency }, () => worker()));
  }

  return new Response(JSON.stringify({ ok: true, summary, count: results.length, results }, null, 2), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
