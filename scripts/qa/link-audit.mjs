#!/usr/bin/env node
/**
 * Link auditor — consumes scripts/qa/crawl-html.json, extracts every href,
 * verifies internal links (must 2xx/3xx) and external links (HEAD with GET fallback).
 *
 * Output: scripts/qa/link-report.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.BASE_URL || "https://enduserprivacy.com").replace(/\/$/, "");
const IN = resolve(__dirname, "crawl-html.json");
const OUT = resolve(__dirname, "link-report.json");
const CONCURRENCY = 10;
const TIMEOUT_MS = 12000;

const pages = JSON.parse(readFileSync(IN, "utf8"));
console.log(`[link] pages=${pages.length}`);

// Extract hrefs
const linkMap = new Map(); // url -> Set<sourceRoute>
const HREF_RE = /<a\b[^>]*\bhref=["']([^"']+)["']/gi;

for (const page of pages) {
  for (const m of page.html.matchAll(HREF_RE)) {
    let href = m[1].trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    // Resolve relative
    let abs;
    try {
      abs = new URL(href, page.url).toString();
    } catch {
      continue;
    }
    // Drop fragments
    abs = abs.split("#")[0];
    if (!linkMap.has(abs)) linkMap.set(abs, new Set());
    linkMap.get(abs).add(page.route);
  }
}

const links = [...linkMap.keys()];
console.log(`[link] unique links=${links.length}`);

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

async function check(url) {
  const isInternal = url.startsWith(BASE);
  try {
    // HEAD first (many CDNs return 200)
    let res = await fetchWithTimeout(url, { method: "HEAD", headers: { "user-agent": "EUP-QA-LinkAudit/1.0" } });
    if (res.status === 405 || res.status === 403 || res.status >= 500) {
      res = await fetchWithTimeout(url, { method: "GET", headers: { "user-agent": "EUP-QA-LinkAudit/1.0" } });
      await res.text().catch(() => "");
    }
    return { url, status: res.status, finalUrl: res.url, internal: isInternal };
  } catch (err) {
    return { url, status: 0, error: String(err?.message || err), internal: isInternal };
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
        if ((i + 1) % 25 === 0) console.log(`[link]   ${i + 1}/${items.length}`);
      }
    })
  );
  return results;
}

const checked = await runPool(links, check, CONCURRENCY);

const broken = checked
  .filter((r) => !r.status || r.status >= 400)
  .map((r) => ({ ...r, sources: [...linkMap.get(r.url)] }));

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  totals: {
    unique: links.length,
    broken: broken.length,
    brokenInternal: broken.filter((b) => b.internal).length,
    brokenExternal: broken.filter((b) => !b.internal).length,
  },
  broken,
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`[link] done. broken=${broken.length}  internal=${report.totals.brokenInternal}  external=${report.totals.brokenExternal}`);
if (report.totals.brokenInternal) {
  console.log("[link] BROKEN INTERNAL LINKS:");
  for (const b of broken.filter((x) => x.internal)) {
    console.log(`  ${b.status || "ERR"}  ${b.url}  from: ${b.sources.slice(0, 3).join(", ")}`);
  }
}
process.exit(report.totals.brokenInternal ? 1 : 0);
