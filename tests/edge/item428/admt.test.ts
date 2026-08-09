// ITEM 428 PIECE A — admt structural-conformance battery.
//
// DEVIATION NOTE: admt's narrative sections are LLM-authored at generation
// time and are not reproducible offline. Following the live-parity
// hand-built prose precedent in tests/edge/item393/admt-perfect-and-gate.test.ts
// (output-neutrality doc), this battery hand-assembles a document carrying
// every plan section with real, non-placeholder content.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkStructureConformance } from "../../../supabase/functions/_shared/prose/structure-conformance.ts";

function perfectDoc(): Record<string, unknown> {
  return {
    applicability_verdict: "TalentRank is automated decisionmaking technology used to make a significant decision under 11 CCR § 7220 because it scores résumés and is used, without meaningfully independent human review, in hiring decisions.",
    scope_analysis: { summary: "Meridian Talent Corp's TalentRank scores résumés against role profiles using an in-house LightGBM model; hiring managers see a ranked list." },
    notice_gaps: [],
    opt_out_gaps: [],
    access_gaps: [],
    adequacy_finding: [{ element: "Logic disclosure", finding: "The notice discloses the model inputs and decision rule in plain language, satisfying § 7222(a)." }],
    consolidated_notice_analysis: "The pre-use notice, opt-out and access disclosures may be consolidated into the single privacy portal notice already in use.",
    deadline_table: [{ obligation: "Annual disparate-impact review", deadline: "2027-01-31" }],
    information_needed: [],
    top_3_actions: [
      { action: "Confirm the annual disparate-impact review is scheduled for 2027." },
      { action: "Document the human reviewer's authority to override TalentRank's ranking." },
      { action: "Retain the model card for the current LightGBM version." },
    ],
    documentation_to_maintain: [{ item: "Model card, review logs, and the reviewer override log." }],
    enforcement_context: "No CPPA enforcement action has yet named an ADMT hiring tool comparable to TalentRank; the analysis rests on the regulation's text.",
  };
}

Deno.test("item428 admt: perfect fixture is fully conformant", () => {
  const doc = perfectDoc();
  const res = checkStructureConformance("admt", doc);
  assertEquals(res.missing_required, []);
  assertEquals(res.padded_empty, []);
  assert(res.ok, JSON.stringify(res));
  assertEquals(res.checked, 12);
});

Deno.test("item428 admt: a padded-hollow section fails conformance", () => {
  const doc = perfectDoc();
  doc.documentation_to_maintain = ["Not recorded."];
  const res = checkStructureConformance("admt", doc);
  assertEquals(res.ok, false);
  assert(res.padded_empty.includes("documentation_to_maintain"), JSON.stringify(res.padded_empty));
});
