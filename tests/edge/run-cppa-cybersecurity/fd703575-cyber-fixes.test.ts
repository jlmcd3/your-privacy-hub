// FD703575 (quality batch, 2026-08-27) — Cyber fixes.
// The batch's cyber document (row b8aee9cb, scored 80.55, the first batch on
// the deployed C2 Spine v1.1) carried four defect classes:
//   CY1 the LEAK-PREV-P2 serializer strips component_coverage /
//       evidence_sufficiency / program_obligation_findings (not schema
//       topLevel keys) and the V4 assembler ran AFTER it — counting empty
//       arrays: "testable evidence for 0 of the eighteen components" against
//       components that identify evidence, plus the all-clear "No evidence
//       follow-up is identified" as a vacuous truth over zero rows,
//       flatly contradicting the record-sufficiency line computed from
//       intake ("2 components identify no evidence"). index.ts now rebuilds
//       the typed surfaces from intake at compose time.
//   CY2 the executive (b)(3) sentence ("§ 7123(b)(3) enforcement of the
//       program is also unmet") carried no basis — violating the function's
//       own § 7123(b)(1)/(b)(3) usage discipline; it now names the basis in
//       the same sentence.
//   CY3 every {fact} interpolation pasted the ENTIRE multi-sentence notes
//       into the action text; the fact is now the first sentence.
//   CY4 §VI listed the same Immediate items verbatim under both "Priority
//       readiness actions" and the class families; each action now appears
//       once.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import {
  buildCyberComponentRecommendations,
  recommendationFact,
  recommendationGap,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { buildReadinessActions } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-factors.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { serializeCustomerReport } from "../../../supabase/functions/_shared/report-serialize.ts";
import { CPPA_CYBER_REPORT_SCHEMA } from "../../../supabase/functions/run-cppa-cybersecurity/_local/report-schemas/cppa-cyber.ts";
import { CYBER_7123_COMPONENTS } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/components.ts";

type Bag = Record<string, unknown>;

const LONG_NOTES =
  "Multi-factor authentication is enforced via Okta Workforce Identity for all corporate SaaS applications and the AWS management console. " +
  "However, the legacy Sacramento batch processing cluster still authenticates via username/password only. " +
  "Approximately 40 internal users access the cluster weekly.";

function fullIntake(): Bag {
  return {
    profile: {
      entity_name: "Harborstone Financial Analytics, Inc.",
      industry: "Financial technology",
      framework: "SOC 2",
      auditor_engagement_status: "External auditor engaged",
      remediation_owner: "Marcus Oyelaran, CISO",
    },
    controls: CYBER_7123_COMPONENTS.map((c, i) => ({
      key: c.slug,
      label: c.label,
      maturity: i < 4 ? "Not implemented" : "Documented, partially implemented",
      notes: i === 0 ? LONG_NOTES : `A concrete description for ${c.label}. A second sentence with detail.`,
      evidence: i < 2 ? ["None on file"] : ["Policy / procedure document", "Screenshot / config export"],
    })),
  };
}

Deno.test("CY1 — the serializer drops the typed surfaces the V4 assembler needs (the constraint this fix compensates)", () => {
  const intake = fullIntake();
  const d = buildCyberDeliverables(intake);
  const report: Bag = {
    executive_summary: "",
    controls: [],
    component_coverage: d.component_coverage,
    evidence_sufficiency: d.evidence_sufficiency,
    program_obligation_findings: d.program_obligation_findings,
    readiness_determination: d.readiness_determination,
    independence_determination: d.independence_determination,
  };
  const { report: serialized } = serializeCustomerReport(report, CPPA_CYBER_REPORT_SCHEMA);
  assertEquals((serialized as Bag).component_coverage, undefined);
  assertEquals((serialized as Bag).evidence_sufficiency, undefined);
  assertEquals((serialized as Bag).program_obligation_findings, undefined);
  // readiness/independence survive — the exact asymmetry the live doc showed.
  assert((serialized as Bag).readiness_determination);
});

