// DOC 154 (2026-09-03) — CPPA Risk code-review remediation: one permanent
// regression test per fixed defect class (numbering follows doc 154 §B).
//
//   1–3  Non-Yes trigger answers reconciled at the chokepoint (q15 "Unsure"
//        = unresolved b(2); q18 "In evaluation" = not-engaged b(3)); the exec
//        lead asserts engagement only when a trigger IS engaged.
//   4    Low risks never draw Conditions; Moderate gaps draw Recommendations.
//   5    Unassessed-only records never render a cell conclusion.
//   7–11 Promise parity: every "appears among … § 4.D" has its object.
//   12–20 Answered negatives stated as answers; misstatements corrected.
//   21–24 One state across surfaces (approval date, evaluation predicate,
//        Appendix B attachment, b(4) capacity).
//   25–28 Collected fields read (risk_pathway_ids, effectiveness_basis,
//        under-16, SPI basis/volume).
//   29–35 Text logic, leak, cadence, wording.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  runRiskFactorEngine,
  resolveRecordedApprovalDate,
  admtEvaluationActiveFor,
  safeguardHarms,
} from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import {
  assembleRiskSkeletonDocument,
  deriveAdmtTechnicalFacts,
  deriveRiskFiredStates,
  deriveReviewApprovalTable,
} from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { RISK52_FIXED, RISK_PLAIN_MEANING } from "../../../supabase/functions/_shared/prose/plans/cppa-risk.spine.ts";
import { evaluateCppaRiskGates } from "../../../supabase/functions/run-cppa-risk-assessment/_local/ltp/gate-eval.ts";

type Bag = Record<string, unknown>;

const BENEFIT: Bag = {
  benefit_consumer_identified: "Yes",
  a4_benefit_consumer: "Consumers receive shipment updates without re-entering details",
  a4_benefit_consumer_fact: "Support tickets about lost shipments fell 30% in the pilot",
};
const LOW: Bag = { harm: "(H) Psychological harms", likelihood: "Unlikely", severity: "Minimal", data_involved: "Contact identifiers", actor: "Internal analytics team", cause: "Over-notification" };
const MODERATE: Bag = { harm: "(C) Impairment of consumer control over personal information", likelihood: "Possible", severity: "Moderate", data_involved: "Device identifiers", actor: "The Company", cause: "Footer-only opt-out" };
const HIGH_G: Bag = { harm: "(G) Reputational harms", likelihood: "Possible", severity: "Significant", data_involved: "Behavioral profiles", actor: "Media", cause: "Disclosure gap" };
const UNASSESSED: Bag = { harm: "(E) Economic harms", likelihood: "Possible", severity: "", data_involved: "Scores", actor: "The Company", cause: "Pricing" };

const ENGAGED_B1 = "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const ENGAGED_B2 = "Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const ENGAGED_B3 = "Engaged — 11 CCR § 7150(b)(3) (using ADMT for a significant decision concerning a consumer): the record supports this trigger and this activity falls within the risk-assessment obligation.";

function engineOn(intake: Bag, scope: string[] = []) {
  return runRiskFactorEngine(
    { processing_status: "Ongoing", ...BENEFIT, a5_harm_pathways: [LOW], ...intake } as never,
    { scope_and_triggers: { narrative: scope } } as never,
    "2026-09-03",
  );
}
function docText(intake: Bag, scope: string[] = []): string {
  const res = assembleRiskSkeletonDocument(
    { scope_and_triggers: { narrative: scope } } as never,
    { processing_status: "Ongoing", ...BENEFIT, a5_harm_pathways: [LOW], ...intake } as never,
  );
  return skeletonDocumentToText(res.document);
}

// ── 1–3: trigger reconciliation ───────────────────────────────────────────────

