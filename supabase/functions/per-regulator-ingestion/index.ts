// Per-regulator ingestion runner.
// Loads regulator_profiles, walks strategy_stack, fetches listing/detail pages,
// extracts fields via regex/CSS/LLM, classifies, normalises currency, matches
// or inserts into enforcement_actions, and records counts in ingestion_runs.
//
// Body: { regulator_canonical: string, max_rows?: number, dry_run?: boolean }
// Auth: Admin only via x-admin-token header matching ADMIN_SECRET_TOKEN.
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

interface RegulatorProfile {
  canonical_name: string;
  profile_version: string;
  jurisdiction: string;
  regulatory_family: string[];
  law_canonical: string;
  default_language: string;
  case_reference_pattern: string | null;
  currency_code: string;
  fetch_user_agent_strategy: string;
  fetch_rate_limit_ms: number;
  respect_robots_txt: boolean;
  strategy_stack: Array<Record<string, unknown>>;
  field_recipes: Record<string, Record<string, unknown>>;
}

interface ExtractedRow {
  source_url: string;
  case_reference: string | null;
  decision_date: string | null;
  subject: string | null;
  fine_amount_local: string | null;
  fine_currency: string | null;
  statutory_provisions: string[];
  key_compliance_failure: string | null;
  compliance_failure: string | null;
  sector: string | null;
  fine_eur_equivalent: number | null;
  law: string;
  regulator: string;
  regulator_canonical: string;
  jurisdiction: string;
  source_document_hash_at_ingest: string | null;
  ingestion_confidence: "high" | "medium" | "low";
  ingestion_method: string;
  ingestion_strategy_used: string;
  ingestion_run_id: string;
  regulator_profile_version: string;
  memo_eligible: boolean;
}

async function sha256(input: ArrayBuffer | string): Promise<string> {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function politeFetch(
  url: string,
  uaStrategy: string,
): Promise<{ ok: boolean; status: number; html: string; bytes: ArrayBuffer | null; contentType: string; fetchedUa: string }> {
  const tries = uaStrategy === "browser_first"
    ? [BROWSER_UA, IDENTIFYING_UA]
    : [IDENTIFYING_UA, BROWSER_UA];
  let last: Response | null = null;
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
      last = resp;
      if (resp.ok) {
        const ct = resp.headers.get("content-type") || "";
        const bytes = await resp.arrayBuffer();
        let html = "";
        if (!ct.includes("pdf")) {
          html = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        }
        return { ok: true, status: resp.status, html, bytes, contentType: ct, fetchedUa: ua };
      }
    } catch (e) {
      console.warn(`fetch error ${url}: ${(e as Error).message}`);
    }
  }
  return { ok: false, status: last?.status ?? 0, html: "", bytes: null, contentType: "", fetchedUa: "" };
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

// PDF text extraction via unpdf (Deno-compatible, no canvas deps).
async function pdfBytesToText(bytes: ArrayBuffer, sourceUrl = ""): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.12.1");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    const joined = Array.isArray(text) ? text.join("\n") : String(text ?? "");
    const cleaned = joined.replace(/\s+/g, " ").slice(0, 50_000).trim();
    console.log(`[PDF] url=${sourceUrl} bytes=${bytes.byteLength} extractedLen=${cleaned.length} head500="${cleaned.substring(0, 500)}"`);
    return cleaned;
  } catch (e) {
    console.warn(`unpdf parse failed for ${sourceUrl}: ${(e as Error).message}`);
    return "";
  }
}

interface LinkFilterOpts {
  pathFilter?: string;       // regex string applied to pathname
  hrefFilter?: string;       // regex string applied to raw href (before URL resolution)
  pathRegex?: string;        // regex string applied to resolved pathname (alt for pathFilter)
  minPathSegments?: number;  // min non-empty path segments
  excludeBaseUrl?: boolean;  // skip URLs whose pathname+search equals base
}

function extractLinks(html: string, baseUrl: string, selector?: string, opts: LinkFilterOpts = {}): string[] {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return [];
  const out: string[] = [];
  let basePath = "";
  let baseFull = "";
  try {
    const bu = new URL(baseUrl);
    basePath = bu.pathname;
    baseFull = bu.origin + bu.pathname + bu.search;
  } catch { /* noop */ }
  const compileRe = (s?: string) => { try { return s ? new RegExp(s, "i") : null; } catch { return null; } };
  const pathRe = compileRe(opts.pathFilter);
  const hrefRe = compileRe(opts.hrefFilter);
  const pathRegexRe = compileRe(opts.pathRegex);
  const els = selector ? doc.querySelectorAll(selector) : doc.querySelectorAll("a[href]");
  els.forEach((el) => {
    const hrefRaw = (el as Element).getAttribute("href");
    if (!hrefRaw) return;
    const href = hrefRaw.trim();
    if (!href) return;
    if (href.startsWith("#")) return;
    if (/^javascript:/i.test(href)) return;
    if (/^mailto:|^tel:/i.test(href)) return;
    if (hrefRe && !hrefRe.test(href)) return;
    try {
      const u = new URL(href, baseUrl);
      u.hash = "";
      if (u.pathname === basePath && !u.search) return;
      if (opts.excludeBaseUrl && (u.origin + u.pathname + u.search) === baseFull) return;
      if (opts.minPathSegments !== undefined) {
        const segs = u.pathname.split("/").filter(Boolean).length;
        if (segs < opts.minPathSegments) return;
      }
      if (pathRe && !pathRe.test(u.pathname)) return;
      if (pathRegexRe && !pathRegexRe.test(u.pathname)) return;
      out.push(u.toString());
    } catch { /* skip */ }
  });
  return Array.from(new Set(out));
}


