// scripts/lint-rail-entries.ts
// Build-time lint for statutory-rail entry sets. Enforces the Phase 1.a contract:
//   R1 — `goodAnswer` text must not contain form-directive verbs (tick/select/
//        choose/check/enter/pick) or the literal "tick none".
//   R2 — rail sets belonging to a tool whose INTAKE_POLICY has
//        `goodAnswer: false` must contain NO `goodAnswer` field.
//   R3 — for every tool, goodAnswer === true implies rail === true.
//
// Run: `npx tsx scripts/lint-rail-entries.ts` (wired as `npm run lint:rails`).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { INTAKE_POLICY } from "../src/components/intake/intakePolicy";

const RAIL_SETS: Record<string, string> = {
  "src/components/admt/admtRailEntries.ts": "admt",
  "src/components/biometric/BiometricRailEntries.ts": "biometric",
  "src/components/cppa/CPPARiskRailEntries.ts": "cppa_risk",
  "src/components/cppa/CPPACyberRailEntries.ts": "cppa_cyber",
  "src/components/cppa/CPPAScopeRailEntries.ts": "cppa_scope",
  "src/components/lia/LIARailEntries.ts": "lia",
  // research sets are reference pages (no intake) — exempt from goodAnswer rules
};

// Directive sense: verb appears as an imperative (sentence-initial, or after
// "to/should/must/please/just"), not embedded as a noun like "identity check".
const DIRECTIVE_RE =
  /(?:^|[.!?]\s+|["'`]\s*|\bto\s+|\bshould\s+|\bmust\s+|\bplease\s+|\bjust\s+)(tick|select|choose|check|enter|pick)\b/i;
const TICK_NONE_RE = /tick\s+none/i;

type Failure = { file: string; rule: string; entryKey?: string; detail: string };
const failures: Failure[] = [];

// R3 — invariant on the policy itself
for (const [tool, policy] of Object.entries(INTAKE_POLICY)) {
  if (policy.goodAnswer && !policy.rail) {
    failures.push({
      file: "src/components/intake/intakePolicy.ts",
      rule: "R3",
      detail: `tool "${tool}": goodAnswer:true requires rail:true`,
    });
  }
}

// Extract entry-key + goodAnswer string pairs by walking the source text.
// We do not evaluate TS — we scan top-level entry definitions.
function scanEntries(src: string): { key: string; goodAnswer?: string }[] {
  // Match `  <key>: {` opening a new entry at indent 2.
  const entryHeader = /^  ([A-Za-z0-9_]+):\s*\{/gm;
  const results: { key: string; goodAnswer?: string }[] = [];
  let m: RegExpExecArray | null;
  const starts: { key: string; idx: number }[] = [];
  while ((m = entryHeader.exec(src))) starts.push({ key: m[1], idx: m.index });
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].idx;
    const end = i + 1 < starts.length ? starts[i + 1].idx : src.length;
    const block = src.slice(start, end);
    // capture goodAnswer: "..." possibly spanning lines (template-literal style or quoted)
    const ga = block.match(/goodAnswer:\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/);
    results.push({
      key: starts[i].key,
      goodAnswer: ga ? ga[1].slice(1, -1) : undefined,
    });
  }
  return results;
}

for (const [relPath, tool] of Object.entries(RAIL_SETS)) {
  const policy = INTAKE_POLICY[tool];
  if (!policy) {
    failures.push({ file: relPath, rule: "manifest", detail: `unknown toolType "${tool}"` });
    continue;
  }
  let src = "";
  try {
    src = readFileSync(resolve(process.cwd(), relPath), "utf8");
  } catch {
    failures.push({ file: relPath, rule: "manifest", detail: "file not found" });
    continue;
  }
  const entries = scanEntries(src);
  for (const e of entries) {
    if (e.goodAnswer == null) continue;
    // R2 — goodAnswer present on a goodAnswer:false tool
    if (!policy.goodAnswer) {
      failures.push({
        file: relPath,
        rule: "R2",
        entryKey: e.key,
        detail: `tool "${tool}" has goodAnswer:false in INTAKE_POLICY — entry must not define goodAnswer`,
      });
      continue;
    }
    // R1 — directive phrasing
    if (TICK_NONE_RE.test(e.goodAnswer) || DIRECTIVE_RE.test(e.goodAnswer)) {
      failures.push({
        file: relPath,
        rule: "R1",
        entryKey: e.key,
        detail: `goodAnswer contains form-directive phrasing (tick/select/choose/check/enter/pick or "tick none")`,
      });
    }
  }
}

if (failures.length > 0) {
  console.error(`\nlint-rail-entries: ${failures.length} failure(s)\n`);
  for (const f of failures) {
    console.error(
      `  [${f.rule}] ${f.file}${f.entryKey ? ` · ${f.entryKey}` : ""}\n         ${f.detail}`,
    );
  }
  process.exit(1);
}

console.log("lint-rail-entries: OK");