Deno.test("doc154 §1 — q15 'Unsure' is an unresolved b(2) state: AIR row, § 3.A paragraph, Follow-Up, § 2.D sentence; never Engaged", () => {
  const r = engineOn({ q15_sensitive_pi: "Unsure", q4_pi_categories: ["Contact identifiers (name, email, phone)"] }, [ENGAGED_B2]);
  const rows = r.tables["executive_summary:3"]!.rows;
  const b2 = rows.find((x) => x[0].includes("§ 7150(b)(2)"));
  assert(b2 && b2[1].startsWith("Additional Information Required — the Company answers “Unsure”"), JSON.stringify(rows));
  assert(!rows.some((x) => x[1].startsWith("Engaged") && x[0].includes("(b)(2)")), "b(2) still Engaged");
  assertEquals(r.exec_panel.triggers_engaged_count, 0);
  assert(r.exec_panel.assessment_required, "conservative Yes lost for an asserted-but-open trigger");
  assert((r.factors["trigger_application"] ?? "").includes("requires additional information: the Company answers “Unsure”"), r.factors["trigger_application"]);
  assert((r.blocks["iv_determination:12"] ?? "").includes("Determine whether the Activity processes sensitive personal information"), "follow-up missing");
  assert((r.factors["information_profile"] ?? "").includes("The Company is unsure whether the Activity processes sensitive personal information"), r.factors["information_profile"]);
  assert(!(r.factors["information_profile"] ?? "").includes("No sensitive personal information is identified"), "Unsure rendered as none identified");
});

Deno.test("doc154 §2 — q18 'In evaluation' never engages b(3): Not-engaged row with the evaluation posture; assessment not required on that answer alone", () => {
  const r = engineOn({
    q18_admt_use: "In evaluation",
    q19_admt_description: "The Company is evaluating a model that would decide loan eligibility for applicants.",
    i5_admt_logic: "Gradient-boosted classifier on repayment history.",
  }, [ENGAGED_B3]);
  const rows = r.tables["executive_summary:3"]!.rows;
  const b3 = rows.find((x) => x[0].includes("§ 7150(b)(3)"));
  assert(b3 && b3[1].startsWith("Not engaged — the Company records the automated decisionmaking technology as under evaluation"), JSON.stringify(rows));
  assertEquals(r.exec_panel.triggers_engaged_count, 0);
  assertEquals(r.exec_panel.assessment_required, false);
  assert((r.factors["trigger_application"] ?? "").includes("is not engaged on the information provided: the Company records the technology as under evaluation"), r.factors["trigger_application"]);
  assert((r.factors["admt_intro"] ?? "").includes("under evaluation rather than deployed"), "§ 3.E evaluation posture lost");
});

Deno.test("doc154 §6 — the exec lead asserts engagement only when a trigger is engaged", () => {
  const engaged = engineOn({ q5_sell_share: "Yes — sell only", q15_sensitive_pi: "Unsure" }, [ENGAGED_B1, ENGAGED_B2]);
  assertEquals(engaged.factors["exec_trigger_lines"], RISK52_FIXED.exec_triggers_lead);
  assertEquals(engaged.exec_panel.triggers_engaged_count, 1);
  const only = engineOn({ q15_sensitive_pi: "Unsure" }, [ENGAGED_B2]);
  assertEquals(only.factors["exec_trigger_lines"], RISK52_FIXED.exec_triggers_asserted_lead);
  assert(RISK52_FIXED.exec_triggers_asserted_lead.startsWith("On the information provided, no significant-risk category"), "asserted lead wording");
});

Deno.test("doc154 §1–2 (gate) — the gate evaluator blocks 'Unsure' and 'In evaluation' with distinct reasons", () => {
  const out = evaluateCppaRiskGates({
    q15_sensitive_pi: "Unsure",
    q18_admt_use: "In evaluation",
    q19_admt_description: "A model that would decide loan eligibility.",
  });
  const b2 = out.find((g) => g.gate_id === "G.applicability.sensitive_pi");
  const b3 = out.find((g) => g.gate_id === "G.applicability.admt_significant_decision");
  assertEquals(b2?.outcome, "block");
  assert((b2?.reason ?? "").startsWith("b2_unresolved"), b2?.reason);
  assertEquals(b3?.outcome, "block");
  assert((b3?.reason ?? "").startsWith("b3_evaluation_not_deployed"), b3?.reason);
});

// ── 4: material means High/Critical ──────────────────────────────────────────

