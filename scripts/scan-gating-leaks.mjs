#!/usr/bin/env node
/**
 * Gating Leak Scanner
 * --------------------
 * Cross-references three signals across the codebase:
 *   1) Route-level protection (ProtectedRoute wrappers in src/App.tsx)
 *   2) Component-level premium gates (usePremiumStatus, PremiumGate, isPremium checks)
 *   3) User-visible labels claiming "Pro / Professional / Premium / Paid / $X/mo"
 *
 * A gating LEAK is flagged when a page (or a route reachable by anonymous/free
 * users) renders content marketed as Pro/Premium without a runtime gate.
 *
 * Output: prints a JSON report and writes scripts/gating-leak-report.json
 *
 * Usage:
 *   node scripts/scan-gating-leaks.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

// ---------- helpers ----------
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(name)) out.push(p);
  }
  return out;
}

const read = (p) => readFileSync(p, "utf8");
const rel = (p) => relative(ROOT, p);

// ---------- 1. Parse routes from App.tsx ----------
const APP = read(join(SRC, "App.tsx"));
const ROUTE_RE =
  /<Route\s+path="([^"]+)"\s+element=\{(<ProtectedRoute>)?\s*<(\w+)\s*\/?>\s*(<\/ProtectedRoute>)?[^/]*\/>/g;

const routes = [];
let m;
while ((m = ROUTE_RE.exec(APP)) !== null) {
  routes.push({
    path: m[1],
    component: m[3],
    protected: Boolean(m[2]),
  });
}

// Map component name -> file path (best-effort)
const allFiles = walk(SRC);
const componentFile = (name) =>
  allFiles.find((f) => f.endsWith(`/${name}.tsx`) || f.endsWith(`/${name}.ts`));

// ---------- 2. Detect premium signals in component files ----------
//
// We treat as a "premium label" only language that PROMISES gated content:
//   - badges that mark a feature as Pro/Professional/Premium-only
//   - copy that says "subscribers only", "paid only", "upgrade to view"
// We deliberately exclude pure CTAs ("See Plans", "$29/mo", "Subscribe") which
// appear on marketing pages and are NOT leaks.
const PREMIUM_LABEL_RE = new RegExp(
  [
    "Professional\\s+(only|members|subscribers|tier|plan)",
    "Premium\\s+(only|members|subscribers|content|feature)",
    "Pro\\s+(only|members|subscribers|feature|access)",
    "Subscribers?\\s+only",
    "Paid\\s+(only|subscribers|members)",
    "Upgrade\\s+to\\s+(view|see|unlock|access)",
    "Locked\\s+for\\s+free",
    // Visual gate badges
    "⭐\\s*(Pro|Professional|Premium)",
    "🔒\\s*(Pro|Professional|Premium)",
  ].join("|"),
  "i"
);

const RUNTIME_GATE_RE =
  /(usePremiumStatus|PremiumGate|isPremium|is_premium|is_pro|NewsfeedPaywallCard|AuthGateModal|ToolSampleOverlay)/;

const FREE_FLAG_RE = /(FREE_LIMIT|free\s+users?|free\s+tier)/i;

// Marketing pages where Pro labels are expected and not leaks.
const MARKETING_ROUTES = new Set([
  "/subscribe",
  "/signup",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/check-email",
  "/about",
  "/contact",
  "/faq",
  "/terms",
  "/privacy-policy",
  "/get-intelligence",
  "/sample-brief",
]);

function analyzeFile(file) {
  const src = read(file);
  const labelMatches = src.match(new RegExp(PREMIUM_LABEL_RE, "gi")) || [];
  return {
    file: rel(file),
    hasPremiumLabel: labelMatches.length > 0,
    hasRuntimeGate: RUNTIME_GATE_RE.test(src),
    mentionsFree: FREE_FLAG_RE.test(src),
    premiumLabelSnippets: labelMatches.slice(0, 5),
  };
}

// ---------- 3. Cross-reference ----------
const findings = [];

for (const r of routes) {
  const file = componentFile(r.component);
  if (!file) continue;
  if (MARKETING_ROUTES.has(r.path)) continue; // expected to advertise Pro
  const a = analyzeFile(file);

  // LEAK A: public route renders gated-content labels with no runtime check
  if (!r.protected && a.hasPremiumLabel && !a.hasRuntimeGate) {
    findings.push({
      severity: "high",
      type: "label_without_gate",
      route: r.path,
      component: r.component,
      file: a.file,
      labels: a.premiumLabelSnippets,
      message:
        'Public route uses "Pro/Premium-only" language but has no runtime premium check.',
    });
  }

  // LEAK B: explicitly references free-tier limits without enforcing them
  if (!r.protected && a.mentionsFree && !a.hasRuntimeGate) {
    findings.push({
      severity: "medium",
      type: "free_mention_without_gate",
      route: r.path,
      component: r.component,
      file: a.file,
      message:
        "Page references a free-vs-paid distinction without enforcing it at runtime.",
    });
  }

  // INFO: protected route, but no per-tier differentiation inside
  if (r.protected && !a.hasRuntimeGate) {
    findings.push({
      severity: "info",
      type: "protected_route_no_inner_gate",
      route: r.path,
      component: r.component,
      file: a.file,
      message:
        "Auth-protected route does not differentiate free vs premium logged-in users.",
    });
  }
}

// ---------- 4. Scan non-route components that show Pro labels publicly ----------
// (e.g. Navbar, home cards). They are fine as marketing, but flag if they render
// gated *content*, not just CTAs.
const HOME_LIKE = allFiles.filter(
  (f) =>
    /\/(home|components)\//.test(f) &&
    /\.tsx$/.test(f) &&
    !/PremiumGate|Paywall|AuthGate/.test(f)
);
for (const f of HOME_LIKE) {
  const a = analyzeFile(f);
  if (a.hasPremiumLabel && !a.hasRuntimeGate) {
    // Only escalate when file ALSO renders content that looks like a brief/forecast/assessment body
    const src = read(f);
    if (/(week_of|anticipated_development|recommendation|why\s+this\s+matters)/i.test(src)) {
      findings.push({
        severity: "high",
        type: "content_without_gate",
        component: f.split("/").pop().replace(/\.tsx$/, ""),
        file: a.file,
        message:
          "Component renders premium-style content (brief/forecast/recommendation body) without a runtime gate.",
      });
    }
  }
}

// ---------- 5. Output ----------
const report = {
  generatedAt: new Date().toISOString(),
  routesScanned: routes.length,
  filesScanned: allFiles.length,
  summary: {
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
    info: findings.filter((f) => f.severity === "info").length,
  },
  findings,
};

const outPath = join(ROOT, "scripts", "gating-leak-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log("=== Gating Leak Scanner ===");
console.log(`Routes scanned : ${report.routesScanned}`);
console.log(`Files scanned  : ${report.filesScanned}`);
console.log(`High           : ${report.summary.high}`);
console.log(`Medium         : ${report.summary.medium}`);
console.log(`Info           : ${report.summary.info}`);
console.log(`\nReport written to ${rel(outPath)}\n`);

for (const f of findings.filter((x) => x.severity !== "info")) {
  console.log(`[${f.severity.toUpperCase()}] ${f.type}`);
  console.log(`  route : ${f.route ?? "(non-route component)"}`);
  console.log(`  file  : ${f.file}`);
  console.log(`  why   : ${f.message}\n`);
}

process.exit(report.summary.high > 0 ? 1 : 0);
