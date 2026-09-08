// DOC 217 — `prop:` trigger atoms and `props` fixture bags in the rules generator.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validatePropAtom } from "../../../supabase/functions/generate-corpus-rules/_local/generate.ts";

const RATIFIED = new Set(["f11.necessity.no_alternative"]);

Deno.test("a prop atom naming a ratified proposition passes", () => {
  assertEquals(validatePropAtom("prop:f11.necessity.no_alternative=asserted", RATIFIED), null);
  assertEquals(validatePropAtom("prop:f11.necessity.no_alternative=abstain", RATIFIED), null);
});

Deno.test("an unratified prop_id, bad stance or malformed atom fails by name", () => {
  const unknown = validatePropAtom("prop:f11.made.up=asserted", RATIFIED)!;
  assertEquals(unknown.includes("not in the ratified proposition inventory"), true);

  const stance = validatePropAtom("prop:f11.necessity.no_alternative=maybe", RATIFIED)!;
  assertEquals(stance.includes("stance must be asserted|abstain"), true);

  const noEq = validatePropAtom("prop:f11.necessity.no_alternative", RATIFIED)!;
  assertEquals(noEq.includes('malformed prop atom (no "=")'), true);

  const empty = validatePropAtom("prop:=asserted", RATIFIED)!;
  assertEquals(empty.includes("empty prop_id"), true);

  const noInventory = validatePropAtom("prop:f11.necessity.no_alternative=asserted")!;
  assertEquals(noInventory.includes("no ratified proposition inventory supplied"), true);
});
