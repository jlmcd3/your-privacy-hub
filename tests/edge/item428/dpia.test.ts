// ITEM 428 PIECE A — dpia structural-conformance battery.
//
// DEVIATION NOTE: dpia's narrative sections (section_0_overview …
// section_6_conclusion) are LLM-authored at generation time and are not
// reproducible offline. Following the live-parity hand-built prose precedent
// in tests/edge/run-dpia-framework/item379-coverage.test.ts (`faithfulDoc()`),
// this battery hand-assembles a document that carries every plan section with
// real, non-placeholder content derived from the DPIA_PERFECT golden intake,
// rather than invoking an LLM.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructureConformance } from "../../../supabase/functions/_shared/prose/structure-conformance.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/dpia.ts";

const INTAKE = DPIA_PERFECT[0].intake as Record<string, unknown>;

function perfectDoc(): Record<string, unknown> {
  return {
    section_0_overview:
      `This data protection impact assessment covers ${INTAKE.processing_activity_name} run by ${INTAKE.organization_name}. ${INTAKE.description}`,
    section_1_description:
      `The processing serves the purpose of ${INTAKE.purpose} It touches ${(INTAKE.data_categories as string[]).join(", ")} for ${INTAKE.data_subjects} at a volume of ${INTAKE.volume_frequency}, across ${(INTAKE.jurisdictions as string[]).join(", ")}.`,
    section_2_analysis:
      `The proposed lawful basis is ${INTAKE.legal_basis_proposed}, with the special-category condition ${INTAKE.article_9_condition}. The DPO and relevant stakeholders were consulted on the lawfulness analysis before this assessment was finalised.`,
    section_3_necessity_proportionality: `${INTAKE.necessity_proportionality} The retention period is ${INTAKE.retention_period}, set to the minimum needed to achieve the stated purpose.`,
    section_4_risk_management: [
      { risk: "Unauthorised access to health records", measure: "Role-scoped access controls and quarterly recertification." },
      { risk: "Excessive retention of patient data", measure: `Retention enforced at ${INTAKE.retention_period}.` },
    ],
    enforcement_precedents: [
      { authority: "CNIL", citation: "Deliberation SAN-2021-023", relevance: "Comparable health-data minimisation finding." },
    ],
    executive_summary:
      `On the record supplied, this processing is proportionate and necessary, and residual risk is low once the listed measures are in place.`,
    information_needed: [],
    section_5_interested_parties: [
      { party: "Data Protection Officer", input: "Reviewed and endorsed the necessity analysis on 2026-01-15." },
    ],
    section_6_conclusion:
      `This assessment is approved and will be reviewed no later than 12 months from the date above, or sooner if the processing changes materially.`,
  };
}

Deno.test("item428 dpia: perfect fixture is fully conformant", () => {
  const doc = perfectDoc();
  const res = checkStructureConformance("dpia", doc);
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.checked, 10);
});

Deno.test("item428 dpia: a padded-hollow conditional section fails conformance", () => {
  const doc = perfectDoc();
  doc.section_5_interested_parties = ["Not recorded."];
  const res = checkStructureConformance("dpia", doc);
  assertEquals(res.ok, false);
  assert(res.padded_empty.includes("section_5_interested_parties"), JSON.stringify(res.padded_empty));
});
