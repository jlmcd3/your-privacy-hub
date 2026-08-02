// EDPB One-Stop-Shop register backfill (Workstream 1, 2026-08-02).
//
// The Article 60 register (public.edpb_oss_decisions, doc_type='oss_decision')
// holds 1,320 index stubs: case_reference + decision_pdf_url, but no title,
// summary_text or source_document_text. The PDFs are EDPB's OWN publication of
// final, binding cross-border decisions — the publisher IS the authority, so
// there is no open-web discovery and no verification pipeline involved. This
// function is a pure fetch-and-extract loop against the known PDF links.
//
// Batched + resumable so a pg_cron driver can walk the backlog without any
// single invocation exceeding the edge runtime budget. Never touches
// enforcement_actions, Leg 1/2/3 scheduling, or any customer surface.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const USER_AGENT =
  "EndUserPrivacy-EDPBOSSBackfill/1.0 (+https://enduserprivacy.com; contact: support@enduserprivacy.com)";

const MAX_ATTEMPTS = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// europa.eu occasionally aborts the HTTP/2 body mid-transfer ("error reading a
// body from connection"), which also surfaces later as an unreadable PDF
// ("Invalid Root reference"). Both are transient, so retry the whole
// download+parse a couple of times before recording a failure.
async function pdfToText(url: string): Promise<string> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) throw new Error(`http_${res.status}`);
      const buf = new Uint8Array(await res.arrayBuffer());
      const doc = await getDocumentProxy(buf);
      const { text } = await extractText(doc, { mergePages: true });
      return String(text ?? "").replace(/\u0000/g, "").replace(/[ \t]+/g, " ").trim();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/**
 * Title derivation. EDPB decision PDFs open with the issuing authority and a
 * decision heading; we take the first substantive line that is not a bare page
 * number or boilerplate. Falls back to a deterministic synthetic title built
 * from the register metadata so no row is left title-less.
 */
function deriveTitle(text: string, row: Row): string {
  const lines = text
    .split(/\r?\n|(?<=\.)\s{2,}/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 12 && l.length <= 220)
    .filter((l) => !/^page\s*\d+/i.test(l))
    .filter((l) => /[a-zà-ÿ]/i.test(l));
  const cand = lines.find((l) => /decision|décision|beschluss|besluit|decisione|decisión|resolución/i.test(l)) ??
    lines[0];
  const base = cand ? cand.replace(/\s+/g, " ").slice(0, 200) : null;
  if (base) return base;
  const parts = [row.case_reference];
  if (row.lead_sa) parts.push(`lead SA ${row.lead_sa}`);
  if (row.decision_date) parts.push(row.decision_date);
  return `EDPB Article 60 final decision — ${parts.join(", ")}`;
}

/** Summary: the opening substantive prose of the decision, capped. */
function deriveSummary(text: string): string | null {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length < 80) return null;
  return flat.slice(0, 4000);
}

interface Row {
  id: string;
  case_reference: string;
  decision_pdf_url: string | null;
  decision_date: string | null;
  lead_sa: string | null;
  pdf_fetch_attempts: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const xAdmin = req.headers.get("x-admin-token") ?? "";
  const bearer = auth.replace("Bearer ", "");
  const authorized =
    (ADMIN_TOKEN && (auth.includes(ADMIN_TOKEN) || xAdmin === ADMIN_TOKEN)) ||
    bearer === SUPABASE_SERVICE_KEY;
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty allowed */ }

  const limit = Math.min(Math.max(Number(body?.limit ?? 12), 1), 40);
  const dry_run = Boolean(body?.dry_run);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data, error } = await admin
    .from("edpb_oss_decisions")
    .select("id, case_reference, decision_pdf_url, decision_date, lead_sa, pdf_fetch_attempts")
    .eq("doc_type", "oss_decision")
    .is("source_document_text", null)
    .not("decision_pdf_url", "is", null)
    .lt("pdf_fetch_attempts", MAX_ATTEMPTS)
    .order("pdf_fetch_attempts", { ascending: true })
    .order("decision_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) return json({ error: error.message }, 500);

  const rows = (data ?? []) as Row[];
  const stats = {
    selected: rows.length,
    extracted: 0,
    empty_pdf: 0,
    failed: 0,
    errors: [] as string[],
    remaining: 0,
    dry_run,
  };

  for (const row of rows) {
    if (dry_run) continue;
    try {
      const text = await pdfToText(row.decision_pdf_url!);
      if (text.length < 200) {
        // Scanned/image-only PDF (~21% of the register on a 14-row sample).
        // Retrying cannot help — retire the row from the queue and record why.
        stats.empty_pdf++;
        await admin.from("edpb_oss_decisions").update({
          pdf_fetch_attempts: MAX_ATTEMPTS,
          pdf_fetch_status: "image_only",
          pdf_fetch_error: `extracted_len=${text.length}; scanned PDF, OCR required`,
        }).eq("id", row.id);
        continue;
      }
      await admin.from("edpb_oss_decisions").update({
        source_document_text: text,
        title: deriveTitle(text, row),
        summary_text: deriveSummary(text),
        source_type: "regulator_primary",
        pdf_fetch_attempts: row.pdf_fetch_attempts + 1,
        pdf_fetch_status: "ok",
        pdf_fetch_error: null,
        pdf_fetched_at: new Date().toISOString(),
      }).eq("id", row.id);
      stats.extracted++;
    } catch (e) {
      stats.failed++;
      const msg = e instanceof Error ? e.message : String(e);
      stats.errors.push(`${row.case_reference}: ${msg.slice(0, 160)}`);
      await admin.from("edpb_oss_decisions").update({
        pdf_fetch_attempts: row.pdf_fetch_attempts + 1,
        pdf_fetch_status: "failed",
        pdf_fetch_error: msg.slice(0, 400),
      }).eq("id", row.id);
    }
  }

  const { count } = await admin
    .from("edpb_oss_decisions")
    .select("id", { count: "exact", head: true })
    .eq("doc_type", "oss_decision")
    .is("source_document_text", null)
    .not("decision_pdf_url", "is", null)
    .lt("pdf_fetch_attempts", MAX_ATTEMPTS);
  stats.remaining = count ?? 0;

  return json(stats);
});
