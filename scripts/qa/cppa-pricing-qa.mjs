#!/usr/bin/env node
/**
 * Sprint 7 — CPPA pricing & access QA pass.
 * Reads src/config/pricing.ts and asserts that the CPPA pricing surface
 * is internally consistent. Run: `node scripts/qa/cppa-pricing-qa.mjs`.
 * Exits non-zero if any assertion fails.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const pricingPath = path.resolve(here, "../../src/config/pricing.ts");
const src = readFileSync(pricingPath, "utf8");

const fails = [];
const ok = [];

function check(label, cond, detail = "") {
  if (cond) ok.push(label);
  else fails.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

// Required price keys
for (const key of [
  "cppa_risk_standalone",
  "cppa_risk_subscriber",
  "cppa_cyber_standalone",
  "cppa_cyber_subscriber",
  "cppa_suite_standalone",
  "cppa_suite_subscriber",
]) {
  check(`pricing key present: ${key}`, src.includes(`${key}:`) || src.includes(`'${key}'`) || src.includes(`"${key}"`));
}

// Tool catalog entries
for (const tool of ["cppa_scope", "cppa_risk", "cppa_cyber", "cppa_suite"]) {
  check(`tool catalog entry: ${tool}`, new RegExp(`\\b${tool}\\s*:\\s*\\{`).test(src));
}

// Subscriber prices must be < standalone for paid CPPA tools
const amountFor = (key) => {
  const re = new RegExp(`${key}\\s*:\\s*\\{[\\s\\S]*?amountCents\\s*:\\s*(\\d+)`);
  const m = src.match(re);
  return m ? Number(m[1]) : null;
};
for (const [sub, std] of [
  ["cppa_risk_subscriber", "cppa_risk_standalone"],
  ["cppa_cyber_subscriber", "cppa_cyber_standalone"],
  ["cppa_suite_subscriber", "cppa_suite_standalone"],
]) {
  const a = amountFor(sub);
  const b = amountFor(std);
  if (a != null && b != null) {
    check(`${sub} < ${std}`, a < b, `${a} vs ${b}`);
  } else {
    check(`amounts parseable for ${sub}/${std}`, false, `${sub}=${a} ${std}=${b}`);
  }
}

// Scope checker is free
check("cppa_scope is Free", /cppa_scope\s*:\s*\{[^}]*display:\s*'Free'/.test(src));

// Bundle exists (Sprint 7 #7 requirement)
check("CPPA Suite bundle SKU present", /cppa_suite_standalone/.test(src) && /cppa_suite_subscriber/.test(src));

console.log("\n=== CPPA Pricing QA ===");
ok.forEach((l) => console.log(`  ok   ${l}`));
fails.forEach((l) => console.log(`  FAIL ${l}`));
console.log(`\n${ok.length} passed, ${fails.length} failed.`);
process.exit(fails.length === 0 ? 0 : 1);
