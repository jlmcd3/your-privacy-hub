// supabase/functions/_shared/admt-citation-registry.ts
// Layer 1 — Citation Registry, Layer 2 — Resolver, Layer 4 — Validator
// SINGLE SOURCE OF TRUTH for every "§"-formatted citation the ADMT generator
// is allowed to print. The LLM never authors a section number; it produces
// element ids only, and the resolver assigns the registry's `section` string
// to each finding deterministically from the normalized intake.
//
// Maintenance rule: do NOT introduce a `§ 7xxx` literal anywhere outside this
// file. A CI lint enforces this.

export type CitationId =
  | "admt_def" | "admt_def_profiling" | "human_involvement"
  | "sig_decision" | "sig_financial" | "sig_housing" | "sig_education" | "sig_employment" | "sig_healthcare"
  | "spi_def"
  | "scope_apply" | "scope_deadline"
  | "ra_trigger_sell" | "ra_trigger_spi" | "ra_trigger_admt" | "ra_trigger_observe" | "ra_trigger_location" | "ra_trigger_train"
  | "ra_content" | "ra_timing_new" | "ra_timing_existing" | "ra_submit"
  | "notice_purpose" | "notice_optout" | "notice_optout_appeal" | "notice_optout_exc"
  | "notice_access" | "notice_antiretal" | "notice_howworks_inputs" | "notice_howworks_output"
  | "notice_altprocess" | "notice_ts_secret" | "notice_ts_security" | "notice_timing"
  | "optout_offer" | "optout_exc_appeal" | "optout_exc_hire" | "optout_exc_work"
  | "optout_methods" | "optout_link_title" | "optout_no_cookiebanner"
  | "optout_easy" | "optout_no_account" | "optout_no_verify" | "optout_fraud" | "optout_confirm"
  | "optout_partial" | "optout_agent" | "optout_wait12" | "optout_no_retal"
  | "optout_preinit" | "optout_cease15" | "optout_notify_sp"
  | "access_provide" | "access_purpose" | "access_logic" | "access_outcome" | "access_outcome_future"
  | "access_antiretal" | "access_antiretal_link" | "access_ts_secret" | "access_ts_security"
  | "access_methods" | "access_verify" | "access_verify_nonacct" | "access_denial"
  | "access_secure_tx" | "access_portal" | "access_sp_assist" | "access_aggregate"
  | "access_no_retal" | "access_timeline"
  | "sp_contract" | "tp_contract";

export interface RegistryEntry {
  id: CitationId;
  section: string;   // the exact string to print
  label: string;     // human-readable element it governs
  authority: string; // statutory authority
  snippet: string;   // <15-word paraphrase for evidence (NEVER printed)
}

