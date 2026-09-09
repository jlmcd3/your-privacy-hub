// DOC 213 TRACK H2 REVIEW pattern / DOC 237 — VOCABULARY ↔ PHRASE-MAP
// COVERAGE for ADMT. LIA (doc213-vocabulary-phrase-coverage.test.ts), DPIA
// (doc232-…) and — doc 237 — CPPA Risk each pin this; ADMT did not. The hook
// DRAFTER may only emit atoms from the closed ADMT vocabulary
// (HOOK_PRODUCT_REGISTRY.admt + the ADMT-owned STATE_ATOM_ENUMS paths), and
// the hook JOIN (hook-join.ts) can only RENDER an atom that has a ratified
// phrase in ADMT_ATOM_PHRASES.
//
// DOC 241 (2026-09-09, V3 gap closure) — PROMOTED to the two-direction pin
// LIA/DPIA/Risk carry. Doc 237's third test pinned the OPPOSITE ("every ADMT
// state: phrase is currently UNDRAFTABLE — STATE_ATOM_ENUMS carries no ADMT
// path, doc 235 §8 [NEEDS]") and said to flip it once the enums landed.
// vocabulary.ts now carries the seven ADMT paths (ADMT_ONLY_STATE_ATOM_PATHS),
// each option list READ OFF the intake contract (cppaAdmtContract) rather than
// retyped, so both directions hold for `state:` atoms too — and a third test
// pins every enum's options to the contract field they came from, so the
// vocabulary can never drift from the form.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HOOK_PRODUCT_REGISTRY } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import {
  ADMT_ONLY_STATE_ATOM_PATHS,
  checkAtom,
  DPIA_ONLY_STATE_ATOM_PATHS,
  LIA_ONLY_STATE_ATOM_PATHS,
  RISK_ONLY_STATE_ATOM_PATHS,
  STATE_ATOM_ENUMS,
  vocabularyBlock,
} from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import { ADMT_ATOM_PHRASES } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";
import { cppaAdmtContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";

const REGISTRY = HOOK_PRODUCT_REGISTRY.admt;

/** Every atom `checkAtom` would admit for the admt product — non-state atoms
 *  from the registry, state atoms from the ADMT-owned STATE_ATOM_ENUMS paths. */
function draftableAtoms(): string[] {
  const v = REGISTRY.typed_state_vocabulary;
  const atoms: string[] = [];
  for (const x of v.flags) atoms.push(`flag:${x}`);
  for (const x of v.classes) atoms.push(`class:${x}`);
  for (const x of v.relationships) atoms.push(`relationship:${x}`);
  for (const x of v.data_categories) atoms.push(`data_category:${x}`);
  for (const x of REGISTRY.instrument_scope) atoms.push(`instrument:${x}`);
  for (const path of ADMT_ONLY_STATE_ATOM_PATHS) {
    const options = STATE_ATOM_ENUMS[path];
    assert(options, `ADMT_ONLY_STATE_ATOM_PATHS names ${path} but STATE_ATOM_ENUMS has no entry for it`);
    for (const option of options) atoms.push(`state:${path}=${option}`);
  }
  return atoms;
}

Deno.test("doc237 — every atom the ADMT hook drafter may emit (state: atoms included, doc 241) has a ratified phrase", () => {
  const missing = draftableAtoms().filter((atom) => !(atom in ADMT_ATOM_PHRASES));
  assertEquals(missing, [], `atoms the drafter may emit but the join cannot render:\n${missing.join("\n")}`);
});

Deno.test("doc237 — every ADMT phrase key is an atom the drafter may emit (no orphan phrases — state: keys included, doc 241)", () => {
  const draftable = new Set(draftableAtoms());
  const orphans = Object.keys(ADMT_ATOM_PHRASES).filter((key) => !draftable.has(key));
  assertEquals(orphans, [], `phrase keys no drafted hook can ever carry (typo, or vocabulary drift):\n${orphans.join("\n")}`);
});

Deno.test("doc241 — every ADMT state: phrase key is admitted by checkAtom (the doc 237 'not yet draftable' pin, flipped as it said to be)", () => {
  const stateKeys = Object.keys(ADMT_ATOM_PHRASES).filter((key) => key.startsWith("state:"));
  assert(stateKeys.length > 0, "ADMT_ATOM_PHRASES is expected to carry state: phrases");
  const rejected = stateKeys.filter((atom) => !checkAtom(atom, REGISTRY).ok).map((atom) => `${atom}: ${checkAtom(atom, REGISTRY).error}`);
  assertEquals(rejected, [], `ADMT state: atoms still rejected by checkAtom:\n${rejected.join("\n")}`);
});

Deno.test("doc241 — each ADMT-owned STATE_ATOM_ENUMS entry is `intake.<contract key>` with EXACTLY that contract field's verbatim options, and the owned paths are exactly the paths ADMT_ATOM_PHRASES phrases", () => {
  assertEquals(ADMT_ONLY_STATE_ATOM_PATHS.length, 7);
  for (const path of ADMT_ONLY_STATE_ATOM_PATHS) {
    assert(path.startsWith("intake."), path);
    const key = path.slice("intake.".length);
    const field = cppaAdmtContract.fields.find((f) => f.key === key);
    assert(field, `${path}: no intake-contract field "${key}"`);
    assert(field!.kind === "enum", `${path}: contract field is ${field!.kind}, not a closed enum`);
    assertEquals([...STATE_ATOM_ENUMS[path]], [...(field!.options ?? [])], `${path}: options drifted from the intake contract`);
    assert((field!.options ?? []).length > 0, `${path}: empty option list`);
  }
  const phrasedPaths = new Set(
    Object.keys(ADMT_ATOM_PHRASES).filter((k) => k.startsWith("state:")).map((k) => k.slice("state:".length, k.indexOf("="))),
  );
  assertEquals([...phrasedPaths].sort(), [...ADMT_ONLY_STATE_ATOM_PATHS].sort());
});

Deno.test("v3-tidying — the ADMT drafting-prompt vocabulary shows every ADMT state path with its contract options and no LIA/Risk/DPIA path (doc 237's flat-dict prompt leak, closed; checkAtom unchanged)", () => {
  const block = vocabularyBlock(REGISTRY, "admt");
  for (const path of ADMT_ONLY_STATE_ATOM_PATHS) {
    assert(block.includes(`  state:${path}= one of ${JSON.stringify(STATE_ATOM_ENUMS[path])}`), `ADMT block is missing ${path}`);
  }
  for (const path of [...LIA_ONLY_STATE_ATOM_PATHS, ...RISK_ONLY_STATE_ATOM_PATHS, ...DPIA_ONLY_STATE_ATOM_PATHS]) {
    assert(!block.includes(`state:${path}=`), `ADMT block leaks ${path}`);
  }
});

Deno.test("doc237 — every ADMT phrase is a lower-case clause with no terminal punctuation or slot", () => {
  for (const [atom, phrase] of Object.entries(ADMT_ATOM_PHRASES)) {
    assert(phrase.trim().length > 0, `${atom}: empty phrase`);
    assert(!/[.;:]$/.test(phrase), `${atom}: phrase must not carry its own terminal punctuation`);
    assert(/^[a-z]/.test(phrase), `${atom}: phrase must start lower-case (it follows "that")`);
    assert(!phrase.includes("{") && !phrase.includes("}"), `${atom}: phrase must not contain a slot`);
  }
});
