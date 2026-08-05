// ITEM 379 — DPIA side of the bidirectional coverage matrix and the release
// ledger. Deterministic: the matrix is a pure function of (report, intake),
// so these tests build documents directly rather than calling models.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";
import { runCoverageMatrix } from "../../../supabase/functions/_shared/ltp/coverage-matrix.ts";
import { computeReleaseLedger } from "../../../supabase/functions/_shared/ltp/release-ledger.ts";

const INTAKE = DPIA_PERFECT[0].intake as Record<string, unknown>;

/** A document that faithfully reflects the perfect record. */
function faithfulDoc(): Record<string, unknown> {
  const narrative = Object.entries(INTAKE)
    .filter(([, v]) => typeof v === "string")
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return {
    executive_summary: narrative,
    engagement_map: {
      entries: [
        { rule_id: "gdpr-art-35", name: "GDPR Article 35", status: "engaged", section_ref: "$.section_4_risk_management" },
        { rule_id: "gdpr-art-36", name: "GDPR Article 36", status: "not_engaged" },
      ],
    },
    risk_register: [
      { risk_id: "R1", risk_label: "Unauthorised disclosure of occupational-health certificates", source: "triage mailbox", measures: ["role-scoped mailbox permissions"] },
    ],
    section_4_risk_management: {
      inherent_risk_assessment: [{ risk: "Unauthorised disclosure of occupational-health certificates" }],
      additional_mitigating_measures: [
        { measure: "Quarterly permission recertification", mitigated_risks: "Unauthorised disclosure of occupational-health certificates" },
      ],
      residual_risk_assessment: [{ risk: "Unauthorised disclosure", residual: "low" }],
    },
    information_needed: [],
    _meta: { internal: {} },
  };
}

Deno.test("coverage matrix: dpia-perfect-eu-complete produces ZERO orphans", () => {
  const cov = runCoverageMatrix("dpia", faithfulDoc(), INTAKE);
  assertEquals(cov.crashed, false);
  assert(cov.counts.links_checked > 0, "the matrix must actually check links");
  if (cov.counts.orphans !== 0) {
    console.error("PERFECT-FIXTURE ORPHANS:", JSON.stringify(cov.orphans, null, 2));
  }
  assertEquals(cov.counts.orphans, 0);
});

Deno.test("coverage matrix flags both link directions on a degraded document", () => {
  const doc = faithfulDoc();
  // an engaged authority with no analysis surface
  (doc.engagement_map as any).entries.push({
    rule_id: "gdpr-art-22",
    name: "GDPR Article 22",
    status: "engaged",
    section_ref: "$.section_9_admt",
  });
  // a risk with no measure
  (doc.risk_register as any[]).push({ risk_id: "R2", risk_label: "Retention beyond the occupational purpose", measures: [] });
  // a measure that mitigates nothing enumerated
  (doc.section_4_risk_management as any).additional_mitigating_measures.push({
    measure: "Vendor penetration testing",
    mitigated_risks: "",
  });

  const cov = runCoverageMatrix("dpia", doc, INTAKE);
  const types = cov.orphans.map((o) => o.type).sort();
  assert(types.includes("engaged_authority_without_analysis"), JSON.stringify(types));
  assert(types.includes("risk_without_measure"), JSON.stringify(types));
  assert(types.includes("measure_without_risk"), JSON.stringify(types));
  // flag-only: the document is untouched
  assertEquals((doc.risk_register as any[])[1].measures.length, 0);
});

Deno.test("release ledger rolls up DPIA coverage orphans and alerts", () => {
  const doc = faithfulDoc();
  (doc.risk_register as any[]).push({ risk_id: "R3", risk_label: "Unbounded mailbox retention", measures: [] });
  const cov = runCoverageMatrix("dpia", doc, INTAKE);
  const ledger = computeReleaseLedger(doc as never, {
    refinement: { structural_findings: 0 },
    csc: { violations: [] },
    coverage: cov,
  });
  assertEquals(ledger.coverage_orphans, cov.orphans.length);
  assertEquals(ledger.clean, false);
});
