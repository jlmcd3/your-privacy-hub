// DOC 213 TRACK H2 REVIEW pattern / DOC 232 — VOCABULARY ↔ PHRASE-MAP
// COVERAGE for DPIA.
//
// Mirrors doc213-vocabulary-phrase-coverage.test.ts's LIA check: the hook
// DRAFTER may only emit atoms from the closed DPIA vocabulary
// (HOOK_PRODUCT_REGISTRY.dpia + the closed `reasons_to_conduct` slug list,
// both in generate-corpus-hooks/_local/product-registry.ts), and the hook
// JOIN (dpia-hook-join.ts) can only RENDER an atom that has a ratified
// phrase in DPIA_ATOM_PHRASES. This test pins the two sets to each other in
// BOTH directions so a settled hook can never fail at render as an
// `unresolved_slot` after the drafting spend.
//
// DIFFERENCE FROM THE LIA TEST (as built, doc 232): DPIA had no `vocabulary.ts`
// STATE_ATOM_ENUMS entry (that file was off limits — the "do not modify
// generate-corpus-hooks/_local/vocabulary.ts" rule) — the closed
// `state:intake.reasons_to_conduct.<slug>` vocabulary was instead the
// DPIA_REASON_SLUG_LIST this build added to product-registry.ts (a verbatim
// copy of REASONS_TO_CONDUCT, DPIAFramework.enums.ts), each admitting
// exactly the two boolean values `=true`/`=false` — which `checkAtom`
// nevertheless REJECTED, since it consults STATE_ATOM_ENUMS alone (doc 233's
// [NEEDS: DPIA state paths added to STATE_ATOM_ENUMS]).
//
// DOC 241 (2026-09-09, V3 gap closure) — STATE_ATOM_ENUMS now carries every
// DPIA_REASON_SLUG_LIST path (generated from that same list, never retyped;
// `DPIA_ONLY_STATE_ATOM_PATHS` names them), so the drafter's closed
// vocabulary and `checkAtom` finally agree — pinned by the last test below.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DPIA_REASON_SLUG_LIST, HOOK_PRODUCT_REGISTRY } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { checkAtom, DPIA_ONLY_STATE_ATOM_PATHS, STATE_ATOM_ENUMS } from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import { DPIA_ATOM_PHRASES } from "../../../supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-hooks.ts";

/** Every atom a DPIA hook drafter may emit under this build's closed
 *  vocabulary. */
function draftableAtoms(): string[] {
  const registry = HOOK_PRODUCT_REGISTRY.dpia;
  const v = registry.typed_state_vocabulary;
  const atoms: string[] = [];
  for (const x of v.flags) atoms.push(`flag:${x}`);
  for (const x of v.classes) atoms.push(`class:${x}`);
  for (const x of v.relationships) atoms.push(`relationship:${x}`);
  for (const x of v.data_categories) atoms.push(`data_category:${x}`);
  for (const x of registry.instrument_scope) atoms.push(`instrument:${x}`);
  for (const slug of DPIA_REASON_SLUG_LIST) {
    atoms.push(`state:intake.reasons_to_conduct.${slug}=true`);
    atoms.push(`state:intake.reasons_to_conduct.${slug}=false`);
  }
  return atoms;
}

Deno.test("doc232 — every atom the DPIA hook drafter may emit has a ratified phrase", () => {
  const missing = draftableAtoms().filter((atom) => !(atom in DPIA_ATOM_PHRASES));
  assertEquals(missing, [], `atoms the drafter may emit but the join cannot render:\n${missing.join("\n")}`);
});

Deno.test("doc232 — every DPIA phrase key is an atom the drafter may emit (no orphan phrases)", () => {
  const draftable = new Set(draftableAtoms());
  const orphans = Object.keys(DPIA_ATOM_PHRASES).filter((key) => !draftable.has(key));
  assertEquals(orphans, [], `phrase keys no drafted hook can ever carry (typo, or vocabulary drift):\n${orphans.join("\n")}`);
});

Deno.test("doc241 — STATE_ATOM_ENUMS carries exactly one `intake.reasons_to_conduct.<slug>` path per DPIA_REASON_SLUG_LIST entry admitting exactly ['true','false'], and checkAtom admits every DPIA state: phrase key", () => {
  assertEquals([...DPIA_ONLY_STATE_ATOM_PATHS], DPIA_REASON_SLUG_LIST.map((slug) => `intake.reasons_to_conduct.${slug}`));
  for (const path of DPIA_ONLY_STATE_ATOM_PATHS) assertEquals([...STATE_ATOM_ENUMS[path]], ["true", "false"], path);
  const registry = HOOK_PRODUCT_REGISTRY.dpia;
  const rejected = Object.keys(DPIA_ATOM_PHRASES)
    .filter((key) => key.startsWith("state:"))
    .filter((atom) => !checkAtom(atom, registry).ok)
    .map((atom) => `${atom}: ${checkAtom(atom, registry).error}`);
  assertEquals(rejected, [], `DPIA state: atoms still rejected by checkAtom:\n${rejected.join("\n")}`);
});

Deno.test("doc232 — every DPIA phrase is a lower-case clause with no terminal punctuation or slot", () => {
  for (const [atom, phrase] of Object.entries(DPIA_ATOM_PHRASES)) {
    assert(phrase.trim().length > 0, `${atom}: empty phrase`);
    assert(!/[.;:]$/.test(phrase), `${atom}: phrase must not carry its own terminal punctuation`);
    assert(/^[a-z]/.test(phrase), `${atom}: phrase must start lower-case (it follows "that")`);
    assert(!phrase.includes("{") && !phrase.includes("}"), `${atom}: phrase must not contain a slot`);
  }
});
