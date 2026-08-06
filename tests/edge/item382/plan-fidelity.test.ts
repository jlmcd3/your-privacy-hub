// ITEM 382 — PLAN FIDELITY.
//
// The approved plan row (prose_document_plans c9b3d942-83b9-4aac-859d-b507c1f2ef37,
// version prose-plans-2026-08-04-item364-d2) is the source of truth. The
// expected arc is hard-coded here WITH the version string so that a change to
// the plan row — or to the encode — breaks this test rather than silently
// shipping a different document.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  LIA_PLAN_ROW_ID,
  LIA_PLAN_VERSION,
  LIA_SECTION_SPECS,
  LIA_THESIS,
  LIA_CENTRE_OF_GRAVITY,
  liaSectionTitle,
} from "../../../supabase/functions/_shared/prose/plans/lia.spine.ts";

const EXPECTED: readonly [string, string, string, string][] = [
  ["determination", "Determination", "headline", "determination"],
  ["classification", "The processing as the organisation described it", "record", "record"],
  ["interest_legitimacy", "The interest and whether it is a legitimate one", "analysis", "determination"],
  ["benefit_and_beneficiary", "What the processing achieves, and for whom", "analysis", "determination"],
  ["alternatives_considered", "Whether a less intrusive route was available", "analysis", "determination"],
  ["relationship_with_individual", "The relationship between the organisation and the people affected", "analysis", "determination"],
  ["scale_frequency_duration", "How much processing, how often, and for how long", "analysis", "determination"],
  ["potential_harms", "What could go wrong for the people affected", "analysis", "determination"],
  ["opt_out_feasibility", "Whether the people affected can stop it", "analysis", "determination"],
  ["balancing", "The balance", "analysis", "determination"],
  ["comparable_decisions", "Comparable regulator decisions", "duty", "determination"],
  ["information_needed", "What the record does not yet state", "ask", "record"],
  ["documentation_recommendations", "What to write down next", "remedy", "determination"],
  ["attestation_block", "Review, approval, and when this must be looked at again", "close", "determination"],
];

Deno.test("ITEM 382 — plan identity is pinned to the approved row", () => {
  assertEquals(LIA_PLAN_ROW_ID, "c9b3d942-83b9-4aac-859d-b507c1f2ef37");
  assertEquals(LIA_PLAN_VERSION, "prose-plans-2026-08-04-item364-d2");
});

Deno.test("ITEM 382 — the 14-section arc is encoded faithfully, in plan order", () => {
  assertEquals(LIA_SECTION_SPECS.length, 14);
  LIA_SECTION_SPECS.forEach((s, i) => {
    const [id, title, stage, lead] = EXPECTED[i];
    assertEquals(s.id, id, `section ${i} id`);
    assertEquals(s.title, title, `section ${id} title`);
    assertEquals(s.arc_stage, stage, `section ${id} arc_stage`);
    assertEquals(s.lead, lead, `section ${id} lead`);
    assert(s.source_key.length > 0, `section ${id} has no source_key`);
    assert(s.themes.length > 0, `section ${id} has no themes`);
  });
});

Deno.test("ITEM 382 — determination-lead discipline holds per section class", () => {
  // Only the record and ask stages open with the record; every analysis,
  // remedy, duty, headline and close section opens with the finding.
  for (const s of LIA_SECTION_SPECS) {
    if (s.arc_stage === "record" || s.arc_stage === "ask") {
      assertEquals(s.lead, "record", s.id);
    } else {
      assertEquals(s.lead, "determination", s.id);
    }
  }
});

Deno.test("ITEM 382 — the balance is the centre of gravity and the analysis chain ascends to it", () => {
  const ids = LIA_SECTION_SPECS.map((s) => s.id);
  const b = ids.indexOf(LIA_CENTRE_OF_GRAVITY);
  assert(b > 0);
  // Every analysis section other than the balance precedes it.
  for (const s of LIA_SECTION_SPECS) {
    if (s.arc_stage === "analysis" && s.id !== "balancing") {
      assert(ids.indexOf(s.id) < b, `${s.id} must precede the balance`);
    }
  }
  // The arc closes on the attestation.
  assertEquals(ids[ids.length - 1], "attestation_block");
  assert(LIA_THESIS.includes("that weighing is the document"));
});

Deno.test("ITEM 382 — renderers can resolve every plan title by id", () => {
  for (const s of LIA_SECTION_SPECS) assertEquals(liaSectionTitle(s.id), s.title);
  assertEquals(liaSectionTitle("nope", "fallback"), "fallback");
});
