// DEPLOY-CAP _local MIRROR LAW — second relocation pass (run-li-assessment).
//
// Lovable's deploy bundles ALL of `_shared/` into every function, so modules
// consumed by only one function (or a small set) live at
// `<fn>/_local/<same subpath>` in exactly the functions that consume them
// (cross-function imports do not deploy, so each consumer carries a copy).
// This pass relocated the modules below out of `_shared/ltp`, `_shared/prose`
// and `_shared/intake-contracts` so `run-li-assessment` (and every other
// non-consumer) stops carrying them. The risk-function copies are ALSO
// covered by tests/edge/risk-local-mirror.test.ts; this file is the guard for
// the whole manifest, including the non-risk consumer sets.
//
// Law: every copy of a subpath is byte-identical (edit one → this test names
// the divergent path until every copy is updated), and no relocated module
// ever returns to `_shared`. The first function listed is the canonical copy
// (the one tests, scripts and src import).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";

const FN_ROOT = fromFileUrl(new URL("../../supabase/functions/", import.meta.url));

/** subpath under `_local/` → consuming functions (canonical copy first). */
export const DEPLOY_CAP_RELOCATIONS: ReadonlyArray<readonly [string, readonly string[]]> = [
  // risk assembler + factor engine — consumed only by the two v3 risk generators
  ["ltp/risk-skeleton-assemble.ts", ["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen"]],
  ["ltp/risk-factor-engine.ts", ["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen"]],
  ["prose/plans/cppa-risk.spine.ts", ["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen"]],
  ["ltp/risk-timing.ts", ["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen"]],
  ["ltp/ca-pi-taxonomy.ts", ["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen"]],
  ["ltp/admt-significant-decision.ts", [
    "run-cppa-risk-assessment", "run-cppa-risk-assessment-v2", "ltp-risk-doc-gen", "replay-cppa-risk-harness",
  ]],
  ["ltp/cyber-audit-schedule.ts", [
    "run-cppa-risk-assessment", "run-cppa-risk-assessment-v2", "ltp-risk-doc-gen", "replay-cppa-risk-harness",
    "run-cppa-cybersecurity",
  ]],
  ["ltp/release-ledger.ts", ["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen", "run-dpia-framework"]],
  // DPIA renderer (doc 266 INV-5, 2026-09-17) — the DPIA generator and its replay
  // harness; the quality harness keeps dpia-deliverables/ in _shared and takes
  // nothing from these.
  ["ltp/dpia-skeleton-assemble.ts", ["run-dpia-framework", "replay-dpia-harness"]],
  ["ltp/dpia-skeleton-tables.ts", ["run-dpia-framework", "replay-dpia-harness"]],
  ["prose/plans/dpia.spine.ts", ["run-dpia-framework", "replay-dpia-harness"]],
  ["prose/plans/dpia.slotmap.ts", ["run-dpia-framework", "replay-dpia-harness"]],
  ["report-exhibits/dpia-spine-authorities.ts", ["run-dpia-framework", "replay-dpia-harness"]],
  ["corpus/maps/dpia-corpus-map.ts", ["run-dpia-framework", "replay-dpia-harness"]],
  ["ltp/dpia-csc.ts", ["run-dpia-framework"]],
  // governance / admt-v2 / report-pdf
  ["ltp/governance-readiness.ts", ["run-governance-assessment", "generate-report-pdf"]],
  ["ltp/splice-case.ts", ["run-governance-assessment", "run-admt-checker-v2"]],
  ["prose/hedge-degrade.ts", ["run-dpia-framework", "run-governance-assessment"]],
  // quality harness
  ["ltp/mode-assert.ts", ["quality-batch-orchestrator", "batch-kickoff-pickup", "kick-perfect-intake"]],
  // biometric / registration
  ["prose/biometric-reference-passages.ts", ["check-biometric-compliance", "run-registration-assessment"]],
  // notices
  ["prose/formal-instrument.ts", ["generate-eu-notice", "generate-us-notice", "generate-report-pdf"]],
  ["prose/syllabus-page-html.ts", ["generate-ropa-document"]],
  // intake contracts consumed only by the stress / quality harnesses
  ["intake-contracts/eu-notice.ts", ["run-stress-job"]],
  ["intake-contracts/us-notice.ts", ["run-stress-job"]],
  ["intake-contracts/registration-assessment.ts", ["run-quality-batch", "generate-stress-fixtures", "run-stress-job"]],
  ["intake-contracts/validate.ts", ["run-quality-batch", "ql3-orchestrator", "run-stress-job"]],
];

