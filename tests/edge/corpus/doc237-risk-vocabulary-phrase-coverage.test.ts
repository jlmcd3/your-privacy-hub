// DOC 213 TRACK H2 REVIEW pattern / DOC 237 — VOCABULARY ↔ PHRASE-MAP
// COVERAGE for CPPA Risk. LIA (doc213-vocabulary-phrase-coverage.test.ts)
// and DPIA (doc232-dpia-vocabulary-phrase-coverage.test.ts) both pin this;
// Risk did not. The hook DRAFTER may only emit atoms from the closed Risk
// vocabulary (HOOK_PRODUCT_REGISTRY["cppa-risk"] + the six Risk
// STATE_ATOM_ENUMS paths doc 231A added, named by RISK_ONLY_STATE_ATOM_PATHS),
// and the hook JOIN (hook-join.ts) can only RENDER an atom that has a
// ratified phrase in RISK_ATOM_PHRASES. Pinned in BOTH directions so a
// settled hook can never fail at render as an `unresolved_slot` after the
// drafting spend.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HOOK_PRODUCT_REGISTRY } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { RISK_ONLY_STATE_ATOM_PATHS, STATE_ATOM_ENUMS } from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import { RISK_ATOM_PHRASES } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/corpus/maps/risk-hooks.ts";

/** Every atom `checkAtom` (vocabulary.ts) would admit for the cppa-risk
 *  product, restricted to Risk's OWN state paths (STATE_ATOM_ENUMS is one
 *  flat, product-unscoped dict — see doc 231A §6). */
function draftableAtoms(): string[] {
  const registry = HOOK_PRODUCT_REGISTRY["cppa-risk"];
  const v = registry.typed_state_vocabulary;
  const atoms: string[] = [];
  for (const x of v.flags) atoms.push(`flag:${x}`);
  for (const x of v.classes) atoms.push(`class:${x}`);
  for (const x of v.relationships) atoms.push(`relationship:${x}`);
  for (const x of v.data_categories) atoms.push(`data_category:${x}`);
  for (const x of registry.instrument_scope) atoms.push(`instrument:${x}`);
  for (const path of RISK_ONLY_STATE_ATOM_PATHS) {
    const options = STATE_ATOM_ENUMS[path];
    assert(options, `RISK_ONLY_STATE_ATOM_PATHS names ${path} but STATE_ATOM_ENUMS has no entry for it`);
    for (const option of options) atoms.push(`state:${path}=${option}`);
  }
  return atoms;
}

Deno.test("doc237 — every atom the CPPA Risk hook drafter may emit has a ratified phrase", () => {
  const missing = draftableAtoms().filter((atom) => !(atom in RISK_ATOM_PHRASES));
  assertEquals(missing, [], `atoms the drafter may emit but the join cannot render:\n${missing.join("\n")}`);
});

Deno.test("doc237 — every CPPA Risk phrase key is an atom the drafter may emit (no orphan phrases)", () => {
  const draftable = new Set(draftableAtoms());
  const orphans = Object.keys(RISK_ATOM_PHRASES).filter((key) => !draftable.has(key));
  assertEquals(orphans, [], `phrase keys no drafted hook can ever carry (typo, or vocabulary drift):\n${orphans.join("\n")}`);
});

Deno.test("doc237 — every CPPA Risk phrase is a lower-case clause with no terminal punctuation or slot", () => {
  for (const [atom, phrase] of Object.entries(RISK_ATOM_PHRASES)) {
    assert(phrase.trim().length > 0, `${atom}: empty phrase`);
    assert(!/[.;:]$/.test(phrase), `${atom}: phrase must not carry its own terminal punctuation`);
    assert(/^[a-z]/.test(phrase), `${atom}: phrase must start lower-case (it follows "that")`);
    assert(!phrase.includes("{") && !phrase.includes("}"), `${atom}: phrase must not contain a slot`);
  }
});
