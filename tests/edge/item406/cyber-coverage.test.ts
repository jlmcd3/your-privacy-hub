// ITEM 406 LEG C — CYBER COVERAGE MATRIX.
//
// Identities:
//   item406 coverage zero orphans on the perfect record live parity
//   item406 coverage honest orphan on an unanchored action
//   item406 coverage a supplied fact without its section is an orphan
//   item406 coverage silence in the record is never an orphan
//   item406 coverage an ask against a supplied fact is flagged
//   item406 coverage telemetry attaches at cyber_coverage

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachCoverage,
  runCoverageMatrix,
} from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { CYBER_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-cyber.ts";

const PERFECT = CYBER_PERFECT[0].intake as Record<string, any>;

/**
 * LIVE-PARITY REPORT — the shape the cyber pipeline persists at the leg-B call
 * site: eighteen component rows whose findings restate the recorded notes, the
 * evidence and component-coverage rows, the typed tally, and the readiness /
 * independence determinations. The intake passed to the matrix is the FULL
 * persisted record (`CYBER_PERFECT[0].intake`), never a projection.
 */
function liveParityReport(): Record<string, unknown> {
  const controls = PERFECT.controls.map((c: any) => ({
    key: c.key,
    label: c.label,
    maturity: c.maturity,
    finding: `${c.label}. ${c.notes}`,
    evidence: c.evidence.join("; "),
  }));
  return {
    executive_summary:
      `${PERFECT.profile.entity_name} operates in ${PERFECT.profile.industry}. ` +
      `${PERFECT.profile.audit_scope_rationale} ${PERFECT.profile.prior_audit_scope}`,
    readiness_determination: {
      rating: "audit-ready on this record",
      rationale:
        `The programme is built on ${PERFECT.profile.framework} and the last audit was ${PERFECT.profile.last_audit}. ` +
        PERFECT.profile.audit_scope_rationale,
    },
    independence_determination: {
      status: PERFECT.profile.auditor_engagement_status,
      rationale:
        `The business recorded its auditor engagement as: ${PERFECT.profile.auditor_engagement_status}. ${PERFECT.profile.prior_audit_scope}`,
    },
    program_obligation_findings: controls.map((c: any) => ({ key: c.key, finding: c.finding })),
    controls,
    component_coverage: controls.map((c: any) => ({ key: c.key, coverage: c.finding })),
    evidence_sufficiency: controls.map((c: any) => ({
      key: c.key,
      assessment: `The record names the following artefacts for ${c.label}: ${c.evidence}.`,
    })),
    control_status_counts: { implemented: 18, partial: 0, absent: 0, denominator: 18 },
    incidents_note: `The record reports ${PERFECT.profile.incidents_12mo} reportable incident in the last twelve months.`,
  };
}

Deno.test("item406 coverage zero orphans on the perfect record live parity", () => {
  const t = runCoverageMatrix("cppa-cyber", liveParityReport(), PERFECT);
  assertEquals(t.crashed, false);
  assertEquals(
    t.orphans,
    [],
    `orphans on the perfect record:\n${t.orphans.map((o) => `${o.path}: ${o.detail}`).join("\n")}`,
  );
  assertEquals(
    t.unused_intake_facts,
    [],
    `unused facts: ${t.unused_intake_facts.join(", ")}`,
  );
  assert(t.counts.links_checked > 18, String(t.counts.links_checked));
});

Deno.test("item406 coverage honest orphan on an unanchored action", () => {
  const report = liveParityReport();
  (report as any).next_steps = [
    {
      action: "Commission an independent segmentation test before the audit window opens.",
      anchor_keys: ["profile.revenue_band"],
    },
  ];
  const t = runCoverageMatrix("cppa-cyber", report, PERFECT);
  const orphan = t.orphans.find((o) => o.type === "action_without_record_anchor");
  assert(orphan, "expected an honest orphan on the unanchored action");
  assert(orphan!.detail.includes("profile.revenue_band"), orphan!.detail);
});

Deno.test("item406 coverage a supplied fact without its section is an orphan", () => {
  const report = liveParityReport();
  delete (report as any).control_status_counts;
  const t = runCoverageMatrix("cppa-cyber", report, PERFECT);
  const orphan = t.orphans.find((o) => o.path === "control_status_counts");
  assert(orphan, "expected the tally section to be reported as an orphan");
  assertEquals(orphan!.type, "supplied_fact_without_section");
});

Deno.test("item406 coverage silence in the record is never an orphan", () => {
  // A record that supplies nothing can never produce an orphan, however empty
  // the report is.
  const t = runCoverageMatrix("cppa-cyber", {}, { profile: {}, controls: [] });
  assertEquals(t.orphans, []);
  assertEquals(t.counts.links_checked, 0);
});

Deno.test("item406 coverage an ask against a supplied fact is flagged", () => {
  const report = liveParityReport();
  (report as any).information_needed = [
    { ask: "Please supply controls[c1_auth].notes for the authentication component." },
  ];
  const t = runCoverageMatrix("cppa-cyber", report, PERFECT);
  const orphan = t.orphans.find((o) => o.type === "ask_against_supplied_fact");
  assert(orphan, "expected the ask against a supplied fact to be flagged");
});

Deno.test("item406 coverage telemetry attaches at cyber_coverage", () => {
  const report = liveParityReport();
  const t = attachCoverage(report, "cyber_coverage", runCoverageMatrix("cppa-cyber", report, PERFECT));
  const internal = (report._meta as any).internal;
  assertEquals(internal.cyber_coverage.version, t.version);
});
