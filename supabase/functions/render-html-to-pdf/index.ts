// Generic HTML → PDF renderer. Takes inline HTML + title and returns a
// signed URL to a PDFShift-rendered PDF stored in the assessment-reports
// bucket under `adhoc/<userId>/<slug>-<timestamp>.pdf`. Used by admin
// pages (e.g. /admin/tests-output) and any client that needs a one-off
// branded PDF without a database-backed record.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function renderViaPdfShift(html: string, title: string): Promise<Uint8Array | null> {
  const pdfApiKey =
    Deno.env.get("PDFSHIFT_API_KEY") ||
    Deno.env.get("PDF_SERVICE_API_KEY") ||
    Deno.env.get("PDFShift");
  if (!pdfApiKey) {
    console.error("PDFSHIFT_API_KEY not set");
    return null;
  }
  const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST",
    headers: {
      "X-API-Key": pdfApiKey,
      "Content-Type": "application/json",
    },
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
  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    console.error(`PDFShift error ${response.status}: ${errBody.slice(0, 300)}`);
    return null;
  }
  return new Uint8Array(await response.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    let userId = "anon";
    if (authHeader?.startsWith("Bearer ")) {
      const client = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data } = await client.auth.getClaims(token);
      if (data?.claims?.sub) userId = String(data.claims.sub);
    }

    const body = await req.json().catch(() => ({}));
    const html = typeof body.html === "string" ? body.html : "";
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 120)
      : "EndUserPrivacy-Report";
    if (!html || html.length < 30) {
      return new Response(JSON.stringify({ error: "html is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (html.length > 2_000_000) {
      return new Response(JSON.stringify({ error: "html too large" }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const pdfBytes = await renderViaPdfShift(html, title);
    if (!pdfBytes) {
      return new Response(JSON.stringify({ error: "PDF generation failed. Check PDFSHIFT_API_KEY." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const slug = title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "report";
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const storagePath = `adhoc/${userId}/${slug}-${ts}.pdf`;
    const { error: storageError } = await supabase.storage
      .from("assessment-reports")
      .upload(storagePath, pdfBytes, { contentType: "application/pdf", upsert: true });
    if (storageError) throw storageError;

    const { data: urlData } = await supabase.storage
      .from("assessment-reports")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30); // 30 days

    return new Response(
      JSON.stringify({ success: true, pdf_url: urlData?.signedUrl || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("render-html-to-pdf error:", e);
    return new Response(JSON.stringify({ error: "PDF generation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
