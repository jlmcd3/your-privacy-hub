import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { coerceIntakeToContract } from "../../../supabase/functions/run-stress-job/_local/intake-coerce.ts";
import { biometricContract } from "../../../supabase/functions/_shared/intake-contracts/biometric.ts";
import { blockingContractViolations } from "../../../supabase/functions/run-stress-job/_local/intake-gate.ts";

Deno.test("required biometricTypes never ends empty", () => {
  const { intake } = coerceIntakeToContract(biometricContract, {
    orgName: "Vortex AdTech SE",
    orgType: "AdTech & Digital Media organisation",
    purpose: "None — no biometric systems currently in use",
    jurisdictions: ["European Union", "United Kingdom", "FR"],
    biometricTypes: ["none currently deployed"],
  });
  const types = intake.biometricTypes as string[];
  assertEquals(types.length > 0, true);
  assertEquals(biometricContract.fields.find((f) => f.key === "biometricTypes")!.options!.includes(types[0]), true);
  assertEquals(blockingContractViolations("biometric", intake), []);
});
