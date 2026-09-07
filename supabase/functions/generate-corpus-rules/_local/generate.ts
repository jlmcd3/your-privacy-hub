// DOC 207C §4 — the pure generation core for authority rules.
//
// No I/O. The edge function (../index.ts) does the DB read and the response;
// this module validates the joined rows and returns the CONTENTS of the
// product's pinned rules file.
//
// TWO FAILURE MODES, deliberately different:
//   EXCLUSION — an unstamped row (rule row or its primary profile missing
//     ratified_by / ratified_at / ledger_ref, or the profile not marked
//     `rule`). Named with a reason in `excluded`, never an error. This is the
//     normal state of a curation table.
//   ERROR — an EMITTED row that does not validate. `ok:false`, HTTP 422,
//     nothing emitted. A ratified row that is malformed is a build break.

import { parseAtom, type AuthorityRule } from "../../_shared/corpus/rule-types.ts";
import {
  ADVERSE_EFFECT_KINDS,
  EFFECT_KINDS,
  FAVORABLE_EFFECT_KINDS,
  triggerAtomStrings,
} from "./atoms.ts";
import type { TypedStateVocabulary } from "./product-registry.ts";


export interface AuthorityRuleRow {
  readonly id: string;
  readonly rule_id: string;
  readonly family: string;
  readonly product: string;
  readonly profile_id: string;
  readonly supporting_profile_ids: readonly string[] | null;
  readonly settledness: string;
  readonly direction: string;
  readonly instrument_scope: readonly string[] | null;
  readonly regulator_scope: string | null;
  readonly bears_on_factor_ids: readonly string[] | null;
  readonly bears_on_element: string;
  readonly trigger: unknown;
  readonly effect: unknown;
  readonly reason_sentence: string;
  readonly authority_citation: string;
  readonly fixture_fires: unknown;
  readonly fixture_silent: unknown;
  readonly retire_when: string;
  readonly worksheet_ref: string;
  readonly ratified_by: string | null;
  readonly ratified_at: string | null;
  readonly ledger_ref: string | null;
  readonly retired_at?: string | null;
}

/** The subset of an `authority_relevance_profiles` row this step needs. */
export interface RuleProfileRow {
  readonly id: string;
  readonly rule_or_pattern: string;
  readonly source_table: string;
  readonly source_row_id: string;
  readonly ratified_by: string | null;
  readonly ratified_at: string | null;
  readonly ledger_ref: string | null;
}


export interface Exclusion {
  readonly rule_id: string;
  readonly reason: string;
}

export interface GenerateRulesInput {
  readonly product: string;
  readonly rows: readonly AuthorityRuleRow[];
  readonly profiles: ReadonlyMap<string, RuleProfileRow>;
  readonly vocabulary: TypedStateVocabulary;
  readonly instrumentScope: readonly string[];
  readonly rulesVersion: string;
  readonly exportPrefix: string;
  readonly outputPath: string;
  /** Copied verbatim into the emitted file. */
  readonly ruleContextBlock: string;
}

export interface GenerateRulesResult {
  readonly ok: boolean;
  readonly emitted: number;
  readonly excluded: readonly Exclusion[];
  readonly errors: readonly string[];
  readonly contents: string | null;
}

