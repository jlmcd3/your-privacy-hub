// ITEM 428 PIECE A — ir-playbook structural-conformance battery.
//
// Assembled through the LIVE `assemble()` pipeline on IR_PERFECT — the same
// idiom tests/edge/item415/perfect-fixture-and-gate.test.ts uses. Runs
// conformance for BOTH artifacts.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructureConformance } from "../../../supabase/functions/_shared/prose/structure-conformance.ts";
import { attachIrPlaybookDeliverables } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/build.ts";
import { IR_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/ir-perfect.ts";
import { buildStandingPlaybook } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts";
import { buildIncidentWorksheet } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/incident-worksheet.ts";
import { runIrFinalizeBattery } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-finalize.ts";

const PERFECT = IR_PERFECT[0].intake as Record<string, unknown>;

function asAnalysedRecord(intake: Record<string, unknown>): Record<string, unknown> {
  return { ...intake, assessment_id: "00000000-0000-4000-8000-000000000001", user_id: "00000000-0000-4000-8000-000000000002" };
}

function assemble(intake: Record<string, unknown>): Record<string, unknown> {
  const report: Record<string, unknown> = { generated_at: "2026-08-09T00:00:00.000Z" };
  attachIrPlaybookDeliverables(report, intake);
  report.standing_playbook = buildStandingPlaybook(intake, report.content_owner_mapping as never);
  report.incident_worksheet = buildIncidentWorksheet(String(intake.organizationName ?? ""));
  return runIrFinalizeBattery(report, intake).report;
}

function assembled(): Record<string, unknown> {
  return structuredClone(assemble(asAnalysedRecord(PERFECT)));
}

Deno.test("item428 ir-playbook: perfect fixture is conformant on standing_playbook", () => {
  const report = assembled();
  const res = checkStructureConformance("ir-playbook", report, { artifact: "standing_playbook" });
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.artifact, "standing_playbook");
});

Deno.test("item428 ir-playbook: perfect fixture is conformant on incident_worksheet", () => {
  const report = assembled();
  const res = checkStructureConformance("ir-playbook", report, { artifact: "incident_worksheet" });
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.artifact, "incident_worksheet");
  assertEquals(res.checked, 4);
});

Deno.test("item428 ir-playbook: a padded-hollow standing_playbook section fails conformance", () => {
  const report = assembled();
  const playbook = report.standing_playbook as Record<string, unknown>;
  playbook.evidence_preservation = [];
  playbook.first_hour_checklist = ["Not recorded."];
  const res = checkStructureConformance("ir-playbook", report, { artifact: "standing_playbook" });
  assertEquals(res.ok, false);
  assert(res.padded_empty.includes("first_hour_checklist"), JSON.stringify(res.padded_empty));
});

Deno.test("item428 ir-playbook: a padded-hollow incident_worksheet section fails conformance", () => {
  const report = assembled();
  const worksheet = report.incident_worksheet as Record<string, unknown>;
  worksheet.decision_log = ["Not recorded."];
  const res = checkStructureConformance("ir-playbook", report, { artifact: "incident_worksheet" });
  assertEquals(res.ok, false);
  assert(res.padded_empty.includes("decision_log"), JSON.stringify(res.padded_empty));
});
