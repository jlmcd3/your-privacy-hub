// DOC 232 — THE ZERO-CALL REGRESSION SUITE. Proves that with DPIA_V3_ENABLED
// off (the shipped default) no model call is ever made and report_data is
// byte-identical to the pre-existing (pre-doc-232) behaviour, mirroring the
// guarantee doc 224A §8 D10 requires of LIA's own build.
//
// Three independent, complementary proofs, because a full live invocation of
// `run-dpia-framework`'s multi-stage `runStitch` (DB-backed, chunked
// generation) is out of scope for a unit test:
//
//  1. FLAG DEFAULTS — DPIA_V3_ENABLED / DPIA_HOOKS_ENABLED are false with no
//     env var set (the shipped state).
//  2. PURITY + EMPTY CORPUS — `applyDpiaHooks`/`planDpiaHookSelection`/
//     `buildDpiaRuleStates` are pure (no fetch/invokeGated import anywhere
//     in their module graph — asserted by source scan) AND `DPIA_HOOKS`
//     (the corpus map) is `[]` today, so even a caller who ignored the flag
//     would plan zero items.
//  3. STATIC CALL-SITE CONTAINMENT — the one `invokeGated("classify-
//     propositions", …)` call this build added to
//     run-dpia-framework/index.ts is texually NESTED inside the
//     `if (DPIA_V3_ENABLED) {` block (brace-depth scan of the real file,
//     not a hand-copied excerpt) — the same class of proof the corpus
//     import-boundary tests already use in this codebase.
//  4. BYTE-IDENTITY OF THE ASSEMBLER — assembleDpiaSkeletonDocument's new
//     third parameter is a true no-op: called with it omitted, with
//     `undefined`, and with empty sentence arrays all produce byte-identical
//     JSON.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DPIA_V3_DEFAULT, DPIA_V3_ENABLED } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-v3-flag.ts";
import { DPIA_HOOKS_DEFAULT, DPIA_HOOKS_ENABLED } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-hooks-flag.ts";
import { DPIA_HOOKS } from "../../../supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-hooks.ts";
import { planDpiaHookSelection } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/dpia-hook-join.ts";
import { buildDpiaRuleStates } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/rule-states.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";

// ── 1. Flag defaults ────────────────────────────────────────────────────

Deno.test("doc232 — DPIA_V3_ENABLED and DPIA_HOOKS_ENABLED default to false (no env set, this test process)", () => {
  assertEquals(DPIA_V3_DEFAULT, false);
  assertEquals(DPIA_HOOKS_DEFAULT, false);
  assertEquals(DPIA_V3_ENABLED, false);
  assertEquals(DPIA_HOOKS_ENABLED, false);
});

// ── 2. Purity + empty corpus ─────────────────────────────────────────────

Deno.test("doc232 — DPIA_HOOKS ships empty (an unstamped/undrafted hook corpus is inert, doc 213's own law)", () => {
  assertEquals(DPIA_HOOKS.length, 0);
});

Deno.test("doc232 — planDpiaHookSelection plans zero items over the shipped (empty) DPIA_HOOKS", () => {
  const states = buildDpiaRuleStates({}, { description: "x".repeat(50), reasons_to_conduct: ["Data processed on a large scale"] }, undefined);
  const plan = planDpiaHookSelection(DPIA_HOOKS, states, states.verdicts, [], new Set(), { description: "x".repeat(50) });
  assertEquals(plan.items, []);
  assertEquals(plan.considered, []);
});

async function collectModuleGraph(entry: URL, seen = new Map<string, URL>()): Promise<Map<string, URL>> {
  const key = entry.href;
  if (seen.has(key)) return seen;
  seen.set(key, entry);
  const src = await Deno.readTextFile(entry);
  const importRe = /from\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(src))) {
    const spec = m[1];
    if (!spec.startsWith(".")) continue; // skip bare/https specifiers (std lib, npm, etc.)
    const resolved = new URL(spec.endsWith(".ts") ? spec : `${spec}.ts`, entry);
    await collectModuleGraph(resolved, seen);
  }
  return seen;
}

