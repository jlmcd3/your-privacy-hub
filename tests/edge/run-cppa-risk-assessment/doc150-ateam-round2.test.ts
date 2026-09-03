// DOC 150 (2026-09-03) — Batch-8 A-Team round 2, agreed set.
//   * § 7152(a)(9) approval DATE requirement (primary-source verified:
//     registry row ra_content_approval) — the sufficiency claim is
//     date-gated; doc 148's contrary reading is retracted.
//   * b(4)/b(6) trigger-record transparency qualifiers (triggers stay
//     engaged on the categorical answer — doc-148 ruling stands — with the
//     row stating what the record does not yet describe + a Follow-Up).
//   * Activity-scope reconciliation invariant (out-of-scope text vs the
//     q4 inventory, sentence-scoped exclusion-cue matching).
//   * AENA citation carries both official identifiers.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";

type Bag = Record<string, unknown>;

const BENEFIT: Bag = {
  benefit_consumer_identified: "Yes",
  a4_benefit_consumer: "Consumers receive shipment updates without re-entering details",
  a4_benefit_consumer_fact: "Support tickets about lost shipments fell 30% in the pilot",
};

const LOW_PATHWAY: Bag = {
  harm: "(H) Psychological harms",
  likelihood: "Unlikely",
  severity: "Minimal",
  data_involved: "Contact identifiers",
  actor: "Internal analytics team",
  cause: "Over-notification",
};

function engineOn(intake: Bag, report: Bag = {}) {
  return runRiskFactorEngine(
    { processing_status: "Ongoing", ...intake } as never,
    report as never,
    "2026-09-03",
  );
}

// ── § 7152(a)(9) approval date ───────────────────────────────────────────────

Deno.test("doc150 — approval record without a date is additional-information-required, never sufficient", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    assessment_reviewers_approvers: [
      { name: "Marcus D. Holloway", position: "Chief Privacy Officer", role: "Approved" },
    ],
    approver_authority_confirmed: "Yes",
  });
  assertEquals(r.factors["approval_sufficiency_conclusion"], undefined, "sufficiency claimed without the § 7152(a)(9) date");
  const fu = r.factors["approval_follow_up"] ?? "";
  assert(fu.startsWith("Approval record — additional information required."), "date-gated approval state missing");
  assert(fu.includes("date the assessment was reviewed and approved"), "date element not named");
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("Record the date the assessment was reviewed and approved"),
    "approval-date follow-up missing from § 4.D",
  );
});

Deno.test("doc150 — a recorded review/approval date restores the sufficiency conclusion, dated", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    assessment_reviewers_approvers: [
      { name: "Marcus D. Holloway", position: "Chief Privacy Officer", role: "Approved", date: "2026-09-01" },
    ],
    approver_authority_confirmed: "Yes",
  });
  const suff = r.factors["approval_sufficiency_conclusion"] ?? "";
  assert(suff.includes("reviewed and approved on 2026-09-01"), "dated sufficiency conclusion missing");
  assert(
    !(r.blocks["iv_determination:12"] ?? "").includes("Record the date the assessment was reviewed and approved"),
    "date follow-up fired despite a recorded date",
  );
});

// ── b(4) / b(6) transparency qualifiers ──────────────────────────────────────

const B4_B6_REPORT: Bag = {
  scope_and_triggers: {
    narrative: [
      "Engaged — 11 CCR § 7150(b)(4) (inferring characteristics from systematic observation of consumers acting as the business's employees, contractors, students, or job or educational-program applicants): the record supports this trigger and this activity falls within the risk-assessment obligation.",
      "Engaged — 11 CCR § 7150(b)(6) (processing personal information to train an ADMT or identification technology): the record supports this trigger and this activity falls within the risk-assessment obligation.",
    ],
  },
};

Deno.test("doc150 — b(4) stays Engaged with the capacity qualifier when no employment context is described", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q5b_profiling_observation: "Yes",
    subject_anchor: "Behavioral profiling of website users for targeted advertising",
    primary_activity_purpose: "Builds interest profiles from consumer browsing activity.",
  }, B4_B6_REPORT);
  const digest = r.tables["executive_summary:3"];
  assert(digest, "trigger digest missing");
  const b4 = digest.rows.find((row) => row[0].includes("7150(b)(4)"));
  assert(b4 && b4[1].startsWith("Engaged — "), "b(4) must stay engaged on the direct affirmation");
  assert(
    b4[1].includes("observed population’s worker, student, or applicant capacity is not separately described"),
    "b(4) capacity qualifier missing",
  );
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("Describe the population systematically observed"),
    "b(4) follow-up missing",
  );
});

