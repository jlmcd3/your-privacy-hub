// BATCH ee860fd0 (2026-09-14) — the CEO decision sheet, cppa-admt items,
// implemented as recommended and approved ("Implement all", 2026-09-14):
//
//   risk-assessment-transition-deadline  Section 7 states both Article 10 timing rules, no Company-specific deadline
//   third-party-admt-did-not-identify    an explicit "No" reads as the Company's answer

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ADMT_NONE_DOMAIN, computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { NOTICE_TIMING_OPTS as C_NT, OPT_OUT_HANDLING_OPTS as C_OH } from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";

type Bag = Record<string, unknown>;

const FINANCIAL = "Financial or lending services (credit decisions, loans, accounts)";

function base(over: Bag = {}): Bag {
  return {
    organization_name: "Verilink", system_name: "VeriAd Interest Classifier", system_type: "ML classifier",
    system_description: "An ML classifier that assigns users to advertising interest segments and optimises ad delivery.",
    decision_domains: [FINANCIAL],
    human_review: "No — fully automated, no human review",
    training_data_use: "Yes", profiling_use: "Yes",
    notice_delivery: ["Included in our Notice at Collection"],
    notice_timing: C_NT[0],
    notice_has_specific_purpose: "Yes", notice_purpose_text: "We classify your interests from how you use the platform.",
    notice_has_opt_out_desc: "Yes — with specific opt-out instructions", notice_has_access_desc: "Yes",
    notice_has_anti_retaliation: "Yes", notice_has_how_it_works: "Yes — included inline in the notice", notice_has_alternative_process: "Yes",
    opt_out_exception: "No exception — we provide a full opt-out right",
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
    admt_detail: { solely_advertising: "No", sole_factor: "Material factor — heavily weighted alongside others", access_secure_transmission: "Encrypted self-service portal", hi_reviewer_present: "No — fully automated" },
    ...over,
  };
}

function text(intake: Bag): string {
  const computed = computeAdmtV2(intake);
  const doc = assembleAdmtV2Document({ intake, computed, exhibit: null, organizationName: String(intake.organization_name ?? ""), systemName: String(intake.system_name ?? "") });
  return skeletonDocumentToText(doc as never);
}

Deno.test("ceo ee860fd0 — Section 7 states the pre-processing rule AND the § 7155(b) transition rule, and asserts no Company-specific deadline", () => {
  for (const intake of [base(), base({ decision_domains: [ADMT_NONE_DOMAIN], admt_detail: { ...(base().admt_detail as Bag), solely_advertising: "Yes — solely advertising" } })]) {
    const t = text(intake);
    assertStringIncludes(t, "A required risk assessment must be conducted before covered processing begins (11 CCR §§ 7150(a), 7155(a)(1)); for covered processing initiated before the regulations' effective date (January 1, 2026) and continuing after it, the assessment must be conducted and documented by December 31, 2027 (11 CCR § 7155(b)); and it must be reviewed at least every three years (11 CCR § 7155(a)(2));");
    assert(!/must be conducted by December 31, 2027 for this System|the Company's deadline/i.test(t), "no Company-specific deadline is asserted");
  }
});

Deno.test("ceo ee860fd0 — an explicit 'No' to third-party ADMT reads as the Company's answer in Section 1 and Section 6; a blank keeps 'did not identify'", () => {
  const explicitNo = text(base({ third_party_admt: "No" }));
  assertStringIncludes(explicitNo, "The Company reports that it does not use a third-party ADMT for this System.");
  assertStringIncludes(explicitNo, "Not applicable. The Company reports that it does not use a third-party ADMT vendor for the assessed System, so no vendor-dependency analysis is required.");
  assert(!explicitNo.includes("did not identify a third-party ADMT"));
  const explained = text(base({ third_party_admt: "No -- built and maintained internally." }));
  assertStringIncludes(explained, "The Company reports that it does not use a third-party ADMT for this System.");
  const blank = text(base({ third_party_admt: "" }));
  assertStringIncludes(blank, "The Company did not identify a third-party ADMT in the information supplied for this assessment.");
  assertStringIncludes(blank, "Not applicable. The Company did not identify a third-party ADMT vendor for the assessed System");
  const named = text(base({ third_party_admt: "Acme Scoring Cloud", admt_detail: { ...(base().admt_detail as Bag), vendor_status: "Service provider" } }));
  assertStringIncludes(named, "The Company identifies a third-party ADMT: Acme Scoring Cloud.");
});