function stamped(row: { ratified_by: string | null; ratified_at: string | null; ledger_ref: string | null }): boolean {
  return !!row.ratified_by && !!row.ratified_at && !!row.ledger_ref;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** All the §4.3 checks for one emitted row. Returns named failures. */
export function validateRuleRow(
  row: AuthorityRuleRow,
  vocabulary: TypedStateVocabulary,
  instrumentScope: readonly string[],
): string[] {
  const errors: string[] = [];
  const fail = (message: string) => errors.push(`${row.rule_id}: ${message}`);

  // Effect kind, closed set.
  const effect = row.effect;
  if (!isPlainObject(effect)) {
    fail("effect is not a JSON object");
    return errors;
  }
  const kind = effect.kind;
  if (typeof kind !== "string" || !(EFFECT_KINDS as readonly string[]).includes(kind)) {
    fail(`effect.kind "${String(kind)}" is not in the closed effect-kind set`);
    return errors;
  }

  // Direction matches kind.
  const adverse = (ADVERSE_EFFECT_KINDS as readonly string[]).includes(kind);
  const favorable = (FAVORABLE_EFFECT_KINDS as readonly string[]).includes(kind);
  if (row.direction === "adverse" && !adverse) fail(`direction "adverse" does not match effect kind "${kind}"`);
  if (row.direction === "favorable" && !favorable) fail(`direction "favorable" does not match effect kind "${kind}"`);
  if (row.direction !== "adverse" && row.direction !== "favorable") fail(`direction "${row.direction}" is not adverse|favorable`);

  if (!["R1", "R2", "R3"].includes(row.settledness)) fail(`settledness "${row.settledness}" is not R1|R2|R3`);

  // Favorable eligibility.
  if (row.direction === "favorable") {
    if ((kind === "recognise_interest" || kind === "route_to_basis") && row.settledness !== "R1") {
      fail(`favorable "${kind}" requires settledness R1 (got ${row.settledness})`);
    }
    if (kind === "precedent_verdict" && effect.element === "necessity" && !["R1", "R2"].includes(row.settledness)) {
      fail(`favorable precedent_verdict on necessity requires settledness R1|R2 (got ${row.settledness})`);
    }
  }
  // Adverse eligibility.
  if (row.direction === "adverse" && kind === "override_outcome" && !["R1", "R2"].includes(row.settledness)) {
    fail(`adverse override_outcome requires settledness R1|R2 (got ${row.settledness})`);
  }

  if (!["purpose", "necessity", "balancing", "outcome"].includes(row.bears_on_element)) {
    fail(`bears_on_element "${row.bears_on_element}" is not purpose|necessity|balancing|outcome`);
  }

  // Trigger atoms.
  const atoms = triggerAtomStrings(row.trigger);
  if (atoms === null) {
    fail("trigger is not an object of all/any/none string arrays");
  } else if (atoms.length === 0) {
    fail("trigger names no atom");
  } else {
    for (const raw of atoms) {
      // The canonical `parseAtom` THROWS on a malformed atom; at build time
      // that is a named validation failure, never a crash.
      let atom;
      try {
        atom = parseAtom(raw);
      } catch (e) {
        fail(`trigger atom "${raw}" does not parse: ${(e as Error).message}`);
        continue;
      }
      const inSet = (list: readonly string[]) => list.includes(atom.key);
      if (atom.kind === "flag" && !inSet(vocabulary.flags)) fail(`trigger atom "${raw}": unknown flag`);
      if (atom.kind === "class" && !inSet(vocabulary.classes)) fail(`trigger atom "${raw}": unknown class`);
      if (atom.kind === "relationship" && !inSet(vocabulary.relationships)) fail(`trigger atom "${raw}": unknown relationship`);
      if (atom.kind === "data_category" && !inSet(vocabulary.data_categories)) fail(`trigger atom "${raw}": unknown data category`);
      if (atom.kind === "verdict" && !inSet(vocabulary.verdict_elements)) fail(`trigger atom "${raw}": unknown verdict element`);
      if (atom.kind === "state" && !vocabulary.state_roots.some((root) => atom.key.startsWith(root))) {
        fail(`trigger atom "${raw}": state path is not under a registered root`);
      }
    }

  }

  // Instrument scope.
  const scope = row.instrument_scope ?? [];
  if (scope.length === 0) fail("instrument_scope is empty");
  for (const instrument of scope) {
    if (!instrumentScope.includes(instrument)) fail(`instrument_scope "${instrument}" is not registered for this product`);
  }

  // Fixtures.
  if (!isPlainObject(row.fixture_fires)) fail("fixture_fires is not a JSON object");
  if (!isPlainObject(row.fixture_silent)) fail("fixture_silent is not a JSON object");

  // Reason sentence.
  if (row.reason_sentence.includes("[") || row.reason_sentence.includes("]")) {
    fail("reason_sentence contains a bracket");
  }
  if (wordCount(row.reason_sentence) > 40) fail("reason_sentence exceeds 40 words");

  return errors;
}

/**
 * The canonical `AuthorityRule` shape and nothing else. The DB-only columns
 * (`family`, `direction`, `bears_on_factor_ids`, `fixture_*`, `retire_when`,
 * `worksheet_ref`, the ratification stamps) are validated above but never
 * emitted — the interpreter has no use for them and a shipped file must not
 * carry curation metadata.
 *
 * `sources` is the primary profile first, then each supporting profile in
 * `supporting_profile_ids` array order.
 */
function shippedRule(
  row: AuthorityRuleRow,
  profiles: ReadonlyMap<string, RuleProfileRow>,
): AuthorityRule {
  const sources: { table: string; row_id: string }[] = [];
  for (const id of [row.profile_id, ...(row.supporting_profile_ids ?? [])]) {
    const profile = profiles.get(id);
    if (profile) sources.push({ table: profile.source_table, row_id: profile.source_row_id });
  }
  return {
    rule_id: row.rule_id,
    product: row.product,
    settledness: row.settledness as AuthorityRule["settledness"],
    instrument_scope: [...(row.instrument_scope ?? [])],
    regulator_scope: row.regulator_scope ?? null,
    bears_on_element: row.bears_on_element,
    trigger: row.trigger as AuthorityRule["trigger"],
    effect: row.effect as AuthorityRule["effect"],
    reason_sentence: row.reason_sentence,
    authority_citation: row.authority_citation,
    sources,
    retired_at: row.retired_at ?? null,
  };
}


/** Relative specifier from the output file to _shared/corpus/rule-types.ts. */
export function typeImportSpecifier(outputPath: string): string {
  const parts = outputPath.split("/");
  // .../supabase/functions/<rest>/<file>.ts
  const fnIndex = parts.indexOf("functions");
  const depth = parts.length - fnIndex - 2; // directories below functions/
  return `${"../".repeat(depth)}_shared/corpus/rule-types.ts`;
}

export function generateRules(input: GenerateRulesInput): GenerateRulesResult {
  const excluded: Exclusion[] = [];
  const errors: string[] = [];
  const emitted: AuthorityRuleRow[] = [];

  for (const row of input.rows) {
    if (row.retired_at) {
      excluded.push({ rule_id: row.rule_id, reason: "rule row is retired" });
      continue;
    }
    if (!stamped(row)) {
      excluded.push({ rule_id: row.rule_id, reason: "rule row is not ratified (ratified_by / ratified_at / ledger_ref must all be set)" });
      continue;
    }
    const profile = input.profiles.get(row.profile_id);
    if (!profile) {
      excluded.push({ rule_id: row.rule_id, reason: `primary profile ${row.profile_id} not found` });
      continue;
    }
    if (!stamped(profile)) {
      excluded.push({ rule_id: row.rule_id, reason: `primary profile ${row.profile_id} is not ratified` });
      continue;
    }
    if (profile.rule_or_pattern !== "rule") {
      excluded.push({ rule_id: row.rule_id, reason: `primary profile ${row.profile_id} is rule_or_pattern="${profile.rule_or_pattern}", not "rule"` });
      continue;
    }
    emitted.push(row);
  }

  for (const row of emitted) {
    errors.push(...validateRuleRow(row, input.vocabulary, input.instrumentScope));
  }

  if (errors.length > 0) {
    return { ok: false, emitted: 0, excluded, errors, contents: null };
  }

  const sorted = [...emitted].sort((a, b) => (a.rule_id < b.rule_id ? -1 : a.rule_id > b.rule_id ? 1 : 0));
  const body = sorted.map((row) => JSON.stringify(shippedRule(row), null, 2)
    .split("\n").map((line) => `  ${line}`).join("\n")).join(",\n");

  const excludedLines = excluded.length === 0
    ? "//   (none)"
    : excluded.map((item) => `//   ${item.rule_id} — ${item.reason}`).join("\n");

  const prefix = input.exportPrefix;
  const contents = `// ${input.product.toUpperCase()} AUTHORITY RULES — pinned, generated file (doc 207C).
//
// Generated by \`generate-corpus-rules\` (action "generate") from ratified
// \`public.authority_rules\` rows. Do not hand-edit the rules array:
// regenerate it. Run: ${input.rulesVersion}
//
// EXCLUDED ROWS (named, not silently dropped):
${excludedLines}

import type { AuthorityRule } from "${typeImportSpecifier(input.outputPath)}";

export const ${prefix}_RULES_VERSION = ${JSON.stringify(input.rulesVersion)};

export const ${prefix}_RULES: readonly AuthorityRule[] = [${sorted.length === 0 ? "" : `\n${body}\n`}];

${input.ruleContextBlock}`;

  return { ok: true, emitted: sorted.length, excluded, errors: [], contents };
}
