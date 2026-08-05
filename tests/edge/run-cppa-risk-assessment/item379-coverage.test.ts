// ITEM 379 — coverage matrix, material-omission anchoring, necessity canary,
// and the release ledger, on the ROUTED cppa-risk LTP path (stubbed models).
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import {
  runCoverageMatrix,
  coverageAnchorTokens,
  coverageListForCritic,
} from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { computeReleaseLedger } from "../../../supabase/functions/_shared/ltp/release-ledger.ts";

const PERFECT = CPPA_RISK_PERFECT[0].intake as Record<string, unknown>;

const NO_FINDINGS = {
  critic: () => Promise.resolve(JSON.stringify({ findings: [], structural_findings: [] })),
  verifier: () => Promise.resolve(JSON.stringify({ verdicts: [] })),
};

function internalOf(report: Record<string, unknown>): Record<string, unknown> {
  const meta = (report._meta ?? {}) as Record<string, unknown>;
  return (meta.internal ?? {}) as Record<string, unknown>;
}

async function build(
  intake: Record<string, unknown>,
  deps = NO_FINDINGS,
  runId = "item379",
): Promise<Record<string, unknown>> {
  const gen = await generateCppaRiskReport(intake, {
    buildStamp: "test@item379",
    runId,
    mode: "enforce" as const,
    pass1: "deterministic" as const,
    callerName: "test",
    pass2rEnabled: false,
    refinementDeps: deps,
  });
  return gen.report as Record<string, unknown>;
}

Deno.test("coverage matrix: risk-perfect-complete produces ZERO orphans", async () => {
  const report = await build(PERFECT);
  const cov = internalOf(report).risk_coverage as Record<string, any>;
  assert(cov, "risk_coverage telemetry must be attached");
  assertEquals(cov.crashed, false);
  assert(cov.counts.links_checked > 0, "the matrix must actually check links");
  if (cov.counts.orphans !== 0) {
    console.error("PERFECT-FIXTURE ORPHANS:", JSON.stringify(cov.orphans, null, 2));
  }
  assertEquals(cov.counts.orphans, 0);
});

Deno.test("coverage matrix flags, and never repairs, on a degraded record", async () => {
  const degraded = { ...PERFECT, a5_harm_pathways: [], a6_safeguards: [], a4_benefit_business: "" };
  const report = await build(degraded, NO_FINDINGS, "item379-degraded");
  const cov = internalOf(report).risk_coverage as Record<string, any>;
  assert(cov, "coverage telemetry present");
  // v1 is flag-only: no repair counter, and information_needed is untouched
  // by the matrix itself.
  assertEquals(typeof cov.orphans, "object");
  assert(!("repairs" in cov), "coverage v1 must not repair");
});

Deno.test("material-omission findings must cite a coverage entry", async () => {
  const unanchored = {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [{
          path: "$.executive_summary",
          quote: "x",
          class: "material-omission",
          anchor: "a fact I invented",
          replacement: "y",
          confidence: "high",
        }],
        structural_findings: [],
      })),
    verifier: () => {
      throw new Error("verifier must never see an unanchored omission finding");
    },
  };
  const report = await build(PERFECT, unanchored, "item379-omission");
  const tel = internalOf(report).risk_refinement as Record<string, any>;
  assertEquals(tel.omission_findings, 1);
  assertEquals(tel.omission_unanchored, 1);
  assertEquals(tel.spliced, 0);
  // full accounting still balances
  const sum = tel.spliced + tel.verifier_rejected + tel.protected_rejected.count +
    tel.quote_drift + tel.cap_overflow + tel.omission_unanchored;
  assertEquals(sum, tel.critic_findings);
});

Deno.test("necessity canary: an equal-quality replacement is rejected with reason necessity", async () => {
  const deps = {
    critic: () =>
      Promise.resolve(JSON.stringify({
        findings: [{
          path: "$.executive_summary",
          quote: "the",
          class: "generic-boilerplate",
          anchor: "record",
          replacement: "the",
          confidence: "medium",
        }],
        structural_findings: [],
      })),
    verifier: () =>
      Promise.resolve(JSON.stringify({
        verdicts: [{
          path: "$.executive_summary",
          verdict: "reject",
          reason: "The original is equally good; necessity is not met.",
        }],
      })),
  };
  const report = await build(PERFECT, deps, "item379-necessity");
  const tel = internalOf(report).risk_refinement as Record<string, any>;
  assertEquals(tel.necessity_rejected, 1);
  assertEquals(tel.verifier_reject_reasons.necessity, 1);
  assertEquals(tel.spliced, 0);
});

Deno.test("release ledger is computed and alerts on a seeded-defect document", async () => {
  const report = await build(PERFECT);
  const internal = internalOf(report);
  const ledger = internal.release_ledger as Record<string, any>;
  assert(ledger, "release_ledger must be attached");
  assertEquals(typeof ledger.coverage_orphans, "number");

  const seeded = computeReleaseLedger(
    { _meta: { internal: {} }, lint_warnings: ["citation not verified"] } as never,
    {
      refinement: { structural_findings: 2 },
      csc: { violations: [{ repaired: false }, { repaired: true }] },
      coverage: { orphans: [{ type: "t", path: "p", detail: "d" }], unused_intake_facts: ["a4_benefit_public"] },
    },
  );
  assertEquals(seeded.blocking_findings_open, 2);
  assertEquals(seeded.csc_flags_unrepaired, 1);
  assertEquals(seeded.coverage_orphans, 1);
  assertEquals(seeded.unused_material_facts, 1);
  assertEquals(seeded.citation_failures, 1);
  assertEquals(seeded.clean, false);
});

Deno.test("coverage list and anchors are derived from the same telemetry", async () => {
  const report = await build(PERFECT);
  const cov = runCoverageMatrix("cppa-risk", report, PERFECT);
  const list = coverageListForCritic(cov);
  assert(list.startsWith("COVERAGE"), "the critic list is labelled COVERAGE");
  assertEquals(
    coverageAnchorTokens(cov).length,
    cov.orphans.length * 2 + cov.unused_intake_facts.length,
  );
});
