/**
 * ITEM 247 — TRACK 2 STAGE 2 / RIDER (C3): DETERMINISM SNAPSHOT.
 *
 * Spec §6 "determinism snapshot" CI regression gate. Exists to catch
 * accidental non-determinism (unstable ordering, hidden clock reads,
 * hash-map iteration drift) in the composer/assembler chain. Does NOT
 * check content richness — that is the golden-shape quotas' job.
 *
 * Method: build the same fixture plan twice from an identical intake,
 * run assembleReport(..., {exitMode:"observe"}) on each, and assert both
 * the shipped `report` and the `telemetry.sections` classification are
 * deep-equal via JSON round-trip (no hand-rolled partial comparators
 * that could mask drift).
 */
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleReport } from "../../../../supabase/functions/_shared/ltp/pass2-assembler.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";

export const DETERMINISM_SNAPSHOT_VERSION = "determinism-snapshot-2026-07-29-item247";

function buildPlan() {
  return derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "no",
    },
    report_data: {},
    buildStamp: "determinism-snapshot@test",
  });
}

Deno.test("ITEM 247 (C3): assembleReport is deterministic — report deep-equal across two independent runs", () => {
  const planA = buildPlan();
  const planB = buildPlan();

  const runA = assembleReport(planA, {}, { exitMode: "observe" });
  const runB = assembleReport(planB, {}, { exitMode: "observe" });

  // Full-body JSON equality — do not hand-roll a partial comparator.
  const encodedA = JSON.stringify(runA.report);
  const encodedB = JSON.stringify(runB.report);
  assertEquals(encodedA, encodedB, "shipped report drifted across two identical runs");
});

Deno.test("ITEM 247 (C3): assembleReport telemetry.sections classification is deterministic", () => {
  const planA = buildPlan();
  const planB = buildPlan();

  const runA = assembleReport(planA, {}, { exitMode: "observe" });
  const runB = assembleReport(planB, {}, { exitMode: "observe" });

  assertEquals(
    JSON.stringify(runA.telemetry.sections),
    JSON.stringify(runB.telemetry.sections),
    "telemetry.sections emitted/omitted classification drifted across two identical runs",
  );
});