export const CITATION_REGISTRY: Record<CitationId, RegistryEntry> = {
  admt_def:              { id: "admt_def",              section: "11 CCR § 7001(e)",       label: "ADMT definition", authority: "11 CCR Art. 11", snippet: "ADMT defined" },
  admt_def_profiling:    { id: "admt_def_profiling",    section: "11 CCR § 7001(e)(2)",    label: "profiling that replaces human decisionmaking", authority: "11 CCR Art. 11", snippet: "profiling subtype" },
  human_involvement:     { id: "human_involvement",     section: "11 CCR § 7001(e)(1)",    label: "three-part human-involvement test", authority: "11 CCR Art. 11", snippet: "interpret review authority" },
  sig_decision:          { id: "sig_decision",          section: "11 CCR § 7001(ddd)",     label: "significant decision definition", authority: "11 CCR Art. 11", snippet: "five enumerated domains" },
  sig_financial:         { id: "sig_financial",         section: "11 CCR § 7001(ddd)(1)",  label: "financial or lending services", authority: "11 CCR Art. 11", snippet: "financial lending" },
  sig_housing:           { id: "sig_housing",           section: "11 CCR § 7001(ddd)(2)",  label: "housing", authority: "11 CCR Art. 11", snippet: "housing" },
  sig_education:         { id: "sig_education",         section: "11 CCR § 7001(ddd)(3)",  label: "education enrollment or opportunity", authority: "11 CCR Art. 11", snippet: "education" },
  sig_employment:        { id: "sig_employment",        section: "11 CCR § 7001(ddd)(4)",  label: "employment or independent contracting", authority: "11 CCR Art. 11", snippet: "employment IC" },
  sig_healthcare:        { id: "sig_healthcare",        section: "11 CCR § 7001(ddd)(5)",  label: "healthcare services", authority: "11 CCR Art. 11", snippet: "healthcare" },
  spi_def:               { id: "spi_def",               section: "11 CCR § 7001(bbb)",     label: "sensitive personal information definition", authority: "11 CCR Art. 11", snippet: "SPI elements" },
  scope_apply:           { id: "scope_apply",           section: "11 CCR § 7200(a)",       label: "when Article 11 applies", authority: "11 CCR Art. 11", snippet: "scope" },
  scope_deadline:        { id: "scope_deadline",        section: "11 CCR § 7200(b)",       label: "January 1 2027 compliance deadline", authority: "11 CCR Art. 11", snippet: "Jan 1 2027" },
  ra_trigger_sell:       { id: "ra_trigger_sell",       section: "11 CCR § 7150(b)(1)",    label: "RA trigger — selling/sharing PI", authority: "11 CCR Art. 10", snippet: "sell share" },
  ra_trigger_spi:        { id: "ra_trigger_spi",        section: "11 CCR § 7150(b)(2)",    label: "RA trigger — processing SPI", authority: "11 CCR Art. 10", snippet: "process SPI" },
  ra_trigger_admt:       { id: "ra_trigger_admt",       section: "11 CCR § 7150(b)(3)",    label: "RA trigger — ADMT for significant decision", authority: "11 CCR Art. 10", snippet: "ADMT significant decision" },
  ra_trigger_observe:    { id: "ra_trigger_observe",    section: "11 CCR § 7150(b)(4)",    label: "RA trigger — inference via systematic observation", authority: "11 CCR Art. 10", snippet: "systematic observation" },
  ra_trigger_location:   { id: "ra_trigger_location",   section: "11 CCR § 7150(b)(5)",    label: "RA trigger — sensitive-location inference", authority: "11 CCR Art. 10", snippet: "sensitive location" },
  ra_trigger_train:      { id: "ra_trigger_train",      section: "11 CCR § 7150(b)(6)",    label: "RA trigger — training ADMT / facial/emotion/identity tech", authority: "11 CCR Art. 10", snippet: "train ADMT" },
  ra_content:            { id: "ra_content",            section: "11 CCR § 7152",          label: "risk-assessment content requirements", authority: "11 CCR Art. 10", snippet: "RA content" },
  ra_timing_new:         { id: "ra_timing_new",         section: "11 CCR § 7155(a)(1)",    label: "RA before initiating new/changed processing", authority: "11 CCR Art. 10", snippet: "before initiating" },
  ra_timing_existing:    { id: "ra_timing_existing",    section: "11 CCR § 7155(b)",       label: "RA by Dec 31 2027 for pre-existing processing", authority: "11 CCR Art. 10", snippet: "Dec 31 2027" },
  ra_submit:             { id: "ra_submit",             section: "11 CCR § 7157(a)(1)",    label: "RA submission to Agency by April 1 2028", authority: "11 CCR Art. 10", snippet: "submit Apr 1 2028" },
  notice_purpose:        { id: "notice_purpose",        section: "11 CCR § 7220(c)(1)",    label: "Pre-use Notice — specific decision (purpose)", authority: "11 CCR Art. 11", snippet: "specific decision" },
  notice_optout:         { id: "notice_optout",         section: "11 CCR § 7220(c)(2)",    label: "Pre-use Notice — opt-out right + instructions", authority: "11 CCR Art. 11", snippet: "opt-out instructions" },
  notice_optout_appeal:  { id: "notice_optout_appeal",  section: "11 CCR § 7220(c)(2)(A)", label: "Pre-use Notice — describe human appeal (if exception relied on)", authority: "11 CCR Art. 11", snippet: "human-appeal describe" },
  notice_optout_exc:     { id: "notice_optout_exc",     section: "11 CCR § 7220(c)(2)(B)", label: "Pre-use Notice — identify other exception relied on", authority: "11 CCR Art. 11", snippet: "identify exception" },
  notice_access:         { id: "notice_access",         section: "11 CCR § 7220(c)(3)",    label: "Pre-use Notice — access right + instructions", authority: "11 CCR Art. 11", snippet: "access instructions" },
  notice_antiretal:      { id: "notice_antiretal",      section: "11 CCR § 7220(c)(4)",    label: "Pre-use Notice — anti-retaliation statement", authority: "11 CCR Art. 11", snippet: "anti-retaliation" },
  notice_howworks_inputs:{ id: "notice_howworks_inputs",section: "11 CCR § 7220(c)(5)(A)", label: "Pre-use Notice — input categories affecting output", authority: "11 CCR Art. 11", snippet: "inputs" },
  notice_howworks_output:{ id: "notice_howworks_output",section: "11 CCR § 7220(c)(5)(B)", label: "Pre-use Notice — output type, sole-factor, non-qualifying human role", authority: "11 CCR Art. 11", snippet: "output sole-factor" },
  notice_altprocess:     { id: "notice_altprocess",     section: "11 CCR § 7220(c)(5)(C)", label: "Pre-use Notice — alternative process if consumer opts out", authority: "11 CCR Art. 11", snippet: "alt process" },
  notice_ts_secret:      { id: "notice_ts_secret",      section: "11 CCR § 7220(d)(1)",    label: "Pre-use Notice — trade-secret carve-out (Civ. Code § 3426.1(d))", authority: "Civ. Code § 3426.1(d)", snippet: "trade secret" },
  notice_ts_security:    { id: "notice_ts_security",    section: "11 CCR § 7220(d)(2)",    label: "Pre-use Notice — security/fraud/safety carve-out", authority: "11 CCR Art. 11", snippet: "security carve-out" },
  notice_timing:         { id: "notice_timing",         section: "11 CCR § 7220(b)(2)",    label: "Pre-use Notice — presented at/before collection", authority: "11 CCR Art. 11", snippet: "timing" },
  optout_offer:          { id: "optout_offer",          section: "11 CCR § 7221(a)",       label: "must offer opt-out unless exception", authority: "11 CCR Art. 11", snippet: "offer opt-out" },
  optout_exc_appeal:     { id: "optout_exc_appeal",     section: "11 CCR § 7221(b)(1)",    label: "exception — human-appeal path", authority: "11 CCR Art. 11", snippet: "human-appeal exception" },
  optout_exc_hire:       { id: "optout_exc_hire",       section: "11 CCR § 7221(b)(2)",    label: "exception — admission/accept/hire ability assessment", authority: "11 CCR Art. 11", snippet: "ability assessment" },
  optout_exc_work:       { id: "optout_exc_work",       section: "11 CCR § 7221(b)(3)",    label: "exception — work allocation/assignment & compensation", authority: "11 CCR Art. 11", snippet: "work allocation" },
  optout_methods:        { id: "optout_methods",        section: "11 CCR § 7221(c)",       label: "two or more designated opt-out methods", authority: "11 CCR Art. 11", snippet: "two methods" },
  optout_link_title:     { id: "optout_link_title",     section: "11 CCR § 7221(c)(1)",    label: "online opt-out link + plain-language title", authority: "11 CCR Art. 11", snippet: "link title" },
  optout_no_cookiebanner:{ id: "optout_no_cookiebanner",section: "11 CCR § 7221(c)(4)",    label: "cookie banner alone is not a valid method", authority: "11 CCR Art. 11", snippet: "no cookie banner" },
  optout_easy:           { id: "optout_easy",           section: "11 CCR § 7221(d)",       label: "easy / minimal steps", authority: "11 CCR Art. 11 & § 7004", snippet: "easy" },
  optout_no_account:     { id: "optout_no_account",     section: "11 CCR § 7221(e)",       label: "must not require account creation to opt out", authority: "11 CCR Art. 11", snippet: "no account" },
  optout_no_verify:      { id: "optout_no_verify",      section: "11 CCR § 7221(f)",       label: "may not require verification to opt out", authority: "11 CCR Art. 11", snippet: "no verify" },
  optout_fraud:          { id: "optout_fraud",          section: "11 CCR § 7221(g)",       label: "fraud-based denial", authority: "11 CCR Art. 11", snippet: "fraud denial" },
  optout_confirm:        { id: "optout_confirm",        section: "11 CCR § 7221(h)",       label: "confirmation the opt-out was processed", authority: "11 CCR Art. 11", snippet: "confirmation" },
  optout_partial:        { id: "optout_partial",        section: "11 CCR § 7221(i)",       label: "per-use opt-out + single global option", authority: "11 CCR Art. 11", snippet: "partial / global" },
  optout_agent:          { id: "optout_agent",          section: "11 CCR § 7221(j)",       label: "authorized agent", authority: "11 CCR Art. 11", snippet: "agent" },
  optout_wait12:         { id: "optout_wait12",         section: "11 CCR § 7221(k)",       label: "12-month wait before re-soliciting consent", authority: "11 CCR Art. 11", snippet: "12-mo wait" },
  optout_no_retal:       { id: "optout_no_retal",       section: "11 CCR § 7221(l)",       label: "no retaliation", authority: "Civ. Code § 1798.125 / Art. 7", snippet: "no retaliation" },
  optout_preinit:        { id: "optout_preinit",        section: "11 CCR § 7221(m)",       label: "must not initiate processing if opted out pre-processing", authority: "11 CCR Art. 11", snippet: "pre-initiate" },
  optout_cease15:        { id: "optout_cease15",        section: "11 CCR § 7221(n)(1)",    label: "cease processing within 15 business days", authority: "11 CCR Art. 11", snippet: "15 biz days" },
  optout_notify_sp:      { id: "optout_notify_sp",      section: "11 CCR § 7221(n)(2)",    label: "notify service providers/contractors/others of opt-out", authority: "11 CCR Art. 11", snippet: "notify SP" },
  access_provide:        { id: "access_provide",        section: "11 CCR § 7222(a)",       label: "provide info about ADMT use on request", authority: "11 CCR Art. 11", snippet: "provide on request" },
  access_purpose:        { id: "access_purpose",        section: "11 CCR § 7222(b)(1)",    label: "access response — specific purpose", authority: "11 CCR Art. 11", snippet: "specific purpose" },
  access_logic:          { id: "access_logic",          section: "11 CCR § 7222(b)(2)",    label: "access response — logic disclosure", authority: "11 CCR Art. 11", snippet: "logic" },
  access_outcome:        { id: "access_outcome",        section: "11 CCR § 7222(b)(3)",    label: "access response — outcome / sole-factor / non-qualifying human role", authority: "11 CCR Art. 11", snippet: "outcome sole-factor" },
  access_outcome_future: { id: "access_outcome_future", section: "11 CCR § 7222(b)(3)(A)", label: "access response — future use of output", authority: "11 CCR Art. 11", snippet: "future use" },
  access_antiretal:      { id: "access_antiretal",      section: "11 CCR § 7222(b)(4)",    label: "access response — anti-retaliation + other-rights", authority: "11 CCR Art. 11", snippet: "anti-retaliation" },
  access_antiretal_link: { id: "access_antiretal_link", section: "11 CCR § 7222(b)(4)(A)", label: "access response — direct link to policy section", authority: "11 CCR Art. 11", snippet: "direct link" },
  access_ts_secret:      { id: "access_ts_secret",      section: "11 CCR § 7222(c)(1)",    label: "access response — trade-secret carve-out (Civ. Code § 3426.1(d))", authority: "Civ. Code § 3426.1(d)", snippet: "trade secret" },
  access_ts_security:    { id: "access_ts_security",    section: "11 CCR § 7222(c)(2)",    label: "access response — security/fraud/safety carve-out", authority: "11 CCR Art. 11", snippet: "security carve-out" },
  access_methods:        { id: "access_methods",        section: "11 CCR § 7222(d)",       label: "access submission methods; no dark patterns", authority: "11 CCR Art. 11 & § 7020", snippet: "methods" },
  access_verify:         { id: "access_verify",         section: "11 CCR § 7222(e)",       label: "access verification required", authority: "11 CCR Art. 5 & Art. 11", snippet: "verify" },
  access_verify_nonacct: { id: "access_verify_nonacct", section: "11 CCR § 7062(c)",       label: "non-accountholder — reasonably-high-certainty verification", authority: "11 CCR Art. 5", snippet: "non-acct verify" },
  access_denial:         { id: "access_denial",         section: "11 CCR § 7222(f)",       label: "denial for legal conflict / CCPA exception; partial-denial disclosure", authority: "11 CCR Art. 11", snippet: "denial basis" },
  access_secure_tx:      { id: "access_secure_tx",      section: "11 CCR § 7222(g)",       label: "reasonable security measures when transmitting response", authority: "11 CCR Art. 11", snippet: "secure transmission" },
  access_portal:         { id: "access_portal",         section: "11 CCR § 7222(h)",       label: "self-service portal option", authority: "11 CCR Art. 11", snippet: "portal" },
  access_sp_assist:      { id: "access_sp_assist",      section: "11 CCR § 7222(i)",       label: "service-provider/contractor assistance", authority: "11 CCR Art. 11", snippet: "SP assist" },
  access_aggregate:      { id: "access_aggregate",      section: "11 CCR § 7222(j)",       label: "aggregate response when ADMT used >4× on consumer in 12 mo", authority: "11 CCR Art. 11", snippet: "aggregate >4x" },
  access_no_retal:       { id: "access_no_retal",       section: "11 CCR § 7222(k)",       label: "no retaliation for access requests", authority: "11 CCR Art. 11", snippet: "no retaliation" },
  access_timeline:       { id: "access_timeline",       section: "11 CCR § 7021",          label: "10-biz-day acknowledgment; 45-day response (90 max)", authority: "11 CCR Art. 4", snippet: "10 / 45 / 90" },
  sp_contract:           { id: "sp_contract",           section: "11 CCR § 7051(a)",       label: "service-provider contract terms (Art. 11 assistance + audit)", authority: "11 CCR Art. 6", snippet: "SP contract" },
  tp_contract:           { id: "tp_contract",           section: "11 CCR § 7053",          label: "third-party contract terms", authority: "11 CCR Art. 6", snippet: "TP contract" },
};

