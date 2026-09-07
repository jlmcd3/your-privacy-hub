// DOC 207C — generate-corpus-rules: validation classes, round-trip, exclusion.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  generateRules,
  typeImportSpecifier,
  validateRuleRow,
  type AuthorityRuleRow,
  type RuleProfileRow,
} from "../../../supabase/functions/generate-corpus-rules/_local/generate.ts";
import { ruleRegistryFor } from "../../../supabase/functions/generate-corpus-rules/_local/product-registry.ts";
import { LIA_RULE_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-rules/_local/lia-rule-context.ts";
import { parseAtom, triggerAtomStrings } from "../../../supabase/functions/_shared/corpus/rule-types.ts";

const registry = ruleRegistryFor("lia")!;
const VOCAB = registry.typed_state_vocabulary;
const SCOPE = registry.instrument_scope;

const PROFILE_A = "11111111-1111-4111-8111-111111111111";
const PROFILE_B = "22222222-2222-4222-8222-222222222222";

function ratifiedProfile(id: string, over: Partial<RuleProfileRow> = {}): RuleProfileRow {
  return {
    id,
    rule_or_pattern: "rule",
    ratified_by: "ceo",
    ratified_at: "2026-09-07T00:00:00Z",
    ledger_ref: "ledger-1",
    ...over,
  };
}

function ruleRow(over: Partial<AuthorityRuleRow> = {}): AuthorityRuleRow {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    rule_id: "LIA-R-001",
    family: "206D#F2",
    product: "lia",
    profile_id: PROFILE_A,
    supporting_profile_ids: [],
    settledness: "R1",
    direction: "adverse",
    instrument_scope: ["EU GDPR"],
    regulator_scope: null,
    bears_on_factor_ids: ["reasonable_expectations"],
    bears_on_element: "balancing",
    trigger: { all: ["flag:special_category", "class:direct_marketing"] },
    effect: { kind: "cap_verdict", element: "balancing", cap: "fails" },
    reason_sentence: "Special category data processed for direct marketing cannot pass the balancing test on this record.",
    authority_citation: "EDPB Guidelines 1/2024, Section II.C",
    fixture_fires: { flags: ["special_category"] },
    fixture_silent: { flags: [] },
    retire_when: "EDPB withdraws Guidelines 1/2024",
    worksheet_ref: "206D#F2",
    ratified_by: "ceo",
    ratified_at: "2026-09-07T00:00:00Z",
    ledger_ref: "ledger-1",
    retired_at: null,
    ...over,
  };
}

function favorableRow(over: Partial<AuthorityRuleRow> = {}): AuthorityRuleRow {
  return ruleRow({
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    rule_id: "LIA-R-002",
    profile_id: PROFILE_B,
    direction: "favorable",
    settledness: "R1",
    bears_on_element: "purpose",
    trigger: { any: ["class:fraud_prevention", "state:intake.purpose_details.controller_is_public_authority=false"] },
    effect: { kind: "recognise_interest", element: "purpose", interest: "fraud prevention" },
    reason_sentence: "Fraud prevention is expressly recognised as a legitimate interest of the controller.",
    ...over,
  });
}

function baseInput(rows: readonly AuthorityRuleRow[], profiles: ReadonlyMap<string, RuleProfileRow>) {
  return {
    product: "lia",
    rows,
    profiles,
    vocabulary: VOCAB,
    instrumentScope: SCOPE,
    rulesVersion: "lia-rules-v1-2026-09-07-1",
    exportPrefix: registry.export_prefix,
    outputPath: registry.output_path,
    ruleContextBlock: LIA_RULE_CONTEXT_BLOCK,
  };
}

const PROFILES = new Map<string, RuleProfileRow>([
  [PROFILE_A, ratifiedProfile(PROFILE_A)],
  [PROFILE_B, ratifiedProfile(PROFILE_B)],
]);

