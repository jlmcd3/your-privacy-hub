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

// Map source_table → { has report_data column?, primary text column (if any) }.
// Not every source table has a JSON `report_data` column — RoPA versions and
// the notice sessions are file-driven and would error if we selected it.
const SOURCE_SHAPE: Record<string, { reportData: boolean; textCol: string | null }> = {
  li_assessments: { reportData: true, textCol: null },
  dpia_frameworks: { reportData: true, textCol: null },
  governance_assessments: { reportData: true, textCol: null },
  cppa_assessments: { reportData: true, textCol: null },
  dpa_documents: { reportData: true, textCol: "document_text" },
  ir_playbooks: { reportData: true, textCol: "playbook_text" },
  biometric_assessments: { reportData: true, textCol: "analysis_text" },
  // RoPA + notices are file-driven; no report_data, no canonical text column.
  ropa_document_versions: { reportData: false, textCol: null },
  us_notice_sessions: { reportData: false, textCol: null },
  eu_notice_sessions: { reportData: false, textCol: null },
};

async function snapshot(admin: ReturnType<typeof createClient>, body: any) {
  const {
    tool_slug, variant, title, scenario_summary, fixture,
    source_table, source_row_id,
  } = body ?? {};
  if (!tool_slug || !variant || !title || !source_table || !source_row_id) {
    return json({ error: "missing required fields" }, 400);
  }

  const shape = SOURCE_SHAPE[source_table] ?? { reportData: true, textCol: null };
  const cols: string[] = [];
  if (shape.reportData) cols.push("report_data");
  if (shape.textCol) cols.push(shape.textCol);
  let src: Record<string, unknown> | null = null;
  if (cols.length > 0) {
    const { data, error: srcErr } = await admin
      .from(source_table)
      .select(cols.join(","))
      .eq("id", source_row_id)
      .maybeSingle();
    if (srcErr) return json({ error: `source: ${srcErr.message}` }, 400);
    src = (data as Record<string, unknown>) ?? null;
  }

  const reportData = shape.reportData ? ((src as any)?.report_data ?? null) : null;
  const documentText = shape.textCol ? ((src as any)?.[shape.textCol] ?? null) : null;
  const verification = (reportData as any)?.verification ?? null;

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

async function deleteSample(admin: ReturnType<typeof createClient>, body: any) {
  const { id } = body ?? {};
  if (!id) return json({ error: "missing id" }, 400);
  const { data: row } = await admin
    .from("sample_reports")
    .select("pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (row?.pdf_path) {
    await admin.storage.from("sample-reports").remove([row.pdf_path]);
  }
  const { error } = await admin.from("sample_reports").delete().eq("id", id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}

// --- generate_pdf: build a branded HTML brief from the fixture, render with
// PDFShift, upload to sample-reports/<tool_slug>/<variant>.pdf, and upsert the
// sample_reports row (with a synthetic verification stub so the publish guard
// accepts it). Replaces the broken per-tool generators on /admin/sample-reports.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function buildSampleHtml(opts: {
  tool_slug: string; variant: string; title: string;
  scenario_summary: string; fixture: Record<string, unknown>;
}): string {
  const { tool_slug, variant, title, scenario_summary, fixture } = opts;
  const fixtureJson = escapeHtml(JSON.stringify(fixture, null, 2));
  const generatedAt = new Date().toISOString().slice(0, 10);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: Letter; margin: 16mm 14mm 18mm 14mm; }
  body { font-family: 'DM Sans', Helvetica, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; line-height: 1.45; }
  .header { border-bottom: 2px solid #2a9d8f; padding-bottom: 10px; margin-bottom: 18px; }
  .eyebrow { font-family: 'DM Mono', monospace; font-size: 9pt; letter-spacing: .08em;
             text-transform: uppercase; color: #2a9d8f; margin-bottom: 4px; }
  h1 { font-family: 'DM Serif Display', Georgia, serif; font-size: 22pt; margin: 0 0 6px 0;
       color: #0d2a45; font-weight: normal; line-height: 1.15; }
  .meta { font-family: 'DM Mono', monospace; font-size: 9pt; color: #5c5a54; }
  h2 { font-family: 'DM Serif Display', Georgia, serif; font-size: 14pt; color: #0d2a45;
       margin: 22px 0 8px 0; font-weight: normal; }
  .scenario { background: #f5f3ee; border-left: 3px solid #2a9d8f; padding: 12px 14px;
              border-radius: 2px; margin-bottom: 18px; }
  pre { background: #0d2a45; color: #d6ecea; font-family: 'DM Mono', Menlo, monospace;
        font-size: 8.5pt; padding: 14px; border-radius: 4px; white-space: pre-wrap;
        word-break: break-word; line-height: 1.4; }
  .footer-note { margin-top: 26px; padding-top: 12px; border-top: 1px solid #ddd;
                 font-size: 8.5pt; color: #5c5a54; }
</style></head><body>
  <div class="header">
    <div class="eyebrow">${escapeHtml(tool_slug)} · ${escapeHtml(variant)} · sample report</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="meta">EndUserPrivacy.com · Generated ${generatedAt}</div>
  </div>
  <h2>Scenario</h2>
  <div class="scenario">${escapeHtml(scenario_summary)}</div>
  <h2>Intake data</h2>
  <p>The structured intake below was used to drive this sample. Published samples
     are reviewed by EndUserPrivacy editors before release.</p>
  <pre>${fixtureJson}</pre>
  <div class="footer-note">
    This is a sample report intended to demonstrate the tool's output structure
    and scope. It is not legal advice. Live tool runs produce verified citations
    and tool-specific analysis sections.
  </div>
</body></html>`;
}

async function renderViaPdfShift(html: string, title: string): Promise<Uint8Array> {
  const apiKey =
    Deno.env.get("PDFSHIFT_API_KEY") ||
    Deno.env.get("PDF_SERVICE_API_KEY") ||
    Deno.env.get("PDFShift");
  if (!apiKey) throw new Error("PDFSHIFT_API_KEY not configured");
  const r = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      source: html,
      format: "Letter",
      margin: { top: "16mm", right: "14mm", bottom: "18mm", left: "14mm" },
      sandbox: Deno.env.get("PDFSHIFT_SANDBOX") === "true",
      footer: {
        source:
          '<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#5c5a54;width:100%;padding:0 14mm;display:flex;justify-content:space-between;">' +
          `<span>${title.replace(/</g, "&lt;")}</span>` +
          '<span>EndUserPrivacy.com · Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>' +
          "</div>",
        spacing: 4,
      },
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => "");
    throw new Error(`PDFShift ${r.status}: ${err.slice(0, 300)}`);
  }
  return new Uint8Array(await r.arrayBuffer());
}

async function generatePdf(admin: ReturnType<typeof createClient>, body: any) {
  const { tool_slug, variant, title, scenario_summary, fixture } = body ?? {};
  if (!tool_slug || !variant || !title) {
    return json({ error: "missing tool_slug/variant/title" }, 400);
  }
  const html = buildSampleHtml({
    tool_slug, variant, title,
    scenario_summary: scenario_summary ?? "",
    fixture: (fixture as Record<string, unknown>) ?? {},
  });
  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderViaPdfShift(html, title);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }

  const path = `${tool_slug}/${variant}.pdf`;
  const { error: upErr } = await admin.storage.from("sample-reports").upload(path, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) return json({ error: `upload: ${upErr.message}` }, 400);

  const verification = {
    source: "manual_pdfshift",
    method: "admin sample PDF generator",
    generated_at: new Date().toISOString(),
    bytes: pdfBytes.byteLength,
  };

  const payload = {
    tool_slug, variant, title,
    scenario_summary: scenario_summary ?? "",
    fixture: fixture ?? {},
    source_table: "manual_pdfshift",
    source_row_id: null,
    report_data: null,
    document_text: null,
    verification,
    pdf_path: path,
    status: "draft",
    updated_at: new Date().toISOString(),
  };

  const { data: row, error } = await admin
    .from("sample_reports")
    .upsert(payload, { onConflict: "tool_slug,variant" })
    .select()
    .single();
  if (error) return json({ error: `upsert: ${error.message}` }, 400);
  return json({ row, bytes: pdfBytes.byteLength });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Authorize via either (a) admin shared token, or (b) authenticated user
  // who has the `admin` app_role. /admin/sample-reports is already gated by
  // AdminOnly client-side, so the JWT path lets admins use the page without
  // pasting the shared secret.
  const headerToken = req.headers.get("x-admin-token") ?? "";
  let authorized = ADMIN_TOKEN && headerToken === ADMIN_TOKEN;
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
    if (action === "generate_pdf") return await generatePdf(admin, body);
    if (action === "delete") return await deleteSample(admin, body);
    return json({ error: `unknown action ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
