// WAVE C2 (2026-08-23, doc 57 §1) — the determinism fix's cross-checks.
//
// 1. The pinned enforcement-precedents literal (the runtime feed for
//    <EnforcementPrecedents>/attachEnforcementAnnotations) and the DPIA
//    CAM's AP rows (the CEO-ratified customer-prose record) must name
//    EXACTLY the same 6 source rows — the single-writer risk the two-file
//    design (dpia-corpus-map.ts's file-header note) accepts, closed by
//    this test rather than left to inspection.
// 2. The release-1 AOW actually reaches the rendered Art. 36 sentence
//    when — and only when — the report's own consultation_required state
//    fires (render-and-inspect, doc 44 §D1).
// 3. No dark FC-J/FC-L row's pinned_excerpt leaks into a rendered document
//    (the R2 admission rule).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DPIA_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/dpia-corpus-map.ts";
import { DPIA_ENFORCEMENT_PRECEDENTS_PINNED } from "../../../supabase/functions/run-dpia-framework/_local/corpus/dpia-enforcement-precedents-pinned.ts";
import {
  art36Determination,
  dpiaConsultationWarning,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

Deno.test("wave C2 — the pinned precedents file and the CAM's AP rows name exactly the same 6 source rows", () => {
  const camApIds = new Set(
    DPIA_CORPUS_MAP.rows.filter((r) => r.role === "AP").map((r) => r.source_row_id),
  );
  const pinnedIds = new Set(DPIA_ENFORCEMENT_PRECEDENTS_PINNED.map((p) => p.id));
  assertEquals(camApIds.size, 6);
  assertEquals(pinnedIds.size, 6);
  assertEquals(camApIds, pinnedIds, "CAM AP rows and the pinned precedents file have drifted apart");
});

Deno.test("wave C2 — no pinned precedent carries a fine_eur_equivalent (the AENA data-quality guard)", () => {
  // The live enforcement_actions.fine_eur_equivalent for AENA is corrupted
  // (see the file-header note in dpia-enforcement-precedents-pinned.ts).
  // Asserting the field is never set here means fmtFine() always falls
  // through to the correct fine_amount string, for every row, by
  // construction — not just for the one row known to be bad today.
  for (const p of DPIA_ENFORCEMENT_PRECEDENTS_PINNED) {
    assertEquals(p.fine_eur_equivalent, undefined, `${p.id}: fine_eur_equivalent must stay unset`);
    assert(p.fine_amount && p.fine_amount.startsWith("€"), `${p.id}: fine_amount must be a formatted euro string`);
  }
});

Deno.test("wave C2 — no pinned precedent carries a source_url (the no-URL law, doc 62 §11.5)", () => {
  for (const p of DPIA_ENFORCEMENT_PRECEDENTS_PINNED) {
    assertEquals((p as Bag).source_url, undefined, `${p.id}: source_url must never be set`);
  }
});

Deno.test("wave C2 — the AOW renders on consultation_required and only then", () => {
  assertEquals(dpiaConsultationWarning("consultation_not_required"), null);
  assertEquals(dpiaConsultationWarning("undetermined_on_the_record"), null);
  const warning = dpiaConsultationWarning("consultation_required");
  assert(warning, "the AOW must fire on consultation_required");
  assert(warning!.includes("€10,043,002"));
  assert(warning!.includes("AEPD, AENA, 2025"));
  assert(warning!.includes("persuasive context only"));
});

Deno.test("wave C2 — art36Determination reads the report's own typed state (sanity, no guessed shape)", () => {
  assertEquals(art36Determination({ art36_consultation: { determination: "consultation_required" } }), "consultation_required");
  assertEquals(art36Determination({ art36_consultation: { determination: "consultation_not_required" } }), "consultation_not_required");
});

Deno.test("wave C2 — none of the dark FC-J/FC-L rows' pinned_excerpt leaks into the AOW or the composed Art. 36 sentence", () => {
  const dark = DPIA_CORPUS_MAP.rows.filter((r) => !r.render_eligible && r.pinned_excerpt);
  const warning = dpiaConsultationWarning("consultation_required") ?? "";
  for (const row of dark) {
    assert(!warning.includes(row.pinned_excerpt), `${row.id}: dark pinned_excerpt leaked into the AOW`);
  }
});
