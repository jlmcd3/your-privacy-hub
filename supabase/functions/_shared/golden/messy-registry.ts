// ITEM 331 — MESSY fixture registry (CONTENT).
//
// ─── WHAT "MESSY" MEANS HERE (CEO definition, 2026-08-01) ────────────────────
// Fields that ARE answered are decent/adequate quality — not garbled, not
// nonsensical, not "vague language dropped into every field". What makes a
// messy record messy is COVERAGE: optional fields, and some conditionally
// required companions, are simply absent. That is what real submitted records
// look like, and it is the input the MANDATORY DEGRADATION LAW exists to be
// measured against — a thin record must produce an honest
// `record_insufficient` / `information_needed` surface rather than confident
// prose invented over a hole.
//
// ─── HOW THESE ARE BUILT ────────────────────────────────────────────────────
// Two construction routes, both explicit:
//
//   (1) THINNED — take a named perfect fixture and delete a named list of
//       optional/conditional paths. Every field that survives keeps its
//       perfect-set value, so answered content is adequate by construction and
//       the ONLY variable under measurement is coverage. The omission list is
//       written out per tool below and is the audit surface: to see what a
//       messy run is testing, read the list.
//
//   (2) AUTHORED — three scenarios that no perfect fixture covers and that
//       cannot be produced by deletion, because they need different facts:
//         * ir-playbook mixed EU + UK incident            (Item 328)
//         * registration both-representatives-required     (Item 329)
//         * lia UK-scoped Article 22A–22D analysis         (Item 326)
//       Each of the three fixes shipped with a builder-level regression test
//       but no fixture; ir-playbook-mixed-jurisdiction.test.ts says so in its
//       own header. These close that.
//
// ─── CONTRACT INVARIANT ─────────────────────────────────────────────────────
// `required: "always"` fields are NEVER dropped. validateIntake treats an
// empty required-always field as a violation and run-quality-batch aborts the
// whole batch at second zero on the first one. A messy fixture that cannot
// start measures nothing. Incompleteness is expressed exclusively through
// optional and conditional fields, which is also precisely where a real
// submitted record thins out. src/registry/__tests__/fixture-contract-matrix.test.ts
// enforces this across the full tool × variant matrix.

import type { GoldenAssertion, GoldenCase } from "./types.ts";
// NOTE: the per-tool modules are imported DIRECTLY rather than via
// ./registry.ts. registry.ts imports this file, so going back through it
// would form an import cycle whose evaluation order puts GOLDEN_BY_TOOL in
// the temporal dead zone at the moment the thinned() calls below run.
import { DPIA_GOLDEN } from "./dpia.ts";
import { CPPA_CYBER_GOLDEN } from "./cppa-cyber.ts";
import { DPA_GOLDEN } from "./dpa.ts";
import { IR_PLAYBOOK_GOLDEN } from "./ir-playbook.ts";
import { REGISTRATION_GOLDEN } from "./registration.ts";
import { CPPA_ADMT_GOLDEN } from "./cppa-admt.ts";
import { GOVERNANCE_GOLDEN } from "./governance.ts";
import { LIA_GOLDEN } from "./lia.ts";
import { CPPA_RISK_GOLDEN } from "./cppa-risk.ts";
import { BIOMETRIC_GOLDEN_EXTRA } from "./biometric-extra.ts";

const PERFECT_BY_TOOL: Record<string, GoldenCase[]> = {
  "dpia":              DPIA_GOLDEN,
  "cppa-cyber":        CPPA_CYBER_GOLDEN,
  "dpa-generator":     DPA_GOLDEN,
  "ir-playbook":       IR_PLAYBOOK_GOLDEN,
  "registration":      REGISTRATION_GOLDEN,
  "cppa-admt":         CPPA_ADMT_GOLDEN,
  "governance":        GOVERNANCE_GOLDEN,
  "lia":               LIA_GOLDEN,
  "cppa-risk":         CPPA_RISK_GOLDEN,
  "biometric-checker": BIOMETRIC_GOLDEN_EXTRA,
};

