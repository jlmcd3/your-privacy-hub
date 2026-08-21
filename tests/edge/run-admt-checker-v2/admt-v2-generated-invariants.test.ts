// CPPA ADMT v2 — G_* TEMPLATE INVARIANT GUARDS (CEO ruling, 2026-08-20).
//
// Two things this file proves, not just documents:
//   1. No G_* composer ever mutates the computed D_* state it was handed.
//   2. No G_* composer ever emits a phrase from ADEQUACY_LANGUAGE_BANNED_PATTERNS,
//      across every fixture the fleet has for this product AND across every
//      reachable state branch each composer's own source distinguishes
//      (so a branch a real fixture happens not to hit still gets checked).
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import {
  ADEQUACY_LANGUAGE_BANNED_PATTERNS,
  VOICE_BANNED_PATTERNS,
  composeAccessWithholdingAnalysis,
  composeApplicabilityAnalysis,
  composeEmploymentEducationExceptionAnalysis,
  composeFullOptOutAnalysis,
  composeHumanAppealAnalysis,
  composeNoticeAnalysis,
  composeVendorDependencyAnalysis,
} from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-generated.ts";

function scanForPhrases(text: string, source: string, hits: string[], patterns: readonly string[]) {
  const lower = text.toLowerCase();
  for (const phrase of patterns) {
    if (lower.includes(phrase.toLowerCase())) {
      hits.push(`[${source}] contains banned phrase "${phrase}": …${text.slice(Math.max(0, lower.indexOf(phrase.toLowerCase()) - 40), lower.indexOf(phrase.toLowerCase()) + 60)}…`);
    }
  }
}
function scanForBannedPhrases(text: string, source: string, hits: string[]) {
  scanForPhrases(text, source, hits, ADEQUACY_LANGUAGE_BANNED_PATTERNS);
}
function scanForVoiceBannedPhrases(text: string, source: string, hits: string[]) {
  scanForPhrases(text, source, hits, VOICE_BANNED_PATTERNS);
}

Deno.test("guard: no G_* composer mutates the computed D_* state it was handed", () => {
  for (const g of CPPA_ADMT_GOLDEN) {
    const computed = computeAdmtV2(g.intake as Record<string, unknown>);
    const before = JSON.stringify(computed);

    // Call every composer with every relevant sub-result — none may mutate.
    composeApplicabilityAnalysis(computed.scope, String((g.intake as any).system_name ?? ""));
    composeNoticeAnalysis(computed.notice);
    composeFullOptOutAnalysis(computed.optOut);
    composeHumanAppealAnalysis(computed.optOut);
    composeEmploymentEducationExceptionAnalysis(computed.optOut);
    composeAccessWithholdingAnalysis(computed.access);
    composeVendorDependencyAnalysis(computed.vendor);

    const after = JSON.stringify(computed);
    assertEquals(after, before, `${g.id}: a G_* composer mutated the computed D_* state`);
  }
});

Deno.test("guard: no G_* composer emits adequacy language, across every fixture", () => {
  const hits: string[] = [];
  for (const g of CPPA_ADMT_GOLDEN) {
    const c = computeAdmtV2(g.intake as Record<string, unknown>);
    const systemName = String((g.intake as any).system_name ?? "");
    scanForBannedPhrases(composeApplicabilityAnalysis(c.scope, systemName), `${g.id}/applicability`, hits);
    scanForBannedPhrases(composeNoticeAnalysis(c.notice), `${g.id}/notice`, hits);
    scanForBannedPhrases(composeFullOptOutAnalysis(c.optOut), `${g.id}/full-optout`, hits);
    scanForBannedPhrases(composeHumanAppealAnalysis(c.optOut), `${g.id}/human-appeal`, hits);
    scanForBannedPhrases(composeEmploymentEducationExceptionAnalysis(c.optOut), `${g.id}/employment-exception`, hits);
    scanForBannedPhrases(composeAccessWithholdingAnalysis(c.access), `${g.id}/access-withholding`, hits);
    scanForBannedPhrases(composeVendorDependencyAnalysis(c.vendor), `${g.id}/vendor`, hits);
  }
  assertEquals(hits, [], `banned adequacy-language phrases found:\n${hits.join("\n")}`);
});