function extractRssItems(xml: string): Array<{ link: string; title: string; pubDate?: string }> {
  if (!xml) return [];
  const items: Array<{ link: string; title: string; pubDate?: string }> = [];
  const itemRe = /<item\b[\s\S]*?<\/item>|<entry\b[\s\S]*?<\/entry>/g;
  for (const block of xml.match(itemRe) || []) {
    const link = /<link[^>]*?>([^<]+)<\/link>|<link[^>]*href="([^"]+)"/i.exec(block);
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(block);
    const date = /<pubDate[^>]*>([^<]+)<\/pubDate>|<updated[^>]*>([^<]+)<\/updated>/i.exec(block);
    const linkVal = (link?.[1] || link?.[2] || "").trim();
    if (linkVal) {
      items.push({
        link: linkVal,
        title: (title?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        pubDate: date?.[1] || date?.[2],
      });
    }
  }
  return items;
}

async function discoverDetailUrls(
  strategy: Record<string, unknown>,
  profile: RegulatorProfile,
  max: number,
): Promise<string[]> {
  const base = strategy.base_url as string;
  if (!base) return [];
  const method = strategy.method as string;
  const fmt = (strategy.format as string) || "html";
  const selector = strategy.list_selector as string | undefined;
  const urls: string[] = [];

  if (method === "rss_feed" || method === "rss_check" || fmt === "rss") {
    const r = await politeFetch(base, profile.fetch_user_agent_strategy);
    if (!r.ok) return [];
    return extractRssItems(r.html).slice(0, max).map((i) => i.link);
  }

  if (method === "press_release_browse" && (strategy.year_range as number[] | undefined)) {
    const [start, end] = strategy.year_range as [number, number];
    for (let y = end; y >= start && urls.length < max; y--) {
      const url = base.replace("{YYYY}", String(y));
      const r = await politeFetch(url, profile.fetch_user_agent_strategy);
      if (!r.ok) continue;
      for (const u of extractLinks(r.html, url)) {
        if (!urls.includes(u)) urls.push(u);
        if (urls.length >= max) break;
      }
      await new Promise((res) => setTimeout(res, profile.fetch_rate_limit_ms));
    }
    return urls;
  }

  // Default: paginated or single-page HTML listing
  const pattern = (strategy.url_pattern as string | undefined);
  const pages = pattern ? 3 : 1;
  const allowCross = Boolean(strategy.allow_cross_origin);
  const linkOpts: LinkFilterOpts = {
    pathFilter: strategy.path_filter as string | undefined,
    hrefFilter: strategy.href_filter as string | undefined,
    pathRegex: strategy.path_regex as string | undefined,
    minPathSegments: strategy.min_path_segments as number | undefined,
    excludeBaseUrl: Boolean(strategy.exclude_base_url),
  };

  for (let p = 0; p < pages && urls.length < max; p++) {
    const url = pattern ? base + pattern.replace("{N}", String(p)) : base;
    const r = await politeFetch(url, profile.fetch_user_agent_strategy);
    if (!r.ok) break;
    const links = extractLinks(r.html, url, selector, linkOpts);
    for (const u of links) {
      try {
        if (allowCross) {
          if (!urls.includes(u)) urls.push(u);
        } else {
          const baseHost = new URL(base).host;
          const uH = new URL(u).host;
          if (uH && baseHost && uH.endsWith(baseHost.split(".").slice(-2).join("."))) {
            if (!urls.includes(u)) urls.push(u);
          }
        }
      } catch { /* skip */ }
      if (urls.length >= max) break;
    }
    if (urls.length > 0 && p === 0) {
      console.log(`[discover] ${profile.canonical_name} found ${urls.length} URLs, first: ${urls[0]}`);
    }
    await new Promise((res) => setTimeout(res, profile.fetch_rate_limit_ms));
  }
  return urls;
}