// ─── thinning helpers ───────────────────────────────────────────────────────

type Rec = Record<string, unknown>;

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/**
 * Delete a dotted path from an intake. Supports one terminal "[]" hop, e.g.
 * "a2_necessity_set[].justification" — the leaf is removed from every element
 * of the array. Deleting an absent path is a no-op, so omission lists stay
 * stable when a contract adds or renames an optional field.
 */
function drop(root: Rec, path: string): void {
  const arrIdx = path.indexOf("[].");
  if (arrIdx !== -1) {
    const arrPath = path.slice(0, arrIdx);
    const leaf = path.slice(arrIdx + 3);
    const holder = readParent(root, arrPath);
    if (!holder) return;
    const val = (holder.parent as Rec)[holder.key];
    if (Array.isArray(val)) {
      for (const el of val) {
        if (el && typeof el === "object") drop(el as Rec, leaf);
      }
    }
    return;
  }
  const holder = readParent(root, path);
  if (holder) delete (holder.parent as Rec)[holder.key];
}

function readParent(root: Rec, path: string): { parent: Rec; key: string } | null {
  const parts = path.split(".");
  let node: unknown = root;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!node || typeof node !== "object") return null;
    node = (node as Rec)[parts[i]];
  }
  if (!node || typeof node !== "object") return null;
  return { parent: node as Rec, key: parts[parts.length - 1] };
}

/** Locate a perfect fixture by id, falling back to the first in the set. */
function perfect(tool: string, id: string): GoldenCase {
  const set = PERFECT_BY_TOOL[tool] ?? [];
  if (!set.length) throw new Error(`messy-registry: no perfect fixtures for "${tool}"`);
  return set.find((c) => c.id === id) ?? set[0];
}

/**
 * DEGRADATION assertions. A messy record is graded on honesty about its own
 * holes, not on richness. These are deliberately permissive on wording and
 * strict on the one thing that matters: the output must name what it does not
 * know instead of filling the hole.
 */
const DEGRADATION_GUARDS: GoldenAssertion[] = [
  {
    kind: "must_include",
    pattern: "record_insufficient|information_needed|does not (state|record)|not stated (in|on) the record",
    flags: "i",
    label: "thin record surfaces an explicit insufficiency, not invented content",
  },
];

function thinned(
  tool: string,
  opts: {
    id: string;
    from: string;
    omit: string[];
    override?: Rec;
    assertions?: GoldenAssertion[];
  },
): GoldenCase {
  const src = perfect(tool, opts.from);
  const intake = clone(src.intake) as Rec;
  for (const p of opts.omit) drop(intake, p);
  Object.assign(intake, opts.override ?? {});
  return {
    id: opts.id,
    tool,
    set: "adversarial",
    intake,
    assertions: [...DEGRADATION_GUARDS, ...(opts.assertions ?? [])],
  };
}

// ─── THINNED fixtures, one per tool ─────────────────────────────────────────

const MESSY_CPPA_ADMT = thinned("cppa-admt", {
  id: "admt-messy-thin-notice-and-appeal-record",
  from: "admt-hr-perfect-record",
  // Notice element wording, the appeal record and the vendor-diligence tail
  // are all absent — the pattern a real HR-screening submitter produces when
  // the ADMT was procured rather than built in-house.
  omit: [
    "notice_purpose_text",
    "notice_element_text",
    "opt_out_appeal_process",
    "opt_out_fairness_doc",
    "opt_out_15_day_process",
    "opt_out_service_provider_notice",
    "access_trade_secret_policy",
    "third_party_admt",
    "admt_system_count",
    "affected_population_band",
    "role_roster",
    "admt_detail.appeal_reviewer_role",
    "admt_detail.appeal_trained",
    "admt_detail.appeal_authority_overturn",
    "admt_detail.appeal_step_count",
    "admt_detail.sole_use_attestation",
    "admt_detail.nondiscrimination_testing",
    "admt_detail.vendor_docs",
    "admt_detail.vendor_makes_available",
  ],
});