// ── containsSPI gate ────────────────────────────────────────────────────────
// True only when an actual § 7001(bbb) element is present in the intake.
// Income, DTI, credit history, and generic "transaction patterns" do NOT
// satisfy this on their own.
export function containsSPI(intake: any): boolean {
  const hay = JSON.stringify(intake ?? {}).toLowerCase();
  const positives = [
    "precise geolocation",
    "government id", "government identifier", "driver's license", "passport",
    "social security", "ssn",
    "biometric",
    "racial", "ethnic", "religious", "union membership",
    "neural", "genetic",
    "health data", "health information", "medical record", "diagnosis",
    "sex life", "sexual orientation",
    "minor", "under 16", "child",
    "account credential", "account number with", "account number and password",
  ];
  return positives.some((needle) => hay.includes(needle));
}

// ── Layer 2 — Resolver ──────────────────────────────────────────────────────
// `elementId` is a stable id from the ADMT checklist. The resolver maps it,
// combined with normalized intake, to the deterministic set of registry
// entries that govern that element. The model never sees `section` strings.

export type ElementId =
  // scope
  | "qualifies_admt" | "significant_decision" | "compliance_deadline" | "human_involvement"
  | "admt_use_frequency_log"
  // RA
  | "ra_program"
  // Pre-use Notice
  | "notice_purpose" | "notice_optout" | "notice_access" | "notice_antiretaliation"
  | "notice_howworks" | "notice_alternative_process" | "notice_trade_secret"
  // Opt-out
  | "optout_offer" | "optout_designated_methods" | "optout_account_barrier"
  | "optout_confirmation" | "optout_processing"
  // Access
  | "access_specific_purpose" | "access_logic" | "access_outcome_sole_factor"
  | "access_antiretaliation" | "access_trade_secret" | "access_timeline"
  | "access_secure_transmission" | "access_denial_basis" | "access_aggregate_log"
  | "access_verification"
  // Vendor
  | "sp_contract_terms";

