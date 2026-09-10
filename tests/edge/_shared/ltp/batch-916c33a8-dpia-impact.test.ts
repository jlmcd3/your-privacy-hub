// BATCH 916c33a8 (2026-09-10) — Velantrix Digital Services Ltd DPIA
// (28506091, 89/89). Three rendered defects, each pinned against the
// surface that produced it, on the batch's own record:
//   1. § 4 said the impact on the data subjects was "not stated" while
//      residual_risks read "Users may not fully anticipate … they cannot
//      easily inspect or correct inferred interests … re-identification risk
//      persists" — three impact forms IMPACT_LEXICON did not read.
//   2. Section 7 held sign-off open on ONE missing fact under TWO labels:
//      "the impact of the processing on the data subjects, stated separately
//      from the benefit; the effect of the processing on the data subjects,
//      and the measures that reduce it".
//   3. The PROCESSORS table printed the whole processor_obligations answer
//      on both rows, so each processor's row carried the other's obligations.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDecision,
  buildDpiaDeliverables,
  obligationsByProcessor,
} from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const OP = "User Behavioural Analytics and Engagement Profiling";
const NEXAFLOW = "Nexaflow Analytics GmbH (data warehousing and pipeline processing)";
const PRISMCLOUD = "Prismcloud Ltd (ML model hosting and inference)";
const NEXAFLOW_TERMS =
  "processes data solely on documented Velantrix instructions; implements encryption at rest and in transit; prohibits sub-processing without prior written consent; returns or deletes data on contract termination; submits to audit on 30 days' notice.";
const PRISMCLOUD_TERMS =
  "operates model inference exclusively on pseudonymised feature vectors supplied by Velantrix; prohibits use of data for own model training; provides SOC 2 Type II report annually; notifies Velantrix of any security incident within 24 hours.";
const RESIDUAL =
  "Users may not fully anticipate the extent to which their in-session behaviour is aggregated into persistent preference profiles; they cannot easily inspect or correct inferred interests. Profiles may reflect and reinforce existing usage patterns, limiting exposure to diverse content. Despite pseudonymisation, re-identification risk persists if event logs are combined with third-party data held by processors.";

// The batch's own fixture (static_stress_jobs 916c33a8 / dpia), trimmed to
// the fields the three surfaces read.
function velantrix(): Bag {
  return {
    organization_name: "Velantrix Digital Services Ltd",
    processing_activity_name: OP,
    description:
      "Velantrix Digital Services Ltd aggregates clickstream events, session durations, feature-usage patterns and inferred interest signals from registered users to build engagement profiles that drive personalised content ranking and in-product recommendations.",
    purpose:
      "To improve platform engagement, reduce churn and deliver personalised service experiences by predicting user content preferences and surfacing relevant features.",
    data_subjects: "Registered platform users (consumers and business account holders) across EU and UK",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    data_categories: ["Customer records", "Location data", "Other"],
    volume_frequency: "Approximately 4 million active users; event data ingested continuously, profiles refreshed every 24 hours",
    retention_period: "Raw event logs: 13 months. Aggregated engagement profiles: 36 months from last active session.",
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    necessity_proportionality:
      "Behavioural signals are the minimum data set required to infer content preferences accurately; aggregated or synthetic alternatives cannot produce sufficiently personalised outputs. Profile granularity is limited to feature-usage and content categories, excluding sensitive inferences.",
    data_minimisation_justification:
      "Customer records (account tier, locale) are required to contextualise recommendations. Location data (country-level only) is needed for content-licensing compliance. Raw URL paths and free-text search queries are excluded. Device identifiers beyond a session token are not retained.",
    alternatives_considered: [
      {
        processing_operation: OP,
        alternative: "Collaborative filtering based solely on anonymised aggregate popularity signals",
        rejection_reason:
          "Produces generic recommendations that do not reflect individual user preferences, reducing engagement quality and failing the stated personalisation purpose.",
      },
      {
        processing_operation: OP,
        alternative: "Explicit user-declared interests collected via preference surveys",
        rejection_reason:
          "Declared interests quickly become stale and are completed by fewer than 15% of users, making the signal insufficient for reliable recommendation at scale.",
      },
    ],
    residual_risks: RESIDUAL,
    data_subjects_views: "",
    data_subjects_views_sought: "No",
    existing_safeguards: [
      "Encryption at rest",
      "Encryption in transit",
      "Access controls",
      "Data minimisation",
      "Pseudonymisation",
      "Staff training",
      "DPA signed with processor",
    ],
    third_party_processors: [NEXAFLOW, PRISMCLOUD],
    processor_obligations: `${NEXAFLOW} : ${NEXAFLOW_TERMS} ${PRISMCLOUD}: ${PRISMCLOUD_TERMS}`
      .replace(`${NEXAFLOW} : `, "Nexaflow Analytics GmbH: ")
      .replace(`${PRISMCLOUD}: `, "Prismcloud Ltd: "),
    reasons_to_conduct: [
      "Evaluation or scoring (incl. profiling / prediction)",
      "Data processed on a large scale",
      "Matching or combining datasets",
    ],
  };
}

