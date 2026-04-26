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
import { join } from "node:path";

const ROOT = process.cwd();

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

// Parse registration tiers.
// Capture the diy ladder: lines like `if (numJurisdictions <= N) return NNNN;`
// plus the final fallback `return NNNN;` for unlimited.
const diyLadder = [...REG_SRC.matchAll(/<=\s*(\d+)\)\s*return\s+(\d+)/g)].map(
  (x) => ({ jurisdictions_max: Number(x[1]), cents: Number(x[2]) })
);
const diyFallbackMatch = REG_SRC.match(
  /function\s+diyPriceCents[\s\S]*?return\s+(\d+);\s*\n\s*\}/
);
const diyDefault = diyFallbackMatch ? Number(diyFallbackMatch[1]) : null;

// Resolve top-level numeric constants (e.g. `const COUNSEL_REVIEW_CENTS = 39900;`)
// so we can look up `unit_amount: COUNSEL_REVIEW_CENTS` references too.
const constants: Record<string, number> = {};
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
  diy_ladder: diyLadder,
  diy_unlimited_cents: diyDefault,
  counsel_review_cents: counselMatch ? resolveAmount(counselMatch[1]) : null,
  renewal_per_jurisdiction_cents: renewalMatch ? resolveAmount(renewalMatch[1]) : null,
};

// ---------- 2. UI-marketed prices ----------
// Light-weight scan: a product is identified by its display name; we record
// every $-amount that appears within ~120 chars of that name.
const UI_FILES = [
  "src/pages/Tools.tsx",
  "src/pages/Subscribe.tsx",
  "src/pages/RegistrationLanding.tsx",
  "src/components/home/ProToolsBanner.tsx",
  "src/components/home/RegistrationManagerBanner.tsx",
  "src/components/home/ChooseYourMode.tsx",
];

const PRODUCTS = [
  { key: "governance_assessment", patterns: ["Privacy Program Assessment Tool"] },
  { key: "li_assessment", patterns: ["Legitimate Interest Assessment Tool"] },
  { key: "dpia_framework", patterns: ["Impact Assessment Builder"] },
  { key: "dpa_generator", patterns: ["Your Custom DPA"] },
  { key: "ir_playbook", patterns: ["Your Breach Response Playbook"] },
  { key: "biometric_checker", patterns: ["Biometric Privacy Compliance Checker", "Biometric Compliance Checker"] },
  { key: "professional_monthly", patterns: ["$29/month", "$29/mo", "Monthly · $29", "Professional — $29"] },
  { key: "professional_yearly", patterns: ["$290/year", "$290/yr", "Yearly · $290"] },
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

// Tools
for (const t of serverTools) {
  const ui = findMarketedPrices(
    PRODUCTS.find((p) => p.key === t.key)?.patterns ?? [t.name]
  );
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
  });
  if (!standaloneOk) {
    findings.push({
      severity: "high",
      product: t.name,
      issue: `Server charges ${fmt(t.standalone_cents)} standalone, but UI never shows that price.`,
      ui_prices_seen: ui.map((u) => fmt(u.cents)),
    });
  }
  if (!subscriberOk) {
    findings.push({
      severity: "high",
      product: t.name,
      issue: `Server charges ${fmt(t.subscriber_cents)} subscriber, but UI never shows that price.`,
      ui_prices_seen: ui.map((u) => fmt(u.cents)),
    });
  }
}

// Registration: compare each marketed tier against the server ladder.
const regChecks = [
  { key: "registration_diy_1", marketed_cents: 5900, server_cents: serverRegistration.diy_ladder.find((l) => l.jurisdictions_max === 1)?.cents, label: "Registration DIY — 1 jurisdiction" },
  { key: "registration_diy_3", marketed_cents: 14900, server_cents: serverRegistration.diy_ladder.find((l) => l.jurisdictions_max === 3)?.cents, label: "Registration DIY — up to 3 jurisdictions" },
  { key: "registration_diy_7", marketed_cents: 27500, server_cents: null /* server has no 7-tier */, label: "Registration DIY — up to 7 jurisdictions" },
  { key: "registration_diy_unlimited", marketed_cents: 49900, server_cents: serverRegistration.diy_unlimited_cents, label: "Registration DIY — unlimited" },
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
  const status = r.standalone_match && r.subscriber_match ? "✅" : "❌";
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

process.exit(findings.length > 0 ? 1 : 0);