export interface ResolverResult {
  citationIds: CitationId[];
  sections: string[];   // canonical strings, joined by " + "
  evidence: string[];   // snippets only — not for printing
  assumptionFlag?: string | null;
}

export interface NormalizedIntake {
  significantDecisionDomain?: "financial" | "housing" | "education" | "employment" | "healthcare" | "advertising" | "other" | null;
  sellsOrSharesPI?: boolean;
  usesADMTForSignificantDecision?: boolean;
  profilingUse?: boolean;
  observationOfApplicantOrWorker?: boolean;
  sensitiveLocationInference?: boolean;
  trainsADMT?: boolean;
  processingStartedBeforeEffectiveDate?: boolean | null;
  optOutExceptionClaimed?: "human_appeal" | "hire_admission" | "work_allocation" | "other" | "none" | null;
  noticeClaimsSecuritySafetyTradeSecret?: boolean;
  accessClaimsSecuritySafetyTradeSecret?: boolean;
  offersOnlineOptOutForm?: boolean;
  cookieBannerInvolved?: boolean;
  outputReusedForFutureDecisions?: boolean;
  nonAccountholderRequest?: boolean;
}

// Build a normalized intake from the raw ADMT intake row.
export function normalizeIntake(intake: any): NormalizedIntake {
  const d = (intake?.admt_detail ?? {}) as any;
  const domains: string[] = intake?.decision_domains ?? [];
  const lower = domains.map((s) => String(s ?? "").toLowerCase());
  let domain: NormalizedIntake["significantDecisionDomain"] = null;
  if (lower.some((x) => /financ|lend|credit|loan/.test(x))) domain = "financial";
  else if (lower.some((x) => x.includes("hous"))) domain = "housing";
  else if (lower.some((x) => x.includes("educ"))) domain = "education";
  else if (lower.some((x) => /employ|hir|hr|independ/.test(x))) domain = "employment";
  else if (lower.some((x) => /health|medic|clinic/.test(x))) domain = "healthcare";
  else if (lower.some((x) => /advertis|market|audien|target/.test(x))) domain = "advertising";
  else if (lower.length) domain = "other";

  const yes = (v: unknown) => String(v ?? "").toLowerCase().startsWith("y");

  const exc = String(intake?.opt_out_exception ?? "").toLowerCase();
  let exception: NormalizedIntake["optOutExceptionClaimed"] = null;
  if (/human.?appeal|appeal/.test(exc)) exception = "human_appeal";
  else if (/admiss|accept|hire/.test(exc)) exception = "hire_admission";
  else if (/work|allocat|assign|compensat/.test(exc)) exception = "work_allocation";
  else if (/other/.test(exc) || d.opt_out_exception_other) exception = "other";
  else if (/none|provided/.test(exc)) exception = "none";

  return {
    significantDecisionDomain: domain,
    sellsOrSharesPI: yes(intake?.sells_or_shares_pi) || yes(d.sells_or_shares_pi),
    usesADMTForSignificantDecision: !!domain && domain !== "advertising" && domain !== "other",
    profilingUse: yes(intake?.profiling_use),
    observationOfApplicantOrWorker: yes(d.observation_of_applicant_or_worker),
    sensitiveLocationInference: yes(d.sensitive_location_inference),
    trainsADMT: yes(intake?.training_data_use),
    processingStartedBeforeEffectiveDate:
      d.processing_started_before_2026 == null
        ? null
        : yes(d.processing_started_before_2026),
    optOutExceptionClaimed: exception,
    noticeClaimsSecuritySafetyTradeSecret: yes(d.notice_security_safety_claim),
    accessClaimsSecuritySafetyTradeSecret: yes(d.access_security_safety_claim),
    offersOnlineOptOutForm: (intake?.opt_out_methods ?? []).some((m: string) =>
      /web|form|online|link|portal/i.test(String(m ?? ""))
    ),
    cookieBannerInvolved: yes(intake?.cookie_banner_involved) || yes(d.cookie_banner_involved),
    outputReusedForFutureDecisions: yes(d.feeds_future_decisions),
    nonAccountholderRequest: !yes(d.access_accountholders_only),
  };
}

