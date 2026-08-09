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
  SECTION_7152_ELEMENT_MAP,
  ACTIVITY_BASIS_KEY,
  resolveRegistryPinpoint,
} from "../../../supabase/functions/_shared/ltp/risk-activity-emit.ts";
import { RISK_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/risk-stamp.ts";

Deno.test("ITEM 427 stamp", () => {
  assertEquals(RISK_PIPELINE_STAMP, "risk-pipeline@item428-2026-08-09");
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
  assert(activityViewText(v).join(" ").includes("Credit underwriting"));
});

Deno.test("ITEM 427 reader: mixed string + object array", () => {
  const v = coerceActivityView(["prose", { activity: "A", purpose: "P" }]);
  assertEquals(v.texts, ["prose"]);
  assertEquals(v.rows.length, 1);
});

// ── DETERMINISTIC PINPOINTS ───────────────────────────────────────────
Deno.test("ITEM 427 every § 7152(a) element pinpoint is registry-resolved", () => {
  assertEquals(SECTION_7152_ELEMENT_MAP.length, 7, "the (a) element map is the seven content elements");
  for (const { element, key } of SECTION_7152_ELEMENT_MAP) {
    const r = resolveRegistryPinpoint(key);
    assert(r.resolved, `${element} (${key}) does not resolve in the registry`);
    assert(/§ 7152\(a\)/.test(r.pinpoint), `${element} has a non-§7152(a) pinpoint: ${r.pinpoint}`);
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
        activity_purpose: "Decide financing",
        benefits: [
          { beneficiary_class: "the business", benefit: "Loss control" },
          { beneficiary_class: "the consumer", benefit: "Access to credit" },
          { beneficiary_class: "other stakeholders", benefit: "Dealer network stability" },
          { beneficiary_class: "the public", benefit: "Sound credit markets" },
        ],
        harm_causation: [
          { harm_label: "Economic harms", likelihood: "Possible", severity: "Moderate", cause: "A denial" },
        ],
        safeguard_map: [{ safeguard: "Human review", safeguard_status: "Implemented and tested" }],
        consequence: { decision: "initiate" },
        weighing: [{ beneficiary_class: "the consumer", reasoning: "Access is material" }],
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
  // The per-activity basis is the DUTY anchor (§ 7150(a)) resolved from the
  // registry — never model-authored, never hand-typed here.
  assertEquals(row.statutory_basis, resolveRegistryPinpoint(ACTIVITY_BASIS_KEY).pinpoint);
  assert(Array.isArray(row.section_7152_mapping) && row.section_7152_mapping.length > 0);
  const known = new Set(SECTION_7152_ELEMENT_MAP.map((e) => resolveRegistryPinpoint(e.key).pinpoint));
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

Deno.test("ITEM 427 writer: no analytics → legacy surface is left exactly as found", () => {
  const report = { risk_assessment_by_activity: ["legacy prose"] } as Record<string, unknown>;
  const before = JSON.stringify(report.risk_assessment_by_activity);
  normalizeRiskActivities(report, {});
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

Deno.test("ITEM 427 anti-padding: empty array with no analytics is OMITTED, not padded", () => {
  const report = { risk_assessment_by_activity: [] } as Record<string, unknown>;
  const summary = normalizeRiskActivities(report, {});
  assertEquals(summary.action, "omitted");
  assertEquals("risk_assessment_by_activity" in report, false);
});

Deno.test("ITEM 427 anti-padding: an untriggered scaffold row is not a triggered activity", async () => {
  const { isTriggeredAnalyticsRow } = await import(
    "../../../supabase/functions/_shared/ltp/risk-activity-emit.ts"
  );
  assertEquals(isTriggeredAnalyticsRow({ activity_name: "" }), false);
  assertEquals(isTriggeredAnalyticsRow({ activity_name: "Credit underwriting" }), false);
  assertEquals(
    isTriggeredAnalyticsRow({ activity_name: "Credit underwriting", activity_purpose: "Decide financing" }),
    true,
  );
});

// ── CSC LINKAGE ───────────────────────────────────────────────────────
Deno.test("ITEM 427 CSC linkage: a benefit the CSC strips never reaches a typed leaf", async () => {
  const { attachRiskCsc } = await import("../../../supabase/functions/_shared/ltp/risk-csc.ts");
  const report = reportWithAnalytics();
  const analytics = (report.activity_analytics as any[])[0];
  analytics.benefits.push({
    beneficiary_class: "the public",
    benefit: "Sierra Outfitters, Inc funds a municipal fibre-optic broadband rollout for every county it serves.",
  });
  attachRiskCsc(report, { intake: INTAKE as Record<string, unknown> });
  normalizeRiskActivities(report, INTAKE);
  const row = (report.risk_assessment_by_activity as any[])[0];
  const all = JSON.stringify(row);
  assert(
    !all.includes("municipal fibre-optic broadband"),
    "an unanchored benefit claim survived into a typed leaf",
  );
});

Deno.test("ITEM 427 emission is idempotent — re-running the writer changes nothing", () => {
  const report = reportWithAnalytics();
  normalizeRiskActivities(report, INTAKE);
  const once = JSON.stringify(report.risk_assessment_by_activity);
  normalizeRiskActivities(report, INTAKE);
  assertEquals(JSON.stringify(report.risk_assessment_by_activity), once);
});

Deno.test("ITEM 427 serializer allow-list keeps every canonical leaf", async () => {
  const { serializeCustomerReport } = await import(
    "../../../supabase/functions/_shared/report-serialize.ts"
  );
  const { CPPA_RISK_REPORT_SCHEMA } = await import(
    "../../../supabase/functions/_shared/report-schemas/cppa-risk.ts"
  );
  const report = reportWithAnalytics();
  normalizeRiskActivities(report, INTAKE);
  const out = serializeCustomerReport(report, CPPA_RISK_REPORT_SCHEMA).report as Record<string, unknown>;
  const row = (out.risk_assessment_by_activity as any[])[0];
  for (const leaf of RISK_ACTIVITY_LEAVES) {
    assert(leaf in row, `serializer pruned canonical leaf: ${String(leaf)}`);
  }
  assert(Array.isArray(row.section_7152_mapping));
  assert(typeof row.section_7152_mapping[0].pinpoint === "string");
});