Deno.test("doc232 — no file in the DPIA hook-selection module graph imports fetch/invokeGated/a Supabase client (pure, no I/O)", async () => {
  const entry = new URL(
    "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/dpia-hook-join.ts",
    import.meta.url,
  );
  const graph = await collectModuleGraph(entry);
  // Also walk rule-states.ts's own graph (a sibling entry point, not
  // imported by dpia-hook-join.ts itself).
  const rsEntry = new URL(
    "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/rule-states.ts",
    import.meta.url,
  );
  await collectModuleGraph(rsEntry, graph);

  const offenders: string[] = [];
  for (const [key, url] of graph) {
    const src = await Deno.readTextFile(url);
    if (/invokeGated|createClient|Deno\.env\.get\(\s*["']SUPABASE|\bfetch\(/.test(src)) {
      offenders.push(key);
    }
  }
  assertEquals(offenders, [], `I/O found in the pure hook-selection module graph:\n${offenders.join("\n")}`);
});

// ── 3. Static call-site containment ──────────────────────────────────────

Deno.test("doc232 — the classify-propositions select_hooks call is nested inside `if (DPIA_V3_ENABLED)` in index.ts", async () => {
  const path = new URL("../../../supabase/functions/run-dpia-framework/index.ts", import.meta.url);
  const src = await Deno.readTextFile(path);
  const lines = src.split("\n");

  const guardLineIdx = lines.findIndex((l) => l.includes("if (DPIA_V3_ENABLED) {"));
  assert(guardLineIdx >= 0, "if (DPIA_V3_ENABLED) { not found in index.ts");

  // Brace-depth walk from the guard line to find its matching close.
  let depth = 0;
  let closeLineIdx = -1;
  for (let i = guardLineIdx; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) { closeLineIdx = i; break; }
      }
    }
    if (closeLineIdx >= 0) break;
  }
  assert(closeLineIdx > guardLineIdx, "could not find the matching close brace for if (DPIA_V3_ENABLED) {");

  const insideBlock = lines.slice(guardLineIdx, closeLineIdx + 1).join("\n");
  const outsideBefore = lines.slice(0, guardLineIdx).join("\n");
  const outsideAfter = lines.slice(closeLineIdx + 1).join("\n");

  assert(insideBlock.includes('action: "select_hooks"'), "select_hooks call not found inside the DPIA_V3_ENABLED block");
  assert(!outsideBefore.includes('action: "select_hooks"'), "select_hooks call found BEFORE the DPIA_V3_ENABLED guard opens");
  assert(!outsideAfter.includes('action: "select_hooks"'), "select_hooks call found AFTER the DPIA_V3_ENABLED guard closes");
});

// ── 4. Byte-identity of the skeleton assembler's v3 append ──────────────

Deno.test("doc232 — assembleDpiaSkeletonDocument's v3 append parameter is a true no-op when omitted/undefined/empty", () => {
  const report: Record<string, unknown> = {};
  const intake: Record<string, unknown> = { organization_name: "Acme GmbH", description: "x".repeat(60) };

  const a = assembleDpiaSkeletonDocument(report, intake);
  const b = assembleDpiaSkeletonDocument(report, intake, undefined);
  const c = assembleDpiaSkeletonDocument(report, intake, { obligation_sentences: [], adequacy_sentences: [] });

  assertEquals(JSON.stringify(a.document), JSON.stringify(b.document));
  assertEquals(JSON.stringify(a.document), JSON.stringify(c.document));
  assertEquals(a.register_findings, b.register_findings);
  assertEquals(a.register_findings, c.register_findings);
});

Deno.test("doc232 — assembleDpiaSkeletonDocument DOES append when sentences are supplied (proves the no-op above is real, not a broken feature)", () => {
  const report: Record<string, unknown> = {};
  const intake: Record<string, unknown> = { organization_name: "Acme GmbH", description: "x".repeat(60) };

  const withoutHooks = assembleDpiaSkeletonDocument(report, intake);
  const withHooks = assembleDpiaSkeletonDocument(report, intake, {
    obligation_sentences: ["In Test SA, the SA found that the trigger applied. (Test citation.)"],
    adequacy_sentences: [],
  });
  assert(JSON.stringify(withHooks.document) !== JSON.stringify(withoutHooks.document), "supplying a sentence should change the assembled document");
});

// ── 5. DOC 237 — the record block is flag-gated too ──────────────────────
// The containment test above walks the FIRST `if (DPIA_V3_ENABLED) {`
// block (the selection). `_meta.internal.dpia_v3` is written in a SECOND
// one; this pins that every `.dpia_v3 =` write sits inside some
// `if (DPIA_V3_ENABLED) {` block, so a flag-off report_data never gains
// the key (the same law LIA's lia_v3 / ADMT's admt_v3 blocks follow).

function blocksOf(lines: string[], opener: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  lines.forEach((line, i) => {
    if (!line.includes(opener)) return;
    let depth = 0;
    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === "{") depth++;
        else if (ch === "}") { depth--; if (depth === 0) { out.push([i, j]); return; } }
      }
    }
  });
  return out;
}

Deno.test("doc237 — every `_meta.internal.dpia_v3` write in index.ts sits inside an `if (DPIA_V3_ENABLED) {` block", async () => {
  const path = new URL("../../../supabase/functions/run-dpia-framework/index.ts", import.meta.url);
  const lines = (await Deno.readTextFile(path)).split("\n");
  const gated = blocksOf(lines, "if (DPIA_V3_ENABLED) {");
  assert(gated.length >= 2, `expected the selection block AND the record block, found ${gated.length} gated block(s)`);
  const writes = lines.map((l, i) => (/\.dpia_v3\s*=/.test(l) ? i : -1)).filter((i) => i >= 0);
  assert(writes.length >= 1, "no dpia_v3 write found");
  for (const w of writes) {
    assert(gated.some(([a, b]) => w > a && w < b), `dpia_v3 write at line ${w + 1} is outside every DPIA_V3_ENABLED block`);
  }
});