function entry(id: CitationId) { return CITATION_REGISTRY[id]; }
function pack(ids: CitationId[], assumptionFlag: string | null = null): ResolverResult {
  // de-dup by CitationId, preserve order
  const seen = new Set<CitationId>();
  const ordered = ids.filter((i) => (seen.has(i) ? false : (seen.add(i), true)));
  // W9-ADMT-WIRE-P1 defect #2 — dedupe by canonical section string as well.
  // Two distinct CitationIds can resolve to the same rendered section
  // (e.g. two rows pointing at "11 CCR § 7001(e)"), which produced
  // "11 CCR § 7001(e) + 11 CCR § 7001(e)" when joined at emit time.
  const seenSection = new Set<string>();
  const sections: string[] = [];
  const evidence: string[] = [];
  const dedupedIds: CitationId[] = [];
  for (const i of ordered) {
    const sec = entry(i).section;
    if (seenSection.has(sec)) continue;
    seenSection.add(sec);
    sections.push(sec);
    evidence.push(entry(i).snippet);
    dedupedIds.push(i);
  }
  return { citationIds: dedupedIds, sections, evidence, assumptionFlag };
}

export function resolveCitations(elementId: ElementId, raw: any): ResolverResult {
  const n = normalizeIntake(raw);
  const intake = raw ?? {};

  switch (elementId) {
    case "qualifies_admt":
      return pack(n.profilingUse ? ["admt_def", "admt_def_profiling"] : ["admt_def"]);
    case "admt_use_frequency_log":
      return pack(["access_aggregate"]); // 11 CCR § 7222(j) — supports the aggregate-response option
    case "significant_decision": {
      const ids: CitationId[] = ["scope_apply"];
      const map: Record<string, CitationId> = {
        financial: "sig_financial", housing: "sig_housing", education: "sig_education",
        employment: "sig_employment", healthcare: "sig_healthcare",
      };
      if (n.significantDecisionDomain && map[n.significantDecisionDomain]) {
        ids.push(map[n.significantDecisionDomain]);
      }
      return pack(ids);
    }
    case "compliance_deadline":   return pack(["scope_deadline"]);
    case "human_involvement":     return pack(["human_involvement"]);

    case "ra_program": {
      const ids: CitationId[] = [];
      if (n.sellsOrSharesPI) ids.push("ra_trigger_sell");
      if (containsSPI(intake)) ids.push("ra_trigger_spi");
      if (n.usesADMTForSignificantDecision) ids.push("ra_trigger_admt");
      if (n.observationOfApplicantOrWorker) ids.push("ra_trigger_observe");
      if (n.sensitiveLocationInference) ids.push("ra_trigger_location");
      if (n.trainsADMT) ids.push("ra_trigger_train");
      ids.push("ra_content");
      let flag: string | null = null;
      if (n.processingStartedBeforeEffectiveDate === true) ids.push("ra_timing_existing");
      else if (n.processingStartedBeforeEffectiveDate === false) ids.push("ra_timing_new");
      else { ids.push("ra_timing_existing", "ra_timing_new"); flag = "Processing start date not supplied — both § 7155 branches surfaced."; }
      ids.push("ra_submit");
      return pack(ids, flag);
    }

    case "notice_purpose":          return pack(["notice_purpose"]);
    case "notice_optout": {
      const ids: CitationId[] = ["notice_optout"];
      if (n.optOutExceptionClaimed === "human_appeal") ids.push("notice_optout_appeal");
      else if (n.optOutExceptionClaimed && n.optOutExceptionClaimed !== "none") ids.push("notice_optout_exc");
      return pack(ids);
    }
    case "notice_access":           return pack(["notice_access"]);
    case "notice_antiretaliation":  return pack(["notice_antiretal"]);
    case "notice_howworks":         return pack(["notice_howworks_inputs", "notice_howworks_output"]);
    case "notice_alternative_process": return pack(["notice_altprocess"]);
    case "notice_trade_secret": {
      const ids: CitationId[] = ["notice_ts_secret"];
      if (n.noticeClaimsSecuritySafetyTradeSecret) ids.push("notice_ts_security");
      return pack(ids);
    }

    case "optout_offer": {
      const ids: CitationId[] = ["optout_offer"];
      if (n.optOutExceptionClaimed === "human_appeal") ids.push("optout_exc_appeal");
      else if (n.optOutExceptionClaimed === "hire_admission") ids.push("optout_exc_hire");
      else if (n.optOutExceptionClaimed === "work_allocation") ids.push("optout_exc_work");
      return pack(ids);
    }
    case "optout_designated_methods": {
      const ids: CitationId[] = ["optout_methods"];
      if (n.offersOnlineOptOutForm) ids.push("optout_link_title");
      if (n.cookieBannerInvolved)   ids.push("optout_no_cookiebanner");
      return pack(ids);
    }
    case "optout_account_barrier":  return pack(["optout_no_account"]);
    case "optout_confirmation":     return pack(["optout_confirm"]);
    case "optout_processing":       return pack(["optout_cease15", "optout_notify_sp", "optout_preinit"]);

    case "access_specific_purpose": return pack(["access_purpose"]);
    case "access_logic":            return pack(["access_logic"]);
    case "access_outcome_sole_factor": {
      const ids: CitationId[] = ["access_outcome", "human_involvement"];
      if (n.outputReusedForFutureDecisions) ids.push("access_outcome_future");
      return pack(ids);
    }
    case "access_antiretaliation":  return pack(["access_antiretal", "access_antiretal_link"]);
    case "access_trade_secret": {
      const ids: CitationId[] = ["access_ts_secret"];
      if (n.accessClaimsSecuritySafetyTradeSecret) ids.push("access_ts_security");
      return pack(ids);
    }
    case "access_timeline":         return pack(["access_timeline"]);
    case "access_secure_transmission": return pack(["access_secure_tx"]);
    case "access_denial_basis":     return pack(["access_denial", "access_verify"]);
    case "access_aggregate_log":    return pack(["access_aggregate"]);
    case "access_verification": {
      const ids: CitationId[] = ["access_verify"];
      if (n.nonAccountholderRequest) ids.push("access_verify_nonacct");
      return pack(ids);
    }

    case "sp_contract_terms":       return pack(["sp_contract", "optout_notify_sp"]);

    default: return pack([]);
  }
}

