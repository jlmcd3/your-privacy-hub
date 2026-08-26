// Governance verified-authority registry — mirror-consistency guard.
// governance-verified-authorities.ts is imported by TWO edge functions
// (run-governance-assessment and generate-ir-playbook). Under the deploy-cap
// colocation rule it is mirrored byte-identically into each function's
// _local/registry/ — canonical copy in run-governance-assessment, mirror in
// generate-ir-playbook. This test catches silent drift the way the fleet's
// other mirror tests do.
import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("governance-verified-authorities.ts mirror is byte-identical between run-governance-assessment and generate-ir-playbook", async () => {
  const canonical = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-governance-assessment/_local/registry/governance-verified-authorities.ts", import.meta.url),
  );
  const mirror = await Deno.readTextFile(
    new URL("../../../supabase/functions/generate-ir-playbook/_local/registry/governance-verified-authorities.ts", import.meta.url),
  );
  assertEquals(mirror, canonical, "generate-ir-playbook's mirror of governance-verified-authorities.ts has drifted from the canonical copy in run-governance-assessment — edit BOTH copies together");
});
