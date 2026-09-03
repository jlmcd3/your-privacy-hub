// DPIA REPLAY HARNESS — fixture sentinel.
//
// (i)  the deterministic replay of a fixture row produces a per_doc_result
//      with ZERO hard failures (every required surface present, no gap-ledger
//      entry with empty dimensions/field), and
// (ii) with code unchanged, the replay is BYTE-IDENTICAL to the stored
//      skeleton document (side_by_side reports zero changed blocks).
//
// No model calls: the module under test imports only deterministic builders.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  replayDpiaDoc,
  compareSkeletonDocuments,
  REQUIRED_DPIA_SURFACES,
} from "../../../supabase/functions/replay-dpia-harness/_local/ltp/replay/dpia-replay.ts";
import { attachDpiaDeliverables } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { attachDpiaAttestation } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/attestation.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/dpia-perfect-pinned.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const intakeOf = (f: Any) => f.intake ?? f.intake_data ?? f;

/** A shipped-row stand-in: report_data as the live path would have stored it. */
function shippedRow(intake: Any, id: string) {
  const report: Any = {};
  attachDpiaDeliverables(report, intake, { unitsMinimal: true });
  attachDpiaAttestation(report, intake);
  report.skeleton_document = assembleDpiaSkeletonDocument(report, intake).document;
  return { id, intake_data: intake, report_data: report };
}

const FIXTURES = (DPIA_PERFECT_PINNED as Any[]).map(intakeOf);

Deno.test("dpia replay — zero hard failures over pinned fixture rows", () => {
  for (const [i, intake] of FIXTURES.entries()) {
    const row = shippedRow(intake, `fixture-${i}`);
    const out = replayDpiaDoc(row);
    assertEquals(out.perDoc.hard_failures, [], `fixture ${i} hard failures`);
    assertEquals(out.perDoc.surfaces_absent, [], `fixture ${i} absent surfaces`);
    assertEquals(out.perDoc.surfaces_present.length, REQUIRED_DPIA_SURFACES.length);
    assert(out.perDoc.determination, `fixture ${i} determination present`);
    assert(out.perDoc.sections > 0, `fixture ${i} sections`);
  }
});

Deno.test("dpia replay — byte-identical replay when code is unchanged", () => {
  for (const [i, intake] of FIXTURES.entries()) {
    const row = shippedRow(intake, `fixture-${i}`);
    const out = replayDpiaDoc(row);
    assert(out.sideBySide, `fixture ${i} side_by_side present`);
    assertEquals(out.sideBySide!.summary.blocks_changed, 0, `fixture ${i} blocks changed`);
    assertEquals(out.sideBySide!.summary.sections_changed, 0);
    assert(out.sideBySide!.summary.byte_identical);
    // The source row is never mutated by the replay.
    assertEquals(
      JSON.stringify(row.report_data.skeleton_document),
      JSON.stringify(out.assembledReport),
    );
  }
});

Deno.test("dpia replay — side-by-side flags a changed block", () => {
  const stored = {
    sections: [{ id: "s1", title: "One", paragraphs: [{ kind: "p", text: "a" }, { kind: "p", text: "b" }] }],
  };
  const replayed = {
    sections: [{ id: "s1", title: "One", paragraphs: [{ kind: "p", text: "a" }, { kind: "p", text: "B!" }] }],
  };
  const sbs = compareSkeletonDocuments("d1", stored, replayed);
  assertEquals(sbs.summary.blocks_total, 2);
  assertEquals(sbs.summary.blocks_changed, 1);
  assertEquals(sbs.summary.byte_identical, false);
  assertEquals(sbs.sections[0].blocks[1].stored_text, "b");
  assertEquals(sbs.sections[0].blocks[1].replayed_text, "B!");
});
