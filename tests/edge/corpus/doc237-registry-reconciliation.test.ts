// DOC 237 (2026-09-09) — THE RECONCILED HOOK PRODUCT REGISTRY.
//
// `v3-dpia` (doc 232), `v3-cppa-risk` (doc 231/231A) and `v3-admt` (doc 235)
// each edited generate-corpus-hooks/_local/product-registry.ts without
// seeing the others: Risk generalised `HookProductVocabulary` with
// `elementOf`/`contextBlock` and made `index.ts`'s `actionGenerate` dispatch
// through the registry; DPIA and ADMT added their entries against the OLD
// shape (and disclosed it). A mechanical merge left `dpia`/`admt` entries
// that failed `deno check` under the new interface. This file pins the
// reconciled result — FOUR entries, all in the generalised shape, each
// dispatching to its OWN factor→element map and [RATIFY] context block —
// and closes the one gap none of the three branches could test: the
// `generateHooks` dispatch for `product: "dpia"` (doc 232's own §9.2
// follow-up), alongside a cross-product isolation check no single-product
// test can express.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HOOK_PRODUCT_REGISTRY, hookRegistryFor } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { liaElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/factor-element.ts";
import { dpiaElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/dpia-factor-element.ts";
import { riskElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/risk-factor-element.ts";
import { admtElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/admt-factor-element.ts";
import { LIA_HOOK_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-hooks/_local/hook-context-block.ts";
import { DPIA_HOOK_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-hooks/_local/dpia-hook-context-block.ts";
import { RISK_HOOK_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-hooks/_local/risk-hook-context-block.ts";
import { ADMT_HOOK_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-hooks/_local/admt-hook-context-block.ts";
import {
  generateHooks,
  type HookProfileRow,
  type HookRow,
  type HookSourceRow,
} from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";

const EXPECTED: Readonly<Record<string, {
  prefix: string;
  elementOf: (f: string) => string | null;
  contextBlock: string;
  ownFactor: string;
  ownElement: string;
}>> = {
  lia: { prefix: "LIA", elementOf: liaElementOf, contextBlock: LIA_HOOK_CONTEXT_BLOCK, ownFactor: "Interest legitimacy", ownElement: "purpose" },
  dpia: { prefix: "DPIA", elementOf: dpiaElementOf, contextBlock: DPIA_HOOK_CONTEXT_BLOCK, ownFactor: "the necessity and proportionality analysis", ownElement: "adequacy" },
  "cppa-risk": { prefix: "RISK", elementOf: riskElementOf, contextBlock: RISK_HOOK_CONTEXT_BLOCK, ownFactor: "Safeguards", ownElement: "Safeguards" },
  admt: { prefix: "ADMT", elementOf: admtElementOf, contextBlock: ADMT_HOOK_CONTEXT_BLOCK, ownFactor: "Access process", ownElement: "Access process" },
};

Deno.test("doc237 — the registry carries exactly the four V3 products, every entry in the generalised shape", () => {
  assertEquals(Object.keys(HOOK_PRODUCT_REGISTRY).sort(), ["admt", "cppa-risk", "dpia", "lia"]);
  for (const [product, exp] of Object.entries(EXPECTED)) {
    const r = hookRegistryFor(product);
    assert(r, `${product} must be registered`);
    assertEquals(r!.export_prefix, exp.prefix);
    assertEquals(typeof r!.elementOf, "function", `${product}.elementOf must be a function`);
    assert(r!.contextBlock.length > 0, `${product}.contextBlock must be non-empty`);
    // The entry dispatches to ITS OWN files — the same function object and
    // the same string the product's own pin tests already verify against
    // its canonical corpus/maps/<product>-hooks.ts.
    assert(r!.elementOf === exp.elementOf, `${product}.elementOf must be the product's own elementOf`);
    assert(r!.contextBlock === exp.contextBlock, `${product}.contextBlock must be the product's own context block`);
    assertEquals(r!.elementOf(exp.ownFactor), exp.ownElement);
  }
});

Deno.test("doc237 — each context block carries its OWN prefixed [RATIFY] blocks and no other product's", () => {
  const prefixes = Object.values(EXPECTED).map((e) => e.prefix);
  for (const [product, exp] of Object.entries(EXPECTED)) {
    const block = hookRegistryFor(product)!.contextBlock;
    for (const name of ["HOOK_DIRECTION_MATRIX", "ATOM_PHRASES", "HOOK_SHAPES", "APPEAL_SENTENCE", "SETTLEDNESS_LABELS"]) {
      assert(block.includes(`${exp.prefix}_${name}`), `${product}: context block is missing ${exp.prefix}_${name}`);
    }
    for (const other of prefixes.filter((p) => p !== exp.prefix)) {
      assert(!block.includes(`export const ${other}_HOOK_SHAPES`), `${product}: context block leaks ${other}_HOOK_SHAPES`);
    }
  }
});

Deno.test("doc237 — cross-product isolation: a product's elementOf never resolves another product's factor", () => {
  for (const [product, exp] of Object.entries(EXPECTED)) {
    const r = hookRegistryFor(product)!;
    for (const [otherProduct, other] of Object.entries(EXPECTED)) {
      if (otherProduct === product) continue;
      assertEquals(r.elementOf(other.ownFactor), null, `${product}.elementOf must not resolve ${otherProduct}'s factor "${other.ownFactor}"`);
    }
    assertEquals(r.elementOf("not-a-real-factor"), null);
  }
});

// ── The DPIA dispatch — the test doc 232 §9.2 deferred to "once the Risk
// generalisation lands" ─────────────────────────────────────────────────

const PROFILE_D = "33333333-3333-4333-8333-333333333333";
const F_ADEQUACY = "the necessity and proportionality analysis";

function hookRow(over: Partial<HookRow> = {}): HookRow {
  return {
    id: "dpia-hook-1", profile_id: PROFILE_D, product: "dpia", hook_version: 1, hook_status: "ratified",
    fact_atoms: ["flag:biometric"], distinguishing_atoms: [],
    not_distinguishable: false, required_atoms: [], finding_span: "lacked a structured analysis",
    fact_pattern_paraphrase: "a biometric measure was deployed without a documented analysis",
    finding_paraphrase: "the assessment lacked a structured suitability, necessity and proportionality analysis",
    trigger_terms: ["biometric", "proportionality"],
    settledness: "R3", ratified_by: "ceo", ratified_at: "2026-09-08T00:00:00Z", ledger_ref: "doc237-1",
    retired_at: null,
    pinpoint: { kind: "section", ref: "Findings", anchor_span: "lacked a structured analysis" },
    ...over,
  };
}

function profileRow(over: Partial<HookProfileRow> = {}): HookProfileRow {
  return {
    id: PROFILE_D, source_table: "enforcement_actions", source_row_id: "row-dpia-1", outcome_posture: "rejected",
    instrument: "EU GDPR", factor_ids: [F_ADEQUACY],
    use_case_class: "employee_monitoring", relationship: "employee",
    data_categories: ["Biometric data"], flags: ["biometric"],
    curation_note: "Test fixture — doc 237", ratified_by: "ceo", ratified_at: "2026-09-08T00:00:00Z",
    ledger_ref: "doc237-1", ...over,
  };
}

function sourceRow(over: Partial<HookSourceRow> = {}): HookSourceRow {
  return {
    source_table: "enforcement_actions", regulator: "AEPD", subject: "Test Matter",
    decision_date: "2025-11-06", appeal_status: "final", ...over,
  };
}

function runDpia(rows: HookRow[], profiles: HookProfileRow[]) {
  const registry = hookRegistryFor("dpia")!;
  return generateHooks({
    product: "dpia", rows,
    profiles: new Map(profiles.map((p) => [p.id, p])),
    sources: new Map(profiles.map((p) => [p.id, sourceRow({ source_table: p.source_table })])),
    // Exactly what actionGenerate passes: the registry's own fields, no
    // per-product branch.
    elementOf: registry.elementOf,
    hooksVersion: "dpia-hooks-v2-2026-09-09-0",
    outputPath: registry.output_path,
    exportPrefix: registry.export_prefix,
    contextBlock: registry.contextBlock,
  });
}

Deno.test("doc237 — generateHooks dispatch for product 'dpia': a ratified hook over a ratified profile is emitted with DPIA's own element and context block", () => {
  const result = runDpia([hookRow()], [profileRow()]);
  assert(result.ok, JSON.stringify(result.errors));
  assertEquals(result.emitted, 1, JSON.stringify(result.excluded));
  const contents = result.contents!;
  assert(contents.includes("export const DPIA_HOOKS: readonly AuthorityHook[] = ["));
  assert(contents.includes('"bears_on_element": "adequacy"'));
  assert(contents.includes('"factor_id": "the necessity and proportionality analysis"'));
  assert(contents.includes("export const DPIA_HOOK_DIRECTION_MATRIX"));
  // (DPIA's block MENTIONS LIA_HOOK_DIRECTION_MATRIX in its own header —
  // "VERBATIM COPY of…" — so the leak check is on the exported symbol.)
  assert(!contents.includes("export const LIA_HOOK_DIRECTION_MATRIX"), "the DPIA file must not carry LIA's context block");
  // The import specifier is computed from DPIA's own output path.
  assert(contents.includes('from "../../../../_shared/corpus/hook-types.ts"'), contents.split("\n").find((l) => l.includes("hook-types")) ?? "no import line");
});

Deno.test("doc237 — generateHooks dispatch for product 'dpia': a factor outside dpiaElementOf's map is excluded by name, never emitted blank", () => {
  const result = runDpia([hookRow()], [profileRow({ factor_ids: ["Interest legitimacy"] })]); // an LIA factor
  assertEquals(result.emitted, 0);
  assert(result.excluded[0].reason.includes('factor "Interest legitimacy" maps to no'), result.excluded[0].reason);
});

Deno.test("doc237 — generateHooks dispatch for product 'dpia': an empty corpus emits a valid, empty file carrying the DPIA context block", () => {
  const result = runDpia([], []);
  assert(result.ok);
  assertEquals(result.emitted, 0);
  assert(result.contents!.includes("export const DPIA_HOOKS: readonly AuthorityHook[] = [];"));
  assert(result.contents!.includes("DPIA_ATOM_PHRASES"));
});

// ── index.ts: the dispatch really is registry-only ────────────────────────

Deno.test("doc237 — generate-corpus-hooks/index.ts dispatches actionGenerate through the registry and imports no product's elementOf/context block directly", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/generate-corpus-hooks/index.ts", import.meta.url));
  // Import statements only — index.ts's own comments legitimately NAME
  // liaElementOf / LIA_HOOK_CONTEXT_BLOCK when explaining the generalisation.
  const imports = src.split("\n").filter((l) => /^\s*import\b/.test(l) || /^\s*}\s*from\s+["']/.test(l)).join("\n");
  for (const banned of [
    "factor-element.ts", "hook-context-block.ts",
    "dpia-factor-element.ts", "dpia-hook-context-block.ts",
    "risk-factor-element.ts", "risk-hook-context-block.ts",
    "admt-factor-element.ts", "admt-hook-context-block.ts",
  ]) {
    assert(!imports.includes(`/${banned}"`), `index.ts must not import ${banned} — the registry owns the dispatch`);
  }
  assert(src.includes("elementOf: registry.elementOf"), "actionGenerate must pass registry.elementOf");
  assert(src.includes("contextBlock: registry.contextBlock"), "actionGenerate must pass registry.contextBlock");
});

Deno.test("doc237 — actionGenerate's bulk source loader covers every source table generate.ts can derive a citation for (incl. cppa_fsor_commentary, doc 231A NEEDS)", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/generate-corpus-hooks/index.ts", import.meta.url));
  const start = src.indexOf("async function actionGenerate(");
  const end = src.indexOf("async function actionStatus(");
  assert(start >= 0 && end > start, "actionGenerate / actionStatus not found");
  const body = src.slice(start, end);
  for (const table of ["edpb_guidelines", "enforcement_actions", "regulatory_guidance", "cppa_fsor_commentary"]) {
    assert(body.includes(`.from("${table}")`), `actionGenerate's bulk loader must fetch ${table} source rows`);
    assert(body.includes(`p.source_table === "${table}"`), `actionGenerate must route ${table} profiles to their source rows`);
  }
});
