// Corpus-driven enrichment runner.
// Iterates the existing legacy corpus (legacy_enrichment_version=1, ingestion_method IS NULL),
// fetches each row's existing source_url, runs the per-regulator field_recipes against the
// fetched bytes, and UPDATES the existing enforcement_actions row in place. Never inserts.
//
// Body: { regulator_canonical: string, max_rows?: number, offset?: number, dry_run?: boolean }
// Auth: Admin only via x-admin-token header matching ADMIN_SECRET_TOKEN.
//
// Failure taxonomy (recorded as ingestion_method on the row):
//   corpus_enriched           — fetch + extraction OK, all required fields populated
//   corpus_extraction_partial — fetch OK but extraction missing required fields
//   corpus_url_dead           — HTTP 404 (or other 4xx not 403)
//   corpus_url_blocked        — HTTP 403, 401, 429, or TLS / WAF errors
//   corpus_url_timeout        — network timeout / DNS / connect error
//   corpus_url_too_large      — body exceeded 2MB cap
//
// All UPDATEs throw on DB error — no silent failures. Counts recorded in ingestion_runs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import {
  extractKeyComplianceFailure,
  classifyComplianceFailure,
  extractSector,
  normaliseFineToEur,
  PLACEHOLDER_SUBJECTS,
} from "../_shared/llm-extraction.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const IDENTIFYING_UA = "EndUserPrivacyIngestion/1.0 (+https://enduserprivacy.com; [email protected])";

const MAX_RESPONSE_BYTES = 2_000_000;

// ============================================================
// Canonical → legacy alias map (P1 regulators).
// Built from a SELECT regulator, count(*) on enforcement_actions.
// Extend if a new regulator profile is added.
// ============================================================
const REGULATOR_ALIASES: Record<string, string[]> = {
  "Agencia Española de Protección de Datos (AEPD)": [
    "Spanish Data Protection Authority (aepd)",
    "AEPD",
    "AEPD (Spain)",
    "Agencia Española de Protección de Datos (AEPD)",
  ],
  "Urząd Ochrony Danych Osobowych (UODO)": [
    "UODO",
    "Polish National Personal Data Protection Office (UODO)",
    "Polish Data Protection Authority (UODO)",
  ],
  "Garante per la protezione dei dati personali": [
    "Italian Data Protection Authority (Garante)",
    "Garante per la protezione dei dati personali",
    "Garante (Italy)",
  ],
  "Federal Trade Commission (FTC)": [
    "FTC",
    "Federal Trade Commission (FTC)",
  ],
  "U.S. Department of Health & Human Services Office for Civil Rights (HHS OCR)": ["HHS OCR"],
  "Autoritatea Naţională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)": [
    "Romanian National Supervisory Authority for Personal Data Processing (ANSPDCP)",
  ],
  "Hellenic Data Protection Authority (HDPA)": [
    "Hellenic Data Protection Authority (HDPA)",
    "HDPA",
  ],
  "Commission Nationale de l'Informatique et des Libertés (CNIL)": [
    "French Data Protection Authority (CNIL)",
    "CNIL",
    "CNIL (France)",
  ],
  "Úřad pro ochranu osobních údajů (ÚOOÚ)": ["Czech Data Protection Auhtority (UOOU)"],
  "Office of the Australian Information Commissioner (OAIC)": ["OAIC"],
  "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)": [
    "Hungarian National Authority for Data Protection and the Freedom of Information (NAIH)",
    "Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)",
  ],
};

interface RegulatorProfile {
  canonical_name: string;
  profile_version: string;
  jurisdiction: string;
  law_canonical: string;
  default_language: string;
  case_reference_pattern: string | null;
  currency_code: string;
  fetch_user_agent_strategy: string;
  fetch_rate_limit_ms: number;
  strategy_stack: Array<Record<string, unknown>>;
  field_recipes: Record<string, Record<string, unknown>>;
}

// ============================================================
// Helpers (duplicated from per-regulator-ingestion to keep that
// function untouched per spec).
// ============================================================

async function sha256(input: ArrayBuffer | string): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readBodyWithCap(resp: Response, cap: number, url: string): Promise<ArrayBuffer | null> {
  const reader = resp.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > cap) {
        console.warn(`[fetch] aborting ${url} — streamed ${total} bytes exceeds cap ${cap}`);
        try { await reader.cancel(); } catch { /* noop */ }
        return null;
      }
      chunks.push(value);
    }
  } catch (e) {
    console.warn(`[fetch] stream read error ${url}: ${(e as Error).message}`);
    try { await reader.cancel(); } catch { /* noop */ }
    return null;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out.buffer;
}

