// PROMPT 9 (2026-08-12) — config-gated retirement of u2/u3/u4.
//
// The flag itself lives in run-dpia-framework/index.ts, which boots a server on
// import; these tests therefore exercise the OBSERVABLE contract: the assembled
// skeleton document is byte-identical when the retired unit keys are replaced
// by the typed stub, the defensive walkers (csc, emit-gate) do not throw over
// the stubs, the enforcement corpus survives, and the deterministic
// enforcement-annotation builder replaces u4's model-selected annotations[].
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachDpiaDeliverables,
  attachEnforcementAnnotations,
  buildEnforcementAnnotations,
  buildRiskRegister,
} from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../ltp/dpia-skeleton-assemble.ts";
import { runDpiaCsc } from "../ltp/dpia-csc.ts";
import { runEmitGate } from "../emit-gate.ts";

const RETIRED_NOTE =
  "Retired under DPIA_UNITS_MINIMAL: this section is composed from the typed deterministic surfaces (processing_inventory, section2_coverage, necessity_findings, proportionality, risk_register, legal_basis, decision) and the skeleton document, which have no remaining reader for raw unit output.";

const RETIRED_KEYS = [
  "section_2_analysis",
  "section_3_necessity_proportionality",
  "section_4_risk_management",
] as const;

function intake(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    purpose: "To triage patients arriving at urgent care.",
    description: "A scoring model applied at intake.",
    data_categories: ["Contact details", "Health or medical data"],
    data_subjects: "Patients",
    volume_frequency: "About 4,000 patients per month, continuously.",
    jurisdictions: ["EU (GDPR)"],
    legal_basis_proposed: "Legitimate interests (Art. 6(1)(f))",
    necessity_proportionality: "The scoring is limited to triage.",
    retention_period: "24 months",
    controller_contact: "Clinical Operations, privacy@northwind.example",
    dpo_info: "Dr A. Okafor, dpo@northwind.example",
    article_9_condition: "Health or social care (Art. 9(2)(h))",
    third_party_processors: ["Acme Cloud"],
    processor_obligations: "Processing only on documented instructions.",
    estimated_launch_date: "2026-09-01",
    security_measures: ["Encryption at rest", "Access controls"],
    secondary_uses: "None. The data is not used beyond triage.",
    ...over,
  };
}

/** A report as the stitch stage produces it, with real (flag-off) unit output. */
function reportWithUnits(): Record<string, unknown> {
  return {
    dpia_metadata: { organization: "Northwind Clinics Ltd" },
    section_0_overview: { summary: "Overview from u1." },
    section_1_description: { summary: "Description from u1." },
    section_2_analysis: { lawfulness: "MODEL PROSE FROM U2." },
    section_3_necessity_proportionality: "MODEL PROSE FROM U3.",
    section_4_risk_management: {
      residual_risks: "MODEL PROSE FROM U4.",
      annotations: [{ enforcement_action_id: "model-picked", relevance: "freeform" }],
    },
    section_5_interested_parties: { consultation: "From u5." },
    section_6_conclusion: { decision: "From u5." },
    framework_disclaimer: "Disclaimer.",
  };
}

/** The same report under the flag: retired keys carry the typed stub. */
function reportWithStubs(): Record<string, unknown> {
  const r = reportWithUnits();
  for (const k of RETIRED_KEYS) r[k] = { retired: true, note: RETIRED_NOTE };
  return r;
}

function assembled(report: Record<string, unknown>): string {
  const i = intake();
  attachDpiaDeliverables(report, i);
  return JSON.stringify(assembleDpiaSkeletonDocument(report, i).document);
}

Deno.test("flag-on: the assembled skeleton document is byte-identical to flag-off", () => {
  assertEquals(assembled(reportWithStubs()), assembled(reportWithUnits()));
});

