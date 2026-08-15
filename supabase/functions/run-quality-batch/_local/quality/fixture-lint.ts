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

import { BLACKLIST_PHRASES, BLACKLIST_RE } from "../../../_shared/blacklist-phrases.ts";

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

// PROMPT 8H item 1(b) — TOOL-AWARE STRUCTURED-SHAPE SCREEN.
//
// The contract render pins the inner record keys of dpia's structured arrays
// (alternatives_considered, transfer_flows). Model drift must FAIL validation
// rather than flow into a batch, so the shape is enforced here too.
export function lintDpiaStructuredShapes(intake: unknown): LintHit | null {
  const o = (intake ?? {}) as Record<string, unknown>;

  const alts = o["alternatives_considered"];
  if (Array.isArray(alts)) {
    for (let i = 0; i < alts.length; i++) {
      const it = alts[i];
      if (it === null || typeof it !== "object" || Array.isArray(it)) {
        return { reason: "alternatives_considered item is not a record", path: `$.alternatives_considered[${i}]` };
      }
      const r = it as Record<string, unknown>;
      const v = r["rejection_reason"];
      if (typeof v !== "string" || v.trim() === "") {
        return {
          reason: "alternatives_considered item missing rejection_reason (contract shape drift)",
          path: `$.alternatives_considered[${i}]`,
          sample: JSON.stringify(r).slice(0, 120),
        };
      }
    }
  }

  const flows = o["transfer_flows"];
  if (Array.isArray(flows)) {
    for (let i = 0; i < flows.length; i++) {
      const it = flows[i];
      if (it === null || typeof it !== "object" || Array.isArray(it)) {
        return { reason: "transfer_flows item is not a record", path: `$.transfer_flows[${i}]` };
      }
      const r = it as Record<string, unknown>;
      const v = r["destination_country"];
      if (typeof v !== "string" || v.trim() === "") {
        return {
          reason: "transfer_flows item missing destination_country (contract shape drift)",
          path: `$.transfer_flows[${i}]`,
          sample: JSON.stringify(r).slice(0, 120),
        };
      }
    }
  }

  return null;
}

/** Tool-aware entry point: the generic collision screen plus any per-tool
 *  structured-shape screens. */
export function lintFixtureForTool(tool: string, intake: unknown): LintHit | null {
  const generic = lintFixture(intake);
  if (generic) return generic;
  if (tool === "dpia") return lintDpiaStructuredShapes(intake);
  return null;
}

// PROMPT 8K (2026-08-12) — CLOSED-LOOP PERFECT LINT.
//
// For variant=perfect, the fixture lint additionally runs the PRODUCT's own
// deliverables builder over the candidate intake and rejects unless the
// product finds nothing missing. See ./perfect-closed-loop.ts for the rule
// set and the CEO-parked 6(1)(f)+special-category carve-out. Any other
// variant (including the legacy null path) is byte-identical to before.

import {
  checkPerfectDpiaIntake,
  deficiencyLines,
  type PerfectDeficiency,
} from "./perfect-closed-loop.ts";

export interface VariantLintHit extends LintHit {
  /** Specific, per-deficiency feedback for the generator retry path. */
  deficiencies?: PerfectDeficiency[];
}

export function lintFixtureForVariant(
  tool: string,
  variant: "perfect" | "messy" | null | undefined,
  intake: unknown,
): VariantLintHit | null {
  const base = lintFixtureForTool(tool, intake);
  if (base) return base;
  if (variant !== "perfect" || tool !== "dpia") return null;
  const res = checkPerfectDpiaIntake(intake);
  if (res.ok) return null;
  const lines = deficiencyLines(res.deficiencies);
  return {
    reason: `closed-loop perfect: ${lines.slice(0, 4).join(" | ")}${lines.length > 4 ? ` (+${lines.length - 4} more)` : ""}`,
    deficiencies: res.deficiencies,
  };
}


// PROMPT 9D item 3 (2026-08-15) — BLACKLIST-AWARE REPAIR GUIDANCE.
//
// Run 887a91d2's repair retry died on "retry: blacklist phrase" — a constraint
// the repair prompt had never named. Both repair paths (fixture lint and
// contract validation) now append this constraint set, which is generated FROM
// the very constants this module screens with (blacklist phrases imported from
// _shared/blacklist-phrases.ts — never a duplicated list).
export function fixtureConstraintGuidance(): string {
  const phrases = BLACKLIST_PHRASES.map((p) => `"${p}"`).join(", ");
  const hedges = HEDGE_PATTERNS.map((re) => re.source).join(" | ");
  const allow = STATUTE_ALLOWLIST.map((re) => re.source).join(" | ");
  return [
    "THE REPAIRED OBJECT MUST ALSO AVOID (these screens rejected nothing yet but will reject the repair):",
    `- Blacklist phrases, in any field: ${phrases}.`,
    `- Hedge patterns: ${hedges}.`,
    "- Bracketed instruction leaks: [INTERNAL], [TODO], [PLACEHOLDER], [REDACTED].",
    "- Instruction leaks: \"As an AI\", \"I cannot\", \"system prompt\", \"ignore previous instructions\".",
    "- Raw field-id tokens in narrative prose (e.g. q5b_share_revenue, i2_retention_period).",
    `- Section-number citations outside the allowlist; only these statute forms are permitted: ${allow}.`,
    "State facts plainly and name the owner or date instead of hedging.",
  ].join("\n");
}
