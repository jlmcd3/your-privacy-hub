// LIA spine — mirror-consistency guard. lia.spine.ts is imported by TWO edge
// functions (run-li-assessment and generate-report-pdf). Under the deploy-cap
// colocation rule (a module reached by exactly one function lives in that
// function's _local; a module reached by two is mirrored byte-identically into
// each function's _local so no third function pays its bytes on upload), the
// canonical copy lives in run-li-assessment/_local/prose/plans/ and the mirror
// in generate-report-pdf/_local/prose/plans/. This test catches silent drift
// the way the fleet's other mirror tests do.
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("lia.spine.ts mirror is byte-identical between run-li-assessment and generate-report-pdf", async () => {
  const canonical = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-li-assessment/_local/prose/plans/lia.spine.ts", import.meta.url),
  );
  const mirror = await Deno.readTextFile(
    new URL("../../../supabase/functions/generate-report-pdf/_local/prose/plans/lia.spine.ts", import.meta.url),
  );
  assertEquals(mirror, canonical, "generate-report-pdf's mirror of lia.spine.ts has drifted from the canonical copy in run-li-assessment — edit BOTH copies together");
});
