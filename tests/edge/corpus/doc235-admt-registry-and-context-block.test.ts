// DOC 235 — the ADMT hook-generation registry entry, `admtElementOf`, the
// context-block pin, and an end-to-end `generateHooks()` dispatch for
// `product: "admt"`. Mirrors
// tests/edge/corpus/doc231-risk-registry-and-context-block.test.ts's own
// five-test structure (doc 231 §2) and
// tests/edge/corpus/doc213-hooks-generator.test.ts's fixture conventions.
//
// NOTE (disclosed, not a defect in this test): `generateHooks()` (the pure
// core, generate.ts) already takes `elementOf`/`contextBlock` as EXPLICIT
// parameters and is fully product-agnostic — this test exercises it
// directly, exactly the way doc 231A's own `doc231a-fsor-source-branch.
// test.ts` exercised the pure path around a similar gap. What is NOT tested
// here (because it does not exist on `main`) is `actionGenerate`'s HTTP
// dispatch actually reaching `admtElementOf`/`ADMT_HOOK_CONTEXT_BLOCK` for a
// live "generate" action — that dispatch is still hardcoded to the `lia`
// path on `main` (see doc 235's build log; the CPPA-Risk agent's
// generalisation of it lives only on the unmerged `v3-cppa-risk` branch).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hookRegistryFor } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import {
  generateHooks,
  type HookProfileRow,
  type HookRow,
  type HookSourceRow,
} from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { admtElementOf, ADMT_FACTOR_ELEMENT } from "../../../supabase/functions/generate-corpus-hooks/_local/admt-factor-element.ts";
import { ADMT_HOOK_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-hooks/_local/admt-hook-context-block.ts";
import { ADMT_FACTOR_PHRASES } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";
import { readFileSync } from "node:fs";

const REGISTRY = hookRegistryFor("admt");

Deno.test("HOOK_PRODUCT_REGISTRY carries an 'admt' entry with the expected vocabulary shape", () => {
  assert(REGISTRY, "hookRegistryFor('admt') returned undefined");
  assertEquals(REGISTRY!.export_prefix, "ADMT");
  assertEquals(REGISTRY!.output_path, "supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts");
  assertEquals(REGISTRY!.instrument_scope, ["CPPA ADMT Regulations"]);
  assertEquals(REGISTRY!.typed_state_vocabulary.relationships, []);
  assertEquals(REGISTRY!.typed_state_vocabulary.data_categories, []);
  assert(REGISTRY!.typed_state_vocabulary.flags.includes("no_human_review"));
  assert(REGISTRY!.typed_state_vocabulary.classes.includes("hiring_admission"));
  assertEquals(REGISTRY!.typed_state_vocabulary.verdict_elements.length, 8);
});

Deno.test("admtElementOf — identity map over the eight known CAM factor ids; unknown factor -> null", () => {
  for (const f of Object.keys(ADMT_FACTOR_ELEMENT)) {
    assertEquals(admtElementOf(f), f);
  }
  assertEquals(admtElementOf("Not a real factor"), null);
});

Deno.test("admt-factor-element.ts's factor set matches admt-hooks.ts's ADMT_FACTOR_PHRASES key set in both directions", () => {
  const fromFactorElement = new Set(Object.keys(ADMT_FACTOR_ELEMENT));
  const fromPhrases = new Set(Object.keys(ADMT_FACTOR_PHRASES));
  assertEquals(fromFactorElement.size, fromPhrases.size);
  for (const f of fromFactorElement) assert(fromPhrases.has(f), `admt-hooks.ts has no phrase for factor "${f}"`);
  for (const f of fromPhrases) assert(fromFactorElement.has(f), `admt-factor-element.ts has no entry for factor "${f}"`);
});

Deno.test("ADMT_HOOK_CONTEXT_BLOCK is byte-identical (after CRLF->LF normalisation) to the canonical admt-hooks.ts content from the ADMT_HOOKS line onward", () => {
  const canonicalPath = new URL(
    "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts",
    import.meta.url,
  );
  const canonical = readFileSync(canonicalPath, "utf8").replace(/\r\n/g, "\n");
  const marker = "export const ADMT_HOOKS: readonly AuthorityHook[] = [];\n";
  const idx = canonical.indexOf(marker);
  assert(idx >= 0, "marker not found in canonical admt-hooks.ts");
  const rest = canonical.slice(idx + marker.length).replace(/^\n+/, "");
  assertEquals(ADMT_HOOK_CONTEXT_BLOCK.replace(/\r\n/g, "\n"), rest);
});

// ── End-to-end generateHooks() dispatch for product: "admt" ──────────────

const PROFILE_A = "22222222-2222-4222-8222-222222222222";

function hookRow(over: Partial<HookRow> = {}): HookRow {
  return {
    id: "admt-hook-1", profile_id: PROFILE_A, product: "admt", hook_version: 1, hook_status: "ratified",
    fact_atoms: ["class:hiring_admission"], distinguishing_atoms: [],
    not_distinguishable: false, required_atoms: [], finding_span: "did not disclose the outcome",
    fact_pattern_paraphrase: "a business used ADMT for a hiring decision",
    finding_paraphrase: "the access response must disclose the outcome and the reasons for it",
    trigger_terms: ["hiring", "access"],
    settledness: "R1", ratified_by: "ceo", ratified_at: "2026-09-08T00:00:00Z", ledger_ref: "doc235-1",
    retired_at: null,
    pinpoint: { kind: "section", ref: "7222(b)", anchor_span: "did not disclose the outcome" },
    ...over,
  };
}

function profileRow(over: Partial<HookProfileRow> = {}): HookProfileRow {
  return {
    id: PROFILE_A, source_table: "enforcement_actions", source_row_id: "row-admt-1", outcome_posture: "rejected",
    instrument: "CPPA ADMT Regulations", factor_ids: ["Access process"],
    use_case_class: "hiring_admission", relationship: null,
    data_categories: [], flags: [],
    curation_note: "Test fixture — doc 235", ratified_by: "ceo", ratified_at: "2026-09-08T00:00:00Z",
    ledger_ref: "doc235-1", ...over,
  };
}

function sourceRow(over: Partial<HookSourceRow> = {}): HookSourceRow {
  return {
    source_table: "enforcement_actions", regulator: "Test Regulator", subject: "Test Matter",
    decision_date: "2024-01-01", appeal_status: "final", ...over,
  };
}

function run(rows: HookRow[], profiles: HookProfileRow[]) {
  return generateHooks({
    product: "admt", rows,
    profiles: new Map(profiles.map((p) => [p.id, p])),
    sources: new Map(profiles.map((p) => [p.id, sourceRow({ source_table: p.source_table })])),
    elementOf: admtElementOf,
    hooksVersion: "admt-hooks-v2-2026-09-08-0",
    outputPath: REGISTRY!.output_path,
    exportPrefix: REGISTRY!.export_prefix,
    contextBlock: "// placeholder",
  });
}

Deno.test("generateHooks — product 'admt': a ratified hook over a ratified profile is emitted", () => {
  const result = run([hookRow()], [profileRow()]);
  assert(result.ok, JSON.stringify(result.errors));
  assertEquals(result.emitted, 1);
  assert(result.contents!.includes("ADMT_HOOKS"));
  assert(result.contents!.includes("hook-types.ts"));
});

Deno.test("generateHooks — product 'admt': an unratified hook row is excluded by name", () => {
  const result = run([hookRow({ hook_status: "settled" })], [profileRow()]);
  assertEquals(result.emitted, 0);
  assert(result.excluded[0].reason.includes('not "ratified"'));
});

Deno.test("generateHooks — product 'admt': a factor outside admtElementOf's eight known values is excluded, never emitted with a blank element", () => {
  const result = run([hookRow()], [profileRow({ factor_ids: ["Not a real factor"] })]);
  assertEquals(result.emitted, 0);
});