// ── atom grammar ────────────────────────────────────────────────────────
Deno.test("parseAtom: kinds, operators and rejections", () => {
  assertEquals(parseAtom("flag:special_category")?.kind, "flag");
  assertEquals(parseAtom("data:Health or medical data")?.key, "Health or medical data");
  const v = parseAtom("verdict:necessity=fails");
  assertEquals(v?.kind, "verdict");
  assertEquals(v?.op, "=");
  assertEquals(v?.value, "fails");
  assertEquals(parseAtom("!flag:children")?.negated, true);
  assertEquals(parseAtom("nonsense"), null);
  assertEquals(parseAtom("bogus:thing"), null);
  assertEquals(parseAtom("flag:"), null);
  assertEquals(parseAtom("flag:children=true"), null); // operators only on verdict/state
  assertEquals(parseAtom(42), null);
});

Deno.test("triggerAtomStrings rejects non-object and unknown keys", () => {
  assertEquals(triggerAtomStrings({ all: ["flag:children"] }), ["flag:children"]);
  assertEquals(triggerAtomStrings({ some: ["x"] }), null);
  assertEquals(triggerAtomStrings(["flag:children"]), null);
  assertEquals(triggerAtomStrings({ all: [3] }), null);
});

// ── validation failure classes ──────────────────────────────────────────
const CASES: ReadonlyArray<[string, Partial<AuthorityRuleRow>, string]> = [
  ["unknown effect kind", { effect: { kind: "nudge" } }, "closed effect-kind set"],
  ["direction mismatch", { direction: "favorable", effect: { kind: "cap_verdict" } }, "does not match effect kind"],
  ["favorable eligibility", { direction: "favorable", settledness: "R2", effect: { kind: "recognise_interest" } }, "requires settledness R1"],
  ["favorable precedent on necessity", { direction: "favorable", settledness: "R3", effect: { kind: "precedent_verdict", element: "necessity" } }, "requires settledness R1|R2"],
  ["adverse override eligibility", { settledness: "R3", effect: { kind: "override_outcome" } }, "override_outcome requires settledness R1|R2"],
  ["bad element", { bears_on_element: "vibes" }, "bears_on_element"],
  ["unparseable atom", { trigger: { all: ["not an atom"] } }, "does not parse"],
  ["unknown flag", { trigger: { all: ["flag:moon_phase"] } }, "unknown flag"],
  ["unknown class", { trigger: { all: ["class:astrology"] } }, "unknown class"],
  ["unknown relationship", { trigger: { all: ["relationship:alien"] } }, "unknown relationship"],
  ["unknown data category", { trigger: { all: ["data:Shoe size"] } }, "unknown data category"],
  ["unknown verdict element", { trigger: { all: ["verdict:outcome=fails"] } }, "unknown verdict element"],
  ["unregistered state root", { trigger: { all: ["state:random.path"] } }, "not under a registered root"],
  ["empty trigger", { trigger: {} }, "names no atom"],
  ["unregistered instrument", { instrument_scope: ["US CCPA"] }, "is not registered"],
  ["empty instrument scope", { instrument_scope: [] }, "instrument_scope is empty"],
  ["fixture_fires not an object", { fixture_fires: [] }, "fixture_fires is not a JSON object"],
  ["fixture_silent not an object", { fixture_silent: "none" }, "fixture_silent is not a JSON object"],
  ["bracket in reason", { reason_sentence: "This rule [see note] applies." }, "contains a bracket"],
  ["reason too long", { reason_sentence: Array.from({ length: 41 }, () => "word").join(" ") }, "exceeds 40 words"],
];

for (const [name, patch, needle] of CASES) {
  Deno.test(`validation rejects: ${name}`, () => {
    const errors = validateRuleRow(ruleRow(patch), VOCAB, SCOPE);
    assert(errors.length > 0, `expected a failure for ${name}`);
    assert(errors.some((e) => e.includes(needle)), `expected "${needle}" in ${JSON.stringify(errors)}`);
  });
}

Deno.test("an invalid EMITTED row makes the whole run ok:false with no contents", () => {
  const result = generateRules(baseInput([ruleRow({ trigger: { all: ["flag:moon_phase"] } })], PROFILES));
  assertEquals(result.ok, false);
  assertEquals(result.emitted, 0);
  assertEquals(result.contents, null);
  assert(result.errors.length > 0);
});

