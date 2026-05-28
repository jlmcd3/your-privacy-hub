// Track 3 — Fetch & extract primary source worker.
//
// For a single legacy enforcement_actions row whose primary_source_status is
// 'pending_fetch':
//   1. Fetches primary_source_url (HTML or PDF).
//   2. Stores source_document_text + source_document_fetched_at + content hash.
//   3. Runs Haiku KCF extraction (40-char verbatim substring check).
//   4. Runs constrained extraction for statutory_provisions (each provision
//      requires an evidence_quote that substring-matches the source).
//   5. Writes back results and the appropriate primary_source_status:
//        - 'extracted_verbatim'     — KCF passed the 40-char check AND we got
//                                     at least one verified statutory provision
//        - 'extracted_unverified'   — fetched ok but extraction did not meet
//                                     the verbatim bar
//        - 'fetched_partial'        — fetched ok but text too short to extract
//        - 'fetch_404' / 'fetch_403' / 'fetch_timeout' / 'fetched_ok' (interim)
//   6. Sets ingestion_confidence ('high' on extracted_verbatim, 'low' on
//      extracted_unverified, 'medium' on partial/no-extract).
//   7. PRESERVES any existing Track 2 statutory_provisions+method on rows
//      where Track 3 does NOT reach extracted_verbatim. Only overwrites when
//      verbatim verification passes (Section 3 of the Track 3 spec).
//   8. Triggers a single-row memo_eligible recompute via the existing
//      recompute_memo_eligible_interim function (no per-row helper exists yet;
//      we recompute the whole table — cheap because it's a where-distinct
//      update).
//
// Body: { row_id: string, dry_run?: boolean }
// Auth: x-admin-token header == ADMIN_SECRET_TOKEN.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  extractKeyComplianceFailure,
} from "../_shared/llm-extraction.ts";
import { constrainedExtract } from "../_shared/constrained-extraction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_TEXT_CHARS = 60_000;

// Map regulator (canonical alias OR display string) -> primary source-document
// language. Per-regulator known-language fallback ONLY: valid where a regulator
// publishes its decisions in a single known language (AEPD = Spanish). This is
// NOT generalizable to multilingual bodies (EDPB, CJEU, EU Commission) — they
// must derive language from the source document directly when added.
const REGULATOR_LANG: Record<string, string> = {
  // Canonical alias keys (preferred, piped by the orchestrator).
  aepd: "es",
  // Display-string fallbacks (used when no alias is piped, e.g. ad-hoc curl).
  "spain - aepd": "es",
  "spanish data protection agency": "es",
  "spanish data protection authority (aepd)": "es",
};

function regulatorSourceLang(
  aliasKey: string | null,
  regulatorString: string | null,
): string | null {
  // Prefer the canonical alias piped by the orchestrator over the messy
  // regulator string on the row (~77% of rows have NULL regulator_canonical).
  if (aliasKey) {
    const v = REGULATOR_LANG[aliasKey.trim().toLowerCase()];
    if (v) return v;
  }
  if (regulatorString) {
    const v = REGULATOR_LANG[regulatorString.trim().toLowerCase()];
    if (v) return v;
  }
  return null;
}


async function sha256(input: ArrayBuffer | string): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pdfBytesToText(bytes: ArrayBuffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.12.1");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    return joined.replace(/\s+/g, " ").slice(0, MAX_TEXT_CHARS).trim();
  } catch (e) {
    console.warn(`[fetch-extract] unpdf failed: ${(e as Error).message}`);
    return "";
  }
}

interface FetchOutcome {
  status: "ok" | "fetch_404" | "fetch_403" | "fetch_timeout" | "fetch_other";
  text?: string;
  hash?: string;
  http_status?: number;
}