function exists(p: string): boolean {
  try {
    Deno.statSync(p);
    return true;
  } catch {
    return false;
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, k) => v === b[k]);
}

Deno.test("deploy-cap mirror — every relocated copy is present", () => {
  const missing: string[] = [];
  for (const [sub, fns] of DEPLOY_CAP_RELOCATIONS) {
    for (const fn of fns) {
      if (!exists(join(FN_ROOT, fn, "_local", sub))) missing.push(`${fn}/_local/${sub}`);
    }
  }
  assertEquals(missing, [], `missing relocated copies:\n${missing.join("\n")}`);
});

Deno.test("deploy-cap mirror — every copy of a subpath is byte-identical to the canonical copy", () => {
  const divergent: string[] = [];
  for (const [sub, fns] of DEPLOY_CAP_RELOCATIONS) {
    const canonical = join(FN_ROOT, fns[0], "_local", sub);
    if (!exists(canonical)) continue; // reported by the presence test
    const a = Deno.readFileSync(canonical);
    for (const fn of fns.slice(1)) {
      const p = join(FN_ROOT, fn, "_local", sub);
      if (!exists(p)) continue;
      if (!sameBytes(a, Deno.readFileSync(p))) divergent.push(`${sub}: ${fns[0]} != ${fn}`);
    }
  }
  assertEquals(divergent, [], `divergent _local copies:\n${divergent.join("\n")}`);
});

Deno.test("deploy-cap mirror — the relocated modules never return to _shared", () => {
  const back: string[] = [];
  for (const [sub] of DEPLOY_CAP_RELOCATIONS) {
    if (exists(join(FN_ROOT, "_shared", sub))) back.push(sub);
  }
  // Test-only module parked under _tests (no function consumes it).
  if (exists(join(FN_ROOT, "_shared", "ltp/dpia-rendered-surfaces.ts"))) back.push("ltp/dpia-rendered-surfaces.ts");
  assertEquals(back, [], `relocated modules reappeared in _shared:\n${back.join("\n")}`);
});

Deno.test("deploy-cap mirror — repairRegister is imported from its canonical home, never via the risk assembler", () => {
  // The risk assembler re-exports repairRegister from ltp/register-repair.ts.
  // Importing it THROUGH the assembler drags the whole risk blob (factor
  // engine, spine, taxonomy) into a non-risk function's graph — exactly the
  // coupling this pass removed. Only the two risk generators may import the
  // assembler at all.
  const offenders: string[] = [];
  const allowed = new Set(["run-cppa-risk-assessment-v2", "ltp-risk-doc-gen"]);
  for (const e of Deno.readDirSync(FN_ROOT)) {
    if (!e.isDirectory || e.name.startsWith("_") || allowed.has(e.name)) continue;
    const stack = [join(FN_ROOT, e.name)];
    while (stack.length) {
      const dir = stack.pop()!;
      for (const f of Deno.readDirSync(dir)) {
        const p = join(dir, f.name);
        if (f.isDirectory) stack.push(p);
        else if (f.name.endsWith(".ts")) {
          const src = Deno.readTextFileSync(p);
          if (/from\s+["'][^"']*risk-skeleton-assemble\.ts["']/.test(src)) offenders.push(`${e.name}: ${f.name}`);
        }
      }
    }
  }
  assert(offenders.length === 0, `risk-skeleton-assemble imported outside the risk generators:\n${offenders.join("\n")}`);
});
