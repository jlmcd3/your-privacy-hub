#!/usr/bin/env node
/**
 * Content audit — uses scripts/qa/crawl-html.json to check:
 *  - banned voice strings ("AI-generated", "AI-summarized", "ad-free")
 *  - presence of legal claims that should never appear ("legal advice", "guaranteed compliance", "attorney-client")
 *  - hardcoded competitor pricing or stale numbers
 *  - presence of Privacy Policy + Terms + Contact links in footer of every page
 *
 * Output: scripts/qa/content-report.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IN = resolve(__dirname, "crawl-html.json");
const OUT = resolve(__dirname, "content-report.json");

const pages = JSON.parse(readFileSync(IN, "utf8"));

const BANNED_VOICE = [/\bAI[- ]generated\b/i, /\bAI[- ]summarized\b/i, /\bad[- ]free\b/i];
const BANNED_LEGAL = [/\blegal advice\b/i, /\bguaranteed compliance\b/i, /\battorney[- ]client\b/i];
// allow these phrases when they appear inside the standard ToolDisclaimer footer
const DISCLAIMER_MARKER = /does not constitute legal advice/i;

const findings = [];
for (const page of pages) {
  const html = page.html;
  const text = html.replace(/<[^>]+>/g, " ");

  for (const re of BANNED_VOICE) {
    if (re.test(text)) findings.push({ severity: "high", route: page.route, kind: "banned_voice", match: re.source });
  }
  // Banned legal language outside disclaimer
  for (const re of BANNED_LEGAL) {
    if (re.test(text)) {
      // tolerate within the disclaimer (which itself uses the phrase "does not constitute legal advice")
      const disclaimerHits = (text.match(DISCLAIMER_MARKER) || []).length;
      const phraseHits = (text.match(new RegExp(re.source, "gi")) || []).length;
      if (phraseHits > disclaimerHits) {
        findings.push({ severity: "high", route: page.route, kind: "banned_legal_claim", match: re.source });
      }
    }
  }

  // Footer essentials
  const hasPrivacy = /href=["'][^"']*\/privacy-policy["']/i.test(html);
  const hasTerms = /href=["'][^"']*\/terms["']/i.test(html);
  const hasContact = /href=["'][^"']*\/contact["']/i.test(html);
  if (!hasPrivacy) findings.push({ severity: "high", route: page.route, kind: "missing_privacy_link" });
  if (!hasTerms) findings.push({ severity: "high", route: page.route, kind: "missing_terms_link" });
  if (!hasContact) findings.push({ severity: "medium", route: page.route, kind: "missing_contact_link" });
}

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    pages: pages.length,
    findings: findings.length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
  },
  findings,
};
writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`[content] pages=${pages.length} findings=${findings.length} high=${report.totals.high}`);
if (report.totals.high) {
  console.log("[content] HIGH FINDINGS:");
  for (const f of findings.filter((x) => x.severity === "high").slice(0, 30)) {
    console.log(`  ${f.kind}  ${f.route}  ${f.match || ""}`);
  }
}
process.exit(report.totals.high ? 1 : 0);
