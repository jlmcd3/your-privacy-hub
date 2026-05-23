#!/usr/bin/env node
/**
 * Verifies every officialUrl in src/data/lawRegistry.ts is reachable.
 *
 * Usage:
 *   node scripts/verify-law-urls.mjs            # check all, print report
 *   node scripts/verify-law-urls.mjs --write    # also patch verifiedAt timestamps in registry
 *
 * Exits non-zero if any URL fails so CI can gate.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(__dirname, "../src/data/lawRegistry.ts");
const WRITE = process.argv.includes("--write");
const TIMEOUT_MS = 12000;

const src = readFileSync(REGISTRY_PATH, "utf8");

// Parse entries: name + officialUrl pairs in declaration order.
const nameRe = /name:\s*"([^"]+)"/g;
const urlRe = /officialUrl:\s*"([^"]+)"/g;
const names = [...src.matchAll(nameRe)].map((m) => m[1]);
const urls = [...src.matchAll(urlRe)].map((m) => m[1]);
if (names.length !== urls.length) {
  console.error(`Parse mismatch: ${names.length} names vs ${urls.length} urls`);
  process.exit(2);
}

async function probe(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let r = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "EndUserPrivacy-LinkVerifier/1.0" },
    });
    // Some gov servers reject HEAD; fall back to GET.
    if (r.status === 405 || r.status === 403 || r.status >= 500) {
      r = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "user-agent": "EndUserPrivacy-LinkVerifier/1.0" },
      });
    }
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, status: 0, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

const now = new Date().toISOString();
const results = await Promise.all(
  urls.map(async (url, i) => ({ name: names[i], url, ...(await probe(url)) }))
);

let okCount = 0;
let failCount = 0;
for (const r of results) {
  const icon = r.ok ? "✓" : "✗";
  console.log(`${icon} [${r.status || "ERR"}] ${r.name}\n    ${r.url}${r.error ? `\n    ${r.error}` : ""}`);
  if (r.ok) okCount++;
  else failCount++;
}
console.log(`\n${okCount} ok, ${failCount} failed of ${results.length}`);

if (WRITE) {
  let patched = src;
  for (const r of results) {
    if (!r.ok) continue;
    // Replace the verifiedAt that immediately follows this entry's officialUrl.
    const escUrl = r.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const entryRe = new RegExp(
      `(officialUrl:\\s*"${escUrl}",\\s*verifiedAt:\\s*)(?:null|"[^"]*")`,
      "m"
    );
    patched = patched.replace(entryRe, `$1"${now}"`);
  }
  writeFileSync(REGISTRY_PATH, patched);
  console.log(`\nPatched registry with verifiedAt=${now} for ${okCount} entries.`);
}

process.exit(failCount > 0 ? 1 : 0);
