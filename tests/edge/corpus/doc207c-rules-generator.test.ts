// DOC 207C — generate-corpus-rules: validation classes, round-trip, exclusion.
//
// The grammar under test is the CANONICAL one in
// `_shared/corpus/rule-types.ts`: trigger clauses are `all_of` / `any_of` /
// `none_of`, `parseAtom` THROWS on a malformed atom (it does not return
// null), and there is no negation prefix or operator beyond `=` on
// `verdict:` / `state:`. The generator's own helpers (effect-kind arrays,
// `triggerAtomStrings`) live in its `_local/atoms.ts`, not in the canonical
// module.
import { assert, assertEquals, assertStringIncludes, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  generateRules,
  typeImportSpecifier,
  validateRuleRow,
  type AuthorityRuleRow,
  type RuleProfileRow,
} from "../../../supabase/functions/generate-corpus-rules/_local/generate.ts";
import { ruleRegistryFor } from "../../../supabase/functions/generate-corpus-rules/_local/product-registry.ts";
import { LIA_RULE_CONTEXT_BLOCK } from "../../../supabase/functions/generate-corpus-rules/_local/lia-rule-context.ts";
import { triggerAtomStrings } from "../../../supabase/functions/generate-corpus-rules/_local/atoms.ts";
import { parseAtom } from "../../../supabase/functions/_shared/corpus/rule-types.ts";

const registry = ruleRegistryFor("lia")!;
const VOCAB = registry.typed_state_vocabulary;
const SCOPE = registry.instrument_scope;

const PROFILE_A = "11111111-1111-4111-8111-111111111111";
const PROFILE_B = "22222222-2222-4222-8222-222222222222";

function ratifiedProfile(id: string, over: Partial<RuleProfileRow> = {}): RuleProfileRow {
  return {
    id,
    rule_or_pattern: "rule",
    source_table: "edpb_guidelines",
    source_row_id: `row-${id.slice(0, 4)}`,
    endorsement: "edpb_adopted",
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
    trigger: { all_of: ["flag:special_category", "class:direct_marketing"] },
    effect: { kind: "cap_verdict", element: "balancing", max: "likely_fails" },
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
    supporting_profile_ids: [PROFILE_A],
    direction: "favorable",
    settledness: "R1",
    bears_on_element: "purpose",
    trigger: { any_of: ["class:fraud_prevention", "state:intake.purpose_details.controller_is_public_authority=false"] },
    effect: { kind: "recognise_interest", element: "purpose", value: "passes" },
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

// ── atom grammar (canonical: throws, no negation, no extra operators) ────
Deno.test("parseAtom: kinds, keyed atoms and rejections", () => {
  assertEquals(parseAtom("flag:special_category").kind, "flag");
  assertEquals(parseAtom("data_category:Health or medical data").key, "Health or medical data");
  const v = parseAtom("verdict:necessity=passes");
  assertEquals(v.kind, "verdict");
  assertEquals(v.value, "passes");
  assertThrows(() => parseAtom("nonsense"), Error, 'malformed atom (no ":")');
  assertThrows(() => parseAtom("bogus:thing"), Error, "unknown atom kind");
  assertThrows(() => parseAtom("flag:"), Error, "empty key");
  assertThrows(() => parseAtom("verdict:necessity"), Error, 'no "="');
});

Deno.test("triggerAtomStrings rejects non-object and unknown keys", () => {
  assertEquals(triggerAtomStrings({ all_of: ["flag:children"] }), ["flag:children"]);
  assertEquals(triggerAtomStrings({ some: ["x"] }), null);
  assertEquals(triggerAtomStrings(["flag:children"]), null);
  assertEquals(triggerAtomStrings({ all_of: [3] }), null);
});

// ── validation failure classes ──────────────────────────────────────────
const CASES: ReadonlyArray<[string, Partial<AuthorityRuleRow>, string]> = [
  ["unknown effect kind", { effect: { kind: "nudge" } }, "closed effect-kind set"],
  ["direction mismatch", { direction: "favorable", effect: { kind: "cap_verdict" } }, "does not match effect kind"],
  ["favorable eligibility", { direction: "favorable", settledness: "R2", effect: { kind: "recognise_interest" } }, "requires settledness R1"],
  ["favorable precedent on necessity", { direction: "favorable", settledness: "R3", effect: { kind: "precedent_verdict", element: "necessity" } }, "requires settledness R1|R2"],
  ["adverse override eligibility", { settledness: "R3", effect: { kind: "override_outcome" } }, "override_outcome requires settledness R1|R2"],
  ["bad element", { bears_on_element: "vibes" }, "bears_on_element"],
  ["unparseable atom", { trigger: { all_of: ["not an atom"] } }, "does not parse"],
  ["unknown flag", { trigger: { all_of: ["flag:moon_phase"] } }, "unknown flag"],
  ["unknown class", { trigger: { all_of: ["class:astrology"] } }, "unknown class"],
  ["unknown relationship", { trigger: { all_of: ["relationship:alien"] } }, "unknown relationship"],
  ["unknown data category", { trigger: { all_of: ["data_category:Shoe size"] } }, "unknown data category"],
  ["unknown verdict element", { trigger: { all_of: ["verdict:outcome=fails"] } }, "unknown verdict element"],
  ["unregistered state root", { trigger: { all_of: ["state:random.path=1"] } }, "not under a registered root"],
  ["trigger is not a RuleTrigger", { trigger: { all: ["flag:children"] } }, "all/any/none"],
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
  const result = generateRules(baseInput([ruleRow({ trigger: { all_of: ["flag:moon_phase"] } })], PROFILES));
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
  assertStringIncludes(result.contents!, 'import type { AuthorityRule, RuleContext } from "../../../../_shared/corpus/rule-types.ts";');
  assertStringIncludes(result.contents!, 'export const LIA_RULES_VERSION = "lia-rules-v1-2026-09-07-1";');
  assertStringIncludes(result.contents!, "export const LIA_RULES: readonly AuthorityRule[] = [");
  assertStringIncludes(result.contents!, "export const LIA_RULE_CONTEXT: RuleContext = {");
  // The emitted array is valid JSON once the TS wrapper is stripped.
  const arrayText = result.contents!.slice(
    result.contents!.indexOf("readonly AuthorityRule[] = [") + "readonly AuthorityRule[] = ".length,
  );
  const parsed = JSON.parse(arrayText.slice(0, arrayText.indexOf("\n];") + 2));
  assertEquals(parsed.map((r: { rule_id: string }) => r.rule_id), ["LIA-R-001", "LIA-R-002"]);
  // Canonical shape only: no DB-only curation columns leak into the file.
  for (const key of ["family", "direction", "bears_on_factor_ids", "fixture_fires", "fixture_silent", "retire_when", "worksheet_ref", "ratified_by"]) {
    assertEquals(Object.hasOwn(parsed[0], key), false, `${key} must not be emitted`);
  }
  // sources: primary profile first, then supporting profiles in array order.
  assertEquals(parsed[1].sources, [
    { table: "edpb_guidelines", row_id: "row-2222" },
    { table: "edpb_guidelines", row_id: "row-1111" },
  ]);
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
    const check = new Deno.Command("deno", {
      args: ["check", target],
      clearEnv: true,
      env: { HOME: Deno.env.get("HOME") ?? "/root", PATH: Deno.env.get("PATH") ?? "/usr/bin" },
      stdout: "piped",
      stderr: "piped",
    });
    const out = await check.output();
    assertEquals(out.code, 0, new TextDecoder().decode(out.stderr));
    await Deno.remove(dir, { recursive: true });
  },
});

