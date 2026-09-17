// FIXTURE CONSISTENCY rules for the cppa-admt /all-ptest panel
// (src/lib/ptestPanels/cppa-admt.ts). Each rule is a pure function of the
// intake (plus ctx.reportDate/ctx.fixture) — no network, no Date.now().
//
// Literal option strings/trigger keys below are copied verbatim from
// supabase/functions/_shared/intake-contracts/cppa-admt.ts.
//
// SKIPPED — admt.dates: the brief asks to order a deployment/first-use
// date, a notice date, and an assessment date against ctx.reportDate. The
// contract has no date-typed field at all (grepped the contract and every
// fixture for "date"/"deploy"/"first_use" — the only hits are literal
// calendar dates embedded in narrative prose such as notice_full_text's
// "published 2026-01-12", never a discrete field). No keys exist to check.
//
// SKIPPED — admt.training-uses: the brief asks to check "training detail"
// keys against a training-use answer. The contract's own header says
// training_data_use is "Yes/No only" and it registers no companion detail
// field (grepped for every other "training" key: only
// admt_detail.vendor_training_rights, hi_trained and appeal_trained exist,
// none of which describe training USES of the ADMT itself). No keys exist.
//
// PARTIAL — admt.opt-out-exception: the brief names four exception types
// including a "security/fraud/safety" exception. OPT_OUT_EXCEPTIONS in the
// contract has only three named exceptions (human appeal / hiring-admission
// / work-allocation) plus "no exception"; there is no fourth option, so only
// the three that exist are checked.
//
// PARTIAL — admt.domains-vs-detail: the brief asks for "the matching detail
// (which decisions)" for every domain. The contract gates only ONE
// domain-specific detail field — admt_detail.housing_decision_basis, on the
// Housing domain (§ 7001(ddd)(2)). No lending/employment/education/
// healthcare domain has its own contract-registered detail field (the only
// other candidate, admt_detail.decision_domains_other, is explicitly
// `emptyIsAnswer: true` — blank is itself a valid answer for every domain,
// so it cannot be required non-empty). The rule below checks the "none"
// domain's exclusivity and the Housing/housing_decision_basis pairing only.

import type { Bag, FixtureRule } from "./framework.ts";
import { arr, bag, get, str } from "./framework.ts";

// ── Literal copies (see header for provenance) ─────────────────────────────

const NONE_DOMAIN = "None of these categories — the decision is outside every § 7001(ddd) category";
const HOUSING_DOMAIN = "Housing (rental or purchase eligibility)";
const SUBSTANTIVE_DOMAINS = [
  "Financial or lending services (credit decisions, loans, accounts)",
  HOUSING_DOMAIN,
  "Education enrollment or opportunities (admission, credentials, suspension)",
  "Hiring or admission decisions",
  "Work allocation, scheduling, or compensation",
  "Promotion, demotion, suspension, or termination",
  "Healthcare services (diagnosis, treatment, care eligibility)",
];

const SOLELY_ADVERTISING_YES = "Yes — solely advertising";

const HUMAN_APPEAL_EXCEPTION = "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision";
const HIRING_ADMISSION_EXCEPTION = "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination";
const WORK_ALLOCATION_EXCEPTION = "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination";
const NO_EXCEPTION = "No exception — we provide a full opt-out right";

const ADMT_VENDOR_KEYS = [
  "vendor_status", "vendor_docs", "vendor_makes_available",
  "v_audit", "v_assist", "v_optout", "v_appeal", "v_incident",
  "vendor_product", "vendor_training_rights",
];
const ADMT_HI_DETAIL_KEYS = [
  "hi_reviewer_role", "hi_stage", "hi_trained", "hi_reviews_other_info", "hi_authority_override", "hi_override_rate",
];
const APPEAL_DETAIL_KEYS = [
  "appeal_reviewer_role", "appeal_trained", "appeal_authority_overturn", "appeal_step_count",
  "appeal_consumer_submit", "appeal_timeline", "appeal_reversal_rate", "appeal_outcomes",
];
const BIAS_DETAIL_KEYS = [
  "sole_use_attestation", "nondiscrimination_testing", "bias_protected_chars", "bias_proxy_vars",
  "bias_testing_cadence", "bias_last_test", "bias_next_test", "bias_adverse_impact", "bias_outcome_summary",
];
const FULL_OPTOUT_ROUTE_KEYS = [
  "opt_out_methods", "opt_out_link_title", "opt_out_no_cookie_banner", "opt_out_no_account_required",
  "opt_out_confirmation_mechanism", "opt_out_15_day_process", "opt_out_handling_confirmations",
];

