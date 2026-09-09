// DOC 213 TRACK H2 REVIEW (2026-09-07) — VOCABULARY ↔ PHRASE-MAP COVERAGE.
//
// Two halves of the offline-hooks build were written separately: the hook
// DRAFTER (generate-corpus-hooks, Lovable) may only emit atoms from its closed
// vocabulary (HOOK_PRODUCT_REGISTRY + STATE_ATOM_ENUMS), and the hook JOIN
// (hook-join.ts, Track H2) can only RENDER an atom that has a ratified phrase
// in LIA_ATOM_PHRASES. The review found the drafter admitting state atoms the
// join had no phrase for (twelve Article 9(2) conditions, three necessity
// answers, an open interest type, the channel and children booleans): a
// settled hook holding one of them would fail at render as an
// `unresolved_slot` — after the drafting spend, and silently for the reader.
//
// This test pins the two sets to each other in BOTH directions, and pins the
// register every phrase must fit ("The company has stated that {phrase}.").

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HOOK_PRODUCT_REGISTRY } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import {
  ADMT_ONLY_STATE_ATOM_PATHS,
  DPIA_ONLY_STATE_ATOM_PATHS,
  OPEN_STATE_PATHS,
  RISK_ONLY_STATE_ATOM_PATHS,
  STATE_ATOM_ENUMS,
} from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import { LIA_ATOM_PHRASES } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts";

/** Every atom `checkAtom` (vocabulary.ts) would admit for the LIA product.
 *
 * DOC 231A — `STATE_ATOM_ENUMS` is one flat, product-unscoped dict shared by
 * every registry (`checkAtom`'s `"state"` case never consults which product
 * is asking); since doc 231A added CPPA Risk's own six state paths to that
 * same dict, this LIA-scoped helper excludes them by name
 * (`RISK_ONLY_STATE_ATOM_PATHS`) rather than assuming every entry is LIA's —
 * an assumption that held only while CPPA Risk carried no state atoms.
 * DOC 241 — the same exclusion now covers ADMT's seven paths
 * (`ADMT_ONLY_STATE_ATOM_PATHS`) and DPIA's seventeen
 * (`DPIA_ONLY_STATE_ATOM_PATHS`); the three ownership lists must be disjoint
 * and must cover every non-LIA entry (pinned below). */
const OTHER_PRODUCT_STATE_PATHS = new Set([
  ...RISK_ONLY_STATE_ATOM_PATHS,
  ...ADMT_ONLY_STATE_ATOM_PATHS,
  ...DPIA_ONLY_STATE_ATOM_PATHS,
]);

function draftableAtoms(): string[] {
  const registry = HOOK_PRODUCT_REGISTRY.lia;
  const v = registry.typed_state_vocabulary;
  const atoms: string[] = [];
  for (const x of v.flags) atoms.push(`flag:${x}`);
  for (const x of v.classes) atoms.push(`class:${x}`);
  for (const x of v.relationships) atoms.push(`relationship:${x}`);
  for (const x of v.data_categories) atoms.push(`data_category:${x}`);
  for (const x of registry.instrument_scope) atoms.push(`instrument:${x}`);
  for (const [path, options] of Object.entries(STATE_ATOM_ENUMS)) {
    if (OTHER_PRODUCT_STATE_PATHS.has(path)) continue;
    for (const option of options) atoms.push(`state:${path}=${option}`);
  }
  return atoms;
}

Deno.test("doc241 — the Risk/ADMT/DPIA state-path ownership lists are disjoint, every listed path exists in STATE_ATOM_ENUMS, and no other product's path leaks into the LIA-scoped set", () => {
  const all = [...RISK_ONLY_STATE_ATOM_PATHS, ...ADMT_ONLY_STATE_ATOM_PATHS, ...DPIA_ONLY_STATE_ATOM_PATHS];
  assertEquals(new Set(all).size, all.length, "ownership lists overlap");
  for (const path of all) assert(STATE_ATOM_ENUMS[path], `${path} is owned but absent from STATE_ATOM_ENUMS`);
  assertEquals(RISK_ONLY_STATE_ATOM_PATHS.length, 6);
  assertEquals(ADMT_ONLY_STATE_ATOM_PATHS.length, 7);
  assertEquals(DPIA_ONLY_STATE_ATOM_PATHS.length, 17);
  for (const path of Object.keys(STATE_ATOM_ENUMS)) {
    if (OTHER_PRODUCT_STATE_PATHS.has(path)) continue;
    assert(!/^intake\.(q\d|processing_status|reasons_to_conduct\.|human_review|admt_detail\.|notice_|access_response_timeline)/.test(path), `${path}: looks like another product's path but is not in any ownership list`);
  }
});

Deno.test("doc213 — every atom the LIA hook drafter may emit has a ratified phrase", () => {
  const missing = draftableAtoms().filter((atom) => !(atom in LIA_ATOM_PHRASES));
  assertEquals(missing, [], `atoms the drafter may emit but the join cannot render:\n${missing.join("\n")}`);
});

Deno.test("doc213 — every phrase key is an atom the drafter may emit (no orphan phrases)", () => {
  const draftable = new Set(draftableAtoms());
  const orphans = Object.keys(LIA_ATOM_PHRASES).filter((key) => !draftable.has(key));
  assertEquals(orphans, [], `phrase keys no drafted hook can ever carry (typo, or vocabulary drift):\n${orphans.join("\n")}`);
});

Deno.test("doc213 — no open state path: an open value could never carry a ratified phrase", () => {
  assertEquals([...OPEN_STATE_PATHS], []);
});

Deno.test("doc213 — every phrase is a lower-case clause that completes \"The company has stated that …\"", () => {
  for (const [atom, phrase] of Object.entries(LIA_ATOM_PHRASES)) {
    assert(phrase.trim().length > 0, `${atom}: empty phrase`);
    assert(!/[.;:]$/.test(phrase), `${atom}: phrase must not carry its own terminal punctuation`);
    assert(/^[a-z]/.test(phrase), `${atom}: phrase must start lower-case (it follows "that")`);
    assert(!phrase.includes("{") && !phrase.includes("}"), `${atom}: phrase must not contain a slot`);
  }
});
