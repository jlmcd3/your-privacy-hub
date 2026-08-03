// Source document fetcher with 7-day cache, robots.txt respect, retries,
// HTML→text + PDF→text extraction. Used by verification-scan.
//
// Returns FetcherResult. Never throws — all errors map to status fields.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type FetcherResult = {
  status: "ok" | "fail" | "skipped";
  content_text?: string;
  content_hash?: string;
  content_type?: string;
  http_status?: number;
  reason?: string;
  fetched_from_cache?: boolean;
};

const IDENTIFYING_UA =
  "EUP-Verification-Scanner/1.0 (support@enduserprivacy.com)";
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const USER_AGENT = IDENTIFYING_UA; // backward-compatible alias
const COMMON_HEADERS: Record<string, string> = {
  "Accept":
    "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
  "Accept-Language":
    "en-US,en;q=0.9,es;q=0.8,fr;q=0.7,de;q=0.7,it;q=0.7,nl;q=0.7,pl;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
};
const BLOCKED_STATUS_CODES = [403, 429, 451];
const MAX_PDF_CHARS = 50_000;
const FETCH_TIMEOUT_MS = 30_000;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

export async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      redirect: "follow",
    });
  } finally {
    clearTimeout(t);
  }
}

async function fetchWithUaStrategy(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const first = await fetchWithTimeout(
    url,
    { headers: { ...COMMON_HEADERS, "User-Agent": IDENTIFYING_UA } },
    timeoutMs,
  );
  if (!BLOCKED_STATUS_CODES.includes(first.status)) return first;
  // Identifying UA blocked. Wait 10s, retry with browser UA.
  await new Promise((r) => setTimeout(r, 10_000));
  return await fetchWithTimeout(
    url,
    { headers: { ...COMMON_HEADERS, "User-Agent": BROWSER_UA } },
    timeoutMs,
  );
}


// PASS B (2026-08-03) — RFC 9309 robots.txt matcher.
//
// The previous parser produced false `robots_disallow` verdicts, which is a
// large share of the stranded doc-less population:
//   (1) it ignored `Allow:` entirely, so `Disallow: /` + `Allow: /decyzje/`
//       (the shape uodo.gov.pl and several DPAs publish) blocked everything;
//   (2) it had no wildcard support, so `Disallow: /*?print` was treated as a
//       literal prefix and matched nothing, while `Disallow: /*` matched
//       nothing either;
//   (3) it accumulated Disallow lines from EVERY group whose header happened
//       to precede them, instead of selecting one group;
//   (4) it re-fetched robots.txt for every single URL on the same host.
//
// RFC 9309 semantics implemented here: pick the most specific matching group
// (our UA name, else `*`), support `*` and `$`, and let the LONGEST matching
// rule win, with Allow beating Disallow on an equal-length tie. Fail-open on
// any error or timeout, per the original contract. Decisions are memoised per
// origin for the lifetime of the isolate.
type RobotsRule = { allow: boolean; pattern: string };
const robotsCache = new Map<string, RobotsRule[] | null>();