type FetchOutcome =
  | { kind: "ok"; status: number; html: string; bytes: ArrayBuffer; contentType: string }
  | { kind: "dead"; status: number }
  | { kind: "blocked"; status: number }
  | { kind: "timeout" }
  | { kind: "too_large"; status: number };

async function fetchSource(url: string, uaStrategy: string): Promise<FetchOutcome> {
  const tries = uaStrategy === "browser_first"
    ? [BROWSER_UA, IDENTIFYING_UA]
    : [IDENTIFYING_UA, BROWSER_UA];
  let lastStatus = 0;
  let lastErrIsTimeout = false;
  let lastErrIsBlock = false;

  for (const ua of tries) {
    try {
      const resp = await fetch(url, {
        headers: {
          "user-agent": ua,
          "accept": "text/html,application/xhtml+xml,application/xml,application/pdf,*/*;q=0.8",
          "accept-language": "en;q=0.8,*;q=0.5",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(20_000),
      });
      lastStatus = resp.status;
      if (resp.ok) {
        const ct = resp.headers.get("content-type") || "";
        const cl = parseInt(resp.headers.get("content-length") || "0", 10);
        console.log(`[fetch] url=${url} status=${resp.status} ct=${ct} cl=${cl || "?"}`);
        if (cl > MAX_RESPONSE_BYTES) {
          try { await resp.body?.cancel(); } catch { /* noop */ }
          return { kind: "too_large", status: resp.status };
        }
        const bytes = await readBodyWithCap(resp, MAX_RESPONSE_BYTES, url);
        if (!bytes) return { kind: "too_large", status: resp.status };
        const html = ct.includes("pdf") ? "" : new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        return { kind: "ok", status: resp.status, html, bytes, contentType: ct };
      }
      try { await resp.body?.cancel(); } catch { /* noop */ }
      if (resp.status === 403 || resp.status === 401 || resp.status === 429) {
        lastErrIsBlock = true;
        continue;
      }
      if (resp.status >= 400 && resp.status < 500) {
        return { kind: "dead", status: resp.status };
      }
    } catch (e) {
      const msg = (e as Error).message || "";
      console.warn(`fetch error ${url}: ${msg}`);
      if (/timeout|aborted|TimeoutError/i.test(msg)) lastErrIsTimeout = true;
      else if (/tls|certificate|unknownIssuer|handshake|WAF/i.test(msg)) lastErrIsBlock = true;
      else lastErrIsTimeout = true;
    }
  }
  if (lastErrIsBlock) return { kind: "blocked", status: lastStatus || 0 };
  if (lastErrIsTimeout) return { kind: "timeout" };
  return { kind: "dead", status: lastStatus || 0 };
}

function applyRegex(pattern: string, text: string, multiple = false): string | string[] | null {
  try {
    const re = new RegExp(pattern, multiple ? "giu" : "iu");
    if (multiple) {
      const matches = [...text.matchAll(new RegExp(pattern, "giu"))].map((m) => (m[1] ?? m[0]).trim());
      return matches.length ? Array.from(new Set(matches)).slice(0, 20) : null;
    }
    const m = text.match(re);
    if (!m) return null;
    return (m[1] ?? m[0]).trim();
  } catch (e) {
    console.warn(`regex error ${pattern}: ${(e as Error).message}`);
    return null;
  }
}

function applyCss(pattern: string, html: string): string | null {
  if (!html) return null;
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) return null;
    for (const sel of pattern.split(",").map((s) => s.trim())) {
      const el = doc.querySelector(sel) as Element | null;
      if (el && el.textContent.trim().length > 0) return el.textContent.trim().slice(0, 500);
    }
    return null;
  } catch {
    return null;
  }
}

