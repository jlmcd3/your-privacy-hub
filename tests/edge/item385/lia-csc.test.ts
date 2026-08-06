// ITEM 385 LEG 2 — LIA CSC battery.
//
// Finds-and-repairs on synthetic violations, in both directions: a surface the
// record BACKS may not claim absence (repair), and a surface the record leaves
// SILENT keeps its absence prose untouched (honest degradation).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachLiaCsc,
  LIA_CSC_SURFACES,
  runLiaCsc,
} from "../../../supabase/functions/_shared/ltp/lia-csc.ts";
import { LIA_PERFECT } from "../../../supabase/functions/_shared/golden/lia-perfect.ts";

const INTAKE = LIA_PERFECT[0].intake as Record<string, unknown>;
const ABSENCE = "The record is silent here, and the question is carried forward.";

Deno.test("ITEM 385 — the surface map covers the five contract surfaces", () => {
  const paths = LIA_CSC_SURFACES.map((s) => s.path);
  for (
    const p of [
      "reasonable_expectations",
      "attestation_block",
      "opt_out_feasibility",
      "scale_frequency_duration",
      "three_part_test.balancing_test",
    ]
  ) {
    assert(paths.includes(p), `missing CSC surface ${p}`);
  }
});

Deno.test("L2 — absence prose on a BACKED surface is repaired from the single writer", () => {
  const report: Record<string, unknown> = {
    opt_out_feasibility: { feasibility: ABSENCE, application: ABSENCE },
  };
  const t = runLiaCsc(report, { intake: INTAKE });
  const l2 = t.violations.filter((v) => v.check_id === "l2_absence_claim_vs_record");
  assert(l2.length > 0, "expected an l2 violation on a backed surface");
  assert(l2.some((v) => v.path === "opt_out_feasibility" && v.repaired));
  assert(
    JSON.stringify(report.opt_out_feasibility).indexOf(ABSENCE) === -1,
    "the absence claim survived the repair",
  );
});

Deno.test("L2 — absence prose on an UNBACKED surface stands (honest degradation)", () => {
  const report: Record<string, unknown> = {
    opt_out_feasibility: { feasibility: ABSENCE },
  };
  const before = JSON.stringify(report);
  const t = runLiaCsc(report, { intake: { organization_name: "Silent Ltd" } });
  assertEquals(t.violations.filter((v) => v.check_id === "l2_absence_claim_vs_record").length, 0);
  assertEquals(JSON.stringify(report), before);
});

Deno.test("L3 — an authority field carrying gap prose is DROPPED, not rewritten", () => {
  const report: Record<string, unknown> = {
    lia_determination: {
      mitigations: [{ measure: "Device signals are truncated after 30 days.", authority_verbatim: ABSENCE }],
    },
  };
  const t = runLiaCsc(report, { intake: INTAKE });
  const l3 = t.violations.filter((v) => v.check_id === "l3_authority_field_hygiene");
  assertEquals(l3.length, 1);
  assert(l3[0].repaired);
  const m = (report.lia_determination as any).mitigations[0];
  assertEquals("authority_verbatim" in m, false);
  assertEquals(m.measure, "Device signals are truncated after 30 days.");
});

Deno.test("L4 — a structured leaf carrying register prose is flagged", () => {
  const report: Record<string, unknown> = {
    scale_frequency_duration: { status: ABSENCE, dimensions: [] },
  };
  const t = runLiaCsc(report, { intake: INTAKE });
  assert(t.violations.some((v) => v.check_id === "l4_structured_leaf_hygiene"));
});

Deno.test("CSC is fail-open and attaches telemetry at _meta.internal.lia_csc", () => {
  const report: Record<string, unknown> = {};
  const t = attachLiaCsc(report, { intake: INTAKE });
  assertEquals(t.crashed, false);
  assertEquals((report as any)._meta.internal.lia_csc.version, t.version);
  // A hostile shape does not throw.
  const bad = runLiaCsc(null, { intake: null });
  assertEquals(bad.violations.length, 0);
});
