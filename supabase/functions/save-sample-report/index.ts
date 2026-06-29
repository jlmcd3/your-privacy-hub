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
  registration_assessments: { reportData: false, textCol: null },
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

async function deleteSamples(admin: ReturnType<typeof createClient>, body: any) {
  const ids = Array.isArray(body?.ids) ? body.ids.filter((id: unknown) => typeof id === "string" && id) : [];
  const toolSlug = typeof body?.tool_slug === "string" && body.tool_slug ? body.tool_slug : null;
  const deleteAll = body?.all === true;
  if (!deleteAll && !toolSlug && ids.length === 0) {
    return json({ error: "missing ids, tool_slug, or all=true" }, 400);
  }

  let query = admin.from("sample_reports").select("id,pdf_path");
  if (!deleteAll) {
    query = toolSlug ? query.eq("tool_slug", toolSlug) : query.in("id", ids);
  }
  const { data: rows, error: readErr } = await query;
  if (readErr) return json({ error: readErr.message }, 400);

  const targets = (rows ?? []) as Array<{ id: string; pdf_path: string | null }>;
  if (targets.length === 0) return json({ ok: true, deleted: 0, deleted_ids: [] });

  const BATCH_SIZE = 500;
  const storageErrors: string[] = [];
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const paths = targets.slice(i, i + BATCH_SIZE).map((r) => r.pdf_path).filter(Boolean) as string[];
    if (paths.length === 0) continue;
    const { error } = await admin.storage.from("sample-reports").remove(paths);
    if (error) storageErrors.push(error.message);
  }

  let deleted = 0;
  const deletedIds: string[] = [];
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batchIds = targets.slice(i, i + BATCH_SIZE).map((r) => r.id);
    const { data, error } = await admin.from("sample_reports").delete().in("id", batchIds).select("id");
    if (error) return json({ error: error.message, deleted, storage_errors: storageErrors }, 400);
    const batchDeleted = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
    deleted += batchDeleted.length;
    deletedIds.push(...batchDeleted);
  }

  return json({ ok: true, deleted, deleted_ids: deletedIds, storage_errors: storageErrors });
}

// --- generate_pdf: fetch the REAL generated report PDF for the freshly-run
// source row, and copy it into sample-reports/<tool_slug>/<title>.pdf so the
// /samples/report-output page shows the actual tool output (not a JSON dump).
//
// Strategy by tool_slug:
//   • li_assessment / dpia / governance / cppa_risk / cppa_cyber / dpa /
//     ir_playbook / biometric  → invoke `generate-report-pdf` (the canonical
//     report builder used by end users) and download the resulting PDF.
//   • ropa → download from the `ropa-documents` bucket using `file_path`
//     on the `ropa_document_versions` row identified by source_row_id.
//   • us_notice / eu_notice → look up the combined/current PDF document for
//     the session and download from the `us-notices` / `eu-notices` bucket.

const REPORT_PDF_TOOL_TYPE: Record<string, string> = {
  li_assessment: "li_assessment",
  dpia: "dpia_framework",
  governance: "governance_assessment",
  cppa_risk: "cppa_risk",
  cppa_cyber: "cppa_cybersecurity",
  cppa_admt: "cppa_admt",
  dpa: "dpa_generator",
  ir_playbook: "ir_playbook",
  biometric: "biometric_checker",
  registration: "registration_assessment",
};

function slugifyTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "report";
}

