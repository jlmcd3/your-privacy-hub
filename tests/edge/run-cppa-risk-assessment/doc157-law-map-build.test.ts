// DOC 157 (2026-09-03) — CPPA Risk model-vs-law build (doc 156 change list,
// CEO-ratified 2026-09-03). One permanent regression test per built item:
//
//   §1   § 7001(bbb)(4) under-16 elevation of § 7150(b)(2) — gate, engine
//        (row, § 2.D, § 3.A, Follow-Up), fired states, applicable-triggers slot;
//        an "Unsure" plus a "Yes" under-16 answer is engaged, never unresolved.
//   §2   Categorical § 7001(ddd) answer — significant / advertising only /
//        outside every category / (ddd)(2) housing exclusion — at the gate, the
//        engine, the fired states, and Appendix E; the classifier stays the
//        fallback; a contradicting description draws the reconcile Follow-Up
//        and keeps the conservative assessment requirement.
//   §3   b(6): the categorical answer resolves the trained model's decision.
//   §4   Role-type labels: adopted § 7001(e)(1) wording; legacy literals kept.
//   §5   b(4) capacity: the two new relationship-context options.
//   §6   § 4.C: the Company's own benefits-outweigh answer and § 7152(a)(7)
//        decision render beside the determination; conflicts draw Follow-Ups;
//        neither feeds the ratified table.
//   §7   Sensitive-PI taxonomy: the four § 7001(bbb)(1) categories, the split,
//        and under-16 data.
//   §8   Parity: enums ≡ contract ≡ resolver literals; templates; instrument;
//        finalization contract; rendered-document seams and register.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import {
  assembleRiskSkeletonDocument,
  deriveAdmtTechnicalFacts,
  deriveApplicable7150Triggers,
  deriveRiskFiredStates,
} from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { evaluateCppaRiskGates } from "../../../supabase/functions/run-cppa-risk-assessment/_local/ltp/gate-eval.ts";
import {
  HOUSING_DECISION_BASIS_OPTS as R_HDB,
  resolveAdmtSignificantDecision,
  SIGNIFICANT_DECISION_CATEGORY_OPTS as R_SDC,
} from "../../../supabase/functions/_shared/ltp/admt-significant-decision.ts";
import { CA_SPI_CATEGORY_KEYS } from "../../../supabase/functions/_shared/ltp/ca-pi-taxonomy.ts";
import {
  ADMT_ROLE_TYPE_OPTS as C_ROLE,
  CONSUMER_RELATIONSHIP_CONTEXT_OPTS as C_CTX,
  CPPA_RISK_INLINE_LISTS,
  cppaRiskContract,
  HOUSING_DECISION_BASIS_OPTS as C_HDB,
  Q21_TRAINING_OPTS,
  SIGNIFICANT_DECISION_CATEGORY_OPTS as C_SDC,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import * as formEnums from "../../../src/pages/CPPARiskAssessment.enums.ts";
import { PASS2_TEMPLATES } from "../../../supabase/functions/run-cppa-risk-assessment/_local/ltp/content/pass2-templates.ts";
import { cppaRiskFinalizationContract } from "../../../supabase/functions/_tests/intake-contracts/cppa-risk-assessment-finalization.ts";

type Bag = Record<string, unknown>;

const BENEFIT: Bag = {
  benefit_consumer_identified: "Yes",
  a4_benefit_consumer: "Consumers receive shipment updates without re-entering details",
  a4_benefit_consumer_fact: "Support tickets about lost shipments fell 30% in the pilot",
};
const LOW: Bag = { harm: "(H) Psychological harms", likelihood: "Unlikely", severity: "Minimal", data_involved: "Contact identifiers", actor: "Internal analytics team", cause: "Over-notification" };
const HIGH_G: Bag = { harm: "(G) Reputational harms", likelihood: "Possible", severity: "Significant", data_involved: "Behavioral profiles", actor: "Media", cause: "Disclosure gap" };

const ENGAGED_B2 = "Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const ENGAGED_B3 = "Engaged — 11 CCR § 7150(b)(3) (using ADMT for a significant decision concerning a consumer): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const ENGAGED_B4 = "Engaged — 11 CCR § 7150(b)(4) (using automated processing based on systematic observation in worker, student, or applicant contexts): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const ENGAGED_B6 = "Engaged — 11 CCR § 7150(b)(6) (processing personal information to train an ADMT or biometric-recognition technology): the record supports this trigger and this activity falls within the risk-assessment obligation.";

const HIRING = R_SDC[3];
const HOUSING = R_SDC[1];
const ADVERTISING = R_SDC[7];
const NONE = R_SDC[8];
const UNDER16_YES = "Yes — we knowingly process under-16 data";

function base(intake: Bag): Bag {
  return { processing_status: "Ongoing", ...BENEFIT, a5_harm_pathways: [LOW], ...intake };
}
function engineOn(intake: Bag, scope: string[] = []) {
  return runRiskFactorEngine(base(intake) as never, { scope_and_triggers: { narrative: scope } } as never, "2026-09-03");
}
function docText(intake: Bag, scope: string[] = []): string {
  const res = assembleRiskSkeletonDocument({ scope_and_triggers: { narrative: scope } } as never, base(intake) as never);
  return skeletonDocumentToText(res.document);
}
const rowsOf = (r: ReturnType<typeof engineOn>) => r.tables["executive_summary:3"]?.rows ?? [];
const followUps = (r: ReturnType<typeof engineOn>) => r.blocks["iv_determination:12"] ?? "";
const gateOf = (intake: Bag, id: string) => evaluateCppaRiskGates(intake).find((g) => g.gate_id === id);

const BANNED = /\b(the record (shows|reflects|indicates|demonstrates|establishes)|on this record|structured record|risk pathway)\b/i;

// ── §1 — § 7001(bbb)(4) under-16 elevation ───────────────────────────────────

Deno.test("doc157 §1 (gate) — a 'Yes' under-16 answer passes the sensitive-PI gate when q15 is No, Unsure, or absent, with the (bbb)(4) reason", () => {
  for (const q15 of ["No", "Unsure", undefined]) {
    const g = gateOf({ q15_sensitive_pi: q15, q15b_under16_knowledge: UNDER16_YES }, "G.applicability.sensitive_pi");
    assertEquals(g?.outcome, "pass", `q15=${q15}`);
    assert((g?.reason ?? "").startsWith("b2_under16_elevation"), g?.reason);
  }
  // A plain "Yes" still passes with no elevation reason; a "No" with no under-16 knowledge still blocks.
  assertEquals(gateOf({ q15_sensitive_pi: "Yes", q15b_under16_knowledge: "No — we do not knowingly process under-16 data" }, "G.applicability.sensitive_pi")?.outcome, "pass");
  assertEquals(gateOf({ q15_sensitive_pi: "No", q15b_under16_knowledge: "No — we do not knowingly process under-16 data" }, "G.applicability.sensitive_pi")?.outcome, "block");
});

Deno.test("doc157 §1 (engine) — q15 'No' + under-16 'Yes' engages b(2) from the intake alone: row, qualifying fact, § 2.D, § 3.A, Follow-Up; assessment required", () => {
  const r = engineOn({ q15_sensitive_pi: "No", q15b_under16_knowledge: UNDER16_YES, q4_pi_categories: ["Contact identifiers (name, email, phone)"] }, []);
  const b2 = rowsOf(r).find((x) => x[0].includes("§ 7150(b)(2)"));
  assert(b2 && b2[1].startsWith("Engaged —"), JSON.stringify(rowsOf(r)));
  assert(b2![1].includes("actual knowledge that it processes the personal information of consumers under 16") && b2![1].includes("§ 7001(bbb)(4)"), b2![1]);
  assert(b2![1].includes("answers “No” to the general sensitive-personal-information question"), b2![1]);
  assertEquals(r.exec_panel.triggers_engaged_count, 1);
  assert(r.exec_panel.assessment_required, "assessment_required lost on an elevated record");
  assert((r.factors["trigger_application"] ?? "").includes("consumers under 16"), r.factors["trigger_application"]);
  assert((r.factors["information_profile"] ?? "").includes("under 11 CCR § 7001(bbb)(4) that information is sensitive personal information"), r.factors["information_profile"]);
  assert(!(r.factors["information_profile"] ?? "").includes("No sensitive personal information is identified"), "elevated record rendered as none identified");
  assert(followUps(r).includes("Complete the sensitive-personal-information record for the under-16 information"), followUps(r));
});

Deno.test("doc157 §1 — q15 'Unsure' + under-16 'Yes' is engaged, never the unresolved state", () => {
  const r = engineOn({ q15_sensitive_pi: "Unsure", q15b_under16_knowledge: UNDER16_YES }, [ENGAGED_B2]);
  const rows = rowsOf(r);
  assert(!rows.some((x) => x[1].startsWith("Additional Information Required — the Company answers “Unsure”")), JSON.stringify(rows));
  assert(rows.some((x) => x[0].includes("(b)(2)") && x[1].startsWith("Engaged —")), JSON.stringify(rows));
  assert(!followUps(r).includes("Determine whether the Activity processes sensitive personal information"), "unresolved Follow-Up fired on an elevated record");
  assertEquals(r.exec_panel.triggers_engaged_count, 1);
});

Deno.test("doc157 §1 (assembler) — fired states and the applicable-triggers slot carry the elevated b(2) without a narrative line", () => {
  const report = { scope_and_triggers: { narrative: [] as string[] } };
  const intake = base({ q15_sensitive_pi: "No", q15b_under16_knowledge: UNDER16_YES });
  const fired = deriveRiskFiredStates(report as never, intake as never);
  assert(fired.has("7150(b)(2)") && fired.has("trigger_engaged"), [...fired].join(","));
  const slot = deriveApplicable7150Triggers(report as never, intake as never) ?? "";
  assert(slot.includes("7150(b)(2)"), slot);
  // Unsure without under-16 knowledge stays suppressed (doc 154 item 23).
  const unsure = deriveRiskFiredStates({ scope_and_triggers: { narrative: [ENGAGED_B2] } } as never, base({ q15_sensitive_pi: "Unsure" }) as never);
  assert(!unsure.has("7150(b)(2)"), "Unsure b(2) attached persuasive authority");
});

// ── §2 — categorical § 7001(ddd) answer ──────────────────────────────────────

Deno.test("doc157 §2 (resolver) — categorical answer governs; text classifier is the fallback; exclusions apply", () => {
  assertEquals(resolveAdmtSignificantDecision({ q19a_decision_categories: [HIRING], q19_admt_description: "Ad targeting only." }).cls, "significant");
  assertEquals(resolveAdmtSignificantDecision({ q19a_decision_categories: [ADVERTISING], q19_admt_description: "" }).cls, "advertising_only");
  assertEquals(resolveAdmtSignificantDecision({ q19a_decision_categories: [NONE] }).cls, "not_significant");
  assertEquals(resolveAdmtSignificantDecision({ q19a_decision_categories: [HOUSING], q19b_housing_basis: R_HDB[0] }).cls, "housing_excluded");
  assertEquals(resolveAdmtSignificantDecision({ q19a_decision_categories: [HOUSING], q19b_housing_basis: R_HDB[1] }).cls, "significant");
  assertEquals(resolveAdmtSignificantDecision({ q19a_decision_categories: [HOUSING, HIRING], q19b_housing_basis: R_HDB[0] }).cls, "significant");
  // A category selected alongside a closing option wins (exclusions cover SOLELY-advertising use).
  assertEquals(resolveAdmtSignificantDecision({ q19a_decision_categories: [ADVERTISING, HIRING] }).cls, "significant");
  // Fallback: no categorical answer → the doc-137/138 text classes.
  const text = resolveAdmtSignificantDecision({ q19_admt_description: "The model decides loan eligibility for applicants." });
  assertEquals(text.cls, "significant");
  assertEquals(text.source, "text");
  assertEquals(resolveAdmtSignificantDecision({ q19_admt_description: "Audience segmentation for ad targeting." }).cls, "advertising_only");
  assertEquals(resolveAdmtSignificantDecision({ q19_admt_description: "" }).cls, "unresolved");
  // Off-list strings are ignored (fallback to text).
  assertEquals(resolveAdmtSignificantDecision({ q19a_decision_categories: ["Bogus"], q19_admt_description: "" }).source, "text");
});

Deno.test("doc157 §2 (gate) — the four categorical outcomes carry distinct reasons", () => {
  const G = "G.applicability.admt_significant_decision";
  const desc = "A model that ranks applicants.";
  assertEquals(gateOf({ q18_admt_use: "Yes", q19_admt_description: desc, q19a_decision_categories: [HIRING] }, G)?.outcome, "pass");
  const adv = gateOf({ q18_admt_use: "Yes", q19_admt_description: desc, q19a_decision_categories: [ADVERTISING] }, G);
  assert(adv?.outcome === "block" && (adv.reason ?? "").startsWith("b3_advertising_exclusion_fsor_7001_ddd_6"), adv?.reason);
  const none = gateOf({ q18_admt_use: "Yes", q19_admt_description: desc, q19a_decision_categories: [NONE] }, G);
  assert(none?.outcome === "block" && (none.reason ?? "").startsWith("b3_not_significant_category"), none?.reason);
  const housing = gateOf({ q18_admt_use: "Yes", q19_admt_description: desc, q19a_decision_categories: [HOUSING], q19b_housing_basis: R_HDB[0] }, G);
  assert(housing?.outcome === "block" && (housing.reason ?? "").startsWith("b3_housing_availability_exclusion_7001_ddd_2"), housing?.reason);
  // Text fallback unchanged (doc 148): a category-naming description passes; an advertising one blocks.
  assertEquals(gateOf({ q18_admt_use: "Yes", q19_admt_description: "The model decides loan eligibility for applicants." }, G)?.outcome, "pass");
  assert((gateOf({ q18_admt_use: "Yes", q19_admt_description: "Audience segmentation for ad targeting." }, G)?.reason ?? "").startsWith("b3_advertising_exclusion"));
});

Deno.test("doc157 §2 (engine) — categorical 'significant' engages with the category named; the three non-engagements render rows and § 3.A, and do not require an assessment alone", () => {
  const desc = "A model that ranks applicants.";
  const sig = engineOn({ q18_admt_use: "Yes", q19_admt_description: desc, q19a_decision_categories: [HIRING] }, [ENGAGED_B3]);
  const b3 = rowsOf(sig).find((x) => x[0].includes("§ 7150(b)(3)"));
  assert(b3 && b3[1].startsWith("Engaged —") && b3[1].includes("records the decision it makes as Hiring"), JSON.stringify(rowsOf(sig)));
  assert(sig.exec_panel.assessment_required);

  const none = engineOn({ q18_admt_use: "Yes", q19_admt_description: desc, q19a_decision_categories: [NONE] }, [ENGAGED_B3]);
  const noneRow = rowsOf(none).find((x) => x[0].includes("§ 7150(b)(3)"));
  assert(noneRow && noneRow[1].startsWith("Not engaged — the Company answers “Yes” to using automated decisionmaking technology and records that the decision it makes is not within any category"), JSON.stringify(rowsOf(none)));
  assertEquals(none.exec_panel.triggers_engaged_count, 0);
  assertEquals(none.exec_panel.assessment_required, false);
  assert((none.factors["trigger_application"] ?? "").includes("not within any category § 7001(ddd) defines"), none.factors["trigger_application"]);
  assert(!followUps(none).includes("Reconcile the decision category"), "reconcile Follow-Up fired without a contradiction");

  const housing = engineOn({ q18_admt_use: "Yes", q19_admt_description: desc, q19a_decision_categories: [HOUSING], q19b_housing_basis: R_HDB[0] }, [ENGAGED_B3]);
  const hRow = rowsOf(housing).find((x) => x[0].includes("§ 7150(b)(3)"));
  assert(hRow && hRow[1].startsWith("Not engaged — the Company records that the technology provides or denies housing") && hRow[1].includes("§ 7001(ddd)(2)"), JSON.stringify(rowsOf(housing)));
  assertEquals(housing.exec_panel.assessment_required, false);

  // Categorical advertising-only: the doc-148 row, without the narrative line, and no assessment requirement.
  const adv = engineOn({ q18_admt_use: "Yes", q19_admt_description: desc, q19a_decision_categories: [ADVERTISING] }, []);
  const aRow = rowsOf(adv).find((x) => x[0].includes("§ 7150(b)(3)"));
  assert(aRow && aRow[1].startsWith("Not engaged —") && aRow[1].includes("advertising"), JSON.stringify(rowsOf(adv)));
  assertEquals(adv.exec_panel.assessment_required, false);
});

Deno.test("doc157 §2 — a description that names a category the Company did not select draws the reconcile Follow-Up and keeps the conservative assessment requirement", () => {
  const r = engineOn({ q18_admt_use: "Yes", q19_admt_description: "The model decides loan eligibility for applicants.", q19a_decision_categories: [NONE] }, [ENGAGED_B3]);
  assert(followUps(r).includes("Reconcile the decision category recorded for the automated decisionmaking technology (“None of these categories”)"), followUps(r));
  assert((r.factors["trigger_application"] ?? "").includes("categorical answer does not select"), r.factors["trigger_application"]);
  assert(r.exec_panel.assessment_required, "conservative Yes lost on a contradicted categorical record");
  assertEquals(r.exec_panel.triggers_engaged_count, 0);
});

Deno.test("doc157 §2 (assembler) — fired states follow the resolver; Appendix E states the categorical determination", () => {
  const report = { scope_and_triggers: { narrative: [ENGAGED_B3] } };
  const sig = deriveRiskFiredStates(report as never, base({ q18_admt_use: "Yes", q19_admt_description: "A model.", q19a_decision_categories: [HIRING] }) as never);
  assert(sig.has("7150(b)(3)"));
  const none = deriveRiskFiredStates(report as never, base({ q18_admt_use: "Yes", q19_admt_description: "A model.", q19a_decision_categories: [NONE] }) as never);
  assert(!none.has("7150(b)(3)"), "categorical none attached b(3) authority");
  const facts = deriveAdmtTechnicalFacts(base({
    q18_admt_use: "Yes",
    q19_admt_description: "The system makes a significant decision about each user.",
    q19a_decision_categories: [NONE],
    admt_role_type: C_ROLE[0],
  }) as never);
  const det = facts?.rows.find((x) => x[0] === "EUP determination")?.[1] ?? "";
  assert(det.includes("outside every category enumerated in § 7001(ddd)"), det);
  const cat = facts?.rows.find((x) => x[0] === "Decision category (as recorded)")?.[1] ?? "";
  assertEquals(cat, NONE);
});

// ── §3 — b(6) ────────────────────────────────────────────────────────────────

Deno.test("doc157 §3 — the categorical answer resolves the trained model's decision for b(6); without it the qualifier and Follow-Up stand", () => {
  const resolved = engineOn({ q18_admt_use: "No", q18b_admt_training: Q21_TRAINING_OPTS[0], q19a_decision_categories: [HIRING] }, [ENGAGED_B6]);
  const row = rowsOf(resolved).find((x) => x[0].includes("§ 7150(b)(6)"));
  assert(row && row[1].startsWith("Engaged —") && !row[1].includes("is not identified"), JSON.stringify(rowsOf(resolved)));
  assert(!followUps(resolved).includes("Identify the significant decision the technology being trained"), followUps(resolved));
  const open = engineOn({ q18_admt_use: "No", q18b_admt_training: Q21_TRAINING_OPTS[0] }, [ENGAGED_B6]);
  const openRow = rowsOf(open).find((x) => x[0].includes("§ 7150(b)(6)"));
  assert(openRow && openRow[1].includes("is not identified"), JSON.stringify(rowsOf(open)));
  assert(followUps(open).includes("Identify the significant decision the technology being trained"), followUps(open));
  // The relabelled second limb still counts as a "Yes".
  const limb2 = engineOn({ q18_admt_use: "No", q18b_admt_training: Q21_TRAINING_OPTS[1] }, [ENGAGED_B6]);
  assertEquals(limb2.exec_panel.triggers_engaged_count, 1);
  // A categorical answer naming no significant-decision category beside a
  // "training for significant decisions" answer is a contradiction, not an
  // unidentified decision: reconcile Follow-Up, trigger still engaged.
  const contra = engineOn({ q18_admt_use: "No", q18b_admt_training: Q21_TRAINING_OPTS[0], q19a_decision_categories: [NONE] }, [ENGAGED_B6]);
  const cRow = rowsOf(contra).find((x) => x[0].includes("§ 7150(b)(6)"));
  assert(cRow && cRow[1].includes("names no significant-decision category") && !cRow[1].includes("is not identified"), JSON.stringify(rowsOf(contra)));
  assert(followUps(contra).includes("Reconcile the § 7150(b)(6) answer that personal information trains ADMT for significant decisions"), followUps(contra));
  assert(!followUps(contra).includes("Identify the significant decision the technology being trained"), "unidentified Follow-Up fired on a contradicted record");
  assertEquals(contra.exec_panel.triggers_engaged_count, 1);
});

// ── §4 — role-type labels ────────────────────────────────────────────────────

Deno.test("doc157 §4 — the adopted § 7001(e)(1) role labels render; retired literals still render as recorded", () => {
  const admt = (role: string) => engineOn({
    q18_admt_use: "Yes",
    q19_admt_description: "A model that ranks job applicants for interviews.",
    q19a_decision_categories: [HIRING],
    admt_role_type: role,
  }, [ENGAGED_B3]).factors["admt_role"] ?? "";
  assert(admt(C_ROLE[0]).includes("classifies the system as making the decision without human involvement"), admt(C_ROLE[0]));
  assert(admt(C_ROLE[0]).includes("technology that makes the decision without human involvement replaces human decisionmaking"), admt(C_ROLE[0]));
  assert(admt(C_ROLE[1]).includes("informing a decision that a human reviewer meeting all three § 7001(e)(1) requirements makes or can change"), admt(C_ROLE[1]));
  assert(admt(C_ROLE[2]).includes("involving a human reviewer who does not meet all three § 7001(e)(1) requirements"), admt(C_ROLE[2]));
  assert(admt("The ADMT is a substantial factor in a human decision").includes("classifies the system as a substantial factor in a human decision"), "legacy literal lost");
  assert(!C_ROLE.some((o) => /substantial factor/i.test(o)), "draft-era wording still offered");
});

// ── §5 — b(4) capacity ───────────────────────────────────────────────────────

Deno.test("doc157 §5 — 'Independent contractors' and 'Educational-program applicants' establish the b(4) capacity directly", () => {
  for (const ctx of ["Independent contractors", "Educational-program applicants"]) {
    const r = engineOn({ q5b_profiling_observation: "Yes", consumer_relationship_context: ctx, subject_anchor: "Telematics scoring" }, [ENGAGED_B4]);
    const row = rowsOf(r).find((x) => x[0].includes("§ 7150(b)(4)"));
    assert(row && !row[1].includes("capacity is not separately described"), `${ctx}: ${row?.[1]}`);
    assert(!followUps(r).includes("Describe the population systematically observed"), ctx);
  }
  // "Telematics" is itself an employment cue in the scenario scan, so the
  // negative case uses a cue-free anchor.
  const consumer = engineOn({ q5b_profiling_observation: "Yes", consumer_relationship_context: "Prospective customers or site visitors", subject_anchor: "Visitor engagement scoring" }, [ENGAGED_B4]);
  assert(rowsOf(consumer).find((x) => x[0].includes("§ 7150(b)(4)"))?.[1].includes("capacity is not separately described"), "qualifier lost for a consumer context");
  assert(C_CTX.includes("Independent contractors") && C_CTX.includes("Educational-program applicants"));
});

// ── §6 — the Company's own answers in § 4.C ──────────────────────────────────

Deno.test("doc157 §6 — the Company's benefits-outweigh answer renders in § 4.C; a conflict draws a Follow-Up; the table is untouched", () => {
  const agree = engineOn({ impact_intake: { benefitsOutweigh: "Yes" } });
  assert((agree.factors["determination_text"] ?? "").includes("The Company’s own recorded answer to whether the benefits outweigh the risks is “Yes”."), agree.factors["determination_text"]);
  assert(!(agree.factors["determination_text"] ?? "").includes("differs from the determination above"));
  assert(!followUps(agree).includes("Reconcile the Company’s recorded answer"));
  assertEquals(agree.exec_panel.disposition, "proceed");
  const conflict = engineOn({ impact_intake: { benefitsOutweigh: "No" } });
  assert((conflict.factors["determination_text"] ?? "").includes("is “No”. That answer differs from the determination above; reconciling the two appears among the Follow-Ups in § 4.D."), conflict.factors["determination_text"]);
  assert(followUps(conflict).includes("Reconcile the Company’s recorded answer that the benefits do not outweigh the risks"), followUps(conflict));
  assertEquals(conflict.exec_panel.disposition, "proceed", "the Company's answer fed the table");
  const silent = engineOn({});
  assert(!(silent.factors["determination_text"] ?? "").includes("own recorded answer"), "sentence composed from silence");
});

Deno.test("doc157 §6 — the § 7152(a)(7) decision renders in § 4.C; a conflict with the recommended outcome draws a Follow-Up; absence is stated", () => {
  const cont = engineOn({ final_processing_decision: "Continue", final_processing_decision_notes: "Board approved 2026-09-15." });
  assert((cont.factors["determination_text"] ?? "").includes("The Company records its decision under § 7152(a)(7) as “Continue” (“Board approved 2026-09-15”)."), cont.factors["determination_text"]);
  assert(!followUps(cont).includes("Reconcile the Company’s recorded § 7152(a)(7) decision"));
  const stopButContinue = engineOn({ a5_harm_pathways: [HIGH_G], final_processing_decision: "Continue" });
  assert(stopButContinue.exec_panel.disposition.startsWith("do not proceed"), stopButContinue.exec_panel.disposition);
  assert((stopButContinue.factors["determination_text"] ?? "").includes("That decision differs from the recommended outcome"), stopButContinue.factors["determination_text"]);
  assert(followUps(stopButContinue).includes("Reconcile the Company’s recorded § 7152(a)(7) decision (“Continue”)"), followUps(stopButContinue));
  const proceedButStop = engineOn({ final_processing_decision: "Discontinue" });
  assert(followUps(proceedButStop).includes("Reconcile the Company’s recorded § 7152(a)(7) decision (“Discontinue”)"), followUps(proceedButStop));
  const none = engineOn({});
  assert((none.factors["determination_text"] ?? "").includes("is recorded at finalization; none is recorded in the information provided."), none.factors["determination_text"]);
});

// ── §7 — sensitive-PI taxonomy ───────────────────────────────────────────────

Deno.test("doc157 §7 — the four § 7001(bbb)(1) categories, 'Sexual orientation', and under-16 data are SPI; 'Gender identity' is not; the cross-check honours them", () => {
  for (const k of [
    "Government identifiers (SSN, driver's license, state ID, passport number)",
    "Account log-in or financial-account credentials",
    "Contents of mail, email, or text messages",
    "Neural data",
    "Sexual orientation",
    "Children's data (under 16)",
  ]) assert(CA_SPI_CATEGORY_KEYS.includes(k), `missing SPI key: ${k}`);
  assert(!CA_SPI_CATEGORY_KEYS.includes("Gender identity"));
  for (const k of CA_SPI_CATEGORY_KEYS) {
    if (k === "Sexual orientation or gender identity") continue; // retired literal kept for stored rows
    assert((CPPA_RISK_INLINE_LISTS.PI_CATEGORIES as readonly string[]).includes(k), `SPI key not offered on the form: ${k}`);
  }
  const r = engineOn({ q15_sensitive_pi: "Yes", q4_pi_categories: ["Government identifiers (SSN, driver's license, state ID, passport number)"] }, [ENGAGED_B2]);
  assert(!followUps(r).includes("Identify the qualifying statutory sensitive-personal-information category"), followUps(r));
  assert((r.factors["information_profile"] ?? "").includes("Government identifiers"), r.factors["information_profile"]);
});

// ── §8 — parity, templates, instrument, finalization, rendered seams ─────────

Deno.test("doc157 §8 — enums ≡ contract ≡ resolver literals for the new and relabelled sets", () => {
  assertEquals([...C_SDC], [...formEnums.SIGNIFICANT_DECISION_CATEGORY_OPTS]);
  assertEquals([...C_SDC], [...R_SDC]);
  assertEquals([...C_HDB], [...formEnums.HOUSING_DECISION_BASIS_OPTS]);
  assertEquals([...C_HDB], [...R_HDB]);
  assertEquals([...C_ROLE], [...formEnums.ADMT_ROLE_TYPE_OPTS]);
  assertEquals([...C_CTX], [...formEnums.CONSUMER_RELATIONSHIP_CONTEXT_OPTS]);
  assertEquals(Q21_TRAINING_OPTS[1], "Yes — training facial-recognition, emotion-recognition, identity-verification, or physical or biological identification or profiling technology");
  const f = (k: string) => cppaRiskContract.fields.find((x) => x.key === k);
  assertEquals(f("q19a_decision_categories")?.kind, "multi-enum");
  assertEquals(f("q19b_housing_basis")?.kind, "enum");
  assertEquals(f("final_processing_decision")?.kind, "enum");
  const fin = (k: string) => cppaRiskFinalizationContract.fields.find((x) => x.key === k);
  assertEquals(fin("i8_contact_phone")?.required, "always");
  assertEquals(fin("i8_contact_email")?.required, "always");
});

Deno.test("doc157 §8 — the two categorical templates exist and read as determined non-engagements", () => {
  assert(PASS2_TEMPLATES["T.risk.applicability.not_significant"]?.text.startsWith("Not engaged —"));
  assert(PASS2_TEMPLATES["T.risk.applicability.housing_excluded"]?.text.includes("§ 7001(ddd)(2)"));
});

Deno.test("doc157 §8 — the grader instrument names the designed states under the appended tag", async () => {
  const { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } = await import("../../../supabase/functions/_shared/grader/context.ts");
  assert(GRADER_CONTEXT_VERSION.endsWith("+risk-law-map-2026-09-03"), GRADER_CONTEXT_VERSION);
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-2026-08-28-skeleton-cal-3-item204"), "calibration prefix lost");
  for (const needle of ["DOC 157 (model-vs-law build", "§ 7001(bbb)(4)", "q19a_decision_categories", "recorded answer to whether the benefits outweigh the risks", "Reconcile the decision category recorded"]) {
    assert(SHARED_GRADER_CONTEXT.includes(needle), `context missing: ${needle}`);
  }
});

Deno.test("doc157 §8 — full-document seams: the new sentences render in place and the banned register is absent", () => {
  const elevated = docText({
    q15_sensitive_pi: "No",
    q15b_under16_knowledge: UNDER16_YES,
    q4_pi_categories: ["Contact identifiers (name, email, phone)"],
    impact_intake: { benefitsOutweigh: "Yes" },
    final_processing_decision: "Continue",
  }, []);
  for (const needle of [
    "§ 7001(bbb)(4) defines as sensitive personal information",
    "Complete the sensitive-personal-information record for the under-16 information",
    "The Company’s own recorded answer to whether the benefits outweigh the risks is “Yes”.",
    "The Company records its decision under § 7152(a)(7) as “Continue”.",
  ]) assert(elevated.includes(needle), `elevated document missing: ${needle}`);
  assert(!BANNED.test(elevated), `banned register in elevated document: ${BANNED.exec(elevated)?.[0]}`);

  const categorical = docText({
    q18_admt_use: "Yes",
    q19_admt_description: "The model decides loan eligibility for applicants.",
    q19a_decision_categories: [NONE],
    admt_role_type: C_ROLE[1],
    i5_admt_logic: "Gradient-boosted classifier on repayment history.",
    q5b_profiling_observation: "Yes",
    consumer_relationship_context: "Independent contractors",
  }, [ENGAGED_B3, ENGAGED_B4]);
  for (const needle of [
    "not within any category § 7001(ddd) defines as a significant decision",
    "Reconcile the decision category recorded for the automated decisionmaking technology",
    "informing a decision that a human reviewer meeting all three § 7001(e)(1) requirements",
    "is recorded at finalization; none is recorded in the information provided.",
  ]) assert(categorical.includes(needle), `categorical document missing: ${needle}`);
  assert(!categorical.includes("capacity is not separately described"), "contractor capacity not honoured in the rendered document");
  assert(!BANNED.test(categorical), `banned register in categorical document: ${BANNED.exec(categorical)?.[0]}`);
});