const MESSY_CPPA_RISK = thinned("cppa-risk", {
  id: "risk-messy-thin-safeguards-and-admt-tail",
  from: "risk-saas-clean-tuning",
  // The §7152(a)(6) safeguards table, the ADMT detail tail and the
  // per-element necessity justifications are absent. All 52 required-always
  // fields survive, so the start-gate passes and the run measures what the
  // engine does with a record that is complete on its face but hollow
  // underneath.
  omit: [
    "secondary_activities",
    "q5c_share_revenue_50pct",
    "sensitive_location_basis",
    "public_privacy_policy_url",
    "q15c_spi_volume",
    "q16_sensitive_limit",
    "q17_sensitive_basis",
    "q19_admt_description",
    "q20_admt_opt_out",
    "i2_retention_detail",
    "i5_admt_logic",
    "i5_admt_training_source",
    "i5_admt_fairness_testing",
    "i5_admt_human_review",
    "i7_external_consultees",
    "i8_contact_phone",
    "i9_existing_dpia_summary",
    "exceptions_intake",
    "impact_intake",
    "a2_necessity_set[].justification",
    "a6_safeguards",
    "a9_approval_date",
  ],
});

const MESSY_CPPA_CYBER = thinned("cppa-cyber", {
  id: "cyber-messy-controls-without-evidence",
  from: "cyber-perfect-record",
  // Maturity ratings survive; the evidence and notes that would substantiate
  // them do not, and neither does the audit-scope record. This is the exact
  // shape that tempts a generator to narrate an audit posture it cannot see.
  omit: [
    "profile.in_scope_frameworks",
    "profile.audit_scope_rationale",
    "profile.auditor_engagement_status",
    "profile.prior_audit_scope",
    "controls[].notes",
    "controls[].evidence",
  ],
});

const MESSY_GOVERNANCE = thinned("governance", {
  id: "gov-messy-thin-transfer-and-dpo-record",
  from: "gov-perfect-record",
  omit: [
    "tools",
    "special_categories_list",
    "privacy_notice_coverage",
    "dpo_status",
    "dpa_status",
    "transfer_status",
    "transfer_mechanism",
    "dpa_art28_verified",
    "technical_controls_list",
    "dsr_rights_tested",
    "dpia_ai_coverage",
    "training_ai_coverage",
    "additional_context",
    "measures_review_cadence",
    "measures_last_review_date",
    "processing_context",
    "processing_purposes",
    // GOVERNANCE UPGRADE — remediation defaults absent, so the messy variant
    // exercises honest degradation (record_insufficient remediation record)
    // instead of an invented plan.
    "remediation_default_owner",
    "remediation_default_target_date",
    "remediation_default_priority",
    "remediation_default_validation_method",
  ],
});

const MESSY_DPIA = thinned("dpia", {
  id: "dpia-messy-thin-consultation-and-safeguards",
  from: "dpia-perfect-record",
  omit: [
    "third_party_processors",
    "existing_safeguards",
    "article_9_condition",
    "dpo_info",
    "dpo_advice",
    "processor_obligations",
    "dpia_team",
    "reference_materials",
    "dpia_scope_note",
    "publication_intent",
    "secondary_uses",
    "supporting_assets",
    "codes_of_conduct",
    "data_quality_measures",
    "dp_by_design_measures",
    "data_subjects_views_sought",
    "data_subjects_views",
    "alternatives_considered",
    "transfer_flows",
    "estimated_end_date",
  ],
});