function textOf(intake: Bag): { report: Bag; text: string } {
  const report = buildDpiaDeliverables(intake) as unknown as Bag;
  const text = skeletonDocumentToText(assembleDpiaSkeletonDocument(report as never, intake as never).document);
  return { report, text };
}

Deno.test("916c33a8 DPIA-1 — residual_risks in the record's own impact forms is read as the impact side", () => {
  const d = buildDpiaDeliverables(velantrix());
  const prop = d.proportionality.find((p) => p.operation_label === OP)!;
  assertEquals(prop.argued_both_directions, true);
  assertEquals(prop.verdict, "proportionate_on_the_record");
  assertEquals(prop.status, "analysed");
  // The quoted span is the FIRST matching clause of the record's own text.
  assertStringIncludes(prop.why, 'impact: "Users may not fully anticipate the extent to which their in-session behaviour is aggregated into persistent preference profiles"');
  assertStringIncludes(prop.why, "records seven safeguards");
  // The Art. 6(1)(f) balancing prong reads the same impact.
  const lb = d.legal_basis.find((f) => f.operation_label === OP)!;
  assertEquals(lb.legitimate_interests_test?.balancing_test_met, true);
  assertEquals(lb.status, "analysed");
  assertEquals(lb.balancing_open_on_impact_only, undefined);
});

Deno.test("916c33a8 DPIA-1 — each of the three new impact forms is read alone; a negated safeguard is not", () => {
  const forms = [
    "Users may not fully anticipate the extent to which their in-session behaviour is aggregated into persistent preference profiles.",
    "Data subjects cannot easily inspect or correct inferred interests.",
    "Despite pseudonymisation, re-identification risk persists if event logs are combined with third-party data.",
  ];
  for (const form of forms) {
    const d = buildDpiaDeliverables({ ...velantrix(), residual_risks: form });
    assertEquals(d.proportionality[0].argued_both_directions, true, form);
  }
  // A positively described safeguard stays a safeguard (PROMPT 9E discipline).
  for (const notImpact of [
    "Unauthorised staff cannot access the raw event logs.",
    "Pseudonymisation prevents re-identification of the event logs.",
    "Analysts may not export raw data.",
  ]) {
    const d = buildDpiaDeliverables({ ...velantrix(), residual_risks: notImpact });
    assertEquals(d.proportionality[0].argued_both_directions, false, notImpact);
  }
});

Deno.test("916c33a8 DPIA-2 — an unstated impact holds sign-off open ONCE, under the proportionality label", () => {
  const intake = { ...velantrix(), residual_risks: "" };
  const { report, text } = textOf(intake);
  const decision = report.decision as Bag;
  const blockers = decision.blockers as string[];
  assertEquals(decision.determination, "draft_incomplete");
  assert(
    blockers.some((b) => b.startsWith("the impact of the processing on the data subjects, stated separately from the benefit")),
    JSON.stringify(blockers),
  );
  assert(
    !blockers.some((b) => b.startsWith("the effect of the processing on the data subjects, and the measures that reduce it")),
    JSON.stringify(blockers),
  );
  assert(!text.includes("stated separately from the benefit; the effect of the processing on the data subjects, and the measures that reduce it"), "the doubled Section 7 lead must not render");
  // The legal-basis finding still carries its full ask and part (gap table unchanged).
  const lb = (report.legal_basis as Bag[]).find((f) => f.operation_label === OP)!;
  assertEquals(lb.balancing_open_on_impact_only, true);
  assert((lb.ask_parts as Bag[]).some((p) => p.ask_class === "ask_lia_balancing"));
  assertStringIncludes(String(lb.information_needed), "Describe the effect of the processing on");
});

