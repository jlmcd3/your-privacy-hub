// DOC 158 (2026-09-03) — CPPA ADMT v2 model-vs-law build (the seven audits of
// doc 154 Part A, then 11 CCR §§ 7200, 7220–7222, 7001(e)/(ddd) against the
// code as spec). One permanent regression test per built item:
//
//   §1  Scope: "None of these categories" (explicit negative) → out of scope;
//       combined with a domain → record conflict; § 7001(ddd)(2) housing
//       exclusion → out of scope when housing is the only domain, otherwise
//       the housing decision drops out and the rest proceeds.
//   §2  Scope: the § 7001(e)(1) self-test (collected, never read) contradicting
//       a qualifying-review answer → record conflict, never a silent override.
//   §3  Notice: § 7220(b)(2) timing factor; path-aware opt-out/exception
//       description (§ 7220(c)(2)(A)/(B)); alternative process not applicable
//       on exception pathways.
//   §4  Opt-out: exception eligibility against the decision domains
//       (§ 7221(b)(2)/(b)(3)); § 7221(c)(1) online form + link title; the
//       § 7221(f)/(i)/(j)/(k)/(m) handling duties; § 7221(b)(1)(A)/(B) appeal
//       evidence; the bias-cadence cross-check.
//   §5  Access: § 7222(b)(4) readiness element; § 7222(g) secure transmission;
//       § 7222(f) denial basis.
//   §6  Assembler: the rows render; the out-of-scope qualification names its
//       basis; the automated-pathway predicate has one home.
//   §7  Parity: enums ≡ contract; registered admt_detail leaves validate;
//       runner invokes v2; instrument tag.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_NONE_DOMAIN,
  ADMT_HOUSING_DOMAIN,
  AUTOMATED_PATHWAY_RE,
  computeAdmtV2,
  computeScope,
} from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import {
  ADMT_HOUSING_DECISION_BASIS_OPTS as C_HDB,
  CPPA_ADMT_INLINE_LISTS,
  cppaAdmtContract,
  NOTICE_TIMING_OPTS as C_NT,
  OPT_OUT_HANDLING_OPTS as C_OH,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";
import * as formEnums from "../../../src/pages/admt/ADMTChecker.enums.ts";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";

type Bag = Record<string, unknown>;

const QUALIFYING = "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision";
const NO_REVIEW = "No — fully automated, no human review";
const FINANCIAL = "Financial or lending services (credit decisions, loans, accounts)";
const HIRING = "Hiring or admission decisions";
const WORK = "Work allocation, scheduling, or compensation";
const FULL = "No exception — we provide a full opt-out right";
const APPEAL = "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision";
const HIRE_EXC = "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination";
const WORK_EXC = "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination";

/** A complete in-scope full-opt-out record; tests override what they probe. */
function base(over: Bag = {}): Bag {
  return {
    organization_name: "Northwind", system_name: "Scorer", system_type: "ML model",
    system_description: "A model that scores installment-credit applications; scores set the credit limit offered.",
    decision_domains: [FINANCIAL],
    human_review: NO_REVIEW,
    training_data_use: "Yes", profiling_use: "No",
    notice_delivery: ["In-app just-in-time notice before data collection"],
    notice_timing: C_NT[0],
    notice_has_specific_purpose: "Yes", notice_purpose_text: "We score your application to set the credit limit we offer you.",
    notice_has_opt_out_desc: "Yes — with specific opt-out instructions", notice_has_access_desc: "Yes",
    notice_has_anti_retaliation: "Yes", notice_has_how_it_works: "Yes — included inline in the notice", notice_has_alternative_process: "Yes",
    opt_out_exception: FULL,
    opt_out_methods: ["Interactive online form linked from the Pre-use Notice", "Toll-free phone number"],
    opt_out_link_title: "Opt-out of Automated Decisionmaking Technology",
    opt_out_no_cookie_banner: "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
    opt_out_no_account_required: "Confirmed — no account required",
    opt_out_confirmation_mechanism: "Confirmation email within one business day",
    opt_out_15_day_process: "Processing stops within 15 business days; the log records the date.",
    opt_out_handling_confirmations: [...C_OH.slice(0, 5)],
    access_submission_methods: "Webform and toll-free number", access_verification_process: "Email plus account login",
    access_logic_disclosure: "Score, top factors, thresholds", access_outcome_disclosure: "Outcome and factors",
    access_response_timeline: "Within 45 calendar days (standard)",
    access_readiness: {
      b1_purpose_ready: "Yes — we can produce this today", b2_logic_ready: "Yes — we can produce this today",
      b3_output_use_ready: "Yes — we can produce this today", b3_outcome_ready: "Yes — we can produce this today",
      b3_human_role_ready: "Yes — we can produce this today", b4_rights_ready: "Yes — we can produce this today",
    },
    third_party_admt: "No",
    admt_detail: { solely_advertising: "No", sole_factor: "Sole factor — output alone determines the outcome", access_secure_transmission: "Encrypted self-service portal", access_denial_basis: "Conflict with federal law; explained in writing" },
    ...over,
  };
}
const findingsOf = (c: ReturnType<typeof computeAdmtV2>) => c.allFindings.map((f) => `${f.area}|${f.criterion}|${f.substantive_state}|${f.priority}`);
const has = (c: ReturnType<typeof computeAdmtV2>, criterion: string, state?: string) =>
  c.allFindings.some((f) => f.criterion === criterion && (!state || f.substantive_state === state));

// ── §1 — decision-domain negatives ───────────────────────────────────────────

Deno.test("doc158 §1 — 'None of these categories' alone is a determined out-of-scope, not unable-to-assess; human review is moot", () => {
  const c = computeAdmtV2(base({ decision_domains: [ADMT_NONE_DOMAIN], human_review: "Not applicable / unsure" }));
  assertEquals(c.scope.scopeState, "OUT_OF_SCOPE");
  assert(c.scope.categoricalNone);
  assertEquals(c.scope.significantDecisionEffect, "WEIGHS_AGAINST");
  assertEquals(c.scope.recordGrade, "COMPLETE");
  assert(!has(c, "Human involvement"), findingsOf(c).join("\n"));
  assertEquals(c.overallPostureLabel, "Out of scope on reported facts");
});

Deno.test("doc158 §1 — 'None of these categories' beside a regulated domain is a record conflict with a priority-1 condition", () => {
  const c = computeAdmtV2(base({ decision_domains: [ADMT_NONE_DOMAIN, FINANCIAL] }));
  assertEquals(c.scope.scopeState, "INCONSISTENT_RECORD");
  assert(c.allFindings.some((f) => f.criterion === "Scope conflict" && f.priority === 1 && f.factual_basis.includes("\"None of these categories\"")), findingsOf(c).join("\n"));
});

Deno.test("doc158 §1 — the § 7001(ddd)(2) housing exclusion: housing-only → out of scope; housing plus another domain → the other domain proceeds", () => {
  const only = computeAdmtV2(base({ decision_domains: [ADMT_HOUSING_DOMAIN], admt_detail: { housing_decision_basis: C_HDB[0] } }));
  assertEquals(only.scope.scopeState, "OUT_OF_SCOPE");
  assert(only.scope.housingExcluded && only.scope.categoricalNone);
  assert(only.scope.significantDecisionLabel.includes("§ 7001(ddd)(2)"), only.scope.significantDecisionLabel);
  const mixed = computeAdmtV2(base({ decision_domains: [ADMT_HOUSING_DOMAIN, FINANCIAL], admt_detail: { housing_decision_basis: C_HDB[0] } }));
  assertEquals(mixed.scope.scopeState, "IN_SCOPE");
  assert(mixed.scope.housingExcluded && !mixed.scope.categoricalNone);
  assert(mixed.scope.significantDecisionLabel.includes("excluded under § 7001(ddd)(2)"), mixed.scope.significantDecisionLabel);
  const factors = computeAdmtV2(base({ decision_domains: [ADMT_HOUSING_DOMAIN], admt_detail: { housing_decision_basis: C_HDB[1] } }));
  assertEquals(factors.scope.scopeState, "IN_SCOPE");
  assert(!factors.scope.housingExcluded);
});

// ── §2 — human-involvement self-test ─────────────────────────────────────────

Deno.test("doc158 §2 — a qualifying-review answer contradicted by the § 7001(e)(1) self-test is a record conflict naming the denied element", () => {
  const c = computeAdmtV2(base({ human_review: QUALIFYING, admt_detail: { hi_reviewer_present: "Yes — on every decision", hi_stage: "Before the decision is issued", hi_trained: "Yes", hi_reviews_other_info: "Yes", hi_authority_override: "No" } }));
  assertEquals(c.scope.scopeState, "INCONSISTENT_RECORD");
  const f = c.allFindings.find((x) => x.criterion === "Human-involvement self-test");
  assert(f && f.priority === 1 && f.factual_basis.includes("the reviewer cannot change the decision (§ 7001(e)(1)(C))"), findingsOf(c).join("\n"));
  const after = computeAdmtV2(base({ human_review: QUALIFYING, admt_detail: { hi_stage: "After the decision (review of completed decisions)" } }));
  assertEquals(after.scope.scopeState, "INCONSISTENT_RECORD");
  // A consistent self-test leaves the categorical answer standing (out of scope).
  const ok = computeAdmtV2(base({ human_review: QUALIFYING, admt_detail: { hi_reviewer_present: "Yes — on every decision", hi_stage: "Before the decision is issued", hi_trained: "Yes", hi_reviews_other_info: "Yes", hi_authority_override: "Yes" } }));
  assertEquals(ok.scope.scopeState, "OUT_OF_SCOPE");
  // No self-test at all: the categorical answer stands (no contradiction from silence).
  assertEquals(computeAdmtV2(base({ human_review: QUALIFYING, admt_detail: {} })).scope.scopeState, "OUT_OF_SCOPE");
});

// ── §3 — Pre-use Notice ──────────────────────────────────────────────────────

Deno.test("doc158 §3 — § 7220(b)(2) timing: before collection or first use meets; after processing began is a priority-1 gap; unanswered is a follow-up", () => {
  assertEquals(computeAdmtV2(base()).notice.timing.status, "MEETS_REPORTED");
  assertEquals(computeAdmtV2(base({ notice_timing: C_NT[1] })).notice.timing.status, "MEETS_REPORTED");
  const late = computeAdmtV2(base({ notice_timing: C_NT[2] }));
  assertEquals(late.notice.timing.status, "GAP");
  assert(late.allFindings.some((f) => f.criterion === "Timing" && f.priority === 1), findingsOf(late).join("\n"));
  assertEquals(late.notice.posture, "GAP");
  const blank = computeAdmtV2(base({ notice_timing: "" }));
  assertEquals(blank.notice.timing.status, "INSUFFICIENT_RECORD");
  assert(blank.allFindings.some((f) => f.criterion === "Timing" && f.priority === 3));
  // No notice at all: timing is not applicable (the delivery gap leads).
  assertEquals(computeAdmtV2(base({ notice_delivery: ["We have not yet provided a Pre-use Notice"], notice_timing: "" })).notice.timing.status, "NOT_APPLICABLE");
  assert(computeAdmtV2(base()).notice.timing.authority.includes("7220(b)(2)"), "timing authority must come from the verified registry");
});

Deno.test("doc158 §3 — the opt-out/exception description is graded against the selected pathway (§ 7220(c)(2)(A)/(B))", () => {
  const appealText = "We rely on an exception and describe appeal rights instead";
  const onAppeal = computeAdmtV2(base({ opt_out_exception: APPEAL, notice_has_opt_out_desc: appealText, admt_detail: { appeal_trained: "Yes", appeal_authority_overturn: "Yes", appeal_consumer_submit: ["Free-text statement"], appeal_timeline: "30 calendar days" }, opt_out_appeal_process: "Appeal to a senior underwriter." }));
  assertEquals(onAppeal.notice.optoutDesc.status, "MEETS_REPORTED");
  const onFull = computeAdmtV2(base({ notice_has_opt_out_desc: appealText }));
  assertEquals(onFull.notice.optoutDesc.status, "GAP");
  assert(onFull.allFindings.some((f) => f.criterion === "Opt-out / exception description" && f.priority === 1 && f.factual_basis.includes("offers a full opt-out right")), findingsOf(onFull).join("\n"));
  const onHire = computeAdmtV2(base({ decision_domains: [HIRING], opt_out_exception: HIRE_EXC, notice_has_opt_out_desc: appealText }));
  assertEquals(onHire.notice.optoutDesc.status, "PARTIAL");
  assert(onHire.allFindings.some((f) => f.criterion === "Opt-out / exception description" && f.factual_basis.includes("§ 7220(c)(2)(B)")));
  // The new answer: the notice identifies the specific exception ((c)(2)(B)).
  const identifies = "We rely on an exception and the notice identifies the specific exception";
  assertEquals(computeAdmtV2(base({ decision_domains: [HIRING], opt_out_exception: HIRE_EXC, notice_has_opt_out_desc: identifies })).notice.optoutDesc.status, "MEETS_REPORTED");
  const idOnAppeal = computeAdmtV2(base({ opt_out_exception: APPEAL, notice_has_opt_out_desc: identifies, opt_out_appeal_process: "Appeal.", admt_detail: { appeal_trained: "Yes", appeal_authority_overturn: "Yes" } }));
  assertEquals(idOnAppeal.notice.optoutDesc.status, "PARTIAL");
  assert(idOnAppeal.allFindings.some((f) => f.criterion === "Opt-out / exception description" && f.factual_basis.includes("§ 7220(c)(2)(A)")));
  assertEquals(computeAdmtV2(base({ notice_has_opt_out_desc: identifies })).notice.optoutDesc.status, "GAP");
});

Deno.test("doc158 §3 — the alternative-process element is not applicable on an exception pathway, whatever the answer", () => {
  const c = computeAdmtV2(base({ decision_domains: [HIRING], opt_out_exception: HIRE_EXC, notice_has_alternative_process: "No" }));
  assertEquals(c.notice.altProcess.status, "NOT_APPLICABLE");
  assert(!has(c, "Alternative process"), findingsOf(c).join("\n"));
});

// ── §4 — Opt-out ─────────────────────────────────────────────────────────────

Deno.test("doc158 §4 — an exception selected for a decision domain it does not cover is a priority-1 gap; a covered domain meets", () => {
  const wrong = computeAdmtV2(base({ decision_domains: [FINANCIAL], opt_out_exception: HIRE_EXC, admt_detail: { sole_use_attestation: "Yes — solely to assess ability to perform", nondiscrimination_testing: "Yes — documented testing record" }, opt_out_fairness_doc: "Quarterly testing." }));
  assertEquals(wrong.optOut.eligibility.status, "GAP");
  assert(wrong.allFindings.some((f) => f.criterion === "Exception eligibility" && f.priority === 1), findingsOf(wrong).join("\n"));
  assertEquals(wrong.optOut.posture, "GAP");
  const right = computeAdmtV2(base({ decision_domains: [HIRING], opt_out_exception: HIRE_EXC, admt_detail: { sole_use_attestation: "Yes — solely to assess ability to perform", nondiscrimination_testing: "Yes — documented testing record" }, opt_out_fairness_doc: "Quarterly testing." }));
  assertEquals(right.optOut.eligibility.status, "MEETS_REPORTED");
  const work = computeAdmtV2(base({ decision_domains: [WORK], opt_out_exception: WORK_EXC, admt_detail: { sole_use_attestation: "Yes — solely to assess ability to perform", nondiscrimination_testing: "Yes — documented testing record" }, opt_out_fairness_doc: "Quarterly testing." }));
  assertEquals(work.optOut.eligibility.status, "MEETS_REPORTED");
  assertEquals(computeAdmtV2(base()).optOut.eligibility.status, "NOT_APPLICABLE");
});

Deno.test("doc158 §4 — § 7221(c)(1): the link title must state what is opted out of; an online business without the interactive form is a gap", () => {
  assertEquals(computeAdmtV2(base()).optOut.linkTitle.status, "MEETS_REPORTED");
  const generic = computeAdmtV2(base({ opt_out_link_title: "Your Privacy Choices" }));
  assertEquals(generic.optOut.linkTitle.status, "PARTIAL");
  assert(generic.allFindings.some((f) => f.criterion === "Online form and link title" && f.factual_basis.includes("\"Your Privacy Choices\"")));
  const noForm = computeAdmtV2(base({ opt_out_methods: ["Toll-free phone number", "Designated email address"] }));
  assertEquals(noForm.optOut.linkTitle.status, "GAP");
  assert(noForm.allFindings.some((f) => f.criterion === "Online form and link title" && f.factual_basis.includes("interacts with consumers online")));
  const offline = computeAdmtV2(base({ notice_delivery: ["Included in our Notice at Collection"], opt_out_methods: ["Toll-free phone number", "Mail-based form"] }));
  assertEquals(offline.optOut.linkTitle.status, "NOT_APPLICABLE");
});

Deno.test("doc158 §4 — the § 7221(f)/(i)/(j)/(k)/(m) handling duties: all confirmed meets; unconfirmed duties are a follow-up naming them, never a gap", () => {
  const all = computeAdmtV2(base());
  assertEquals(all.optOut.handling.status, "MEETS_REPORTED");
  const some = computeAdmtV2(base({ opt_out_handling_confirmations: [C_OH[0], C_OH[1]] }));
  assertEquals(some.optOut.handling.status, "INSUFFICIENT_RECORD");
  assertEquals(some.optOut.handling.label, "2 of 5 duties confirmed");
  const f = some.allFindings.find((x) => x.criterion === "Opt-out handling duties");
  assert(f && f.priority === 3 && f.substantive_state === "INSUFFICIENT_RECORD" && f.factual_basis.includes("§ 7221(j)"), findingsOf(some).join("\n"));
  const none = computeAdmtV2(base({ opt_out_handling_confirmations: ["None of the above can be confirmed"] }));
  assertEquals(none.optOut.handling.status, "INSUFFICIENT_RECORD");
  assertEquals(computeAdmtV2(base({ decision_domains: [HIRING], opt_out_exception: HIRE_EXC })).optOut.handling.status, "NOT_APPLICABLE");
});

Deno.test("doc158 §4 — appeal evidence: consumer submissions and the § 7021(b) timeline are read; a timeline over 45 days is a gap", () => {
  const good = computeAdmtV2(base({ opt_out_exception: APPEAL, opt_out_appeal_process: "Appeal to a senior underwriter.", admt_detail: { appeal_trained: "Yes", appeal_authority_overturn: "Yes", appeal_consumer_submit: ["Free-text statement", "Supporting documents"], appeal_timeline: "30 calendar days" } }));
  assertEquals(good.optOut.appealSubmissions.status, "MEETS_REPORTED");
  assertEquals(good.optOut.appealTimeline.status, "MEETS_REPORTED");
  const late = computeAdmtV2(base({ opt_out_exception: APPEAL, opt_out_appeal_process: "Appeal to a senior underwriter.", admt_detail: { appeal_trained: "Yes", appeal_authority_overturn: "Yes", appeal_timeline: "60 business days" } }));
  assertEquals(late.optOut.appealTimeline.status, "GAP");
  assertEquals(late.optOut.appealSubmissions.status, "INSUFFICIENT_RECORD");
  assert(late.allFindings.some((f) => f.criterion === "Appeal response timeline" && f.priority === 2 && f.factual_basis.includes("45 calendar days")));
  assert(late.allFindings.some((f) => f.criterion === "Consumer submissions on appeal" && f.priority === 2));
});

Deno.test("doc158 §4 — the bias-testing record labels the testing factor's evidence, and a documented-testing answer beside a 'None' cadence is a conflict", () => {
  const c = computeAdmtV2(base({ decision_domains: [HIRING], opt_out_exception: HIRE_EXC, opt_out_fairness_doc: "Quarterly testing.", admt_detail: { sole_use_attestation: "Yes — solely to assess ability to perform", nondiscrimination_testing: "Yes — documented testing record", bias_testing_cadence: "None", bias_protected_chars: ["Race", "Age"] } }));
  assertEquals(c.optOut.exceptionTesting.evidence, "DOCUMENTED");
  assert((c.optOut.exceptionTesting.evidenceLabel ?? "").includes("2 protected characteristics tested"), c.optOut.exceptionTesting.evidenceLabel);
  assert(c.allFindings.some((f) => f.criterion === "Non-discrimination testing" && f.substantive_state === "PARTIAL" && f.factual_basis.includes("\"None\"")), findingsOf(c).join("\n"));
});

// ── §5 — Access ──────────────────────────────────────────────────────────────

Deno.test("doc158 §5 — § 7222(b)(4) is a readiness element; § 7222(g) secure transmission and § 7222(f) denial basis are read", () => {
  const c = computeAdmtV2(base());
  assertEquals(c.access.readiness["b4_rights_ready"]?.status, "MEETS_REPORTED");
  assertEquals(c.access.secureTransmission.status, "MEETS_REPORTED");
  assertEquals(c.access.denialEvidence.status, "MEETS_REPORTED");
  assertEquals(c.access.posture, "MEETS_REPORTED");
  const gap = computeAdmtV2(base({ access_readiness: { ...(base().access_readiness as Bag), b4_rights_ready: "No — we cannot produce this today" }, admt_detail: { access_secure_transmission: "Not yet defined" } }));
  assertEquals(gap.access.readiness["b4_rights_ready"]?.status, "GAP");
  assertEquals(gap.access.secureTransmission.status, "GAP");
  assertEquals(gap.access.posture, "GAP");
  assert(gap.allFindings.some((f) => f.criterion === "Secure transmission" && f.priority === 2));
  assert(gap.allFindings.some((f) => f.criterion === "Denial explanation" && f.priority === 3));
  assert(c.access.secureTransmission.authority.includes("7222(g)") && c.access.denialEvidence.authority.includes("7222(f)"), "access authorities must come from the verified registry");
});

// ── §6 — Assembler ───────────────────────────────────────────────────────────

Deno.test("doc158 §6 — the new rows render; the out-of-scope qualification names its basis; the automated-pathway predicate has one home", () => {
  const text = (intake: Bag) => JSON.stringify(assembleAdmtV2Document({ intake, computed: computeAdmtV2(intake) } as never));
  const full = text(base());
  for (const needle of ["\"Timing\"", "\"Online form and link title\"", "\"Opt-out handling duties\"", "\"Secure transmission\"", "\"Denial explanation\"", "\"Anti-retaliation and other rights\""]) {
    assert(full.includes(needle), `full opt-out document missing row ${needle}`);
  }
  const appeal = text(base({ opt_out_exception: APPEAL, opt_out_appeal_process: "Appeal.", admt_detail: { appeal_trained: "Yes", appeal_authority_overturn: "Yes" } }));
  assert(appeal.includes("\"Consumer submissions on appeal\"") && appeal.includes("\"Appeal response timeline\""));
  const hire = text(base({ decision_domains: [HIRING], opt_out_exception: HIRE_EXC }));
  assert(hire.includes("\"Exception eligibility\""));
  const none = text(base({ decision_domains: [ADMT_NONE_DOMAIN] }));
  assert(none.includes("outside every category 11 CCR § 7001(ddd) defines as a significant decision"), "none-basis qualification missing");
  assert(!none.includes("rests on the reported human review"), "human-review qualification printed on a categorical-none record");
  const housing = text(base({ decision_domains: [ADMT_HOUSING_DOMAIN], admt_detail: { housing_decision_basis: C_HDB[0] } }));
  assert(housing.includes("11 CCR § 7001(ddd)(2) that use is not making a significant decision"), "housing-basis qualification missing");
  assert(AUTOMATED_PATHWAY_RE.test("scores below 40 are automatically declined") && !AUTOMATED_PATHWAY_RE.test("a human decides every case"));
});

// ── §7 — parity, contract, runner, instrument ────────────────────────────────

Deno.test("doc158 §7 — enums ≡ contract for the new sets; the negative domain is offered; registered admt_detail leaves validate", () => {
  assertEquals([...C_HDB], [...formEnums.ADMT_HOUSING_DECISION_BASIS_OPTS]);
  assertEquals([...C_NT], [...formEnums.NOTICE_TIMING_OPTS]);
  assertEquals([...C_OH], [...formEnums.OPT_OUT_HANDLING_OPTS]);
  assert((CPPA_ADMT_INLINE_LISTS.SIGNIFICANT_DECISION_DOMAINS as readonly string[]).includes(ADMT_NONE_DOMAIN));
  const f = (k: string) => cppaAdmtContract.fields.find((x) => x.key === k);
  for (const k of ["notice_timing", "opt_out_handling_confirmations", "admt_detail.housing_decision_basis", "admt_detail.hi_trained", "admt_detail.appeal_consumer_submit", "admt_detail.bias_testing_cadence", "admt_detail.access_secure_transmission", "admt_detail.access_denial_basis"]) {
    assert(f(k), `contract missing ${k}`);
  }
  const res = validateIntake(cppaAdmtContract, base());
  assert(res.ok, JSON.stringify(res.violations));
  const bad = validateIntake(cppaAdmtContract, base({ admt_detail: { hi_stage: "Whenever" } }));
  assert(!bad.ok && bad.violations.some((v) => v.key === "admt_detail.hi_stage"));
});

Deno.test("doc158 §7 — the stress runner invokes v2 and writes the v2 module; the instrument names the designed states", async () => {
  const runner = await Deno.readTextFile(new URL("../../../src/lib/stress/runners.ts", import.meta.url));
  assert(!runner.includes("invoke(\"run-admt-checker\","), "runner still invokes the retired v1 engine");
  assert(runner.includes("invoke(\"run-admt-checker-v2\"") && runner.includes("module: \"admt_v2\""));
  const { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } = await import("../../../supabase/functions/_shared/grader/context.ts");
  // DOC 159 appended its own tag after this one; the instrument rule keeps
  // the prefix and appends, so the pin is "includes", never "endsWith".
  assert(GRADER_CONTEXT_VERSION.includes("+admt-law-map-2026-09-03"), GRADER_CONTEXT_VERSION);
  for (const needle of ["DOC 158 (ADMT model-vs-law build)", "Exception eligibility", "Opt-out handling duties", "§ 7220(b)(2)"]) {
    assert(SHARED_GRADER_CONTEXT.includes(needle), `context missing: ${needle}`);
  }
});
