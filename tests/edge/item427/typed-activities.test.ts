/**
 * ITEM 427 — READER TOLERANCE, DETERMINISTIC PINPOINTS, WRITER EMISSION,
 * no-duplication against activity_analytics, and the CSC linkage.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  coerceActivityView,
  activityViewText,
  isRiskActivityRecord,
  RISK_ACTIVITY_LEAVES,
  analyticsDuplicationPaths,
} from "../../../supabase/functions/_shared/report-contracts/risk-activities.ts";
import {
  normalizeRiskActivities,
  SECTION_7152_ELEMENT_PINPOINTS,
} from "../../../supabase/functions/_shared/ltp/risk-activity-emit.ts";
import { RISK_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/risk-stamp.ts";

Deno.test("ITEM 427 stamp", () => {
  assertEquals(RISK_PIPELINE_STAMP, "risk-pipeline@item427-2026-08-09");
});

// ── READERS: all five states ──────────────────────────────────────────
Deno.test("ITEM 427 reader: absent", () => {
  const v = coerceActivityView(undefined);
  assertEquals(v.present, false);
  assertEquals(v.rows.length, 0);
  assertEquals(v.texts.length, 0);
});

Deno.test("ITEM 427 reader: empty array is present-but-empty, never padded", () => {
  const v = coerceActivityView([]);
  assertEquals(v.present, false);
  assertEquals(v.rows.length, 0);
});

Deno.test("ITEM 427 reader: bare string", () => {
  const v = coerceActivityView("One activity, weighed.");
  assertEquals(v.present, true);
  assertEquals(v.texts, ["One activity, weighed."]);
  assertEquals(v.rows.length, 0);
});

Deno.test("ITEM 427 reader: string[] (the wild shape)", () => {
  const v = coerceActivityView(["a", "  ", "b"]);
  assertEquals(v.texts, ["a", "b"]);
  assertEquals(v.rows.length, 0);
});

Deno.test("ITEM 427 reader: legacy eleven-leaf object[]", () => {
  const legacy = {
    activity: "Credit underwriting",
    purpose: "Decide financing.",
    benefits_to_business: "Loss control.",
    benefits_to_consumers: "Access to credit.",
    adverse_effects: [{ harm_type: "Economic harms", likelihood: "Possible", severity: "Moderate", description: "Denial." }],
    current_safeguards: "Human review.",
    safeguard_gaps: "None recorded.",
    benefits_outweigh_risks_conclusion: "Yes",
    benefits_outweigh_risks_rationale: "Because.",
    statutory_basis: "11 CCR § 7152(a)",
    section_7152_mapping: "§ 7152(a)(1)",
  };
  const v = coerceActivityView([legacy]);
  assertEquals(v.present, true);
  assertEquals(v.rows.length, 1);
  assertEquals(v.rows[0].activity, "Credit underwriting");
  assert(activityViewText(v).includes("Credit underwriting"));
});

Deno.test("ITEM 427 reader: mixed string + object array", () => {
  const v = coerceActivityView(["prose", { activity: "A", purpose: "P" }]);
  assertEquals(v.texts, ["prose"]);
  assertEquals(v.rows.length, 1);
});

// ── DETERMINISTIC PINPOINTS ───────────────────────────────────────────
Deno.test("ITEM 427 every § 7152(a) element pinpoint is registry-shaped", () => {
  const entries = Object.entries(SECTION_7152_ELEMENT_PINPOINTS);
  assert(entries.length >= 7, `expected the (a) element map, got ${entries.length}`);
  for (const [el, pin] of entries) {
    assert(/^11 CCR § 7152\(a\)\(\d+\)/.test(pin), `${el} has a non-registry pinpoint: ${pin}`);
  }
});

// ── WRITER EMISSION ───────────────────────────────────────────────────
const INTAKE = {
  entity_name: "Sierra Outfitters, Inc",
  activities: [{ id: "act_1", name: "Credit underwriting" }],
};

function reportWithAnalytics() {
  return {
    risk_assessment_by_activity: [
      "Sierra Outfitters, Inc processes application and bureau data to decide financing.",
    ],
    activity_analytics: [
      {
        activity_id: "act_1",
        activity_name: "Credit underwriting",
        purpose: "Decide financing.",
        benefits: {
          business: "Loss control.",
          consumer: "Access to credit.",
          other_stakeholders: "Dealer network stability.",
          public: "Sound credit markets.",
        },
        negative_impacts: [
          { harm_id: "E", label: "Economic harms", likelihood: "Possible", severity: "Moderate" },
        ],
        safeguards: [{ safeguard: "Human review", status: "Implemented and tested" }],
      },
    ],
  } as Record<string, unknown>;
}

Deno.test("ITEM 427 writer: one thirteen-leaf record per TRIGGERED activity", () => {
  const report = reportWithAnalytics();
  const summary = normalizeRiskActivities(report, INTAKE);
  const rows = report.risk_assessment_by_activity as any[];
  assertEquals(rows.length, 1, "never a padded record for an untriggered activity");
  assert(isRiskActivityRecord(rows[0]));
  for (const leaf of RISK_ACTIVITY_LEAVES) {
    assert(leaf in rows[0], `canonical leaf missing: ${leaf}`);
  }
  assertEquals(summary.emitted, 1);
});

Deno.test("ITEM 427 writer: statutory_basis and every mapping pinpoint are registry-sourced", () => {
  const report = reportWithAnalytics();
  normalizeRiskActivities(report, INTAKE);
  const row = (report.risk_assessment_by_activity as any[])[0];
  assert(/^11 CCR § 7152\(a\)/.test(row.statutory_basis), row.statutory_basis);
  assert(Array.isArray(row.section_7152_mapping) && row.section_7152_mapping.length > 0);
  const known = new Set(Object.values(SECTION_7152_ELEMENT_PINPOINTS));
  for (const m of row.section_7152_mapping) {
    assert(known.has(m.pinpoint), `model-authored pinpoint leaked: ${m.pinpoint}`);
  }
});

Deno.test("ITEM 427 writer: § 7152(a)(4) quartet — both added beneficiary classes present", () => {
  const report = reportWithAnalytics();
  normalizeRiskActivities(report, INTAKE);
  const row = (report.risk_assessment_by_activity as any[])[0];
  assertEquals(row.benefits_to_other_stakeholders, "Dealer network stability.");
  assertEquals(row.benefits_to_public, "Sound credit markets.");
});

Deno.test("ITEM 427 writer: no analytics → surface is left exactly as found", () => {
  const report = { risk_assessment_by_activity: ["legacy prose"] } as Record<string, unknown>;
  const before = JSON.stringify(report.risk_assessment_by_activity);
  normalizeRiskActivities(report, INTAKE);
  assertEquals(JSON.stringify(report.risk_assessment_by_activity), before);
});

// ── NO DUPLICATION WITH activity_analytics ────────────────────────────
Deno.test("ITEM 427 the two surfaces never assert the same fact in the same words", () => {
  const report = reportWithAnalytics();
  normalizeRiskActivities(report, INTAKE);
  const dupes = analyticsDuplicationPaths(
    report.risk_assessment_by_activity,
    report.activity_analytics,
  );
  assertEquals(dupes, [], `verbatim duplication across the two surfaces: ${dupes.join(", ")}`);
});
