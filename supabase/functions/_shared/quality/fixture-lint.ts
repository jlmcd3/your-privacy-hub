// QB-P20 item 3 — Fixture Lint. Grader-collision screen for generated
// intakes. Pure regex; no LLM cost. Reject reasons are surfaced by the
// caller (run-quality-batch/generateValidatedIntakes) into rejected[].
//
// Collision categories (learnings 2026-07-22):
//   1. Statute §-numbers outside the allowlist that history has shown
//      graders latch onto ("§ 999.99" hallucinated citations).
//   2. Blacklist phrases (BLACKLIST_RE from _shared/blacklist-phrases.ts).
//   3. Hedge patterns — "further internal investigation is advisable" etc.
//   4. Bracketed instruction leaks — [INTERNAL], [TODO], [PLACEHOLDER].
//   5. Instruction-leak phrases — "As an AI", "I cannot", "system prompt".
//   6. Raw field-id tokens escaping into narrative — "q5b_...", "i2_...".

import { BLACKLIST_RE } from "../blacklist-phrases.ts";

// Any statute §-number the graders recognise as legitimate. Anchored
// against learnings 10-17. Extend as new statutes come into scope.
const STATUTE_ALLOWLIST = [
  // California CCPA/CPRA regs
  /§\s*7001/, /§\s*7002/, /§\s*7010/, /§\s*7150/, /§\s*7151/, /§\s*7152/,
  /§\s*7153/, /§\s*7200/, /§\s*7201/, /§\s*7220/, /§\s*7221/, /§\s*7222/,
  /§\s*7223/,
  // BIPA / CUBI / WA
  /740\s*ILCS\s*14/, /503\.001/, /RCW\s*19\.375/,
  // GDPR
  /Article\s*\d+(\(\d+\))?(\([a-z]\))?/i,
  // ADPPA / HIPAA / state consumer laws
  /1798\.\d+/, /45\s*CFR/, /42\s*U\.?S\.?C\./,
];

// Detect any §-number cite that is NOT allow-listed.
const ANY_SECTION_CITE = /§\s*\d[\d.\-]*/g;

const HEDGE_PATTERNS: RegExp[] = [
  /further\s+internal\s+investigation\s+is\s+advisable/i,
  /this\s+matter\s+may\s+warrant\s+further/i,
  /consult\s+(local\s+)?counsel/i,
  /it\s+may\s+be\s+prudent\s+to/i,
];

const INSTRUCTION_LEAK: RegExp[] = [
  /\bAs an AI\b/i,
  /\bI cannot\b/i,
  /system prompt/i,
  /\bignore (all\s+)?previous instructions\b/i,
];

const BRACKET_LEAK = /\[(INTERNAL|TODO|PLACEHOLDER|REDACTED)\]/i;

// Raw field-id tokens (e.g. "q5b_share_revenue_50pct", "i2_retention_period").
const FIELD_ID_LEAK = /\b(q\d+[a-z]?_[a-z0-9_]+|i\d+[a-z]?_[a-z0-9_]+)\b/;

export interface LintHit {
  reason: string;
  path?: string;
  sample?: string;
}

/** Walk any string leaves; return the first collision hit, or null. */
export function lintFixture(intake: unknown): LintHit | null {
  const stack: Array<{ v: unknown; p: string }> = [{ v: intake, p: "$" }];
  while (stack.length) {
    const { v, p } = stack.pop()!;
    if (v == null) continue;
    if (typeof v === "string") {
      const hit = scanString(v);
      if (hit) return { ...hit, path: p, sample: v.slice(0, 120) };
      continue;
    }
    if (Array.isArray(v)) {
      v.forEach((el, i) => stack.push({ v: el, p: `${p}[${i}]` }));
      continue;
    }
    if (typeof v === "object") {
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        stack.push({ v: val, p: `${p}.${k}` });
      }
    }
  }
  return null;
}

function scanString(s: string): { reason: string } | null {
  if (BRACKET_LEAK.test(s)) return { reason: "bracketed instruction leak" };
  if (FIELD_ID_LEAK.test(s)) return { reason: "raw field-id token leaked into narrative" };
  for (const re of INSTRUCTION_LEAK) if (re.test(s)) return { reason: `instruction leak (${re.source})` };
  for (const re of HEDGE_PATTERNS) if (re.test(s)) return { reason: `hedge pattern (${re.source})` };
  if (BLACKLIST_RE && BLACKLIST_RE.test(s)) return { reason: "blacklist phrase" };
  // §-cite outside allowlist.
  const cites = s.match(ANY_SECTION_CITE);
  if (cites) {
    for (const c of cites) {
      const ok = STATUTE_ALLOWLIST.some(re => re.test(c) || re.test(s));
      if (!ok) return { reason: `statute cite outside allowlist: ${c}` };
    }
  }
  return null;
}
