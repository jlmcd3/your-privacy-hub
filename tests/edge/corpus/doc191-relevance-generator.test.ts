// DOC 191 §5 — the generator's validation checks and the RULE/PATTERN split.
//
// Every assertion here runs against FIXTURE rows, never live data: the point
// of the checks is that they REJECT bad input, and you cannot prove a
// rejection with data that happens to be good.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  canonicalCamProfileBytes,
  generateRelevanceProfiles,
  siblingConsistencyWarnings,
  typeImportSpecifier,
  type GeneratorCamRow,
} from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/generate.ts";
import type { AuthorityRelevanceProfileRow } from "../../../supabase/functions/_shared/corpus/authority-relevance-profile.ts";
import { isRuleRatified } from "../../../supabase/functions/_shared/corpus/authority-relevance-profile.ts";
import { PRODUCT_REGISTRY, LAYER_B_CLOSED_PRODUCTS } from "../../../supabase/functions/generate-corpus-relevance-profiles/_local/product-registry.ts";

const FACTORS = ["Factor A", "Factor B"];
const INSTRUMENTS = ["EU GDPR", "UK GDPR"];

const CAM_ROWS: GeneratorCamRow[] = [
  { id: "t/f-a/ap-01", role: "AP", source_table: "enforcement_actions", source_row_id: "src-1" },
  { id: "t/f-b/ap-01", role: "AP", source_table: "enforcement_actions", source_row_id: "src-1" }, // sibling
  { id: "t/f-a/ap-02", role: "AP", source_table: "edpb_guidelines", source_row_id: "src-2" },
  { id: "t/f-a/fc-01", role: "FC", source_table: "edpb_guidelines", source_row_id: "src-3" },
];

function row(over: Partial<AuthorityRelevanceProfileRow> = {}): AuthorityRelevanceProfileRow {
  return {
    id: "db-1",
    product: "test",
    source_table: "enforcement_actions",
    source_row_id: "src-1",
    cam_row_id: "t/f-a/ap-01",
    country: "FR",
    instrument: "EU GDPR",
    factor_ids: ["Factor A"],
    use_case_class: null,
    outcome_posture: "rejected",
    relationship: null,
    data_categories: [],
    flags: [],
    rule_or_pattern: "pattern",
    rule_statement: null,
    curation_note: "why this bears",
    curated_by: "tester",
    curated_at: "2026-09-06T00:00:00Z",
    ratified_by: null,
    ratified_at: null,
    ledger_ref: null,
    map_version_generated_into: null,
    pipeline_stage: "human",
    extracted_quote: null,
    quote_verified: false,
    self_consistency_agreement: null,
    confidence_tier: "high",
    pipeline_version: "test-v1",
    classified_at: "2026-09-06T00:00:00Z",
    ...over,
  };
}

function gen(rows: AuthorityRelevanceProfileRow[], over: Partial<Parameters<typeof generateRelevanceProfiles>[0]> = {}) {
  return generateRelevanceProfiles({
    product: "test",
    rows,
    camRows: CAM_ROWS,
    vocabulary: { factors: FACTORS, instruments: INSTRUMENTS },
    profilesVersion: "test-relevance-profiles-v1-2026-09-06",
    exportPrefix: "TEST",
    ...over,
  });
}

// ── The happy path, and the split that is the actual enforcement ────────────

Deno.test("doc191 §5 — a valid pattern row generates, keyed onto every sibling CAM row of its source", () => {
  const r = gen([row()]);
  assertEquals(r.errors, []);
  assertEquals(r.ok, true);
  assertEquals(Object.keys(r.pattern).sort(), ["t/f-a/ap-01", "t/f-b/ap-01"]);
  assertEquals(Object.keys(r.rule), []);
  assertEquals(r.pattern["t/f-a/ap-01"], r.pattern["t/f-b/ap-01"], "siblings share one profile object");
});

Deno.test("doc191 §5 — the emitted file carries PROFILES_VERSION and BOTH split exports, always", () => {
  const r = gen([row()]);
  assertStringIncludes(r.file, 'export const TEST_PROFILES_VERSION = "test-relevance-profiles-v1-2026-09-06"');
  assertStringIncludes(r.file, "export const TEST_RULE_PROFILES");
  assertStringIncludes(r.file, "export const TEST_PATTERN_PROFILES");
  // An empty rule half still ships as an empty map, never as an absent export
  // — a gate file importing it must fail on the ROW being missing, not on the
  // module having no such name.
  assertStringIncludes(r.file, "export const TEST_RULE_PROFILES: Readonly<Record<string, AuthorityRelevanceProfile>> = {};");
  assertStringIncludes(r.file, "GENERATED FILE — DO NOT EDIT BY HAND");
});

