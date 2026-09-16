/**
 * admtDraft.ts — ADMT master review (2026-09-15, F01/F17) — the page's
 * draft-key and rail-routing tables, kept out of ADMTChecker.tsx so the
 * vitest (src/test/admt-intake-review-2026-09-15.test.ts) can import them
 * without mounting the page.
 */

/**
 * F17 — drafts saved before 2026-09-05 (AD 03) used camelCase state names
 * (organizationName, systemName, …) rather than the payload's snake_case keys.
 * Resuming one restored nothing and dismissed the banner — the "visible Step 1
 * blank" observation. Legacy keys map onto the current keys here.
 */
export const ADMT_LEGACY_DRAFT_KEYS: Readonly<Record<string, string>> = Object.freeze({
  organizationName: "organization_name", systemName: "system_name", systemType: "system_type", systemDescription: "system_description",
  decisionDomains: "decision_domains", humanReview: "human_review", trainingDataUse: "training_data_use", profilingUse: "profiling_use",
  noticeDelivery: "notice_delivery", noticeHasSpecificPurpose: "notice_has_specific_purpose", noticePurposeText: "notice_purpose_text",
  noticeHasOptOutDesc: "notice_has_opt_out_desc", noticeHasAccessDesc: "notice_has_access_desc", noticeHasAntiRetaliation: "notice_has_anti_retaliation",
  noticeHasHowItWorks: "notice_has_how_it_works", noticeHasAlternativeProcess: "notice_has_alternative_process", noticeFullText: "notice_full_text",
  noticeElementText: "notice_element_text", noticeTiming: "notice_timing",
  optOutException: "opt_out_exception", optOutMethods: "opt_out_methods", optOutLinkTitle: "opt_out_link_title",
  optOutNoCookieBanner: "opt_out_no_cookie_banner", optOutNoAccountRequired: "opt_out_no_account_required",
  optOutConfirmationMechanism: "opt_out_confirmation_mechanism", optOutAppealProcess: "opt_out_appeal_process", optOutFairnessDoc: "opt_out_fairness_doc",
  optOut15DayProcess: "opt_out_15_day_process", optOutHandling: "opt_out_handling_confirmations",
  accessSubmissionMethods: "access_submission_methods", accessVerificationProcess: "access_verification_process",
  accessLogicDisclosure: "access_logic_disclosure", accessOutcomeDisclosure: "access_outcome_disclosure",
  accessResponseTimeline: "access_response_timeline", accessTradeSecretPolicy: "access_trade_secret_policy", accessReadiness: "access_readiness",
  caConsumerCount: "ca_consumer_count", thirdPartyAdmt: "third_party_admt", admtSystemCount: "admt_system_count",
  affectedPopulationBand: "affected_population_band", roleRoster: "role_roster", adv: "admt_detail",
});

/** The payload keys a draft can restore (plus the F19 exhibit stash). */
export const ADMT_DRAFT_KEYS: ReadonlySet<string> = new Set([...Object.values(ADMT_LEGACY_DRAFT_KEYS), "exhibit_stash"]);

/** Maps legacy camelCase keys onto the current snake_case keys; a current key already present wins. */
export function normaliseAdmtDraft(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };
  for (const [legacy, current] of Object.entries(ADMT_LEGACY_DRAFT_KEYS)) {
    if (legacy in raw && !(current in raw)) out[current] = raw[legacy];
  }
  return out;
}

/** True when a normalised draft carries at least one non-empty recognised answer. */
export function draftHasRecognisedAnswers(d: Record<string, unknown>): boolean {
  return Object.keys(d).some((k) => {
    if (!ADMT_DRAFT_KEYS.has(k) || k === "exhibit_stash") return false;
    const v = d[k];
    if (v === undefined || v === null || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v as object).length > 0;
    return true;
  });
}

/**
 * F01 — each transcribed notice element routes the statute rail to the
 * § 7220(c) element it belongs to, not to one generic entry.
 */
export const NOTICE_ELEMENT_RAIL: Readonly<Record<string, string>> = Object.freeze({
  purpose: "notice_specific_purpose",
  optout: "notice_opt_out_description",
  access: "notice_access_right_description",
  antiretaliation: "notice_anti_retaliation",
  howworks_inputs: "notice_how_admt_works",
  howworks_output: "notice_how_admt_works",
  altprocess: "notice_how_admt_works",
});

/** The six § 7222(b) readiness elements the page asks about (rail keys are `access_readiness_<k>`). */
export const ACCESS_READINESS_ELEMENT_KEYS = ["b1_purpose", "b2_logic", "b3_output_use", "b3_outcome", "b3_human_role", "b4_rights"] as const;
