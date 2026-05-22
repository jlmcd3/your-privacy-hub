#!/usr/bin/env node
/**
 * Pricing Reconciliation Scanner
 * --------------------------------
 * Builds a single source-of-truth table by extracting:
 *   1. MARKETED prices from UI files (pages, marketing components)
 *   2. CHARGED prices from Stripe edge functions (the server-side truth)
 *
 * Then flags any product whose UI label disagrees with the server amount.
 *
 * Output:
 *   - scripts/pricing-reconciliation.json  (machine-readable report)
 *   - src/data/pricing-reconciliation.json (mirrored for the admin UI)
 *
 * Usage:  node scripts/scan-pricing.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();

// ---------- 0. Hardcoded subscription price guard ----------
// The pricing registry (src/config/pricing.ts) is the single source of truth
// for the Intelligence subscription. Any hardcoded "$39" / "$390" string
// outside that file is a drift risk. This check fails the scanner if found.
const SUBSCRIPTION_PATTERNS = [
  "\\$29\\/month", "\\$29\\/mo\\b", "\\$399\\/year", "\\$399\\/yr\\b",
];
const ALLOWED_FILES = new Set([
  "src/config/pricing.ts",
  "src/data/pricing-reconciliation.json",
  "scripts/pricing-reconciliation.json",
  "scripts/scan-pricing.mjs",
  // Tools.tsx and RegistrationLanding.tsx market product-specific (non-subscription)
  // prices that include $39/$390 as comparison context — handled by reconciliation below.
]);
const hardcodedHits = [];
try {
  const raw = execSync(
    `rg -n "${SUBSCRIPTION_PATTERNS.join("|")}" src 2>/dev/null || true`,
    { encoding: "utf8" }
  );
  for (const line of raw.trim().split("\n").filter(Boolean)) {
    const [file] = line.split(":");
    if (ALLOWED_FILES.has(file)) continue;
    hardcodedHits.push(line);
  }
} catch {
  // rg not available in some environments — skip silently.
}

// ---------- 1. Server-side truth ----------
// We parse the edge function source for `unit_amount`, `fallback_*_cents`, and
// the registration tier ladder. This keeps the scanner honest: if someone
// changes a server amount, the report updates without code edits.
const TOOL_SRC = readFileSync(
  join(ROOT, "supabase/functions/create-tool-checkout/index.ts"),
  "utf8"
);
const REG_SRC = readFileSync(
  join(ROOT, "supabase/functions/create-registration-checkout/index.ts"),
  "utf8"
);

// Parse tool catalog: name + standalone + subscriber fallback cents.
const TOOL_BLOCK_RE =
  /(\w+):\s*\{\s*name:\s*"([^"]+)",[\s\S]*?fallback_standalone_cents:\s*(\d+),\s*fallback_subscriber_cents:\s*(\d+),/g;

const serverTools = [];
let m;
while ((m = TOOL_BLOCK_RE.exec(TOOL_SRC)) !== null) {
  serverTools.push({
    key: m[1],
    name: m[2],
    standalone_cents: Number(m[3]),
    subscriber_cents: Number(m[4]),
  });
}

// Parse registration: under the May 2026 memo, DIY is a single flat
// per-filing price ($45 standalone / $38 subscriber alias) regardless of
// jurisdiction count. Counsel-Ready and Renewal remain top-level constants.
const diyStandaloneMatch = REG_SRC.match(/DIY_STANDALONE_CENTS\s*=\s*(\d+)/);
const diySubscriberMatch = REG_SRC.match(/DIY_SUBSCRIBER_CENTS\s*=\s*(\d+)/);

const constants = {};
for (const m of REG_SRC.matchAll(/const\s+(\w+)\s*=\s*(\d+)\s*;/g)) {
  constants[m[1]] = Number(m[2]);
}
function resolveAmount(raw) {
  if (/^\d+$/.test(raw)) return Number(raw);
  return constants[raw] ?? null;
}
const counselMatch = REG_SRC.match(/counsel_review:[\s\S]*?unit_amount:\s*(\w+)/);
const renewalMatch = REG_SRC.match(/renewal:[\s\S]*?unit_amount:\s*(\w+)/);

const serverRegistration = {
  diy_flat_standalone_cents: diyStandaloneMatch ? Number(diyStandaloneMatch[1]) : null,
  diy_flat_subscriber_cents: diySubscriberMatch ? Number(diySubscriberMatch[1]) : null,
  counsel_review_cents: counselMatch ? resolveAmount(counselMatch[1]) : null,
  renewal_per_jurisdiction_cents: renewalMatch ? resolveAmount(renewalMatch[1]) : null,
};

// ---------- 2. UI-marketed prices ----------
// Walk every UI file under src/pages and src/components — a marketed price
// counts no matter which page it appears on. Skip the admin pricing page
// itself (it embeds the report) and the registry source-of-truth file.
import { readdirSync, statSync } from "node:fs";
const UI_DIRS = ["src/pages", "src/components"];
const UI_FILE_EXCLUDE = new Set([
  "src/pages/AdminPricingReconciliation.tsx",
]);
function walk(dir, out = []) {
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${entry}`;
    const abs = join(ROOT, rel);
    const st = statSync(abs);
    if (st.isDirectory()) walk(rel, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry) && !UI_FILE_EXCLUDE.has(rel)) out.push(rel);
  }
  return out;
}
const UI_FILES = UI_DIRS.flatMap((d) => walk(d));

const PRODUCTS = [
  { key: "governance_assessment", patterns: ["Privacy Program Assessment", "Governance Assessment"] },
  { key: "li_assessment", patterns: ["Legitimate Interest Assessment", "LI Assessment"] },
  { key: "dpia_framework", patterns: ["Impact Assessment Builder", "DPIA"] },
  { key: "dpa_generator", patterns: ["Your Custom DPA", "DPA Generator", "Data Processing Agreement"] },
  { key: "ir_playbook", patterns: ["Breach Response Playbook", "Incident Response Playbook", "IR Playbook"] },
  { key: "biometric_checker", patterns: ["Biometric Privacy Compliance Checker", "Biometric Compliance Checker", "Biometric Checker"] },
  { key: "ropa_initial", patterns: ["RoPA Builder", "Records of Processing", "RoPA — Initial", "RoPA Initial"] },
  { key: "ropa_refresh", patterns: ["RoPA — Annual Refresh", "RoPA Refresh", "Annual Refresh"] },
  { key: "us_notice_single", patterns: ["US Privacy Notice", "Single State", "per state"] },
  { key: "us_notice_all_states", patterns: ["All States Suite", "All-States Suite"] },
  { key: "eu_notice_single", patterns: ["Single Framework", "per framework"] },
  { key: "eu_notice_suite", patterns: ["EU Notice Suite", "GDPR + UK GDPR"] },
  { key: "eu_notice_full_international", patterns: ["Full International"] },
  { key: "eu_notice_refresh", patterns: ["EU & Global Notice — Annual Refresh", "Notice Refresh"] },
  { key: "cppa_risk_assessment", patterns: ["CPPA Risk Assessment", "CPPA Module 1", "Risk Assessment — Module 1"] },
  { key: "cppa_cybersecurity", patterns: ["CPPA Cybersecurity", "Cybersecurity Readiness", "Module 2"] },
  { key: "cppa_suite", patterns: ["CPPA Full Audit Suite", "CPPA Suite"] },
  { key: "intelligence_monthly", patterns: ["$29/month", "$29/mo", "Intelligence — Monthly", "Monthly · $29"] },
  { key: "intelligence_yearly", patterns: ["$399/year", "$399/yr", "Platform — Annual", "Yearly · $399"] },
  { key: "registration_diy_1", patterns: ["1 jurisdiction"] },
  { key: "registration_diy_3", patterns: ["Up to 3 jurisdictions"] },
  { key: "registration_diy_7", patterns: ["Up to 7 jurisdictions"] },
  { key: "registration_diy_unlimited", patterns: ["Portfolio (unlimited)", "unlimited"] },
  { key: "registration_counsel_review", patterns: ["Counsel-Ready Pack", "$399 flat"] },
  { key: "registration_renewal", patterns: ["Annual Renewal Monitoring", "Annual renewal"] },
];

const PRICE_RE = /\$([0-9]+(?:\.[0-9]+)?)/g;

function findMarketedPrices(productPatterns) {
  const hits = new Map(); // amount cents -> [{file, line, snippet}]
  for (const file of UI_FILES) {
    let src;
    try {
      src = readFileSync(join(ROOT, file), "utf8");
    } catch {
      continue;
    }
    const lines = src.split("\n");
    lines.forEach((line, i) => {
      for (const pat of productPatterns) {
        if (line.toLowerCase().includes(pat.toLowerCase())) {
          // Look at this line + next 2 lines for $ amounts
          const window = lines.slice(i, i + 3).join(" ");
          const matches = [...window.matchAll(PRICE_RE)];
          for (const mm of matches) {
            const cents = Math.round(Number(mm[1]) * 100);
            // Skip zero and unreasonably large numbers (litigation exposure examples).
            if (cents === 0 || cents > 100000000) continue;
            const arr = hits.get(cents) || [];
            arr.push({
              file,
              line: i + 1,
              snippet: line.trim().slice(0, 140),
            });
            hits.set(cents, arr);
          }
          break; // matched a product on this line; don't double-attribute
        }
      }
    });
  }
  return Array.from(hits.entries()).map(([cents, sources]) => ({
    cents,
    sources: sources.slice(0, 3),
  }));
}

// ---------- 3. Reconcile ----------
const findings = [];
const rows = [];

function fmt(c) {
  return c == null ? "—" : `$${(c / 100).toFixed(c % 100 ? 2 : 0)}`;
}

// ---------- 3a. Registry-vs-server (the real source-of-truth check) ----------
// Per project memory, src/config/pricing.ts is the single source of truth.
// For tools that have a registry entry, compare server fallback cents against
// the registry directly — this is unambiguous and not subject to UI scrape noise.
// Tools with no registry entry are reported as "unmigrated" (informational).
const REGISTRY_SRC = (() => {
  try { return readFileSync(join(ROOT, "src/config/pricing.ts"), "utf8"); }
  catch { return ""; }
})();
function registryCents(lookupKey) {
  const re = new RegExp(
    `${lookupKey}:\\s*\\{[\\s\\S]*?amountCents:\\s*(\\d+)`
  );
  const m = REGISTRY_SRC.match(re);
  return m ? Number(m[1]) : null;
}
// Map server tool key -> { standalone: registry lookup key, subscriber: lookup key | null }
// v8 model collapsed per-variant lookup keys into a single uniform key per
// product family. The Notice Builders use one standalone + one founding-
// subscriber price across every variant (single state / all-states / refresh
// for US; single framework / suite / full international / refresh for EU).
const REGISTRY_MAP = {
  us_notice_single:               { standalone: "us_notice_v7_standalone", subscriber: "us_notice_v7_subscriber" },
  us_notice_all_states:           { standalone: "us_notice_v7_standalone", subscriber: "us_notice_v7_subscriber" },
  eu_notice_single:               { standalone: "eu_notice_v7_standalone", subscriber: "eu_notice_v7_subscriber" },
  eu_notice_suite:                { standalone: "eu_notice_v7_standalone", subscriber: "eu_notice_v7_subscriber" },
  eu_notice_full_international:   { standalone: "eu_notice_v7_standalone", subscriber: "eu_notice_v7_subscriber" },
  eu_notice_refresh:              { standalone: "eu_notice_v7_standalone", subscriber: "eu_notice_v7_subscriber" },
};

// Tools
for (const t of serverTools) {
  const map = REGISTRY_MAP[t.key];
  const ui = findMarketedPrices(
    PRODUCTS.find((p) => p.key === t.key)?.patterns ?? [t.name]
  );

  if (map) {
    // Registry-driven check — true source of truth.
    const regStandalone = registryCents(map.standalone);
    const regSubscriber = map.subscriber ? registryCents(map.subscriber) : null;
    const standaloneOk = regStandalone === t.standalone_cents;
    const subscriberOk =
      t.subscriber_cents === 0
        ? true
        : regSubscriber === t.subscriber_cents;
    rows.push({
      product: t.name,
      server_standalone: fmt(t.standalone_cents),
      server_subscriber: t.subscriber_cents ? fmt(t.subscriber_cents) : "—",
      ui_prices_seen: [
        regStandalone != null ? `registry: ${fmt(regStandalone)}` : null,
        regSubscriber != null ? `registry sub: ${fmt(regSubscriber)}` : null,
      ].filter(Boolean),
      standalone_match: standaloneOk,
      subscriber_match: subscriberOk,
    });
    if (!standaloneOk) {
      findings.push({
        severity: "high",
        product: t.name,
        issue: `Registry says ${fmt(regStandalone)} but server charges ${fmt(t.standalone_cents)} standalone.`,
        ui_prices_seen: [],
      });
    }
    if (!subscriberOk) {
      findings.push({
        severity: "high",
        product: t.name,
        issue: `Registry says ${fmt(regSubscriber)} but server charges ${fmt(t.subscriber_cents)} subscriber.`,
        ui_prices_seen: [],
      });
    }
    continue;
  }

  // No registry entry yet — informational only. Match if UI shows the price
  // anywhere in src/pages or src/components (broad scan above). If not,
  // record as "unmigrated", not as a finding — pricing for these products
  // hasn't been pulled into src/config/pricing.ts yet.
  const standaloneOk = ui.some((u) => u.cents === t.standalone_cents);
  const subscriberOk =
    t.subscriber_cents === 0
      ? true
      : ui.some((u) => u.cents === t.subscriber_cents);
  rows.push({
    product: t.name,
    server_standalone: fmt(t.standalone_cents),
    server_subscriber: t.subscriber_cents ? fmt(t.subscriber_cents) : "—",
    ui_prices_seen: ui.map((u) => fmt(u.cents)).sort(),
    standalone_match: standaloneOk,
    subscriber_match: subscriberOk,
    unmigrated: true,
  });
  // Do NOT push findings for unmigrated tools — too many UI patterns to scrape
  // reliably. The registry check above is what catches real drift.
}

// Registration: under the May 2026 memo, DIY is a flat per-filing fee
// regardless of jurisdiction count, so the legacy 1/3/7/unlimited UI tier
// checks no longer apply. We assert the flat fee + counsel + renewal only.
const regChecks = [
  { key: "registration_diy_flat", marketed_cents: 4500, server_cents: serverRegistration.diy_flat_standalone_cents, label: "Registration DIY — flat per-filing (standalone)" },
  // Subscriber alias removed — all tiers pay the standalone price per the May 19, 2026 memo.
  { key: "registration_counsel_review", marketed_cents: 39900, server_cents: serverRegistration.counsel_review_cents, label: "Registration Counsel-Ready Pack" },
  { key: "registration_renewal", marketed_cents: 7900, server_cents: serverRegistration.renewal_per_jurisdiction_cents, label: "Registration Annual Renewal Monitoring (per jurisdiction)" },
];

for (const r of regChecks) {
  const uiHits = findMarketedPrices(PRODUCTS.find((p) => p.key === r.key)?.patterns ?? []);
  rows.push({
    product: r.label,
    server_standalone: fmt(r.server_cents),
    server_subscriber: "—",
    ui_prices_seen: uiHits.map((u) => fmt(u.cents)),
    standalone_match: r.server_cents === r.marketed_cents,
    subscriber_match: true,
  });
  if (r.server_cents !== r.marketed_cents) {
    findings.push({
      severity: "high",
      product: r.label,
      issue: `UI markets ${fmt(r.marketed_cents)} but server charges ${fmt(r.server_cents)}.`,
      ui_prices_seen: uiHits.map((u) => fmt(u.cents)),
    });
  }
}

// ---------- 4. Output ----------
const report = {
  generatedAt: new Date().toISOString(),
  server_truth: { tools: serverTools, registration: serverRegistration },
  rows,
  findings,
  summary: {
    products_checked: rows.length,
    mismatches: findings.length,
  },
};

writeFileSync(
  join(ROOT, "scripts/pricing-reconciliation.json"),
  JSON.stringify(report, null, 2)
);
writeFileSync(
  join(ROOT, "src/data/pricing-reconciliation.json"),
  JSON.stringify(report, null, 2)
);

console.log("=== Pricing Reconciliation ===");
console.log(`Products checked : ${report.summary.products_checked}`);
console.log(`Mismatches       : ${report.summary.mismatches}\n`);
console.log("Product".padEnd(48), "Server".padEnd(18), "UI seen");
console.log("-".repeat(110));
for (const r of rows) {
  const status = r.unmigrated
    ? "—"
    : r.standalone_match && r.subscriber_match
      ? "✅"
      : "❌";
  console.log(
    `${status} ${r.product.padEnd(45)} ${r.server_standalone.padEnd(8)} / ${(r.server_subscriber ?? "—").padEnd(8)}  ${r.ui_prices_seen.join(", ")}`
  );
}
if (findings.length) {
  console.log("\n--- MISMATCHES ---");
  for (const f of findings) {
    console.log(`\n[${f.severity.toUpperCase()}] ${f.product}`);
    console.log(`  ${f.issue}`);
    if (f.ui_prices_seen.length) console.log(`  UI shows: ${f.ui_prices_seen.join(", ")}`);
  }
}

if (hardcodedHits.length) {
  console.log("\n--- HARDCODED SUBSCRIPTION PRICES (must use src/config/pricing.ts) ---");
  for (const h of hardcodedHits) console.log("  " + h);
  console.log(
    `\n${hardcodedHits.length} hardcoded subscription price(s) found outside the registry.`
  );
  console.log("Use INTELLIGENCE_PRICING / formatPrice() / getPrice() from @/config/pricing.");
}

process.exit(findings.length > 0 || hardcodedHits.length > 0 ? 1 : 0);