function robotsPatternToRegex(pattern: string): RegExp {
  let src = "";
  for (const ch of pattern) {
    if (ch === "*") src += ".*";
    else if (ch === "$") src += "$";
    else src += ch.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp("^" + src);
}

/** Effective length of a rule for RFC 9309 longest-match precedence. */
function ruleLength(pattern: string): number {
  return pattern.replace(/\$$/, "").length;
}

function parseRobots(text: string): RobotsRule[] {
  const groups: Array<{ agents: string[]; rules: RobotsRule[] }> = [];
  let current: { agents: string[]; rules: RobotsRule[] } | null = null;
  let expectingAgents = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const m = line.match(/^(User-agent|Disallow|Allow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();

    if (key === "user-agent") {
      if (!current || !expectingAgents) {
        current = { agents: [], rules: [] };
        groups.push(current);
        expectingAgents = true;
      }
      if (val) current.agents.push(val.toLowerCase());
      continue;
    }
    if (!current) continue;
    expectingAgents = false;
    // An empty Disallow value means "allow everything" and carries no rule.
    if (!val) continue;
    current.rules.push({ allow: key === "allow", pattern: val });
  }

  const ua = IDENTIFYING_UA.split("/")[0].toLowerCase(); // "eup-verification-scanner"
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  const wildcard = groups.filter((g) => g.agents.includes("*"));
  const chosen = specific.length > 0 ? specific : wildcard;
  return chosen.flatMap((g) => g.rules);
}

async function robotsRulesFor(origin: string): Promise<RobotsRule[] | null> {
  if (robotsCache.has(origin)) return robotsCache.get(origin) ?? null;
  let rules: RobotsRule[] | null = null;
  try {
    const res = await fetchWithTimeout(
      `${origin}/robots.txt`,
      { headers: { ...COMMON_HEADERS, "User-Agent": IDENTIFYING_UA } },
      5_000,
    );
    // 4xx/5xx robots.txt means "no restrictions known" — fail open.
    rules = res.ok ? parseRobots(await res.text()) : null;
  } catch {
    rules = null;
  }
  robotsCache.set(origin, rules);
  return rules;
}

async function robotsAllows(targetUrl: string): Promise<boolean> {
  try {
    const u = new URL(targetUrl);
    const rules = await robotsRulesFor(u.origin);
    if (!rules || rules.length === 0) return true;

    const path = u.pathname + (u.search ?? "");
    let best: { allow: boolean; len: number } | null = null;
    for (const rule of rules) {
      if (!robotsPatternToRegex(rule.pattern).test(path)) continue;
      const len = ruleLength(rule.pattern);
      if (!best || len > best.len || (len === best.len && rule.allow)) {
        best = { allow: rule.allow, len };
      }
    }
    return best ? best.allow : true;

  } catch {
    return true;
  }
}

function htmlToText(html: string): string {
  // Remove script/style, then strip tags, collapse whitespace.
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pdfToText(bytes: Uint8Array): Promise<string> {
  // unpdf is a serverless-friendly PDF text extractor (Deno/Edge compatible,
  // no canvas/DOMMatrix polyfills required).
  const { extractText, getDocumentProxy } = await import(
    "https://esm.sh/unpdf@0.12.1"
  );
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  const joined = Array.isArray(text) ? text.join("\n") : String(text ?? "");
  return joined.slice(0, MAX_PDF_CHARS).trim();
}

export async function fetchSourceDocument(
  url: string,
): Promise<FetcherResult> {
  if (!url || !/^https?:\/\//i.test(url)) {
    return { status: "fail", reason: "invalid_url" };
  }

  // 1. Cache
  try {
    const { data: cached } = await sb
      .from("source_document_cache")
      .select("content_text, content_hash, content_type, expires_at")
      .eq("source_url", url)
      .maybeSingle();
    if (cached && new Date(cached.expires_at) > new Date()) {
      return {
        status: "ok",
        content_text: cached.content_text,
        content_hash: cached.content_hash,
        content_type: cached.content_type,
        fetched_from_cache: true,
      };
    }
  } catch {
    // ignore cache errors
  }

  // 2. robots.txt
  if (!(await robotsAllows(url))) {
    return { status: "skipped", reason: "robots_disallow" };
  }

  // 3. HTTP GET with retries
  const backoffs = [0, 1_000, 4_000, 16_000];
  let lastErr: unknown = null;
  let res: Response | null = null;
  for (let i = 0; i < backoffs.length; i++) {
    if (backoffs[i]) await new Promise((r) => setTimeout(r, backoffs[i]));
    try {
      res = await fetchWithUaStrategy(url);
      if (res.status >= 500) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      break;
    } catch (e) {
      lastErr = e;
      continue;
    }
  }
  if (!res) {
    return {
      status: "fail",
      reason: "fetch_error",
      http_status: 0,
    };
  }
  if (res.status >= 400) {
    return {
      status: "fail",
      reason: "http_error",
      http_status: res.status,
    };
  }

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  let contentText = "";
  let contentTypeShort = "text/html";

  try {
    if (ct.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
      contentTypeShort = "application/pdf";
      const buf = new Uint8Array(await res.arrayBuffer());
      try {
        contentText = await pdfToText(buf);
      } catch (e) {
        return {
          status: "skipped",
          reason: "pdf_parse_failed",
          content_type: contentTypeShort,
        };
      }
    } else if (ct.includes("text/html") || ct === "" || ct.includes("xhtml")) {
      contentTypeShort = "text/html";
      const html = await res.text();
      // Heuristic: detect a SPA shell with very little body text.
      contentText = htmlToText(html);
      if (contentText.length < 400 && /id=["']root["']|<noscript>/i.test(html)) {
        return {
          status: "skipped",
          reason: "js_required",
          content_type: contentTypeShort,
        };
      }
    } else if (ct.includes("text/plain")) {
      contentTypeShort = "text/plain";
      contentText = (await res.text()).slice(0, MAX_PDF_CHARS);
    } else {
      return {
        status: "skipped",
        reason: "unsupported_content_type",
        content_type: ct || "unknown",
      };
    }
  } catch (e) {
    return {
      status: "fail",
      reason: `parse_error:${(e as Error).message}`.slice(0, 200),
    };
  }

  if (!contentText.trim()) {
    return {
      status: "fail",
      reason: "empty_content",
      content_type: contentTypeShort,
    };
  }

  const hash = await sha256(contentText);

  // Cache write (best-effort)
  try {
    await sb.from("source_document_cache").upsert(
      {
        source_url: url,
        content_hash: hash,
        content_text: contentText,
        content_type: contentTypeShort,
        fetched_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      },
      { onConflict: "source_url" },
    );
  } catch {
    // ignore cache write failure
  }

  return {
    status: "ok",
    content_text: contentText,
    content_hash: hash,
    content_type: contentTypeShort,
    fetched_from_cache: false,
  };
}
