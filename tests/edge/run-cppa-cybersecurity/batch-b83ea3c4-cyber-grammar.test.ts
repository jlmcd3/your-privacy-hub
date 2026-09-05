// Batch b83ea3c4 (2026-09-05, Veltrix) — the program-readiness sentence read
// "one component do not yet have a testable operating artifact". The verb now
// agrees with the count in both branches.
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("batch b83ea3c4 — the untestable-components sentence agrees in number", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts", import.meta.url));
  assert(src.includes('"one component does not"'), "singular branch must read 'one component does not'");
  assert(src.includes("components do not`"), "plural branch must read '<n> components do not'");
  assert(!src.includes('"one component" : `${untestable} components`} do not'), "the shared 'do not' tail is retired");
});
