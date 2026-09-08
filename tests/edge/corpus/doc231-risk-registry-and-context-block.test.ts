// DOC 231 — the "cppa-risk" `generate-corpus-hooks` registry entry, the
// generalised `elementOf`/`contextBlock` dispatch (doc231's edit to
// `_local/product-registry.ts` and `index.ts`'s `actionGenerate`), and the
// pin between `risk-hook-context-block.ts` and the canonical
// `risk-hooks.ts` [RATIFY — DRAFT] blocks — mirrors
// tests/edge/corpus/doc213-context-block-pin.test.ts and doc213-factor-
// element-pin.test.ts for the second product.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hookRegistryFor } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { riskElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/risk-factor-element.ts";
import { RISK_HOOK_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-hooks/_local/risk-hook-context-block.ts";
import { generateHooks, type HookRow } from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";

const CANONICAL_PATH = new URL(
  "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts",
  import.meta.url,
);
const MARKER = "// ── [RATIFY — DRAFT] — the direction matrix";

function lf(s: string): string {
  return s.replace(/\r\n/g, "\n");
}

Deno.test("doc231 — registry: 'cppa-risk' resolves to a complete HookProductVocabulary entry", () => {
  const registry = hookRegistryFor("cppa-risk");
  assert(registry, "cppa-risk must be registered");
  assertEquals(registry!.export_prefix, "RISK");
  assertEquals(registry!.output_path, "supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts");
  assert(registry!.typed_state_vocabulary.flags.includes("sensitive_pi"));
  assert(registry!.typed_state_vocabulary.data_categories.includes("Biometric information"));
  assertEquals(registry!.typed_state_vocabulary.classes, []); // [NEEDS] — no classifier yet
  assertEquals(registry!.typed_state_vocabulary.relationships, []); // [NEEDS] — no closed field yet
  assertEquals(registry!.elementOf("Safeguards"), "Safeguards");
  assertEquals(registry!.elementOf("not-a-real-factor"), null);
  assert(registry!.contextBlock.includes("RISK_HOOK_DIRECTION_MATRIX"));
});

Deno.test("doc231 — registry: 'lia' entry is unaffected by the generalisation (elementOf/contextBlock resolve to the same LIA content)", () => {
  const registry = hookRegistryFor("lia");
  assert(registry, "lia must still be registered");
  assertEquals(registry!.export_prefix, "LIA");
  assertEquals(registry!.elementOf("Interest legitimacy"), "purpose");
  assertEquals(registry!.elementOf("not-a-real-factor"), null);
  assert(registry!.contextBlock.includes("LIA_HOOK_DIRECTION_MATRIX"));
});

Deno.test("doc231 — riskElementOf: identity map over the 17 known CAM factors; null for anything else", () => {
  assertEquals(riskElementOf("Regulatory trigger and applicability"), "Regulatory trigger and applicability");
  assertEquals(riskElementOf("CPPA submission and certifying executive"), "CPPA submission and certifying executive");
  assertEquals(riskElementOf("Interest legitimacy"), null); // an LIA factor, not a Risk one
  assertEquals(riskElementOf(""), null);
});

Deno.test("doc231 — context block is the canonical risk-hooks.ts [RATIFY — DRAFT] blocks verbatim (CRLF-normalised)", async () => {
  const canonical = lf(await Deno.readTextFile(CANONICAL_PATH));
  const start = canonical.indexOf(MARKER);
  assert(start >= 0, `canonical marker not found: ${MARKER}`);
  assertEquals(lf(RISK_HOOK_CONTEXT_BLOCK), canonical.slice(start));
});

Deno.test("doc231 — generateHooks dispatch: an empty cppa-risk corpus emits a valid, empty file carrying the risk context block", () => {
  const registry = hookRegistryFor("cppa-risk")!;
  const result = generateHooks({
    product: "cppa-risk",
    rows: [] as HookRow[],
    profiles: new Map(),
    sources: new Map(),
    elementOf: registry.elementOf,
    hooksVersion: "risk-hooks-v2-test-0",
    outputPath: registry.output_path,
    exportPrefix: registry.export_prefix,
    contextBlock: registry.contextBlock,
  });
  assert(result.ok);
  assertEquals(result.emitted, 0);
  assert(result.contents?.includes("export const RISK_HOOKS_VERSION"));
  assert(result.contents?.includes("export const RISK_HOOKS: readonly AuthorityHook[] = [];"));
  assert(result.contents?.includes("RISK_HOOK_DIRECTION_MATRIX"));
});
