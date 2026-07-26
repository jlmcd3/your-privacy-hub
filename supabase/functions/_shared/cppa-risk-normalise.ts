// Shared normalisation for CPPA risk intake.
//
// PURE MOVE (R1e/A2, 2026-07-11): `EMPTY_TRIGGERS`, `EMPTY_EXCEPTION`,
// `EMPTY_EXCEPTIONS`, `shimLegacyIntake`, and `normaliseIntake` were relocated
// verbatim from `run-cppa-risk-assessment/index.ts` so run-quality-batch's
// QC-R1 deterministic checks can feed the IDENTICAL pipeline the generator
// itself runs (normaliseIntake -> computeTestStates). The generator
// re-exports the same symbols so every existing caller is byte-identically
// preserved.
//
// Additionally exposes `resolveIntakeForTestStates`: a helper that mirrors
// the normalisation for BOTH sides of the computeTestStates signature
// (fiveStage + rawIntake), so 5-stage-shaped fixtures (whose flat `q*` keys
// live under `org_context` / `annual_consumer_volume` / `content_detail`)
// resolve to the same M-states as flat/legacy intakes. This closes the
// raw-vs-normalised defect where QC-R1-4 read `intake.q1_revenue` from a
// 5-stage fixture, got NULL, and misclassified as legacy-absent.

import {
  classifyRevenueBand,
  type FiveStageIntake,
  type ExceptionEntry,
} from "./cppa-test-states.ts";
// BAND-REALIGNMENT-T2A (2026-07-26) — wire the V1→V2 resolvers so intake
// entry stamps `_meta.internal.band_v1_to_v2_resolved` on unambiguous
// legacy → V2 mapping, and `_meta.internal.band_legacy_ambiguous` on
// straddling legacy labels. Conservative no-assert behavior is preserved
// on ambiguous inputs (classifier already returns audit_cohort='indeterminate').
import {
  resolveRevenueBand,
  resolveConsumerBand,
  isBandLegacyAmbiguous,
  REVENUE_BANDS_V2,
  CONSUMER_BANDS_V2,
} from "./bands/revenue-consumer.ts";

export interface BandResolution {
  q1_v1_to_v2_resolved: string | null; // e.g. "$50M–$100M -> $50M to $100M"
  q2_v1_to_v2_resolved: string | null;
  q1_legacy_ambiguous: boolean;
  q2_legacy_ambiguous: boolean;
}

function computeBandResolution(raw: any): BandResolution {
  const rawQ1 = typeof raw?.q1_revenue === "string" ? raw.q1_revenue.trim() : "";
  const rawQ2 = typeof raw?.q2_consumers === "string" ? raw.q2_consumers.trim() : "";
  const isV2Rev = (REVENUE_BANDS_V2 as readonly string[]).includes(rawQ1);
  const isV2Con = (CONSUMER_BANDS_V2 as readonly string[]).includes(rawQ2);
  const q1Resolved = !isV2Rev ? resolveRevenueBand(rawQ1) : null;
  const q2Resolved = !isV2Con ? resolveConsumerBand(rawQ2) : null;
  return {
    q1_v1_to_v2_resolved: (!isV2Rev && q1Resolved) ? `${rawQ1} -> ${q1Resolved}` : null,
    q2_v1_to_v2_resolved: (!isV2Con && q2Resolved) ? `${rawQ2} -> ${q2Resolved}` : null,
    q1_legacy_ambiguous: !isV2Rev && isBandLegacyAmbiguous(rawQ1),
    q2_legacy_ambiguous: !isV2Con && isBandLegacyAmbiguous(rawQ2),
  };
}

export const EMPTY_TRIGGERS = {
  sells_or_shares_pi: false,
  targeted_advertising: false,
  profiling_significant_effects: false,
  sensitive_pi_beyond_enumerated: false,
  high_volume_processing: false,
  admt_involved: false,
};

export const EMPTY_EXCEPTION: ExceptionEntry = {
  claimed: false, scope: "", safeguards: "", documented: false, authority_basis: "", retention_period: "",
};

export const EMPTY_EXCEPTIONS: Record<string, ExceptionEntry> = {
  fraud_detection: { ...EMPTY_EXCEPTION },
  security_integrity: { ...EMPTY_EXCEPTION },
  debugging: { ...EMPTY_EXCEPTION },
  transient_use: { ...EMPTY_EXCEPTION },
  internal_research: { ...EMPTY_EXCEPTION },
  employment_context: { ...EMPTY_EXCEPTION },
  legal_compliance: { ...EMPTY_EXCEPTION },
  consumer_request: { ...EMPTY_EXCEPTION },
};

