// save-sample-report — admin-guarded backend for the sample-reports curation
// flow. Actions: snapshot · set_status · attach_pdf · list.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

// Map source_table → primary text column (if any) on that table.
const TEXT_COL_BY_TABLE: Record<string, string | null> = {
  li_assessments: null,
  dpia_frameworks: null,
  governance_assessments: null,
  cppa_assessments: null,
  dpa_documents: "document_text",
  ir_playbooks: "playbook_text",
  biometric_assessments: "analysis_text",
  // RoPA + notices are file-driven; no canonical text column to copy.
  ropa_document_versions: null,
  us_notice_sessions: null,
  eu_notice_sessions: null,
};

async function snapshot(admin: ReturnType<typeof createClient>, body: any) {
  const {
    tool_slug, variant, title, scenario_summary, fixture,
    source_table, source_row_id,
  } = body ?? {};
  if (!tool_slug || !variant || !title || !source_table || !source_row_id) {
    return json({ error: "missing required fields" }, 400);
  }

  const textCol = TEXT_COL_BY_TABLE[source_table] ?? null;
  const cols = ["report_data"];
  if (textCol) cols.push(textCol);
  const { data: src, error: srcErr } = await admin
    .from(source_table)
    .select(cols.join(","))
    .eq("id", source_row_id)
    .maybeSingle();
  if (srcErr) return json({ error: `source: ${srcErr.message}` }, 400);

  const reportData = (src as any)?.report_data ?? null;
  const documentText = textCol ? ((src as any)?.[textCol] ?? null) : null;
  const verification = reportData?.verification ?? null;

  const payload = {
    tool_slug, variant, title, scenario_summary,
    fixture: fixture ?? {},
    source_table, source_row_id,
    report_data: reportData,
    document_text: documentText,
    verification,
    status: "draft",
    updated_at: new Date().toISOString(),
  };

  const { data: row, error } = await admin
    .from("sample_reports")
    .upsert(payload, { onConflict: "tool_slug,variant" })
    .select()
    .single();
  if (error) return json({ error: `upsert: ${error.message}` }, 400);
  return json({ row });
}

async function setStatus(admin: ReturnType<typeof createClient>, body: any) {
  const { id, status } = body ?? {};
  if (!id || !["draft", "approved", "published"].includes(status)) {
    return json({ error: "invalid status" }, 400);
  }
  if (status === "published") {
    const { data: cur } = await admin
      .from("sample_reports")
      .select("verification")
      .eq("id", id)
      .maybeSingle();
    if (!cur?.verification) {
      return json(
        { error: "Cannot publish: sample has no verification record. Re-snapshot from a generator run that produced report_data.verification, or accept that this sample stays unpublished." },
        400,
      );
    }
  }
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "published") patch.published_at = new Date().toISOString();
  const { data, error } = await admin.from("sample_reports").update(patch).eq("id", id).select().single();
  if (error) return json({ error: error.message }, 400);
  return json({ row: data });
}

async function attachPdf(admin: ReturnType<typeof createClient>, body: any) {
  const { id, filename, base64 } = body ?? {};
  if (!id || !base64) return json({ error: "missing id or base64" }, 400);
  const { data: row } = await admin
    .from("sample_reports")
    .select("tool_slug, variant")
    .eq("id", id)
    .maybeSingle();
  if (!row) return json({ error: "sample not found" }, 404);

  const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const path = `${row.tool_slug}/${row.variant}.pdf`;
  const { error: upErr } = await admin.storage.from("sample-reports").upload(path, bin, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) return json({ error: `upload: ${upErr.message}` }, 400);

  const { data, error } = await admin
    .from("sample_reports")
    .update({ pdf_path: path, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ row: data, filename });
}

async function list(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin
    .from("sample_reports")
    .select("id, tool_slug, variant, title, status, source_row_id, source_table, verification, pdf_path, updated_at")
    .order("tool_slug", { ascending: true })
    .order("variant", { ascending: true });
  if (error) return json({ error: error.message }, 400);
  return json({ rows: data ?? [] });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const headerToken = req.headers.get("x-admin-token") ?? "";
  if (!ADMIN_TOKEN || headerToken !== ADMIN_TOKEN) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* may be empty for list */ }
  const action = body?.action ?? "list";

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    if (action === "list") return await list(admin);
    if (action === "snapshot") return await snapshot(admin, body);
    if (action === "set_status") return await setStatus(admin, body);
    if (action === "attach_pdf") return await attachPdf(admin, body);
    return json({ error: `unknown action ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
