// DOC 191 §5 — THE RULE/PATTERN BOUNDARY. Fleet-wide, greps the repo.
//
// "A gate or outcome-override file (anything matching `*-gate.ts`,
// `*-override.ts`, or a product's `three-part-test-typed.ts`-equivalent) may
// import RULE_PROFILES only. A fleet-wide test greps every gate/override file
// in every product and fails if it imports PATTERN_PROFILES or a bare profile
// object without going through the split. THIS IS THE ACTUAL ENFORCEMENT of
// 'pattern content can never carry deterministic weight' — not a comment, a
// test."
//
// It generalises the single-door pattern this codebase already proved on LIA:
// doc137-lia-eprivacy-overlay.test.ts asserts that the skeleton assembler's
// SOURCE TEXT does not contain `eprivacy_short_circuit`, so the gate's own
// prose can reach the Article 6(1)(f) determination through exactly one
// sanctioned door. Same shape here, one level up: the door is the export
// split, and the files barred from the wrong side of it are every product's
// gates and overrides.
//
// It exists and passes BEFORE any real `rule` row does, and that is the point
// — the boundary has to be standing before the first row can cross it.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";

/** Files that decide or override a legal outcome. */
const GATE_FILE_PATTERNS: readonly RegExp[] = [
  /-gate\.ts$/,
  /-override\.ts$/,
  // A product's typed three-part-test equivalent: the module that computes a
  // determination from typed states. LIA's is the shipped instance; the
  // suffix match catches a future product's own.
  /three-part-test-typed\.ts$/,
  /-typed-test\.ts$/,
];

/** Roots to sweep. `archive/` is excluded deliberately: it is unwired code by
 *  definition (archive/unwired/…), it ships nothing, and cam-invariants.test.ts
 *  already treats it as a fixture source rather than live product code. */
const ROOTS = ["supabase/functions", "src"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "archive", "__snapshots__"]);

/** A generated relevance-profiles module, by filename. */
const PROFILE_MODULE = /relevance-profiles(\.generated)?\.ts$/;

/** The barred names: the pattern half, and any BARE (unsplit) profile map. */
const BARRED_IMPORT = /^[A-Z0-9_]*PATTERN_PROFILES$|^[A-Z0-9_]*RELEVANCE_PROFILES$/;
const ALLOWED_IMPORT = /^[A-Z0-9_]*RULE_PROFILES$|^[A-Z0-9_]*PROFILES_VERSION$/;

interface ImportStatement {
  readonly names: readonly string[];
  readonly from: string;
  readonly raw: string;
}

