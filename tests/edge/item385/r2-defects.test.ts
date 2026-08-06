// ITEM 385 r2 — the two defects on the first full-stack LIA run.
//
// DEFECT 1: `lia_determination.mitigations[1]` flagged
//           mitigation_without_record_anchor although the record states a
//           two-channel opt-out.
// DEFECT 2: `documentation_recommendations` carried the controlled absence
//           frame on a record that backs the surface.
//
// Both directions per fix, plus the LIVE-PARITY guard that the leg-2 test
// lacked: the leg-2 coverage test fed the FULL fixture intake straight into
// `runCoverageMatrix`, while `run-li-assessment` fed the TRIMMED
// `liaIntakeObject`. The synthetic path saw balancing_details; the live path
// did not. The parity test below reads the live call sites.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runCoverageMatrix } from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { LIA_PERFECT } from "../../../supabase/functions/_shared/golden/lia-perfect.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/_shared/ltp/lia-deliverables/build.ts";
import { buildLiaUpgrade4 } from "../../../supabase/functions/_shared/ltp/lia-deliverables/build-upgrade4.ts";
import {
  classifiedOpenItems,
  planRegisterElements,
  repairDocumentationRecommendations,
} from "../../../supabase/functions/_shared/ltp/lia-deliverables/doc-plan-register.ts";
import {
  LIA_CSC_SURFACES,
  runLiaCsc,
} from "../../../supabase/functions/_shared/ltp/lia-csc.ts";
import { LIA_WATCH_CLASSES, LIA_CRITIC_WATCHLIST } from "../../../supabase/functions/_shared/ltp/lia-refinement-config.ts";

const INTAKE = LIA_PERFECT[0].intake as Record<string, unknown>;
const ABSENCE = "The record is silent here, and the question is carried forward.";

function assemble(intake: Record<string, unknown>): Record<string, unknown> {
  return {
    ...(buildLiaDeliverables(intake) as unknown as Record<string, unknown>),
    ...(buildLiaUpgrade4(intake) as unknown as Record<string, unknown>),
  };
}

// ── DEFECT 1 ───────────────────────────────────────────────────────────────

Deno.test("r2 D1 — every emitted mitigation DECLARES its record anchor keys", () => {
  const report = assemble(INTAKE);
  const mits = ((report.lia_determination as any)?.mitigations ?? []) as any[];
  assert(mits.length > 0, "the perfect record emitted no mitigation to audit");
  for (const m of mits) {
    assert(
      Array.isArray(m.anchor_keys),
      `mitigation "${String(m.measure).slice(0, 60)}" declares no anchor_keys`,
    );
  }
});

Deno.test("r2 D1 — the opt-out mitigation is WRITTEN FROM the recorded route", () => {
  const report = assemble(INTAKE);
  const mits = ((report.lia_determination as any)?.mitigations ?? []) as any[];
  const optOut = mits.find((m) =>
    (m.anchor_keys ?? []).includes("balancing_details.opt_out_mechanism")
  );
  assert(optOut, "no mitigation anchored to the recorded opt-out");
  assert(
    /record already states the route/i.test(String(optOut.measure)),
    `the composer still advises generically: ${String(optOut.measure).slice(0, 120)}`,
  );
});

Deno.test("r2 D1 — zero orphans on the LIA_PERFECT document (record supplies the anchor)", () => {
  const report = assemble(INTAKE);
  const t = runCoverageMatrix("lia", report, INTAKE);
  assertEquals(t.crashed, false);
  assertEquals(t.orphans.length, 0, JSON.stringify(t.orphans, null, 2));
});

Deno.test("r2 D1 — the OTHER direction: a declared anchor the record does not fill IS an orphan", () => {
  const report = {
    lia_determination: {
      driving_factors: [],
      mitigations: [{
        factor: "reasonable_expectations",
        measure: "Carry the recorded stop to the point of first encounter and name the role that operates it.",
        anchor_keys: ["balancing_details.opt_out_mechanism"],
      }],
    },
  };
  const t = runCoverageMatrix("lia", report, { organization_name: "Silent Ltd" });
  assert(
    t.orphans.some((o) => o.type === "mitigation_without_record_anchor"),
    "an unbacked declared anchor was not flagged",
  );
});

