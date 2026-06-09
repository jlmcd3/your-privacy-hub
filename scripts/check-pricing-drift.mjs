#!/usr/bin/env node
/**
 * Pricing drift check (v7).
 *
 * Compares three sources of truth and fails (non-zero exit) on divergence:
 *
 *   1. UI / canonical PRICING            src/config/pricing.ts
 *      └─ PRICING.tools[*].dollars        — what intake pages display
 *      └─ INTELLIGENCE / PROFESSIONAL     — subscription product prices
 *      └─ toolDiscount                    — 0.20 / 0.25
 *
 *   2. get-tool-price edge function      supabase/functions/get-tool-price/index.ts
 *      └─ TOOLS[*].fallback_standalone_cents / fallback_subscriber_cents
 *
 *   3. create-tool-checkout edge fn      supabase/functions/create-tool-checkout/index.ts
 *      └─ TOOLS[*].fallback_standalone_cents / fallback_subscriber_cents
 *
 * Also flags:
 *   • Stripe Price ID placeholders (REPLACE_WITH_...) in PRICING — counted
 *     but not fatal unless `--require-stripe` is passed.
 *   • Missing slug coverage (canonical tool present in PRICING but absent
 *     from either edge function, or vice versa).
 *
 * Optional remote check: pass `--remote=https://<project>.supabase.co` to
 * also call the deployed get-tool-price function for every slug and verify
 * the cents it returns match the canonical PRICING.
 *
 * Usage:
 *   node scripts/check-pricing-drift.mjs
 *   node scripts/check-pricing-drift.mjs --require-stripe
 *   node scripts/check-pricing-drift.mjs --remote=https://tvksbtrelpzhbyeutzgp.supabase.co
 *
 * Exit codes:
 *   0  — all sources agree
 *   1  — drift detected
 *   2  — could not parse a source file (treat as fatal in CI)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const argv = process.argv.slice(2);
const requireStripe = argv.includes("--require-stripe");
const remoteArg = argv.find((a) => a.startsWith("--remote="));
const remoteBase = remoteArg ? remoteArg.split("=")[1].replace(/\/$/, "") : null;

const errors = [];
const warnings = [];
const errs = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ─── Slug → canonical PRICING.tools key ──────────────────────────────────
// CPPA suite is the sum of cppaRisk + cppaCyber (no dedicated PRICING key).
const SLUG_TO_TOOL_KEY = {
  li_assessment:                "lia",
  li_analyzer:                  "lia",
  governance_assessment:        "governance",
  healthcheck:                  "governance",
  dpia_framework:               "dpia",
  dpia_builder:                 "dpia",
  ropa_initial:                 "ropa",
  ropa_refresh:                 "ropa",
  us_notice_single:             "usNotice",
  us_notice_all_states:         "usNotice",
  us_notice_refresh:            "usNotice",
  eu_notice_single:             "euNotice",
  eu_notice_suite:              "euNotice",
  eu_notice_full_international: "euNotice",
  eu_notice_refresh:            "euNotice",
  cppa_risk_assessment:         "cppaRisk",
  cppa_cybersecurity:           "cppaCyber",
  cppa_suite:                   "__suite__",
  dpa_generator:                "dpa",
  ir_playbook:                  "irPlaybook",
  biometric_checker:            "biometric",
};

// ─── Parse src/config/pricing.ts ─────────────────────────────────────────
function readFile(rel) {
  const p = path.join(repoRoot, rel);
  if (!fs.existsSync(p)) {
    console.error(`✖ Missing file: ${rel}`);
    process.exit(2);
  }
  return fs.readFileSync(p, "utf8");
}

function parseCanonical() {
  const src = readFile("src/config/pricing.ts");

  // Tool dollar amounts: `cppaRisk: { name: '...', dollars: 60, ...`
  const toolRe = /(\w+)\s*:\s*\{\s*name:\s*'[^']+',\s*dollars:\s*(\d+)[\s\S]*?stripePriceId:\s*('[^']+'|null)/g;
  const tools = {};
  let m;
  const toolsBlock = src.match(/tools:\s*\{([\s\S]+?)\n\s*\},?\s*\}\s*as const/);
  if (!toolsBlock) {
    errs("[canonical] could not locate PRICING.tools block in src/config/pricing.ts");
  } else {
    while ((m = toolRe.exec(toolsBlock[1])) !== null) {
      tools[m[1]] = {
        dollars: Number(m[2]),
        stripePriceId: m[3] === "null" ? null : m[3].slice(1, -1),
      };
    }
  }

  // Discount percentages — v8 model only checks the founding-promo rates.
  // Memo (May 2026): no permanent structural subscriber discount. Only
  // founding subscribers (founding_subscriber=true) get 20% off Smart
  // Tools / 15% off Convenience Tools.

  return { tools };
}

// Tool classification — must match SMART_TOOL_KEYS / CONVENIENCE_TOOL_KEYS
// in src/config/pricing.ts.
const SMART_TOOL_KEYS = new Set([
  "governance", "lia", "dpia", "cppaRisk", "cppaCyber", "dpa", "biometric",
]);
const CONVENIENCE_TOOL_KEYS = new Set([
  "irPlaybook", "usNotice", "euNotice", "ropa", "registration",
]);

// ─── Parse edge-function TOOLS table ─────────────────────────────────────
function parseEdgeFunction(rel) {
  const src = readFile(rel);
  const block = src.match(/const TOOLS[^{]*\{([\s\S]+?)\n\};/);
  if (!block) {
    errs(`[${rel}] could not locate TOOLS table`);
    return {};
  }
  const entryRe = /(\w+):\s*\{[\s\S]*?fallback_standalone_cents:\s*(\d+),[\s\S]*?fallback_subscriber_cents:\s*(\d+)/g;
  const out = {};
  let m;
  while ((m = entryRe.exec(block[1])) !== null) {
    out[m[1]] = { standalone: Number(m[2]), subscriber: Number(m[3]) };
  }
  return out;
}

// ─── Canonical price lookup for a slug (June 2026 — Sprint 4 reconciliation) ─
// Subscriber per-use prices come from PRICING_REGISTRY *_subscriber* entries.
// CPPA tools intentionally carry a subscriber discount; mirror those amounts
// here so the drift check accepts them as canonical (rather than flagging the
// intentional gap between standalone and subscriber rates).
// All values in cents. Tools not listed → subscriber == standalone.
const SUBSCRIBER_OVERRIDE_CENTS = {
  li_assessment:        3500,   // li_subscriber_v2
  li_analyzer:          3500,   // alias of li_assessment
  governance_assessment: 2500,  // hc_subscriber_v2
  healthcheck:          2500,   // alias of governance_assessment
  dpia_framework:       4900,   // dpia_subscriber_v2
  dpia_builder:         4900,   // alias of dpia_framework
  dpa_generator:        4900,   // dpa_subscriber_v2
  cppa_risk_assessment: 7900,   // cppa_risk_subscriber
  cppa_cybersecurity:   8900,   // cppa_cyber_subscriber
};

// cppa_suite is its own PRICING_REGISTRY entry: $169 standalone / $149 subscriber.
const SUITE_STANDALONE_CENTS = 16900;
const SUITE_SUBSCRIBER_CENTS = 14900;

function canonicalCentsForSlug(slug, canonical) {
  const key = SLUG_TO_TOOL_KEY[slug];
  if (!key) return null;
  let standaloneDollars;
  if (key === "__suite__") {
    return { standalone: SUITE_STANDALONE_CENTS, subscriber: SUITE_SUBSCRIBER_CENTS };
  }
  if (!canonical.tools[key]) return null;
  standaloneDollars = canonical.tools[key].dollars;
  const standalone = standaloneDollars * 100;
  const subscriber = SUBSCRIBER_OVERRIDE_CENTS[slug] ?? standalone;
  return { standalone, subscriber };
}



// ─── Compare ─────────────────────────────────────────────────────────────
function compareEdge(label, edge, canonical) {
  for (const [slug, edgePrice] of Object.entries(edge)) {
    const expected = canonicalCentsForSlug(slug, canonical);
    if (!expected) {
      errs(`[${label}] slug "${slug}" not mapped to any canonical PRICING.tools key`);
      continue;
    }
    if (edgePrice.standalone !== expected.standalone) {
      errs(
        `[${label}] ${slug}: standalone ${edgePrice.standalone}¢ ≠ canonical ${expected.standalone}¢ ` +
          `(${edgePrice.standalone / 100} vs ${expected.standalone / 100} USD)`,
      );
    }
    if (edgePrice.subscriber !== expected.subscriber) {
      errs(
        `[${label}] ${slug}: subscriber ${edgePrice.subscriber}¢ ≠ canonical ${expected.subscriber}¢ ` +
          `(${edgePrice.subscriber / 100} vs ${expected.subscriber / 100} USD @ subscriber rate)`,
      );
    }
  }
  // Coverage: every slug we know about should exist in this edge function.
  for (const slug of Object.keys(SLUG_TO_TOOL_KEY)) {
    // checkout doesn't have a `healthcheck`/`li_analyzer` alias — only get-tool-price does.
    if (label.includes("create-tool-checkout") && (slug === "healthcheck" || slug === "li_analyzer" || slug === "dpia_builder")) {
      continue;
    }
    if (!edge[slug]) warn(`[${label}] missing slug "${slug}" in TOOLS table`);
  }
}

function checkStripeIds(canonical) {
  const missing = [];
  for (const [k, v] of Object.entries(canonical.tools)) {
    if (!v.stripePriceId || v.stripePriceId.startsWith("REPLACE_WITH_")) missing.push(k);
  }
  if (missing.length) {
    const msg = `[stripe] ${missing.length} tool(s) still use placeholder Stripe Price IDs: ${missing.join(", ")}`;
    if (requireStripe) errs(msg);
    else warn(msg);
  }
}

async function checkRemote(canonical) {
  if (!remoteBase) return;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!anonKey) {
    warn("[remote] --remote supplied but SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY not set; skipping live check");
    return;
  }
  const slugs = Object.keys(SLUG_TO_TOOL_KEY).filter(
    (s) => s !== "healthcheck" && s !== "li_analyzer" && s !== "dpia_builder",
  );
  await Promise.all(
    slugs.map(async (slug) => {
      try {
        const url = `${remoteBase}/functions/v1/get-tool-price?tool_slug=${encodeURIComponent(slug)}`;
        const res = await fetch(url, { headers: { apikey: anonKey } });
        if (!res.ok) {
          errs(`[remote] ${slug}: HTTP ${res.status}`);
          return;
        }
        const data = await res.json();
        const expected = canonicalCentsForSlug(slug, canonical);
        if (!expected) return;
        const stand = data.standalone_amount_cents ?? data.amount_cents;
        const sub = data.subscriber_amount_cents;
        if (typeof stand === "number" && stand !== expected.standalone) {
          errs(`[remote] ${slug}: standalone ${stand}¢ ≠ canonical ${expected.standalone}¢`);
        }
        if (typeof sub === "number" && sub !== expected.subscriber) {
          errs(`[remote] ${slug}: subscriber ${sub}¢ ≠ canonical ${expected.subscriber}¢`);
        }
      } catch (e) {
        errs(`[remote] ${slug}: ${e.message}`);
      }
    }),
  );
}

// ─── Run ─────────────────────────────────────────────────────────────────
const canonical = parseCanonical();
const getToolPrice = parseEdgeFunction("supabase/functions/get-tool-price/index.ts");
const createCheckout = parseEdgeFunction("supabase/functions/create-tool-checkout/index.ts");

compareEdge("get-tool-price", getToolPrice, canonical);
compareEdge("create-tool-checkout", createCheckout, canonical);
checkStripeIds(canonical);
await checkRemote(canonical);

// ─── Report ──────────────────────────────────────────────────────────────
console.log("\n── Pricing drift check (v7) ──");
console.log(`Canonical tools parsed: ${Object.keys(canonical.tools).length}`);
console.log(`get-tool-price slugs:   ${Object.keys(getToolPrice).length}`);
console.log(`create-tool-checkout:   ${Object.keys(createCheckout).length}`);
if (remoteBase) console.log(`Remote checked:         ${remoteBase}`);

if (warnings.length) {
  console.log("\nWarnings:");
  for (const w of warnings) console.log("  ⚠ " + w);
}

if (errors.length) {
  console.log("\nErrors:");
  for (const e of errors) console.log("  ✖ " + e);
  console.log(`\n✖ ${errors.length} drift error(s) detected.`);
  process.exit(1);
}

console.log("\n✓ All pricing sources agree.");
process.exit(0);