Deno.test("flag-on: no retired-unit prose reaches the assembled document", () => {
  const doc = assembled(reportWithStubs());
  for (const marker of ["MODEL PROSE FROM U2", "MODEL PROSE FROM U3", "MODEL PROSE FROM U4"]) {
    assert(!doc.includes(marker), `retired prose leaked: ${marker}`);
  }
  assert(!doc.includes("Retired under DPIA_UNITS_MINIMAL"), "the stub note leaked into the document");
});

Deno.test("flag-on: csc walks the stubs without throwing", () => {
  const report = reportWithStubs();
  attachDpiaDeliverables(report, intake());
  const res = runDpiaCsc(report as never, intake() as never);
  assert(res && typeof res === "object");
});

Deno.test("flag-on: the emit gate walks the stubs without throwing", () => {
  const report = reportWithStubs();
  attachDpiaDeliverables(report, intake());
  const out = runEmitGate(report, { tool: "dpia_framework" });
  assert(out && typeof out === "object");
});

Deno.test("flag-on: the enforcement corpus is untouched by unit retirement", () => {
  const report = reportWithStubs();
  report.enforcement_precedents = [
    {
      id: "ea-1",
      regulator: "CNIL",
      subject: "Clinic X",
      key_compliance_failure: "a failure to secure patient records against unauthorised access",
      provisions_normalized: ["gdpr:32"],
      precedent_significance: 5,
    },
  ];
  report.enforcement_meta = { attempted: true, rows: 1 };
  attachDpiaDeliverables(report, intake());
  assembleDpiaSkeletonDocument(report, intake());
  assert(Array.isArray(report.enforcement_precedents));
  assertEquals((report.enforcement_precedents as unknown[]).length, 1);
});

Deno.test("annotations: provision overlap links a precedent to a register row, fixed template", () => {
  const register = buildRiskRegister(intake());
  const anns = buildEnforcementAnnotations(
    [{
      id: "ea-1",
      key_compliance_failure: "a failure to secure patient records",
      provisions_normalized: ["gdpr:35"],
      precedent_significance: 4,
    }],
    register,
  );
  assertEquals(anns.length, 1);
  assertEquals(anns[0].enforcement_action_id, "ea-1");
  assertEquals(anns[0].match_type, "provision");
  assertEquals(
    anns[0].relevance,
    `This action concerned a failure to secure patient records; it bears on ${anns[0].risk_label} because both involve Article 35.`,
  );
});

Deno.test("annotations: category overlap links a security precedent when no provision matches", () => {
  const register = buildRiskRegister(intake());
  const anns = buildEnforcementAnnotations(
    [{
      id: "ea-sec",
      key_compliance_failure: "a failure to secure patient records",
      provisions_normalized: ["gdpr:32"],
      breach_related: true,
      precedent_significance: 4,
    }],
    register,
  );
  assertEquals(anns.length, 1);
  assertEquals(anns[0].match_type, "category");
  assertEquals(anns[0].match_label, "the security of processing");
});

Deno.test("annotations: a precedent with no overlap carries no annotation", () => {
  const register = buildRiskRegister(intake());
  const anns = buildEnforcementAnnotations(
    [{ id: "ea-2", key_compliance_failure: "an unrelated marketing matter", provisions_normalized: [], precedent_significance: 3 }],
    register,
  );
  assertEquals(anns.length, 0);
});

Deno.test("annotations: a precedent with no summary field is never annotated", () => {
  const register = buildRiskRegister(intake());
  assertEquals(
    buildEnforcementAnnotations([{ id: "ea-3", provisions_normalized: ["gdpr:32"] }], register).length,
    0,
  );
});

Deno.test("annotations: attach writes report.enforcement_annotations from the final register", () => {
  const report = reportWithStubs();
  report.enforcement_precedents = [{
    id: "ea-4",
    key_compliance_failure: "the processing of children's data without protection",
    data_categories: ["children"],
    precedent_significance: 5,
  }];
  attachDpiaDeliverables(report, intake({ data_subjects: "Children under 16" }));
  const meta = attachEnforcementAnnotations(report);
  assertEquals(meta.precedents, 1);
  assert(Array.isArray(report.enforcement_annotations));
});