Deno.test("916c33a8 DPIA-2 — where the balance is open on more than the impact, the balancing blocker stays", () => {
  // Vulnerable subjects with no recorded safeguard: the balancing prong asks
  // for the measures as well, which the proportionality ask does not.
  const intake = {
    ...velantrix(),
    residual_risks: "",
    data_subjects: "Employees of the platform's enterprise customers",
    existing_safeguards: ["None"],
  };
  const edge = buildDpiaDeliverables(intake);
  const lb = edge.legal_basis.find((f) => f.operation_label === OP)!;
  assertEquals(lb.balancing_open_on_impact_only, undefined);
  assert(lb.ask_parts!.some((p) => p.ask_class === "ask_lia_balancing"));
  // On this record the unmitigated register drives the decision to prior
  // consultation, where no blocker list renders; the gate is exercised on
  // the decision builder with the base record's register and Art. 36 row.
  const base = buildDpiaDeliverables({ ...velantrix(), residual_risks: "" });
  const decision = buildDecision(intake, {
    necessity_findings: base.necessity_findings,
    proportionality: edge.proportionality,
    risk_register: base.risk_register,
    art36_consultation: base.art36_consultation,
    legal_basis: edge.legal_basis,
  });
  assertEquals(decision.determination, "draft_incomplete");
  const blockers = decision.blockers;
  assert(blockers.some((b) => b.startsWith("the effect of the processing on the data subjects, and the measures that reduce it")), JSON.stringify(blockers));
  assert(blockers.some((b) => b.startsWith("the impact of the processing on the data subjects, stated separately from the benefit")), JSON.stringify(blockers));
});

Deno.test("916c33a8 DPIA-3 — a per-processor obligations answer puts each processor's own terms on its row", () => {
  const { report, text } = textOf(velantrix());
  const rows = (report.processing_inventory as Bag).processors as Bag[];
  assertEquals(rows.map((r) => r.name), [NEXAFLOW, PRISMCLOUD]);
  assertEquals(rows[0].obligations_and_tasks, NEXAFLOW_TERMS);
  assertEquals(rows[1].obligations_and_tasks, PRISMCLOUD_TERMS);
  assert(rows.every((r) => r.status === "analysed" && r.information_needed === undefined));
  // The Art. 28(3) coverage row still reads the whole answer.
  const contract = ((report.section2_coverage as Bag).processor_contract) as Bag;
  assertEquals(contract.status, "analysed");
  assertStringIncludes(text, NEXAFLOW_TERMS);
  assertStringIncludes(text, PRISMCLOUD_TERMS);
});

Deno.test("916c33a8 DPIA-3 — the split never invents: one processor, a missing name or an empty segment keeps the whole answer", () => {
  const whole = "Both processors act on documented instructions and delete data on termination.";
  assertEquals(obligationsByProcessor([NEXAFLOW, PRISMCLOUD], whole), null);
  assertEquals(obligationsByProcessor([NEXAFLOW], `Nexaflow Analytics GmbH: ${NEXAFLOW_TERMS}`), null);
  assertEquals(obligationsByProcessor([NEXAFLOW, PRISMCLOUD], `Nexaflow Analytics GmbH: ${NEXAFLOW_TERMS} Prismcloud Ltd:`), null);
  assertEquals(obligationsByProcessor([NEXAFLOW, PRISMCLOUD], ""), null);
  const d = buildDpiaDeliverables({ ...velantrix(), processor_obligations: whole });
  assert(d.processing_inventory.processors.every((p) => p.obligations_and_tasks === whole));
});