function isPresent(v: unknown): boolean {
  return Array.isArray(v) ? v.length > 0 : !!str(v);
}
function anyDetailPresent(intake: Bag, keys: readonly string[]): boolean {
  const detail = bag(get(intake, "admt_detail"));
  return keys.some((k) => isPresent(get(detail, k)));
}
function anyTopPresent(intake: Bag, keys: readonly string[]): boolean {
  return keys.some((k) => isPresent(get(intake, k)));
}

// notice_element_text.* gates, each keyed to its OWN contract trigger field
// (verbatim trigger conditions from cppa-admt.ts).
function noticeGateFor(intake: Bag, key: string): { required: boolean; blocked: boolean } {
  if (key === "purpose") {
    const v = str(get(intake, "notice_has_specific_purpose"));
    return { required: v === "Yes", blocked: v !== "Yes" };
  }
  if (key === "optout") {
    const v = str(get(intake, "notice_has_opt_out_desc"));
    return { required: !!v && v !== "No", blocked: v === "No" };
  }
  if (key === "access") {
    const v = str(get(intake, "notice_has_access_desc"));
    return { required: v === "Yes", blocked: v !== "Yes" };
  }
  if (key === "antiretaliation") {
    const v = str(get(intake, "notice_has_anti_retaliation"));
    return { required: v === "Yes", blocked: v !== "Yes" };
  }
  if (key === "howworks_inputs" || key === "howworks_output") {
    // NOTICE_HOW_IT_WORKS_OPTS has a genuine middle state ("Partial — some
    // elements missing") where one of the pair may legitimately be filled
    // and the other blank; only the two Yes-prefixed answers require both,
    // and only "No"/"Not yet" block both. Partial is left unasserted.
    const v = str(get(intake, "notice_has_how_it_works"));
    return { required: /^Yes/.test(v), blocked: v === "No" || v === "Not yet" };
  }
  // altprocess
  const v = str(get(intake, "notice_has_alternative_process"));
  return { required: v === "Yes", blocked: v !== "Yes" };
}
const NOTICE_TEXT_KEYS = ["purpose", "optout", "access", "antiretaliation", "howworks_inputs", "howworks_output", "altprocess"];

