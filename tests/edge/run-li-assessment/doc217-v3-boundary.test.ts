// DOC 217 §5.7 / D3 — THE RE-RENDER PATH HAS NO MODEL CLIENT IN ITS
// DEPENDENCY GRAPH. Walks every relative import reachable from the three
// modules the deterministic re-render runs through — the skeleton assembler
// (lia-skeleton-assemble.ts), the rule pass (rule-pass.ts) and the state-bag
// builder (rule-states.ts) — and fails if ANY reachable module imports a
// model client (`@anthropic-ai/sdk`, anything at `anthropic.com`, `openai`,
// or `_shared/llm-extraction.ts`) or calls one directly (an `api.anthropic
// .com` / `api.openai.com` endpoint, or an `ANTHROPIC_API_KEY` /
// `OPENAI_API_KEY` read). This is the code-level form of doc 212 §6.5's
// determinism law: replay reads the store; the model is never on the path.
//
// The walker is exercised against an in-memory graph too, so a checker that
// has only ever seen a compliant tree is proven to actually reject.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const ROOTS = [
  "supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts",
  "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-pass.ts",
  "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-states.ts",
];

/** Import specifiers that name a model client. */
const MODEL_CLIENT_SPECIFIER = /@anthropic-ai\/sdk|anthropic\.com|openai|_shared\/llm-extraction\.ts|(^|\/)llm-extraction\.ts$|(^|\/)anthropic-call\.ts$/i;
/** Direct model calls inside a module's own source (comments stripped). */
const MODEL_CLIENT_CALL = /api\.anthropic\.com|api\.openai\.com|ANTHROPIC_API_KEY|OPENAI_API_KEY/;

const REPO_ROOT = new URL("../../../", import.meta.url);

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
}

/** Every import/export-from/dynamic-import specifier in a module's source. */
export function importSpecifiers(src: string): string[] {
  const code = stripComments(src);
  const out: string[] = [];
  for (const m of code.matchAll(/(?:^|[^\w$.])(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g)) out.push(m[1]);
  for (const m of code.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)) out.push(m[1]);
  return out;
}

function isRelative(spec: string): boolean {
  return spec.startsWith("./") || spec.startsWith("../");
}

function normalise(path: string): string {
  const parts: string[] = [];
  for (const seg of path.replace(/\\/g, "/").split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
}

function resolveRelative(fromPath: string, spec: string): string {
  const dir = fromPath.split("/").slice(0, -1).join("/");
  return normalise(`${dir}/${spec}`);
}

export interface BoundaryViolation {
  readonly module: string;
  readonly reason: string;
}

/**
 * Walk the relative-import graph from `roots` (paths relative to the repo
 * root) using `read(path)` — returns every violation found and the set of
 * modules visited. Non-relative specifiers (https URLs, npm:, bare names)
 * are not followed but ARE checked against MODEL_CLIENT_SPECIFIER.
 */
export function walkForModelClients(
  roots: readonly string[],
  read: (path: string) => string | null,
): { violations: BoundaryViolation[]; visited: string[] } {
  const violations: BoundaryViolation[] = [];
  const visited = new Set<string>();
  const queue = [...roots.map(normalise)];
  while (queue.length) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);
    const src = read(path);
    if (src === null) {
      violations.push({ module: path, reason: "unreadable module in the reachable graph" });
      continue;
    }
    if (MODEL_CLIENT_CALL.test(stripComments(src))) {
      violations.push({ module: path, reason: "calls a model endpoint or reads a model API key" });
    }
    for (const spec of importSpecifiers(src)) {
      if (MODEL_CLIENT_SPECIFIER.test(spec)) {
        violations.push({ module: path, reason: `imports a model client: ${spec}` });
      }
      if (isRelative(spec)) queue.push(resolveRelative(path, spec));
    }
  }
  return { violations, visited: [...visited].sort() };
}

function readRepo(path: string): string | null {
  try {
    return Deno.readTextFileSync(new URL(path, REPO_ROOT));
  } catch {
    return null;
  }
}

Deno.test("doc217 boundary — no model client is reachable from the assembler, the rule pass or the state-bag builder", () => {
  const { violations, visited } = walkForModelClients(ROOTS, readRepo);
  assertEquals(violations, [], violations.map((v) => `${v.module}: ${v.reason}`).join("\n"));
  // The sweep must actually be a sweep: the three roots plus the modules they
  // are known to reach (a zero-visit walk would prove nothing).
  assert(visited.length >= 20, `only ${visited.length} modules visited: ${visited.join(", ")}`);
  for (const must of [
    "supabase/functions/_shared/corpus/rule-types.ts",
    "supabase/functions/_shared/corpus/rule-interpreter.ts",
    "supabase/functions/_shared/prose/skeleton-render.ts",
    "supabase/functions/run-li-assessment/_local/ltp/lia-persuasive-authority.ts",
    "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/hook-join.ts",
    "supabase/functions/run-li-assessment/_local/ltp/v3/readings.ts",
    "supabase/functions/run-li-assessment/_local/ltp/v3/field-labels.ts",
    "supabase/functions/run-li-assessment/_local/prose/plans/lia.spine.ts",
  ]) {
    assert(visited.includes(must), `${must} must be in the reachable graph`);
  }
  // And the model-side modules are NOT in it.
  for (const never of [
    "supabase/functions/_shared/anthropic-call.ts",
    "supabase/functions/_shared/llm-extraction.ts",
    "supabase/functions/_shared/gdpr-context.ts",
    "supabase/functions/run-li-assessment/index.ts",
  ]) {
    assert(!visited.includes(never), `${never} must not be reachable from the re-render path`);
  }
});

Deno.test("doc217 boundary — the walker REJECTS a graph that reaches a model client (directly, transitively, dynamically, or by endpoint)", () => {
  const files: Record<string, string> = {
    "a/root.ts": `import { x } from "./mid.ts";\nexport const y = x;`,
    "a/mid.ts": `import { z } from "../lib/client.ts";\nexport const x = z;`,
    "lib/client.ts": `import Anthropic from "@anthropic-ai/sdk";\nexport const z = 1;`,
    "b/root.ts": `export async function f() { const m = await import("./lazy.ts"); return m; }`,
    "b/lazy.ts": `export const url = "https://api.openai.com/v1/chat/completions";`,
    "c/root.ts": `// mentions api.anthropic.com only in a comment\nexport const ok = 1;`,
    "d/root.ts": `import { call } from "../_shared/llm-extraction.ts";\nexport const q = call;`,
  };
  const read = (p: string) => files[p] ?? null;
  const a = walkForModelClients(["a/root.ts"], read);
  assertEquals(a.violations.length, 1);
  assertEquals(a.violations[0].module, "lib/client.ts");
  const b = walkForModelClients(["b/root.ts"], read);
  assertEquals(b.violations.map((v) => v.module), ["b/lazy.ts"]);
  const c = walkForModelClients(["c/root.ts"], read);
  assertEquals(c.violations, []);
  const d = walkForModelClients(["d/root.ts"], read);
  assertEquals(d.violations.length, 2, JSON.stringify(d.violations)); // the barred import, then the unreadable module
  assert(d.violations.some((v) => v.reason.startsWith("imports a model client")));
});

Deno.test("doc217 boundary — the repo's real model-client modules trip the checker when used as a root (the negative case on live code)", () => {
  const { violations } = walkForModelClients(["supabase/functions/_shared/anthropic-call.ts"], readRepo);
  assert(violations.length >= 1, "anthropic-call.ts must be recognised as a model client by call or import");
});
