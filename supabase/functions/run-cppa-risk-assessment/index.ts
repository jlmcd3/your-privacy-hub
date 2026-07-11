// qb8 build active
// run-meter deploy-check v1
// CPPA Risk Assessment — v4 (CR-2, June 2026)
// Five-stage intake + corpus-grounded generation. See
// EUP_CPPA_Risk_Assessment_Redesign.md (CR-2) for the spec.
//
// Pipeline:
//   1. Normalise intake (shim legacy flat payloads -> minimal five-stage).
//   2. Pre-generation validation (skipped/relaxed for legacy-shimmed payloads).
//   3. Parallel corpus retrieval: get-enforcement-context +
//      generate-longitudinal-synthesis.
//   4. Single generation call using the new § 7150–7157 system prompt.
//   5. Persist new-schema JSON to cppa_assessments.report_data.
//
// NOTE: The frontend intake form (src/pages/CPPARiskAssessment.tsx) and the
// result-page renderer still consume the legacy q*/i* schema. The shim keeps
// existing drafts running; the result page will need a separate redesign
// (tracked as a follow-up) before it can render the new output structure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { stampPromptVersion } from "../_shared/prompt-version.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type SystemBlock, type ToolModule, PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { BANNED_PHRASES } from "../_shared/citation-verifier.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
// [REVISED] authoritative § 7150(b) section strings — single source of truth
import { CITATION_REGISTRY, verifyRegistryAgainstCorpus } from "../_shared/admt-citation-registry.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import { guardInformationNeeded } from "../_shared/insufficient-info-guard.ts";
import { validateSourceFields } from "../_shared/source-fields-validator.ts";
import { observeCitations } from "../_shared/citation-observe.ts";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// L3 stage 1: fire-and-forget corpus-consistency check (once per warm
// instance). Non-blocking; warns on drift; no behavior change.
verifyRegistryAgainstCorpus(supabase).catch(() => { /* already warns internally */ });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Shim: legacy flat (q1..q20, i1..i9) intake -> minimal five-stage structure.
// ---------------------------------------------------------------------------
type ExceptionEntry = {
  claimed: boolean;
  scope: string;
  safeguards: string;
  documented: boolean;
  authority_basis: string;      // R1a — per-exception, claimed authority the generator TESTS (never adopts)
  retention_period: string;     // R1a — per-exception, additional to record-level i2_retention_period
};

type FiveStageIntake = {
  triggers: Record<string, boolean>;
  exceptions: Record<string, ExceptionEntry>;
  activity_details: any[];
  impact: Record<string, any>;
  org_context: Record<string, any>;
  annual_consumer_volume?: string;
  content_detail?: Record<string, any>;
};

const EMPTY_TRIGGERS = {
  sells_or_shares_pi: false,
  targeted_advertising: false,
  profiling_significant_effects: false,
  sensitive_pi_beyond_enumerated: false,
  high_volume_processing: false,
  admt_involved: false,
};

const EMPTY_EXCEPTION: ExceptionEntry = {
  claimed: false, scope: "", safeguards: "", documented: false, authority_basis: "", retention_period: "",
};
const EMPTY_EXCEPTIONS: Record<string, ExceptionEntry> = {
  fraud_detection: { ...EMPTY_EXCEPTION },
  security_integrity: { ...EMPTY_EXCEPTION },
  debugging: { ...EMPTY_EXCEPTION },
  transient_use: { ...EMPTY_EXCEPTION },
  internal_research: { ...EMPTY_EXCEPTION },
  employment_context: { ...EMPTY_EXCEPTION },
  legal_compliance: { ...EMPTY_EXCEPTION },
  consumer_request: { ...EMPTY_EXCEPTION },
};

// ---------------------------------------------------------------------------
// R1b0 — revenue-band classifier. Single source of truth for both the
// §1798.140(d)(1)(A) $25M line and the §7121(a) cyber-audit cohort date.
//   - "Under $25M"     → 2030-04-01 cohort (< $50M revenue)
//   - "$25M–$50M"      → 2030-04-01 cohort
//   - "$50M–$100M"     → 2029-04-01 cohort (M6 resolves)
//   - legacy "$25M–$100M" → indeterminate (straddles the $50M line)
//   - "$100M–$500M"    → 2028-04-01 cohort
//   - "Over $500M"     → 2028-04-01 cohort
// ---------------------------------------------------------------------------
export type RevenueBand = {
  key: "under_25m" | "25_50m" | "50_100m" | "legacy_25_100m" | "100_500m" | "over_500m" | "unspecified";
  label: string;
  audit_cohort: "2028-04-01" | "2029-04-01" | "2030-04-01" | "indeterminate";
  over_25m: boolean | "indeterminate";
  over_100m: boolean | "indeterminate";
};
export function classifyRevenueBand(q1: unknown): RevenueBand {
  const v = String(q1 ?? "").trim();
  switch (v) {
    case "Under $25M":  return { key: "under_25m",      label: v, audit_cohort: "2030-04-01",     over_25m: false,           over_100m: false };
    case "$25M–$50M":   return { key: "25_50m",         label: v, audit_cohort: "2030-04-01",     over_25m: true,            over_100m: false };
    case "$50M–$100M":  return { key: "50_100m",        label: v, audit_cohort: "2029-04-01",     over_25m: true,            over_100m: false };
    case "$25M–$100M":  return { key: "legacy_25_100m", label: v, audit_cohort: "indeterminate",  over_25m: true,            over_100m: false };
    case "$100M–$500M": return { key: "100_500m",       label: v, audit_cohort: "2028-04-01",     over_25m: true,            over_100m: true };
    case "Over $500M":  return { key: "over_500m",      label: v, audit_cohort: "2028-04-01",     over_25m: true,            over_100m: true };
    default:            return { key: "unspecified",    label: v || "not specified", audit_cohort: "indeterminate", over_25m: "indeterminate", over_100m: "indeterminate" };
  }
}

function shimLegacyIntake(intake: any): FiveStageIntake {
  console.warn(
    "[cppa-risk] legacy flat intake detected (intake.triggers undefined). " +
      "Shimming to minimal five-stage structure. Frontend should be migrated to the five-stage wizard.",
  );

  // Heuristic trigger mapping from legacy fields.
  const triggers = { ...EMPTY_TRIGGERS };
  const sells = typeof intake.q5_sell_share === "string"
    && /sell|share|both|^yes/i.test(intake.q5_sell_share)
    && !/^no/i.test(intake.q5_sell_share);
  if (sells) triggers.sells_or_shares_pi = true;
  if (intake.q15_sensitive_pi === "Yes") triggers.sensitive_pi_beyond_enumerated = true;
  // Precise geolocation is sensitive PI under § 1798.140(ae)(1).
  const piCatsForTrig = Array.isArray(intake.q4_pi_categories) ? intake.q4_pi_categories : [];
  if (piCatsForTrig.some((c: string) => /precise geolocation/i.test(String(c)))) triggers.sensitive_pi_beyond_enumerated = true;
  // Under-16 actual knowledge elevates to sensitive PI (§ 7001(bbb)).
  if (typeof intake.q15b_under16_knowledge === "string" && /^yes/i.test(intake.q15b_under16_knowledge)) triggers.sensitive_pi_beyond_enumerated = true;
  // Profiling via systematic observation / sensitive location (§ 7150(b)(4)).
  if (typeof intake.q5b_profiling_observation === "string" && /yes|both/i.test(intake.q5b_profiling_observation)) triggers.profiling_significant_effects = true;
  if (intake.q18_admt_use === "Yes" || intake.q18_admt_use === "In evaluation") triggers.admt_involved = true;
  // Training ADMT / facial / emotion / biometric (§ 7150(b)(6)).
  if (typeof intake.q18b_admt_training === "string" && /^yes/i.test(intake.q18b_admt_training)) triggers.admt_involved = true;
  // NOTE: high consumer volume is NOT a § 7150(b) Risk-Assessment trigger.
  // It is a § 7120 cyber-audit trigger — handled by the CPPA Cybersecurity tool.
  // Do not auto-set any § 7150(b) trigger from volume alone.
  // If no § 7150(b) trigger matches, validation below will surface a clear error.

  const piCats = Array.isArray(intake.q4_pi_categories) ? intake.q4_pi_categories : [];
  const activity_details = [{
    trigger_key: Object.entries(triggers).find(([, v]) => v)?.[0] ?? "sells_or_shares_pi",
    data_categories: piCats,
    consumer_categories: [],
    purpose_description: String(intake.i1_processing_purpose ?? "Legacy intake — purpose not captured at this specificity."),
    business_benefits: String((intake.impact_intake?.businessBenefits ?? "").trim() || "Not provided."),
    consumer_benefits: String((intake.impact_intake?.consumerBenefits ?? "").trim() || "Not provided."),
    stakeholder_public_benefits: String((intake.impact_intake?.stakeholderBenefits ?? "").trim() || "Not provided."),
    current_safeguards: String((intake.impact_intake?.safeguards ?? "").trim() || "Not provided."),
    minimum_pi_necessary: String((intake.i1b_min_pi ?? "").trim() || "Not provided."),
    pi_sources: String((intake.i4b_sources ?? "").trim() || "Not provided."),
    known_gaps: "",
    third_party_recipients: String(intake.i6_vendors ?? ""),
    cross_context_tracking: !!triggers.sells_or_shares_pi,
    profiling_inferences: !!triggers.admt_involved,
    children_in_scope: false,
  }];

  const hasDpia = intake.i9_has_existing_dpia === "Yes" || intake.i9_has_existing_dpia === true;
  const im = (intake.impact_intake ?? {}) as Record<string, any>;
  const impact = {
    likelihood_of_harm: String(im.likelihood || "Possible"),
    severity_of_harm: String(im.severity || "Moderate"),
    harm_types: Array.isArray(im.harmTypes) ? im.harmTypes : [],
    vulnerable_populations_detail: String(im.vulnerable ?? ""),
    benefits_outweigh_risks: String(im.benefitsOutweigh || "Uncertain"),
    benefits_outweigh_risks_rationale: String(im.benefitsRationale || "[Not provided in intake]"),
    cybersecurity_gaps_identified: im.cyberGaps === "Yes",
    prior_assessments_conducted: hasDpia,
    prior_assessment_date: "",
  };

  const org_context = {
    company_name: String(intake.entity_name || "[FILL IN — business legal name]"),
    sector: String(intake.q3_sector ?? "Not specified"),
    annual_revenue_threshold: String(intake.q1_revenue ?? "Not specified"),
    privacy_counsel_engaged: false,
    dpo_or_privacy_officer: false,
    board_level_oversight: false,
    existing_privacy_programme: "Not specified",
    cppa_audit_notification_received: false,
    additional_context: "",
  };

  // Map the user's claimed § 7152 exceptions over the empty baseline.
  const exceptionsIntake = (intake.exceptions_intake ?? {}) as Record<string, any>;
  const exceptions = { ...EMPTY_EXCEPTIONS };
  for (const [key, v] of Object.entries(exceptionsIntake)) {
    if (v && v.claimed && key in exceptions) {
      (exceptions as Record<string, ExceptionEntry>)[key] = {
        claimed: true,
        scope: String(v.scope ?? ""),
        safeguards: String(v.safeguards ?? ""),
        documented: Boolean(v.scope || v.safeguards),
        authority_basis: String(v.authority_basis ?? ""),   // R1a claimed authority (TESTED, never adopted)
        retention_period: String(v.retention_period ?? ""), // R1a per-exception retention (additional to i2_retention_period)
      };
    }
  }


  // Recover the § 7152(a)(1)–(9) content the wizard collects but the v4 slots don't carry.
  const content_detail = {
    retention_period: String(intake.i2_retention_period ?? ""),
    retention_criteria: String(intake.i2_retention_criteria ?? ""),
    retention_detail: String(intake.i2_retention_detail ?? ""),
    consumer_disclosures: Array.isArray(intake.i4_disclosure_mechanisms)
      ? intake.i4_disclosure_mechanisms.join("; ")
      : String(intake.i4_disclosure_mechanisms ?? ""),
    admt_logic: String(intake.i5_admt_logic ?? ""),
    admt_training_source: String(intake.i5_admt_training_source ?? ""),
    admt_fairness_testing: String(intake.i5_admt_fairness_testing ?? ""),
    admt_human_review: String(intake.i5_admt_human_review ?? ""),
    admt_description: String(intake.q19_admt_description ?? ""),
    admt_opt_out: String(intake.q20_admt_opt_out ?? ""),
    internal_contributors: String(intake.i7_internal_contributors ?? ""),
    external_consultees: String(intake.i7_external_consultees ?? ""),
    certifying_exec_name: String(intake.i8_certifying_exec_name ?? ""),
    certifying_exec_title: String(intake.i8_certifying_exec_title ?? ""),
    certifying_contact_email: String(intake.i8_contact_email ?? ""),
    certifying_contact_phone: String(intake.i8_contact_phone ?? ""),
    existing_dpia: hasDpia ? String(intake.i9_existing_dpia_summary ?? "Yes — summary not provided") : "No",
    sensitive_pi_limit_offered: String(intake.q16_sensitive_limit ?? ""),
    sensitive_pi_basis: String(intake.q17_sensitive_basis ?? ""),
    opt_out_link: String(intake.q9_opt_out ?? ""),
    notice_at_collection: String(intake.q12_notice_at_collection ?? ""),
    minimum_pi_necessary: String(intake.i1b_min_pi ?? ""),
    pi_sources: String(intake.i4b_sources ?? ""),
    under16_actual_knowledge: String(intake.q15b_under16_knowledge ?? ""),
    profiling_observation_trigger: String(intake.q5b_profiling_observation ?? ""),
    admt_training_trigger: String(intake.q18b_admt_training ?? ""),
    business_benefits: String(intake.impact_intake?.businessBenefits ?? ""),
    consumer_benefits: String(intake.impact_intake?.consumerBenefits ?? ""),
    stakeholder_public_benefits: String(intake.impact_intake?.stakeholderBenefits ?? ""),
    planned_safeguards: String(intake.impact_intake?.safeguards ?? ""),
    harm_sources_and_causes: String(intake.impact_intake?.harmCauses ?? ""),
    // R1b0 threading — new intake fields exposed on content_detail so
    // computeTestStates and downstream prose read normalised state, never raw intake.
    q15c_spi_volume: String(intake.q15c_spi_volume ?? ""),
    q5c_share_revenue_50pct: String(intake.q5c_share_revenue_50pct ?? ""),
    revenue_band: classifyRevenueBand(intake.q1_revenue).label,
    revenue_band_key: classifyRevenueBand(intake.q1_revenue).key,
    revenue_audit_cohort: classifyRevenueBand(intake.q1_revenue).audit_cohort,
  };

  // R1b0: expose the split revenue band into triggers too, so any downstream
  // check that reads triggers rather than content_detail can see the resolved posture.
  (triggers as Record<string, any>).revenue_over_100m = classifyRevenueBand(intake.q1_revenue).over_100m;

  return {
    triggers,
    exceptions,
    activity_details,
    impact,
    org_context,
    annual_consumer_volume: String(intake.q2_consumers ?? ""),
    content_detail,
  };
}


function normaliseIntake(intake: any): { intake: FiveStageIntake; wasLegacyShimmed: boolean } {
  if (intake?.triggers === undefined) {
    return { intake: shimLegacyIntake(intake ?? {}), wasLegacyShimmed: true };
  }
  // Ensure required substructures are present even on partially-populated new intakes.
  // R1b0: also mirror the new intake fields onto content_detail and stamp the
  // revenue band so computeTestStates and prompt injection read normalised state.
  const cd = { ...(intake.content_detail ?? {}) } as Record<string, any>;
  if (intake.q15c_spi_volume !== undefined) cd.q15c_spi_volume = String(intake.q15c_spi_volume ?? "");
  if (intake.q5c_share_revenue_50pct !== undefined) cd.q5c_share_revenue_50pct = String(intake.q5c_share_revenue_50pct ?? "");
  const band = classifyRevenueBand(intake.q1_revenue ?? intake.org_context?.annual_revenue_threshold);
  cd.revenue_band = band.label;
  cd.revenue_band_key = band.key;
  cd.revenue_audit_cohort = band.audit_cohort;
  const triggers = { ...EMPTY_TRIGGERS, ...(intake.triggers ?? {}) } as Record<string, any>;
  triggers.revenue_over_100m = band.over_100m;
  return {
    intake: {
      triggers,
      exceptions: { ...EMPTY_EXCEPTIONS, ...(intake.exceptions ?? {}) },
      activity_details: Array.isArray(intake.activity_details) ? intake.activity_details : [],
      impact: intake.impact ?? {},
      org_context: intake.org_context ?? {},
      annual_consumer_volume: intake.annual_consumer_volume,
      content_detail: cd,
    },
    wasLegacyShimmed: false,
  };
}