Deno.test("the emitted context block is byte-identical to the canonical lia-rules.ts block", async () => {
  const pinned = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-rules.ts", import.meta.url),
  );
  const marker = "export const LIA_RULE_CONTEXT: RuleContext = {";
  assertStringIncludes(pinned, marker);
  assertEquals(pinned.slice(pinned.indexOf(marker)), LIA_RULE_CONTEXT_BLOCK);
});

// ── DOC 209 §5: settledness by source ────────────────────────────────────
Deno.test("209§5: draft-consultation primary is excluded with a named warning", () => {
  const profiles = new Map<string, RuleProfileRow>(PROFILES);
  profiles.set(PROFILE_A, ratifiedProfile(PROFILE_A, { endorsement: "draft_consultation" }));
  const result = generateRules(baseInput([ruleRow()], profiles));
  assert(result.ok);
  assertEquals(result.emitted, 0);
  assertEquals(result.excluded[0].reason, "primary_source_is_consultation_draft");
  assertEquals(result.warnings[0].warning, "primary_source_is_consultation_draft");
});

Deno.test("209§5: R1 on a wp29_not_endorsed primary is rejected", () => {
  const profiles = new Map<string, RuleProfileRow>(PROFILES);
  profiles.set(PROFILE_A, ratifiedProfile(PROFILE_A, { endorsement: "wp29_not_endorsed" }));
  const result = generateRules(baseInput([ruleRow({ settledness: "R1" })], profiles));
  assertEquals(result.ok, false);
  assertEquals(result.contents, null);
  assertStringIncludes(result.errors.join("\n"), "wp29_not_endorsed");
});

Deno.test("209§5: R3 on a wp29_not_endorsed primary is accepted", () => {
  const profiles = new Map<string, RuleProfileRow>(PROFILES);
  profiles.set(PROFILE_A, ratifiedProfile(PROFILE_A, { endorsement: "wp29_not_endorsed" }));
  const result = generateRules(baseInput([ruleRow({ settledness: "R3" })], profiles));
  assert(result.ok, result.errors.join("\n"));
  assertEquals(result.emitted, 1);
});

Deno.test("209§5: R1 on a decision primary is rejected", () => {
  const profiles = new Map<string, RuleProfileRow>(PROFILES);
  profiles.set(PROFILE_A, ratifiedProfile(PROFILE_A, { source_table: "enforcement_actions", endorsement: "decision" }));
  const result = generateRules(baseInput([ruleRow({ settledness: "R1" })], profiles));
  assertEquals(result.ok, false);
  assertStringIncludes(result.errors.join("\n"), "decision primary source");
});

Deno.test("209§5: R2 on a single decision emits with the r2_on_single_decision warning", () => {
  const profiles = new Map<string, RuleProfileRow>(PROFILES);
  profiles.set(PROFILE_A, ratifiedProfile(PROFILE_A, { source_table: "enforcement_actions", endorsement: "decision" }));
  const result = generateRules(baseInput(
    [ruleRow({ settledness: "R2", regulator_scope: null, instrument_scope: ["EU GDPR"] })],
    profiles,
  ));
  assert(result.ok, result.errors.join("\n"));
  assertEquals(result.emitted, 1);
  assertEquals(result.warnings[0].warning, "r2_on_single_decision");
});