Deno.test("r2 D1 LIVE PARITY — the pipeline feeds coverage and CSC the FULL record", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-li-assessment/index.ts", import.meta.url),
  );
  // The trimmed projection may still exist for other consumers, but it must no
  // longer reach either evidence pass — that divergence is defect 1's root.
  const cscCall = /attachLiaCsc\([\s\S]{0,600}?\}\);/.exec(src)?.[0] ?? "";
  const covCall = /runCoverageMatrix\(\s*\n?\s*"lia",[\s\S]{0,400}?\)/.exec(src)?.[0] ?? "";
  assert(cscCall.length > 0 && covCall.length > 0, "could not locate the live call sites");
  assertEquals(/liaIntakeObject/.test(cscCall), false, "CSC still receives the trimmed intake");
  assertEquals(/liaIntakeObject/.test(covCall), false, "coverage still receives the trimmed intake");
  assert(/assessment/.test(cscCall) && /assessment/.test(covCall));
});

// ── DEFECT 2 ───────────────────────────────────────────────────────────────

Deno.test("r2 D2 — the doc-recs surface is on the L2 CSC map with its backing keys", () => {
  const s = LIA_CSC_SURFACES.find((x) => x.path === "documentation_recommendations");
  assert(s, "documentation_recommendations is not a CSC surface");
  assert(s!.keys.includes("balancing_details.opt_out_mechanism"));
  assert(typeof s!.repair === "function", "the surface has no single-writer repair");
});

Deno.test("r2 D2 — an absence frame on a BACKED doc-recs surface is repaired from the ledger", () => {
  const report: Record<string, unknown> = {
    information_needed: [
      "balancing_details.retention_period — the period after which the device signals are deleted",
    ],
    documentation_recommendations: {
      review_triggers: [ABSENCE],
      balancing_record_elements: [ABSENCE, ABSENCE],
      recommended_documentation: [
        { document: "Balancing record", key_elements: [ABSENCE] },
      ],
    },
  };
  const t = runLiaCsc(report, { intake: INTAKE });
  assert(
    t.violations.some((v) =>
      v.check_id === "l2_absence_claim_vs_record" &&
      v.path === "documentation_recommendations" && v.repaired
    ),
    `no repair recorded: ${JSON.stringify(t.violations)}`,
  );
  const after = JSON.stringify(report.documentation_recommendations);
  assertEquals(after.includes(ABSENCE), false, "the frame survived the repair");
  assert(/Owner:/.test(after) && /Done when:/.test(after), "the plan register carries no owner/trigger");
});

Deno.test("r2 D2 — the OTHER direction: on a SILENT record the honest frame stands", () => {
  const report: Record<string, unknown> = {
    documentation_recommendations: { review_triggers: [ABSENCE] },
  };
  const before = JSON.stringify(report);
  const t = runLiaCsc(report, { intake: { organization_name: "Silent Ltd" } });
  assertEquals(
    t.violations.filter((v) => v.path === "documentation_recommendations").length,
    0,
  );
  assertEquals(JSON.stringify(report), before, "an honest frame was rewritten");
});

Deno.test("r2 D2 — the register derives from THIS report's classified open items", () => {
  const report = {
    information_needed: [{ question: "Which role signs off the quarterly threshold review?" }],
  };
  const open = classifiedOpenItems(report);
  assertEquals(open.length, 1);
  const reg = planRegisterElements(report);
  assert(reg[0].includes("Which role signs off"));
  assert(reg[0].includes("Owner:") && reg[0].includes("Done when:"));
});

Deno.test("r2 D2 — a MIXED leaf keeps its substance; a pure frame is removed", () => {
  const node = {
    balancing_record_elements: [
      `${ABSENCE} The threshold and its review cadence are recorded in the payments runbook.`,
      ABSENCE,
    ],
  };
  const r = repairDocumentationRecommendations(node, INTAKE, {});
  const list = (r.value as any).balancing_record_elements as string[];
  assertEquals(list.length, 1);
  assertEquals(list[0].includes(ABSENCE), false);
  assert(list[0].includes("payments runbook"));
});

Deno.test("r2 D2 — the phrase class joins the LIA watchlist as W7", () => {
  assert(LIA_WATCH_CLASSES.some((w) => w.id === "W7"));
  assert(/W7 Absence frame on a backed surface/.test(LIA_CRITIC_WATCHLIST));
  assert(/genuinely silent surface is designed output/.test(LIA_CRITIC_WATCHLIST));
});