Deno.test("guard (v3.2): no G_* composer emits a Part II §L voice-banned phrase or raw implementation token, across every fixture", () => {
  const hits: string[] = [];
  for (const g of CPPA_ADMT_GOLDEN) {
    const c = computeAdmtV2(g.intake as Record<string, unknown>);
    const systemName = String((g.intake as any).system_name ?? "");
    scanForVoiceBannedPhrases(composeApplicabilityAnalysis(c.scope, systemName), `${g.id}/applicability`, hits);
    scanForVoiceBannedPhrases(composeNoticeAnalysis(c.notice), `${g.id}/notice`, hits);
    scanForVoiceBannedPhrases(composeFullOptOutAnalysis(c.optOut), `${g.id}/full-optout`, hits);
    scanForVoiceBannedPhrases(composeHumanAppealAnalysis(c.optOut), `${g.id}/human-appeal`, hits);
    scanForVoiceBannedPhrases(composeEmploymentEducationExceptionAnalysis(c.optOut), `${g.id}/employment-exception`, hits);
    scanForVoiceBannedPhrases(composeAccessWithholdingAnalysis(c.access), `${g.id}/access-withholding`, hits);
    scanForVoiceBannedPhrases(composeVendorDependencyAnalysis(c.vendor), `${g.id}/vendor`, hits);
  }
  assertEquals(hits, [], `v3.2 voice-banned phrases found:\n${hits.join("\n")}`);
});

// ---------------------------------------------------------------------------
// Branch coverage: hand-built intake variants that hit every branch each
// composer's own source distinguishes, so a state the real fixtures don't
// happen to reach still gets scanned. Built from the same intake contract
// as every other fixture — no field outside cppa-admt.ts's declared set.
// ---------------------------------------------------------------------------

const BASE_INTAKE = {
  organization_name: "Branch Coverage Co",
  system_name: "BranchCheck",
  system_type: "ML classifier",
  system_description: "Synthetic intake built to exercise every G_* branch, not a real customer record.",
  decision_domains: ["Hiring or admission decisions"],
  human_review: "No — fully automated, no human review",
  training_data_use: "No",
  profiling_use: "No",
  notice_delivery: ["Separate standalone Pre-use Notice"],
  notice_has_specific_purpose: "Yes",
  notice_purpose_text: "We use BranchCheck to rank applicants against the role rubric.",
  notice_has_opt_out_desc: "Mentions opt-out but without clear instructions",
  notice_has_access_desc: "Yes",
  notice_has_anti_retaliation: "Yes",
  notice_has_how_it_works: "Partial — some elements missing",
  notice_has_alternative_process: "Yes",
  opt_out_exception: "No exception — we provide a full opt-out right",
  opt_out_methods: ["Toll-free phone number"],
  opt_out_no_cookie_banner: "Cookie banner is currently our only method (gap)",
  opt_out_no_account_required: "Account is currently required (gap)",
  opt_out_confirmation_mechanism: "",
  opt_out_15_day_process: "",
  access_submission_methods: "Online form.",
  access_verification_process: "Email verification.",
  access_logic_disclosure: "We disclose the inputs and output.",
  access_outcome_disclosure: "We disclose the outcome.",
  access_response_timeline: "Within 45 calendar days (standard)",
  access_trade_secret_policy: "Model weights withheld as trade secret.",
  admt_detail: {
    sole_use_attestation: "No — the output is also used for other purposes",
    nondiscrimination_testing: "Testing performed but not documented",
    appeal_trained: "No",
    appeal_authority_overturn: "No",
    appeal_step_count: "",
  },
};

function withDetail(overrides: Record<string, unknown>, detailOverrides: Record<string, unknown> = {}) {
  return { ...BASE_INTAKE, ...overrides, admt_detail: { ...BASE_INTAKE.admt_detail, ...detailOverrides } };
}

function branchCoverageVariants(): Record<string, unknown>[] {
  return [
    withDetail({}), // GAP-heavy full-opt-out, PARTIAL notice branches
    withDetail({ opt_out_confirmation_mechanism: "", opt_out_15_day_process: "" }), // INSUFFICIENT_RECORD branches
    withDetail({ notice_has_specific_purpose: "No — uses generic language", notice_purpose_text: "" }), // notice GAP, no text
    withDetail({ notice_purpose_text: "We rank applicants against the role rubric for this requisition." }), // notice text DOCUMENTED
    withDetail(
      { opt_out_exception: "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision", opt_out_appeal_process: "" },
      { appeal_trained: "No", appeal_authority_overturn: "No" },
    ), // human appeal GAP + INSUFFICIENT_RECORD process
    withDetail(
      { opt_out_exception: "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination" },
      { sole_use_attestation: "Yes — solely to assess ability to perform", nondiscrimination_testing: "No testing performed" },
    ), // exception testing GAP
    withDetail(
      { opt_out_exception: "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination" },
      { sole_use_attestation: "Yes — solely to assess ability to perform", nondiscrimination_testing: "Testing performed but not documented" },
    ), // exception testing PARTIAL
    withDetail({ access_trade_secret_policy: "" }), // access withholding NOT_DOCUMENTED
    withDetail({ access_trade_secret_policy: "Weights withheld under Civ. Code § 3426.1(d)." }), // access withholding DOCUMENTED
    { ...withDetail({}), third_party_admt: "Acme ADMT Platform", admt_detail: { ...BASE_INTAKE.admt_detail, hosting: "Hosted by the vendor", v_optout: "No", v_assist: "No" } }, // vendor capability gap
    { ...withDetail({}), third_party_admt: "Acme ADMT Platform", admt_detail: { ...BASE_INTAKE.admt_detail, hosting: "Hosted internally", v_optout: "No", v_assist: "No" } }, // vendor relevant-but-not-capability-gap
  ];
}

