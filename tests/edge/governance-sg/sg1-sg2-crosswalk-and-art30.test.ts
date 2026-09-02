// S-G1 / S-G2 (doc 80, 2026-08-27) — the ICO Accountability Framework
// crosswalk appendix and the rendered Art. 30 records-and-demonstrability
// block. Every cell/sentence is a verdict READ from an existing typed
// surface — nothing is re-judged — and a category the assessment does not
// separately assess says so honestly.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleGovernanceSkeletonDocument } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";

type Bag = Record<string, unknown>;

// DOC 139 (2026-09-02) — FIX 1 gates the entire ICO crosswalk appendix (a
// UK-regulator-specific framework) off records with no UK GDPR exposure.
// This fixture's tests are specifically about crosswalk CONTENT, so the UK
// is added to jurisdictions here to keep the appendix rendering; the gating
// itself is covered separately in doc139-gov-fixes.test.ts.
const INTAKE: Bag = {
  organization_name: "Acme GmbH",
  sector: "SaaS",
  org_size: "51-250",
  jurisdictions: ["EU (GDPR)", "United Kingdom"],
  data_categories: ["Contact details"],
};

function baseReport(): Bag {
  return {
    readiness_determination: { rating: "partly_evidenced", reasoning: "Some duties are evidenced." },
    accountability_determination: { verdict: "partially_satisfied", reasoning: "Partly evidenced." },
    dpo_determination: {
      verdict: "satisfied",
      designation_trigger: { record_fact: "The company has answered that a DPO is designated.", application: "The designation trigger is answered." },
      position_and_independence: {},
      task_coverage: {},
    },
    risk_calibration_finding: { verdict: "satisfied" },
    transfer_analysis: { regime: "eu" },
    domain_findings: [
      { domain_name: "Internal Policy", severity: "medium", current_state: "A policy exists." },
      { domain_name: "Training", severity: "high", current_state: "No training recorded." },
      { domain_name: "Subject Rights", severity: "low", current_state: "A rights inbox exists." },
      { domain_name: "Privacy Notice", severity: "low", current_state: "A notice is published." },
      { domain_name: "Vendor Terms", severity: "medium", current_state: "DPAs partially verified." },
      { domain_name: "Incident Response", severity: "medium", current_state: "A plan exists." },
    ],
    art30_element_findings: [
      { element: "a", verdict: "satisfied" },
      { element: "b", verdict: "satisfied" },
      { element: "c", verdict: "satisfied" },
      { element: "d", verdict: "not_satisfied" },
      { element: "e", verdict: "record_insufficient" },
      { element: "f", verdict: "satisfied" },
      { element: "g", verdict: "satisfied" },
    ],
    art30_exemption_determination: {
      exemption_available: false,
      defeating_conditions: [
        { condition: "special_category", label: "special categories of data are processed", met: true, basis: "the recorded data categories" },
      ],
    },
    demonstrability_findings: [
      { duty: "Art. 30 record", evidencing_artifact: "the register", artifact_present: "yes" },
      { duty: "Art. 28 contracts", evidencing_artifact: "signed DPAs", artifact_present: "partial" },
      { duty: "Art. 37 designation", evidencing_artifact: "the designation record", artifact_present: "no" },
    ],
    executive_summary: "The programme is partly evidenced.",
  };
}

function text(report: Bag): string {
  const sk = assembleGovernanceSkeletonDocument(report, INTAKE);
  return JSON.stringify(sk);
}

Deno.test("S-G2 — the Art. 30 element walk, 30(5) position, and demonstrability roll-up all render", () => {
  const t = text(baseReport());
  assertStringIncludes(t, "evidences 5 of 7");
  // DOC-81 S-3 — attributed voice: "the company's answers do not support".
  assertStringIncludes(t, "the information provided does not support (d)");
  assertStringIncludes(t, "(e) remains open on the information provided");
  assertStringIncludes(t, "derogation is not available: special categories of data are processed");
  assertStringIncludes(t, "supporting evidence is identified for 1 and partially present for 1");
});

Deno.test("S-G2 — an available derogation renders the good-practice sentence", () => {
  const r = baseReport();
  (r.art30_exemption_determination as Bag).exemption_available = true;
  (r.art30_exemption_determination as Bag).defeating_conditions = [];
  assertStringIncludes(text(r), "derogation is available; maintaining the record remains good practice");
});

Deno.test("S-G1 — the crosswalk renders all ten ICO categories with verdict reads", () => {
  const t = text(baseReport());
  for (const cat of [
    "Leadership and oversight",
    "Policies and procedures",
    "Training and awareness",
    "Individuals' rights",
    "Transparency",
    "Records of processing and lawful basis",
    "Contracts and data sharing",
    "Risks and DPIAs",
    "Records management and security",
    "Breach response and monitoring",
  ]) assertStringIncludes(t, cat);
  // RE-PIN BATCH 20a (doc 113 S5.1/S5.2): the crosswalk lines and remediation-item fragments moved into table cells (cells initial-capped; label prefixes retired).
  // DOC 139 (2026-09-02) — FIX 2: a "satisfied" DPO roll-up used to render as
  // a blanket "the DPO determination is evidenced on the information
  // provided" here, more conclusive than the DOC 137-corrected body, which
  // reads designation as evidenced but the Article 38 operating safeguards
  // and the untested Article 39 tasks as not independently assessed.
  assertStringIncludes(
    t,
    "Formal DPO designation evidenced; the Article 38 operating safeguards and the untested Article 39 tasks are not independently assessed",
  );
  assertStringIncludes(t, "5 of 7 Article 30(1) elements evidenced");
  assertStringIncludes(t, "decides nothing new");
});

Deno.test("S-G1 — a category with no mapped surface says so honestly, never guesses", () => {
  const r = baseReport();
  r.domain_findings = [];
  r.dpo_determination = {};
  const t = text(r);
  assertStringIncludes(t, "Not separately assessed by this report");
  assert(!t.includes("assessed with severity"), "no severity may be invented when no domain finding exists");
});
