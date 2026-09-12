// BATCH c4d0b8a0 CYBER FOLLOW-UP (2026-09-12) — ChatGPT's dedicated Cyber
// deterministic-process review ("CPPA_Cyber_Deterministic_Process_and_Code_
// Review_for_Claude_2026-09-12.md") and Claude's independent code check of
// its eight findings agreed on two real, previously-unfixed defects; the
// other findings were confirmed already-ratified design (the
// ready_subject_to_named_remediation hierarchy) or based on a
// misread of the current code (the recommendation-narrative claim) and are
// deliberately NOT changed here.
//
// CYBER-02 — page 4's record-completion follow-up sentence
// (buildRecordSufficiency) and the Section 6 action register
// (buildRecordCompletionExtras) computed the notification-material
// record-completion ask independently, so a record whose ONLY gap was
// missing notification material could print "No record-completion
// follow-up is identified" on page 4 while Section 6 still listed an
// action.
//
// CYBER-07 — the doc 259A stale-dated-commitment priority bump
// (cyber-recommendations.ts) only ever ran on components that already had
// SOME gap; an already-"Implemented" component with sufficient evidence
// short-circuited to `no_gap` before that check ever ran, so a stale
// future-tense commitment recorded on an already-satisfied component
// produced no action at all.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRecordSufficiency } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";
import {
  buildCyberComponentRecommendations,
  resolveGapClass,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import type { CyberComponentCoverage, CyberDeliverables, EvidenceSufficiency } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/types.ts";

type Bag = Record<string, unknown>;

function baseDeliverables(over: Partial<CyberDeliverables> = {}): CyberDeliverables {
  return {
    component_coverage: [],
    evidence_sufficiency: [],
    independence_determination: {
      findings: [],
      engagement_status: "engaged",
      auditor_type: "external",
      verdict: "satisfied",
      status: "analysed",
      unsatisfied_conditions: [],
      summary: "",
    },
    ...over,
  } as CyberDeliverables;
}

// ── CYBER-02: page 4 vs. Section 6 notification-material follow-up ────────

Deno.test("CYBER-02 — page 4 names the notification-material ask when it is the only record-completion gap (matches buildRecordCompletionExtras)", () => {
  const intake: Bag = {
    profile: { incidents_12mo: "1", incident_notifications: "Yes — an agency notification was sent" },
    controls: [],
  };
  const rs = buildRecordSufficiency(intake, baseDeliverables());
  assertStringIncludes(rs.follow_up, "notification material for the audit report");
  assertStringIncludes(rs.follow_up, "Section 6");
});

Deno.test("CYBER-02 — page 4 asks whether notification was required when the record leaves it unanswered", () => {
  const intake: Bag = {
    profile: { incidents_12mo: "1" },
    controls: [],
  };
  const rs = buildRecordSufficiency(intake, baseDeliverables());
  assertStringIncludes(rs.follow_up, "record whether the reported incident required notification");
});

Deno.test("CYBER-02 — no incidents reported: the notification follow-up never fires", () => {
  const intake: Bag = {
    profile: { incidents_12mo: "None" },
    controls: [],
  };
  const rs = buildRecordSufficiency(intake, baseDeliverables());
  assert(!/notification/i.test(rs.follow_up));
});

Deno.test("CYBER-02 — an incident with 'no notification was required' recorded: the notification follow-up never fires", () => {
  const intake: Bag = {
    profile: { incidents_12mo: "1", incident_notifications: "No notification was required" },
    controls: [],
  };
  const rs = buildRecordSufficiency(intake, baseDeliverables());
  assert(!/notification/i.test(rs.follow_up));
});

// ── CYBER-07: stale commitment on an already-satisfied component ──────────

function coverageRow(over: Partial<CyberComponentCoverage>): CyberComponentCoverage {
  return {
    key: "component_x", label: "X", citation: "§ 7123(c)(1)", standard: "", record_fact: "", application: "",
    verdict: "satisfied", status: "analysed", component_number: 1, slug: "cX", maturity: "Implemented across organization",
    in_scope: true, remediation: "",
    ...over,
  };
}
function evidenceRow(over: Partial<EvidenceSufficiency>): EvidenceSufficiency {
  return {
    key: "evidence_x", label: "X", citation: "", standard: "", record_fact: "", application: "",
    verdict: "satisfied", status: "analysed", component_number: 1, slug: "cX",
    evidence_offered: [], testable_artifacts: [], assessable_on_record: true, sufficiency: "sufficient",
    ...over,
  };
}

Deno.test("CYBER-07 — resolveGapClass itself is unchanged: satisfied + sufficient evidence is still 'no_gap' even with a stale date in record_fact (the reclassification lives in the orchestrator, not the pure resolver)", () => {
  const c = coverageRow({ record_fact: "MFA migration for legacy systems will be completed by Q1 2020." });
  const e = evidenceRow({});
  assertEquals(resolveGapClass(c, e), "no_gap");
});

Deno.test("CYBER-07 — an already-'Implemented' component whose own record_fact names a completion date already past the report date now produces an Immediate stale_commitment action", () => {
  const coverage = [coverageRow({ record_fact: "MFA migration for legacy systems will be completed by Q1 2020." })];
  const evidence = [evidenceRow({})];
  const recs = buildCyberComponentRecommendations(coverage, evidence);
  assertEquals(recs.length, 1);
  assertEquals(recs[0].key.gapClass, "stale_commitment");
  assertEquals(recs[0].key.variant, "fact_anchored");
  assertEquals(recs[0].priority, "Immediate");
  assertStringIncludes(recs[0].slot.template, "already passed");
});

Deno.test("CYBER-07 — an already-'Implemented' component with no stale date is still excluded entirely (no regression on the ordinary no_gap path)", () => {
  const coverage = [coverageRow({ record_fact: "MFA is enforced organization-wide for all administrative accounts." })];
  const evidence = [evidenceRow({})];
  const recs = buildCyberComponentRecommendations(coverage, evidence);
  assertEquals(recs.length, 0);
});

Deno.test("CYBER-07 — a genuinely partial component with its OWN stale commitment still resolves through the pre-existing doc 259A path (unaffected by the no_gap reclassification)", () => {
  const coverage = [coverageRow({
    verdict: "partially_satisfied",
    record_fact: "A software and hardware asset inventory exists for core infrastructure, but coverage of newly acquired systems will be completed by Q1 2020.",
  })];
  const evidence = [evidenceRow({ sufficiency: "sufficient" })];
  const recs = buildCyberComponentRecommendations(coverage, evidence);
  assertEquals(recs.length, 1);
  assertEquals(recs[0].key.gapClass, "partially_implemented");
  assertEquals(recs[0].priority, "Immediate");
});

Deno.test("CYBER-07 — a genuinely partial component with NO stale commitment keeps its ordinary (non-Immediate) tier", () => {
  const coverage = [coverageRow({
    verdict: "partially_satisfied",
    record_fact: "A software and hardware asset inventory exists for core infrastructure, but coverage of the Q1 2020 acquisition remains incomplete.",
  })];
  const evidence = [evidenceRow({ sufficiency: "sufficient" })];
  const recs = buildCyberComponentRecommendations(coverage, evidence);
  assertEquals(recs.length, 1);
  assertEquals(recs[0].key.gapClass, "partially_implemented");
  assertEquals(recs[0].priority, "Within 6 months");
});
