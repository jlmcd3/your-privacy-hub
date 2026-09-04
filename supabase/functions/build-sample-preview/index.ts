// build-sample-preview — admin-guarded publish-time step that computes the
// truncated public preview of a published sample report.
//
// Approved scope 2026-09-04 ("Truncated Sample Documents"): the public
// /samples pages read `sample_reports_public`, which exposes ONLY the
// preview columns this function writes. Rows without a preview render the
// fail-closed state, so the withheld content can never leak by omission.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import { buildPreview } from "../_shared/sample-preview.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

/** Pages of a file-driven deliverable shown publicly. */
const PREVIEW_PDF_PAGES = 2;
const BUCKET = "sample-reports";

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

function previewPathFor(pdfPath: string): string {
  return pdfPath.replace(/\.pdf$/i, "") + "--preview.pdf";
}

/** Copy the first N pages of the stored PDF into a sibling preview object. */
async function buildPreviewPdf(
  admin: ReturnType<typeof createClient>,
  pdfPath: string,
): Promise<{ path: string; withheld_pages: number } | null> {
  const { data: blob, error } = await admin.storage.from(BUCKET).download(pdfPath);
  if (error || !blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const keep = Math.min(PREVIEW_PDF_PAGES, total);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, Array.from({ length: keep }, (_, i) => i));
  for (const p of pages) out.addPage(p);
  const outBytes = await out.save();
  const path = previewPathFor(pdfPath);
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, outBytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(`preview pdf upload: ${upErr.message}`);
  return { path, withheld_pages: Math.max(0, total - keep) };
}

async function buildForRow(admin: ReturnType<typeof createClient>, id: string) {
  const { data: row, error } = await admin
    .from("sample_reports")
    .select("id, tool_slug, variant, document_text, report_data, pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error(`sample ${id} not found`);

  const r = row as {
    id: string;
    tool_slug: string;
    variant: string;
    document_text: string | null;
    report_data: Record<string, unknown> | null;
    pdf_path: string | null;
  };

  const preview = buildPreview(r);
  let previewPdfPath: string | null = null;
  let withheld = preview.withheld_section_count;

  const hasRowContent = Boolean(preview.preview_document_text || preview.preview_report_data);
  if (!hasRowContent && r.pdf_path) {
    const built = await buildPreviewPdf(admin, r.pdf_path);
    if (built) {
      previewPdfPath = built.path;
      withheld = built.withheld_pages;
    }
  }

  const patch = {
    preview_document_text: preview.preview_document_text,
    preview_report_data: preview.preview_report_data,
    preview_toc: preview.preview_toc,
    preview_pdf_path: previewPdfPath,
    withheld_section_count: withheld,
    preview_built_at: new Date().toISOString(),
  };
  const { error: upErr } = await admin.from("sample_reports").update(patch).eq("id", id);
  if (upErr) throw new Error(upErr.message);

  return {
    id,
    tool_slug: r.tool_slug,
    variant: r.variant,
    kept: preview.preview_report_data || preview.preview_document_text ? "content" : (previewPdfPath ? "pdf" : "none"),
    toc_entries: preview.preview_toc.length,
    withheld,
  };
}

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
