// ITEM 428 PIECE A — registration structural-conformance battery.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructureConformance } from "../../../supabase/functions/_shared/prose/structure-conformance.ts";
import { assembleRegistrationReport, PERFECT_INTAKE } from "../item413/_assemble.ts";

function assembled(): Record<string, unknown> {
  return structuredClone(assembleRegistrationReport(PERFECT_INTAKE).report);
}

Deno.test("item428 registration: perfect fixture is fully conformant", () => {
  const report = assembled();
  const res = checkStructureConformance("registration", report);
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.checked, 12);
});

Deno.test("item428 registration: a padded-hollow conditional/required section fails conformance", () => {
  const report = assembled();
  const d = report.registration_deliverables as Record<string, unknown>;
  // filing_readiness is a required, array-shaped section. Pad it hollow.
  d.filing_readiness = ["Not recorded."];
  const res = checkStructureConformance("registration", report);
  assertEquals(res.ok, false);
  assert(res.padded_empty.includes("filing_readiness"), JSON.stringify(res.padded_empty));
});