/** Parse `import { A, B as C } from "..."` and `import * as N from "..."`. */
export function parseImports(src: string): ImportStatement[] {
  const out: ImportStatement[] = [];
  const re = /import\s+(type\s+)?({[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+["']([^"']+)["']/g;
  for (const m of src.matchAll(re)) {
    const clause = m[2].trim();
    let names: string[];
    if (clause.startsWith("{")) {
      names = clause
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim())
        .filter(Boolean);
    } else if (clause.startsWith("*")) {
      names = ["*"];
    } else {
      names = [clause];
    }
    out.push({ names, from: m[3], raw: m[0] });
  }
  return out;
}

/** The rule itself, over one file's source. Kept separate from the sweep so
 *  the NEGATIVE case below can prove it actually rejects a violation — a
 *  boundary test that has only ever seen compliant files proves nothing. */
export function violationsFor(path: string, src: string): string[] {
  const violations: string[] = [];
  for (const imp of parseImports(src)) {
    if (!PROFILE_MODULE.test(imp.from)) continue;
    for (const name of imp.names) {
      if (name === "*") {
        violations.push(
          `${path}: namespace-imports "${imp.from}" — a namespace import reaches the pattern half too; import RULE_PROFILES by name`,
        );
      } else if (BARRED_IMPORT.test(name)) {
        violations.push(
          `${path}: imports "${name}" from "${imp.from}". A gate/override may import RULE_PROFILES only — pattern content is persuasive-only and can never carry deterministic legal weight (doc 191 §2, §5).`,
        );
      } else if (!ALLOWED_IMPORT.test(name)) {
        violations.push(
          `${path}: imports "${name}" from "${imp.from}", which is neither RULE_PROFILES nor a version stamp. Route it through the split or move the logic out of the gate.`,
        );
      }
    }
  }
  return violations;
}

async function collect(): Promise<{ gateFiles: string[]; profileModules: string[] }> {
  const gateFiles: string[] = [];
  const profileModules: string[] = [];
  for (const root of ROOTS) {
    for await (
      const entry of walk(root, {
        exts: [".ts"],
        includeDirs: false,
        skip: [...SKIP_DIRS].map((d) => new RegExp(`[\\\\/]${d}[\\\\/]`)),
      })
    ) {
      const p = entry.path.replace(/\\/g, "/");
      if (/\.test\.ts$/.test(p)) continue;
      if (GATE_FILE_PATTERNS.some((re) => re.test(p))) gateFiles.push(p);
      if (PROFILE_MODULE.test(p)) profileModules.push(p);
    }
  }
  return { gateFiles, profileModules };
}

Deno.test("doc191 §5 — the sweep actually finds gate/override files (a zero-match grep proves nothing)", async () => {
  const { gateFiles } = await collect();
  assert(gateFiles.length >= 5, `expected the fleet's gate/override files, found ${gateFiles.length}: ${gateFiles.join(", ")}`);
  // The two the spec names by shape must be in the sweep, or the patterns drifted.
  assert(
    gateFiles.some((p) => p.endsWith("lia-deliverables/eprivacy-gate.ts")),
    "LIA's ePrivacy gate must be swept",
  );
  assert(
    gateFiles.some((p) => p.endsWith("three-part-test-typed.ts")),
    "LIA's typed three-part test must be swept",
  );
});

Deno.test("doc191 §5 — NO gate/override file imports PATTERN_PROFILES or a bare, unsplit profile map", async () => {
  const { gateFiles } = await collect();
  const violations: string[] = [];
  for (const path of gateFiles) {
    violations.push(...violationsFor(path, await Deno.readTextFile(path)));
  }
  assertEquals(violations, [], violations.join("\n"));
});

Deno.test("doc191 §5 — the boundary rule REJECTS every way pattern content could reach a gate", () => {
  const cases: readonly [string, string][] = [
    ["the pattern half by name", `import { LIA_PATTERN_PROFILES } from "./lia-relevance-profiles.generated.ts";`],
    ["the pattern half aliased", `import { LIA_PATTERN_PROFILES as p } from "./lia-relevance-profiles.generated.ts";`],
    ["a bare, unsplit map", `import { LIA_RELEVANCE_PROFILES } from "./lia-relevance-profiles.ts";`],
    ["a namespace import", `import * as all from "./lia-relevance-profiles.generated.ts";`],
    ["a helper that resolves either half", `import { liaProfileOf } from "./lia-relevance-profiles.ts";`],
    ["a type-only pattern import", `import type { LIA_PATTERN_PROFILES } from "./risk-relevance-profiles.generated.ts";`],
  ];
  for (const [label, src] of cases) {
    const v = violationsFor("some-product/x-gate.ts", src);
    assert(v.length === 1, `${label}: expected exactly one violation, got ${JSON.stringify(v)}`);
  }
  // And the one permitted shape passes.
  assertEquals(
    violationsFor(
      "some-product/x-gate.ts",
      `import { LIA_RULE_PROFILES, LIA_PROFILES_VERSION } from "./lia-relevance-profiles.generated.ts";
import type { AuthorityRelevanceProfile } from "../../_shared/corpus/authority-relevance-profile.ts";`,
    ),
    [],
  );
});

Deno.test("doc191 §5 — every generated relevance-profiles module exports BOTH halves of the split", async () => {
  const { profileModules } = await collect();
  for (const path of profileModules) {
    const src = await Deno.readTextFile(path);
    if (!/GENERATED FILE/.test(src)) {
      // The hand-authored LIA sidecar (doc 189) predates the split and is
      // still the live one until the CEO ratifies the re-point (doc 196 §3.1).
      // It is exempt from the shape rule and covered instead by the boundary
      // rule above: no gate file may import its bare map either.
      continue;
    }
    assert(/export const [A-Z0-9_]*RULE_PROFILES/.test(src), `${path}: no RULE_PROFILES export`);
    assert(/export const [A-Z0-9_]*PATTERN_PROFILES/.test(src), `${path}: no PATTERN_PROFILES export`);
    assert(/export const [A-Z0-9_]*PROFILES_VERSION/.test(src), `${path}: no PROFILES_VERSION stamp`);
  }
});

// --- rule-interpreter.ts / rule-types.ts import boundary (doc 206/207) ---
//
// Same shape as the RULE_PROFILES/PATTERN_PROFILES split above, one level
// deeper: the generic rule interpreter is where a rule's *effect* actually
// changes a determination, so it may only be reached through a product's
// `rule-pass.ts`, a `*-gate.ts` / `*-gates.ts` file, or a test. An index.ts,
// a prose assembler, or any other product module must go through one of
// those doors — never import the interpreter directly.

/** The barred modules: doc206/207's generic interpreter and its types. */
const RULE_INTERPRETER_MODULE = /(^|\/)rule-(interpreter|types)\.ts$/;

/** The only path shapes allowed to import them. DOC 207 adds two companion
 *  shapes alongside `rule-pass.ts` itself: a product's own rule-states
 *  builder (`rule-states.ts`, needs the `TypedStateBag` type) and a
 *  product's generated rules map (`corpus/maps/<product>-rules.ts`, needs
 *  `AuthorityRule`/`RuleContext` to type its own exports — including once
 *  the doc 206 §6.2 generator fills it with real rows). Neither imports
 *  `rule-interpreter.ts`'s executable `applyRules`; both are data/typing
 *  companions to the one sanctioned door, not new doors of their own — the
 *  companion boundary test below (lia-rules.ts boundary) still restricts
 *  who may import THOSE files to that product's own rule-pass.ts. */
const RULE_INTERPRETER_ALLOWED_IMPORTERS: readonly RegExp[] = [
  /(^|\/)rule-pass\.ts$/,
  /(^|\/)rule-states\.ts$/,
  /(^|\/)corpus\/maps\/[a-z0-9-]+-rules\.ts$/,
  /-gate\.ts$/,
  /-gates\.ts$/,
  /(^|\/)tests\//,
];

/** Roots to sweep for this boundary — includes `tests/` since test files are
 *  one of the allowed importer shapes and the sweep must see them to prove
 *  the mechanism doesn't just get lucky by never looking there. */
const RULE_INTERPRETER_SWEEP_ROOTS = ["supabase/functions", "src", "tests"];

/** The rule itself, over one file's source — kept separate from the sweep
 *  for the same reason `violationsFor` is: the negative-case test below has
 *  to prove it actually rejects a violation. */
export function ruleInterpreterViolationsFor(path: string, src: string): string[] {
  const normalizedPath = path.replace(/\\/g, "/");
  // rule-interpreter.ts importing its own sibling rule-types.ts is intra-
  // module, not an external consumer reaching around the gate — exempt the
  // guarded pair from being treated as importers of each other.
  if (RULE_INTERPRETER_MODULE.test(normalizedPath)) {
    return [];
  }
  if (RULE_INTERPRETER_ALLOWED_IMPORTERS.some((re) => re.test(normalizedPath))) {
    return [];
  }
  const violations: string[] = [];
  for (const imp of parseImports(src)) {
    if (RULE_INTERPRETER_MODULE.test(imp.from)) {
      violations.push(
        `${path}: imports "${imp.from}" but this file's path matches none of rule-pass.ts, *-gate.ts, *-gates.ts, or tests/ — rule-interpreter.ts/rule-types.ts may only be imported by those (doc 206/207).`,
      );
    }
  }
  return violations;
}

async function collectRuleInterpreterImporters(): Promise<{ path: string; src: string }[]> {
  const results: { path: string; src: string }[] = [];
  for (const root of RULE_INTERPRETER_SWEEP_ROOTS) {
    for await (
      const entry of walk(root, {
        exts: [".ts"],
        includeDirs: false,
        skip: [...SKIP_DIRS].map((d) => new RegExp(`[\\\\/]${d}[\\\\/]`)),
      })
    ) {
      const p = entry.path.replace(/\\/g, "/");
      const src = await Deno.readTextFile(entry.path);
      if (parseImports(src).some((imp) => RULE_INTERPRETER_MODULE.test(imp.from))) {
        results.push({ path: p, src });
      }
    }
  }
  return results;
}

Deno.test("rule-interpreter/rule-types boundary — every real importer matches an allowed path shape", async () => {
  const importers = await collectRuleInterpreterImporters();
  const violations: string[] = [];
  for (const { path, src } of importers) {
    violations.push(...ruleInterpreterViolationsFor(path, src));
  }
  assertEquals(violations, [], violations.join("\n"));
});

Deno.test("rule-interpreter/rule-types boundary — REJECTS an importer outside rule-pass/gate/gates/tests", () => {
  const src = `import { applyRules } from "../_shared/corpus/rule-interpreter.ts";
import type { AuthorityRule } from "../_shared/corpus/rule-types.ts";`;

  const v = ruleInterpreterViolationsFor("supabase/functions/some-product/index.ts", src);
  assert(v.length === 2, `expected exactly two violations (one per barred import), got ${JSON.stringify(v)}`);

  // Every allowed shape passes, including nested tests/ directories.
  assertEquals(ruleInterpreterViolationsFor("supabase/functions/some-product/rule-pass.ts", src), []);
  assertEquals(ruleInterpreterViolationsFor("supabase/functions/some-product/lia-eligibility-gate.ts", src), []);
  assertEquals(ruleInterpreterViolationsFor("supabase/functions/some-product/lia-eligibility-gates.ts", src), []);
  assertEquals(ruleInterpreterViolationsFor("tests/edge/corpus/rule-interpreter.test.ts", src), []);
  assertEquals(ruleInterpreterViolationsFor("tests/edge/some-product/anything.ts", src), []);

  // A file that merely contains the substring "gate" is not a match — only
  // the fixed suffixes are, same discipline as the PATTERN_PROFILES sweep.
  const v2 = ruleInterpreterViolationsFor("supabase/functions/some-product/delegate-helper.ts", src);
  assertEquals(v2.length, 2);
});

// --- lia-rules.ts import boundary (doc 207) ---
//
// Same "one sanctioned door" shape as the rule-interpreter boundary above,
// one level closer to the product: `LIA_RULES`/`LIA_RULE_CONTEXT`/
// `LIA_RULES_VERSION` (the generated-target file the doc 206 §6.2 generator
// will overwrite) may only be imported by LIA's own `rule-pass.ts` — never
// by index.ts, a prose assembler, or any other module. `rule-pass.ts`
// itself re-exports `LIA_RULES_VERSION` for index.ts's telemetry, so that
// one binding legitimately crosses the door once, at its one sanctioned
// point of re-export.

/** The barred module: LIA's generated rules map. */
const LIA_RULES_MODULE = /(^|\/)lia-rules\.ts$/;

/** The only path shape allowed to import it directly. */
const LIA_RULES_ALLOWED_IMPORTERS: readonly RegExp[] = [
  /(^|\/)rule-pass\.ts$/,
  /(^|\/)tests\//,
];

export function liaRulesViolationsFor(path: string, src: string): string[] {
  const normalizedPath = path.replace(/\\/g, "/");
  if (LIA_RULES_MODULE.test(normalizedPath)) return []; // lia-rules.ts importing its own types is not a consumer
  if (LIA_RULES_ALLOWED_IMPORTERS.some((re) => re.test(normalizedPath))) return [];
  const violations: string[] = [];
  for (const imp of parseImports(src)) {
    if (LIA_RULES_MODULE.test(imp.from)) {
      violations.push(
        `${path}: imports "${imp.from}" but this file's path matches neither rule-pass.ts nor tests/ — lia-rules.ts may only be imported by LIA's rule-pass.ts (doc 207).`,
      );
    }
  }
  return violations;
}

async function collectLiaRulesImporters(): Promise<{ path: string; src: string }[]> {
  const results: { path: string; src: string }[] = [];
  for (const root of RULE_INTERPRETER_SWEEP_ROOTS) {
    for await (
      const entry of walk(root, {
        exts: [".ts"],
        includeDirs: false,
        skip: [...SKIP_DIRS].map((d) => new RegExp(`[\\\\/]${d}[\\\\/]`)),
      })
    ) {
      const p = entry.path.replace(/\\/g, "/");
      const src = await Deno.readTextFile(entry.path);
      if (parseImports(src).some((imp) => LIA_RULES_MODULE.test(imp.from))) {
        results.push({ path: p, src });
      }
    }
  }
  return results;
}

Deno.test("lia-rules.ts boundary — every real importer is rule-pass.ts or a test", async () => {
  const importers = await collectLiaRulesImporters();
  const violations: string[] = [];
  for (const { path, src } of importers) {
    violations.push(...liaRulesViolationsFor(path, src));
  }
  assertEquals(violations, [], violations.join("\n"));
  // The sweep must actually find rule-pass.ts as an importer, or the
  // pattern drifted and this test would pass vacuously.
  assert(
    importers.some((i) => i.path.endsWith("lia-deliverables/rule-pass.ts")),
    "rule-pass.ts must be found importing lia-rules.ts",
  );
});

Deno.test("lia-rules.ts boundary — REJECTS an importer outside rule-pass.ts/tests", () => {
  const src = `import { LIA_RULES, LIA_RULE_CONTEXT } from "../../corpus/maps/lia-rules.ts";`;
  const v = liaRulesViolationsFor("supabase/functions/run-li-assessment/index.ts", src);
  assertEquals(v.length, 1, JSON.stringify(v));
  assertEquals(
    liaRulesViolationsFor("supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-pass.ts", src),
    [],
  );
  assertEquals(liaRulesViolationsFor("tests/edge/run-li-assessment/doc207-rule-pass.test.ts", src), []);
});

Deno.test("doc191 §5 — the parser catches every import shape the barred names could arrive in", () => {
  const src = `
import { LIA_RULE_PROFILES } from "./lia-relevance-profiles.generated.ts";
import { LIA_PATTERN_PROFILES, LIA_PROFILES_VERSION } from "./lia-relevance-profiles.generated.ts";
import type { AuthorityRelevanceProfile } from "../../_shared/corpus/authority-relevance-profile.ts";
import * as profiles from "./risk-relevance-profiles.generated.ts";
import { LIA_RELEVANCE_PROFILES as bare } from "./lia-relevance-profiles.ts";
`;
  const imports = parseImports(src);
  assertEquals(imports.length, 5);
  assertEquals(imports[0].names, ["LIA_RULE_PROFILES"]);
  assertEquals(imports[1].names, ["LIA_PATTERN_PROFILES", "LIA_PROFILES_VERSION"]);
  assertEquals(imports[2].names, ["AuthorityRelevanceProfile"]);
  assertEquals(imports[3].names, ["*"]);
  // Aliasing must not launder the barred name.
  assertEquals(imports[4].names, ["LIA_RELEVANCE_PROFILES"]);

  assert(BARRED_IMPORT.test("LIA_PATTERN_PROFILES"));
  assert(BARRED_IMPORT.test("LIA_RELEVANCE_PROFILES"));
  assert(BARRED_IMPORT.test("PATTERN_PROFILES"));
  assert(!BARRED_IMPORT.test("LIA_RULE_PROFILES"));
  assert(ALLOWED_IMPORT.test("LIA_RULE_PROFILES"));
  assert(ALLOWED_IMPORT.test("LIA_PROFILES_VERSION"));
});
