// ITEM 380 r5b — CONTRACT CORRECTION: REAL FORM TRIGGERS.
//
// Each corrected key is proved twice: trigger OFF ⇒ the key is not counted as
// an unanswered ask (the form never showed the control), trigger ON + empty ⇒
// the key IS counted. `source_assessment_id` is proved excluded as a system
// key in both directions.
//
// Form citations encoded here:
//   controller_land          — src/pages/DPIAFramework.tsx L911
//                              {controllerCountry === "DE" && ( … )}
//   secondary_activities     — src/pages/CPPARiskAssessment.tsx L1147/L688
//                              hasSecondaryUses === "Yes — there are other uses"
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaAdmtContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";
import { emptyAskedKeys, SYSTEM_KEYS } from "../../../supabase/functions/_shared/ltp/record-complete.ts";

Deno.test("r5b: controller_land — trigger OFF (non-DE controller) is not counted", () => {
  const empty = emptyAskedKeys(dpiaFrameworkContract, { controller_country: "IE" });
  assert(!empty.includes("controller_land"), "non-DE controller was never asked for a Land");
});

Deno.test("r5b: controller_land — trigger ON (DE) + empty IS counted", () => {
  const empty = emptyAskedKeys(dpiaFrameworkContract, { controller_country: "DE", controller_land: "" });
  assert(empty.includes("controller_land"), "a German controller was asked and left it blank");
});

Deno.test("r5b: controller_land — trigger ON + answered is not counted", () => {
  const empty = emptyAskedKeys(dpiaFrameworkContract, { controller_country: "DE", controller_land: "Bavaria" });
  assert(!empty.includes("controller_land"));
});

Deno.test("r5b: secondary_activities — trigger OFF (No) is not counted", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    has_secondary_uses: "No — this data is used for this activity only",
    secondary_activities: [],
  });
  assert(!empty.includes("secondary_activities"), "the repeater was never rendered");
});

Deno.test("r5b: secondary_activities — trigger ON (Yes) + empty IS counted", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    has_secondary_uses: "Yes — there are other uses",
    secondary_activities: [],
  });
  assert(empty.includes("secondary_activities"), "the fork said Yes and no row was described");
});

Deno.test("r5b: secondary_activities — trigger ON + rows is not counted", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    has_secondary_uses: "Yes — there are other uses",
    secondary_activities: [{ name: "Lookalike modelling", purpose: "Audience expansion" }],
  });
  assert(!empty.includes("secondary_activities"));
});

Deno.test("r5b: trigger matching is verbatim — a near-miss value does not trigger", () => {
  const empty = emptyAskedKeys(cppaRiskContract, {
    has_secondary_uses: "Yes",
    secondary_activities: [],
  });
  assert(!empty.includes("secondary_activities"), "only the verbatim stored option triggers");
});

Deno.test("r5b: source_assessment_id is a SYSTEM key, never counted as an ask", () => {
  assert(SYSTEM_KEYS.has("source_assessment_id"));
  assertEquals(
    emptyAskedKeys(dpiaFrameworkContract, {}).includes("source_assessment_id"),
    false,
  );
  assertEquals(
    emptyAskedKeys(dpiaFrameworkContract, { source_assessment_id: null }).includes("source_assessment_id"),
    false,
  );
});

// ── doc 263 run 1 (2026-09-17) — ADMT: the page's own show/hide conditions ──
//   admt_detail.vendor_*     — ADMTChecker.tsx vendor block: opens only when a
//                              third-party system is NAMED; an explicit "No" /
//                              "None" is the Company's answer that there is
//                              none (CEO decision ee860fd0). PRESENT trigger.
//   admt_detail.appeal_*     — shown only on the § 7221(b)(1) human-appeal path.
//   opt_out_methods et al.   — shown only when the path shows the mechanics.
//   notice_timing / texts    — hidden while no Pre-use Notice has been provided.
const HUMAN = "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision";
const FULL = "No exception — we provide a full opt-out right";
const HIRING = "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination";

Deno.test("run1: vendor_status — an explicit No is not a named vendor (trigger OFF)", () => {
  const empty = emptyAskedKeys(cppaAdmtContract, { third_party_admt: "No — the model is built and maintained by the internal analytics team.", admt_detail: {} });
  assert(!empty.includes("admt_detail.vendor_status"));
  assert(!empty.includes("admt_detail.vendor_training_rights"));
});

Deno.test("run1: vendor_status — blank or placeholder third-party box (trigger OFF)", () => {
  assert(!emptyAskedKeys(cppaAdmtContract, { third_party_admt: "", admt_detail: {} }).includes("admt_detail.vendor_status"));
  assert(!emptyAskedKeys(cppaAdmtContract, { third_party_admt: "[to be supplied]", admt_detail: {} }).includes("admt_detail.vendor_status"));
});

Deno.test("run1: vendor_status — a named system (trigger ON) + empty IS counted; answered is not", () => {
  const named = "Yes — the scoring engine is a hosted service licensed from FinScore Analytics Inc.";
  assert(emptyAskedKeys(cppaAdmtContract, { third_party_admt: named, admt_detail: {} }).includes("admt_detail.vendor_status"));
  assert(!emptyAskedKeys(cppaAdmtContract, { third_party_admt: named, admt_detail: { vendor_status: "Service provider" } }).includes("admt_detail.vendor_status"));
  // "Northgate …" starts with the letters n-o but is not the word No.
  assert(emptyAskedKeys(cppaAdmtContract, { third_party_admt: "Northgate Screening Services", admt_detail: {} }).includes("admt_detail.vendor_status"));
});