async function fetchRealPdfBytes(
  admin: ReturnType<typeof createClient>,
  tool_slug: string,
  source_row_id: string | null,
): Promise<Uint8Array> {
  if (!source_row_id) throw new Error("source_row_id is required — click 'Generate Report' first so the live tool produces an output to render");

  // --- RoPA: bytes live in `ropa-documents` bucket at version.file_path ----
  if (tool_slug === "ropa") {
    const { data: ver, error } = await admin
      .from("ropa_document_versions")
      .select("file_path")
      .eq("id", source_row_id)
      .maybeSingle();
    if (error || !(ver as { file_path?: string } | null)?.file_path) {
      throw new Error(`ropa version lookup: ${error?.message || "no file_path"}`);
    }
    const filePath = (ver as { file_path: string }).file_path;
    const { data, error: dlErr } = await admin.storage.from("ropa-documents").download(filePath);
    if (dlErr || !data) throw new Error(`ropa-documents download: ${dlErr?.message || "no data"}`);
    return new Uint8Array(await data.arrayBuffer());
  }

  // --- US / EU Notices: combined document is stored as HTML; render to PDF.
  if (tool_slug === "us_notice" || tool_slug === "eu_notice") {
    const docsTable = tool_slug === "us_notice" ? "us_notice_documents" : "eu_notice_documents";
    const bucket = tool_slug === "us_notice" ? "us-notices" : "eu-notices";
    // Prefer combined+current in any format (generators currently emit HTML).
    const { data: combined } = await admin
      .from(docsTable)
      .select("file_path, document_format")
      .eq("session_id", source_row_id)
      .eq("is_combined", true)
      .eq("is_current", true)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    let row = combined as { file_path?: string; document_format?: string } | null;
    if (!row?.file_path) {
      const { data: any1 } = await admin
        .from(docsTable)
        .select("file_path, document_format")
        .eq("session_id", source_row_id)
        .eq("is_current", true)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      row = any1 as { file_path?: string; document_format?: string } | null;
    }
    if (!row?.file_path) throw new Error(`${docsTable}: no document found for session ${source_row_id}`);
    const { data, error: dlErr } = await admin.storage.from(bucket).download(row.file_path);
    if (dlErr || !data) throw new Error(`${bucket} download: ${dlErr?.message || "no data"}`);
    if ((row.document_format ?? "").toLowerCase() === "pdf") {
      return new Uint8Array(await data.arrayBuffer());
    }
    // Render HTML → PDF via PDFShift
    const html = await data.text();
    return await renderHtmlViaPdfShift(html);
  }

  // --- Assessment-style tools: drive the canonical generate-report-pdf -----
  const toolType = REPORT_PDF_TOOL_TYPE[tool_slug];
  if (!toolType) throw new Error(`unsupported tool_slug for PDF generation: ${tool_slug}`);

  // The source row may still be settling (background writers, replication lag),
  // in which case generate-report-pdf's R0 guards correctly return 409.
  // Retry 409s with a delay instead of failing the whole pipeline.
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 6000;
  let lastDetail = "";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/generate-report-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
      },
      body: JSON.stringify({ tool_type: toolType, assessment_id: source_row_id, force: true }),
      signal: AbortSignal.timeout(120_000),
    });
    const payload = (await r.json().catch(() => ({}))) as {
      pdf_url?: string; error?: string; missing?: string; detail?: string; status?: string;
    };
    if (r.ok && payload.pdf_url) {
      const pdfRes = await fetch(payload.pdf_url, { signal: AbortSignal.timeout(60_000) });
      if (!pdfRes.ok) throw new Error(`download rendered PDF: HTTP ${pdfRes.status}`);
      return new Uint8Array(await pdfRes.arrayBuffer());
    }
    const parts = [payload.error || `HTTP ${r.status}`];
    if (payload.missing) parts.push(`missing=${payload.missing}`);
    if (payload.detail) parts.push(`detail=${payload.detail}`);
    if (payload.status) parts.push(`status=${payload.status}`);
    lastDetail = parts.join(" · ");
    console.warn(`[generate_pdf] attempt ${attempt}/${MAX_ATTEMPTS} failed (${r.status}): ${lastDetail}`);
    // 409 = guard says row not ready yet → wait and retry. 5xx → also retry.
    const retryable = r.status === 409 || r.status >= 500;
    if (!retryable || attempt === MAX_ATTEMPTS) break;
    await new Promise((res) => setTimeout(res, RETRY_DELAY_MS));
  }
  throw new Error(`generate-report-pdf failed after retries: ${lastDetail} — the source report may be incomplete; re-run "Generate Report + PDF" and check the card log`);
}