// ---------------------------------------------------------------------------
// R1b1 — deterministic TEST-STATES computed from the normalised intake.
// A RESOLVED state is binding: the model may not hedge, contradict, or
// convert it into an information_needed ask (rule TEST-STATES ARE BINDING,
// enforced by post-check T-2).
// ---------------------------------------------------------------------------
export type TestState = {
  state: "resolved_met" | "resolved_not_met" | "resolved_not_applicable" | "indeterminate";
  basis: string;
  source_fields: string[];
  note?: string;
};

export function computeTestStates(
  fiveStage: FiveStageIntake,
  rawIntake: Record<string, any>,
): Record<string, TestState> {
  const map: Record<string, TestState> = {};
  const q1 = rawIntake.q1_revenue;
  const band = classifyRevenueBand(q1);
  const q2 = String(rawIntake.q2_consumers ?? "").trim();
  const q5 = String(rawIntake.q5_sell_share ?? "").trim();
  const q5c = String(rawIntake.q5c_share_revenue_50pct ?? "").trim();
  const q15 = String(rawIntake.q15_sensitive_pi ?? "").trim();
  const q15c = String(rawIntake.q15c_spi_volume ?? "").trim();

  // M1 — §1798.140(d)(1)(A) $25M revenue threshold
  if (band.over_25m === "indeterminate") {
    map.M1 = { state: "indeterminate", basis: "revenue band not specified", source_fields: ["q1_revenue"] };
  } else {
    map.M1 = { state: band.over_25m ? "resolved_met" : "resolved_not_met", basis: `revenue band ${band.label}`, source_fields: ["q1_revenue"] };
  }

  // M2/M3 — consumer-band determinations
  const CB: Record<string, { over_100k: boolean; over_250k: boolean }> = {
    "Fewer than 100,000":    { over_100k: false, over_250k: false },
    "100,000–249,999":       { over_100k: true,  over_250k: false },
    "250,000–1 million":     { over_100k: true,  over_250k: true },
    "1–10 million":          { over_100k: true,  over_250k: true },
    "Over 10 million":       { over_100k: true,  over_250k: true },
  };
  const cb = CB[q2];
  if (cb) {
    map.M2 = { state: cb.over_100k ? "resolved_met" : "resolved_not_met", basis: `consumer band ${q2}`, source_fields: ["q2_consumers"] };
    map.M3 = { state: cb.over_250k ? "resolved_met" : "resolved_not_met", basis: `consumer band ${q2}`, source_fields: ["q2_consumers"] };
  } else {
    const reason = q2 ? `recorded band ${q2} does not resolve the threshold` : "consumer band not specified";
    map.M2 = { state: "indeterminate", basis: reason, source_fields: ["q2_consumers"] };
    map.M3 = { state: "indeterminate", basis: reason, source_fields: ["q2_consumers"] };
  }

  // M4 — §7120(b)(2)(B) 50,000-SPI volume threshold
  if (q15 === "No") {
    map.M4 = { state: "resolved_not_applicable", basis: "q15_sensitive_pi = No — no SPI processing, prong inapplicable", source_fields: ["q15_sensitive_pi"] };
  } else if (q15c === "50,000 or more") {
    map.M4 = { state: "resolved_met", basis: "q15c_spi_volume = 50,000 or more", source_fields: ["q15c_spi_volume"] };
  } else if (q15c === "Fewer than 50,000") {
    map.M4 = { state: "resolved_not_met", basis: "q15c_spi_volume = Fewer than 50,000", source_fields: ["q15c_spi_volume"] };
  } else {
    map.M4 = { state: "indeterminate", basis: q15c ? `q15c_spi_volume = ${q15c} does not resolve` : "q15c_spi_volume not provided", source_fields: ["q15c_spi_volume", "q15_sensitive_pi"] };
  }

  // M5 — §7120(b)(1) 50%-of-revenue-from-sale/share prong
  if (q5 === "No") {
    map.M5 = { state: "resolved_not_met", basis: "q5_sell_share = No — no sale/share, prong inapplicable", source_fields: ["q5_sell_share"] };
  } else if (q5c === "Yes") {
    map.M5 = { state: "resolved_met", basis: "q5c_share_revenue_50pct = Yes", source_fields: ["q5c_share_revenue_50pct"] };
  } else if (q5c === "No") {
    map.M5 = { state: "resolved_not_met", basis: "q5c_share_revenue_50pct = No", source_fields: ["q5c_share_revenue_50pct"] };
  } else {
    map.M5 = { state: "indeterminate", basis: q5c ? `q5c_share_revenue_50pct = ${q5c} does not resolve` : "q5c_share_revenue_50pct not provided", source_fields: ["q5c_share_revenue_50pct", "q5_sell_share"] };
  }

  // M6 — §7121(a) cyber-audit cohort date
  if (band.audit_cohort === "indeterminate") {
    map.M6 = {
      state: "indeterminate",
      basis: band.key === "legacy_25_100m"
        ? `legacy revenue band ${band.label} straddles the $50M line — cohort is 2029-04-01 or 2030-04-01 depending on split`
        : "revenue band not specified — cohort cannot be resolved",
      source_fields: ["q1_revenue"],
    };
  } else {
    map.M6 = {
      state: "resolved_met",
      basis: `revenue band ${band.label} → §7121(a) cohort ${band.audit_cohort}`,
      source_fields: ["q1_revenue"],
      note: `cohort_date=${band.audit_cohort}`,
    };
  }

  // M7 — §7150(b) trigger CLAIMED-states (which triggers the intake claims are engaged)
  const t7 = {
    sells_or_shares_pi: !!q5 && q5 !== "No",
    profiling_observation: /yes|both/i.test(String(rawIntake.q5b_profiling_observation ?? "")),
    sensitive_pi: q15 === "Yes",
    under16_actual_knowledge: /^yes/i.test(String(rawIntake.q15b_under16_knowledge ?? "")),
    admt_use: rawIntake.q18_admt_use === "Yes" || rawIntake.q18_admt_use === "In evaluation",
    admt_training: /^yes/i.test(String(rawIntake.q18b_admt_training ?? "")),
  };
  const engaged = Object.entries(t7).filter(([, v]) => v).map(([k]) => k);
  map.M7 = {
    state: engaged.length ? "resolved_met" : "resolved_not_met",
    basis: `claimed § 7150(b) triggers: ${engaged.join(", ") || "none"}`,
    source_fields: ["q5_sell_share", "q5b_profiling_observation", "q15_sensitive_pi", "q15b_under16_knowledge", "q18_admt_use", "q18b_admt_training"],
  };

  // M8 — § 7152 exception CLAIMED-set + pinned cite per claimed key
  const EXCEPTION_PIN: Record<string, string> = {
    fraud_detection: "Cal. Civ. Code § 1798.145(a)(1)",
    security_integrity: "Cal. Civ. Code § 1798.145(a)(2)",
    debugging: "Cal. Civ. Code § 1798.145(a)(3)",
    transient_use: "Cal. Civ. Code § 1798.145(a)(4)",
    internal_research: "Cal. Civ. Code § 1798.145(a)(5)",
    employment_context: "Cal. Civ. Code § 1798.145(o)",
    legal_compliance: "Cal. Civ. Code § 1798.145(a)(6)",
    consumer_request: "Cal. Civ. Code § 1798.145(a)(4)",
  };
  const exceptionsIntake = (rawIntake.exceptions_intake ?? {}) as Record<string, any>;
  const claimed = Object.entries(exceptionsIntake).filter(([, v]: any) => v?.claimed).map(([k]) => k);
  map.M8 = {
    state: claimed.length ? "resolved_met" : "resolved_not_applicable",
    basis: claimed.length
      ? `claimed exceptions: ${claimed.map((k) => `${k} (pinned cite ${EXCEPTION_PIN[k] ?? "§ 1798.145"})`).join("; ")}`
      : "no § 7152 exceptions claimed",
    source_fields: ["exceptions_intake"],
  };

  // M9 — § 7152(a)(1),(2),(4),(8) element presence (non-empty checks)
  const hasPurpose      = String(rawIntake.i1_processing_purpose ?? "").trim().length > 0;
  const hasMinPi        = String(rawIntake.i1b_min_pi ?? "").trim().length > 0;
  const hasRetention    = String(rawIntake.i2_retention_period ?? "").trim().length > 0 || String(rawIntake.i2_retention_criteria ?? "").trim().length > 0;
  const hasBenefits     = String(rawIntake.impact_intake?.businessBenefits ?? "").trim().length > 0 || String(rawIntake.impact_intake?.consumerBenefits ?? "").trim().length > 0;
  const hasContributors = String(rawIntake.i7_internal_contributors ?? "").trim().length > 0;
  const hasCertifier    = String(rawIntake.i8_certifying_exec_name ?? "").trim().length > 0;
  const allPresent = hasPurpose && hasMinPi && hasRetention && hasBenefits && hasContributors && hasCertifier;
  map.M9 = {
    state: allPresent ? "resolved_met" : "resolved_not_met",
    basis: `§ 7152(a) element presence — (a)(1) purpose=${hasPurpose}; (a)(3) min-PI=${hasMinPi}, retention=${hasRetention}; (a)(4) benefits=${hasBenefits}; (a)(8) contributors=${hasContributors}, certifier=${hasCertifier}`,
    source_fields: ["i1_processing_purpose", "i1b_min_pi", "i2_retention_period", "i2_retention_criteria", "impact_intake", "i7_internal_contributors", "i8_certifying_exec_name"],
  };

  // M10 — § 7155(b) / § 7157 canonical dates (already computed elsewhere; folded in)
  map.M10 = {
    state: "resolved_met",
    basis: "§ 7155(b) existing-activity compliance deadline: 2027-12-31; § 7157(a)(1) submission deadline for 2026/2027 assessments: 2028-04-01",
    source_fields: [],
    note: "assessment_compliance=2027-12-31; submission=2028-04-01",
  };

  void fiveStage; // (kept in signature for future use; M-tests currently read raw intake)
  return map;
}

export function formatTestStatesBlock(map: Record<string, TestState>): string {
  const header =
    "TEST-STATES (deterministic — computed from the intake). A test whose state is RESOLVED (met / not met / not applicable) is BINDING: state its conclusion with the basis given, do NOT hedge, do NOT emit an information_needed entry for it, and do NOT ask the user to confirm/verify it. INDETERMINATE tests use insufficient-basis language and MUST generate exactly one information_needed entry anchored to the producing field.";
  const rows = Object.entries(map).map(([k, v]) => {
    const src = v.source_fields.length ? v.source_fields.join(", ") : "(computed)";
    return `- ${k} [${v.state.toUpperCase()}] — ${v.basis} [source: ${src}]${v.note ? ` {${v.note}}` : ""}`;
  });
  return `${header}\n${rows.join("\n")}`;
}