const MESSY_LIA_THIN = thinned("lia", {
  id: "lia-messy-thin-balancing-record",
  from: "lia-uk-analytics-tuning",
  omit: [
    "purpose_details.interest_statement",
    "necessity_details.why_consent_not_used",
    "necessity_details.data_minimised",
    "necessity_details.pseudonymisation_options",
    "balancing_details.reasonable_expectation_detail",
    "balancing_details.collection_context",
    "balancing_details.vulnerable_subjects",
    "balancing_details.children_data_subjects",
    "balancing_details.potential_harm_detail",
    "balancing_details.safeguards",
    "balancing_details.additional_mitigations",
    "balancing_details.special_category_data",
    "balancing_details.statutory_restrictions",
    "balancing_details.employment_safeguards",
    "balancing_details.additional_context",
    // UPGRADE-4 — keep the messy variant thin against the new deliverables so
    // it continues to exercise honest degradation rather than the analysed path.
    "purpose_details.specific_benefit",
    "purpose_details.beneficiary",
    "necessity_details.alternatives_rationale",
    "balancing_details.relationship_category",
    "balancing_details.scale_approx",
    "balancing_details.frequency",
    "balancing_details.duration",
    "balancing_details.potential_harms",
    "balancing_details.opt_out_available",
    "attestation",
  ],
});

const MESSY_DPA = thinned("dpa-generator", {
  id: "dpa-messy-subprocessors-asserted-not-listed",
  from: "dpa-eu-c2p-tuning",
  // hasSubProcessors stays true while subProcessorList is gone: a genuinely
  // incomplete conditional companion rather than a blanket blanking.
  omit: ["subProcessorList", "includeTransferClause", "transferMechanism", "documentType"],
});

const MESSY_IR_THIN = thinned("ir-playbook", {
  id: "ir-messy-thin-forensic-record",
  from: "ir-ransomware-tuning",
  omit: [
    "processorName",
    "encryptionStatus",
    "encryptionKeyStatus",
    "affectedRecordCount",
    "affectedDataSubjectCount",
    "awarenessConfirmed",
  ],
});

const MESSY_BIOMETRIC = thinned("biometric-checker", {
  id: "bio-messy-thin-consent-and-retention-record",
  from: "bio-reg-w1-il-bipa-fingerprint",
  // The BIPA §15(a)/(b) artefacts — the written release, the published
  // retention schedule, the destruction trigger — are exactly what a thin
  // record omits, and exactly what the duty analysis turns on.
  omit: [
    "consent_artifact_type",
    "release_artifact_description",
    "retention_schedule_text",
    "retention_policy_public",
    "destruction_trigger",
    "disclosure_recipients",
    "disclosure_bases",
    "security_measures_description",
    "protection_parity",
    "healthcare_tpo_context",
    "tx_destruction_within_one_year",
    "tx_longer_retention_required_by_law",
    "tx_employer_security_collection",
    "tx_ai_training_use",
    "wa_enrolls_in_database",
    "wa_commercial_purpose",
    "wa_security_purpose_only",
    "wa_mhmda_health_inference",
    "wa_mhmda_privacy_policy_published",
    "wa_mhmda_collection_consent",
    "wa_mhmda_share_consent_separate",
    "wa_mhmda_geofence_health_facility",
  ],
});

const MESSY_REGISTRATION_THIN = thinned("registration", {
  id: "reg-messy-thin-establishment-record",
  from: "reg-uk-single-market-tuning",
  omit: ["eu_lead_member_state", "annual_revenue_usd", "data_subjects_count", "email"],
});

// ─── AUTHORED scenario fixtures ─────────────────────────────────────────────

/**
 * ITEM 328 — mixed EU + UK incident. Ireland AND the United Kingdom are both
 * in scope, so the builder must emit TWO labelled duty sets (Art. 33/34 EU
 * leg citing "supervisory authority"; UK leg citing "the Commissioner"),
 * each carrying the parallel-duty note. Coverage is thin in the way a real
 * hour-two incident record is thin: the forensic counts and the awareness
 * confirmation are not yet established.
 */