Deno.test("doc154 §4 — a Low risk with no safeguard draws no Condition and no 'material risk' bullet; a Moderate one draws a Recommendation", () => {
  const low = engineOn({ a5_harm_pathways: [LOW] });
  assert(!(low.blocks["iv_determination:11"] ?? "").includes("Establish and implement a safeguard"), "Low risk drew a Condition");
  assert(!(low.blocks["iv_determination:6"] ?? "").includes("material risk lacks"), "Low risk called material");
  assertEquals(low.exec_panel.disposition, "proceed");
  const mod = engineOn({ a5_harm_pathways: [MODERATE] });
  assert(!(mod.blocks["iv_determination:11"] ?? "").includes("Establish and implement a safeguard"), "Moderate risk drew a Condition");
  assert((mod.blocks["iv_determination:13"] ?? "").includes("Establish a safeguard directed at the moderate risk: (C) Impairment"), mod.blocks["iv_determination:13"]);
  assert((mod.factors["risk_paragraphs"] ?? "").includes("establishing one appears among the Recommendations in § 4.D"), "§ 4.A pointer wrong");
  const high = engineOn({ a5_harm_pathways: [HIGH_G] });
  assert((high.blocks["iv_determination:11"] ?? "").includes("Establish and implement a safeguard addressing the material risk: (G)"), "High gap Condition lost");
});

// ── 5: unassessed-only ───────────────────────────────────────────────────────

Deno.test("doc154 §5 — a benefit plus only unassessable risks never renders a cell conclusion or a 'low level' balance row", () => {
  const r = engineOn({ a5_harm_pathways: [UNASSESSED] });
  assertEquals(r.exec_panel.disposition, "additional information required");
  assert((r.factors["exec_determination"] ?? "").startsWith(RISK52_FIXED.band4_provisional_unassessed_only), r.factors["exec_determination"]);
  assert(!(r.factors["exec_determination"] ?? "").includes("outweigh"), "cell conclusion leaked into the exec determination");
  assert((r.factors["determination_text"] ?? "").includes("cannot yet be determined"), r.factors["determination_text"]);
  assert(!(r.factors["determination_text"] ?? "").includes("no remaining risk sits above the low level"), "Low cell materiality text leaked");
  assert(r.tables["iv_determination:8"]!.rows.some((x) => x[1] === "No risk assessed — likelihood or severity not recorded"), JSON.stringify(r.tables["iv_determination:8"]));
});

// ── 7–11: promise parity ─────────────────────────────────────────────────────

Deno.test("doc154 §7 — the none-confirmed choice-architecture sentence has its Follow-Up", () => {
  const r = engineOn({ choice_architecture_check: ["None of the above can be confirmed"] });
  assert((r.factors["choice_architecture"] ?? "").includes("confirming them appears among the Follow-ups"), "promise sentence changed");
  assert((r.blocks["iv_determination:12"] ?? "").includes("Confirm the choice-architecture facts the assessment checks"), "follow-up missing");
});

Deno.test("doc154 §8 — a planned disclosure draws the Recommendation the § 3.C sentence promises", () => {
  const r = engineOn({
    q12_notice_at_collection: "Yes, partial coverage",
    activity_disclosures: [{ disclosure_content: "A just-in-time profiling notice on first login", disclosure_method: "In-app", status: "Planned" }],
  });
  assert((r.factors["notice_application"] ?? "").includes("completion appears among the Recommendations in § 4.D"), r.factors["notice_application"]);
  assert((r.blocks["iv_determination:13"] ?? "").includes("Complete the planned disclosure “A just-in-time profiling notice on first login”"), r.blocks["iv_determination:13"]);
});

Deno.test("doc154 §9 — an incompletely described ADMT draws the Follow-Up the § 3.E lead promises", () => {
  const r = engineOn({ q18_admt_use: "Yes", q19_admt_description: "A churn model that flags accounts.", admt_role_type: "The ADMT is a substantial factor in a human decision" });
  assert((r.factors["admt_conclusion"] ?? "").includes("completing the description appears among the Follow-ups"), "promise sentence changed");
  assert((r.blocks["iv_determination:12"] ?? "").includes("Complete the description of the automated decisionmaking technology — its logic and its output and how the output is used"), r.blocks["iv_determination:12"]);
});

