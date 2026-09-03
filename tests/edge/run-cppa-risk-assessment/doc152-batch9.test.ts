// DOC 152 (2026-09-03) — Batch-9 (962f9090) triage: permanent regression
// tests.
//   * Approval-date CURRENCY (P0): a date >365 days before the assessment
//     is a PRIOR review record — sufficiency never renders from history;
//     the § 5.A narrative, the § 4.D follow-up, and the Review-and-Approval
//     table date cell all consume the one currency rule.
//   * Advertising "significant decision" narrative (P0): the Company's
//     quoted characterization is answered in place by the § 7001(ddd)(6)
//     determination — fact / law / determination.
//   * § 7152(a)(3)(G) scoping (P1): the full mandate states only where a
//     significant-decision use is established; otherwise the sub-part is a
//     supplemental record.
//   * Promise parity (P1): a § 3.E sentence promises a § 4.D object only
//     when that object generated — deployed→Condition, evaluation→
//     Recommendation, training gap→Follow-Up — one predicate each.
//   * Instrument/source asserts: rubric mirror parity, context amendments.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  riskApprovalCurrencyFloor,
  runRiskFactorEngine,
} from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import {
  assembleRiskSkeletonDocument,
  deriveReviewApprovalTable,
} from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } from "../../../supabase/functions/_shared/grader/context.ts";

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

const APPROVERS: Bag = {
  assessment_reviewers_approvers: [
    { name: "Sandra Kowalski", position: "Chief Privacy Officer", role: "Approved" },
    { name: "Priya Sundaram", position: "Deputy General Counsel", role: "Both" },
  ],
  approver_authority_confirmed: "Yes",
};

// ── Approval-date currency ───────────────────────────────────────────────────

Deno.test("doc152 — the currency floor is 365 days before the assessment date", () => {
  assertEquals(riskApprovalCurrencyFloor("2026-09-03"), "2025-09-03");
});

Deno.test("doc152 — a stale (prior-year) approval date never renders sufficiency; the prior record is named and the follow-up completes it", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    ...APPROVERS,
    a9_approval_date: "2024-09-18",
  });
  assertEquals(r.factors["approval_sufficiency_conclusion"], undefined, "sufficiency rendered from a stale date");
  const fu = r.factors["approval_follow_up"] ?? "";
  assert(fu.startsWith("Approval record — additional information required."), "date-gated state missing");
  assert(fu.includes("Prior internal review or approval is recorded as of 2024-09-18"), "prior record not named");
  assert(fu.includes("THIS assessment"), "current-assessment requirement not stated");
  assert(
    (r.blocks["iv_determination:12"] ?? "").includes("the recorded approval date (2024-09-18) is a prior review record"),
    "stale-date follow-up missing from § 4.D",
  );
});

Deno.test("doc152 — a current approval date keeps the dated sufficiency conclusion (doc-150 behavior preserved)", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    ...APPROVERS,
    a9_approval_date: "2026-08-20",
  });
  assert(
    (r.factors["approval_sufficiency_conclusion"] ?? "").includes("reviewed and approved on 2026-08-20"),
    "current-date sufficiency lost",
  );
  assert(
    !(r.blocks["iv_determination:12"] ?? "").includes("prior review record"),
    "stale follow-up fired on a current date",
  );
});

Deno.test("doc152 — the § 5.A narrative labels a stale date as a prior review; the approval table's Date cell stays blank for it and prints a current one", () => {
  const staleIntake = {
    processing_status: "Ongoing",
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    ...APPROVERS,
    a9_approval_date: "2024-09-18",
  };
  const sk = assembleRiskSkeletonDocument({} as never, staleIntake as never);
  const all = JSON.stringify(sk.document);
  assert(all.includes("Prior review or approval date: 2024-09-18"), "§ 5.A stale-date label missing");
  assert(
    !all.includes("Approval date: 2024-09-18"),
    "stale date still labeled as the current approval date",
  );
  const staleTable = deriveReviewApprovalTable(staleIntake as never, "2026-09-03");
  assert(staleTable.rows.every((row) => row[4] !== "2024-09-18"), "stale date printed in the table Date cell");
  const currentTable = deriveReviewApprovalTable(
    { ...staleIntake, a9_approval_date: "2026-08-20" } as never,
    "2026-09-03",
  );
  assert(currentTable.rows.every((row) => row[4] === "2026-08-20"), "current date not printed in the table Date cell");
});

// ── Advertising “significant decision” narrative ─────────────────────────────

const AD_SIG_DESC =
  "Vortexis uses an automated decision-making system to score and segment subscribers for ad targeting priority, which constitutes a significant decision affecting the advertising content and commercial offers consumers receive.";

Deno.test("doc152 — a quoted advertising description claiming a significant decision draws the § 7001(ddd)(6) determination in place", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "Yes",
    q19_admt_description: AD_SIG_DESC,
  });
  const role = r.factors["admt_role"] ?? "";
  assert(role.includes("preserved as the Company’s own description"), "Company-characterization framing missing");
  assert(
    role.includes("advertising to a consumer is excluded from the significant-decision categories"),
    "§ 7001(ddd)(6) determination missing",
  );
});

Deno.test("doc152 — a genuine significant-decision description draws no counter-determination", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "Yes",
    q19_admt_description: "Scores loan applications to make significant decisions about consumer credit eligibility.",
  });
  assert(
    !(r.factors["admt_role"] ?? "").includes("excluded from the significant-decision categories"),
    "counter-determination fired on a covered decision",
  );
});