const MESSY_IR_MIXED: GoldenCase = {
  id: "ir-messy-mixed-eu-uk-parallel-duties",
  tool: "ir-playbook",
  set: "adversarial",
  intake: {
    organizationName: "Northbank Mutual Insurance Society",
    discoveryDateTime: new Date(Date.now() - 1 * 86400_000).toISOString(),
    cause: "Ransomware or malware",
    dataTypes: ["Health / medical records", "Names and contact details"],
    affectedCount: "10,000–100,000",
    jurisdictions: ["Ireland", "United Kingdom"],
    contained: "No",
    organisationType: "Financial institution",
    processorInvolved: true,
    // processorName, encryption status, record counts and awarenessConfirmed
    // are all absent — hour-two reality, and the 72-hour clock still runs.
  },
  assertions: [
    ...DEGRADATION_GUARDS,
    { kind: "must_include", pattern: "the Commissioner", label: "UK leg names the Commissioner" },
    { kind: "must_include", pattern: "supervisory authority", flags: "i", label: "EU leg names the supervisory authority" },
    { kind: "must_include", pattern: "Article\\s*33", flags: "i", label: "Art. 33 determination present" },
    { kind: "must_include", pattern: "44A", label: "UK Chapter V rail cites Art. 44A" },
  ],
};

/**
 * ITEM 329 — both representatives required. No establishment in either
 * territory, goods offered into both an EU Member State and the United
 * Kingdom, and broker activity that removes the Art. 27(2) occasional-
 * processing exemption. Both legs must reach "engaged", which is the only
 * condition that sets both_representatives_required and emits the combined
 * callout. No existing fixture puts an organisation outside BOTH territories
 * while selling into both.
 */
const MESSY_REGISTRATION_BOTH_REPS: GoldenCase = {
  id: "reg-messy-both-representatives-required",
  tool: "registration",
  set: "adversarial",
  intake: {
    organization_name: "Halcyon Audience Exchange, Inc.",
    organization_country: "US",
    organization_size: "medium" as const,
    employee_count: 140,
    industry: "Advertising / Marketing",
    role: "controller" as const,
    processes_personal_data: true,
    has_uk_establishment: false,
    has_eu_establishment: false,
    markets_served: ["DE", "IE", "UK"],
    acts_as_data_broker: true,
    large_scale_monitoring: true,
    is_public_authority: false,
    ai_high_risk: false,
    ai_general_purpose_provider: false,
    // eu_lead_member_state deliberately absent: no Union establishment means
    // no one-stop shop, and a record that guessed a lead authority here would
    // be wrong. Revenue, subject counts and contact email are also unstated.
  },
  assertions: [
    ...DEGRADATION_GUARDS,
    { kind: "must_include", pattern: "TWO separate representatives", label: "combined callout emitted" },
    { kind: "must_include", pattern: "Art\\.?\\s*27", flags: "i", label: "Art. 27 cited" },
    { kind: "must_include", pattern: "United Kingdom", label: "UK leg present" },
  ],
};

/**
 * ITEM 326 — UK-scoped Article 22-family analysis. UK ONLY (no EU leg), and
 * the processing described is a solely automated significant decision, so the
 * builder must run the UK 22A–22D branch: permitted-by-default with the
 * Art. 22C safeguards, NOT the EU prohibition-by-default rule.
 *
 * SCOPE LIMIT (Item 326, preserved): Annex 1 is not in the corpus. This
 * fixture asserts that the output does not purport to evaluate Annex 1's
 * conditions. Coverage is thin exactly where the safeguards record would be.
 */
