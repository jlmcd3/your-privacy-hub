/**
 * LTP risk-level-map tests — CONTENT COURIER 2026-07-26 (HELD-F release).
 * Deterministic; no network.
 *
 * Coverage:
 *   - Rule 1: impacts-outweigh → Critical when Severe/Highly-likely trigger
 *              present; else High. Determined-negative beats insufficiency.
 *   - Rule 2: write-around OR all-doc-incomplete OR all-mandatory-no-evidence
 *              → Insufficient basis.
 *   - Rule 3: hedged/close, partial doc-incompleteness, or open safeguard
 *              gaps → Moderate.
 *   - Rule 4: all-firm, no gaps → Low.
 *   - Every enum member reachable.
 *   - Consistency asserter: opening ⇔ overall_risk_level for all 5 members.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  mapOverallRiskLevel,
  assertOpeningRiskLevelConsistency,
  T_CRITICAL_SEVERITY_LITERAL,
  T_CRITICAL_LIKELIHOOD_LITERAL,
  type ActivityRecordSignals,
} from "./risk-level-map.ts";
import { selectOpeningTemplateId, type ActivityOutcome } from "./summary-compose.ts";

const mkOutcome = (
  i: number,
  k: ActivityOutcome["outcome"],
  closeness = 0.2,
): ActivityOutcome => ({
  activity_ref: `A${i}`,
  activity_label: `Activity ${i}`,
  outcome: k,
  closeness,
  key_factor_token: "identified factor",
  documentation_incomplete: false,
});

const cleanSig = (i: number, patch: Partial<ActivityRecordSignals> = {}): ActivityRecordSignals => ({
  activity_ref: `A${i}`,
  negative_impacts: [],
  write_around_engaged: false,
  documentation_incomplete: false,
  all_mandatory_factors_no_evidence: false,
  safeguard_gaps_open: false,
  ...patch,
});

// ── Rule 1 ────────────────────────────────────────────────────────────
Deno.test("Rule 1: impacts-outweigh with Severe severity → Critical", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "impacts_outweigh")],
    signals: [cleanSig(1, { negative_impacts: [{ severity: T_CRITICAL_SEVERITY_LITERAL }] })],
  });
  assertEquals(r.overall_risk_level, "Critical");
  assertEquals(r.rule_fired, 1);
  assertEquals(r.critical_trigger_activity_ref, "A1");
});

Deno.test("Rule 1: impacts-outweigh with Highly likely likelihood → Critical", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "impacts_outweigh")],
    signals: [cleanSig(1, { negative_impacts: [{ likelihood: T_CRITICAL_LIKELIHOOD_LITERAL }] })],
  });
  assertEquals(r.overall_risk_level, "Critical");
});

Deno.test("Rule 1: impacts-outweigh without trigger → High", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "impacts_outweigh")],
    signals: [cleanSig(1, { negative_impacts: [{ severity: "Moderate", likelihood: "Possible" }] })],
  });
  assertEquals(r.overall_risk_level, "High");
  assertEquals(r.rule_fired, 1);
});

Deno.test("Rule 1: determined negative beats coexisting insufficiency", () => {
  const r = mapOverallRiskLevel({
    outcomes: [
      mkOutcome(1, "impacts_outweigh"),
      mkOutcome(2, "assessment_incomplete"),
    ],
    signals: [
      cleanSig(1, { negative_impacts: [{ severity: T_CRITICAL_SEVERITY_LITERAL }] }),
      cleanSig(2, { write_around_engaged: true, documentation_incomplete: true }),
    ],
  });
  assertEquals(r.overall_risk_level, "Critical");
});

// ── Rule 2 ────────────────────────────────────────────────────────────
Deno.test("Rule 2: write-around engaged on any activity → Insufficient basis", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "hedged_or_incomplete"), mkOutcome(2, "firm_benefits_outweigh")],
    signals: [cleanSig(1, { write_around_engaged: true }), cleanSig(2)],
  });
  assertEquals(r.overall_risk_level, "Insufficient basis");
  assertEquals(r.rule_fired, 2);
});

Deno.test("Rule 2: ALL activities have doc incomplete → Insufficient basis", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "hedged_or_incomplete"), mkOutcome(2, "hedged_or_incomplete")],
    signals: [
      cleanSig(1, { documentation_incomplete: true }),
      cleanSig(2, { documentation_incomplete: true }),
    ],
  });
  assertEquals(r.overall_risk_level, "Insufficient basis");
});

Deno.test("Rule 2: every mandatory balance factor has no evidence → Insufficient basis", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "hedged_or_incomplete")],
    signals: [cleanSig(1, { all_mandatory_factors_no_evidence: true })],
  });
  assertEquals(r.overall_risk_level, "Insufficient basis");
});

// ── Rule 3 ────────────────────────────────────────────────────────────
Deno.test("Rule 3: hedged outcome → Moderate", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "firm_benefits_outweigh"), mkOutcome(2, "hedged_or_incomplete")],
    signals: [cleanSig(1), cleanSig(2)],
  });
  assertEquals(r.overall_risk_level, "Moderate");
});

Deno.test("Rule 3: high closeness only → Moderate", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "firm_benefits_outweigh", 0.75)],
    signals: [cleanSig(1)],
  });
  assertEquals(r.overall_risk_level, "Moderate");
});

Deno.test("Rule 3: partial doc incompleteness → Moderate", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "firm_benefits_outweigh"), mkOutcome(2, "firm_benefits_outweigh")],
    signals: [cleanSig(1, { documentation_incomplete: true }), cleanSig(2)],
  });
  assertEquals(r.overall_risk_level, "Moderate");
});

Deno.test("Rule 3: all-firm with open safeguard gaps → Moderate", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "firm_benefits_outweigh")],
    signals: [cleanSig(1, { safeguard_gaps_open: true })],
  });
  assertEquals(r.overall_risk_level, "Moderate");
});

// ── Rule 4 ────────────────────────────────────────────────────────────
Deno.test("Rule 4: all-firm clean record → Low", () => {
  const r = mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "firm_benefits_outweigh"), mkOutcome(2, "firm_benefits_outweigh")],
    signals: [cleanSig(1), cleanSig(2)],
  });
  assertEquals(r.overall_risk_level, "Low");
  assertEquals(r.rule_fired, 4);
});

// ── Every enum member reachable ───────────────────────────────────────
Deno.test("every enum member reachable via a fixture", () => {
  const seen = new Set<string>();
  seen.add(mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "firm_benefits_outweigh")],
    signals: [cleanSig(1)],
  }).overall_risk_level);
  seen.add(mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "firm_benefits_outweigh")],
    signals: [cleanSig(1, { safeguard_gaps_open: true })],
  }).overall_risk_level);
  seen.add(mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "impacts_outweigh")],
    signals: [cleanSig(1, { negative_impacts: [{ severity: "Moderate" }] })],
  }).overall_risk_level);
  seen.add(mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "impacts_outweigh")],
    signals: [cleanSig(1, { negative_impacts: [{ severity: T_CRITICAL_SEVERITY_LITERAL }] })],
  }).overall_risk_level);
  seen.add(mapOverallRiskLevel({
    outcomes: [mkOutcome(1, "hedged_or_incomplete")],
    signals: [cleanSig(1, { write_around_engaged: true })],
  }).overall_risk_level);
  assertEquals(seen.size, 5);
  assert(seen.has("Low"));
  assert(seen.has("Moderate"));
  assert(seen.has("High"));
  assert(seen.has("Critical"));
  assert(seen.has("Insufficient basis"));
});

// ── Consistency asserter ──────────────────────────────────────────────
Deno.test("opening/overall consistency: all 5 members map to their opening", () => {
  assertEquals(assertOpeningRiskLevelConsistency("Insufficient basis", "T.risk.summary.opening.insufficient"), null);
  assertEquals(assertOpeningRiskLevelConsistency("Critical", "T.risk.summary.opening.any_negative"), null);
  assertEquals(assertOpeningRiskLevelConsistency("High", "T.risk.summary.opening.any_negative"), null);
  assertEquals(assertOpeningRiskLevelConsistency("Moderate", "T.risk.summary.opening.mixed_hedged"), null);
  assertEquals(assertOpeningRiskLevelConsistency("Low", "T.risk.summary.opening.all_firm"), null);
  // Negative case:
  assert(assertOpeningRiskLevelConsistency("Low", "T.risk.summary.opening.any_negative") !== null);
});

Deno.test("selectOpeningTemplateId honors resolved overall when supplied", () => {
  assertEquals(
    selectOpeningTemplateId([mkOutcome(1, "firm_benefits_outweigh")], "Insufficient basis"),
    "T.risk.summary.opening.insufficient",
  );
  assertEquals(
    selectOpeningTemplateId([mkOutcome(1, "firm_benefits_outweigh")], "Critical"),
    "T.risk.summary.opening.any_negative",
  );
});
