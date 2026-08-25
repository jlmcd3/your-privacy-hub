// C1.1b (doc 67 §2.1, 2026-08-25) — W17/cyber-prose-gold/cyber-csc GATED
// (not deleted; doc 24 §2 item 3 reserves outright quarantine for
// refinement only, these three flip detect-only per the original spec).
// Two things pinned here:
//   1. The REAL bug found while verifying the gate: readiness_determination
//      .reasoning/.headline used to render a dangling "The following are
//      not assessable on this record: ." fragment whenever
//      independenceUnknown was the SOLE trigger for record_insufficient
//      (every component assessable, auditor engagement simply undescribed).
//      Fixed at the source in build.ts; pinned here so it can't regress.
//   2. The empirical claim the gate rests on: against the deterministic
//      path's own output (component_coverage/evidence_sufficiency/
//      readiness_determination/independence_determination), all three
//      passes find nothing substantive to fix — confirmed directly, not
//      assumed.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildComponentCoverage,
  buildReadinessDetermination,
  buildEvidenceSufficiency,
  buildIndependenceDetermination,
  buildProgramObligationFindings,
  readCyberFacts,
  attachCyberDeliverables,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { applyCyberBoilerplateGuard } from "../../../supabase/functions/run-cppa-cybersecurity/_w17_cyber_boiler.ts";
import { applyCyberProseGold } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-prose-gold.ts";
import { attachCyberCsc } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-csc.ts";
import { CPPA_CYBER_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-cyber.ts";

// ── Bug fix pin: independenceUnknown as the SOLE record_insufficient trigger ──

Deno.test("readiness_determination — independenceUnknown alone (every component assessable) never emits a dangling 'following are...: .' fragment", () => {
  // Meridian's own fixture: every one of the 18 canonical slugs gets a
  // sensible maturity/notes/evidence default (build() in the golden file),
  // so every component is assessable; profile carries no
  // auditor_engagement_status at all.
  const meridian = CPPA_CYBER_GOLDEN.find((g) => g.id === "cyber-nist-mid-tuning")!;
  const facts = readCyberFacts(meridian.intake as Record<string, unknown>);
  const coverage = buildComponentCoverage(facts);
  const evidence = buildEvidenceSufficiency(facts);
  const independence = buildIndependenceDetermination(facts);
  const obligations = buildProgramObligationFindings(facts);
  const rd = buildReadinessDetermination(coverage, evidence, independence, obligations);

  assertEquals(rd.conclusion, "record_insufficient");
  assertEquals(rd.unassessable_components.length, 0, "this fixture is chosen precisely because every component IS assessable");
  assertEquals(independence.status, "record_insufficient", "independenceUnknown must be true for this to be the right test case");

  for (const text of [rd.headline, rd.reasoning]) {
    assert(!/:\s*\.\s*$/.test(text.trim()) && !/:\s*\.\s/.test(text), `dangling empty-list fragment survived: "${text}"`);
    assert(!text.includes("0 § 7123(c) component"), `nonsensical zero-count clause survived: "${text}"`);
    assert(text.includes("auditor engagement is not described"), `the actual (independence) reason got dropped: "${text}"`);
  }
});

Deno.test("readiness_determination — unassessable-components-only case is untouched (byte-identical wording to the pre-fix template)", () => {
  // Reuses the perfect-record fixture's own fully-described engagement
  // profile (external auditor, independence confirmed in writing, prior
  // audit scope stated) so § 7122 independence resolves cleanly — every
  // CYBER_7122_CONDITIONS row needs its own backing fact, not just the
  // engagement-status enum alone — while deliberately supplying NO
  // controls[] at all, isolating the unassessable-components-only path.
  const perfect = CPPA_CYBER_GOLDEN.find((g) => g.id === "cyber-perfect-record")!;
  const facts = readCyberFacts({
    profile: (perfect.intake as any).profile,
    controls: [],
  });
  const coverage = buildComponentCoverage(facts);
  const evidence = buildEvidenceSufficiency(facts);
  const independence = buildIndependenceDetermination(facts);
  const obligations = buildProgramObligationFindings(facts);
  const rd = buildReadinessDetermination(coverage, evidence, independence, obligations);

  assertEquals(rd.conclusion, "record_insufficient");
  assert(rd.unassessable_components.length > 0);
  assertEquals(independence.status === "record_insufficient", false, "independence must resolve cleanly for this to isolate the unassessable-only path");
  assert(rd.reasoning.includes("The following are not assessable on this record:"));
  assert(!rd.reasoning.includes("auditor engagement is not described"));
});

Deno.test("readiness_determination — both triggers together names both reasons", () => {
  const facts = readCyberFacts({ profile: {}, controls: [] });
  const coverage = buildComponentCoverage(facts);
  const evidence = buildEvidenceSufficiency(facts);
  const independence = buildIndependenceDetermination(facts);
  const obligations = buildProgramObligationFindings(facts);
  const rd = buildReadinessDetermination(coverage, evidence, independence, obligations);

  assertEquals(rd.conclusion, "record_insufficient");
  assert(rd.unassessable_components.length > 0);
  assertEquals(independence.status, "record_insufficient");
  assert(rd.reasoning.includes("The following are not assessable on this record:"));
  assert(rd.reasoning.includes("auditor engagement is not described"));
  assert(rd.headline.includes(", and the auditor engagement is not described"));
});

// ── The empirical no-op claim the C1.1b gate rests on ────────────────

function deterministicReport(intake: Record<string, unknown>): Record<string, unknown> {
  const report: Record<string, unknown> = {};
  attachCyberDeliverables(report, intake);
  return report;
}

for (const g of CPPA_CYBER_GOLDEN) {
  Deno.test(`C1.1b no-op claim — W17/prose-gold/csc find nothing to fix on ${g.id}'s deterministic output`, () => {
    const report = deterministicReport(g.intake as Record<string, unknown>);

    const boiler = applyCyberBoilerplateGuard(report as any);
    assertEquals(boiler.boiler_duplicates_rewritten, 0, "W17 rewrote something — the deterministic path is no longer a structural no-op for it");

    const gold = applyCyberProseGold(report as any);
    assertEquals(gold.prose_sweep.arithmetic_removed, 0);
    assertEquals(gold.prose_sweep.citations_repaired, 0);
    assertEquals(gold.hollow_fields.dangling_clauses_removed, 0, "a dangling-clause fragment survived — check readiness_determination's reasoning/headline template");
    assertEquals(gold.errors.length, 0);

    const csc = attachCyberCsc(report, { intake: g.intake as Record<string, unknown> });
    assertEquals(csc.violations.length, 0, "cyber-csc found a false-absence/consistency violation on deterministic output — the C1.1b gate's structural-unreachability claim no longer holds");
    assertEquals(csc.repairs, 0);
    assertEquals(csc.crashed, false);
  });
}
