// ITEM 428 PIECE A — governance structural-conformance battery.
//
// DEVIATION NOTE: governance's narrative sections are LLM-authored at
// generation time and are not reproducible offline. Following the
// live-parity hand-built prose precedent in
// tests/edge/item401/governance-perfect-and-gate.test.ts (output-neutrality
// doc), this battery hand-assembles a document carrying every plan section.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructureConformance } from "../../../supabase/functions/_shared/prose/structure-conformance.ts";

function perfectDoc(): Record<string, unknown> {
  return {
    accountability_determination: "Aldergate Occupational Health Services Ltd can demonstrate accountability under GDPR Art. 5(2) and the UK GDPR equivalent on the record supplied.",
    executive_summary: "Aldergate's accountability record supports the determination above: a named DPO, current notices, and a tested incident response plan.",
    organisation_profile: { summary: "620-employee occupational-health provider operating in the EU and UK, holding health and contact data for fitness-for-work assessments." },
    domain_findings: [
      { domain: "Governance and accountability", finding: "A formal DPO reports directly to the board." },
      { domain: "Records of processing", finding: "Maintained and reviewed on 2026-02-09." },
    ],
    domain_element_findings: [
      { element: "DPO reporting line", finding: "Reports directly to the Chief Executive." },
    ],
    interaction_effects: "The DPO's oversight of vendor Art. 28 clauses and the incident response plan reinforce one another: the same office owns both.",
    open_items: [{ item: "Evidence the clinician review of generated summaries." }],
    remediation_plan: [{ action: "Evidence the clinician review of generated summaries by 2026-09-30." }],
    enforcement_context: "No ICO or EU supervisory-authority action has named a comparable occupational-health provider on facts materially like these.",
  };
}

Deno.test("item428 governance: perfect fixture is fully conformant", () => {
  const doc = perfectDoc();
  const res = checkStructureConformance("governance", doc);
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.checked, 9);
});

Deno.test("item428 governance: a padded-hollow section fails conformance", () => {
  const doc = perfectDoc();
  doc.open_items = ["Not recorded."];
  const res = checkStructureConformance("governance", doc);
  assertEquals(res.ok, false);
  assert(res.padded_empty.includes("obligations_and_gaps"), JSON.stringify(res.padded_empty));
});
