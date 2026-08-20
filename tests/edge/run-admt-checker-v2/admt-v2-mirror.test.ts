// CPPA ADMT v2 — mirror-consistency guard. The VA registry is copied from
// run-admt-checker into run-admt-checker-v2's own _local tree (deploy-cap
// convention — each edge function bundles independently, see doc 34 §2).
// This test catches silent drift the way the fleet's other mirror tests do.
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("admt-verified-authorities.ts mirror is byte-identical between v1 and v2", async () => {
  const v1 = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-admt-checker/_local/registry/admt-verified-authorities.ts", import.meta.url),
  );
  const v2 = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-admt-checker-v2/_local/registry/admt-verified-authorities.ts", import.meta.url),
  );
  assertEquals(v2, v1, "run-admt-checker-v2's mirror of admt-verified-authorities.ts has drifted from the canonical copy in run-admt-checker — edit BOTH copies together");
});