// ── Layer 4 — Validator ─────────────────────────────────────────────────────
// Subsection-required elements: must never render as bare parent.
export const REQUIRES_SUBSECTION: Record<string, RegExp[]> = {
  access_timeline:           [/^11 CCR § 7222(\(a\))?$/, /^11 CCR § 7222$/],
  access_secure_transmission:[/^11 CCR § 7222(\(a\))?$/, /^11 CCR § 7222$/],
  access_denial_basis:       [/^11 CCR § 7222(\(a\))?$/, /^11 CCR § 7222$/],
  access_aggregate_log:      [/^11 CCR § 7222(\(a\))?$/, /^11 CCR § 7222$/],
  optout_account_barrier:    [/^11 CCR § 7221(\(c\))?$/, /^11 CCR § 7221$/],
  optout_confirmation:       [/^11 CCR § 7221(\(c\))?$/, /^11 CCR § 7221$/],
  optout_processing:         [/^11 CCR § 7221(\(n\))?$/, /^11 CCR § 7221$/],
  ra_program:                [/^11 CCR § 7155$/, /^11 CCR § 7150$/, /^11 CCR § 7150\(b\)$/],
};

const REGISTRY_SECTIONS: Set<string> = new Set(
  Object.values(CITATION_REGISTRY).map((e) => e.section)
);

