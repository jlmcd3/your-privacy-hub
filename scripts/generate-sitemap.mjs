#!/usr/bin/env node
// Generate public/sitemap.xml from static routes + JSON-backed dynamic pages.
// Run via `prebuild` (package.json) so every build produces a fresh sitemap.
//
// Usage: node scripts/generate-sitemap.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const BASE_URL = "https://enduserprivacy.com";
const today = new Date().toISOString().slice(0, 10);

// Canonical slug transform — must match src/lib/regulators.ts `regulatorSlug`.
// (The TypeScript helper is the source of truth; this mirrors it for the build script.)
function slugify(source) {
  return source
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

// (a) Static routes — every PUBLIC, INDEXABLE content page.
//
// Sitemap policy (LAUNCH-2 fix batch, 2026-07-08):
//   INCLUDE = public content, marketing landings, sample/reference pages.
//   EXCLUDE = auth/session pages (login, signup, reset, account, dashboard,
//             onboarding, brief-preferences, watchlist, clients),
//             admin (/admin/*) and dev pages (/__dev/*, /logo-preview —
//             the logo comparison preview is intentionally excluded and
//             should NOT be re-added as a sitemap regression finding),
//             gated in-app views (ropa/, eu-notices/, us-notices/,
//             notices-ropa, registration-manager/my-filings, ...),
//             and legacy client-side alias redirects (/rofa, /article-30,
//             /notices, /assessments, /laws, /sample-brief,
//             /enforcement-intelligence, /governance, /registration-documents,
//             /lia-assessment, /lia-tool).
//   The alias /enforcement-tracker is retained by directive despite
//   redirecting to /enforcement; both are indexable in the meantime.
const STATIC_PATHS = [
  "/",
  "/about",
  "/ai-privacy-regulations",
  "/biometric-checker",
  "/biometric-privacy",
  "/breach-notification",
  "/calendar",
  "/contact",
  "/cookie-consent",
  "/cppa",
  "/cppa-admt",
  "/cppa-admt-checker",
  "/cppa-cybersecurity",
  "/cppa-risk-assessment",
  "/cppa-scope-checker",
  "/cross-border-transfers",
  "/dpa-generator",
  "/dpia-framework",
  "/enforcement",
  "/enforcement-tracker",
  "/eu-global-notice-builder",
  "/eu-notice-builder",
  "/faq",
  "/gdpr-enforcement",
  "/get-intelligence",
  "/global-privacy-authorities",
  "/global-privacy-laws",
  "/glossary",
  "/governance-assessment",
  "/health-data-privacy",
  "/horizon",
  "/ir-playbook",
  "/jurisdictions",
  "/legislation-tracker",
  "/legitimate-interest-tracker",
  "/li-assessment",
  "/notice-builder",
  "/privacy-policy",
  "/registration-manager",
  "/ropa-builder",
  "/samples",
  "/start",
  "/subscribe",
  "/terms",
  "/timelines",
  "/tools",
  "/updates",
  "/us-federal-privacy-law",
  "/us-notice-builder",
  "/us-privacy-laws",
  "/us-state-privacy-authorities",
  "/us-state-privacy-laws",
];

const globalAuthorities = JSON.parse(
  readFileSync(resolve(ROOT, "src/data/global_privacy_authorities.json"), "utf8"),
);
const usStates = JSON.parse(
  readFileSync(resolve(ROOT, "src/data/us_state_privacy_authorities.json"), "utf8"),
);

// (b) Regulator pages — slug from authority_abbreviation || authority_name.
const regulatorPaths = [];
for (const region of globalAuthorities) {
  for (const entry of region.entries) {
    const slug = slugify(entry.authority_abbreviation || entry.authority_name);
    regulatorPaths.push(`/regulator/${slug}`);
  }
}
// FTC is added manually in src/lib/regulators.ts; mirror that here.
regulatorPaths.push("/regulator/ftc");

// (c) Jurisdiction pages — slug from country name, deduped.
const jurisdictionPaths = [];
const seenJur = new Set();
for (const region of globalAuthorities) {
  for (const entry of region.entries) {
    const slug = slugify(entry.country);
    if (seenJur.has(slug)) continue;
    seenJur.add(slug);
    jurisdictionPaths.push(`/jurisdiction/${slug}`);
  }
}

// (d) U.S. state law pages.
const usStatePaths = usStates.map((s) => `/us-privacy-laws/${s.slug}`);

const allPaths = Array.from(
  new Set([...STATIC_PATHS, ...regulatorPaths, ...jurisdictionPaths, ...usStatePaths]),
);

const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  allPaths
    .map(
      (p) =>
        `  <url>\n    <loc>${BASE_URL}${p}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`,
    )
    .join("\n") +
  `\n</urlset>\n`;

writeFileSync(resolve(ROOT, "public/sitemap.xml"), xml);
console.log(`sitemap.xml written (${allPaths.length} entries)`);
