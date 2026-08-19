// PROMPT 10 (2026-08-12) — final retirement of u1/u5, the refinement pass and
// the legacy fallback for new documents.
//
// The flag and the fail-closed branch live in run-dpia-framework/index.ts,
// which boots a server on import; these tests exercise the OBSERVABLE
// contract of the parts that are importable: the deterministic u1/u5
// surfaces, the byte-exact disclaimer, the mapping tables, and the fact that
// a flag-on attach performs zero model calls (no callable is handed to it).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { attachDpiaDeliverables } from "../../run-dpia-framework/_local/ltp/dpia-deliverables/build.ts";
import {
  DPIA_APPLICABLE_FRAMEWORKS_MAP,
  DPIA_ART_35_3_PRECAUTIONARY,
  DPIA_ART_35_3_TRIGGER_MAP,
  DPIA_FRAMEWORK_DISCLAIMER,
  DPIA_LEGACY_DECISION_LABELS,
  buildDpiaMetadata,
  buildInterestedParties,
} from "../../run-dpia-framework/_local/ltp/dpia-deliverables/minimal-units.ts";
import { assembleDpiaSkeletonDocument } from "../ltp/dpia-skeleton-assemble.ts";

// BYTE LAW — the U5_SKELETON framework_disclaimer string, copied here
// independently of the constant under test.
const U5_DISCLAIMER =
  "This document helps your organisation structure its Data Protection Impact Assessment using the EDPB-endorsed Guidelines on DPIA (WP248 rev.01). It is not a completed DPIA and does not satisfy the requirements of GDPR Article 35 on its own. Your qualified Data Protection Officer or legal counsel must review, complete, and own it. It does not constitute legal advice.";

function intake(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    organization_name: "Northwind Clinics Ltd",
    processing_activity_name: "Patient triage scoring",
    purpose: "To triage patients arriving at urgent care.",
    description: "A scoring model applied at intake.",
    data_categories: ["Contact details", "Health or medical data"],
    data_subjects: "Patients",
    volume_frequency: "About 4,000 patients per month, continuously.",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    reasons_to_conduct: [
      "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
      "Sensitive or highly personal data",
    ],
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

Deno.test("prompt10: the framework_disclaimer bytes are byte-equal to U5_SKELETON", () => {
  assertEquals(DPIA_FRAMEWORK_DISCLAIMER, U5_DISCLAIMER);
});

Deno.test("prompt10: metadata is built mechanically from the two mapping tables", () => {
  const m = buildDpiaMetadata(intake());
  assertEquals(m.processing_activity_name, "Patient triage scoring");
  assertEquals(m.framework_version, "1.0");
  assertEquals(m.template_basis, "EDPB (endorsed) Guidelines on DPIA (WP248 rev.01)");
  assertEquals(m.applicable_frameworks, [
    ...DPIA_APPLICABLE_FRAMEWORKS_MAP["EU (GDPR)"],
    ...DPIA_APPLICABLE_FRAMEWORKS_MAP["United Kingdom (UK GDPR)"],
  ]);
  assert(m.article_35_3_trigger.includes("Art. 35(3)(b)"));
  assert(m.article_35_3_trigger.includes("sensitive data"));
});

Deno.test("prompt10: no reason selected → fixed precautionary wording", () => {
  const m = buildDpiaMetadata(intake({ reasons_to_conduct: [] }));
  assertEquals(m.article_35_3_trigger, DPIA_ART_35_3_PRECAUTIONARY);
});

Deno.test("prompt10: every trigger mapping value is non-empty and stable", () => {
  for (const [k, v] of Object.entries(DPIA_ART_35_3_TRIGGER_MAP)) {
    assert(k.length > 0 && v.length > 0, k);
  }
});

Deno.test("prompt10: section 5 reuses the assembler's DPO / views sentences", () => {
  const s5 = buildInterestedParties(intake({ dpo_advice: "" }));
  assert(s5.dpo_advice.startsWith("The company has recorded its data protection officer as"), s5.dpo_advice);
  assert(s5.data_subject_views.startsWith("The company has recorded"), s5.data_subject_views);
  const verbatim = buildInterestedParties(intake({ dpo_advice: "Proceed with the stated safeguards." }));
  assertEquals(verbatim.dpo_advice, "Proceed with the stated safeguards.");
});

Deno.test("prompt10: flag-on attach fills all four surfaces with zero model calls", () => {
  const report: Record<string, unknown> = {};
  // No model callable is passed or reachable: the builder is a pure function.
  const meta = attachDpiaDeliverables(report, intake(), { unitsMinimal: true });
  assertEquals((meta as Record<string, unknown>).ok, true);
  assertEquals(report.framework_disclaimer, U5_DISCLAIMER);
  const m = report.dpia_metadata as Record<string, unknown>;
  assertEquals(m.rule_id, "dpia_minimal_metadata_v1");
  const s5 = report.section_5_interested_parties as Record<string, unknown>;
  assertEquals(s5.rule_id, "dpia_minimal_section5_v1");
  const s6 = report.section_6_conclusion as Record<string, unknown>;
  assertEquals(s6.rule_id, "dpia_minimal_section6_v1");
  const decision = report.decision as Record<string, string>;
  assertEquals(s6.decision, DPIA_LEGACY_DECISION_LABELS[decision.determination as keyof typeof DPIA_LEGACY_DECISION_LABELS]);
  // Skeleton assembly still succeeds over the deterministic surfaces alone.
  const sk = assembleDpiaSkeletonDocument(report, intake());
  assert(sk.document.sections.length > 0);
});

Deno.test("prompt10: flag-off attach leaves the u1/u5 surfaces untouched", () => {
  const report: Record<string, unknown> = {
    dpia_metadata: { processing_activity_name: "MODEL PROSE FROM U1" },
    section_5_interested_parties: { dpo_advice: "MODEL PROSE FROM U5" },
    section_6_conclusion: { decision: "MODEL PROSE FROM U5" },
    framework_disclaimer: "MODEL PROSE FROM U5",
  };
  attachDpiaDeliverables(report, intake());
  assertEquals((report.dpia_metadata as Record<string, unknown>).processing_activity_name, "MODEL PROSE FROM U1");
  assertEquals(report.framework_disclaimer, "MODEL PROSE FROM U5");
  assertEquals((report.section_6_conclusion as Record<string, unknown>).decision, "MODEL PROSE FROM U5");
});
