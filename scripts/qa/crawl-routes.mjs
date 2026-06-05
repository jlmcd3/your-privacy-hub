#!/usr/bin/env node
/**
 * Static route crawler for EndUserPrivacy.com.
 *
 * - Enumerates static routes from src/App.tsx (skips dynamic :param routes).
 * - Adds a small sample of dynamic routes (jurisdictions, glossary, timelines).
 * - Fetches each URL, records status, final URL, title, h1 count, meta description,
 *   canonical, and JSON-LD presence.
 *
 * Usage: BASE_URL=https://enduserprivacy.com node scripts/qa/crawl-routes.mjs
 * Output: scripts/qa/crawl-report.json
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const BASE = (process.env.BASE_URL || "https://enduserprivacy.com").replace(/\/$/, "");
const OUT = resolve(__dirname, "crawl-report.json");
const CONCURRENCY = 8;
const TIMEOUT_MS = 15000;

// --- 1. Enumerate routes ----------------------------------------------------
const app = readFileSync(resolve(ROOT, "src/App.tsx"), "utf8");
const routeMatches = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
const staticRoutes = [
  ...new Set(routeMatches.filter((r) => !r.includes(":") && !r.includes("*"))),
];

// Admin routes are intentionally excluded from public crawl
const PUBLIC_ROUTES = staticRoutes.filter((r) => !r.startsWith("/admin"));

// Sample dynamic routes (read from data files)
const samples = [];
try {
  const j = readFileSync(resolve(ROOT, "src/data/globe_jurisdictions.ts"), "utf8");
  const slugs = [...j.matchAll(/slug:\s*["']([^"']+)["']/g)].map((m) => m[1]).slice(0, 8);
  samples.push(...slugs.map((s) => `/jurisdiction/${s}`));
} catch {}
try {
  // Sample glossary slugs from the glossary file if available
  const g = readFileSync(resolve(ROOT, "src/pages/Glossary.tsx"), "utf8");
  const slugs = [...g.matchAll(/slug:\s*["']([^"']+)["']/g)].map((m) => m[1]).slice(0, 5);
  samples.push(...slugs.map((s) => `/glossary/${s}`));
} catch {}

const ALL = [...PUBLIC_ROUTES, ...samples];

console.log(`[crawl] base=${BASE}  routes=${ALL.length}`);

// --- 2. Crawl ----------------------------------------------------------------
async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

function parsePage(html) {
  const titleM = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const descM = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const canM = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const jsonLd = (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) || []).length;
  return {
    title: titleM ? titleM[1].trim() : null,
    titleLen: titleM ? titleM[1].trim().length : 0,
    metaDescription: descM ? descM[1].trim() : null,
    metaDescLen: descM ? descM[1].trim().length : 0,
    canonical: canM ? canM[1] : null,
    h1Count,
    jsonLdBlocks: jsonLd,
  };
}

async function crawl(route) {
  const url = BASE + route;
  const started = Date.now();
  try {
    const res = await fetchWithTimeout(url, { headers: { "user-agent": "EUP-QA-Crawler/1.0" } });
    const html = await res.text();
    const parsed = parsePage(html);
    const issues = [];
    if (res.status >= 400) issues.push(`status_${res.status}`);
    if (!parsed.title) issues.push("missing_title");
    else if (parsed.titleLen > 60) issues.push("title_too_long");
    if (parsed.h1Count === 0) issues.push("missing_h1");
    if (parsed.h1Count > 1) issues.push("multiple_h1");
    if (!parsed.metaDescription) issues.push("missing_meta_description");
    else if (parsed.metaDescLen < 50 || parsed.metaDescLen > 160) issues.push("meta_desc_length");
    if (!parsed.canonical) issues.push("missing_canonical");

    return {
      route,
      url,
      status: res.status,
      finalUrl: res.url,
      redirected: res.url !== url,
      durationMs: Date.now() - started,
      html, // kept transient for downstream link audit
      ...parsed,
      issues,
    };
  } catch (err) {
    return {
      route,
      url,
      status: 0,
      error: String(err?.message || err),
      durationMs: Date.now() - started,
      issues: ["fetch_failed"],
    };
  }
}

async function runPool(items, worker, n) {
  const results = new Array(items.length);
  let idx = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (true) {
        const i = idx++;
        if (i >= items.length) return;
        results[i] = await worker(items[i]);
        if ((i + 1) % 10 === 0) console.log(`[crawl]   ${i + 1}/${items.length}`);
      }
    })
  );
  return results;
}

const results = await runPool(ALL, crawl, CONCURRENCY);

// --- 3. Persist (strip html before writing report) ---------------------------
mkdirSync(dirname(OUT), { recursive: true });
const reportable = results.map(({ html, ...rest }) => rest);
const failing = reportable.filter((r) => r.issues && r.issues.length);
const broken = reportable.filter((r) => !r.status || r.status >= 400);

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  totals: {
    crawled: results.length,
    broken: broken.length,
    withIssues: failing.length,
  },
  broken,
  withIssues: failing.filter((r) => r.status && r.status < 400),
  all: reportable,
};
writeFileSync(OUT, JSON.stringify(report, null, 2));

// Also write raw HTML cache for downstream link auditor
const cachePath = resolve(__dirname, "crawl-html.json");
writeFileSync(
  cachePath,
  JSON.stringify(
    results
      .filter((r) => r.html)
      .map((r) => ({ route: r.route, url: r.finalUrl || r.url, html: r.html })),
    null,
    2
  )
);

console.log(
  `[crawl] done. broken=${broken.length} issues=${failing.length}. report=${OUT}`
);
if (broken.length) {
  console.log("[crawl] BROKEN ROUTES:");
  for (const b of broken) console.log(`  ${b.status || "ERR"}  ${b.url}  ${b.error || ""}`);
}
process.exit(broken.length ? 1 : 0);