async function extractRow(
  detailUrl: string,
  profile: RegulatorProfile,
  strategy: Record<string, unknown>,
  runId: string,
  llmCounter: { n: number },
): Promise<ExtractedRow | null> {
  const r = await politeFetch(detailUrl, profile.fetch_user_agent_strategy);
  if (!r.ok || !r.bytes) return null;
  const isPdf = (r.contentType.includes("pdf")) || detailUrl.toLowerCase().endsWith(".pdf");
  const text = isPdf ? await pdfBytesToText(r.bytes) : htmlToText(r.html);
  const html = isPdf ? "" : r.html;
  if (text.length < 100) return null;

  const recipes = profile.field_recipes;
  const row: Partial<ExtractedRow> = {
    source_url: detailUrl,
    statutory_provisions: [],
    ingestion_strategy_used: (strategy.name as string) || (strategy.method as string),
    ingestion_method: strategy.method as string,
    regulator_profile_version: profile.profile_version,
    ingestion_run_id: runId,
  };

  for (const [field, recipe] of Object.entries(recipes)) {
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
    if (Array.isArray(value)) {
      (row as Record<string, unknown>)[field] = value;
    } else if (typeof value === "string") {
      (row as Record<string, unknown>)[field] = value;
    } else {
      (row as Record<string, unknown>)[field] = null;
    }
  }

  // Post-extraction deterministic fields
  row.law = profile.law_canonical;
  row.regulator = profile.canonical_name;
  row.regulator_canonical = profile.canonical_name;
  row.jurisdiction = profile.jurisdiction;
  row.sector = extractSector(row.subject as string || "", text);
  row.fine_currency = (row.fine_currency as string) || profile.currency_code;
  row.fine_eur_equivalent = normaliseFineToEur(row.fine_amount_local as string | null, row.fine_currency as string);
  row.compliance_failure = classifyComplianceFailure(
    row.key_compliance_failure as string | null,
    (row.statutory_provisions as string[]) || [],
  );
  row.source_document_hash_at_ingest = await sha256(r.bytes);

  // Normalise decision_date (try ISO; otherwise leave as raw — DB column is date)
  const isoDate = parseDateLoose(row.decision_date as string | null);
  row.decision_date = isoDate;

  // Confidence
  const isAggregator = (strategy.method as string) === "aggregator" || Boolean(strategy.allow_cross_origin);
  const confOverride = strategy.confidence_override as ("high" | "medium" | "low" | undefined);
  const hasReq = !!row.decision_date && !!row.subject &&
    !PLACEHOLDER_SUBJECTS.has((row.subject as string).toLowerCase()) &&
    !!row.source_url && !!row.source_document_hash_at_ingest;
  const hasKcf = !!row.key_compliance_failure && (row.key_compliance_failure as string).length > 20;
  const computed = isAggregator ? "medium" : !hasReq ? "low" : !hasKcf ? "medium" : "high";
  row.ingestion_confidence = confOverride || computed;

  row.memo_eligible = row.ingestion_method !== null &&
    row.ingestion_confidence === "high" &&
    !!row.source_url &&
    !!row.source_document_hash_at_ingest &&
    ((row.statutory_provisions as string[])?.length ?? 0) >= 1;

  return row as ExtractedRow;
}

