// RISK _local MIRROR LAW — deploy-cap relocation guard.
//
// Lovable's deploy bundles ALL of `_shared/` into every function, so modules
// consumed only by the risk functions were relocated out of `_shared` into
// each consumer's own `_local/` tree (cross-function imports do not deploy,
// so each consumer carries a copy). This test is the drift guard: the copies
// are law-identical — any file present at the same `_local/` subpath in two
// risk functions MUST be byte-identical. Edit one copy → this test names the
// divergent path until every copy is updated.
//
// Canonical copy (the one tests and scripts import): run-cppa-risk-assessment.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fromFileUrl, join, relative } from "https://deno.land/std@0.224.0/path/mod.ts";

const FN_ROOT = fromFileUrl(new URL("../../supabase/functions/", import.meta.url));

const RISK_FNS = [
  "run-cppa-risk-assessment",
  "run-cppa-risk-assessment-v2",
  "ltp-risk-doc-gen",
  "replay-cppa-risk-harness",
];

function walk(dir: string, out: string[] = []): string[] {
  let entries;
  try {
    entries = [...Deno.readDirSync(dir)];
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory) walk(p, out);
    else if (e.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

function localTree(fn: string): Map<string, string> {
  const root = join(FN_ROOT, fn, "_local");
  const map = new Map<string, string>();
  for (const f of walk(root)) {
    map.set(relative(root, f).replaceAll("\\", "/"), f);
  }
  return map;
}

Deno.test("risk _local mirror — same subpath ⇒ byte-identical across the four risk functions", () => {
  const trees = RISK_FNS.map((fn) => ({ fn, tree: localTree(fn) }));
  const failures: string[] = [];
  for (let i = 0; i < trees.length; i++) {
    for (let j = i + 1; j < trees.length; j++) {
      for (const [sub, fileA] of trees[i].tree) {
        const fileB = trees[j].tree.get(sub);
        if (!fileB) continue;
        const a = Deno.readFileSync(fileA);
        const b = Deno.readFileSync(fileB);
        if (a.length !== b.length || !a.every((v, k) => v === b[k])) {
          failures.push(`${sub}: ${trees[i].fn} != ${trees[j].fn}`);
        }
      }
    }
  }
  assertEquals(failures, [], `divergent _local copies:\n${failures.join("\n")}`);
});

Deno.test("risk _local mirror — relocation sentinels present", () => {
  // One sentinel per relocated consumer-set group; a vanished copy is a deploy break.
  const mustExist: Array<[string, string]> = [
    // group {all four}: 48 files
    ["run-cppa-risk-assessment", "ltp/pass1-llm.ts"],
    ["run-cppa-risk-assessment", "ltp/section-composers/cppa-risk.ts"],
    ["run-cppa-risk-assessment-v2", "ltp/pass1-llm.ts"],
    ["ltp-risk-doc-gen", "ltp/pass1-llm.ts"],
    ["replay-cppa-risk-harness", "ltp/pass1-llm.ts"],
    // group {doc-gen, replay, v2}: 12 files
    ["run-cppa-risk-assessment-v2", "ltp/pass2-assembler.ts"],
    ["replay-cppa-risk-harness", "ltp/pass2-assembler.ts"],
    // group {doc-gen, v2}: 7 files
    ["run-cppa-risk-assessment-v2", "ltp/risk-corpus.ts"],
    ["run-cppa-risk-assessment-v2", "ltp/generate-cppa-risk.ts"],
    // group {doc-gen, primary, v2}: 2 files
    ["run-cppa-risk-assessment", "ltp/risk-refinement.ts"],
    ["run-cppa-risk-assessment", "ltp/risk-stamp.ts"],
  ];
  for (const [fn, sub] of mustExist) {
    let ok = true;
    try {
      Deno.statSync(join(FN_ROOT, fn, "_local", sub));
    } catch {
      ok = false;
    }
    assert(ok, `missing relocated copy: ${fn}/_local/${sub}`);
  }
});

Deno.test("risk _local mirror — the relocated modules never return to _shared", () => {
  // The relocation exists to keep risk-only bulk out of every function's deploy.
  const banned = [
    "ltp/pass1-llm.ts",
    "ltp/pass2-assembler.ts",
    "ltp/section-composers/cppa-risk.ts",
    "ltp/generate-cppa-risk.ts",
    "ltp/risk-prose-gold.ts",
    "render-plan/schema.ts",
    "report-schemas/cppa-risk.ts",
    "factors/cppa-risk-factors.ts",
  ];
  for (const sub of banned) {
    let exists = true;
    try {
      Deno.statSync(join(FN_ROOT, "_shared", sub));
    } catch {
      exists = false;
    }
    assertEquals(exists, false, `relocated module reappeared in _shared: ${sub}`);
  }
});
