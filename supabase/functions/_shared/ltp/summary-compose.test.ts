/**
 * LTP summary-compose tests — CONTENT COURIER 2026-07-26.
 * Deterministic; no network.
 *
 * Coverage:
 *   (a) forbidden-token lint on every new template (PASS2_FORBIDDEN_TOKENS)
 *   (b) calibration-match matrix — 3 openings × 4 activity-outcome combos
 *   (c) triggered_activities population — customer-question strings barred
 *   (d) aggregation rule = most-cautious (never averaged, never majority)
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  PASS2_TEMPLATES,
  PASS2_FORBIDDEN_TOKENS,
  FIRM_VARIANT_CLOSENESS_MAX,
} from "./content/pass2-templates.ts";
import {
  composeAssessmentSummary,
  populateTriggeredActivities,
  selectOpeningTemplateId,
  type ActivityOutcome,
} from "./summary-compose.ts";
import { assertCalibrationMatch } from "./pass2-render.ts";
import { derivePlan } from "./derive.ts";
import type { RenderPlan } from "../render-plan/schema.ts";

const buildStamp = "test-summary-compose";
const NEW_IDS = [
  "T.risk.summary.opening.all_firm",
  "T.risk.summary.opening.mixed_hedged",
  "T.risk.summary.opening.any_negative",
  "T.risk.summary.activity_line",
  "T.risk.summary.docs",
];

// ── (a) forbidden-token lint ────────────────────────────────────────
Deno.test("summary templates: no forbidden tokens (CCPA is template-authored, permitted)", () => {
  for (const id of NEW_IDS) {
    const tpl = PASS2_TEMPLATES[id];
    assert(tpl, `missing template ${id}`);
    for (const t of PASS2_FORBIDDEN_TOKENS) {
      assert(!tpl.text.includes(t), `template ${id} contains forbidden token ${t}`);
    }
  }
});

// ── (b) calibration-match matrix — 3 openings × 4 outcome combos ───
const mkOutcome = (i: number, k: ActivityOutcome["outcome"], closeness = 0.2): ActivityOutcome => ({
  activity_ref: `A${i}`,
  activity_label: `Activity ${i}`,
  outcome: k,
  closeness,
  key_factor_token: "identified factor",
  documentation_incomplete: false,
});

Deno.test("aggregation matrix: opening variant = most-cautious outcome present", () => {
  const cases: { name: string; outs: ActivityOutcome[]; expected: string }[] = [
    { name: "all firm",              outs: [mkOutcome(1, "firm_benefits_outweigh"), mkOutcome(2, "firm_benefits_outweigh")], expected: "T.risk.summary.opening.all_firm" },
    { name: "firm + hedged",         outs: [mkOutcome(1, "firm_benefits_outweigh"), mkOutcome(2, "hedged_or_incomplete")], expected: "T.risk.summary.opening.mixed_hedged" },
    { name: "firm + high closeness", outs: [mkOutcome(1, "firm_benefits_outweigh"), mkOutcome(2, "firm_benefits_outweigh", 0.75)], expected: "T.risk.summary.opening.mixed_hedged" },
    { name: "any negative present",  outs: [mkOutcome(1, "firm_benefits_outweigh"), mkOutcome(2, "impacts_outweigh")], expected: "T.risk.summary.opening.any_negative" },
    { name: "single negative only",  outs: [mkOutcome(1, "impacts_outweigh")], expected: "T.risk.summary.opening.any_negative" },
    { name: "incomplete only",       outs: [mkOutcome(1, "assessment_incomplete")], expected: "T.risk.summary.opening.mixed_hedged" },
    { name: "3 firm + 1 negative — never majority", outs: [
        mkOutcome(1, "firm_benefits_outweigh"), mkOutcome(2, "firm_benefits_outweigh"),
        mkOutcome(3, "firm_benefits_outweigh"), mkOutcome(4, "impacts_outweigh"),
      ], expected: "T.risk.summary.opening.any_negative" },
    { name: "empty set defaults to firm", outs: [], expected: "T.risk.summary.opening.all_firm" },
  ];
  for (const c of cases) {
    assertEquals(selectOpeningTemplateId(c.outs), c.expected, c.name);
  }
});

Deno.test("calibration assert: firm variant forbidden when any activity ≥ FIRM_VARIANT_CLOSENESS_MAX", () => {
  const outs = [mkOutcome(1, "firm_benefits_outweigh", 0.8)];
  const chosen = selectOpeningTemplateId(outs);
  // The summary composer must select mixed_hedged, not all_firm.
  assertEquals(chosen, "T.risk.summary.opening.mixed_hedged");
  // Sanity: the underlying firm-variant calibration on the balance template
  // still fires at the same threshold.
  assert(assertCalibrationMatch("T.risk.balance.firm", FIRM_VARIANT_CLOSENESS_MAX) !== null);
  assert(assertCalibrationMatch("T.risk.balance.hedged", FIRM_VARIANT_CLOSENESS_MAX) === null);
});

// ── (c) triggered_activities population — customer-question exclusion ──
Deno.test("triggered_activities: customer-question strings can never enter the array", () => {
  const basePlan = derivePlan({ intake: {}, report_data: {}, buildStamp });
  const plan: RenderPlan = {
    ...basePlan,
    intake_ledger: [
      { ledger_id: "L.act1",  intake_field: "activity_1", value: "training-a-model",
        display: "Training a fraud-detection model" },
      { ledger_id: "L.leak1", intake_field: "q_leak",     value: "?",
        display: "Please describe how the model will be retrained." },
      { ledger_id: "L.leak2", intake_field: "q_leak2",    value: "?",
        display: "What safeguards will you put in place?" },
      { ledger_id: "L.act2",  intake_field: "activity_2", value: "profiling",
        display: "Behavioral profiling for advertising" },
    ],
    propositions: [
      {
        id: "P.applR.1", conclusion_id: "C.applicability.7150b",
        epistemic_type: "R", jurisdiction_tag: "cppa-ca",
        polarity: "positive", anchor: { corpus_key: "cppa.7150", pinpoint: "§ 7150(b)" },
        intake_ledger_refs: ["L.act1", "L.leak1"], citation_binding_refs: [],
      },
      {
        id: "P.applR.2", conclusion_id: "C.applicability.7150b",
        epistemic_type: "R", jurisdiction_tag: "cppa-ca",
        polarity: "positive", anchor: { corpus_key: "cppa.7150", pinpoint: "§ 7150(b)" },
        intake_ledger_refs: ["L.act2", "L.leak2"], citation_binding_refs: [],
      },
    ],
  };
  const activities = populateTriggeredActivities(plan);
  assertEquals(activities.length, 2);
  assert(activities.includes("Training a fraud-detection model"));
  assert(activities.includes("Behavioral profiling for advertising"));
  // The two customer questions MUST NOT appear.
  for (const label of activities) {
    assert(!label.endsWith("?"), `customer question leaked: ${label}`);
    assert(!/^please/i.test(label), `question-shaped label leaked: ${label}`);
    assert(!/^what/i.test(label), `question-shaped label leaked: ${label}`);
  }
});

// ── (d) end-to-end compose smoke ─────────────────────────────────────
Deno.test("composeAssessmentSummary: end-to-end deterministic; HELD flag carried; narrative under cap", () => {
  const plan = derivePlan({ intake: {}, report_data: {}, buildStamp });
  const res = composeAssessmentSummary({
    plan,
    activity_outcomes: [
      mkOutcome(1, "firm_benefits_outweigh"),
      mkOutcome(2, "hedged_or_incomplete", 0.7),
    ],
    intake: { company_name: "Acme Co.", sector: "Retail", assessment_date: "2026-07-26" },
    gate_signals: {
      admt_disclosure_required: false,
      cybersecurity_audit_required: true,
      documentation_gate_failed: true,
      exception_labels: ["§ 7150(e) service-provider carve-out"],
    },
    corpus_enforcement_note: "No CPPA enforcement actions on this activity type as of this record.",
    overall_risk_level_from_caller: "Moderate",
  });
  assertEquals(res.structured.company_name, "Acme Co.");
  assertEquals(res.structured.overall_risk_level, "Moderate"); // pass-through; HELD not resolved
  assertEquals(res.telemetry.overall_risk_level_held, true);
  assertEquals(res.telemetry.opening_template_id, "T.risk.summary.opening.mixed_hedged");
  assert(res.structured.narrative.length > 0);
  assert(res.structured.narrative.length <= 2400);
  assert(res.structured.exceptions_status.includes("documentation incomplete"));
  assert(res.structured.exceptions_status.startsWith("Exceptions claimed:"));
  // Verify no forbidden tokens leaked into the narrative.
  for (const t of PASS2_FORBIDDEN_TOKENS) {
    if (t === "§") continue; // pinpoint substitution may legitimately emit § via bindings
    assert(!res.structured.narrative.includes(t), `narrative contains forbidden token ${t}`);
  }
});

Deno.test("composeAssessmentSummary: no exceptions claimed renders sentinel", () => {
  const plan = derivePlan({ intake: {}, report_data: {}, buildStamp });
  const res = composeAssessmentSummary({
    plan,
    activity_outcomes: [mkOutcome(1, "firm_benefits_outweigh")],
    intake: {},
    gate_signals: { exception_labels: [], documentation_gate_failed: false },
  });
  assertEquals(res.structured.exceptions_status, "No exceptions claimed");
  assertEquals(res.telemetry.opening_template_id, "T.risk.summary.opening.all_firm");
});