function parseDateLoose(s: string | null): string | null {
  if (!s) return null;
  const months: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    janvier: 1, février: 2, mars: 3, avril: 4, mai: 5, juin: 6,
    juillet: 7, août: 8, septembre: 9, octobre: 10, novembre: 11, décembre: 12,
    gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
    luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre_it: 11, dicembre: 12,
  };
  const t = s.trim();
  // YYYY-MM-DD
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // DD/MM/YYYY or DD.MM.YYYY
  m = /(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/.exec(t);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  // YYYY.MM.DD.
  m = /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/.exec(t);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  // D Month YYYY (multilingual)
  m = /(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/.exec(t);
  if (m) {
    const mo = months[m[2].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  // Month DD, YYYY
  m = /([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/.exec(t);
  if (m) {
    const mo = months[m[1].toLowerCase()];
    if (mo) return `${m[3]}-${String(mo).padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  }
  return null;
}

async function matchAndWrite(
  supabase: ReturnType<typeof createClient>,
  row: ExtractedRow,
  dryRun: boolean,
): Promise<"matched" | "inserted" | "skipped"> {
  if (dryRun) return "skipped";
  // Match by case_reference first, then subject+date, then source_url
  let existing: { id: string } | null = null;
  if (row.case_reference) {
    const { data } = await supabase.from("enforcement_actions").select("id")
      .eq("case_reference", row.case_reference).limit(1).maybeSingle();
    if (data) existing = data as { id: string };
  }
  if (!existing && row.subject && row.decision_date) {
    const { data } = await supabase.from("enforcement_actions").select("id")
      .ilike("subject", row.subject.slice(0, 60)).eq("decision_date", row.decision_date).limit(1).maybeSingle();
    if (data) existing = data as { id: string };
  }
  if (!existing && row.source_url) {
    const { data } = await supabase.from("enforcement_actions").select("id")
      .eq("source_url", row.source_url).limit(1).maybeSingle();
    if (data) existing = data as { id: string };
  }

  const payload: Record<string, unknown> = {
    regulator_canonical: row.regulator_canonical,
    regulator: row.regulator,
    jurisdiction: row.jurisdiction,
    law: row.law,
    subject: row.subject,
    decision_date: row.decision_date,
    source_url: row.source_url,
    case_reference: row.case_reference,
    statutory_provisions: row.statutory_provisions,
    fine_amount_local: row.fine_amount_local,
    fine_currency: row.fine_currency,
    fine_eur_equivalent: row.fine_eur_equivalent,
    key_compliance_failure: row.key_compliance_failure,
    compliance_failure: row.compliance_failure,
    sector: row.sector,
    source_document_hash_at_ingest: row.source_document_hash_at_ingest,
    ingestion_method: row.ingestion_method,
    ingestion_strategy_used: row.ingestion_strategy_used,
    ingestion_run_id: row.ingestion_run_id,
    regulator_profile_version: row.regulator_profile_version,
    ingestion_confidence: row.ingestion_confidence,
    memo_eligible: row.memo_eligible,
  };

  if (existing) {
    // Do not overwrite a longer existing key_compliance_failure with shorter
    const { data: cur } = await supabase.from("enforcement_actions")
      .select("key_compliance_failure").eq("id", existing.id).maybeSingle();
    if (cur && (cur.key_compliance_failure || "").length > (row.key_compliance_failure || "").length) {
      delete payload.key_compliance_failure;
    }
    await supabase.from("enforcement_actions").update(payload).eq("id", existing.id);
    return "matched";
  }
  await supabase.from("enforcement_actions").insert(payload);
  return "inserted";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminToken = req.headers.get("x-admin-token");
  if (adminToken !== Deno.env.get("ADMIN_SECRET_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const regulator_canonical: string | undefined = body.regulator_canonical;
  const max_rows: number = Number(body.max_rows ?? 5);
  const dry_run: boolean = body.dry_run !== false;

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

  const { data: runIns, error: runErr } = await supabase.from("ingestion_runs").insert({
    regulator_canonical,
    strategy_method: (profile.strategy_stack[0]?.method as string) || "unknown",
    notes: dry_run ? "dry_run" : "live",
  }).select("id").single();
  if (runErr || !runIns) {
    return new Response(JSON.stringify({ error: "could not start run", detail: runErr?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const runId = (runIns as { id: string }).id;

  const errors: Array<Record<string, unknown>> = [];
  let discovered = 0, matched = 0, inserted = 0, failed = 0;
  const rows: ExtractedRow[] = [];
  const llmCounter = { n: 0 };
  let strategyUsed = "none";

  for (const strategy of profile.strategy_stack) {
    try {
      const urls = await discoverDetailUrls(strategy, profile, max_rows * 2);
      if (!urls.length) {
        errors.push({ strategy: strategy.name, error: "no_urls_discovered" });
        continue;
      }
      strategyUsed = (strategy.name as string) || (strategy.method as string);
      for (const u of urls.slice(0, max_rows)) {
        discovered++;
        try {
          const row = await extractRow(u, profile, strategy, runId, llmCounter);
          if (!row) { failed++; errors.push({ url: u, error: "extract_returned_null" }); continue; }
          rows.push(row);
          const outcome = await matchAndWrite(supabase, row, dry_run);
          if (outcome === "matched") matched++;
          else if (outcome === "inserted") inserted++;
        } catch (e) {
          failed++;
          errors.push({ url: u, error: (e as Error).message });
        }
        await new Promise((res) => setTimeout(res, profile.fetch_rate_limit_ms));
      }
      if (rows.length > 0) break; // first strategy that returns rows wins
    } catch (e) {
      errors.push({ strategy: strategy.name, error: (e as Error).message });
    }
  }

  await supabase.from("ingestion_runs").update({
    completed_at: new Date().toISOString(),
    rows_discovered: discovered,
    rows_matched_legacy: matched,
    rows_inserted_new: inserted,
    rows_failed: failed,
    llm_calls_made: llmCounter.n,
    llm_cost_usd: Math.round(llmCounter.n * 0.00025 * 10000) / 10000,
    errors,
    strategy_method: strategyUsed,
  }).eq("id", runId);

  return new Response(JSON.stringify({
    ok: true,
    run_id: runId,
    dry_run,
    regulator_canonical,
    strategy_used: strategyUsed,
    counts: { discovered, matched, inserted, failed, llm_calls: llmCounter.n },
    rows: dry_run ? rows : undefined,
    errors,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