Deno.test("doc191 §5 — a RATIFIED rule row lands in RULE_PROFILES, not PATTERN_PROFILES", () => {
  const r = gen([row({
    rule_or_pattern: "rule",
    rule_statement: "X can never satisfy Y.",
    extracted_quote: "X can never satisfy Y.",
    quote_verified: true,
    ratified_by: "CEO",
    ratified_at: "2026-09-06T00:00:00Z",
    ledger_ref: "LEDGER-1",
  })]);
  assertEquals(r.errors, []);
  assertEquals(Object.keys(r.rule).sort(), ["t/f-a/ap-01", "t/f-b/ap-01"]);
  assertEquals(Object.keys(r.pattern), []);
  assertEquals(r.rule["t/f-a/ap-01"].rule_statement, "X can never satisfy Y.");
  assertStringIncludes(r.file, "X can never satisfy Y.");
});

// ── VALIDATION 1: factor vocabulary ─────────────────────────────────────────

Deno.test("doc191 §5 check 1 — a factor outside the product's vocabulary FAILS the build and emits no file", () => {
  const r = gen([row({ factor_ids: ["Factor A", "Not A Real Factor"] })]);
  assertEquals(r.ok, false);
  assertEquals(r.file, "");
  assert(r.errors.some((e) => e.includes('factor_id "Not A Real Factor"')), JSON.stringify(r.errors));
});

Deno.test("doc191 §3/§7.2 — a product with NO registered factor vocabulary fails loudly rather than accepting anything", () => {
  const r = gen([row()], { vocabulary: { factors: [], instruments: INSTRUMENTS } });
  assertEquals(r.ok, false);
  assert(r.errors.some((e) => e.includes("no registered factor vocabulary")), JSON.stringify(r.errors));
});

// ── VALIDATION 2: instrument ────────────────────────────────────────────────

Deno.test("doc191 §5 check 2 — an unregistered instrument FAILS the build", () => {
  const r = gen([row({ instrument: "Swiss FADP" })]);
  assertEquals(r.ok, false);
  assertEquals(r.file, "");
  assert(r.errors.some((e) => e.includes('instrument "Swiss FADP"')), JSON.stringify(r.errors));
});

// DOC 205 §12 item 3 / doc 205B §5 / doc 205B2 — Phase B wrote a
// "Directive 95/46" instrument value (the Amadeus/AEPD 2016 pre-GDPR
// profile) that blocked the ENTIRE lia build under validation 2 until this
// value was registered in PRODUCT_REGISTRY.lia.instruments. This pins that
// the real lia registry now accepts it, and that a "lia" product build with
// such a row passes check 2 (product "lia" here, not the "test" fixture
// default, specifically to exercise the real registered list).
Deno.test("doc205 §12 item 3 — a 'Directive 95/46' instrument row passes validation 2 for product lia", () => {
  const liaInstruments = PRODUCT_REGISTRY.lia.instruments;
  assert(liaInstruments.includes("Directive 95/46"), "PRODUCT_REGISTRY.lia.instruments must register Directive 95/46");
  const r = gen([row({ product: "lia", instrument: "Directive 95/46" })], {
    product: "lia",
    vocabulary: { factors: FACTORS, instruments: liaInstruments },
  });
  assertEquals(r.ok, true, JSON.stringify(r.errors));
  assert(!r.errors.some((e) => e.includes("instrument")), JSON.stringify(r.errors));
});

// ── VALIDATION 3: rule-row completeness + THE JUDGMENT CALL ─────────────────