function detectCurrency(text: string, patterns: Record<string, string>, fallback: string): string {
  for (const [needle, code] of Object.entries(patterns || {})) {
    if (text.includes(needle)) return code;
  }
  return fallback;
}

function htmlToText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function pdfBytesToText(bytes: ArrayBuffer, sourceUrl = ""): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.12.1");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    const cleaned = joined.replace(/\s+/g, " ").slice(0, 50_000).trim();
    console.log(`[PDF] url=${sourceUrl} bytes=${bytes.byteLength} extractedLen=${cleaned.length}`);
    return cleaned;
  } catch (e) {
    console.warn(`unpdf parse failed for ${sourceUrl}: ${(e as Error).message}`);
    return "";
  }
}

function parseDateLoose(s: string | null): string | null {
  if (!s) return null;
  const months: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
    juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
    gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
    luglio: 7, agosto: 8, settembre: 9, ottobre: 10, dicembre: 12,
  };
  const t = s.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/.exec(t);
  if (m) { const mo = months[m[2].toLowerCase()]; if (mo) return `${m[3]}-${String(mo).padStart(2,"0")}-${m[1].padStart(2,"0")}`; }
  m = /([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/.exec(t);
  if (m) { const mo = months[m[1].toLowerCase()]; if (mo) return `${m[3]}-${String(mo).padStart(2,"0")}-${m[2].padStart(2,"0")}`; }
  return null;
}

async function applyRecipes(
  profile: RegulatorProfile,
  text: string,
  html: string,
  llmCounter: { n: number },
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { statutory_provisions: [] };
  for (const [field, recipe] of Object.entries(profile.field_recipes || {})) {
    const m = recipe.method as string;
    const pat = recipe.pattern as string | undefined;
    const multiple = Boolean(recipe.multiple);
    let value: string | string[] | null = null;
    if (m === "regex" && pat) {
      value = applyRegex(pat, text, multiple);
    } else if (m === "css_selector" && pat) {
      value = applyCss(pat, html);
    } else if (m === "css_extract" && pat) {
      value = applyCss(pat, html);
      if (!value || (value as string).length < 20) {
        llmCounter.n++;
        const k = await extractKeyComplianceFailure(text, profile.default_language, profile.canonical_name);
        value = k.text;
      }
    } else if (m === "llm_verbatim") {
      llmCounter.n++;
      const k = await extractKeyComplianceFailure(text, profile.default_language, profile.canonical_name);
      value = k.text;
    } else if (m === "press_release_body") {
      value = text.slice(0, 1200);
    } else if (m === "profile_default") {
      value = (recipe.value as string) || profile.law_canonical;
    } else if (m === "regex_currency") {
      value = detectCurrency(text, (recipe.patterns as Record<string, string>) || {}, (recipe.default as string) || profile.currency_code);
    }
    if (Array.isArray(value)) out[field] = value;
    else if (typeof value === "string") out[field] = value;
    else out[field] = null;
  }
  return out;
}

async function enrichOne(
  supabase: ReturnType<typeof createClient>,
  rowId: string,
  sourceUrl: string,
  profile: RegulatorProfile,
  runId: string,
  llmCounter: { n: number },
  dryRun: boolean,
): Promise<{ outcome: string; confidence: "high" | "medium" | "low"; details?: Record<string, unknown> }> {
  const fr = await fetchSource(sourceUrl, profile.fetch_user_agent_strategy);

  if (fr.kind !== "ok") {
    const map: Record<string, string> = {
      dead: "corpus_url_dead",
      blocked: "corpus_url_blocked",
      timeout: "corpus_url_timeout",
      too_large: "corpus_url_too_large",
    };
    const method = map[fr.kind];
    if (!dryRun) {
      const { error } = await supabase.from("enforcement_actions").update({
        ingestion_method: method,
        ingestion_strategy_used: "corpus_enrichment",
        ingestion_run_id: runId,
        regulator_profile_version: profile.profile_version,
        regulator_canonical: profile.canonical_name,
        ingestion_confidence: "low",
      }).eq("id", rowId);
      if (error) throw new Error(`update_failed (${method}): ${error.message}`);
    }
    return { outcome: method, confidence: "low", details: { status: (fr as { status?: number }).status } };
  }

  const isPdf = fr.contentType.includes("pdf") || sourceUrl.toLowerCase().endsWith(".pdf");
  const text = isPdf ? await pdfBytesToText(fr.bytes, sourceUrl) : htmlToText(fr.html);
  const html = isPdf ? "" : fr.html;

  if (text.length < 100) {
    if (!dryRun) {
      const { error } = await supabase.from("enforcement_actions").update({
        ingestion_method: "corpus_extraction_partial",
        ingestion_strategy_used: "corpus_enrichment",
        ingestion_run_id: runId,
        regulator_profile_version: profile.profile_version,
        regulator_canonical: profile.canonical_name,
        ingestion_confidence: "low",
      }).eq("id", rowId);
      if (error) throw new Error(`update_failed (extraction_partial_short_text): ${error.message}`);
    }
    return { outcome: "corpus_extraction_partial", confidence: "low", details: { reason: "text<100chars" } };
  }

  const fields = await applyRecipes(profile, text, html, llmCounter);

  const subject = fields.subject as string | null;
  const decision_date = parseDateLoose(fields.decision_date as string | null);
  const kcf = fields.key_compliance_failure as string | null;
  const provisions = (fields.statutory_provisions as string[]) || [];
  const fineLocal = fields.fine_amount_local as string | null;
  const fineCurrency = (fields.fine_currency as string) || profile.currency_code;
  const fineEur = normaliseFineToEur(fineLocal, fineCurrency);
  const compliance = classifyComplianceFailure(kcf, provisions);
  const sector = extractSector(subject || "", text);
  const hash = await sha256(fr.bytes);

  const hasReq = !!decision_date && !!subject && !PLACEHOLDER_SUBJECTS.has((subject || "").toLowerCase()) && !!hash;
  const hasKcf = !!kcf && kcf.length > 20;
  const confidence: "high" | "medium" | "low" = !hasReq ? "low" : !hasKcf ? "medium" : "high";

  const outcome = hasReq ? "corpus_enriched" : "corpus_extraction_partial";

  const payload: Record<string, unknown> = {
    regulator_canonical: profile.canonical_name,
    ingestion_method: outcome,
    ingestion_strategy_used: "corpus_enrichment",
    ingestion_run_id: runId,
    regulator_profile_version: profile.profile_version,
    source_document_hash_at_ingest: hash,
    ingestion_confidence: confidence,
  };
  if (fineLocal) payload.fine_amount_local = fineLocal;
  if (fineCurrency) payload.fine_currency = fineCurrency;
  if (fineEur !== null && fineEur !== undefined) payload.fine_eur_equivalent = fineEur;
  if (provisions.length) payload.statutory_provisions = provisions;
  if (sector) payload.sector = sector;
  // Note: `compliance_failure` is not a column on enforcement_actions; classifier output
  // is intentionally not persisted (mirrors discovery pipeline behaviour).
  void compliance;
  if (decision_date) payload.decision_date = decision_date;
  if (fields.case_reference) payload.case_reference = fields.case_reference;
  if (subject) payload.subject = subject;

  if (kcf) {
    const { data: cur, error: selErr } = await supabase
      .from("enforcement_actions").select("key_compliance_failure").eq("id", rowId).maybeSingle();
    if (selErr) throw new Error(`select_failed: ${selErr.message}`);
    const existingLen = ((cur as { key_compliance_failure?: string } | null)?.key_compliance_failure || "").length;
    if (kcf.length > existingLen) payload.key_compliance_failure = kcf;
  }

  payload.memo_eligible = confidence === "high" && !!hash && provisions.length >= 1;

  if (!dryRun) {
    const { error: updErr } = await supabase.from("enforcement_actions").update(payload).eq("id", rowId);
    if (updErr) throw new Error(`update_failed (${outcome}): ${updErr.message}`);
  }

  return {
    outcome,
    confidence,
    details: dryRun ? { fields_extracted: Object.keys(payload).length, has_kcf: !!kcf, has_date: !!decision_date } : undefined,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.headers.get("x-admin-token") !== Deno.env.get("ADMIN_SECRET_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const regulator_canonical: string = body.regulator_canonical;
  const max_rows: number = Number(body.max_rows ?? 20);
  const offset: number = Number(body.offset ?? 0);
  const dry_run: boolean = Boolean(body.dry_run ?? false);

  if (!regulator_canonical) {
    return new Response(JSON.stringify({ error: "regulator_canonical required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: profileData, error: profErr } = await supabase
    .from("regulator_profiles").select("*")
    .eq("canonical_name", regulator_canonical).maybeSingle();
  if (profErr || !profileData) {
    return new Response(JSON.stringify({ error: "profile not found", regulator_canonical }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const profile = profileData as unknown as RegulatorProfile;

  const aliases = REGULATOR_ALIASES[regulator_canonical];
  if (!aliases || !aliases.length) {
    return new Response(JSON.stringify({ error: "no_aliases_for_regulator", regulator_canonical }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: runIns, error: runErr } = await supabase.from("ingestion_runs").insert({
    regulator_canonical,
    job_name: "enrich-legacy-corpus",
    strategy_method: "corpus_enrichment",
    notes: dry_run ? `dry_run offset=${offset} max=${max_rows}` : `live offset=${offset} max=${max_rows}`,
  }).select("id").single();
  if (runErr || !runIns) {
    return new Response(JSON.stringify({ error: "could not start run", detail: runErr?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const runId = (runIns as { id: string }).id;

  const { data: rows, error: selErr } = await supabase
    .from("enforcement_actions")
    .select("id, source_url")
    .in("regulator", aliases)
    .eq("legacy_enrichment_version", 1)
    .is("ingestion_method", null)
    .not("source_url", "is", null)
    .order("decision_date", { ascending: false, nullsFirst: false })
    .range(offset, offset + max_rows - 1);

  if (selErr) {
    return new Response(JSON.stringify({ error: "select_failed", detail: selErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const counts = {
    selected: rows?.length || 0,
    corpus_enriched: 0,
    corpus_extraction_partial: 0,
    corpus_url_dead: 0,
    corpus_url_blocked: 0,
    corpus_url_timeout: 0,
    corpus_url_too_large: 0,
    update_errors: 0,
  };
  const llmCounter = { n: 0 };
  const sampleRows: Array<Record<string, unknown>> = [];

  for (const r of rows || []) {
    const rid = (r as { id: string; source_url: string }).id;
    const url = (r as { id: string; source_url: string }).source_url;
    try {
      const res = await enrichOne(supabase, rid, url, profile, runId, llmCounter, dry_run);
      const key = res.outcome as keyof typeof counts;
      if (key in counts) (counts as Record<string, number>)[key]++;
      if (dry_run && sampleRows.length < 5) {
        sampleRows.push({ id: rid, source_url: url, outcome: res.outcome, confidence: res.confidence, details: res.details });
      }
    } catch (e) {
      counts.update_errors++;
      console.error(`enrichOne id=${rid} url=${url}: ${(e as Error).message}`);
    }
    await new Promise((res) => setTimeout(res, profile.fetch_rate_limit_ms || 1000));
  }

  await supabase.from("ingestion_runs").update({
    completed_at: new Date().toISOString(),
    rows_discovered: counts.selected,
    rows_inserted_new: 0,
    rows_matched_legacy: counts.corpus_enriched + counts.corpus_extraction_partial,
    rows_failed: counts.corpus_url_dead + counts.corpus_url_blocked + counts.corpus_url_timeout + counts.corpus_url_too_large + counts.update_errors,
    llm_calls_made: llmCounter.n,
    llm_cost_usd: Math.round(llmCounter.n * 0.0008 * 10000) / 10000,
    errors: { breakdown: counts },
    strategy_method: "corpus_enrichment",
  }).eq("id", runId);

  return new Response(JSON.stringify({
    ok: true,
    run_id: runId,
    dry_run,
    regulator_canonical,
    aliases_used: aliases,
    counts,
    llm_calls: llmCounter.n,
    sample: dry_run ? sampleRows : undefined,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