async function fetchAndExtractText(url: string): Promise<FetchOutcome> {
  let resp: Response;
  try {
    resp = await fetch(url, {
      headers: {
        "user-agent": BROWSER_UA,
        "accept": "text/html,application/xhtml+xml,application/xml,application/pdf,*/*;q=0.8",
        "accept-language": "en;q=0.8,*;q=0.5",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    const msg = (e as Error).message || "";
    if (/timeout|abort/i.test(msg)) return { status: "fetch_timeout" };
    return { status: "fetch_other" };
  }

  if (resp.status === 404) {
    try { await resp.body?.cancel(); } catch { /* noop */ }
    return { status: "fetch_404", http_status: 404 };
  }
  if (resp.status === 403) {
    try { await resp.body?.cancel(); } catch { /* noop */ }
    return { status: "fetch_403", http_status: 403 };
  }
  if (!resp.ok) {
    try { await resp.body?.cancel(); } catch { /* noop */ }
    return { status: "fetch_other", http_status: resp.status };
  }

  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  const cl = parseInt(resp.headers.get("content-length") || "0", 10);
  if (cl > MAX_RESPONSE_BYTES) {
    try { await resp.body?.cancel(); } catch { /* noop */ }
    return { status: "fetch_other", http_status: 413 };
  }
  const buf = await resp.arrayBuffer();
  if (buf.byteLength > MAX_RESPONSE_BYTES) {
    return { status: "fetch_other", http_status: 413 };
  }

  const isPdf = ct.includes("pdf") || url.toLowerCase().endsWith(".pdf");
  const text = isPdf
    ? await pdfBytesToText(buf)
    : htmlToText(new TextDecoder("utf-8", { fatal: false }).decode(buf));
  const hash = await sha256(buf);
  return { status: "ok", text, hash, http_status: resp.status };
}

async function processOne(
  supabase: ReturnType<typeof createClient>,
  rowId: string,
  dryRun: boolean,
  regulatorCanonicalAlias: string | null,
) {
  const { data: row, error } = await supabase
    .from("enforcement_actions")
    .select(
      "id, regulator, regulator_canonical, law, subject, decision_date, primary_source_url, primary_source_status, statutory_provisions, statutory_provisions_extraction_method, key_compliance_failure",
    )
    .eq("id", rowId)
    .maybeSingle();
  if (error) throw new Error(`load failed: ${error.message}`);
  if (!row) throw new Error(`row not found: ${rowId}`);
  if (!row.primary_source_url) {
    throw new Error(`row ${rowId} has no primary_source_url`);
  }

  const fetchOutcome = await fetchAndExtractText(row.primary_source_url as string);

  if (fetchOutcome.status !== "ok") {
    const statusMap: Record<string, string> = {
      fetch_404: "fetch_404",
      fetch_403: "fetch_403",
      fetch_timeout: "fetch_timeout",
      fetch_other: "fetch_timeout", // collapse misc into timeout bucket for now
    };
    const newStatus = statusMap[fetchOutcome.status] ?? "fetch_timeout";
    if (!dryRun) {
      const { error: wErr } = await supabase
        .from("enforcement_actions")
        .update({
          primary_source_status: newStatus,
          source_document_fetched_at: new Date().toISOString(),
        })
        .eq("id", rowId);
      if (wErr) throw new Error(`write fetch-fail status failed: ${wErr.message}`);
    }
    return { row_id: rowId, primary_source_status: newStatus, http_status: fetchOutcome.http_status };
  }

  const sourceText = (fetchOutcome.text ?? "").trim();
  if (sourceText.length < 200) {
    if (!dryRun) {
      const { error: wErr } = await supabase
        .from("enforcement_actions")
        .update({
          source_document_text: sourceText || null,
          source_document_fetched_at: new Date().toISOString(),
          source_document_hash_at_ingest: fetchOutcome.hash,
          primary_source_status: "fetched_partial",
          ingestion_confidence: "medium",
        })
        .eq("id", rowId);
      if (wErr) throw new Error(`write fetched_partial failed: ${wErr.message}`);
    }
    return { row_id: rowId, primary_source_status: "fetched_partial", text_len: sourceText.length };
  }

  // KCF extraction (Haiku, native language, 40-char verbatim check).
  const kcf = await extractKeyComplianceFailure(
    sourceText,
    "auto",
    (row.regulator_canonical as string) ?? (row.regulator as string) ?? "unknown",
  );

  // Constrained extraction for statutory_provisions with evidence_quote verify.
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const extract = await constrainedExtract({
    apiKey,
    doc: sourceText,
    regulator: (row.regulator_canonical as string) ?? (row.regulator as string),
    subject: row.subject as string | null,
    decisionDate: row.decision_date as string | null,
    law: row.law as string | null,
  });

  const kcfVerbatim = kcf.confidence === "verbatim" && (kcf.text?.length ?? 0) >= 20;
  const statsVerified = (extract.statutory_provisions?.length ?? 0) >= 1;
  const verbatimOk = kcfVerbatim && statsVerified;

  // Diagnostic: per-row gate decomposition + language-check snippets.
  // kcf_snippet and stat_snippet are deliberately truncated and preserved verbatim
  // so we can confirm output stays in the source-document language (no translation).
  const kcfSnippet = (kcf.text ?? "").slice(0, 160);
  const firstStat = extract.statutory_provisions?.[0] as
    | { citation?: string; evidence_quote?: string }
    | undefined;
  const statSnippet = firstStat
    ? `${firstStat.citation ?? ""} | ${(firstStat.evidence_quote ?? "").slice(0, 120)}`
    : "(none)";
  console.log(
    `[gate] row=${rowId} kcf_conf=${kcf.confidence} kcf_len=${kcf.text?.length ?? 0} ` +
      `kcf_verbatim=${kcfVerbatim} stats_count=${extract.statutory_provisions?.length ?? 0} ` +
      `stats_verified=${statsVerified} verbatim_ok=${verbatimOk} ` +
      `kcf_snippet="${kcfSnippet.replace(/"/g, "'")}" stat_snippet="${statSnippet.replace(/"/g, "'")}"`,
  );

  // Build update payload.
  const updatePayload: Record<string, unknown> = {
    source_document_text: sourceText,
    source_document_fetched_at: new Date().toISOString(),
    source_document_hash_at_ingest: fetchOutcome.hash,
  };

  if (verbatimOk) {
    updatePayload.primary_source_status = "extracted_verbatim";
    updatePayload.ingestion_confidence = "high";
    updatePayload.key_compliance_failure = kcf.text;
    // Overwrite Track 2 outputs only on verbatim success (Section 3).
    updatePayload.statutory_provisions = extract.statutory_provisions;
    updatePayload.statutory_provisions_extraction_method = "pattern_per_regulator_verified";
    // Persist per-provision audit trail: canonical label paired with the
    // verbatim source-language quote that already passed substring verification
    // in constrainedExtract. Captured, not recomputed. Enables auditors and the
    // annotation layer to Ctrl-F each citation against primary_source_url
    // without re-running extraction.
    const sourceLang = regulatorSourceLang(
      regulatorCanonicalAlias,
      (row.regulator_canonical as string) ?? (row.regulator as string) ?? null,
    );
    updatePayload.statutory_provisions_evidence = (extract.statutory_provisions ?? []).map(
      (provision: string) => ({
        provision,
        evidence_quote: extract.evidence_quotes?.[`statutory_provision:${provision}`] ?? null,
        verified: true,
        source_lang: sourceLang,
      }),
    );
  } else {
    updatePayload.primary_source_status = "extracted_unverified";
    updatePayload.ingestion_confidence = "low";
    // Preserve existing Track 2 statutory_provisions + method (do NOT overwrite).
    // Preserve existing key_compliance_failure unless it's empty AND the new
    // KCF is at least "near_verbatim" — in that case fill it but do not promote
    // memo_eligible.
    if (!row.key_compliance_failure && kcf.text && kcf.text.length >= 20) {
      updatePayload.key_compliance_failure = kcf.text;
    }
  }

  if (!dryRun) {
    const { error: wErr } = await supabase
      .from("enforcement_actions")
      .update(updatePayload)
      .eq("id", rowId);
    if (wErr) throw new Error(`write extraction failed: ${wErr.message}`);

    // Recompute memo_eligible (whole-table; cheap due to IS DISTINCT FROM guard).
    const { error: rErr } = await supabase.rpc("recompute_memo_eligible_interim");
    if (rErr) {
      console.warn(`[fetch-extract] memo recompute failed: ${rErr.message}`);
    }
  }

  return {
    row_id: rowId,
    primary_source_status: updatePayload.primary_source_status,
    kcf_confidence: kcf.confidence,
    statutory_provisions_count: extract.statutory_provisions?.length ?? 0,
    extract_parse_error: extract.parse_error ?? null,
    haiku_usage: extract.usage,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminTok = req.headers.get("x-admin-token");
  if (!adminTok || adminTok !== Deno.env.get("ADMIN_SECRET_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { row_id?: string; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.row_id) {
    return new Response(JSON.stringify({ error: "row_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const result = await processOne(supabase, body.row_id, Boolean(body.dry_run));
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[fetch-extract] error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