Deno.test("doc154 §10–11 — overall-only retention and an empty retention row both complete by Follow-Up", () => {
  const overall = engineOn({
    q4_pi_categories: ["Contact identifiers (name, email, phone)"],
    i2_retention_period: "24 months from collection",
    i2_retention_criteria: "Fixed period from collection",
  });
  assert((overall.factors["retention_basis"] ?? "").includes("remains to be established category by category; identifying it appears among the Follow-Ups in § 4.D"), overall.factors["retention_basis"]);
  assert((overall.blocks["iv_determination:12"] ?? "").includes("for each category of personal information the Activity processes; the Company states retention for the Activity as a whole only"), "overall-only follow-up missing");
  const empty = engineOn({
    q4_pi_categories: ["Contact identifiers (name, email, phone)", "Device identifiers (IP, cookies, device IDs)"],
    retention_by_pi_category: [
      { pi_category: "Device identifiers (IP, cookies, device IDs)", retention_period: "13 months" },
      { pi_category: "Contact identifiers (name, email, phone)", retention_period: "", retention_criteria: "" },
    ],
  });
  const row = empty.tables["ii_information:14"]!.rows.find((x) => x[0].startsWith("Contact identifiers"));
  assertEquals(row?.[1], "Not stated — see the Follow-Ups in § 4.D");
  assert((empty.blocks["iv_determination:12"] ?? "").includes("for “Contact identifiers (name, email, phone)”"), "empty-row follow-up missing");
});

// ── 12–20: answered negatives and misstatements ──────────────────────────────

Deno.test("doc154 §13 — approver_authority_confirmed 'No' is the Company's answer, in § 5 (engine) and § 5.A (assembler)", () => {
  const intake: Bag = {
    assessment_reviewers_approvers: [{ name: "Sandra Kowalski", position: "CPO", role: "Approved" }],
    approver_authority_confirmed: "No",
    a9_approval_date: "2026-08-28",
  };
  const r = engineOn(intake);
  assert((r.factors["approval_follow_up"] ?? "").includes("the Company records that none is confirmed to have authority"), r.factors["approval_follow_up"]);
  assert(!(r.factors["approval_follow_up"] ?? "").includes("remains outstanding"), "answered No rendered as unanswered");
  const text = docText(intake);
  assert(text.includes(RISK52_FIXED.x_approval_authority_no), "§ 5.A No sentence missing");
  assert(!text.includes(`${RISK52_FIXED.x_approval_authority} No.`), "confirming label followed by No");
});

Deno.test("doc154 §14 — in-progress, planned, and no-formal-process controls are not credited and are weak", () => {
  const r = engineOn({
    q6_right_know_multi: ["No formal process in place"],
    q9_opt_out: "In progress",
    q18_admt_use: "Yes",
    q19_admt_description: "A churn model.",
    q20_admt_opt_out: "Planned for implementation",
  });
  const rows = r.tables["iii_analysis:12"]!.rows;
  assertEquals(rows.find((x) => x[0] === "Right to know")?.[2], "Reduced — no formal process");
  assertEquals(rows.find((x) => x[0] === "Opt-out of sale or sharing")?.[2], "Not credited — in progress");
  assertEquals(rows.find((x) => x[0] === "ADMT opt-out")?.[2], "Not credited — planned");
  const recs = r.blocks["iv_determination:13"] ?? "";
  assert(recs.includes("the right-to-know process") && recs.includes("the opt-out mechanism") && recs.includes("the ADMT opt-out"), recs);
});

Deno.test("doc154 §15 — a policy reviewed 12–24 months ago is a notice gap, not 'current'", () => {
  const r = engineOn({ q11_policy_review: "12–24 months ago", q12_notice_at_collection: "Yes, covers all collection points", q13_notice_content: "Yes, all three" });
  const t = r.factors["notice_application"] ?? "";
  assert(t.includes("last reviewed 12 to 24 months ago"), t);
  assert(!t.includes("the privacy policy is current"), "stale policy called current");
});

