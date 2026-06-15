// Generic HTML → DOCX renderer. Takes inline HTML (or markdown) + title and
// returns a signed URL to a Word document stored in the assessment-reports
// bucket under `adhoc/<userId>/<slug>-<timestamp>.docx`. Mirrors
// render-html-to-pdf so result pages can offer a high-fidelity Word download
// built from the same HTML used for the PDF.
//
// Conversion uses `@turbodocx/html-to-docx` — an actively-maintained fork
// of the original `html-to-docx` that fixes Microsoft-Word-compatibility
// issues (the upstream 1.8.0 package produces files Word refuses to open).
// Word's OOXML can't perfectly reproduce HTML/CSS, but this is a dramatic
// step up from the prior client-side marked→docx walker because the
// conversion sees the actual rendered HTML (colors, headings, tables,
// lists, links) instead of re-interpreting Markdown.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { marked } from "npm:marked@12";
import HTMLtoDOCX from "npm:@turbodocx/html-to-docx@1.13.0";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Brand-styled HTML wrapper so the generated Word document inherits navy
// titles, teal accents, and DM-style typography (mapped to Word-safe fonts).
function wrapHtml(innerHtml: string, title: string, subtitle?: string): string {
  const safeTitle = title.replace(/</g, "&lt;");
  const safeSubtitle = subtitle ? subtitle.replace(/</g, "&lt;") : "";
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${safeTitle}</title>
<style>
  body { font-family: Calibri, "DM Sans", Arial, sans-serif; font-size: 11pt; color: #1A1916; line-height: 1.5; }
  h1, h2, h3, h4, h5, h6 { font-family: Cambria, "DM Serif Display", Georgia, serif; color: #0D2A45; margin: 18pt 0 6pt; }
  h1 { font-size: 22pt; border-bottom: 1.5pt solid #2A9D8F; padding-bottom: 4pt; }
  h2 { font-size: 16pt; color: #0D2A45; }
  h3 { font-size: 13pt; color: #2A9D8F; }
  h4 { font-size: 12pt; color: #2A9D8F; }
  p  { margin: 0 0 8pt; }
  a  { color: #2A9D8F; text-decoration: underline; }
  ul, ol { margin: 0 0 8pt 20pt; padding: 0; }
  li { margin: 0 0 3pt; }
  blockquote { border-left: 3pt solid #2A9D8F; margin: 8pt 0; padding: 4pt 12pt; color: #475569; font-style: italic; }
  code, pre { font-family: Consolas, "DM Mono", monospace; font-size: 10pt; background: #F1F5F9; }
  pre { padding: 8pt; border: 0.75pt solid #E2E8F0; }
  table { border-collapse: collapse; width: 100%; margin: 8pt 0; }
  th { background: #0D2A45; color: #FFFFFF; font-family: Cambria, Georgia, serif; padding: 6pt 8pt; text-align: left; border: 0.5pt solid #CBD5E1; }
  td { padding: 6pt 8pt; border: 0.5pt solid #CBD5E1; vertical-align: top; }
  tr:nth-child(even) td { background: #F1F5F4; }
  hr { border: none; border-top: 1pt solid #2A9D8F; margin: 12pt 0; }
  .eup-cover { margin-bottom: 16pt; padding-bottom: 8pt; border-bottom: 1.5pt solid #2A9D8F; }
  .eup-cover .title { font-family: Cambria, Georgia, serif; color: #0D2A45; font-size: 22pt; font-weight: bold; }
  .eup-cover .subtitle { color: #475569; font-size: 11pt; margin-top: 2pt; }
  .eup-cover .meta { color: #475569; font-size: 9pt; margin-top: 6pt; }
  .eup-disclaimer { margin-top: 24pt; padding: 8pt 12pt; border: 0.75pt solid #2A9D8F; background: #F1F5F4; color: #475569; font-size: 9pt; }
</style></head><body>
<div class="eup-cover">
  <div class="title">${safeTitle}</div>
  ${safeSubtitle ? `<div class="subtitle">${safeSubtitle}</div>` : ""}
  <div class="meta">Generated ${today} &middot; EndUserPrivacy.com</div>
</div>
${innerHtml}
<div class="eup-disclaimer">
  This document is a compliance framework tool and does not constitute legal advice.
  Review all findings with qualified legal counsel before relying on any regulatory position.
</div>
</body></html>`;
}

async function convertToDocx(html: string): Promise<Uint8Array> {
  // html-to-docx returns a Buffer (or Blob in browsers). In Deno the npm
  // shim gives us a Node Buffer-compatible Uint8Array.
  const result = await HTMLtoDOCX(
    html,
    null,
    {
      orientation: "portrait",
      margins: { top: 1440, right: 1080, bottom: 1440, left: 1080 }, // 1" / 0.75"
      pageSize: { width: 12240, height: 15840 }, // US Letter (twips)
      title: "EndUserPrivacy Report",
      font: "Calibri",
      fontSize: 22, // half-points = 11pt
      table: { row: { cantSplit: true } },
    },
    null,
  );
  if (result instanceof Uint8Array) return result;
  // Buffer extends Uint8Array, but be defensive.
  // deno-lint-ignore no-explicit-any
  const anyResult = result as any;
  if (anyResult?.arrayBuffer) {
    return new Uint8Array(await anyResult.arrayBuffer());
  }
  return new Uint8Array(anyResult);
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
        { global: { headers: { Authorization: authHeader } } },
      );
      const token = authHeader.replace("Bearer ", "");
      const { data } = await client.auth.getClaims(token);
      if (data?.claims?.sub) userId = String(data.claims.sub);
    }

    const body = await req.json().catch(() => ({}));
    const rawHtml = typeof body.html === "string" ? body.html : "";
    const markdown = typeof body.markdown === "string" ? body.markdown : "";
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 200)
        : "EndUserPrivacy-Report";
    const subtitle =
      typeof body.subtitle === "string" ? body.subtitle.slice(0, 240) : undefined;

    let inner = rawHtml;
    if (!inner && markdown) {
      inner = marked.parse(markdown, { gfm: true, breaks: false }) as string;
    }
    if (!inner || inner.length < 10) {
      return new Response(JSON.stringify({ error: "html or markdown is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (inner.length > 2_000_000) {
      return new Response(JSON.stringify({ error: "content too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullHtml = wrapHtml(inner, title, subtitle);
    const docxBytes = await convertToDocx(fullHtml);

    const slug =
      title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "report";
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const storagePath = `adhoc/${userId}/${slug}-${ts}.docx`;
    const { error: storageError } = await supabase.storage
      .from("assessment-reports")
      .upload(storagePath, docxBytes, {
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
    if (storageError) throw storageError;

    const { data: urlData } = await supabase.storage
      .from("assessment-reports")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30); // 30 days

    return new Response(
      JSON.stringify({ success: true, docx_url: urlData?.signedUrl || null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("render-html-to-docx error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "DOCX generation failed." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