export const CPPA_ADMT_RULES: readonly FixtureRule[] = [
  {
    id: "admt.vendor-block",
    title: "admt_detail vendor_*/v_* keys are populated iff third_party_admt names a vendor system",
    // Catches: vendor-block answers left populated when third_party_admt is
    // blank or an explicit No/None, and a named vendor system with the
    // contract's own conditional vendor keys still blank.
    check(intake) {
      const violations: string[] = [];
      const thirdParty = str(get(intake, "third_party_admt"));
      const namesSystem = !!thirdParty && !/^(no|none)\b/i.test(thirdParty);
      const detail = bag(get(intake, "admt_detail"));
      for (const key of ADMT_VENDOR_KEYS) {
        const present = isPresent(get(detail, key));
        if (!namesSystem && present) violations.push(`admt_detail.${key} is set but third_party_admt does not name a vendor system`);
        if (namesSystem && !present) violations.push(`admt_detail.${key} is empty but third_party_admt names a vendor system`);
      }
      return violations;
    },
  },
  {
    id: "admt.human-involvement",
    title: "human_review (authority vs fully automated) agrees with the admt_detail.hi_* reviewer-detail keys",
    // Catches: a reviewer-with-authority answer with no hi_* reviewer detail
    // recorded, and a fully-automated answer with hi_* detail still present.
    check(intake) {
      const violations: string[] = [];
      const humanReview = str(get(intake, "human_review"));
      const hasAuthority = /has authority to change the decision/i.test(humanReview);
      const fullyAutomated = /^No — fully automated/i.test(humanReview);
      const detail = bag(get(intake, "admt_detail"));
      for (const key of ADMT_HI_DETAIL_KEYS) {
        const present = isPresent(get(detail, key));
        if (hasAuthority && !present) violations.push(`human_review claims reviewer authority but admt_detail.${key} is empty`);
        if (fullyAutomated && present) violations.push(`human_review is fully automated but admt_detail.${key} is set`);
      }
      return violations;
    },
  },
  {
    id: "admt.domains-vs-detail",
    title: "decision_domains 'none' is exclusive; Housing carries its § 7001(ddd)(2) basis answer (see file header PARTIAL note)",
    // Catches: "None of these categories" selected alongside another domain,
    // a Housing domain with no housing_decision_basis answer, and a
    // housing_decision_basis answer with Housing not selected.
    check(intake) {
      const violations: string[] = [];
      const domains = arr(get(intake, "decision_domains"));
      if (domains.includes(NONE_DOMAIN) && domains.length > 1) {
        violations.push('decision_domains selects "None of these categories" alongside another domain');
      }
      const hasHousing = domains.includes(HOUSING_DOMAIN);
      const housingBasis = str(get(intake, "admt_detail.housing_decision_basis"));
      if (hasHousing && !housingBasis) violations.push("decision_domains includes Housing but admt_detail.housing_decision_basis is empty");
      if (!hasHousing && housingBasis) violations.push("admt_detail.housing_decision_basis is set but Housing is not a selected domain");
      return violations;
    },
  },
  {
    id: "admt.notice",
    title: "Each notice_element_text.* key is populated exactly when its own notice_has_* answer requires it",
    // Catches: a notice_has_* answer requiring an element (purpose/opt-out/
    // access/anti-retaliation/how-it-works/alt-process) whose
    // notice_element_text entry is still blank, and the reverse — text
    // present for an element its own notice_has_* answer says isn't given.
    check(intake) {
      const violations: string[] = [];
      const noticeText = bag(get(intake, "notice_element_text"));
      for (const key of NOTICE_TEXT_KEYS) {
        const present = isPresent(get(noticeText, key));
        const gate = noticeGateFor(intake, key);
        if (gate.required && !present) violations.push(`notice_element_text.${key} is empty but its notice_has_* answer requires it`);
        if (gate.blocked && present) violations.push(`notice_element_text.${key} is set but its notice_has_* answer doesn't call for it`);
      }
      return violations;
    },
  },
  {
    id: "admt.opt-out-exception",
    title: "opt_out_exception selects the one condition-evidence block that's actually populated (see file header PARTIAL note)",
    // Catches: the human-appeal exception with no appeal-evidence key set,
    // an employment exception with no bias-testing-evidence key set, "No
    // exception" with no full-opt-out-route key set, and evidence for a
    // block whose exception isn't the one selected.
    check(intake) {
      const violations: string[] = [];
      const exception = str(get(intake, "opt_out_exception"));
      const isAppeal = exception === HUMAN_APPEAL_EXCEPTION;
      const isBias = exception === HIRING_ADMISSION_EXCEPTION || exception === WORK_ALLOCATION_EXCEPTION;
      const isFull = exception === NO_EXCEPTION;
      const appealPresent = anyDetailPresent(intake, APPEAL_DETAIL_KEYS) || !!str(get(intake, "opt_out_appeal_process"));
      const biasPresent = anyDetailPresent(intake, BIAS_DETAIL_KEYS) || !!str(get(intake, "opt_out_fairness_doc"));
      const fullPresent = anyTopPresent(intake, FULL_OPTOUT_ROUTE_KEYS);
      if (isAppeal && !appealPresent) violations.push("opt_out_exception is the human-appeal exception but no appeal-evidence key is populated");
      if (isBias && !biasPresent) violations.push("opt_out_exception is an employment exception but no bias-testing-evidence key is populated");
      if (isFull && !fullPresent) violations.push('opt_out_exception is "No exception" but no full-opt-out-route key is populated');
      // The reverse direction (evidence keys answered under a different
      // exception) is the contract's own conditional-trigger question, which
      // the generic `unasked-conditional-empty` rule checks exactly.
      return violations;
    },
  },
  {
    id: "admt.advertising-only",
    title: "admt_detail.solely_advertising = Yes implies the 'none' domain with no substantive domain selected",
    // Catches: a solely-advertising answer whose decision_domains still
    // selects a lending/housing/education/hiring/work/promotion/healthcare
    // domain, or omits the none/advertising category entirely.
    check(intake) {
      const violations: string[] = [];
      const advertising = str(get(intake, "admt_detail.solely_advertising"));
      if (advertising !== SOLELY_ADVERTISING_YES) return violations;
      const domains = arr(get(intake, "decision_domains"));
      if (!domains.includes(NONE_DOMAIN)) violations.push("solely_advertising is Yes but decision_domains does not include the none/advertising category");
      const substantive = domains.filter((d) => SUBSTANTIVE_DOMAINS.includes(d));
      if (substantive.length) violations.push(`solely_advertising is Yes but decision_domains also selects ${substantive.join(", ")}`);
      return violations;
    },
  },
  {
    id: "admt.company",
    title: "organization_name equals the fixture's company name",
    // Catches: a fixture whose intake names a different legal entity than
    // its own PanelFixture.company field.
    check(intake, ctx) {
      const org = str(get(intake, "organization_name"));
      return org === ctx.fixture.company
        ? []
        : [`organization_name ("${org}") does not match fixture.company ("${ctx.fixture.company}")`];
    },
  },
];
