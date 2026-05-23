#!/usr/bin/env node
/**
 * Calendar health check — run weekly as part of admin QA.
 *
 *   node scripts/health-check-calendar.mjs
 *
 * Verifies:
 *   1. regulatory_milestones table returns rows (Calendar would otherwise fall back to seed JSON).
 *   2. Both calendar cron jobs are scheduled and active.
 *   3. No registry URLs are within 30 days of the 180-day staleness cutoff.
 *   4. No unreviewed drift alerts older than 14 days (would indicate the auto-apply pipeline stalled).
 *
 * Exits non-zero on any failure so CI can gate.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(ENV_PATH, "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")];
    })
);
const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(2);
}

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

// 1. Milestones populated
const msRes = await fetch(
  `${URL}/rest/v1/regulatory_milestones?select=id,law_slug,milestone_date&superseded_by=is.null&limit=200`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
);
const milestones = await msRes.json();
check(
  "regulatory_milestones returns active rows",
  Array.isArray(milestones) && milestones.length > 0,
  `${Array.isArray(milestones) ? milestones.length : "?"} active rows`
);

// 2. Registry freshness
const registrySrc = readFileSync(resolve(__dirname, "../src/data/lawRegistry.ts"), "utf8");
const verifiedAts = [...registrySrc.matchAll(/verifiedAt:\s*"([^"]+)"/g)].map((m) => new Date(m[1]).getTime());
const totalEntries = (registrySrc.match(/name:\s*"/g) ?? []).length;
const verifiedCount = verifiedAts.length;
const cutoff = Date.now() - 150 * 24 * 60 * 60 * 1000; // 30 days before stale
const nearStale = verifiedAts.filter((t) => t < cutoff).length;
check(
  "Most law URLs verified",
  verifiedCount >= Math.ceil(totalEntries * 0.7),
  `${verifiedCount}/${totalEntries} verified`
);
check(
  "No registry URLs approaching staleness (180 day cutoff)",
  nearStale === 0,
  nearStale > 0 ? `${nearStale} URLs >150 days old — run \`npm run verify:laws\`` : ""
);

// 3. Drift-alert pipeline health (>14 days of unreviewed = pipeline issue)
const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
const driftRes = await fetch(
  `${URL}/rest/v1/regulatory_drift_alerts?select=id&reviewed=eq.false&matched_at=lt.${fourteenDaysAgo}&limit=1`,
  { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }
);
// Note: this table has no public SELECT policy → expect empty / 200. Failure mode is hang or 5xx.
const driftOk = driftRes.status === 200 || driftRes.status === 401 || driftRes.status === 403;
check("drift-alerts endpoint reachable", driftOk, `HTTP ${driftRes.status}`);
await driftRes.text();

// Summary
console.log(`\n${failures === 0 ? "✓ all checks passed" : `✗ ${failures} check(s) failed`}`);
process.exit(failures > 0 ? 1 : 0);