// ---------------------------------------------------------------------------
// Validation (CR-2 Step 5). Relaxed when payload was shimmed from legacy.
// Returns { ok, error?, field? }.
// ---------------------------------------------------------------------------
function validateFiveStage(intake: FiveStageIntake, lenient: boolean): { ok: true } | { ok: false; message: string; field: string } {
  if (!Object.values(intake.triggers).some((v) => v === true)) {
    return {
      ok: false,
      message:
        "No § 7150(b) triggering activity is selected. The CPPA Risk Assessment is only required when one of the § 7150(b) triggers applies (sell/share, targeted advertising, profiling with significant effects, sensitive PI beyond enumerated, ADMT, or training ADMT). If your only trigger is high consumer volume, the applicable obligation is the § 7120 cybersecurity audit — please run the CPPA Cybersecurity tool instead.",
      field: "triggers",
    };
  }
  // Runs in BOTH modes: a blank/placeholder company name produced
  // "[FILL IN — business legal name]" in finished reports. Block it.
  const companyName = String(intake.org_context?.company_name ?? "");
  if (!companyName.trim() || companyName.includes("[FILL IN")) {
    return { ok: false, message: "The business legal name is missing. Please complete the entity name on Step 1 before generating.", field: "org_context.company_name" };
  }
  if (lenient) return { ok: true };

  const generic = ["to improve our service", "for business purposes", "to provide services", "general operations"];
  for (const a of intake.activity_details ?? []) {
    const p = String(a.purpose_description ?? "").toLowerCase();
    if (p.length < 50 || generic.some((g) => p.includes(g))) {
      return {
        ok: false,
        message: `Processing purpose for "${a.trigger_key}" is too generic. Describe the specific purpose as required by § 7152(a)(1).`,
        field: `activity_details.${a.trigger_key}.purpose_description`,
      };
    }
  }
  if (String(intake.impact?.benefits_outweigh_risks_rationale ?? "").length < 100) {
    return {
      ok: false,
      message: "The benefits-outweigh-risks rationale is too brief. § 7152(a)(4) (benefits) and the § 7154 balancing goal require a substantive analysis.",
      field: "impact.benefits_outweigh_risks_rationale",
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Corpus retrieval (CR-2 Step 1).
// ---------------------------------------------------------------------------
async function retrieveCorpusContext(intake: FiveStageIntake): Promise<{ enforcementContext: string; longitudinalSynthesis: string; statuteContext: string; fsorContext: string; citations: string[] }> {
  const primaryActivity = Object.entries(intake.triggers)
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/_/g, " "))
    .join(", ");
  const sector = intake.org_context?.sector ?? "general";
  const corpusQuery = `CPPA risk assessment ${sector} ${primaryActivity} California privacy enforcement`;

  const S = String.fromCharCode(167); // section symbol, encoding-safe
  const RISK_BASE_CITATIONS = [
    `11 CCR ${S} 7001`, `11 CCR ${S} 7120`, `11 CCR ${S} 7121`,
    `11 CCR ${S} 7150`, `11 CCR ${S} 7151`, `11 CCR ${S} 7152`, `11 CCR ${S} 7153`,
    `11 CCR ${S} 7154`, `11 CCR ${S} 7155`, `11 CCR ${S} 7156`, `11 CCR ${S} 7157`,
    // Doc V Step 4: § 7220 is cited by the ADMT LINKAGE rule; must be pinned so
    // citation-lint reports in_supply=true. Corpus row exists (6,774 chars,
    // status=current). Base citations are fetched separately from full_text_limit,
    // so this does not consume semantic slots.
    `11 CCR ${S} 7220`,
    // Pinned per Doc H: § 1798.145 (CCPA exceptions) — cited by every US risk
    // run for exception_analysis; base citations are fetched separately from
    // full_text_limit, so this does not consume semantic slots.
    `Cal. Civ. Code ${S} 1798.145`,
  ];
  const statuteTopics = ["risk-assessment", "thresholds"];
  if (intake.triggers.admt_involved) statuteTopics.push("admt", "significant-decision");
  if (intake.triggers.profiling_significant_effects) statuteTopics.push("profiling");

  const [enforcementRes, longitudinalRes, statuteRes] = await Promise.allSettled([
    supabase.functions.invoke("get-enforcement-context", {
      body: { query: corpusQuery, jurisdictions: ["California", "US-CA", "United States"], regime: "ccpa", limit: 8 },
    }),
    supabase.functions.invoke("generate-longitudinal-synthesis", {
      body: {
        topic: `CPPA enforcement patterns ${sector} sector risk assessment`,
        jurisdiction: "US-CA",
        regulation: "CPPA",
        focus_areas: [primaryActivity, "audit division enforcement priorities", "§ 7152 documentation requirements"],
      },
    }),
    supabase.functions.invoke("cppa-retrieve-context", {
      body: { topics: statuteTopics, query: `risk assessment ${primaryActivity}`, include_deadlines: false, full_text_limit: 10, limit: 16, base_citations: RISK_BASE_CITATIONS },
    }),
  ]);

  const enforcementRows = enforcementRes.status === "fulfilled"
    ? (enforcementRes.value?.data?.results ?? [])
    : (console.warn("[cppa-risk] get-enforcement-context failed:", enforcementRes.reason), []);
  const enforcementContext = Array.isArray(enforcementRows) && enforcementRows.length
    ? enforcementRows.slice(0, 8).map((r: any) => {
        const fine = r.fine_amount ?? r.fine_eur_equivalent;
        const failure = r.key_compliance_failure ?? r.violation ?? "compliance failure not specified";
        return `• ${r.regulator ?? "Regulator"}${r.jurisdiction ? ` (${r.jurisdiction})` : ""}${r.subject ? ` — ${r.subject}` : ""}: ${failure}${fine ? ` [fine: ${fine}]` : ""}${r.decision_date ? ` (${r.decision_date})` : ""}${r.source_url ? ` ${r.source_url}` : ""}`;
      }).join("\n")
    : "";
  const longitudinalSynthesis = longitudinalRes.status === "fulfilled"
    ? (longitudinalRes.value?.data?.synthesis ?? "")
    : (console.warn("[cppa-risk] generate-longitudinal-synthesis failed:", longitudinalRes.reason), "");

  // Verbatim statutory text + plain summaries from the CPPA authorities corpus.
  const authorities: any[] = statuteRes.status === "fulfilled" ? (statuteRes.value?.data?.authorities ?? []) : [];
  if (statuteRes.status === "rejected") console.warn("[cppa-risk] cppa-retrieve-context failed:", statuteRes.reason);
  const baseMissing = statuteRes.status === "fulfilled" ? (statuteRes.value?.data?.base_missing ?? []) : [];
  if (baseMissing.length > 0) console.warn("[cppa-risk] BASE CITATIONS MISSING FROM SUPPLY:", baseMissing.join("; "));
  const statuteContext = authorities
    .map((a: any) => `${a.citation}${a.title ? ` — ${a.title}` : ""}\nPlain summary: ${a.plain_summary ?? ""}\nRegulation text: ${String(a.full_text ?? "").slice(0, 1200)}`)
    .join("\n\n");

  // Agency's own commentary (Final Statement of Reasons) for the retrieved citations.
  let fsorContext = "";
  try {
    const cites = authorities.map((a: any) => a.citation).filter(Boolean).slice(0, 20);
    if (cites.length) {
      const { data: fsorRows } = await supabase
        .from("cppa_fsor_commentary")
        .select("regulation_citation, agency_position_summary")
        .in("regulation_citation", cites)
        .not("agency_position_summary", "is", null)
        .limit(20);
      fsorContext = (fsorRows ?? [])
        .map((r: any) => `${r.regulation_citation}: ${r.agency_position_summary}`)
        .join("\n\n");
    }
  } catch (e) {
    console.warn("[cppa-risk] FSOR commentary fetch failed:", e);
  }

  const citations = authorities.map((a: any) => a?.citation).filter(Boolean);
  return { enforcementContext, longitudinalSynthesis, statuteContext, fsorContext, citations };
}

// ---------------------------------------------------------------------------
// Tool Module (CR-2 Step 2). Generic regulator-facing rules now live in the
// shared prompt core (_shared/prompt-core.ts); this module carries only what
// is specific to CPPA Risk Assessment.
// ---------------------------------------------------------------------------
export const CPPA_RISK_TOOL_MODULE: ToolModule = {
  identity:
    "You are a CPPA risk assessment specialist with deep expertise in Cal. Code Regs. tit. 11 §§ 7150–7157 and the California Privacy Rights Act. You produce a formal risk assessment that must meet the § 7152 content requirements and withstand scrutiny from the CPPA Audits Division (operational since February 2026; existing-activity compliance deadline December 31, 2027).",
  citationFramework:
    "Cite only Cal. Code Regs. tit. 11 (format \"§ 7150(b)(1)\") or Cal. Civ. Code § 1798 (format \"§ 1798.185\"). Never cite § 7221(c)(5) for any purpose. Exception citations are § 7152(a)(1)–(8) only — verify each exists in the provided regulation text before use. § 7150(b) trigger→subsection mappings are provided to you explicitly below and in the regulation text; use those exact subsections — never assign a § 7150(b) subsection from memory.",
  outputMode: "strict-JSON",
  includeEuTransfers: false,
  languageVariant: "american",
  extraRules: [
    "§ 7152 MAPPING: every output section maps to a § 7152 required content element; generate nothing not required by statute.",
    "§ 7152(a)(4) BENEFITS-OUTWEIGH: ground the balancing in the specific benefits and harms in the intake; no generic balancing language.",
    "EXCEPTION ELEMENT-TEST: for each § 7152 exception claimed, test every element; conclude the exception is sustained only if all elements are documented, otherwise list the missing elements and set the status to insufficient basis.",
    "CYBERSECURITY-AUDIT LINKAGE: if the intake reveals cybersecurity deficiencies or revenue exceeds $100M, flag the cybersecurity-audit obligation as a staggered obligation tied to annual gross revenue, framing each date relative to the assessment date per the prompt-core TEMPORAL FRAMING RULE: April 1, 2028 if 2026 revenue exceeded $100M; April 1, 2029 if 2027 revenue is $50M–$100M; April 1, 2030 if under $50M. Where the intake does not pin the revenue band, do NOT assert a single date as definitive — set `deadline` to the earliest band that could apply and use `deadline_basis` to spell out the conditional cohorts (e.g. \"April 1, 2028 if 2026 annual gross revenue > $100M; April 1, 2029 if 2027 revenue $50M–$100M\"). Where the intake does pin the band, use that band's single date.",
    "ADMT LINKAGE: if ADMT is involved in any triggered activity, flag the January 1, 2027 ADMT disclosure deadline under § 7221 — framing the date relative to the assessment date per the prompt-core TEMPORAL FRAMING RULE (prospective before 1 January 2027; operative on/after) — and route the user to the ADMT Assessment tool.",
    "TRIGGER ROUTING: a sensitive-PI trigger applies only where a genuine § 7001(bbb) SPI element is present — income, debt-to-income, or credit history are not per se SPI.",
    "CONSUMER CATEGORIES: every `consumer_categories` value must be a human-readable label (e.g., \"California residents\", \"Employees\", \"Job applicants\", \"Minors under 16\", \"Website visitors\"). Never emit raw intake keys (no snake_case, no field IDs) and never leave the array empty — if unknown, use [\"Not specified in intake\"].",
    "PRIORITY ACTIONS: split severity from deadline. `severity` is one of Immediate | High | Medium | Low (operational urgency). `deadline` is an ISO-style date (YYYY-MM-DD) or a known statutory deadline (\"December 31, 2027\" for existing-activity § 7155(b); \"April 1, 2028\" for § 7121(a) cyber-audit certification (revenue >$100M in 2026 — confirm cohort per § 7121(a)'s staggered schedule before asserting a single date); \"January 1, 2027\" for § 7220 ADMT pre-use notice). `deadline_basis` cites the statutory or operational source for the date. Do not encode the deadline inside the severity enum.",
    "§ 1798.140(d)(1) THRESHOLDS: § 1798.140(d)(1) defines a covered \"business\" by THREE ALTERNATIVE thresholds — (A) annual gross revenue over $25M, (B) buying/selling/sharing PI of 100,000+ consumers or households, or (C) deriving 50%+ of annual revenue from selling or sharing PI. Subsection (C) is the selling/sharing-revenue prong — NEVER describe (C) as a general \"revenue floor\" or imply a dollar revenue range straddles (C). When discussing the § 7121(a) cyber-audit linkage, state all three thresholds and which the intake figures bear on; do not collapse them into a single revenue test.",
    "VOLUME IS NOT A § 7150(b) TRIGGER: high consumer volume alone does not trigger a § 7150(b) risk assessment (it is a § 7120 cyber-audit signal). If the intake or an activity asserts volume as the basis for the assessment, do NOT search for or speculate about which § 7150(b) subsection it maps to, and do NOT emit a \"NOTE FOR COUNSEL\" asking which subsection applies. State it plainly as a user-asserted deficiency: \"The intake characterises this activity as high-volume processing. Volume alone is not an enumerated § 7150(b) trigger; the user must confirm which enumerated trigger (selling/sharing, targeted advertising, profiling with significant effects, sensitive PI, or ADMT/training) applies to the processing as described.\" Flag the deficiency; do not resolve it.",
    "ENFORCEMENT CLAIMS ARE CORPUS-ONLY: any specific enforcement action — naming a date, an outcome (e.g. \"shutdown\"), a party, a docket, or a fine — must come from the supplied enforcement corpus (get-enforcement-context) and be attributable to it. NEVER assert a specific enforcement action from training memory. Do NOT state things like \"the CPPA's February 2025 enforcement action resulting in the shutdown of a data broker\" unless that action appears in the supplied corpus. If the corpus contains no on-point action, state the enforcement posture generically (e.g. \"the CPPA has signalled that disproportionate consumer-profiling risk is an enforcement priority\") and direct the reader to the CPPA's public enforcement records — do not invent a specific case to illustrate the point.",
    "ORG-CONTEXT DEFAULTS ARE NOT FINDINGS OF ABSENCE: org_context booleans that arrive false from the compatibility shim — privacy_counsel_engaged, dpo_or_privacy_officer, board_level_oversight, cppa_audit_notification_received — mean \"not captured in the intake,\" NOT \"confirmed absent.\" NEVER assert in safeguard_gaps, adverse-effect, or any narrative that the organisation has \"no privacy counsel,\" \"no DPO/privacy officer,\" or \"no board oversight\" on the basis of these defaults; at most state the item is \"not documented in the intake.\" Where another field contradicts the default (e.g. external consultees name outside privacy counsel, or a certifying executive holds a Chief Privacy Officer title), do NOT assert absence at all — defer to the inconsistency flag, which records the contradiction for the user to resolve.",
    "THIRD PARTY ≠ SALE/SHARE: classifying a recipient as a third party (rather than a service provider/contractor) does NOT by itself make a disclosure a \"sale\" or \"share.\" Under the § 1798.140 definitions of \"sell\" and \"share,\" a sale/share additionally requires monetary or other valuable consideration, or that the disclosure is for cross-context behavioural advertising. When the intake shows a vendor (e.g. a support/ticketing tool) that may not be under a compliant service-provider contract, state the two determinations SEPARATELY: (1) recipient classification (service provider/contractor vs third party), and (2) whether any transfer is a sale/share (which turns on consideration or cross-context advertising and, if present, triggers a separate § 7150(b)(1) assessment). Never write that non-service-provider status \"is\" or \"constitutes\" a sale/share — flag both as items the user must confirm.",
    "§ 7152(a) SUBSECTION DISCIPLINE: cite each element to its own subsection and never reuse (a)(2) as a catch-all. (a)(1) = processing summary and specific (non-generic) purpose; (a)(2) = categories of PI and whether they include sensitive PI (NOT minimum-PI, NOT consumer categories); (a)(3) = the processing-operation details; (a)(4) = benefits; (a)(5) = negative impacts; (a)(6) = safeguards; (a)(8)–(a)(9) = the individuals involved and the decisionmaker with authority to proceed. The benefits-outweigh-risks balancing itself is the § 7154 goal, not a content element. Consumer categories belong to the (a)(1) processing summary, never (a)(2).",
    "OVERALL_RISK_LEVEL MEASURES SUBSTANTIVE PRIVACY RISK ONLY: overall_risk_level reflects the severity and likelihood of the enumerated adverse effects to consumers from the processing itself, net of safeguards CONFIRMED in the record. It is NOT increased by documentation gaps, unresolved classifications, missing intake answers, deadline proximity, or the incompleteness of the assessment record — those are compliance-record issues, expressed exclusively through benefits_outweigh_risks_conclusion ('Insufficient basis' where the record cannot support a conclusion), the inconsistency flags, information_needed, and priority_actions. If every enumerated harm is Moderate severity / Possible likelihood, overall_risk_level is Moderate even where the record is materially incomplete. The balancing conclusion and overall_risk_level remain distinct axes and can diverge; when they do, add one sentence to benefits_outweigh_risks_rationale stating what the rating reflects (identified-harm severity net of confirmed safeguards) and noting that record-completeness issues are addressed separately in the conclusion and priority actions.",
    "DEADLINE FIELD PRECISION MUST MATCH CERTAINTY: do not populate `deadline` with a specific ISO date (YYYY-MM-DD) when the regulation only specifies a year and the exact date is unconfirmed. The § 7157 submission date IS confirmed by the regulation text: for risk assessments conducted in 2026 and 2027 the submission is due no later than April 1, 2028 (11 CCR § 7157(a)(1)); for risk assessments conducted after 2027 the submission is due no later than April 1 of the year following the assessment year (§ 7157(a)(2)). Populate `deadline` as `2028-04-01` for the 2026/2027 cohort and quote § 7157(a)(1) in `deadline_basis`; use the § 7157(a)(2) April 1 rolling date for subsequent cohorts and cite § 7157(a)(2). Do not emit bracketed 'exact date TBD' placeholders for § 7157.",
    "ACTIONABLE FILL-IN GUIDANCE: where a priority_action requires the user to supply a judgment call the tool cannot make (e.g. 'document specific, non-generic purposes', 'confirm recipient classification', 'document minimum PI necessary'), append one clause of concrete guidance rather than leaving the standard bare. The guidance names the DIMENSIONS a sufficient answer must cover — never an example value or drafted text (see NO DRAFTED MODEL LANGUAGE; the prohibition applies inside parentheticals and 'e.g.' clauses). For a non-generic purpose requirement, add '(a specific purpose names the concrete business function, the data used, and the outcome achieved; a formulation naming only a broad business goal does not satisfy the § 7152(a)(1) specificity requirement)'. For recipient classification, add '(a service provider/contractor processes PI only on the business's behalf under a compliant contract per § 1798.140(ag)/(j); a third party does not)'. For minimum-necessary determinations, add '(document, per data element, why it is required for the stated purpose; remove elements collected but not used for that purpose).' Keep each addition to one parenthetical clause — do not turn priority_actions into an instructional essay.",
    "INCONSISTENCY FLAGS MUST CITE, NEVER RESOLVE, NEVER PRESCRIBE A METHOD: when flagging an inconsistency (e.g. ADMT disclosure vs. negated profiling field), resolution_required must name the controlling provision(s) and state that the controller must resolve and document the determination — it must NEVER state what the controller should conclude, NEVER assert 'if [condition] applies, [consequence] is required,' NEVER direct a specific follow-on action contingent on an unresolved determination, and NEVER direct the controller to a specific resolution method (consulting counsel, commissioning an audit, internal analysis, or any other). Correct form: 'The controller must resolve, with reference to § 7001(ddd) and § 7150(b)(3)–(4), whether the rules-based scoring system triggers either provision, and document the determination in the assessment record.' Incorrect forms: 'if X applies, Y is required' (tells the user the consequence of a determination the tool has not made) and 'consult privacy counsel to confirm/determine …' (prescribes the resolution method — the choice of method belongs to the controller). Strip both constructions wherever they arise and replace with 'The controller must resolve and document [the determination] in the assessment record.' This applies to resolution_required, priority_actions, rationale text, and every narrative field.",
    "EXCEPTIONS_STATUS MUST AGREE WITH THE RECORD: do not set assessment_summary.exceptions_status to 'All well-documented' when the same assessment identifies missing required fields (e.g. § 7152(a)(4) benefits documentation, sources of PI, minimum-necessary determinations) elsewhere in the output. If required fill-ins remain open anywhere in the document, exceptions_status must reflect that — e.g. 'No exceptions claimed; § 7152(a)(4) benefits documentation incomplete' — not an unqualified 'All well-documented.'",
    "STATUTORY_BASIS MUST COVER BOTH DETERMINATIONS: where an action item states two separate determinations are required (recipient classification vs. sale/share characterisation — see the THIRD PARTY ≠ SALE/SHARE rule), statutory_basis must cite provisions for BOTH: § 1798.140(ag) (service provider) and § 1798.140(j) (contractor) for the classification determination, alongside § 7150(b)(1) and the relevant § 1798.140 sale/share definitions for the second. Do not cite only the sale/share provision when the action also asks the user to make a classification determination.",
    "PRECISE DEFINITION CITES: when definitions of sell/share/service-provider/contractor are invoked, cite in this precise form — \"§ 1798.140(ad) ('sell'); § 1798.140(ah) ('share'); § 1798.140(ag) (service provider); § 1798.140(j) (contractor); 11 CCR § 7150(b)(1)\". Do not paraphrase these subsection labels.",
    "§ 7001(ddd) GLOSS: when referencing the significant-decision categories, use the phrase \"decisions enumerated in § 7001(ddd)\" rather than a partial illustrative list. Never truncate the enumeration to a subset (e.g. financial services and lending only) as though those were exhaustive.",
    "PURPOSE-DOCUMENTATION IMMEDIATE RATIONALE: where a priority_action for purpose documentation is marked Immediate against a 2027 statutory deadline, append this user-facing rationale verbatim: \"marked Immediate because § 7152(a)(1) requires a specific, non-generic statement of purpose before the assessment can be relied on.\" User-facing text NEVER references validators, system checks, internal flags, generation stages, or any other internal machinery — every rationale cites the provision that creates the requirement, nothing about how the system detected it.",
    "REQUIRED-DOCUMENTATION VOICE: do NOT emit the internal-voice phrase \"This is a required fill-in:\" anywhere in the output. Frame such items as \"Required documentation: [specific, non-generic purpose … per § 7152(a)(1)].\"",
    "NO DRAFTED MODEL LANGUAGE: never provide example, template, or model text for any statement the controller must author — purpose statements, notice language, consent wording, retention criteria, or any other required formulation. Drafting the language for the user is adaptive guidance and is prohibited even inside a parenthetical, an 'e.g.', or an illustration. Instead, describe the DIMENSIONS a sufficient formulation must cover (the concrete business function, the data used, the outcome achieved, who acts on it) and stop. Where an action requires per-element documentation, intake-derived element lists may be referenced only as level-of-granularity illustrations, framed as 'e.g., for each field such as X, Y, Z, document …' — never as a prescriptive or exhaustive inventory, and never suggesting specific technical implementations the intake did not assert. Two precision requirements: (1) when benefits_outweigh_risks_conclusion is 'Insufficient basis', state explicitly that this reflects the incompleteness of the record, not a finding that risks outweigh benefits on the merits; (2) where two retention periods coexist in the record, 'reconcile' means document which data categories and purposes each period covers — never imply the two figures are inherently contradictory.",
    "RECONCILE INTAKE ECHOES WITH THE ASSESSMENT'S CONCLUSION: where the normalised intake echoes an assertion the assessment's own determination does not adopt (e.g. the intake records benefits_outweigh_risks as 'Yes' while the conclusion is 'Insufficient basis'), add one sentence IN THE benefits_outweigh_risks_conclusion FIELD ITSELF — not only in narrative rationale elsewhere — making the relationship explicit: \"The intake asserts [X]; the assessment record as documented does not yet satisfy the § 7152(a) documentation requirements to support that determination.\" Never leave an intake echo standing in apparent contradiction to the conclusion without this reconciling sentence in the conclusion field.",
    "SEVERITY LABELS COHERE WITH DEADLINES: an action labelled 'Immediate' states the immediate act and the statutory deadline as two clauses — 'Begin now: [the act]. The § 7155(b) compliance deadline for existing activities is December 31, 2027.' — never a bare 'Immediate' severity beside a 2027 deadline field as though they described the same clock. Where a deadline is conditional across cohorts (§ 7121(a): April 1, 2028 / 2029 / 2030 by revenue tier), the structured deadline field carries the earliest applicable date with the qualifier '(earliest cohort; conditional — see action text)' so the field cannot be read alone as unconditional. Record-completion items of the same kind carry the same severity label; where two siblings differ (one 'Immediate', one 'High'), the action text states why, or the labels are aligned.",
    "EACH INCONSISTENCY IS DOCUMENTED ONCE: every distinct inconsistency is documented fully — provisions, resolution requirement — in inconsistency_flags only. Where the same inconsistency is relevant to another section (an exception_analysis entry, a narrative), that section carries a one-line cross-reference (\"See inconsistency_flags: retention-period conflict\") and never restates the resolution language, so the reader cannot count one defect twice.",
    "EXCEPTION CITATIONS ARE A SUBSTANTIVE LEGAL DETERMINATION: for each claimed CCPA exception, compare the processing facts described in the intake to each subsection of Cal. Civ. Code § 1798.145 in turn, identify the specific subsection whose elements the record substantiates (or state that none does on the record provided), and cite that subsection as the operative authority — never cite the parent § 1798.145 generically as if the choice of subsection were an administrative formality for the user to complete. Distinguish CLAIMED from SUBSTANTIATED: the exception key's pinned cite (surfaced in M8) plus any user-supplied `authority_basis` are CLAIMED — authority the record asserts, which the generator TESTS against § 1798.145 elements and never adopts as its own determination. An exception is SUBSTANTIATED only when the record satisfies the elements of the pinned or asserted subsection; where authority_basis is supplied but the elements are not met, name the mismatch. A per-exception `retention_period`, where supplied, is analysed under that exception's scoping (name what is documented and its adequacy for the claimed purpose); where absent, the ask for it is a record-completeness item (never verdict-blocking) and follows PROPORTIONATE ASKS. Where the record does not substantiate any specific subsection, state that plainly (\"the record does not establish the elements of any § 1798.145 subsection for this activity\") and route it into information_needed with the specific intake field to enrich, per FORWARD PATH ON INSUFFICIENT INPUT. Include ONE summary-level note, in the single most relevant field and never inside any exception_analysis entry or any [TO COMPLETE] placeholder, conveying in your own words that: (1) each claimed exception must be anchored to the specific § 1798.145 subsection whose elements the record satisfies; (2) 11 CCR §§ 7150–7157 impose the duty to document the claimed exception — they do not themselves create exceptions and are never cited as the source of an exception; (3) the note names where citations come from and never asserts which provision applies to this business. Do not reproduce these instructions verbatim; paraphrase. Per the MANDATED TEXT APPEARS ONCE rule, every other field cross-references the note and never restates it.",
    "CHARACTERISING § 7152(a)(1) AND EXCEPTION SCOPING: describe § 7152(a)(1) as requiring identification of the specific purpose of the processing. Do NOT assert that the regulation text expressly enumerates prohibited generic phrases ('to improve our services', 'for security purposes') — the insufficiency of a generic statement is the APPLICATION of the specificity requirement and must be framed as such ('a generic formulation does not satisfy the § 7152(a)(1) specificity requirement'), not as quoted regulatory text. Separately: the requirement that processing under a claimed exception be limited to what that exception's purpose requires derives from the claimed exception provision itself, NOT from § 7152(a)(3). Where the exception provision is identified, cite it for the scoping requirement; where it is not yet identified, state the necessity requirement without a citation. § 7152(a)(3) governs the categories of PI and minimum-necessary documentation for the processing generally and is never cited as the source of exception-specific scoping.",
    "MANDATED TEXT APPEARS ONCE PER DOCUMENT: every mandated parenthetical or definitional clause from these rules — the dimension guidance for non-generic purposes, the service-provider/contractor definition, the minimum-necessary clause, the exception-citation summary note — appears exactly ONCE in the output, in the single most relevant field. Every other field that needs it carries a short cross-reference ('see priority_actions[1]' / '(see § 1798.140(ag)/(j) definitions above)') and never restates the text verbatim. Restating an identical definitional clause in two or more fields is a defect, and the exception-citation note is a single summary-level note, never repeated per exception_analysis entry.",
    "EMPTY INTAKE FIELDS ARE GAPS, NOT GENERATOR-SEVERITY FINDINGS: where a required element is absent because the corresponding intake field arrived empty (e.g. consumer_categories as an empty array), frame it as an intake documentation gap ('Consumer categories were not provided in the intake and must be documented to complete the § 7152(a)(1) processing summary'), severity proportionate to a fill-in — not as a High-severity omission. High severity is reserved for elements the record contains but the processing posture leaves exposed.",
    "PERIOD-DEPENDENT FIGURES ARE CONDITIONAL UNTIL THE PERIOD CLOSES: where a threshold depends on a figure for a period that has not ended as of the assessment date (e.g. 2026 annual gross revenue assessed mid-2026), phrase it conditionally — 'if 2026 annual gross revenue, when final, exceeds $100 million' — never as if the period figure were known. State the threshold analysis once; where it bears on more than one field (a priority_action and cross_tool_recommendations), the second occurrence cross-references the first.",
    "NO SYSTEM-ROUTING VOICE: never describe the generator's internal routing or processing decisions in user-facing text ('No ADMT assessment is routed at this time', 'this module was skipped'). State the regulatory position instead: 'An ADMT assessment is not triggered on the current record pending resolution of the inconsistency identified above.' The output describes the organisation's obligations, never the system's machinery.",
    "CONCLUDE, DON'T ECHO — AND DIRECTIVES BEFORE CAVEATS: (1) a validity_assessment or concluding field synthesizes its verdict in its own words and never repeats a sentence verbatim from missing_elements or another field (cross-reference instead). (2) In any resolution_required or action text, state the directive as a complete sentence FIRST and place qualifying or explanatory clauses in a following sentence — never mid-directive where they read as weakening the requirement. (3) Where a conclusion label could be misread as contradicting the user's stated intake position, use a documentation framing: 'Documentation incomplete — the record does not yet support the stated conclusion' rather than a bare 'Insufficient basis'. (4) Where § 7001(ddd) significant-decision categories are cited AND the supplied regulation text carries the enumeration, include a one-line plain-English list of the categories so the reader can assess scope without leaving the document; where the supplied text does not carry them, cite without enumerating — never list the categories from memory.",
    "INTAKE 'NO' IS AN ANSWER, NOT A SILENCE: distinguish 'the intake affirmatively records No' from 'the intake is silent'. A field recorded false/No (e.g. dpo_or_privacy_officer: false) is DOCUMENTED — as an absence — and is described as such ('the intake records no designated DPO'), never as 'not documented in the intake' or 'a documentation gap, not a confirmed finding of absence', which is circular. Where the intake is genuinely silent, say the intake does not address the point and route it through the record-completion actions. Never blend the two framings in one finding.",
    "MISSING_ELEMENTS NEVER RE-LIST FLAGGED INCONSISTENCIES: an exception's missing_elements[] lists only documentation gaps specific to that exception. A conflict already documented in inconsistency_flags (e.g. two coexisting retention periods) is referenced with a short cross-reference ('see inconsistency_flags: retention-period conflict') — never restated as a missing element.",
    "CONTRADICTIONS ARE NAMED AS CONTRADICTIONS: where two intake records cannot both be true (detailed ADMT-field responses alongside negated ADMT triggers; two retention periods for the same scope), the flag's opening description states that the records directly contradict each other — never softened to 'is in tension with' or 'sits uneasily alongside'. Reserve tension language for records that are merely incomplete relative to each other, not mutually exclusive.",
    "NO IMPERATIVES IN DOCUMENTARY FIELDS: fields that summarise the state of the record (purpose, statutory_basis, rationale, description) state requirements and deadlines declaratively; imperative directives ('Begin now: …', 'Do X immediately') live in priority_actions ONLY. An imperative inside a documentary field duplicating a priority_action is a defect.",
    "RECORD FIELDS CARRY CONTENT OR PLACEHOLDERS, NEVER PROCEDURE: a documentary field (purpose, statutory_basis, description, rationale, resolution_required) contains either the documented content or a [TO COMPLETE — …] placeholder stating what the controller must document and the governing provision — never step-by-step procedure, never live directives, and never the generator's internal logic ('Until this is resolved, an assessment is not triggered on the current record'). State the user-facing consequence instead: 'The controller must make and document this determination in the assessment record; whether an assessment under [provision] is required turns on this resolution.' Procedural direction lives in priority_actions only.",
    "AUDIT TRIGGER STRUCTURE — § 7120(b) HAS TWO ALTERNATIVES: a business's processing presents significant risk if EITHER (1) in the preceding calendar year it derived 50 percent or more of its annual revenue from selling or sharing consumers' personal information (regardless of processing volume), OR (2) it had annual gross revenue over the inflation-adjusted $25 million threshold AND in that year processed the personal information of 250,000 or more consumers or households, or the sensitive personal information of 50,000 or more consumers. The volume thresholds apply only within alternative (2), in conjunction with the revenue condition — never as free-standing triggers. Separately, the § 7121(a) audit deadline turns solely on the annual-gross-revenue band for the applicable calendar year. Keep the two determinations distinct, and where a subdivision letter is not present in the supplied context, cite '§ 7120(b)' without inventing the letter.",
    "FLAG, CITE, NEVER PRESCRIBE THE STANDARD: when a purpose statement or other intake element may not satisfy a specificity requirement (e.g. 11 CCR 7152(a)(1)), state that the current formulation may not satisfy the cited requirement and direct review with counsel. NEVER author the standard the user must meet (e.g. never write 'a specific purpose names the concrete business function' or equivalent prescriptive formulations). Cite the regulation; do not paraphrase it into a test.",
    "ONE DEADLINE PER ACTION: every priority action carries exactly one governing deadline that matches its deadline field. Where two deliverables have different deadlines (e.g. an ADMT pre-use notice and the risk-assessment record), split them into separate actions. Never place two alternative dates in one action's text. Where a submission date depends on a statutory cycle rather than published guidance, state the cycle (e.g. 'first submission due in the 2028 submission year per 11 CCR 7157') — never defer to 'guidance TBD' without a fallback.",
    "UNDOCUMENTED IS NOT CONTRADICTORY: where two intake values could be complementary (e.g. a 90-day retention for one data category and a 24-month general period), describe the RELATIONSHIP as undocumented and flag it for the user to specify — do not assert direct contradiction unless the values cannot coexist. Where a conclusion of 'insufficient basis' is reached, state explicitly that it reflects record incompleteness, not a substantive determination on the merits.",
    "ASSERTION LEVELS: intake_data.assertions, where present, records the epistemic basis of designated answers. state 'confirmed' = directly checked. state 'believed' with a basis = a complete, legitimate record entry: record the answer WITH its stated basis in the relevant entry's text (factually, no alarm), count it fully toward record completeness, and NEVER generate an insufficient-basis finding, an information_needed entry, or an inconsistency flag from the believed status alone. state 'unknown' = treat exactly as an unanswered question is treated today. Fields with no assertions entry are legacy answers, treated exactly as today. A believed answer participates in contradiction detection on its CONTENT like any other answer — the assertion level itself is never the contradiction.",
    "ROUTING PRECEDENCE FOR BELIEVED FIELDS: strengthen_items is derived MECHANICALLY from intake_data.assertions — exactly one entry per believed-basis field, no more and no fewer; a run with no believed assertions has an empty strengthen_items. Membership in strengthen_items is independent of everything else: a believed field that is also party to a genuine CONTENT contradiction appears BOTH in the contradiction's inconsistency_flags entry AND in strengthen_items with its basis. information_needed never contains an entry whose substance is verifying, confirming, or deepening a believed-basis answer — the recorded basis is the answer; only a genuinely distinct missing fact may generate an information_needed entry, attributed to the field that is actually missing.",
    "RECORD SUFFICIENCY: record_sufficiency.complete is true when every required element of 11 CCR 7152(a) is addressed in the record — including elements answered on a believed basis — and no unresolved determinative gap or contradiction remains open. record_sufficiency.statement, when complete is true, says in your own words that this assessment constitutes a complete risk-assessment record under 11 CCR 7150-7157 as of the assessment date; when complete is false, it states which 7152(a) element(s) remain open, citing them. Never condition completeness on verification depth.",
    "ITEM TAXONOMY + source_fields: strengthen_items lists each believed-basis entry — item_id (S-1, S-2, ...), the citing regulation, the intake field_ids involved, and the recorded basis verbatim from the assertion. strengthen_items are OPTIONAL depth items: they are never counted in any issues total, never appear in inconsistency_flags or information_needed, and carry no urgency language. Separately, every inconsistency_flags and information_needed entry carries source_fields listing ALL intake field ids that gave rise to it (both sides of a contradiction).",
    "FIELD-ID VOCABULARY (CLOSED SET): source_fields and any intake-field reference (including inconsistency_flags.intake_field_1 / intake_field_2 and information_needed.field) may ONLY use ids from the CANONICAL_INTAKE_FIELDS list injected below, verbatim. NEVER invent, rename, or paraphrase a field id. Never emit descriptors like 'recipients_third_parties' or 'ADMT trigger fields' unless that exact string appears in the canonical list. An entry that cannot be tied to canonical ids should omit source_fields rather than fabricate them.",
    "ADMT-FIELD SOURCE MAPPING: for the negated-q18-vs-detailed-ADMT-fields inconsistency, the raw intake ids are 'q19_admt_description' and 'q20_admt_opt_out' (these ARE members of the CANONICAL_INTAKE_FIELDS vocabulary when populated in the intake). The intake normaliser exposes their content elsewhere in the report under 'content_detail.admt_description' and 'content_detail.admt_opt_out' — those are report-display paths, not intake-field ids, and MUST NOT appear in source_fields, intake_field_1/2, or information_needed.field. Use the raw intake ids (q19_admt_description / q20_admt_opt_out) in every source_fields context; where prose narrative needs to reference the same content, name the intake id in parentheses on first mention: 'ADMT description (intake field q19_admt_description; surfaced as content_detail.admt_description)'. Where q19_admt_description or q20_admt_opt_out does NOT appear in the injected CANONICAL_INTAKE_FIELDS vocabulary for a given run, do not fabricate them into source_fields — omit source_fields for that entry per the FIELD-ID VOCABULARY rule.",
    "CYBERSECURITY-AUDIT RATIONALE — NO UNGROUNDED HEDGES, NO CANNED CONCLUSIONS: cross_tool_recommendations.cybersecurity_audit_rationale states a determination grounded in the intake, not a hedged possibility unmoored from the record — and never a conclusion the record cannot support. Read every prong from the injected TEST-STATES block and defer to it: (i) sensitive-PI prong — reflect M4's state verbatim (RESOLVED not applicable when q15_sensitive_pi = No; RESOLVED met when q15c_spi_volume = '50,000 or more'; RESOLVED not met when q15c_spi_volume = 'Fewer than 50,000'; INDETERMINATE otherwise, in which case use insufficient-basis language anchored to q15c_spi_volume). Do NOT emit hedges of the form 'may approach the 50,000 sensitive-PI threshold… but this has not been fully confirmed' when M4 is RESOLVED. (ii) volume prong — reflect M3's state verbatim, per the BAND-VS-THRESHOLD RULE. (iii) revenue prong (§ 7120(b)(1) 50%-from-sale/share) — reflect M5's state verbatim (RESOLVED not-met when q5_sell_share = No or q5c_share_revenue_50pct = No; RESOLVED met when q5c_share_revenue_50pct = Yes; INDETERMINATE otherwise). Zero canned prong-specific phrasing beyond what the TEST-STATES basis supports.",
    "BAND-VS-THRESHOLD RULE: when an intake value is recorded as a RANGE/BAND and a statutory threshold falls strictly inside that range, the threshold determination is INDETERMINATE on the current record — never assert met or not met. State that the recorded band cannot resolve the threshold, and add an information_needed entry requesting the exact figure. A band lying entirely below the threshold supports 'not met'; entirely at or above supports 'met' (subject to any conjunctive conditions). 'Unsure' resolves no threshold. This applies to every banded figure, including the 250,000-consumer/household and 50,000-sensitive-PI volumes (§ 7120(b)(2)) and the $25M / $100M revenue lines (§ 1798.140(d)(1)(A), § 7121(a)). Encompassing is not straddling: a $25M–$100M revenue band lies entirely above the $25M line and supports 'met' for that line while remaining indeterminate for the $100M line.",
    "BENEFITS_OUTWEIGH_RISKS_CONCLUSION IS A RECORD-COMPLETENESS LABEL, NOT A MERITS DETERMINATION: where the record is incomplete, the value of benefits_outweigh_risks_conclusion is exactly 'Cannot be determined — record incomplete. See benefits_outweigh_risks_rationale for detail' (verbatim, matching the schema enum) — NEVER 'Insufficient basis' as a shorthand label, and NEVER 'No' or 'Uncertain' when the underlying issue is record completeness rather than a substantive weighing. The rationale field carries the specifics of what is missing and why the balance cannot yet be struck. Where the record IS sufficient and a substantive determination is possible, use 'Yes' / 'No' / 'Uncertain' as appropriate and put the merits reasoning in the rationale. Do not use the record-completeness label to avoid a substantive determination that the record actually supports.",
    "ADMT-INCONSISTENCY DEADLINE SURFACES BOTH DATES: the priority_action addressing the negated-q18-vs-detailed-ADMT-fields inconsistency (or any action that combines the § 7155(b) assessment-record deadline with the § 7220 ADMT pre-use-notice deadline in its deadline_basis) MUST surface both dates in the deadline field itself so the field cannot be read alone as governed by a single clock. Each date carries its computed temporal framing per the prompt-core TEMPORAL FRAMING RULE, based on the assessment date. Canonical form for the deadline field (framing conditional on the assessment date; substitute the operative phrase for each date at generation time): \"2027-12-31 (assessment record — [operative | prospective as of the assessment date]); 2027-01-01 if ADMT confirmed (pre-use notice — [operative | prospective as of the assessment date]; see action [N])\" — where [N] cross-references the separate ADMT pre-use notice priority action if one exists. deadline_basis then cites both § 7155(b) and § 7220 with the conditional trigger for each. Where the two deadlines govern genuinely separate deliverables, prefer splitting into two priority actions (per the ONE DEADLINE PER ACTION rule) — the both-dates deadline form is reserved for the single-action inconsistency-resolution case where the applicable deadline depends on how the controller resolves the ADMT determination. Where a separate ADMT pre-use-notice priority action EXISTS in the same output, the inconsistency action's deadline field carries ONLY the § 7155(b) assessment-record date, and the § 7220 date lives solely in that separate action.",
    "EXCEPTION FLAGS ARE EXCEPTION-SPECIFIC: a placeholder-type deficiency shared by every exception (e.g. 'Controlling § 1798.145 subsection not documented') is stated ONCE — as a single information_needed item or a single priority_action covering all affected exceptions — and never repeated in each exception's flags[] array. flags[] carries only the deficiencies specific to that exception.",
    "STATUTORY_BASIS MATCHES THE PROSE: every provision cited in an action's text (e.g. 11 CCR § 7001(ddd) for the significant-decision categories) also appears in that action's statutory_basis field. A provision cited in prose but missing from statutory_basis is a defect.",
    "INCONSISTENCY CHARACTERISATIONS MATCH ACROSS SECTIONS: where inconsistency_flags describes two records as 'coexisting with an undocumented relationship', every other section referencing the same issue (exception_analysis flags, priority actions) uses the same characterisation — never 'conflicts with' in one place and 'not necessarily contradictory' in another.",
    "INDETERMINATE ADMT STATUS IS PHRASED AS INDETERMINATE: where the ADMT determination is unresolved and the cross-tool recommendation flag is true, write 'whether an ADMT assessment is required cannot be determined on the current record pending resolution' — never 'an ADMT assessment is not triggered... pending resolution', which contradicts the flag.",
    "§7001(e)(2) IS THE SUBSTANTIALLY-REPLACES STANDARD: cite §7001(e)(2) as defining when ADMT substantially replaces human decisionmaking (meaningful human involvement not practicable) — never as a standalone definition of 'meaningful human involvement'.",
    "TEST-STATES ARE BINDING (R1b1 rule 2a): the injected TEST-STATES block records the deterministic state of each mechanical determination (M1–M10). Any test whose state is RESOLVED — resolved_met, resolved_not_met, or resolved_not_applicable — is stated as concluded in the report with the basis given; NEVER hedge it, NEVER emit an information_needed entry for it, and NEVER ask the user to confirm/verify/validate/document it. A RESOLVED state may never be contradicted in prose. Any test whose state is INDETERMINATE uses insufficient-basis language and MUST generate exactly ONE information_needed entry anchored to the producing field(s) listed in the block. Cross-reference by test id (e.g. 'per TEST-STATES M4') when the same conclusion recurs across sections.",
    "PROPORTIONATE ASKS (R1b1 rule 2b): (i) ASK CLASSES — classify every surfaced item as verdict-blocking, record-completeness, or enhancement. Only verdict-blocking and record-completeness items appear in information_needed (verdict-blocking listed first). Enhancement items appear ONLY in the strengthen/depth mechanism (strengthen_items), with no urgency language. (ii) CREDIT-FIRST — for any partially evidenced determination, name what the record establishes BEFORE the residual; the residual is incremental (e.g. 'Additional recipients should be named, with the categories of PI each processes'), and NEVER re-requests content the intake already supplies. (iii) BANNED COLLAPSE — the phrases 'cannot be determined', 'no basis to assess', and 'not established' may NOT be applied to a whole determination when only an increment is missing. Where a missing piece IS verdict-blocking, name the specific element that blocks it rather than collapsing the whole determination.",
    "ADMT ASK ROUTING (R1b1 rule 2e): any information_needed entry arising from a q18-class ADMT determination anchors to `i5_admt_logic` (the free-text home for ADMT logic/description), NEVER to q18/q19/q20 radios. Where the ask genuinely concerns a radio's binary state (rare), route it via the record-completion action rather than an information_needed entry.",
    "GUIDED-DIMENSIONS FOR OVERLOADED FREE-TEXT FIELDS (R1b1 rule 2f): information_needed entries anchored to `i6_vendors`, `i2_retention_period`, or `i1b_min_pi` MUST enumerate the DIMENSIONS a sufficient answer covers (per ACTIONABLE FILL-IN GUIDANCE) and close with the instruction 'enrich this field and re-run'. Never emit a bare 'provide more detail' ask for these fields.",
    "VOCABULARY — 'GAP' IS BANNED IN PROSE: the word 'gap'/'gaps' must not appear anywhere in generated prose. Use 'deficiency', 'shortfall', or 'missing element' instead. The only permitted occurrence is the exact schema enum value 'Material gaps identified' where the schema requires it.",
  ].join("\n"),

  schema: `OUTPUT FORMAT — Return a single JSON object with this exact structure. No markdown fences, no preamble:

{
  "assessment_summary": {
    "company_name": string,
    "sector": string,
    "assessment_date": string,
    "triggered_activities": string[],
    "exceptions_claimed": string[],
    "exceptions_status": "All well-documented" | "Some require strengthening" | "Material gaps identified" | "Insufficient basis to assess",
    "overall_risk_level": "Low" | "Moderate" | "High" | "Critical" | "Insufficient basis",
    "cybersecurity_audit_required": boolean,
    "admt_disclosure_required": boolean,
    "corpus_enforcement_note": string
  },
  "scope_and_triggers": {
    "triggered_activities_detail": [
      { "activity": string, "statutory_basis": string, "data_categories": string[], "consumer_categories": string[], "assessment_required": boolean, "assessment_required_rationale": string }
    ],
    "scope_notes": string
  },
  "exception_analysis": [
    { "exception_name": string, "statutory_basis": string, "claimed": boolean, "scope_described": string, "safeguards_described": string, "documentation_status": "Documented" | "Undocumented" | "Insufficient basis" | "Not claimed", "missing_elements": string[], "validity_assessment": string, "flags": string[] }
  ],
  "risk_assessment_by_activity": [
    { "activity": string, "statutory_basis": string, "purpose": string, "benefits_to_business": string, "benefits_to_consumers": string,
      "adverse_effects": [ { "harm_type": string, "likelihood": string, "severity": string, "description": string } ],
      "current_safeguards": string, "safeguard_gaps": string,
      "benefits_outweigh_risks_conclusion": "Yes" | "No" | "Uncertain" | "Cannot be determined — record incomplete. See benefits_outweigh_risks_rationale for detail", "benefits_outweigh_risks_rationale": string,
      "section_7152_mapping": string }
  ],
  "inconsistency_flags": [
    { "description": string, "intake_field_1": string, "intake_field_2": string, "regulatory_citation": string, "resolution_required": string, "source_fields": string[] }
  ],
  "enforcement_context": {
    "relevant_precedents": string, "sector_specific_patterns": string, "audit_division_priorities": string
  },
  "priority_actions": [
    { "action": string, "statutory_basis": string, "severity": "Immediate" | "High" | "Medium" | "Low", "deadline": string, "deadline_basis": string }
  ],
  "cross_tool_recommendations": {
    "cybersecurity_audit": boolean, "cybersecurity_audit_rationale": string,
    "admt_assessment": boolean, "admt_assessment_rationale": string
  },
  "document_metadata": {
    "assessment_version": "1.0",
    "statutory_framework": "Cal. Code Regs. tit. 11, §§ 7150–7157",
    "compliance_deadline": "December 31, 2027",
    "disclaimer": "This document has been generated to assist in preparing a CPPA risk assessment. It does not constitute legal advice. Review with qualified privacy counsel before submission or reliance."
  },
  "information_needed": [
    { "field": "<intake field key that exists in the intake>", "dimensions": "<what specifically to add — dimensions, never suggested values>", "provision": "<already-cited provision that makes these dimensions relevant>", "enables": "<which section/determination of this report completes with it>", "source_fields": string[] }
  ],
  "record_sufficiency": { "complete": boolean, "statement": string },
  "strengthen_items": [
    { "item_id": string, "citation": string, "field_ids": string[], "recorded_basis": string }
  ]
}
Every insufficient-basis or "Insufficient information" finding elsewhere in this output MUST have a corresponding information_needed entry; otherwise return an empty array.`,
};

function buildUserPrompt(intake: FiveStageIntake, subjectAnchor = ""): string {
  const { triggers, exceptions, activity_details, impact, org_context } = intake;
  const noExceptions = Object.values(exceptions).every((v: any) => !v?.claimed);

  // [REVISED] Pull authoritative § 7150(b) subsection strings from the registry —
  // never hardcode § 7150(b)(N) literals in this file.
  const SEC_OBSERVE  = CITATION_REGISTRY.ra_trigger_observe.section;  // systematic observation
  const SEC_LOCATION = CITATION_REGISTRY.ra_trigger_location.section; // sensitive location
  const SEC_TRAIN    = CITATION_REGISTRY.ra_trigger_train.section;    // train ADMT / biometric

  // Plain-language labels — never emit the raw snake_case keys into the prompt,
  // or the model echoes them ("cross_context_tracking: true") into the report.
  const TRIGGER_LABELS: Record<string, string> = {
    sells_or_shares_pi: "Selling or sharing personal information",
    targeted_advertising: "Cross-context behavioural / targeted advertising",
    profiling_significant_effects: "Profiling via systematic observation or sensitive-location presence",
    sensitive_pi_beyond_enumerated: "Processing sensitive personal information",
    high_volume_processing: "High consumer volume (NOTE: not a § 7150(b) trigger — applicable § 7120 cyber-audit obligation only)",
    admt_involved: "Automated decisionmaking technology (use and/or training)",
  };
  const EXCEPTION_LABELS: Record<string, string> = {
    fraud_detection: "Fraud prevention / detection",
    security_integrity: "Security & integrity of systems and data",
    debugging: "Debugging to identify and repair errors",
    transient_use: "Transient / short-term use",
    internal_research: "Internal research for technological development",
    employment_context: "Employment-context processing",
    legal_compliance: "Compliance with a legal obligation",
    consumer_request: "Performing a service the consumer requested",
  };
  const yn = (b: any) => (b ? "yes" : "no");

  // high_volume_processing is never a § 7150(b) trigger (it is a § 7120 cyber-audit
  // signal). Detection no longer sets it; this guard also drops any stray supplied value.
  const activeTriggers = Object.entries(triggers)
    .filter(([k, v]) => v && k !== "high_volume_processing")
    .map(([k]) => TRIGGER_LABELS[k] ?? k);
  const claimedList = Object.entries(exceptions)
    .filter(([, v]: any) => v?.claimed)
    .map(([k, v]: any) => `- ${EXCEPTION_LABELS[k] ?? k}: scope — ${String(v.scope || "not described")}; safeguards — ${String(v.safeguards || "not described")}`);
  const activityProse = (activity_details ?? [])
    .filter((a: any) => a?.trigger_key !== "high_volume_processing")
    .map((a: any, i: number) => {
    const cats = Array.isArray(a.data_categories) ? a.data_categories.join(", ") : String(a.data_categories ?? "not specified");
    const cons = Array.isArray(a.consumer_categories) && a.consumer_categories.length ? a.consumer_categories.join(", ") : "not specified";
    return `Activity ${i + 1} — ${TRIGGER_LABELS[a.trigger_key] ?? a.trigger_key}:
  Data categories: ${cats}
  Consumer categories: ${cons}
  Specific purpose: ${String(a.purpose_description ?? "not provided")}
  Minimum PI necessary (§ 7152(a)(3)): ${String(a.minimum_pi_necessary ?? "Not provided.")}
  Sources of the PI (§ 7152(a)(3)): ${String(a.pi_sources ?? "Not provided.")}
  Recipients / third parties: ${String(a.third_party_recipients || "none stated")}
  Benefit to the business (§ 7152(a)(4)): ${String(a.business_benefits ?? "Not provided.")}
  Benefit to the consumer (§ 7152(a)(4)): ${String(a.consumer_benefits ?? "Not provided.")}
  Benefit to other stakeholders / the public: ${String(a.stakeholder_public_benefits ?? "Not provided.")}
  Planned safeguards (§ 7152(a)(6)): ${String(a.current_safeguards ?? "Not provided.")}
  Cross-context tracking: ${yn(a.cross_context_tracking)}; profiling/inferences: ${yn(a.profiling_inferences)}; children in scope: ${yn(a.children_in_scope)}`;
  }).join("\n\n");

  const today = new Date().toISOString().slice(0, 10);

  return `Generate a CPPA risk assessment for the following organisation. Map all output to the § 7152 required content elements. Use ${today} as the assessment_date — do not invent a different date.

FIXED ASSESSMENT SUBJECT (locked across revision runs): ${subjectAnchor || "(not provided — legacy assessment)"}
This assessment addresses this single processing activity. All findings, the § 7152(a)(1) purpose
analysis, and every section of the report concern this subject only.


STAGE 1 — TRIGGERED ACTIVITIES (§ 7150(b)):
${activeTriggers.length ? activeTriggers.map((t) => `- ${t}`).join("\n") : "- None explicitly indicated."}

Annual consumer volume: ${intake.annual_consumer_volume ?? "Not specified"}

STAGE 2 — § 7152 EXCEPTION / BUSINESS-PURPOSE CLAIMS:
${noExceptions ? "No exceptions claimed." : claimedList.join("\n")}

STAGE 3 — PROCESSING ACTIVITY DETAILS:
${activityProse || "No activity detail provided."}

STAGE 4 — IMPACT ASSESSMENT:
Likelihood of harm: ${impact.likelihood_of_harm}
Severity of harm: ${impact.severity_of_harm}
Harm types identified: ${(impact.harm_types ?? []).join(", ")}
${impact.vulnerable_populations_detail ? `Vulnerable populations detail: ${impact.vulnerable_populations_detail}` : ""}
Benefits outweigh risks (organisation assessment): ${impact.benefits_outweigh_risks}
Rationale: ${impact.benefits_outweigh_risks_rationale}
Cybersecurity gaps identified: ${impact.cybersecurity_gaps_identified ? "Yes" : "No"}
Prior assessments conducted: ${impact.prior_assessments_conducted ? `Yes (${impact.prior_assessment_date ?? "date not specified"})` : "No"}

STAGE 5 — ORGANISATIONAL CONTEXT:
Company: ${org_context.company_name}
Sector: ${org_context.sector}
Annual revenue threshold: ${org_context.annual_revenue_threshold}
Privacy counsel engaged: ${org_context.privacy_counsel_engaged ? "Yes" : "No"}
DPO/Privacy Officer: ${org_context.dpo_or_privacy_officer ? "Yes" : "No"}
Board-level privacy oversight: ${org_context.board_level_oversight ? "Yes" : "No"}
Existing privacy programme: ${org_context.existing_privacy_programme}
CPPA audit notification received: ${org_context.cppa_audit_notification_received ? "YES — URGENT" : "No"}
${org_context.additional_context ? `Additional context: ${org_context.additional_context}` : ""}
${intake.content_detail ? `
§ 7152(a)(1)–(9) CONTENT DETAIL (from the user's intake — map each to its required content element; treat blanks as fill-ins, not findings of absence):
Retention period: ${intake.content_detail.retention_period || "not provided"}
Retention criteria: ${intake.content_detail.retention_criteria || "not provided"}
Retention detail: ${intake.content_detail.retention_detail || "not provided"}
How consumers are informed / disclosures (§ 7152(a)(3)(E)): ${intake.content_detail.consumer_disclosures || "not provided"}
ADMT — logic: ${intake.content_detail.admt_logic || "n/a"}
ADMT — training-data source: ${intake.content_detail.admt_training_source || "n/a"}
ADMT — fairness/bias testing: ${intake.content_detail.admt_fairness_testing || "n/a"}
ADMT — human review / appeal: ${intake.content_detail.admt_human_review || "n/a"}
ADMT — description: ${intake.content_detail.admt_description || "n/a"}
ADMT — opt-out offered: ${intake.content_detail.admt_opt_out || "n/a"}
Sensitive-PI use-limitation offered: ${intake.content_detail.sensitive_pi_limit_offered || "n/a"}
Sensitive-PI processing basis: ${intake.content_detail.sensitive_pi_basis || "n/a"}
"Do Not Sell/Share" opt-out link: ${intake.content_detail.opt_out_link || "n/a"}
Notice at collection: ${intake.content_detail.notice_at_collection || "n/a"}
Minimum PI necessary (§ 7152(a)(3)): ${intake.content_detail.minimum_pi_necessary || "not provided"}
Sources of the PI (§ 7152(a)(3)): ${intake.content_detail.pi_sources || "not provided"}
Under-16 actual knowledge (§ 7001(bbb)): ${intake.content_detail.under16_actual_knowledge || "not stated"}
Systematic-observation profiling trigger (${SEC_OBSERVE}): ${intake.content_detail.profiling_observation_trigger || "no"}
Sensitive-location profiling trigger (${SEC_LOCATION}): ${intake.content_detail.profiling_observation_trigger || "no"}
ADMT / biometric training trigger (${SEC_TRAIN}): ${intake.content_detail.admt_training_trigger || "no"}
Negative-impact sources and causes (§ 7152(a)(5)): ${intake.content_detail.harm_sources_and_causes || "not provided"}
Contributors to this assessment (§ 7152(a)(8)): ${intake.content_detail.internal_contributors || "not provided"}
External consultees: ${intake.content_detail.external_consultees || "none stated"}
Certifying executive (§ 7157): ${intake.content_detail.certifying_exec_name || "[FILL IN]"}${intake.content_detail.certifying_exec_title ? `, ${intake.content_detail.certifying_exec_title}` : ""}${intake.content_detail.certifying_contact_email ? ` (${intake.content_detail.certifying_contact_email})` : ""}
Existing DPIA/assessment to cross-reference: ${intake.content_detail.existing_dpia || "No"}
` : ""}
Return only valid JSON matching the specified output structure. No preamble, no markdown fences.`;
}

// ---------------------------------------------------------------------------
// Model call — Claude Sonnet 4.6 via Anthropic API direct.
// ---------------------------------------------------------------------------
async function callModel(
  system: string | SystemBlock[],
  user: string,
  label = "generate-v4"
): Promise<{ text: string; stopReason: string | null }> {
  const t0 = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: PRODUCT_MAX_OUTPUT_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(900_000),
  });
  const elapsed = Date.now() - t0;
  if (!res.ok) {
    const t = await res.text();
    console.error(`[${label}] HTTP ${res.status} in ${elapsed}ms: ${t.slice(0, 300)}`);
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const d = await res.json();
  const text = d.content?.[0]?.text ?? "";
  const stopReason: string | null = d.stop_reason ?? null;
  console.log(`[${label}] ok in ${elapsed}ms chars=${text.length} stop=${stopReason}`);
  return { text, stopReason };
}

function tryParseJson(text: string): any | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
async function runPipeline(assessment_id: string) {
  try {
    const { data: row } = await supabase.from("cppa_assessments").select("*").eq("id", assessment_id).single();
    if (!row) return;
    const procWrite = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "processing" }, { fn: "run-cppa-risk-assessment", phase: "pre_generation" });
    if (!procWrite.ok) {
      // Cannot persist lifecycle state — abort before spending model time.
      return;
    }

    const { intake: fiveStage, wasLegacyShimmed } = normaliseIntake(row.intake_data ?? {});

    const validation = validateFiveStage(fiveStage, /* lenient */ wasLegacyShimmed);
    if (!validation.ok) {
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
        status: "error",
        report_data: { error: "VALIDATION_FAILED", message: validation.message, field: validation.field },
      }, { fn: "run-cppa-risk-assessment", phase: "terminal_error_validation" });
      return;
    }

    // Corpus retrieval (parallel).
    const { enforcementContext, longitudinalSynthesis, statuteContext, fsorContext, citations } = await retrieveCorpusContext(fiveStage);

    const today = new Date().toISOString().slice(0, 10);
    const injected = [
      `ENFORCEMENT CONTEXT FROM CORPUS:\n${enforcementContext || "(none returned)"}`,
      `LONGITUDINAL ENFORCEMENT PATTERNS:\n${longitudinalSynthesis || "(none returned)"}`,
      `VERBATIM REGULATION TEXT (Cal. Code Regs. tit. 11 — authoritative; ground every citation in this text):\n${statuteContext || "(none returned)"}`,
      `CPPA AGENCY COMMENTARY — FINAL STATEMENT OF REASONS:\n${fsorContext || "(none returned)"}`,
    ].join("\n\n");
    const system = buildSystemContent({
      toolModule: CPPA_RISK_TOOL_MODULE,
      currentDate: today,
      injected,
    });
    const rawIntake = (row.intake_data ?? {}) as Record<string, unknown>;
    const subjectAnchor = typeof rawIntake?.subject_anchor === "string" ? (rawIntake.subject_anchor as string).trim() : "";
    // Doc O 3c-2(i): canonical intake-field vocabulary. The intake IS
    // the schema — enumerate its top-level keys and inject them into
    // the user prompt so the model has an authoritative closed set
    // for source_fields / intake_field_1 / intake_field_2 / field.
    const canonicalFieldIds = Object.keys(rawIntake)
      .filter((k) => k !== "assertions")
      .sort();
    const canonicalBlock = `CANONICAL_INTAKE_FIELDS (closed vocabulary — use only these ids verbatim in source_fields, intake_field_1/2, and information_needed.field):\n${canonicalFieldIds.map((k) => `  - ${k}`).join("\n")}`;
    const userPrompt = `${canonicalBlock}\n\n${buildUserPrompt(fiveStage, subjectAnchor)}`;

    const t0 = Date.now();
    let parsed: any = null;
    let debugRaw = "";
    let lastStopReason: string | null = null;

    const first = await callModel(system, userPrompt, "generate-v4");
    lastStopReason = first.stopReason;

    // Helper: re-call Claude at an explicit token ceiling.
    const callAt = async (maxTokens: number, label: string) => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: AbortSignal.timeout(900_000),
      });
      if (!res.ok) {
        console.warn(`[${label}] http ${res.status}`);
        return { text: "", stopReason: null as string | null };
      }
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "";
      const stopReason: string | null = data.stop_reason ?? null;
      console.log(`[${label}] ok chars=${text.length} stop=${stopReason}`);
      return { text, stopReason };
    };

    if (first.stopReason === "max_tokens") {
      // First call already runs at the model ceiling (PRODUCT_MAX_OUTPUT_TOKENS).
      // Truncation here is exceptional; one retry at the same ceiling is the
      // most we can do synchronously. Cross-product retry/refund flow picks up
      // any residual failures.
      console.warn(`[cppa-risk v4] output truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} tokens — single retry`);
      const retry = await callAt(PRODUCT_MAX_OUTPUT_TOKENS, "generate-v4-retry-max");
      lastStopReason = retry.stopReason;
      debugRaw = retry.text;
      parsed = tryParseJson(retry.text);
    } else {
      debugRaw = first.text;
      parsed = tryParseJson(first.text);
      if (!parsed) {
        console.warn("[cppa-risk v4] first parse failed — retrying once");
        const retry = await callModel(system, userPrompt, "generate-v4-retry");
        lastStopReason = retry.stopReason;
        debugRaw = retry.text;
        parsed = tryParseJson(retry.text);
      }
    }

    console.log(`[cppa-risk v4] generation total ${Date.now() - t0}ms stop=${lastStopReason}`);

    if (!parsed || !parsed.assessment_summary) {
      const errorCode = lastStopReason === "max_tokens"
        ? "generation_truncated"
        : "generation_parse_failed";
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
        status: "error",
        report_data: {
          error: errorCode,
          stop_reason: lastStopReason,
          debug: debugRaw.slice(0, 4000),
        },
      }, { fn: "run-cppa-risk-assessment", phase: "terminal_error_parse" });
      return;
    }

    // Post-generation verification (soft): banned phrases + hard lint violations.
    // One regeneration via the existing retry path if either fires.
    try {
      const flat = JSON.stringify(parsed);
      const banned = BANNED_PHRASES.filter((p) => flat.includes(p));
      const lint = lintReportText(flat, { banGapWord: true });

      // T-1 — deterministic band-vs-threshold backstop for the § 7120(b)(2)(A)
      // 250,000-consumer volume prong. Derived from the SAME normalised intake
      // the prompt consumes (fiveStage.annual_consumer_volume).
      //
      // Clean bands (aligned to the 250,000 breakpoint) resolve deterministically:
      //   "Fewer than 100,000" / "100,000–249,999" — entirely BELOW 250,000 →
      //       definitive "met" claims are violations.
      //   "250,000–1 million" / "1–10 million" / "Over 10 million" — entirely
      //       AT OR ABOVE 250,000 → definitive "not met" claims are violations.
      //
      // Legacy straddling band "100,000–1 million" and "Unsure" cannot resolve
      // the threshold — ANY definitive met/not-met claim (either direction) is
      // a violation and the report must state indeterminate.
      const volumeBand = String(fiveStage.annual_consumer_volume ?? "").trim();
      const belowBands = new Set(["Fewer than 100,000", "100,000–249,999"]);
      const aboveBands = new Set(["250,000–1 million", "1–10 million", "Over 10 million"]);
      const straddleOrUnsure = volumeBand === "100,000–1 million" || volumeBand.toLowerCase() === "unsure";

      const metPatterns: RegExp[] = [
        /exceeds the 250,000/i,
        /250,000-consumer volume threshold is met/i,
      ];
      const notMetPatterns: RegExp[] = [
        /below the 250,000/i,
        /250,000-consumer volume threshold is not met/i,
      ];
      const hasMetClaim = metPatterns.some((re) => re.test(flat));
      const hasNotMetClaim = notMetPatterns.some((re) => re.test(flat));

      let t1Violation = false;
      let t1Reason: string | undefined;
      if (straddleOrUnsure && (hasMetClaim || hasNotMetClaim)) {
        t1Violation = true;
        t1Reason = "straddle_or_unsure_definitive_claim";
      } else if (belowBands.has(volumeBand) && hasMetClaim) {
        t1Violation = true;
        t1Reason = "below_band_claims_met";
      } else if (aboveBands.has(volumeBand) && hasNotMetClaim) {
        t1Violation = true;
        t1Reason = "above_band_claims_not_met";
      }
      if (t1Violation) {
        console.warn(JSON.stringify({
          evt: "post_gen_violation",
          rule: "T-1",
          fn: "run-cppa-risk-assessment",
          band: volumeBand,
          reason: t1Reason,
        }));
      }


      if (banned.length || hasHardViolations(lint) || t1Violation) {
        console.warn(JSON.stringify({
          evt: "post_gen_violation",
          fn: "run-cppa-risk-assessment",
          banned,
          violations: lint.violations?.slice(0, 20) ?? [],
          t1: t1Violation,
        }));
        const retry = await callModel(system, userPrompt, "generate-v4-retry");
        const retryParsed = tryParseJson(retry.text);
        if (retryParsed && retryParsed.assessment_summary) {
          parsed = retryParsed;
          lastStopReason = retry.stopReason;
          debugRaw = retry.text;
        }
      }
    } catch (e) {
      console.warn("[cppa-risk v4] post-gen verification error:", e);
    }

    // 2.2.a — FORWARD PATH retry trigger: if the guard detects a dead-end
    // insufficient-basis passage without a paired information_needed entry,
    // one regeneration with the appended instruction.
    try {
      const intakeForGuard = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const guarded = guardInformationNeeded(parsed, intakeForGuard);
      // Auto-repair (synthesised information_needed entries from empty intake keys) is
      // applied in-place; no model retry needed. We only regenerate when the guard could
      // not repair AND still detects a dead-end phrase — a rare edge case that used to
      // cost ~180s per run and push the outer job past the 12-min watchdog.
      if (guarded.autoRepaired > 0) {
        parsed = guarded.report;
      } else if (guarded.deadEndWithoutPath) {
        console.warn(JSON.stringify({ evt: "forward_path_retry", fn: "run-cppa-risk-assessment" }));
        const appended = userPrompt + "\n\nYour previous output contained an insufficient-basis finding with no information_needed entry. Re-emit with the required entry per the FORWARD PATH rule.";
        const retry = await callModel(system, appended, "generate-v4-fwdpath-retry");
        const retryParsed = tryParseJson(retry.text);
        if (retryParsed && retryParsed.assessment_summary) {
          parsed = retryParsed;
          lastStopReason = retry.stopReason;
          debugRaw = retry.text;
        }
      }
    } catch (e) {
      console.warn("[cppa-risk v4] forward-path guard preview error:", e);
    }


    // DETERMINISTIC § 7157 DEADLINE NORMALISATION (Branch A — corpus-confirmed date):
    // 11 CCR § 7157(a)(1) confirms that risk assessments conducted in 2026 and 2027
    // must be submitted no later than April 1, 2028. Normalise any § 7157 action's
    // deadline to that canonical value: rewrite bracketed "TBD" placeholders and any
    // other specific 2028 ISO date to 2028-04-01, and ensure deadline_basis quotes
    // § 7157(a)(1). Also rewrite any specific non-April-1 2028 calendar-date phrasing
    // in the action text to the canonical date. Structurally non-fatal (same try/catch
    // posture as other backstops).
    try {
      if (parsed && Array.isArray(parsed.priority_actions)) {
        const SEVEN_157_PATTERN = /§\s*7157|section\s*7157|11\s*CCR\s*§?\s*7157/i;
        const SPECIFIC_2028_DATE = /^2028-\d{2}-\d{2}$/;
        const BRACKETED_2028 = /^\[?\s*2028[^\]]*\]?$/;
        const CANONICAL = "2028-04-01";
        const BASIS_QUOTE = "11 CCR § 7157(a)(1): for risk assessments conducted in 2026 and 2027, the business must submit to the Agency the information required by subsection (b) no later than April 1, 2028.";
        for (const action of parsed.priority_actions) {
          const referencesSeven157 =
            SEVEN_157_PATTERN.test(String(action?.action ?? "")) ||
            SEVEN_157_PATTERN.test(String(action?.statutory_basis ?? "")) ||
            SEVEN_157_PATTERN.test(String(action?.deadline_basis ?? ""));
          if (!referencesSeven157) continue;
          const deadlineStr = String(action?.deadline ?? "");
          const needsFix =
            (SPECIFIC_2028_DATE.test(deadlineStr) && deadlineStr !== CANONICAL) ||
            BRACKETED_2028.test(deadlineStr);
          if (needsFix) {
            console.warn(`[cppa-risk] normalised § 7157 deadline from "${action.deadline}" to ${CANONICAL} (deterministic backstop, Branch A)`);
            action.deadline = CANONICAL;
            const existingBasis = String(action?.deadline_basis ?? "").trim();
            action.deadline_basis = existingBasis && !existingBasis.includes("7157(a)(1)")
              ? `${BASIS_QUOTE} ${existingBasis}`
              : BASIS_QUOTE;
          }
          // Rewrite any specific non-April-1 2028 calendar date in the action text.
          const actionText = String(action?.action ?? "");
          const badDatePattern = /\b(January|February|March|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+2028\b/gi;
          if (badDatePattern.test(actionText)) {
            const fixed = actionText.replace(badDatePattern, "April 1, 2028");
            if (fixed !== actionText) {
              console.warn(`[cppa-risk] rewrote non-canonical 2028 date in § 7157 action text to April 1, 2028`);
              action.action = fixed;
            }
          }
        }
      }
    } catch (e) {
      console.warn("[cppa-risk] § 7157 deadline backstop error:", e);
    }

    // DETERMINISTIC 2027-DATE TEMPORAL-FRAMING NORMALISATION: for every
    // priority_action whose deadline or deadline_basis text references
    // 2027-01-01 / "January 1, 2027" or 2027-12-31 / "December 31, 2027",
    // compare the date to the run's assessment date; if the date is AFTER
    // the assessment date, rewrite any attached framing token reading
    // "operative", "took effect", or "in force" to "prospective as of the
    // assessment date"; if ON OR BEFORE, rewrite any attached "prospective"
    // framing to "operative". Same try/catch posture as other backstops.
    try {
      if (parsed && Array.isArray(parsed.priority_actions)) {
        const assessmentDateStr = String((parsed as any)?.assessment_date || new Date().toISOString().slice(0, 10));
        const assessmentDate = new Date(assessmentDateStr);
        const TARGETS: { iso: string; prose: RegExp }[] = [
          { iso: "2027-01-01", prose: /January\s+1,?\s+2027/i },
          { iso: "2027-12-31", prose: /December\s+31,?\s+2027/i },
        ];
        for (let idx = 0; idx < parsed.priority_actions.length; idx++) {
          const action = parsed.priority_actions[idx];
          const deadlineStr = String(action?.deadline ?? "");
          const basisStr = String(action?.deadline_basis ?? "");
          for (const t of TARGETS) {
            const referenced =
              deadlineStr.includes(t.iso) ||
              basisStr.includes(t.iso) ||
              t.prose.test(deadlineStr) ||
              t.prose.test(basisStr);
            if (!referenced) continue;
            const target = new Date(t.iso);
            const isProspective = target.getTime() > assessmentDate.getTime();
            const fieldsToRewrite: Array<"deadline" | "deadline_basis" | "action"> = ["deadline", "deadline_basis", "action"];
            for (const f of fieldsToRewrite) {
              const original = String((action as any)?.[f] ?? "");
              if (!original) continue;
              let rewritten = original;
              if (isProspective) {
                rewritten = rewritten.replace(/\b(operative|took effect|in force)\b/gi, "prospective as of the assessment date");
              } else {
                rewritten = rewritten.replace(/\bprospective(?: as of the assessment date)?\b/gi, "operative");
              }
              if (rewritten !== original) {
                console.warn(`[cppa-risk] 2027-date temporal framing rewrite on priority_actions[${idx}].${f} (target=${t.iso}, prospective=${isProspective})`);
                (action as any)[f] = rewritten;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[cppa-risk] 2027-date temporal framing backstop error:", e);
    }

    // DETERMINISTIC ADMT PRE-USE-NOTICE DEADLINE COLLAPSE + SELF-REFERENCE FIX:
    // (a) if a § 7220 pre-use-notice action exists, strip the "if ADMT confirmed"
    //     second-date clause from other actions' deadline fields and annotate their
    //     deadline_basis to point at the separate action.
    // (b) rewrite priority_actions[N] self-references / out-of-bounds references
    //     to the § 7150(b)(3) or ADMT-determination action's index.
    try {
      if (parsed && Array.isArray(parsed.priority_actions)) {
        const actions = parsed.priority_actions;
        // Identify the pre-use-notice action as one that cites § 7220 in its
        // action/text or deadline_basis AND whose OWN deadline field is a
        // single-clause form (does not itself contain the second conditional
        // "§ 7220 / if ADMT confirmed" clause). This prevents self-matching the
        // dual-date inconsistency action, whose deadline_basis also cites § 7220.
        const cites7220 = (a: any) => {
          const t = String(a?.action ?? a?.text ?? "");
          const b = String(a?.deadline_basis ?? "");
          return /§\s*7220/.test(t) || /§\s*7220/.test(b);
        };
        const hasSecondClauseDeadline = (a: any) =>
          /§\s*7220|if\s+ADMT\s+confirmed/i.test(String(a?.deadline ?? ""));
        const preUseIdx = actions.findIndex((a: any) => cites7220(a) && !hasSecondClauseDeadline(a));
        const anyCites7220 = actions.some((a: any) => cites7220(a));
        if (preUseIdx >= 0) {
          for (let idx = 0; idx < actions.length; idx++) {
            if (idx === preUseIdx) continue;
            const action = actions[idx];
            const deadline = String(action?.deadline ?? "");
            const hasDate = /\d{4}-\d{2}-\d{2}|January|February|March|April|May|June|July|August|September|October|November|December/i.test(deadline);
            const hasSecondClause = /§\s*7220|if\s+ADMT\s+confirmed/i.test(deadline);
            if (hasDate && hasSecondClause) {
              const firstDateMatch = deadline.match(/^[^;]*/);
              const firstDate = firstDateMatch ? firstDateMatch[0].trim() : deadline;
              action.deadline = firstDate;
              const basis = String(action?.deadline_basis ?? "");
              const note = " (see the separate ADMT pre-use-notice action)";
              if (!basis.includes("separate ADMT pre-use-notice action")) {
                action.deadline_basis = basis + note;
              }
              console.warn(`[cppa-risk] ADMT pre-use-notice deadline collapse on priority_actions[${idx}] (pre-use action at ${preUseIdx})`);
            }
          }
        } else if (anyCites7220) {
          // Per the ADMT-INCONSISTENCY canonical, if a § 7220-citing action
          // exists but no qualifying single-date pre-use action is present, the
          // both-dates deadline form is legitimate and nothing is rewritten.
          console.warn("[cppa-risk] ADMT pre-use-notice deadline collapse: § 7220-citing action found but no single-date pre-use action; leaving both-dates form intact per ADMT-INCONSISTENCY canonical");
        }
        const determinationIdx = actions.findIndex((a: any) => {
          const t = String(a?.action ?? a?.text ?? "");
          const b = String(a?.statutory_basis ?? "");
          return /§\s*7150\(b\)\(3\)/.test(t) || /§\s*7150\(b\)\(3\)/.test(b) || /ADMT\s+determination/i.test(t);
        });
        for (let idx = 0; idx < actions.length; idx++) {
          const action = actions[idx];
          const text = String(action?.action ?? action?.text ?? "");
          const rewritten = text.replace(/priority_actions\[(\d+)\]/g, (m, nStr) => {
            const n = Number(nStr);
            if (n === idx || n < 0 || n >= actions.length) {
              if (determinationIdx >= 0 && determinationIdx !== idx) {
                console.warn(`[cppa-risk] priority_actions self/out-of-bounds reference rewrite on priority_actions[${idx}] -> [${determinationIdx}]`);
                return `priority_actions[${determinationIdx}]`;
              }
            }
            return m;
          });
          if (rewritten !== text) {
            if ("action" in action) action.action = rewritten;
            else action.text = rewritten;
          }
        }
      }
    } catch (e) {
      console.warn("[cppa-risk] ADMT deadline-collapse / self-reference backstop error:", e);
    }



    let report_data: any = {
      schema_version: "v4-five-stage",
      generated_at: new Date().toISOString(),
      legacy_shim_applied: wasLegacyShimmed,
      normalised_intake: fiveStage,
      ...parsed,
      retrieval_meta: {
        enforcement_context_chars: enforcementContext.length,
        longitudinal_synthesis_chars: longitudinalSynthesis.length,
      },
    };

    // Stage 5: forward-path guard (strip invented information_needed fields; log dead-ends).
    const guarded = guardInformationNeeded(report_data, ((row as any).intake_data as Record<string, unknown>) ?? {});
    report_data = guarded.report;

    // Doc O 3c-2(ii): non-fatal source_fields validation. Drop any
    // source_fields / field_ids value that is not a canonical intake
    // key. Never blocks. Logs invented-id counts for the July 13 review.
    try {
      validateSourceFields(
        report_data,
        ((row as any).intake_data as Record<string, unknown>) ?? {},
      );
    } catch (e) {
      console.warn("[cppa-risk v4] source_fields validator error:", e);
    }

    // Doc O R2: ensure the two new top-level keys are always present so
    // downstream renderers / graders can rely on their shape even when
    // the model omits them (additive defaults, never overwriting).
    if (!report_data.strengthen_items || !Array.isArray(report_data.strengthen_items)) {
      report_data.strengthen_items = [];
    }
    if (!report_data.record_sufficiency || typeof report_data.record_sufficiency !== "object") {
      report_data.record_sufficiency = { complete: false, statement: "" };
    }

    // Doc W: deterministic BELIEVED-routing enforcement (belt and braces —
    // the generator has already ignored rule 3a once). Non-fatal, no status
    // or metering writes (Doc F posture). Contradiction flags are never
    // touched by this pass; only strengthen_items and information_needed.
    try {
      const intake = ((row as any).intake_data as Record<string, unknown>) ?? {};
      const assertions = (intake?.assertions ?? {}) as Record<string, { state?: string; basis?: string | null }>;
      const believedFields = new Set(
        Object.entries(assertions)
          .filter(([, v]) => v && v.state === "believed" && !!v.basis)
          .map(([k]) => k),
      );

      // 3b ENFORCE STRENGTHEN EXCLUSIVITY: remove any strengthen_items entry
      // whose field_ids contain NO believed-basis field. Empties the list on
      // legacy runs; logs each removal.
      const siBefore: any[] = Array.isArray(report_data.strengthen_items) ? report_data.strengthen_items : [];
      const siKept: any[] = [];
      for (const it of siBefore) {
        const fids: string[] = Array.isArray(it?.field_ids) ? it.field_ids : [];
        const anyBelieved = fids.some((f) => believedFields.has(f));
        if (anyBelieved) {
          siKept.push(it);
        } else {
          console.warn(`[cppa-risk Doc W] strengthen-exclusivity: removed entry item_id=${it?.item_id ?? "?"} field_ids=${JSON.stringify(fids)}`);
        }
      }
      report_data.strengthen_items = siKept;

      // 3a ENFORCE STRENGTHEN MEMBERSHIP: for every believed-basis field, if
      // no surviving strengthen_items entry references it, synthesize one.
      // Citation preference: the citation of any inconsistency_flags or
      // information_needed entry that references the field, else the R2
      // default "11 CCR 7152(a)".
      const findCitationForField = (f: string): string => {
        const flags: any[] = Array.isArray(report_data.inconsistency_flags) ? report_data.inconsistency_flags : [];
        for (const fl of flags) {
          const sf: string[] = Array.isArray(fl?.source_fields) ? fl.source_fields : [];
          if (sf.includes(f) && typeof fl?.regulatory_citation === "string" && fl.regulatory_citation.trim()) {
            return String(fl.regulatory_citation);
          }
        }
        const infos: any[] = Array.isArray(report_data.information_needed) ? report_data.information_needed : [];
        for (const inf of infos) {
          const sf: string[] = Array.isArray(inf?.source_fields) ? inf.source_fields : [];
          if ((sf.includes(f) || inf?.field === f) && typeof inf?.provision === "string" && inf.provision.trim()) {
            return String(inf.provision);
          }
        }
        return "11 CCR 7152(a)";
      };
      let nextIdx = report_data.strengthen_items.length + 1;
      const covered = new Set<string>();
      for (const it of report_data.strengthen_items) {
        for (const f of (it?.field_ids ?? [])) covered.add(f);
      }
      for (const f of believedFields) {
        if (covered.has(f)) continue;
        const basisToken = assertions[f]?.basis ?? "";
        const synth = {
          item_id: `S-${nextIdx++}`,
          citation: findCitationForField(f),
          field_ids: [f],
          recorded_basis: String(basisToken),
        };
        report_data.strengthen_items.push(synth);
        console.warn(`[cppa-risk Doc W] strengthen-membership: synthesized ${synth.item_id} for believed field ${f} (basis=${basisToken}, citation=${synth.citation})`);
      }

      // 3c INFORMATION_NEEDED SCRUB: remove any information_needed entry
      // whose `field` is a believed-basis field AND whose text asks to
      // verify/confirm/check/document the answer already given. Distinct
      // missing facts are preserved. Contradiction flags untouched.
      const verifyVerb = /\b(verify|verif(y|ies|ied|ication)|confirm(ed|ation|s)?|check(ed|s)?|validate(d|s)?|document(ed|ation|s)?)\b/i;
      const infoBefore: any[] = Array.isArray(report_data.information_needed) ? report_data.information_needed : [];
      const infoKept: any[] = [];
      for (const inf of infoBefore) {
        const f = String(inf?.field ?? "");
        if (believedFields.has(f)) {
          const blob = [inf?.dimensions, inf?.enables, inf?.provision]
            .filter((s) => typeof s === "string")
            .join(" ");
          if (verifyVerb.test(blob)) {
            console.warn(`[cppa-risk Doc W] info-scrub: removed information_needed entry field=${f} text=${JSON.stringify(String(inf?.dimensions ?? "").slice(0, 200))}`);
            continue;
          }
        }
        infoKept.push(inf);
      }
      report_data.information_needed = infoKept;
    } catch (e) {
      console.warn("[cppa-risk Doc W] BELIEVED-routing pass error:", e);
    }




    // QB11-5(b): an exception's missing_elements[] entry and flags[] entry must not be
    // exact duplicates — keep the missing_elements copy, drop the duplicate flag.
    function dedupeExceptionFlags(report: any): any {
      try {
        const arr = report?.exception_analysis;
        if (Array.isArray(arr)) {
          for (const ex of arr) {
            if (ex && Array.isArray(ex.flags) && Array.isArray(ex.missing_elements)) {
              const missing = new Set(ex.missing_elements.map((s: any) => String(s).trim().toLowerCase()));
              const before = ex.flags.length;
              ex.flags = ex.flags.filter((f: any) => !missing.has(String(f).trim().toLowerCase()));
              if (ex.flags.length !== before) console.warn(`[RISK] QB11-5(b): removed ${before - ex.flags.length} duplicate exception flag(s)`);
            }
          }
        }
      } catch (e) {
        console.error("[RISK] QB11-5(b) dedupe errored:", e);
      }
      return report;
    }
    report_data = dedupeExceptionFlags(report_data);

    // QB12-4(a) v3 (Doc V Step 2): field-aware dedupe of the exception-citation
    // summary note. A "note occurrence" is any string containing both "1798.145"
    // and "under which" (whitespace-normalized).
    //   - The KEPT occurrence is the one inside priority_actions[] (the note's
    //     designed home). If no priority_actions occurrence exists, keep the first
    //     occurrence encountered by depth-first walk.
    //   - A duplicate inside any REFERENCE field (e.g. exception_analysis
    //     statutory_basis) is replaced with the self-contained POINTER constant
    //     below (the § 1798.145 citation text plus the 11 CCR §§ 7150–7157
    //     clarifier), per CORE-1.
    //   - A duplicate whose priority_actions[].action is ONLY the note (fewer than
    //     40 chars of substantive content remain after excision) means the action
    //     exists only to restate the note: DELETE the whole action entry (never
    //     leave a pointer-only action). An action that CONTAINS the note alongside
    //     real content has only the note text excised.
    // Structurally non-fatal: try/catch cannot change status or metering.
    function dedupeExceptionCitationNote(report: any): any {
      try {
        const POINTER = "Cal. Civ. Code § 1798.145 [specific subsection to be determined and documented]. Note: 11 CCR §§ 7150–7157 impose the documentation duty but do not create exceptions; the applicable § 1798.145 subsection must be cited in the assessment record.";
        const isNote = (s: string) => {
          if (typeof s !== "string") return false;
          const n = s.replace(/\s+/g, " ").toLowerCase();
          return n.includes("1798.145") && n.includes("under which");
        };
        // Extract every note substring occurrence for excision (case-insensitive
        // match on the sentence around "1798.145 ... under which ...").
        const stripNoteText = (s: string): string => {
          // Remove sentences containing both markers; conservative: split on
          // sentence terminators, drop matching sentences, then normalise
          // doubled whitespace/punctuation.
          const parts = s.split(/(?<=[.!?])\s+/);
          const kept = parts.filter((p) => !isNote(p));
          let out = kept.join(" ").replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
          return out;
        };

        // Pass 1: locate the KEPT occurrence — prefer priority_actions.
        let keptRef: { container: any; key: string | number } | null = null;
        const actions = Array.isArray(report?.priority_actions) ? report.priority_actions : [];
        for (let i = 0; i < actions.length; i++) {
          const a = actions[i];
          if (a && typeof a === "object") {
            for (const k of Object.keys(a)) {
              if (typeof a[k] === "string" && isNote(a[k])) {
                keptRef = { container: a, key: k };
                break;
              }
            }
          }
          if (keptRef) break;
        }
        // Fallback: first occurrence anywhere.
        if (!keptRef) {
          const findFirst = (node: any): boolean => {
            if (!node) return false;
            if (Array.isArray(node)) { for (const v of node) if (findFirst(v)) return true; return false; }
            if (typeof node !== "object") return false;
            for (const k of Object.keys(node)) {
              const v = node[k];
              if (typeof v === "string" && isNote(v)) { keptRef = { container: node, key: k }; return true; }
              if (findFirst(v)) return true;
            }
            return false;
          };
          findFirst(report);
        }

        let pointerReplaced = 0;
        let actionDeleted = 0;
        let actionExcised = 0;

        // Pass 2a: walk priority_actions[] for duplicates — action-level logic.
        if (Array.isArray(report?.priority_actions)) {
          for (let i = report.priority_actions.length - 1; i >= 0; i--) {
            const a = report.priority_actions[i];
            if (!a || typeof a !== "object") continue;
            // Never touch the kept entry's action field.
            if (keptRef && keptRef.container === a) continue;
            // Only the .action field is a substantive directive; other fields
            // are references handled by pass 2b below.
            if (typeof a.action === "string" && isNote(a.action)) {
              const stripped = stripNoteText(a.action).replace(/\s+/g, "");
              if (stripped.length < 40) {
                report.priority_actions.splice(i, 1);
                actionDeleted += 1;
                console.warn(`[RISK] QB12-4(a) v3: deleted priority_actions[${i}] (pointer-only after note excision)`);
              } else {
                a.action = stripNoteText(a.action);
                actionExcised += 1;
                console.warn(`[RISK] QB12-4(a) v3: excised note from priority_actions[${i}].action`);
              }
            }
          }
        }

        // Pass 2b: walk everything else — reference fields get the short pointer.
        const walk = (node: any, path: string) => {
          if (!node) return;
          if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) walk(node[i], `${path}[${i}]`); return; }
          if (typeof node !== "object") return;
          for (const key of Object.keys(node)) {
            const val = node[key];
            if (typeof val === "string") {
              if (isNote(val)) {
                // Skip the kept occurrence.
                if (keptRef && keptRef.container === node && keptRef.key === key) continue;
                // Skip priority_actions[].action — already handled in pass 2a.
                if (path.startsWith(".priority_actions") && key === "action") continue;
                node[key] = POINTER;
                pointerReplaced += 1;
                console.warn(`[RISK] QB12-4(a) v3: replaced duplicate note at ${path}.${key} with pointer`);
              }
            } else {
              walk(val, `${path}.${key}`);
            }
          }
        };
        walk(report, "");

        if (pointerReplaced + actionDeleted + actionExcised > 0) {
          console.warn(`[RISK] QB12-4(a) v3 summary: pointer=${pointerReplaced} action_deleted=${actionDeleted} action_excised=${actionExcised}`);
        }
      } catch (e) {
        console.error("[RISK] QB12-4(a) v3 dedupe errored:", e);
      }
      return report;
    }
    report_data = dedupeExceptionCitationNote(report_data);

    // QB12-4(b) v2 (Doc V Step 3): [TO COMPLETE ...] placeholders are fill-in slots.
    // Surgical excision: remove ONLY the exception-citation note text (and any
    // resulting doubled whitespace/punctuation); keep the remaining prose so the
    // controller retains statutory context. Length cap becomes a fallback: if the
    // placeholder still exceeds 400 chars after excision, truncate at the end of
    // the first sentence (not at the bracket clause), reappending "]" if the
    // closing bracket was lost. Structurally non-fatal.
    function truncateToCompletePlaceholders(report: any): any {
      try {
        let excised = 0;
        let sentenceTruncated = 0;
        const PLACEHOLDER = /\[\s*TO\s+COMPLETE[^\]]*\]/i;
        const isNote = (s: string) => {
          if (typeof s !== "string") return false;
          const n = s.replace(/\s+/g, " ").toLowerCase();
          return n.includes("1798.145") && n.includes("under which");
        };
        const stripNoteText = (s: string): string => {
          const parts = s.split(/(?<=[.!?])\s+/);
          const kept = parts.filter((p) => !isNote(p));
          return kept.join(" ").replace(/\s{2,}/g, " ").replace(/\s+([,.;:])/g, "$1").trim();
        };
        const walk = (node: any, path: string) => {
          if (!node) return;
          if (Array.isArray(node)) { for (let i = 0; i < node.length; i++) walk(node[i], `${path}[${i}]`); return; }
          if (typeof node !== "object") return;
          for (const key of Object.keys(node)) {
            const val = node[key];
            if (typeof val === "string") {
              if (!PLACEHOLDER.test(val)) continue;
              let out = val;
              // 3a: excise note text only, keep the rest.
              if (isNote(out)) {
                const stripped = stripNoteText(out);
                if (stripped !== out) {
                  out = stripped;
                  excised += 1;
                  console.warn(`[RISK] QB12-4(b) v2: excised note from ${path}.${key}`);
                }
              }
              // 3b: length fallback — truncate at first sentence end if still >400.
              if (out.length > 400) {
                const sentEnd = out.search(/(?<=[.!?])\s+/);
                let cut = sentEnd > 0 ? out.slice(0, sentEnd + 1).trim() : out.slice(0, 400).trim();
                // Reappend ] if the closing bracket was lost.
                if (cut.includes("[") && !cut.includes("]")) cut = cut + "]";
                if (cut !== out) {
                  out = cut;
                  sentenceTruncated += 1;
                  console.warn(`[RISK] QB12-4(b) v2: sentence-truncated ${path}.${key} (>400 chars post-excision)`);
                }
              }
              if (out !== val) node[key] = out;
            } else {
              walk(val, `${path}.${key}`);
            }
          }
        };
        walk(report, "");
        if (excised + sentenceTruncated > 0) {
          console.warn(`[RISK] QB12-4(b) v2 summary: excised=${excised} sentence_truncated=${sentenceTruncated}`);
        }
      } catch (e) {
        console.error("[RISK] QB12-4(b) v2 placeholder rework errored:", e);
      }
      return report;
    }
    report_data = truncateToCompletePlaceholders(report_data);


    // QB13-3(a): strip instruction-voice "Begin now:" from every report field EXCEPT
    // entries of priority_actions (where the imperative belongs). Same try/catch discipline
    // as QB11-5(b)/QB12-4(a).
    function stripBeginNowNonAction(report: any): any {
      try {
        if (!report || typeof report !== "object") return report;
        const paActions = new Set<any>();
        const pa = (report as any).priority_actions;
        if (Array.isArray(pa)) for (const e of pa) paActions.add(e);
        let stripped = 0;
        const walk = (node: any) => {
          if (!node || typeof node !== "object") return;
          if (Array.isArray(node)) { for (const v of node) walk(v); return; }
          if (paActions.has(node)) return; // skip priority_actions entries entirely
          for (const key of Object.keys(node)) {
            const val = (node as any)[key];
            if (typeof val === "string") {
              const next = val.split("Begin now: ").join("").split("Begin now:").join("");
              if (next !== val) { (node as any)[key] = next; stripped += 1; }
            } else if (val && typeof val === "object") {
              walk(val);
            }
          }
        };
        walk(report);
        if (stripped > 0) console.warn("[RISK] QB13-3(a): stripped instruction-voice 'Begin now:' from a non-action field");
      } catch (e) {
        console.error("[RISK] QB13-3(a) strip errored:", e);
      }
      return report;
    }
    report_data = stripBeginNowNonAction(report_data);



    (report_data as any)._meta = { ...((report_data as any)._meta ?? {}), prompt_version: stampPromptVersion("cppa-risk-assessment") };

    // Stage 1: metering + version retention (written BEFORE status:complete).
    await recordRunMeterAndVersion(supabase, {
      toolType: "cppa_risk_assessment",
      assessmentId: assessment_id,
      userId: (row as any).user_id ?? null,
      intake: ((row as any).intake_data as Record<string, unknown>) ?? {},
      reportData: report_data,
    });

    const completeWrite = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "complete", report_data }, { fn: "run-cppa-risk-assessment", phase: "terminal_complete" });
    if (!completeWrite.ok) {
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "error", report_data: { error: "complete_write_failed", message: completeWrite.message } }, { fn: "run-cppa-risk-assessment", phase: "terminal_fallback" });
    }

    // L2 — observe-only citation lint (never blocks, never mutates output).
    try {
      await observeCitations(
        supabase,
        "run-cppa-risk-assessment",
        assessment_id,
        JSON.stringify(report_data),
        citations ?? [],
      );
    } catch (obsErr) {
      console.error("[citation-observe] non-fatal:", String(obsErr));
    }


  } catch (e) {
    console.error("run-cppa-risk-assessment v4 error:", e);
    try {
      await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "error", report_data: { error: String(e) } }, { fn: "run-cppa-risk-assessment", phase: "terminal_error_catch" });
    } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// HTTP entrypoint (unchanged contract: accepts { assessment_id }).
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  console.log(`[qb9] run-cppa-risk-assessment build active · core=${PROMPT_CORE_VERSION}`);
  console.log("[run-cppa-risk-assessment] qb7 build active");
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const caller = await verifyCaller(req, "user");
  if (!caller.ok) {
    return new Response(JSON.stringify({ error: caller.error ?? "Unauthorized" }), {
      status: caller.status ?? 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let assessment_id: string | undefined;
  try {
    const body = await req.json();
    assessment_id = body?.assessment_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!assessment_id) {
    return new Response(JSON.stringify({ error: "assessment_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ent = await requireEntitlement(caller, "cppa_risk_assessment", { rowId: assessment_id });
  if (!ent.ok) {
    console.log(JSON.stringify({ evt: "entitlement_denied", fn: "run-cppa-risk-assessment", reason: ent.reason }));
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: ent.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const fnRun = await startFunctionRun(supabase, "run-cppa-risk-assessment", {
    archetype: "background",
    trustClass: "user",
    invokedBy: "user",
    metadata: { assessment_id },
  });
  const httpProc = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "processing" }, { fn: "run-cppa-risk-assessment", phase: "pre_generation_http" });
  if (!httpProc.ok) {
    await failFunctionRun(supabase, fnRun, new Error(`lifecycle_write_failed: ${httpProc.message}`), { metadata: { assessment_id, phase: "pre_generation_http" } });
    return new Response(JSON.stringify({ error: "lifecycle_write_failed", message: httpProc.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const wrapped = (async () => {
    try {
      await runPipeline(assessment_id!);
      await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "cppa_assessments", sourceRowId: assessment_id! });
    } catch (e) {
      console.error("pipeline error:", e);
      await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
    }
  })();
  // @ts-ignore Deno Edge Runtime API
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) {
    er.waitUntil(wrapped);
  }


  return new Response(JSON.stringify({ accepted: true, assessment_id }), {
    status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