// ── exclusion, not error ────────────────────────────────────────────────
Deno.test("an unstamped rule row is excluded with a warning, not an error", () => {
  const result = generateRules(baseInput([ruleRow({ ratified_by: null, ledger_ref: null })], PROFILES));
  assertEquals(result.ok, true);
  assertEquals(result.emitted, 0);
  assertEquals(result.errors.length, 0);
  assertEquals(result.excluded.length, 1);
  assertStringIncludes(result.excluded[0].reason, "not ratified");
  assertStringIncludes(result.contents!, "LIA_RULES: readonly AuthorityRule[] = [];");
});

Deno.test("a pattern-classified or unratified primary profile excludes the rule", () => {
  const patternProfiles = new Map(PROFILES);
  patternProfiles.set(PROFILE_A, ratifiedProfile(PROFILE_A, { rule_or_pattern: "pattern" }));
  const a = generateRules(baseInput([ruleRow()], patternProfiles));
  assertEquals(a.emitted, 0);
  assertStringIncludes(a.excluded[0].reason, 'rule_or_pattern="pattern"');

  const unratified = new Map(PROFILES);
  unratified.set(PROFILE_A, ratifiedProfile(PROFILE_A, { ratified_at: null }));
  const b = generateRules(baseInput([ruleRow()], unratified));
  assertEquals(b.emitted, 0);
  assertStringIncludes(b.excluded[0].reason, "is not ratified");
});

// ── round trip ──────────────────────────────────────────────────────────
Deno.test("typeImportSpecifier resolves from the lia output path", () => {
  assertEquals(typeImportSpecifier(registry.output_path), "../../../../_shared/corpus/rule-types.ts");
});

const canRunDenoCheck = (await Deno.permissions.query({ name: "run", command: "deno" })).state === "granted" &&
  (await Deno.permissions.query({ name: "write" })).state === "granted";

Deno.test("two-rule fixture set round-trips into well-formed contents", () => {
  const result = generateRules(baseInput([favorableRow(), ruleRow()], PROFILES));
  assertEquals(result.errors, []);
  assertEquals(result.ok, true);
  assertEquals(result.emitted, 2);
  // sorted by rule_id
  assert(result.contents!.indexOf('"LIA-R-001"') < result.contents!.indexOf('"LIA-R-002"'));
  assertStringIncludes(result.contents!, 'import type { AuthorityRule } from "../../../../_shared/corpus/rule-types.ts";');
  assertStringIncludes(result.contents!, 'export const LIA_RULES_VERSION = "lia-rules-v1-2026-09-07-1";');
  assertStringIncludes(result.contents!, "export const LIA_RULES: readonly AuthorityRule[] = [");
  assertStringIncludes(result.contents!, "export const LIA_RULE_CONTEXT = {");
  // The emitted array is valid JSON once the TS wrapper is stripped.
  const arrayText = result.contents!.slice(
    result.contents!.indexOf("readonly AuthorityRule[] = [") + "readonly AuthorityRule[] = ".length,
  );
  const parsed = JSON.parse(arrayText.slice(0, arrayText.indexOf("\n];") + 2));
  assertEquals(parsed.map((r: { rule_id: string }) => r.rule_id), ["LIA-R-001", "LIA-R-002"]);
});

Deno.test({
  name: "emitted contents are accepted by deno check",
  ignore: !canRunDenoCheck,
  fn: async () => {
    const result = generateRules(baseInput([favorableRow(), ruleRow()], PROFILES));
    const dir = await Deno.makeTempDir();
    const target = `${dir}/lia-rules.ts`;
    const specifier = new URL(
      "../../../supabase/functions/_shared/corpus/rule-types.ts",
      import.meta.url,
    ).href;
    await Deno.writeTextFile(
      target,
      result.contents!.replace("../../../../_shared/corpus/rule-types.ts", specifier),
    );
    const check = new Deno.Command("deno", { args: ["check", target], stdout: "piped", stderr: "piped" });
    const out = await check.output();
    assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
    await Deno.remove(dir, { recursive: true });
  },
});

Deno.test("the emitted context block is byte-identical to the pinned lia-rules.ts block", async () => {
  const pinned = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-rules.ts", import.meta.url),
  );
  const marker = "// ── LIA_RULE_CONTEXT ";
  assertStringIncludes(pinned, marker);
  assertEquals(pinned.slice(pinned.indexOf(marker)), LIA_RULE_CONTEXT_BLOCK);
});