export interface ValidatorIssue { kind: string; detail: string; }

export function validateReport(report: any, _intake: any): ValidatorIssue[] {
  const issues: ValidatorIssue[] = [];
  if (!report || typeof report !== "object") return issues;

  // Collect all rendered findings.
  const buckets: Array<[string, any[]]> = [
    ["notice_gaps", report.notice_gaps ?? []],
    ["opt_out_gaps", report.opt_out_gaps ?? []],
    ["access_gaps", report.access_gaps ?? []],
  ];

  // #1 + #4 + status-contradiction detection.
  const citationStatusMap = new Map<string, Set<string>>();
  for (const [bucket, arr] of buckets) {
    for (const item of arr) {
      const c = String(item?.citation ?? "");
      if (!c) continue;
      // #1 orphan citations — every § string must come from the registry.
      const parts = c.split(/\s*\+\s*|;\s*|,\s*/).map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (/§/.test(p) && !REGISTRY_SECTIONS.has(p) && !/Civ\. Code/.test(p)) {
          issues.push({ kind: "orphan_citation", detail: `${bucket} → ${item?.element ?? "?"} → "${p}"` });
        }
      }
      // #4 bare-parent guard.
      const eid = String(item?.element_id ?? "");
      const banned = REQUIRES_SUBSECTION[eid];
      if (banned && banned.some((r) => parts.some((p) => r.test(p)))) {
        issues.push({ kind: "bare_parent", detail: `${eid} rendered bare parent: "${c}"` });
      }
      // #3 status contradiction.
      const status = String(item?.status ?? "");
      const key = c;
      if (!citationStatusMap.has(key)) citationStatusMap.set(key, new Set());
      citationStatusMap.get(key)!.add(status);
    }
  }
  for (const [cite, statuses] of citationStatusMap) {
    if (statuses.size > 1 && statuses.has("compliant") && (statuses.has("gap") || statuses.has("missing"))) {
      issues.push({ kind: "status_contradiction", detail: `"${cite}" appears as both compliant and gap/missing` });
    }
  }
  return issues;
}

// ── Helper — strip any model-authored citation tokens from prose ────────────
// Used so the model's free-text fields ("finding", "remediation") cannot
// smuggle a section number into rendering. The canonical citation is set by
// the resolver in `item.citation` and rendered separately.
export function stripModelCitations(text: unknown): string {
  if (typeof text !== "string") return "";
  let out = text;
  // W9-ADMT-WIRE-P1 defect #1 — swallow the ENTIRE citation token, including
  // every trailing "(x)" / "(x)(y)" / "(x)(y)(z)" subsection chain.
  //
  // ADMT-W16-FIX (2026-07-25) — DASH-FUSION GUARD: prior swallow matched
  // only "§+ 7XXX" with subsection chain. When the model authored a section
  // RANGE like "11 CCR §§ 7220–7222", the leading "§§ 7220" was consumed
  // but the trailing "–7222" survived and later fused with the neutral
  // fallback phrase downstream ("the applicable ADMT-subchapter provision–7222").
  // Extend the swallow to include an OPTIONAL "–7XXX" range tail so the
  // entire range collapses to a single "the cited provision" token — no
  // dangling numeric tail can survive to fuse with the fallback consumer.
  const SUBS = String.raw`(?:\s*\([A-Za-z0-9]+\))*`;
  const RANGE_TAIL = String.raw`(?:\s*[\u2013\u2014-]\s*7\d{3}` + SUBS + String.raw`)?`;
  out = out.replace(new RegExp(String.raw`\b11\s*CCR\s*§+\s*7\d{3}` + SUBS + RANGE_TAIL, "g"), "the cited provision");
  out = out.replace(new RegExp(String.raw`§+\s*7\d{3}` + SUBS + RANGE_TAIL, "g"), "the cited provision");
  out = out.replace(/§+\s*3426\.1\([a-z]\)/gi, "Cal. Civ. Code § 3426.1(d)"); // preserve legit trade-secret reference
  // Clean up any orphan ")(x)" fragments left by upstream mangling before this fix shipped.
  out = out.replace(/\bthe\s+cited\s+provision\s*\)?(?:\s*\([A-Za-z0-9]+\))+/g, "the cited provision");
  // ADMT-W16-FIX (2026-07-25) — defense-in-depth: strip any bare "–7XXX"
  // tail that survived upstream and now sits adjacent to the neutral
  // fallback phrase or the "cited provision" token, rather than allowing
  // it to render as a fused pseudo-citation.
  out = out.replace(/\bthe\s+cited\s+provision\s*[\u2013\u2014-]\s*7\d{3}(?:\s*\([A-Za-z0-9]+\))*/g, "the cited provision");
  out = out.replace(/\bthe\s+applicable\s+ADMT-subchapter\s+provision\s*[\u2013\u2014-]\s*7\d{3}(?:\s*\([A-Za-z0-9]+\))*/g, "the applicable ADMT-subchapter provision");
  // Collapse double spaces.
  out = out.replace(/\s{2,}/g, " ").trim();
  return out;
}

