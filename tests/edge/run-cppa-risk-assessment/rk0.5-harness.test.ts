// RK0.5 D1 — Local harness: deterministic engine over all CPPA_RISK_PERFECT fixtures.
//
// Companion to rk0.5-perfect-closed-loop.test.ts (which checks only the gate).
// This file asserts STRUCTURAL INVARIANTS on the engine output — skeleton
// completeness, coverage health, release-ledger safety, and no-model-call
// confirmation — independent of the gate predicate.
//
// §2 production telemetry signatures (from the D3 pass audit, doc 28) pinned
// here as assertions. A regression in any pass that produces these invariants
// will surface as a harness failure before the product ships.
//
// Engine invocation: deterministic Pass-1, EMPTY_RISK_CORPUS, no refinementDeps.
// Result: zero model calls, zero DB access. Pure function of the intake.
//
// One top-level Deno.test per fixture. Subtests (t.step) separate the assertion
// categories so failures are locatable without re-running the engine.

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/_shared/ltp/risk-corpus.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

const BUILD_STAMP = "rk0.5-harness";

Deno.test("RK0.5 harness — CPPA_RISK_PERFECT has at least 2 fixtures", () => {
  assert(CPPA_RISK_PERFECT.length >= 2, `Expected at least 2 perfect fixtures; got ${CPPA_RISK_PERFECT.length}`);
});

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`RK0.5 harness — ${c.id}`, async (t) => {
    // Run the engine once; all subtests read from this result.
    const result = await generateCppaRiskReport(c.intake, {
      pass1: "deterministic",
      riskCorpus: EMPTY_RISK_CORPUS,
      buildStamp: BUILD_STAMP,
      mode: "enforce",
    });

    const report = result.report as Record<string, unknown>;
    const internal = (
      ((report._meta as Record<string, unknown> | undefined)?.internal) ?? {}
    ) as Record<string, unknown>;

    // ── No-model-call confirmation ────────────────────────────────────────────
    await t.step("refinement skipped with 'missing_refinement_dependencies'", () => {
      // §2 signature: deterministic mode + no refinementDeps → crashed with this
      // sentinel. Confirms zero model spend for every harness run.
      const ref = internal.risk_refinement as Record<string, unknown> | undefined;
      assertExists(ref, "risk_refinement telemetry absent");
      assertEquals(
        ref.crashed,
        "missing_refinement_dependencies",
        `Expected refinement to crash with 'missing_refinement_dependencies'; got: ${ref.crashed}`,
      );
    });

    // ── Coverage matrix ───────────────────────────────────────────────────────
    await t.step("coverage matrix present and not crashed", () => {
      const cov = internal.risk_coverage as Record<string, unknown> | undefined;
      assertExists(cov, "risk_coverage telemetry absent — coverage pass did not run");
      assertEquals(cov.crashed, false, `Coverage matrix crashed on ${c.id}`);
    });

    await t.step("coverage matrix has zero orphans", () => {
      const cov = internal.risk_coverage as Record<string, unknown> | undefined;
      const counts = (cov?.counts ?? {}) as Record<string, unknown>;
      assertEquals(
        Number(counts.orphans),
        0,
        `Expected 0 coverage orphans on ${c.id}; got: ${counts.orphans}`,
      );
    });

    await t.step("coverage matrix checked at least one link", () => {
      const cov = internal.risk_coverage as Record<string, unknown> | undefined;
      const counts = (cov?.counts ?? {}) as Record<string, unknown>;
      assert(
        Number(counts.links_checked) > 0,
        `Expected links_checked > 0 on ${c.id}; got: ${counts.links_checked}`,
      );
    });

    // ── Record-complete gate ──────────────────────────────────────────────────
    await t.step("record_complete.value is true", () => {
      const rc = internal.record_complete as Record<string, unknown> | undefined;
      assertExists(rc, "record_complete telemetry absent");
      assertEquals(
        rc.value,
        true,
        `record_complete.value is not true on ${c.id}. failed_conditions: ${
          JSON.stringify(rc.failed_conditions)
        }`,
      );
    });

    await t.step("record_complete has no failed_conditions", () => {
      const rc = internal.record_complete as Record<string, unknown> | undefined;
      const fc = rc?.failed_conditions as unknown[] | undefined;
      assertEquals(
        (fc ?? []).length,
        0,
        `Expected no failed_conditions on ${c.id}; got: ${JSON.stringify(fc)}`,
      );
    });

    // ── Release ledger ────────────────────────────────────────────────────────
    await t.step("release ledger: no blocking findings", () => {
      const rl = internal.release_ledger as Record<string, unknown> | undefined;
      assertExists(rl, "release_ledger absent — ledger pass did not run");
      assertEquals(
        Number(rl.blocking_findings_open),
        0,
        `Expected 0 blocking_findings_open on ${c.id}; got: ${rl.blocking_findings_open}`,
      );
    });

    await t.step("release ledger: no coverage orphans", () => {
      const rl = internal.release_ledger as Record<string, unknown> | undefined;
      assertEquals(
        Number(rl?.coverage_orphans),
        0,
        `Expected 0 coverage_orphans in release ledger on ${c.id}; got: ${rl?.coverage_orphans}`,
      );
    });

    await t.step("release ledger: no unused material facts", () => {
      const rl = internal.release_ledger as Record<string, unknown> | undefined;
      assertEquals(
        Number(rl?.unused_material_facts),
        0,
        `Expected 0 unused_material_facts on ${c.id}; got: ${rl?.unused_material_facts}`,
      );
    });

    await t.step("release ledger: no citation failures", () => {
      const rl = internal.release_ledger as Record<string, unknown> | undefined;
      assertEquals(
        Number(rl?.citation_failures),
        0,
        `Expected 0 citation_failures on ${c.id}; got: ${rl?.citation_failures}`,
      );
    });

    // ── Skeleton assembly ─────────────────────────────────────────────────────
    await t.step("skeleton assembled with sections > 0", () => {
      const sk = internal.risk_skeleton as Record<string, unknown> | undefined;
      assertExists(sk, "risk_skeleton telemetry absent — skeleton assembler did not run");
      assert(
        Number(sk.sections) > 0,
        `Expected skeleton.sections > 0 on ${c.id}; got: ${sk.sections}`,
      );
    });

    await t.step("skeleton has zero conformance findings", () => {
      const sk = internal.risk_skeleton as Record<string, unknown> | undefined;
      const cf = sk?.conformance_findings as unknown[] | undefined;
      assertEquals(
        (cf ?? []).length,
        0,
        `Expected 0 conformance_findings on ${c.id}; got: ${JSON.stringify(cf)}`,
      );
    });

    await t.step("skeleton has zero register findings", () => {
      const sk = internal.risk_skeleton as Record<string, unknown> | undefined;
      const rf = sk?.register_findings as unknown[] | undefined;
      assertEquals(
        (rf ?? []).length,
        0,
        `Expected 0 register_findings on ${c.id}; got: ${JSON.stringify(rf)}`,
      );
    });

    // ── Document structure ────────────────────────────────────────────────────
    await t.step("report has executive_summary", () => {
      assert(
        typeof report.executive_summary === "string" && report.executive_summary.length > 0,
        `Expected non-empty executive_summary on ${c.id}`,
      );
    });

    await t.step("skeleton_document sections match skeleton telemetry", () => {
      const skDoc = report.skeleton_document as Record<string, unknown> | undefined;
      assertExists(skDoc, `skeleton_document absent on ${c.id}`);
      const sections = skDoc.sections as unknown[] | undefined;
      const sk = internal.risk_skeleton as Record<string, unknown> | undefined;
      assertEquals(
        (sections ?? []).length,
        Number(sk?.sections ?? 0),
        `skeleton_document.sections.length !== risk_skeleton.sections on ${c.id}`,
      );
      assert((sections ?? []).length > 0, `skeleton_document has no sections on ${c.id}`);
    });

    await t.step("risk_register is a non-empty array", () => {
      const rr = report.risk_register as unknown[] | undefined;
      assert(Array.isArray(rr) && rr.length > 0, `Expected non-empty risk_register on ${c.id}`);
    });

    await t.step("activity_analytics is a non-empty array", () => {
      const aa = report.activity_analytics as unknown[] | undefined;
      assert(Array.isArray(aa) && aa.length > 0, `Expected non-empty activity_analytics on ${c.id}`);
    });
  });
}