Deno.test("run1: appeal_reviewer_role — OFF on the full opt-out path, ON + empty on the human-appeal path", () => {
  assert(!emptyAskedKeys(cppaAdmtContract, { opt_out_exception: FULL, admt_detail: {} }).includes("admt_detail.appeal_reviewer_role"));
  assert(emptyAskedKeys(cppaAdmtContract, { opt_out_exception: HUMAN, admt_detail: {} }).includes("admt_detail.appeal_reviewer_role"));
  assert(!emptyAskedKeys(cppaAdmtContract, { opt_out_exception: HUMAN, admt_detail: { appeal_reviewer_role: "Senior underwriter" } }).includes("admt_detail.appeal_reviewer_role"));
});

Deno.test("run1: opt_out_methods — OFF on an employment exception, ON + empty on the full opt-out path", () => {
  assert(!emptyAskedKeys(cppaAdmtContract, { opt_out_exception: HIRING, opt_out_methods: [] }).includes("opt_out_methods"));
  assert(emptyAskedKeys(cppaAdmtContract, { opt_out_exception: FULL, opt_out_methods: [] }).includes("opt_out_methods"));
});

Deno.test("run1: sole_use_attestation — ON only on an employment exception", () => {
  assert(!emptyAskedKeys(cppaAdmtContract, { opt_out_exception: FULL, admt_detail: {} }).includes("admt_detail.sole_use_attestation"));
  assert(emptyAskedKeys(cppaAdmtContract, { opt_out_exception: HIRING, admt_detail: {} }).includes("admt_detail.sole_use_attestation"));
});

Deno.test("run1: notice_timing / notice_full_text — OFF while no notice is provided, ON + empty once delivered", () => {
  const notYet = emptyAskedKeys(cppaAdmtContract, { notice_delivery: ["We have not yet provided a Pre-use Notice"] });
  assert(!notYet.includes("notice_timing") && !notYet.includes("notice_full_text") && !notYet.includes("notice_element_text.altprocess"));
  const delivered = emptyAskedKeys(cppaAdmtContract, { notice_delivery: ["Account-creation or onboarding flow"], notice_timing: "", notice_full_text: "" });
  assert(delivered.includes("notice_timing") && delivered.includes("notice_full_text"));
});

Deno.test("run1: notice_element_text.altprocess — asked only when the notice claims an alternative process", () => {
  const base = { notice_delivery: ["Included in our Notice at Collection"], notice_element_text: {} };
  assert(!emptyAskedKeys(cppaAdmtContract, { ...base, notice_has_alternative_process: "No" }).includes("notice_element_text.altprocess"));
  assert(emptyAskedKeys(cppaAdmtContract, { ...base, notice_has_alternative_process: "Yes" }).includes("notice_element_text.altprocess"));
  // "Partial" how-it-works does not demand both how-it-works excerpts.
  assert(!emptyAskedKeys(cppaAdmtContract, { ...base, notice_has_how_it_works: "Partial — some elements missing" }).includes("notice_element_text.howworks_inputs"));
});

// 2026-09-18 — MULTI-ENUM TRIGGER WITHOUT "[]" (doc 271 §4 item 1; CEO
// instruction). `decision_domains` (ADMT) and `q19a_decision_categories`
// (Risk) are multi-enum keys whose VALUE-EQUALS triggers are written without
// the "[]" marker, so readPath handed the whole array to the string test and
// the conditional field was never counted as asked. The equals branch now
// tests array values element-wise. Proved in both directions for both keys.
const HOUSING_ADMT = "Housing (rental or purchase eligibility)";
const HOUSING_RISK = "Housing (a home, residence, or sleeping place)";

Deno.test("2026-09-18: admt_detail.housing_decision_basis — ON + empty when Housing is among the selected domains", () => {
  const empty = emptyAskedKeys(cppaAdmtContract, {
    decision_domains: ["Financial or lending services (credit decisions, loans, accounts)", HOUSING_ADMT],
    admt_detail: {},
  });
  assert(empty.includes("admt_detail.housing_decision_basis"), "Housing selected among others: the basis question was asked and left blank");
});

Deno.test("2026-09-18: admt_detail.housing_decision_basis — OFF when Housing is not selected; not counted when answered", () => {
  const off = emptyAskedKeys(cppaAdmtContract, {
    decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
    admt_detail: {},
  });
  assert(!off.includes("admt_detail.housing_decision_basis"), "no Housing domain: the basis question was never shown");
  const answered = emptyAskedKeys(cppaAdmtContract, {
    decision_domains: [HOUSING_ADMT],
    admt_detail: { housing_decision_basis: "Rental application screening" },
  });
  assert(!answered.includes("admt_detail.housing_decision_basis"), "answered: not an empty ask");
});

Deno.test("2026-09-18: q19b_housing_basis — ON + empty when Housing is among q19a's selected categories, OFF otherwise", () => {
  const on = emptyAskedKeys(cppaRiskContract, { q19a_decision_categories: ["Employment", HOUSING_RISK], q19b_housing_basis: "" });
  assert(on.includes("q19b_housing_basis"), "Housing selected among others: q19b was asked and left blank");
  const off = emptyAskedKeys(cppaRiskContract, { q19a_decision_categories: ["Employment"], q19b_housing_basis: "" });
  assert(!off.includes("q19b_housing_basis"), "no Housing category: q19b was never shown");
});
