// ITEM 428 PIECE A — biometric structural-conformance battery.
//
// Assembled through the LIVE `buildBiometricDeliverables` builder on the
// BIOMETRIC_PERFECT golden record — the same `liveReport()` idiom
// tests/edge/item411/biometric-csc-and-coverage.test.ts uses.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructureConformance } from "../../../supabase/functions/_shared/prose/structure-conformance.ts";
import { BIOMETRIC_PERFECT } from "../../../supabase/functions/_shared/golden/biometric-perfect.ts";
import { buildBiometricDeliverables } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts";

const RECORD = ((BIOMETRIC_PERFECT as unknown as Array<{ intake: Record<string, unknown> }>)[0]
  ?.intake ?? BIOMETRIC_PERFECT) as Record<string, unknown>;

function liveReport(): Record<string, unknown> {
  const d = buildBiometricDeliverables(RECORD as never) as unknown as Record<string, unknown>;
  return {
    jurisdictions_analysed: RECORD.jurisdictions,
    identifier_characterizations: d.identifier_characterizations,
    entity_characterization: d.entity_characterization,
    duty_findings: d.duty_findings,
    divergence_analysis: d.divergence_analysis,
    consequence_determination: d.consequence_determination,
    biometric_deliverables: d,
    processing_record: d.narrative,
    information_needed: [],
    assessment_text: [
      RECORD.purpose,
      RECORD.data_source_description,
      RECORD.security_measures_description,
      RECORD.retention_schedule_text,
      RECORD.destruction_trigger,
      RECORD.release_artifact_description,
      RECORD.disclosure_recipients,
      (RECORD.jurisdictions as string[] ?? []).join(", "),
    ].filter(Boolean).join("\n\n"),
  };
}

Deno.test("item428 biometric: perfect fixture is fully conformant", () => {
  const report = liveReport();
  const res = checkStructureConformance("biometric", report);
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.checked, 8);
});

Deno.test("item428 biometric: a padded-hollow required section fails conformance", () => {
  const report = liveReport();
  // duty_findings (statutory_requirements) carries no alias fallback: pad it hollow.
  report.duty_findings = ["Not recorded."];
  const res = checkStructureConformance("biometric", report);
  assertEquals(res.ok, false, JSON.stringify(res));
  assert(res.padded_empty.includes("statutory_requirements"), JSON.stringify(res.padded_empty));
});