const MESSY_LIA_UK_ART22: GoldenCase = {
  id: "lia-messy-uk-art22-solely-automated",
  tool: "lia",
  set: "adversarial",
  intake: {
    organization_name: "Cadence Lending UK Ltd",
    subject_anchor: "Consumer loan applicants",
    processing_description:
      "Applications for unsecured consumer credit are scored by an automated model and the accept/decline outcome is issued without a caseworker reviewing the individual file.",
    data_categories: ["Financial data", "Identity data", "Device/technical data"],
    relationship_type: "Prospective customer",
    jurisdictions: ["United Kingdom (UK GDPR)"],
    stated_purpose: "Decide consumer credit applications consistently and at volume.",
    alternatives_considered:
      "Manual underwriting of every application was considered and rejected on capacity grounds at current application volumes.",
    purpose_details: {
      interest_holder: "Cadence Lending UK Ltd",
      interest_type: "Commercial — lending decisions",
    },
    necessity_details: {
      alternatives: "Manual underwriting at full volume is not deliverable within current staffing.",
    },
    balancing_details: {
      reasonable_expectation: "Yes",
      potential_harm: "Severe",
      opt_out_mechanism:
        "Declined applicants may request a review by contacting the lending team.",
      // Absent: safeguards[], additional_mitigations, vulnerable_subjects,
      // potential_harm_detail. The Art. 22C safeguards record — information
      // about the decision, representations, human intervention, contest —
      // is precisely what is NOT here, and the analysis must say so rather
      // than assume the safeguards exist.
    },
    stage: "submitted",
    preview_assessment_id: "messy-preview-id-uk-art22",
  },
  assertions: [
    ...DEGRADATION_GUARDS,
    { kind: "must_include", pattern: "22A|22C", label: "UK Art. 22-family provisions cited" },
    // ANNEX 1 SCOPE LIMIT (Item 326). Annex 1 is NOT in the corpus. Naming it
    // as unevaluated is required; asserting that its conditions ARE or ARE NOT
    // satisfied is the failure this pins.
    { kind: "must_not_include",
      // The builder's reserved note legitimately says "whether any Annex 1
      // condition is met is reserved" — that is the correct posture. What is
      // banned is an affirmative or negative VERDICT on it.
      pattern: "(satisfies|meets|fails)\\s+(the\\s+|an?\\s+)?Annex\\s*1",
      flags: "i",
      label: "ANNEX 1 SCOPE LIMIT — no verdict on Annex 1 conditions" },
    { kind: "must_include", pattern: "outside this tool's current corpus", label: "Annex 1 reserved note present" },
    { kind: "must_not_include", pattern: "prohibit(ed|ion) by default", flags: "i",
      label: "EU prohibition default not carried into the UK leg" },
  ],
};

// ─── the registry ───────────────────────────────────────────────────────────

export const MESSY_BY_TOOL: Record<string, GoldenCase[]> = {
  "cppa-admt":         [MESSY_CPPA_ADMT],
  "cppa-risk":         [MESSY_CPPA_RISK],
  "cppa-cyber":        [MESSY_CPPA_CYBER],
  "governance":        [MESSY_GOVERNANCE],
  "dpia":              [MESSY_DPIA],
  "lia":               [MESSY_LIA_THIN, MESSY_LIA_UK_ART22],
  "dpa-generator":     [MESSY_DPA],
  "ir-playbook":       [MESSY_IR_THIN, MESSY_IR_MIXED],
  "biometric-checker": [MESSY_BIOMETRIC],
  "registration":      [MESSY_REGISTRATION_THIN, MESSY_REGISTRATION_BOTH_REPS],
};

/** Messy intake payloads for pinning, or [] when none are authored yet. */
export function messyIntakes(tool: string): unknown[] {
  return (MESSY_BY_TOOL[tool] ?? []).map((c) => c.intake);
}

/** Tools that currently ship at least one messy fixture. */
export function toolsWithMessyFixtures(): string[] {
  return Object.keys(MESSY_BY_TOOL).filter((t) => (MESSY_BY_TOOL[t] ?? []).length > 0);
}
