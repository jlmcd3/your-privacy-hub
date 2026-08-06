// ITEM 392 — ADMT PLAN FIDELITY.
//
// The approved plan row (prose_document_plans f59eb3b8-d747-4110-a3ab-0452e9cf92fd,
// version prose-plans-2026-08-06-item392, approved under the CEO's delegation
// to the review panel) is the source of truth. The expected arc is hard-coded
// here WITH the version string so that a change to the plan row — or to the
// encode — breaks this test rather than silently shipping a different document.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_CENTRE_OF_GRAVITY,
  ADMT_PLAN_ROW_ID,
  ADMT_PLAN_VERSION,
  ADMT_SECTION_SPECS,
  ADMT_THESIS,
  admtSectionTitle,
} from "../../../supabase/functions/_shared/prose/plans/admt.spine.ts";

const PLAN = JSON.parse(
  await Deno.readTextFile(new URL("../../../library/prose/plans/admt.plan.json", import.meta.url)),
);

const EXPECTED: readonly [string, string, string, string][] = [
  ["applicability_verdict", "Whether these rules apply to this system", "headline", "determination"],
  ["scope_analysis", "The system as the business described it", "record", "record"],
  ["notice_analysis", "The pre-use notice right", "analysis", "determination"],
  ["opt_out_analysis", "The opt-out right", "analysis", "determination"],
  ["access_analysis", "The access right", "analysis", "determination"],
  ["adequacy_by_element", "Whether the record carries each element", "analysis", "determination"],
  ["consolidated_analyses", "Whether the disclosures may be consolidated", "analysis", "determination"],
  ["obligations_and_deadlines", "The obligations and when they fall due", "duty", "determination"],
  ["information_needed", "What the record does not yet state", "ask", "record"],
  ["actions", "What to do next", "remedy", "determination"],
  ["documentation_to_maintain", "What to keep on file", "remedy", "determination"],
  ["close", "Enforcement context and closing position", "close", "determination"],
];

Deno.test("ITEM 392 — plan identity is pinned to the approved row", () => {
  assertEquals(ADMT_PLAN_ROW_ID, "f59eb3b8-d747-4110-a3ab-0452e9cf92fd");
  assertEquals(ADMT_PLAN_VERSION, "prose-plans-2026-08-06-item392");
  assertEquals(PLAN.product, "admt");
  assertEquals(PLAN.version, ADMT_PLAN_VERSION);
});

Deno.test("ITEM 392 — the 12-section arc is encoded faithfully, in plan order", () => {
  assertEquals(ADMT_SECTION_SPECS.length, 12);
  assertEquals(PLAN.sections.length, 12);
  ADMT_SECTION_SPECS.forEach((s, i) => {
    const [id, title, stage, lead] = EXPECTED[i];
    assertEquals(s.id, id, `section ${i} id`);
    assertEquals(s.title, title, `section ${id} title`);
    assertEquals(s.arc_stage, stage, `section ${id} arc_stage`);
    assertEquals(s.lead, lead, `section ${id} lead`);
    assert(s.source_key.length > 0, `section ${id} has no source_key`);
    assert(s.themes.length > 0, `section ${id} has no themes`);
  });
});

Deno.test("ITEM 392 — the encode matches the authored plan row byte-for-byte on every pinned field", () => {
  ADMT_SECTION_SPECS.forEach((s, i) => {
    const row = PLAN.sections[i];
    assertEquals(row.id, s.id);
    assertEquals(row.title, s.title);
    assertEquals(row.arc_stage, s.arc_stage);
    assertEquals(row.lead, s.lead);
    assertEquals(row.source_key, s.source_key);
    assertEquals(row.themes, [...s.themes]);
  });
  assertEquals(PLAN.thesis, ADMT_THESIS);
});

Deno.test("ITEM 392 — determination-lead discipline holds per section class", () => {
  for (const s of ADMT_SECTION_SPECS) {
    if (s.arc_stage === "record" || s.arc_stage === "ask") {
      assertEquals(s.lead, "record", s.id);
    } else {
      assertEquals(s.lead, "determination", s.id);
    }
  }
});

Deno.test("ITEM 392 — the three rights precede the adequacy centre of gravity and the arc closes on the close", () => {
  const ids = ADMT_SECTION_SPECS.map((s) => s.id);
  const c = ids.indexOf(ADMT_CENTRE_OF_GRAVITY);
  assert(c > 0);
  for (const id of ["notice_analysis", "opt_out_analysis", "access_analysis"]) {
    assert(ids.indexOf(id) < c, `${id} must precede the adequacy analysis`);
  }
  assertEquals(ids[0], "applicability_verdict");
  assertEquals(ids[ids.length - 1], "close");
});

Deno.test("ITEM 392 — renderers can resolve every plan title by id", () => {
  for (const s of ADMT_SECTION_SPECS) assertEquals(admtSectionTitle(s.id), s.title);
  assertEquals(admtSectionTitle("nope", "fallback"), "fallback");
});

Deno.test("ITEM 392 — provenance records the render doc id and the delegated approval verbatim", () => {
  assertEquals(PLAN.provenance.render_doc_id, "562f1770-990e-4b4b-8f13-e7354dc6aa9b");
  assertEquals(PLAN.provenance.approval_note, "panel-delegated approval per CEO delegation 2026-08-06");
  assert(PLAN.exemplar_pairs.length >= 4, "the plan must carry exemplar pairs mined from the render");
  for (const xp of PLAN.exemplar_pairs) {
    assert(typeof xp.before === "string" && xp.before.length > 0, `${xp.id} before`);
    assert(typeof xp.after === "string" && xp.after.length > 0, `${xp.id} after`);
    assert(
      ADMT_SECTION_SPECS.some((s) => s.id === xp.section_id),
      `${xp.id} points at an unknown section ${xp.section_id}`,
    );
  }
});