// ── § 7152(a)(3)(G) scoping ──────────────────────────────────────────────────

Deno.test("doc152 — the (a)(3)(G) mandate states in full only for an established significant-decision use; otherwise the sub-part is supplemental", () => {
  const advertising = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "Yes",
    q19_admt_description: AD_SIG_DESC,
  });
  const advIntro = advertising.factors["admt_intro"] ?? "";
  assert(advIntro.includes("that use is not established on the information provided"), "scoped variant missing (advertising)");
  assert(advIntro.includes("supplemental record"), "supplemental framing missing");

  const evaluation = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "In evaluation",
    q19_admt_description: "A recommendation model under evaluation for workspace features.",
  });
  assert(
    (evaluation.factors["admt_intro"] ?? "").includes("supplemental record"),
    "scoped variant missing (evaluation)",
  );

  const covered = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "Yes",
    q19_admt_description: "Scores loan applications to determine consumer credit eligibility.",
  });
  assert(
    (covered.factors["admt_intro"] ?? "").includes("requires the report to describe the technology’s role, logic, and output"),
    "full mandate lost for a covered use",
  );
});

// ── Promise parity ───────────────────────────────────────────────────────────

Deno.test("doc152 — evaluation-stage undocumented logic: Recommendation generated, sentence promises Recommendations, no Condition", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "In evaluation",
    q19_admt_description: "A recommendation model under evaluation for workspace features.",
    admt_logic_documented: "The logic is not fully documented or understood",
  });
  const recs = r.blocks["iv_determination:13"] ?? "";
  assert(recs.includes("Document the logic of the technology under evaluation"), "evaluation recommendation missing");
  const logicNote = r.factors["admt_logic_note"] ?? "";
  assert(logicNote.includes("appears among the Recommendations in § 4.D"), "sentence does not point at Recommendations");
  assert(
    !(r.blocks["iv_determination:11"] ?? "").includes("Document the logic"),
    "blocking condition generated for an evaluation-stage system",
  );
});

Deno.test("doc152 — deployed undocumented logic keeps the Condition and the sentence points at it", () => {
  const r = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "Yes",
    q19_admt_description: "Scores loan applications to determine consumer credit eligibility.",
    admt_logic_documented: "The logic is not fully documented or understood",
  });
  assert(
    (r.blocks["iv_determination:11"] ?? "").includes("Document the logic of the automated decisionmaking technology"),
    "deployed condition lost",
  );
  assert(
    (r.factors["admt_logic_note"] ?? "").includes("§ 4.D"),
    "deployed logic sentence lost its pointer",
  );
});

Deno.test("doc152 — training-provenance gap: Follow-Up and pointer only when the § 7150(b)(6) answer makes it material", () => {
  const withB6 = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "In evaluation",
    q19_admt_description: "A recommendation model under evaluation for workspace features.",
    q18b_admt_training: "Yes — training ADMT for significant decisions",
  });
  assert(
    (withB6.blocks["iv_determination:12"] ?? "").includes("Identify the provenance of the personal information used to train"),
    "training follow-up missing",
  );
  assert(
    (withB6.factors["admt_training_note"] ?? "").includes("appears among the Follow-Ups in § 4.D"),
    "training sentence lost its pointer",
  );

  const withoutB6 = engineOn({
    ...BENEFIT,
    a5_harm_pathways: [LOW_PATHWAY],
    q18_admt_use: "In evaluation",
    q19_admt_description: "A recommendation model under evaluation for workspace features.",
    admt_provider_trained_using_pi: "No",
  });
  const note = withoutB6.factors["admt_training_note"] ?? "";
  assert(!note.includes("Follow-Ups"), "training sentence promises a Follow-Up that never generates");
  assert(
    !(withoutB6.blocks["iv_determination:12"] ?? "").includes("provenance of the personal information used to train"),
    "training follow-up generated without materiality",
  );
});

// ── Instrument and mirror parity (source asserts) ────────────────────────────

Deno.test("doc152 — rubric recalibrations present and MIRRORED byte-for-byte", async () => {
  const canonical = await Deno.readTextFile("supabase/functions/run-quality-batch/index.ts");
  const mirror = await Deno.readTextFile("supabase/functions/grade-single-assessment/index.ts");
  for (const marker of [
    "RATIFIED FIXED FRAMEWORK PROSE",
    "never fail this check on the framework prose itself",
    "a condition without an invented deadline is complete, not under-actionable",
  ]) {
    assert(canonical.includes(marker), `canonical rubric missing: ${marker}`);
    assert(mirror.includes(marker), `mirror rubric missing: ${marker}`);
  }
});

Deno.test("doc152 — grader context carries the batch-9 amendments under the appended tag", () => {
  assert(GRADER_CONTEXT_VERSION.includes("+batch9-cal-2026-09-03"), "instrument tag missing");
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-2026-08-28-skeleton-cal-3-item204"), "calibration prefix lost");
  assert(SHARED_GRADER_CONTEXT.includes("PER-RECIPIENT structured answer"), "contract-status semantics missing");
  assert(SHARED_GRADER_CONTEXT.includes("A § 3.F cross-reference IS the supporting evidence"), "benefit-weight semantics missing");
});