Deno.test("doc154 §16 — three of four purpose facets: confirmed (the ratified RK3-D threshold) but the sentence names the three, never all four", () => {
  const r = engineOn({
    purpose_specificity_facts: [
      "The specific product, service, or operation the processing supports",
      "The categories of personal information involved",
      "The categories of consumers affected",
    ],
  });
  const t = r.factors["purpose_specificity_analysis"] ?? "";
  assert(t.includes("three of the four facets the assessment checks") && t.includes("the assessment proceeds on the Company’s formulation"), t);
  assert(!t.includes("and the intended outcome"), "asserted the unconfirmed fourth facet");
  assert(!(r.blocks["iv_determination:12"] ?? "").includes("Sharpen the stated Purpose"), "three facets must not draw the follow-up (RK3-D threshold)");
});

Deno.test("doc154 §17 — an empty recipients array is 'not recorded' unless the Company declared none", () => {
  const absent = engineOn({ recipients: [] });
  assert((absent.factors["recipients_summary"] ?? "").startsWith("The information provided does not identify the service providers"), absent.factors["recipients_summary"]);
  assert((absent.blocks["iv_determination:12"] ?? "").includes("Identify the service providers, contractors, and third parties"), "recipient follow-up missing");
  const declared = engineOn({ recipients: [], recipients_none_declared: true });
  assertEquals(declared.factors["recipients_summary"], RISK52_FIXED.recipients_none);
});

Deno.test("doc154 §18–20 — the § 4.A closer states the Company's record; 'Other criteria' resolves to the detail; N/A stages do not print", () => {
  const r = engineOn({
    a5_harm_pathways: [LOW],
    i2_retention_period: "24 months",
    i2_retention_criteria: "Other criteria (described below)",
    i2_retention_detail: "Deleted when the account closes and the statutory hold ends",
    processing_entry_point: "A visitor loads a client page",
    processing_methods: { collection_method: "The pixel records events", use_method: "N/A", disclosure_method: "n/a" },
    processing_result: "Audience segments",
  });
  const closer = r.factors["risk_paragraphs"] ?? "";
  assert(closer.includes("the Company identifies no risk in the information provided; no risk in those categories is assessed here"), closer);
  assert(!closer.includes("no credible path"), "affirmative finding from silence survived");
  assert((r.factors["retention_basis"] ?? "").includes("“Deleted when the account closes and the statutory hold ends”"), r.factors["retention_basis"]);
  assert(!(r.factors["retention_basis"] ?? "").includes("Other criteria (described below)"), "pointer option quoted as the basis");
  const seq = r.factors["operational_sequence"] ?? "";
  assert(seq.includes("Collection — “The pixel records events”") && !seq.includes("N/A") && !seq.includes("n/a"), seq);
});

// ── 21–24: one state across surfaces ─────────────────────────────────────────

Deno.test("doc154 §21 — a date carried on a reviewer row is the same date on every surface", () => {
  const intake: Bag = {
    assessment_reviewers_approvers: [{ name: "Priya Sundaram", position: "DGC", role: "Both", date: "2026-08-20" }],
    approver_authority_confirmed: "Yes",
  };
  assertEquals(resolveRecordedApprovalDate(intake), "2026-08-20");
  const r = engineOn(intake);
  assert((r.factors["approval_sufficiency_conclusion"] ?? "").includes("reviewed and approved on 2026-08-20"), r.factors["approval_sufficiency_conclusion"]);
  const table = deriveReviewApprovalTable(intake, "2026-09-03");
  assertEquals(table.rows[0][4], "2026-08-20");
  assert(docText(intake).includes("Approval date: 2026-08-20"), "§ 5.A narrative lacks the row-carried date");
});

Deno.test("doc154 §22 — the evaluation-with-facts predicate is one function on both surfaces", () => {
  const onlyOutput: Bag = { q18_admt_use: "In evaluation", admt_output: "A propensity score" };
  const onlyFacts: Bag = { q18_admt_use: "In evaluation", human_review_facts: ["There is no human review"] };
  for (const intake of [onlyOutput, onlyFacts]) {
    assert(admtEvaluationActiveFor(intake), "predicate false");
    assert(deriveAdmtTechnicalFacts(intake as never) !== null, "Appendix E absent while § 3.E renders");
    assert((engineOn(intake).factors["admt_intro"] ?? "").includes("under evaluation rather than deployed"), "§ 3.E absent while Appendix E renders");
  }
});