Deno.test("doc150 — b(4) carries NO qualifier when the scenario shows the employment relationship", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q5b_profiling_observation: "Yes",
    subject_anchor: "Productivity scoring of warehouse employees from scanner telemetry",
    primary_activity_purpose: "Scores employee reliability from systematic observation of shift activity.",
  }, B4_B6_REPORT);
  const digest = r.tables["executive_summary:3"];
  const b4 = digest?.rows.find((row) => row[0].includes("7150(b)(4)"));
  assert(b4 && !b4[1].includes("not separately described"), "qualifier fired despite employment context");
  assert(
    !(r.blocks["iv_determination:12"] ?? "").includes("Describe the population systematically observed"),
    "b(4) follow-up fired despite employment context",
  );
});

Deno.test("doc150 — b(6) significant-decisions training answer with an advertising-only description gets the bridge qualifier", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18b_admt_training: "Yes — training ADMT for significant decisions",
    q19_admt_description:
      "An audience segmentation model assigns users to advertising cohorts from inferred interests.",
  }, B4_B6_REPORT);
  const digest = r.tables["executive_summary:3"];
  const b6 = digest?.rows.find((row) => row[0].includes("7150(b)(6)"));
  assert(b6 && b6[1].startsWith("Engaged — "), "b(6) must stay engaged on the reported answer");
  assert(
    b6[1].includes("the significant decision the trained technology is intended to make or support is not identified"),
    "b(6) bridge qualifier missing",
  );
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("Identify the significant decision the technology being trained"),
    "b(6) follow-up missing",
  );
});

Deno.test("doc150 — b(6) carries NO qualifier when the description names a significant-decision category", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18b_admt_training: "Yes — training ADMT for significant decisions",
    q19_admt_description: "Trains a model that scores loan applications for consumer credit eligibility.",
  }, B4_B6_REPORT);
  const digest = r.tables["executive_summary:3"];
  const b6 = digest?.rows.find((row) => row[0].includes("7150(b)(6)"));
  assert(b6 && !b6[1].includes("is not identified in the information provided"), "qualifier fired despite a named significant decision");
});

// ── Activity-scope reconciliation ────────────────────────────────────────────

Deno.test("doc150 — a q4 category assigned out of scope draws the reconciliation note and follow-up", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q4_pi_categories: [
      "Device identifiers (IP, cookies, device IDs)",
      "Financial information",
    ],
    out_of_scope_confirmation: "The affected information is also processed for other activities not covered by this assessment",
    out_of_scope_activities:
      "Financial transaction data collected for payment processing is handled under a separate payment data processing activity and is not included in this behavioral profiling assessment. Internal HR data processing is also excluded.",
  });
  const oos = r.factors["out_of_scope"] ?? "";
  assert(oos.includes("reconciling that scope appears among the Follow-Ups"), "scope note missing from § 2.A");
  assert(oos.includes("“Financial information”"), "conflicting category not named in § 2.A");
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("Reconcile the Activity’s information scope"),
    "scope-reconciliation follow-up missing",
  );
});

Deno.test("doc150 — no scope conflict without an exclusion cue naming a q4 category", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q4_pi_categories: ["Device identifiers (IP, cookies, device IDs)"],
    out_of_scope_confirmation: "The affected information is also processed for other activities not covered by this assessment",
    out_of_scope_activities: "Aggregate service analytics are compiled for quarterly planning.",
  });
  assert(
    !(r.blocks["iv_determination:12"] ?? "").includes("Reconcile the Activity’s information scope"),
    "false-positive scope conflict",
  );
});

// ── AENA citation (source asserts) ───────────────────────────────────────────

Deno.test("doc150 — the AENA authority label carries both official identifiers in both corpus maps", async () => {
  for (const p of [
    "supabase/functions/_shared/corpus/maps/risk-corpus-map.ts",
    "supabase/functions/_shared/corpus/maps/dpia-corpus-map.ts",
  ]) {
    const src = await Deno.readTextFile(p);
    assert(src.includes("ref. PS/00431/2024 (Expte. EXP202304532)"), `${p}: paired AENA identifiers missing`);
  }
});