export function shimLegacyIntake(intake: any): FiveStageIntake {
  console.warn(
    "[cppa-risk] legacy flat intake detected (intake.triggers undefined). " +
      "Shimming to minimal five-stage structure. Frontend should be migrated to the five-stage wizard.",
  );

  const triggers = { ...EMPTY_TRIGGERS };
  const q5raw = typeof intake.q5_sell_share === "string" ? intake.q5_sell_share : "";
  const sells = /sell|share|both|^yes/i.test(q5raw) && !/^no/i.test(q5raw);
  if (sells) triggers.sells_or_shares_pi = true;
  // PRODUCT-FIX-2 T1 — declared advertising sharing must set targeted_advertising.
  // Under Cal. Civ. Code § 1798.140(ah) "share" is defined as disclosure for
  // cross-context behavioural advertising; the wizard options "Yes — share for
  // advertising only" and "Both" therefore imply targeted_advertising=true.
  if (/\b(share|both|advertis)/i.test(q5raw) && !/^no/i.test(q5raw)) {
    triggers.targeted_advertising = true;
  }
  if (intake.q15_sensitive_pi === "Yes") triggers.sensitive_pi_beyond_enumerated = true;
  const piCatsForTrig = Array.isArray(intake.q4_pi_categories) ? intake.q4_pi_categories : [];
  if (piCatsForTrig.some((c: string) => /precise geolocation/i.test(String(c)))) triggers.sensitive_pi_beyond_enumerated = true;
  if (typeof intake.q15b_under16_knowledge === "string" && /^yes/i.test(intake.q15b_under16_knowledge)) triggers.sensitive_pi_beyond_enumerated = true;
  if (typeof intake.q5b_profiling_observation === "string" && /yes|both/i.test(intake.q5b_profiling_observation)) triggers.profiling_significant_effects = true;
  if (intake.q18_admt_use === "Yes" || intake.q18_admt_use === "In evaluation") triggers.admt_involved = true;
  if (typeof intake.q18b_admt_training === "string" && /^yes/i.test(intake.q18b_admt_training)) triggers.admt_involved = true;

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

  // FF-1 T5: absent governance booleans must emit null ("not recorded"),
  // NEVER false. Downstream audit (rg: privacy_counsel_engaged / dpo_or_privacy_officer /
  // board_level_oversight / cppa_audit_notification_received) confirms these are read
  // ONLY by the run-cppa-risk-assessment prompt-render block (index.ts L678-682) and
  // the run-quality-batch schema string; NO computed M-test consumes them. Behaviour
  // change is therefore prompt-rendering only.
  const readTriBool = (v: unknown): boolean | null =>
    v === true || v === "Yes" || v === "yes" ? true
      : v === false || v === "No" || v === "no" ? false
      : null;
  const org_context = {
    company_name: String(intake.entity_name || "[FILL IN — business legal name]"),
    sector: String(intake.q3_sector ?? "Not specified"),
    annual_revenue_threshold: "", // DEPRECATED (RC-A A5) — read q1_revenue instead
    privacy_counsel_engaged: readTriBool(intake.privacy_counsel_engaged),
    dpo_or_privacy_officer: readTriBool(intake.dpo_or_privacy_officer),
    board_level_oversight: readTriBool(intake.board_level_oversight),
    existing_privacy_programme: "Not specified",
    cppa_audit_notification_received: readTriBool(intake.cppa_audit_notification_received),
    additional_context: "",
  };

  const exceptionsIntake = (intake.exceptions_intake ?? {}) as Record<string, any>;
  const exceptions = { ...EMPTY_EXCEPTIONS };
  for (const [key, v] of Object.entries(exceptionsIntake)) {
    if (v && (v as any).claimed && key in exceptions) {
      (exceptions as Record<string, ExceptionEntry>)[key] = {
        claimed: true,
        scope: String((v as any).scope ?? ""),
        safeguards: String((v as any).safeguards ?? ""),
        documented: Boolean((v as any).scope || (v as any).safeguards),
        authority_basis: String((v as any).authority_basis ?? ""),
        retention_period: String((v as any).retention_period ?? ""),
      };
    }
  }

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
    q15c_spi_volume: String(intake.q15c_spi_volume ?? ""),
    q5c_share_revenue_50pct: String(intake.q5c_share_revenue_50pct ?? ""),
    revenue_band: classifyRevenueBand(intake.q1_revenue).label,
    revenue_band_key: classifyRevenueBand(intake.q1_revenue).key,
    revenue_audit_cohort: classifyRevenueBand(intake.q1_revenue).audit_cohort,
  };

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