// ── Penalty constants ───────────────────────────────────────────────────────
export const PENALTY = {
  unintentional: 2663,
  intentionalOrMinors: 7988,
  cpiThroughYear: 2026,
  nextCpiYear: 2027,
  authority: "Cal. Civ. Code § 1798.155 / § 1798.199.90",
  disclaimer:
    "theoretical statutory maximum (per-consumer, no aggregate cap); actual CCPA resolutions settle materially lower.",
};

// ── L3 stage 1: registry ↔ corpus consistency check ────────────────────────
// Observe-only. For each CITATION_REGISTRY entry (and the PENALTY block) that
// HAS a corresponding row in cppa_authorities (status='current'), verify the
// registry's asserted figures/text appear in the corpus row's full_text /
// plain_summary. Entries with no corpus row are silently skipped — corpus
// rows are added out-of-band via verified insert statements, never authored
// here. Warnings surface via console.warn; no behavior change, ever.
type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        in: (col: string, vals: string[]) => Promise<{ data: any[] | null; error: any }>;
      };
    };
  };
};

let _registryCorpusChecked = false;
export async function verifyRegistryAgainstCorpus(supabase: SupabaseLike): Promise<void> {
  if (_registryCorpusChecked) return;
  _registryCorpusChecked = true;
  try {
    // Collect every citation the registry claims + the PENALTY authority.
    const registryCitations = Object.values(CITATION_REGISTRY).map((e) => e.section);
    const wantedCitations = Array.from(new Set([...registryCitations, PENALTY.authority]));

    const { data, error } = await supabase
      .from("cppa_authorities")
      .select("citation, full_text, plain_summary")
      .eq("status", "current")
      .in("citation", wantedCitations);

    if (error) {
      console.warn(`[admt-registry] corpus consistency query failed: ${String(error.message || error).slice(0, 200)}`);
      return;
    }
    const rows = data ?? [];
    if (!rows.length) return;   // nothing to compare yet; silent by design

    const byCitation = new Map<string, { full_text: string; plain_summary: string }>();
    for (const r of rows) {
      byCitation.set(String(r.citation), {
        full_text: String(r.full_text || ""),
        plain_summary: String(r.plain_summary || ""),
      });
    }

    // (1) Entry-level: the corpus row's citation IS the registry's section
    //     string (same normalized form). Warn only on shape mismatch — the
    //     `.in()` above already anchored on equality, so real mismatches
    //     would surface as "row missing", not as a value diff. We surface
    //     empty full_text since that would silently break future substring
    //     checks below.
    for (const entry of Object.values(CITATION_REGISTRY)) {
      const row = byCitation.get(entry.section);
      if (!row) continue;
      if (!row.full_text.trim()) {
        console.warn(`[admt-registry] corpus row for "${entry.section}" (${entry.id}) has empty full_text; consistency check skipped for this entry.`);
      }
    }

    // (2) PENALTY block: figures + CPI year must appear verbatim in the
    //     corpus authority's full_text or plain_summary. Missing = drift.
    const penaltyRow = byCitation.get(PENALTY.authority);
    if (penaltyRow) {
      const hay = `${penaltyRow.full_text}\n${penaltyRow.plain_summary}`;
      const checks: Array<{ label: string; needle: string }> = [
        { label: "unintentional per-violation", needle: String(PENALTY.unintentional) },
        { label: "intentional/minors per-violation", needle: String(PENALTY.intentionalOrMinors) },
        { label: "CPI-through year", needle: String(PENALTY.cpiThroughYear) },
      ];
      for (const c of checks) {
        if (!hay.includes(c.needle)) {
          console.warn(`[admt-registry] PENALTY drift: registry "${c.label}"=${c.needle} not found in corpus row for ${PENALTY.authority}. Verify the registry constant against the current CPI-adjusted amount.`);
        }
      }
    }
  } catch (e) {
    console.warn(`[admt-registry] corpus consistency check threw: ${String(e).slice(0, 200)}`);
  }
}

/**
 * R-TURN-1 item 3 — regenerate the ADMT product-prompt VERIFIED-DEPTH
 * whitelist from the registry at module-load time so the prompt and the
 * registry can NEVER drift. Returns an ordered, de-duplicated list of
 * every § 720x / § 722x citation path (with all ancestor prefixes) that
 * CITATION_REGISTRY carries.
 */
export function buildAdmtVerifiedWhitelist(): string[] {
  const set = new Set<string>();
  const RE = /^11 CCR (§\s*72(?:00|2[012])(?:\([a-z0-9]+\))*)$/i;
  for (const e of Object.values(CITATION_REGISTRY)) {
    const m = e.section.match(RE);
    if (!m) continue;
    const base = m[1].replace(/§\s*/, "§ ");
    const tokens = base.match(/§\s*\d+|\([a-z0-9]+\)/gi) ?? [];
    let acc = "";
    for (const t of tokens) {
      acc += (acc && !t.startsWith("(") ? " " : "") + t;
      set.add(acc.replace(/§\s*/, "§ "));
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
}