Deno.test("doc154 §23 — Appendix B attachment respects the trigger reconciliation", () => {
  const report = { scope_and_triggers: { narrative: [ENGAGED_B3, ENGAGED_B2] } };
  const fired = deriveRiskFiredStates(report as never, { q18_admt_use: "In evaluation", q19_admt_description: "loan eligibility model", q15_sensitive_pi: "Unsure" });
  assert(!fired.has("7150(b)(3)") && !fired.has("7150(b)(2)"), [...fired].join(","));
  const legacy = deriveRiskFiredStates(report as never);
  assert(legacy.has("7150(b)(3)"), "intake-less call must keep the raw behaviour for stored payloads");
});

Deno.test("doc154 §24 — the structured relationship answer establishes the b(4) capacity", () => {
  const r = engineOn({ q5b_profiling_observation: "Yes", consumer_relationship_context: "Employees or job applicants", primary_activity_purpose: "Scoring of platform usage." });
  assert(!(r.blocks["iv_determination:12"] ?? "").includes("Describe the population systematically observed"), "false capacity follow-up");
});

// ── 25–28: collected fields now read ─────────────────────────────────────────

Deno.test("doc154 §25 — risk_pathway_ids link a safeguard to every risk it names", () => {
  const g: Bag = { harm: "(E) Economic harms", risk_pathway_ids: ["(E) Economic harms", "(G) Reputational harms"], safeguard: "A fairness review of segmentation logic is performed quarterly", safeguard_status: "Implemented and tested" };
  assertEquals(safeguardHarms(g), ["(E) Economic harms", "(G) Reputational harms"]);
  const r = engineOn({ a5_harm_pathways: [HIGH_G], a6_safeguards: [g] });
  const ledger = r.tables["iv_determination:1"]!.rows.find((x) => x[0] === "(G) Reputational harms")!;
  assert(ledger[5].startsWith("Moderate (reduced)"), JSON.stringify(ledger));
});

Deno.test("doc154 §26 — effectiveness_basis prints in the register and contradictions draw a Follow-Up", () => {
  const r = engineOn({
    a5_harm_pathways: [HIGH_G],
    a6_safeguards: [{ harm: "(G) Reputational harms", safeguard: "An escalation process", safeguard_status: "Implemented and tested", effectiveness_basis: "No effectiveness evidence" }],
  });
  assert((r.blocks["iv_determination:12"] ?? "").includes("Reconcile the status and evidence recorded for the safeguard “An escalation process”"), r.blocks["iv_determination:12"]);
  const res = assembleRiskSkeletonDocument({} as never, { processing_status: "Ongoing", ...BENEFIT, a5_harm_pathways: [HIGH_G], a6_safeguards: [{ harm: "(G) Reputational harms", safeguard: "An escalation process", safeguard_status: "Implemented and tested", effectiveness_basis: "No effectiveness evidence" }] } as never);
  assert(skeletonDocumentToText(res.document).includes("[Implemented and tested; basis: No effectiveness evidence]"), "basis absent from the register");
});

Deno.test("doc154 §27–28 — under-16, SPI basis, and SPI volume answers are stated", () => {
  const r = engineOn({
    q15b_under16_knowledge: "Yes — we knowingly process under-16 data",
    q15_sensitive_pi: "Yes",
    q4_pi_categories: ["Health or medical information"],
    q17_sensitive_basis: "Consent",
    q15c_spi_volume: "50,000 or more",
  });
  const d = r.factors["information_profile"] ?? "";
  assert(d.includes("knowingly processes the personal information of consumers under 16"), d);
  assert(d.includes("basis for processing sensitive personal information as “Consent”"), d);
  assert(d.includes("volume of sensitive personal information as “50,000 or more”"), d);
  assert((r.blocks["iv_determination:6"] ?? "").includes("consumers under 16 (§ 2.D)"), "§ 4.B bullet missing");
  const unsure = engineOn({ q15b_under16_knowledge: "Unsure" });
  assert((unsure.blocks["iv_determination:12"] ?? "").includes("consumers under 16; the Company answers “Unsure”"), "under-16 follow-up missing");
});