async function renderHtmlViaPdfShift(html: string): Promise<Uint8Array> {
  const apiKey = Deno.env.get("PDFSHIFT_API_KEY") || Deno.env.get("PDF_SERVICE_API_KEY") || Deno.env.get("PDFShift");
  if (!apiKey) throw new Error("PDFSHIFT_API_KEY not configured");
  let lastErr = "";
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          source: html,
          format: "Letter",
          margin: { top: "16mm", right: "14mm", bottom: "18mm", left: "14mm" },
          sandbox: Deno.env.get("PDFSHIFT_SANDBOX") === "true",
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (r.ok) return new Uint8Array(await r.arrayBuffer());
      lastErr = `PDFShift ${r.status}: ${(await r.text().catch(() => "")).slice(0, 300)}`;
      // 4xx other than 429 won't improve on retry
      if (r.status < 500 && r.status !== 429) break;
    } catch (e) {
      lastErr = `PDFShift attempt ${attempt}: ${(e as Error).message}`;
    }
    if (attempt === 1) await new Promise((res) => setTimeout(res, 4000));
  }
  throw new Error(lastErr || "PDFShift failed");
}


async function generatePdf(admin: ReturnType<typeof createClient>, body: any) {
  const { tool_slug, variant, title, scenario_summary, fixture, source_table, source_row_id } = body ?? {};
  if (!tool_slug || !variant || !title) {
    return json({ error: "missing tool_slug/variant/title" }, 400);
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await fetchRealPdfBytes(admin, tool_slug, source_row_id ?? null);
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }

  const filename = `${variant}--${slugifyTitle(title)}.pdf`;
  const path = `${tool_slug}/${filename}`;
  const { error: upErr } = await admin.storage.from("sample-reports").upload(path, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) return json({ error: `upload: ${upErr.message}` }, 400);

  const { data: prior } = await admin
    .from("sample_reports")
    .select("pdf_path")
    .eq("tool_slug", tool_slug)
    .eq("variant", variant)
    .maybeSingle();
  const oldPath = (prior as { pdf_path?: string } | null)?.pdf_path;
  if (oldPath && oldPath !== path) {
    await admin.storage.from("sample-reports").remove([oldPath]);
  }

  const verification = {
    source: "live_generator_pdf",
    method: "save-sample-report:generate_pdf",
    source_table: source_table ?? null,
    source_row_id: source_row_id ?? null,
    generated_at: new Date().toISOString(),
    bytes: pdfBytes.byteLength,
  };

  // Hydrate report_data + document_text from the source row so downstream
  // consumers (quality-loop P2 fixture-drift gate, sample-report previews,
  // verification audits) have the actual generator output, not just a PDF.
  let reportData: unknown = null;
  let documentText: string | null = null;
  if (source_table && source_row_id) {
    const shape = SOURCE_SHAPE[source_table] ?? { reportData: true, textCol: null };
    const cols: string[] = [];
    if (shape.reportData) cols.push("report_data");
    if (shape.textCol) cols.push(shape.textCol);
    if (cols.length > 0) {
      const { data: src } = await admin
        .from(source_table)
        .select(cols.join(","))
        .eq("id", source_row_id)
        .maybeSingle();
      if (src) {
        reportData = shape.reportData ? ((src as any).report_data ?? null) : null;
        documentText = shape.textCol ? ((src as any)[shape.textCol] ?? null) : null;
      }
    }
  }

  const payload = {
    tool_slug, variant, title,
    scenario_summary: scenario_summary ?? "",
    fixture: fixture ?? {},
    source_table: source_table ?? null,
    source_row_id: source_row_id ?? null,
    report_data: reportData,
    document_text: documentText,
    verification: (reportData as any)?.verification ?? verification,
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
    if (action === "delete_many") return await deleteSamples(admin, body);
    return json({ error: `unknown action ${action}` }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
