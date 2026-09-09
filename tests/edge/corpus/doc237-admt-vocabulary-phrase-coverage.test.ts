// DOC 213 TRACK H2 REVIEW pattern / DOC 237 — VOCABULARY ↔ PHRASE-MAP
// COVERAGE for ADMT. LIA (doc213-vocabulary-phrase-coverage.test.ts), DPIA
// (doc232-…) and — doc 237 — CPPA Risk each pin this; ADMT did not. The hook
// DRAFTER may only emit atoms from the closed ADMT vocabulary
// (HOOK_PRODUCT_REGISTRY.admt), and the hook JOIN (hook-join.ts) can only
// RENDER an atom that has a ratified phrase in ADMT_ATOM_PHRASES.
//
// ONE DIRECTION IS DIFFERENT FROM LIA/DPIA/RISK, BY DESIGN AND PINNED HERE:
// ADMT's `state:intake.*` phrases (human_review, solely_advertising,
// notice_has_specific_purpose, …) have NO `STATE_ATOM_ENUMS` entry yet
// (vocabulary.ts is off-limits to the product builds — doc 235 §8 [NEEDS]),
// so the drafter cannot emit them today. Rather than pretend otherwise,
// the third test below asserts exactly that: every ADMT `state:` phrase is
// currently UNDRAFTABLE. When the enums are added, that test flips — which
// is the signal to promote it to the two-direction pin the other products
// carry.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HOOK_PRODUCT_REGISTRY } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { checkAtom } from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import { ADMT_ATOM_PHRASES } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";

const REGISTRY = HOOK_PRODUCT_REGISTRY.admt;

/** Every non-state atom `checkAtom` would admit for the admt product. */
function draftableAtoms(): string[] {
  const v = REGISTRY.typed_state_vocabulary;
  const atoms: string[] = [];
  for (const x of v.flags) atoms.push(`flag:${x}`);
  for (const x of v.classes) atoms.push(`class:${x}`);
  for (const x of v.relationships) atoms.push(`relationship:${x}`);
  for (const x of v.data_categories) atoms.push(`data_category:${x}`);
  for (const x of REGISTRY.instrument_scope) atoms.push(`instrument:${x}`);
  return atoms;
}

Deno.test("doc237 — every non-state atom the ADMT hook drafter may emit has a ratified phrase", () => {
  const missing = draftableAtoms().filter((atom) => !(atom in ADMT_ATOM_PHRASES));
  assertEquals(missing, [], `atoms the drafter may emit but the join cannot render:\n${missing.join("\n")}`);
});

Deno.test("doc237 — every non-state ADMT phrase key is an atom the drafter may emit (no orphan flag/class/instrument phrases)", () => {
  const draftable = new Set(draftableAtoms());
  const orphans = Object.keys(ADMT_ATOM_PHRASES).filter((key) => !key.startsWith("state:") && !draftable.has(key));
  assertEquals(orphans, [], `phrase keys no drafted hook can ever carry (typo, or vocabulary drift):\n${orphans.join("\n")}`);
});

Deno.test("doc237 — ADMT's state: phrases are NOT yet draftable (STATE_ATOM_ENUMS carries no ADMT path — doc 235 §8 [NEEDS], pinned so it cannot be forgotten)", () => {
  const stateKeys = Object.keys(ADMT_ATOM_PHRASES).filter((key) => key.startsWith("state:"));
  assert(stateKeys.length > 0, "ADMT_ATOM_PHRASES is expected to carry state: phrases");
  const draftable = stateKeys.filter((atom) => checkAtom(atom, REGISTRY).ok);
  assertEquals(
    draftable,
    [],
    "ADMT state: atoms have become draftable — promote this file to the two-direction pin LIA/DPIA/Risk carry and remove this test",
  );
});

Deno.test("doc237 — every ADMT phrase is a lower-case clause with no terminal punctuation or slot", () => {
  for (const [atom, phrase] of Object.entries(ADMT_ATOM_PHRASES)) {
    assert(phrase.trim().length > 0, `${atom}: empty phrase`);
    assert(!/[.;:]$/.test(phrase), `${atom}: phrase must not carry its own terminal punctuation`);
    assert(/^[a-z]/.test(phrase), `${atom}: phrase must start lower-case (it follows "that")`);
    assert(!phrase.includes("{") && !phrase.includes("}"), `${atom}: phrase must not contain a slot`);
  }
});