Deno.test("guard: adequacy-language scan across hand-built branch-coverage variants", () => {
  const hits: string[] = [];
  for (const [i, intake] of branchCoverageVariants().entries()) {
    const c = computeAdmtV2(intake);
    const systemName = String((intake as any).system_name ?? "");
    scanForBannedPhrases(composeApplicabilityAnalysis(c.scope, systemName), `variant${i}/applicability`, hits);
    scanForBannedPhrases(composeNoticeAnalysis(c.notice), `variant${i}/notice`, hits);
    scanForBannedPhrases(composeFullOptOutAnalysis(c.optOut), `variant${i}/full-optout`, hits);
    scanForBannedPhrases(composeHumanAppealAnalysis(c.optOut), `variant${i}/human-appeal`, hits);
    scanForBannedPhrases(composeEmploymentEducationExceptionAnalysis(c.optOut), `variant${i}/employment-exception`, hits);
    scanForBannedPhrases(composeAccessWithholdingAnalysis(c.access), `variant${i}/access-withholding`, hits);
    scanForBannedPhrases(composeVendorDependencyAnalysis(c.vendor), `variant${i}/vendor`, hits);
  }
  assertEquals(hits, [], `banned adequacy-language phrases found:\n${hits.join("\n")}`);
});

Deno.test("guard (v3.2): voice-banned phrase scan across the same hand-built branch-coverage variants", () => {
  const hits: string[] = [];
  for (const [i, intake] of branchCoverageVariants().entries()) {
    const c = computeAdmtV2(intake);
    const systemName = String((intake as any).system_name ?? "");
    scanForVoiceBannedPhrases(composeApplicabilityAnalysis(c.scope, systemName), `variant${i}/applicability`, hits);
    scanForVoiceBannedPhrases(composeNoticeAnalysis(c.notice), `variant${i}/notice`, hits);
    scanForVoiceBannedPhrases(composeFullOptOutAnalysis(c.optOut), `variant${i}/full-optout`, hits);
    scanForVoiceBannedPhrases(composeHumanAppealAnalysis(c.optOut), `variant${i}/human-appeal`, hits);
    scanForVoiceBannedPhrases(composeEmploymentEducationExceptionAnalysis(c.optOut), `variant${i}/employment-exception`, hits);
    scanForVoiceBannedPhrases(composeAccessWithholdingAnalysis(c.access), `variant${i}/access-withholding`, hits);
    scanForVoiceBannedPhrases(composeVendorDependencyAnalysis(c.vendor), `variant${i}/vendor`, hits);
  }
  assertEquals(hits, [], `v3.2 voice-banned phrases found:\n${hits.join("\n")}`);
});

Deno.test("guard: vendor capability-gap variant actually reaches the CONDITION branch (proves the scan above is meaningful, not vacuous)", () => {
  const intake = { ...withDetail({}), third_party_admt: "Acme ADMT Platform", admt_detail: { ...BASE_INTAKE.admt_detail, hosting: "Hosted by the vendor", v_optout: "No", v_assist: "No" } };
  const c = computeAdmtV2(intake);
  assert(Object.values(c.vendor.controls).some((ctrl) => ctrl.relevance === "CONDITION"), "capability-gap variant should produce at least one CONDITION vendor control");
});

Deno.test("guard: composeVendorDependencyAnalysis names controls by their display label, never by the raw reported answer", () => {
  const intake = { ...withDetail({}), third_party_admt: "Acme ADMT Platform", admt_detail: { ...BASE_INTAKE.admt_detail, hosting: "Hosted by the vendor", v_optout: "No", v_assist: "No" } };
  const c = computeAdmtV2(intake);
  const text = composeVendorDependencyAnalysis(c.vendor);
  assert(text.includes("Downstream opt-out"), `expected the control's display label in the output, got: ${text}`);
  assert(text.includes("Access-request assistance"), `expected the control's display label in the output, got: ${text}`);
  assert(!/does not address:\s*(No|Not reported)(,|\.)/.test(text), `composer must not emit the raw "No"/"Not reported" answer as the control name: ${text}`);
});