// ── 29–35: text logic, leak, cadence, wording ────────────────────────────────

Deno.test("doc154 §29 — the q4 'Other' category never produces a scope conflict; a real stem still does", () => {
  const oos = "Payment processing is handled under a separate activity. Other processing is not part of this assessment.";
  const other = engineOn({
    out_of_scope_confirmation: "The affected information is also processed for other activities not covered by this assessment",
    out_of_scope_activities: oos,
    q4_pi_categories: ["Other", "General location (city, region, ZIP, IP-derived)"],
  });
  assert(!(other.blocks["iv_determination:12"] ?? "").includes("Reconcile the Activity’s information scope"), "false conflict on Other/General");
  const fin = engineOn({
    out_of_scope_confirmation: "The affected information is also processed for other activities not covered by this assessment",
    out_of_scope_activities: oos,
    q4_pi_categories: ["Financial information"],
  });
  assert((fin.blocks["iv_determination:12"] ?? "").includes("“Financial information”-related processing"), "real conflict lost");
});

Deno.test("doc154 §30–31 — one status Follow-Up per planned row; no 'Track each planned safeguard' recommendation", () => {
  const r = engineOn({
    a5_harm_pathways: [HIGH_G],
    a6_safeguards: [{ harm: "(G) Reputational harms", safeguard: "A fairness review is conducted quarterly since Q1 2024", safeguard_status: "Planned, not yet implemented" }],
  });
  const fu = r.blocks["iv_determination:12"] ?? "";
  assert(fu.includes("the target period recorded for it (through 2024-03-31) has passed"), fu);
  assert(!fu.includes("described in operating terms"), "duplicate wording follow-up");
  assert(!(r.blocks["iv_determination:13"] ?? "").includes("Track each planned safeguard"), "duplicate recommendation survived");
});

Deno.test("doc154 §32–34 — no contract keys leak; counts read as words; the cadence sentence renders on a first assessment", () => {
  const r = engineOn({
    a2_necessity_set: [{ element: "Phone number", necessity: "Collected but not necessary to the stated purpose" }],
    i9_has_existing_dpia: "No",
  }, []);
  const rc = runRiskFactorEngine(
    { processing_status: "Ongoing", ...BENEFIT, a5_harm_pathways: [LOW] } as never,
    { record_complete: { value: false, failed_conditions: ["contract_incomplete"], empty_required_keys: ["i2_retention_period", "a9_approval_date"] } } as never,
    "2026-09-03",
  );
  const fu = rc.blocks["iv_determination:12"] ?? "";
  assert(fu.includes("two asked questions remain unanswered"), fu);
  assert(!fu.includes("i2_retention_period"), "contract key leaked");
  assert((r.factors["necessity_conclusion"] ?? "").includes("one element is not shown"), r.factors["necessity_conclusion"]);
  assert((r.factors["review_cadence"] ?? "").includes("This is the first assessment of the Activity"), r.factors["review_cadence"]);
});

Deno.test("doc154 §35 — the proceed-with-conditions plain-meaning names the Activity as a whole", () => {
  assert(RISK_PLAIN_MEANING["proceed with conditions"].endsWith("none requires suspending the Activity as a whole."));
});

Deno.test("doc154 — the grader instrument names the new designed states under the appended tag", async () => {
  const { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } = await import("../../../supabase/functions/_shared/grader/context.ts");
  assert(GRADER_CONTEXT_VERSION.endsWith("+risk-code-review-2026-09-03"), GRADER_CONTEXT_VERSION);
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-2026-08-28-skeleton-cal-3-item204"), "calibration prefix lost");
  for (const needle of ["DOC 154 (code-review remediation)", "under evaluation rather than deployed", "does not record that there are none", "Numbers under ten render as words"]) {
    assert(SHARED_GRADER_CONTEXT.includes(needle), `context missing: ${needle}`);
  }
});
