/**
 * T-M5 (Item 225) — PASS-2 SECTION-SHARDED ASSEMBLER tests.
 * SHADOW MODE. Deno test harness.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleReportShadow, PASS2_ASSEMBLER_VERSION } from "./pass2-assembler.ts";
import { derivePlan } from "./derive.ts";
import { CPPA_RISK_SECTION_SHARDS } from "./section-shards/cppa-risk.ts";
import { CPPA_RISK_REPORT_SCHEMA } from "../report-schemas/cppa-risk.ts";
import { PASS2_FORBIDDEN_TOKENS } from "./content/pass2-templates.ts";
import { renderCyberAuditSchedule, SCHEDULE_MARKER } from "./cyber-audit-schedule.ts";
import type { OpeningHarvestArtifact } from "./harvest-guard.ts";

const buildStamp = "tm5-assembler@test";

function fixturePlan() {
  return derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "no",
    },
    report_data: {},
    buildStamp,
  });
}

Deno.test("T-M5: full-report fixture yields all 38 top-level shard keys touched", () => {
  const plan = fixturePlan();
  const result = assembleReportShadow(plan);
  assertEquals(result.version, PASS2_ASSEMBLER_VERSION);
  assertEquals(result.telemetry.total_sections, CPPA_RISK_SECTION_SHARDS.length);
  // Every registry key MUST appear in section telemetry (no drop-through).
  const keys = new Set(result.telemetry.sections.map((s) => s.key));
  for (const s of CPPA_RISK_SECTION_SHARDS) {
    assert(keys.has(s.key), `section telemetry missing ${s.key}`);
  }
  // Report keys are a subset of the schema top-level allow-list.
  const allowed = new Set(CPPA_RISK_REPORT_SCHEMA.topLevel);
  for (const k of Object.keys(result.report)) {
    assert(allowed.has(k), `assembler emitted unowned key: ${k}`);
  }
});

Deno.test("T-M5: manifest-hydration existence check omits debug_review_notes when absent", () => {
  const plan = fixturePlan();
  const result = assembleReportShadow(plan);
  const t = result.telemetry.sections.find((s) => s.key === "debug_review_notes")!;
  assertEquals(t.emitted, false);
  assertEquals(t.omitted_reason, "manifest_absent");
  assert(!("debug_review_notes" in result.report));
});

Deno.test("T-M5: submission_summary harvest auto-defaults to renderCyberAuditSchedule and is accepted", () => {
  const plan = fixturePlan();
  const result = assembleReportShadow(plan);
  const dec = result.telemetry.harvest_decisions.find((d) => d.harvest_key === "submission_summary")!;
  assertEquals(dec.rejection_reason, null);
  const val = result.report["submission_summary"] as string | undefined;
  assert(typeof val === "string");
  assert(val.includes(SCHEDULE_MARKER));
});

Deno.test("T-M5: forced-conflict opening_summary harvest is REJECTED with telemetry (paste)", () => {
  const plan = fixturePlan();
  // Force a conflict: intake_ref pointing at a field not present in plan.intake_ledger.
  const bad = {
    text: "Some opening narrative text sourced from unknown fields.",
    provenance: {
      // deliberately reference an intake field the plan never observed
      sources: { s1_prong: "nonexistent_intake_field_zzz" },
    },
  } as unknown as OpeningHarvestArtifact;
  const result = assembleReportShadow(plan, { opening_summary: bad });
  const dec = result.telemetry.harvest_decisions.find((d) => d.harvest_key === "opening_summary")!;
  // Paste the rejection telemetry so a reviewer sees the shape.
  console.log("[tm5-forced-conflict-paste]", JSON.stringify(dec));
  assertEquals(dec.rejection_reason, "harvest_intake_ref_not_in_plan_ledger");
  const t = result.telemetry.sections.find((s) => s.key === "opening_summary")!;
  assertEquals(t.emitted, false);
  assertEquals(t.omitted_reason, "harvest_rejected");
  assert(!("opening_summary" in result.report));
});

Deno.test("T-M5: no render_errors accumulate on fixture across template-owned sections", () => {
  const plan = fixturePlan();
  const result = assembleReportShadow(plan);
  const errs: { key: string; errors: readonly string[] }[] = [];
  for (const s of result.telemetry.sections) {
    if (s.owner_kind === "template" && s.render_errors.length > 0) {
      errs.push({ key: s.key, errors: s.render_errors });
    }
  }
  assertEquals(errs, [], `unexpected render errors: ${JSON.stringify(errs)}`);
});

Deno.test("T-M5: shipped guards run in TELEMETRY-ONLY mode on shadow output", () => {
  const plan = fixturePlan();
  const result = assembleReportShadow(plan);
  // Value screen must be observe-mode on shadow (never enforce_violation).
  assertEquals(result.telemetry.exit_checks.shipped_value_screen.mode, "observe");
  assertEquals(result.telemetry.exit_checks.shipped_value_screen.enforce_violation, false);
  // Surface guard is telemetry-only by construction (returns an evaluation object).
  const s = result.telemetry.exit_checks.shipped_surface;
  assert(Array.isArray(s.cut_violations));
  assert(Array.isArray(s.unowned_paths));
});