Deno.test("doc191 §5 check 3 — an UNRATIFIED rule row is EXCLUDED with a warning; the rest of the batch still ships", () => {
  // THE DOCUMENTED JUDGMENT CALL (generate.ts header, flagged for the CEO):
  // §5 reads literally as "fail the build". §6.1's asymmetric-risk framing
  // says excluding a good row is the safe failure mode, and curation is
  // exactly where unratified candidates accumulate — so this excludes and
  // warns instead of breaking every other product row's build.
  const unratified = row({
    id: "db-rule",
    source_row_id: "src-2",
    cam_row_id: "t/f-a/ap-02",
    source_table: "edpb_guidelines",
    rule_or_pattern: "rule",
    rule_statement: "X is categorically excluded.",
    extracted_quote: "X is categorically excluded.",
    quote_verified: true,
  });
  const r = gen([row(), unratified]);

  assertEquals(r.ok, true, "the batch still ships");
  assertEquals(r.errors, []);
  // The pattern row is untouched.
  assertEquals(Object.keys(r.pattern).sort(), ["t/f-a/ap-01", "t/f-b/ap-01"]);
  // The unratified rule row reaches NEITHER map.
  assertEquals(Object.keys(r.rule), []);
  assert(!r.file.includes("X is categorically excluded."), "an unratified rule must not reach the shipped bytes");
  // And it is NAMED, not silently dropped.
  assertEquals(r.excluded.length, 1);
  assertEquals(r.excluded[0].cam_row_id, "t/f-a/ap-02");
  assertStringIncludes(r.excluded[0].reason, "ratified_by/ratified_at/ledger_ref");
  assert(r.warnings.some((w) => w.startsWith("EXCLUDED row db-rule")), JSON.stringify(r.warnings));
});

Deno.test("doc191 §8 — a PARTIAL ratification stamp is not a ratification", () => {
  for (const partial of [
    { ratified_by: "CEO" },
    { ratified_by: "CEO", ratified_at: "2026-09-06T00:00:00Z" },
    { ratified_at: "2026-09-06T00:00:00Z", ledger_ref: "L-1" },
  ]) {
    const r = row({
      rule_or_pattern: "rule",
      rule_statement: "S.",
      extracted_quote: "S.",
      quote_verified: true,
      ...partial,
    });
    assertEquals(isRuleRatified(r), false, JSON.stringify(partial));
    assertEquals(Object.keys(gen([r]).rule).length, 0, JSON.stringify(partial));
  }
});

Deno.test("doc191 §5 check 3 — a rule row with no rule_statement, or an unverified quote, HARD-FAILS", () => {
  const noStatement = gen([row({
    rule_or_pattern: "rule",
    rule_statement: null,
    quote_verified: true,
    ratified_by: "CEO",
    ratified_at: "2026-09-06T00:00:00Z",
    ledger_ref: "L-1",
  })]);
  assertEquals(noStatement.ok, false);
  assert(noStatement.errors.some((e) => e.includes("no rule_statement")), JSON.stringify(noStatement.errors));

  const unverified = gen([row({
    rule_or_pattern: "rule",
    rule_statement: "S.",
    quote_verified: false,
    ratified_by: "CEO",
    ratified_at: "2026-09-06T00:00:00Z",
    ledger_ref: "L-1",
  })]);
  assertEquals(unverified.ok, false);
  assert(unverified.errors.some((e) => e.includes("quote_verified=false")), JSON.stringify(unverified.errors));
});

// ── VALIDATION 4: cam_row_id existence ──────────────────────────────────────

Deno.test("doc191 §5 check 4 — a cam_row_id naming no row in the product's map FAILS the build", () => {
  const r = gen([row({ cam_row_id: "t/f-a/ap-99" })]);
  assertEquals(r.ok, false);
  assert(r.errors.some((e) => e.includes('cam_row_id "t/f-a/ap-99" names no row')), JSON.stringify(r.errors));
});

Deno.test("doc191 §5 — a profile whose source no AP row uses warns (curated but attaches to nothing) without failing", () => {
  const r = gen([row({ source_table: "edpb_guidelines", source_row_id: "src-3", cam_row_id: "t/f-a/fc-01" })]);
  assertEquals(r.ok, true);
  assertEquals(Object.keys(r.pattern), [], "an FC-only source produces no AP keys");
  assert(r.warnings.some((w) => w.includes("attaches to nothing")), JSON.stringify(r.warnings));
});

Deno.test("doc191 §4 — a duplicated (product, source_table, source_row_id) fails rather than silently picking a winner", () => {
  const r = gen([row(), row({ id: "db-2", country: "IE" })]);
  assertEquals(r.ok, false);
  assert(r.errors.some((e) => e.includes("duplicate profile")), JSON.stringify(r.errors));
});

Deno.test("doc191 §5 — a row belonging to another product fails rather than leaking across products", () => {
  const r = gen([row({ product: "other-product" })]);
  assertEquals(r.ok, false);
  assert(r.errors.some((e) => e.includes("does not match the requested product")), JSON.stringify(r.errors));
});

// ── VALIDATION 5 (§6.4): sibling consistency, computed, warning only ────────

