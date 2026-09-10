// BATCH e74fdbfd (2026-09-09) — cppa_admt run 9373f1fe (Velostream). The
// Company answered "None of these categories"; the scope qualification said
// the out-of-scope determination RESTS on that answer, and the applicability
// table's "Covered significant decision" row read "Not enough information to
// determine whether a covered decision is at issue" beside it. Root cause:
// admt-v2-deterministic.ts sets significantDecisionEffect = WEIGHS_AGAINST
// for the categorical negative (doc158 §1 pins that), but the assembler's
// phrase table only knew SUPPORTS. A categorical answer is a determined
// fact, not a gap — the row (and Appendix A's mirror of it) now reads "Cuts
// against Article 11 applicability."; an unanswered domain question still
// reads "Not enough information".

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_NONE_DOMAIN,
  computeAdmtV2,
} from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import {
  NOTICE_TIMING_OPTS as C_NT,
  OPT_OUT_HANDLING_OPTS as C_OH,
} from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";

type Bag = Record<string, unknown>;

const QUALIFYING = "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision";
const FINANCIAL = "Financial or lending services (credit decisions, loans, accounts)";

/** doc158's complete record; the tests override the domain answer. */
function base(over: Bag = {}): Bag {
  return {
    organization_name: "Velostream Technologies, Inc.", system_name: "VeloInsight Recommendation Engine", system_type: "ML classifier",
    system_description: "A gradient-boosted classifier that ranks and surfaces personalised feature recommendations within the platform.",
    decision_domains: [FINANCIAL],
    human_review: QUALIFYING,
    training_data_use: "Yes", profiling_use: "Yes",
    notice_delivery: ["In-app just-in-time notice before data collection"],
    notice_timing: C_NT[0],
    notice_has_specific_purpose: "Yes", notice_purpose_text: "We rank the features we show you from how you use the platform.",
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
    admt_detail: { solely_advertising: "No", sole_factor: "One of many factors", access_secure_transmission: "Encrypted self-service portal", access_denial_basis: "Conflict with federal law; explained in writing" },
    ...over,
  };
}

function text(intake: Bag): string {
  const computed = computeAdmtV2(intake);
  const doc = assembleAdmtV2Document({
    intake,
    computed,
    exhibit: null,
    organizationName: String(intake.organization_name ?? ""),
    systemName: String(intake.system_name ?? ""),
  });
  return skeletonDocumentToText(doc);
}

const NOT_ENOUGH = "Not enough information to determine whether a covered decision is at issue.";
const CUTS_AGAINST = "Cuts against Article 11 applicability.";

Deno.test("batch e74fdbfd — 'None of these categories' renders as a determined negative, never as 'Not enough information'", () => {
  const intake = base({ decision_domains: [ADMT_NONE_DOMAIN] });
  assertEquals(computeAdmtV2(intake).scope.significantDecisionEffect, "WEIGHS_AGAINST");
  const t = text(intake);
  assertStringIncludes(t, CUTS_AGAINST);
  assert(!t.includes(NOT_ENOUGH), "a categorical answer is a determined fact, not a gap");
  // The body's table and Appendix A's matrix say the same thing (the phrase catalog has one home).
  assert(t.split(CUTS_AGAINST).length - 1 >= 2, "applicability table and Appendix A both carry the phrase");
});

Deno.test("batch e74fdbfd — a regulated domain still supports applicability, and an unanswered domain question still reads 'Not enough information'", () => {
  assertStringIncludes(text(base()), "Supports Article 11 applicability.");
  const open = base({ decision_domains: [] });
  assertEquals(computeAdmtV2(open).scope.significantDecisionEffect, "NEUTRAL");
  assertStringIncludes(text(open), NOT_ENOUGH);
});