Deno.test("CY1 — composing from rebuilt deliverables yields real evidence counts and no vacuous all-clear", () => {
  const intake = fullIntake();
  const d = buildCyberDeliverables(intake);
  // Simulate index.ts's fixed compose path: serialized report + rebuilt surfaces.
  const serialized: Bag = {
    executive_summary: "",
    controls: [],
    readiness_determination: d.readiness_determination,
    independence_determination: d.independence_determination,
  };
  const composeView: Bag = {
    ...serialized,
    component_coverage: d.component_coverage,
    evidence_sufficiency: d.evidence_sufficiency,
    program_obligation_findings: d.program_obligation_findings,
  };
  const sk = assembleCyberSkeletonDocumentV4(composeView, intake, "");
  const text = JSON.stringify(sk.document);
  assert(!text.includes("testable evidence for 0 of the eighteen"), "the zero-count artefact must be gone");
  assert(!text.includes("No evidence follow-up is identified: every component's identified evidence includes testable material"),
    "the vacuous all-clear must not render when components lack evidence");
});

Deno.test("CY2 — the (b)(3) sentence names its basis in the same sentence", () => {
  const d = buildCyberDeliverables(fullIntake());
  const reasoning = d.readiness_determination.reasoning;
  assertStringIncludes(reasoning, "§ 7123(b)(3)");
  assertStringIncludes(reasoning, "components recorded as unimplemented are, on their face, components the program is not enforcing");
  assert(!reasoning.includes("§ 7123(b)(3) enforcement of the program is also unmet on this record."),
    "the bare basis-free sentence must be gone");
});

Deno.test("CY3 — recommendationFact takes the first sentence, never the whole narrative", () => {
  const fact = recommendationFact(LONG_NOTES, "Documented, partially implemented");
  assertEquals(fact, "Multi-factor authentication is enforced via Okta Workforce Identity for all corporate SaaS applications and the AWS management console");
  assert(!fact.includes("Sacramento"), "later sentences must not ride along");
  assertEquals(recommendationFact("", "Documented"), "Documented");
  assertEquals(recommendationFact("", ""), "the recorded entry");
  // A single unterminated sentence passes through intact.
  assertEquals(recommendationFact("No terminal punctuation here", ""), "No terminal punctuation here");
});

Deno.test("CY4 — an Immediate action appears once: in priority_actions, not again in a class family", () => {
  const intake = fullIntake();
  const d = buildCyberDeliverables(intake);
  const recs = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency);
  const actions = buildReadinessActions(intake, recs);
  assert(actions.priority_actions.length > 0, "fixture must produce Immediate items");
  for (const p of actions.priority_actions) {
    assert(!actions.implementation_actions.includes(p), `duplicated in implementation_actions: ${p.slice(0, 60)}`);
    assert(!actions.record_completion_actions.includes(p), `duplicated in record_completion_actions: ${p.slice(0, 60)}`);
    assert(!actions.evidence_package_actions.includes(p), `duplicated in evidence_package_actions: ${p.slice(0, 60)}`);
  }
});

Deno.test("CY1 — index.ts wires the rebuild between the serializer and the V4 assembler (source pin)", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-cppa-cybersecurity/index.ts", import.meta.url),
  );
  const serializerAt = src.indexOf("serializeCustomerReport");
  const rebuildAt = src.indexOf("FD703575-CY1");
  const assembleAt = src.indexOf("assembleCyberSkeletonDocumentV4(");
  assert(serializerAt > 0 && rebuildAt > serializerAt && assembleAt > rebuildAt,
    "the compose-time rebuild must sit between the serializer and the V4 assembler");
  assertStringIncludes(src.slice(rebuildAt, assembleAt + 400), "composeView");
});

// ── Batch 3e9ad759 additions ────────────────────────────────────────────────

Deno.test("3E9AD759-CY1 — a sentence stop inside a token never truncates the fact", () => {
  const fact = recommendationFact(
    "Tenable.io is used for continuous scanning across the corporate estate. Coverage excludes the Guadalajara facility.",
    "Documented, partially implemented",
  );
  assertEquals(fact, "Tenable.io is used for continuous scanning across the corporate estate");
  const fact2 = recommendationFact(
    "An incident response plan (IRP v2.1) is documented and tested annually. The Guadalajara site is out of scope.",
    "",
  );
  assertEquals(fact2, "An incident response plan (IRP v2.1) is documented and tested annually");
});

Deno.test("3E9AD759-CY3 — recommendationGap returns the record's own gap sentence, or nothing", () => {
  const gap = recommendationGap(
    "Multi-factor authentication is enforced via Okta for corporate SaaS. However, the legacy Sacramento batch cluster still authenticates via username/password only.",
  );
  assertEquals(gap, "However, the legacy Sacramento batch cluster still authenticates via username/password only");
  assertEquals(recommendationGap("Fully deployed everywhere with quarterly attestation. Coverage is complete."), "");
  assertEquals(recommendationGap(""), "");
});