Deno.test("doc191 §6.4 — the same source classified differently across products is a computed WARNING, not a stored column", () => {
  const mine = row();
  const theirs = row({
    id: "db-other",
    product: "cppa-risk",
    rule_or_pattern: "rule",
    rule_statement: "S.",
    quote_verified: true,
  });
  const warnings = siblingConsistencyWarnings([mine, theirs]);
  assertEquals(warnings.length, 1);
  assertStringIncludes(warnings[0], "source_row_id src-1");
  assertStringIncludes(warnings[0], "cppa-risk=rule");
  assertStringIncludes(warnings[0], "test=pattern");
  assertStringIncludes(warnings[0], "stage-4 audit sample");

  // Agreement across products produces nothing at all.
  assertEquals(siblingConsistencyWarnings([mine, row({ id: "db-other", product: "cppa-risk" })]), []);

  // And the generator surfaces it without failing the build.
  const r = gen([mine], { allProductRows: [mine, theirs] });
  assertEquals(r.ok, true);
  assert(r.warnings.some((w) => w.includes("sibling-consistency")), JSON.stringify(r.warnings));
});

// ── The pin surface ─────────────────────────────────────────────────────────

Deno.test("doc191 §7.3 — canonicalCamProfileBytes covers exactly the eight fields the scorer reads", () => {
  const base = {
    country: "FR",
    instrument: "EU GDPR",
    factor_ids: ["Factor A"],
    use_case_class: null,
    outcome_posture: "rejected",
    relationship: null,
    data_categories: ["Contact data"],
    flags: ["large_scale"],
  };
  // Curation bookkeeping does not change the bytes.
  assertEquals(
    canonicalCamProfileBytes({ ...base, ...{ curation_note: "different" } as never }),
    canonicalCamProfileBytes(base),
  );
  // Any of the eight does.
  assert(canonicalCamProfileBytes({ ...base, country: "IE" }) !== canonicalCamProfileBytes(base));
  assert(canonicalCamProfileBytes({ ...base, flags: [] }) !== canonicalCamProfileBytes(base));
});

// ── The emitted type import (ITEM 402-D: it must not escape the tree) ───────

Deno.test("ITEM 402-D — the emitted type import is computed per output path and never escapes supabase/functions/", () => {
  const cases: Readonly<Record<string, string>> = {
    // LIA: four levels down from supabase/functions/
    "supabase/functions/run-li-assessment/_local/corpus/maps/lia-relevance-profiles.generated.ts":
      "../../../../_shared/corpus/authority-relevance-profile.ts",
    // Risk/DPIA: inside _shared/corpus/maps/, one level below the type
    "supabase/functions/_shared/corpus/maps/risk-relevance-profiles.generated.ts":
      "../authority-relevance-profile.ts",
    "supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-relevance-profiles.generated.ts":
      "../../../../_shared/corpus/authority-relevance-profile.ts",
  };
  for (const [out, expected] of Object.entries(cases)) {
    assertEquals(typeImportSpecifier(out), expected, out);
    // Every specifier must resolve back INSIDE supabase/functions/.
    const dir = out.split("/").slice(0, -1);
    const parts = typeImportSpecifier(out).split("/");
    const resolved = [...dir];
    for (const p of parts) {
      if (p === "..") resolved.pop();
      else if (p !== ".") resolved.push(p);
    }
    assertEquals(resolved.join("/"), "supabase/functions/_shared/corpus/authority-relevance-profile.ts", out);
  }

  for (const [out] of Object.entries(cases)) {
    const file = gen([row()], { outputPath: out }).file;
    assertStringIncludes(file, `from "${typeImportSpecifier(out)}"`);
  }
});

// ── The registry ────────────────────────────────────────────────────────────

Deno.test("doc191 §3 — the registry covers exactly the seven build-candidate products and no ruled-out one", () => {
  assertEquals(
    Object.keys(PRODUCT_REGISTRY).sort(),
    ["biometric", "cppa-admt", "cppa-risk", "dpia", "governance", "ir-playbook", "lia"],
  );
  for (const closed of LAYER_B_CLOSED_PRODUCTS) {
    assertEquals(PRODUCT_REGISTRY[closed], undefined, `${closed} must have no registry entry (doc 190 §6)`);
  }
  // The three products doc 191 §3 marks "does not exist yet" carry no factors.
  for (const p of ["governance", "ir-playbook", "biometric"]) {
    assertEquals(PRODUCT_REGISTRY[p].factors, null, `${p}: no vocabulary may be invented (doc 191 §7.2)`);
  }
});