export function normaliseIntake(intake: any): { intake: FiveStageIntake; wasLegacyShimmed: boolean } {
  if (intake?.triggers === undefined) {
    return { intake: shimLegacyIntake(intake ?? {}), wasLegacyShimmed: true };
  }
  const cd = { ...(intake.content_detail ?? {}) } as Record<string, any>;
  if (intake.q15c_spi_volume !== undefined) cd.q15c_spi_volume = String(intake.q15c_spi_volume ?? "");
  if (intake.q5c_share_revenue_50pct !== undefined) cd.q5c_share_revenue_50pct = String(intake.q5c_share_revenue_50pct ?? "");
  const band = classifyRevenueBand(intake.q1_revenue); // RC-A A5: single-truth read from q1_revenue only
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
// R1e (2026-07-11) — resolveIntakeForTestStates
//
// Closes the raw-vs-normalised defect: `computeTestStates` reads flat `q*_`
// keys directly off the second (rawIntake) argument. On 5-stage-shaped
// fixtures those keys live under `org_context` / `annual_consumer_volume` /
// `content_detail` and were absent from the raw view. Here we synthesise a
// `rawForStates` view with the same fallback resolution `normaliseIntake`
// itself uses for revenue band, plus the parallel fallbacks for the SPI
// volume / 50%-share / consumer-volume / sensitive-PI flags — so both fixture
// shapes yield the identical M-state set that the generator's normalised
// prompt is grounded in.
//
// Behaviour on flat/legacy intakes (which already carry the flat keys) is
// unchanged: the nullish-coalescing keeps the original value when present.
// ---------------------------------------------------------------------------
export function resolveIntakeForTestStates(rawIntake: any): {
  fiveStage: FiveStageIntake;
  rawForStates: Record<string, any>;
  wasLegacyShimmed: boolean;
} {
  const raw = rawIntake ?? {};
  const { intake: fiveStage, wasLegacyShimmed } = normaliseIntake(raw);
  const cd = (fiveStage.content_detail ?? {}) as Record<string, any>;
  const org = (fiveStage.org_context ?? {}) as Record<string, any>;
  const exIntake = (raw.exceptions_intake ?? {}) as Record<string, any>;
  // Rebuild an exceptions_intake shim from the fiveStage.exceptions map if the
  // raw view did not carry one (5-stage fixtures store claims under
  // `exceptions.<key>.claimed`, not `exceptions_intake.<key>.claimed`).
  const exceptions_intake: Record<string, any> = { ...exIntake };
  for (const [k, v] of Object.entries(fiveStage.exceptions ?? {})) {
    if (v && (v as any).claimed && !exceptions_intake[k]) {
      exceptions_intake[k] = { ...(v as any) };
    }
  }
  const rawForStates: Record<string, any> = {
    ...raw,
    q1_revenue: raw.q1_revenue, // RC-A A5: no fallback to org_context.annual_revenue_threshold
    q2_consumers: raw.q2_consumers ?? fiveStage.annual_consumer_volume,
    q5_sell_share: raw.q5_sell_share
      ?? (fiveStage.triggers?.sells_or_shares_pi ? "Yes" : (raw.q5_sell_share === undefined && "triggers" in raw ? "No" : raw.q5_sell_share)),
    q5c_share_revenue_50pct: raw.q5c_share_revenue_50pct ?? cd.q5c_share_revenue_50pct,
    q15_sensitive_pi: raw.q15_sensitive_pi
      ?? (fiveStage.triggers?.sensitive_pi_beyond_enumerated ? "Yes" : (raw.q15_sensitive_pi === undefined && "triggers" in raw ? "No" : raw.q15_sensitive_pi)),
    q15c_spi_volume: raw.q15c_spi_volume ?? cd.q15c_spi_volume,
    q15b_under16_knowledge: raw.q15b_under16_knowledge ?? cd.under16_actual_knowledge,
    q5b_profiling_observation: raw.q5b_profiling_observation ?? cd.profiling_observation_trigger,
    q18_admt_use: raw.q18_admt_use ?? (fiveStage.triggers?.admt_involved ? "Yes" : raw.q18_admt_use),
    q18b_admt_training: raw.q18b_admt_training ?? cd.admt_training_trigger,
    exceptions_intake,
  };
  return { fiveStage, rawForStates, wasLegacyShimmed };
}
