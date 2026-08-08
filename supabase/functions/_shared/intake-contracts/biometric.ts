// ITEM 408 — BIOMETRIC INTAKE CONTRACT (P7 leg 0).
//
// The canonical, SHARED intake contract for the Biometric Privacy Compliance
// Assessment. Every other product already had one under
// `_shared/intake-contracts/`; the biometric tool only had a function-local
// copy under `run-quality-batch/_local/intake-contracts/biometric-checker.ts`,
// which the record-complete gate, the coach's asked-keys semantics and the
// coverage matrix cannot reach. That local module is now a thin re-export of
// this file, so there is exactly one source of truth.
//
// THE FORM IS THE SOURCE OF TRUTH.
// Field set mirrored from `src/pages/BiometricChecker.tsx`:
//   - form state object            L88-L136
//   - submission payload           L172  `{ ...form, user_id, client_id }`
//     (so every contract key below is a top-level key of the invoke body)
//   - inline option lists          L47-L50  (TYPES / ORG / PURPOSE / JURS)
//   - shared option registry       src/registry/biometric-intake-options.ts
//     (BIO_TRI / BIO_NOTICE / BIO_CONSENT_ARTIFACT / BIO_DISCLOSURE_BASES)
// Nothing is invented: every key, every option value and every trigger is
// traceable to a line of the form.
//
// SKIP LOGIC (item380 r5b). The form computes three predicates at L246-L249:
//     showTexas      = jurisdictions includes a value containing "Texas"
//     showWashington = jurisdictions includes a value containing "Washington"
//     showPractices  = includes "Illinois" || showTexas || showWashington
// Because the jurisdiction enum has exactly one member containing each of
// those substrings ("Texas, USA (CUBI)", "Washington state, USA",
// "Illinois, USA (BIPA)"), the substring predicates are expressible verbatim
// as value-equals triggers over `jurisdictions[]`.
//
// ASK-ELIGIBILITY. `ASK_ELIGIBLE_CRITICAL_FIELDS` in
// `_shared/insufficient-info-guard.ts` carries no `biometric_checker` entry,
// so no field here is marked `askEligible`. Adding one without a matching
// registry entry would claim a synthesis path the guard does not run.

import type { IntakeContract } from "./types.ts";

// ── Inline option lists — VERBATIM from BiometricChecker.tsx L47-L50 ──────

/** BiometricChecker.tsx L47 — `const TYPES = [...]`. */
const TYPES = [
  "Facial geometry / facial recognition",
  "Fingerprint / palm print",
  "Voiceprint / speaker recognition",
  "Iris or retina scan",
  "Gait analysis",
  "Vein pattern recognition",
  "Other biometric identifier",
] as const;

/** BiometricChecker.tsx L48 — `const ORG = [...]`. */
const ORG = [
  "Employer (employee biometrics)",
  "Consumer app or platform",
  "Healthcare provider",
  "Financial institution / fintech",
  "Security / access control provider",
  "Research organisation",
  "Other",
] as const;

/** BiometricChecker.tsx L49 — `const PURPOSE = [...]`. */
const PURPOSE = [
  "Time & attendance / workforce management",
  "Physical access control",
  "Customer authentication",
  "Surveillance / monitoring",
  "Research or product development",
  "Other",
] as const;

/** BiometricChecker.tsx L50 — `const JURS = [...]`. */
const JURS = [
  "EU / EEA (GDPR)",
  "United Kingdom (UK GDPR)",
  "Illinois, USA (BIPA)",
  "Texas, USA (CUBI)",
  "Washington state, USA",
  "California, USA (CCPA/CPRA)",
  "Colorado, USA (CPA)",
  "New York, USA (SHIELD)",
  "Other US state",
  "United States — Federal (FTC)",
  "Canada (PIPEDA / provincial)",
  "Australia (Privacy Act)",
  "Singapore (PDPA)",
] as const;

// ── Registry option lists — VERBATIM from src/registry/biometric-intake-options.ts ──
// Rendered by the form at: Tri() L69 (BIO_TRI), L441 (BIO_NOTICE),
// L450 (BIO_CONSENT_ARTIFACT), L505 (BIO_DISCLOSURE_BASES).

const TRI = ["Yes", "No", "Not known"] as const;

const NOTICE = [
  "Written notice given before collection",
  "Notice given before collection, but not in writing",
  "No notice given before collection",
  "Not known",
] as const;

const CONSENT_ARTIFACT = [
  "Standalone written release signed before collection",
  "Electronic signature captured in the enrolment flow",
  "Release executed as a condition of employment (onboarding paperwork)",
  "Clickwrap or in-product acceptance",
  "Verbal consent only",
  "No consent obtained",
  "Not known",
] as const;

const DISCLOSURE_BASES = [
  "No disclosures are made",
  "Subject consent to the disclosure",
  "Subject consent for identification on disappearance or death",
  "Completes a financial transaction the subject requested or authorised",
  "Required by law",
  "Warrant or subpoena",
  "Necessary to provide a product or service the subject requested",
  "Third party contractually promises no further disclosure",
  "To prepare for or respond to litigation",
] as const;

export {
  TYPES as BIO_TYPES,
  ORG as BIO_ORG,
  PURPOSE as BIO_PURPOSE,
  JURS as BIO_JURS,
  TRI as BIO_TRI,
  NOTICE as BIO_NOTICE,
  CONSENT_ARTIFACT as BIO_CONSENT_ARTIFACT,
  DISCLOSURE_BASES as BIO_DISCLOSURE_BASES,
};

// ── Triggers ──────────────────────────────────────────────────────────────
// `jurisdictions[]` (not `jurisdictions`) so the readPath walker yields the
// ELEMENTS of the multi-select, which is what the form's `.some()` tests.

/** BiometricChecker.tsx L249 — `showPractices` (Illinois || Texas || Washington). */
const PRACTICES_TRIGGER = {
  key: "jurisdictions[]",
  equals: [
    "Illinois, USA (BIPA)",
    "Texas, USA (CUBI)",
    "Washington state, USA",
  ],
} as const;

/** BiometricChecker.tsx L246 — `showTexas`. */
const TEXAS_TRIGGER = {
  key: "jurisdictions[]",
  equals: ["Texas, USA (CUBI)"],
} as const;

/** BiometricChecker.tsx L247 — `showWashington`. */
const WASHINGTON_TRIGGER = {
  key: "jurisdictions[]",
  equals: ["Washington state, USA"],
} as const;

/** BiometricChecker.tsx L392 — `jurisdictions.some(j => j.includes("Other US state"))`. */
const OTHER_STATE_TRIGGER = {
  key: "jurisdictions[]",
  equals: ["Other US state"],
} as const;

export const BIOMETRIC_TRIGGERS = {
  practices: PRACTICES_TRIGGER,
  texas: TEXAS_TRIGGER,
  washington: WASHINGTON_TRIGGER,
  otherState: OTHER_STATE_TRIGGER,
} as const;

export const biometricContract: IntakeContract = {
  tool_type: "biometric_checker",
  table: "biometric_assessments",
  fields: [
    // ── Stage 1 — what you capture (always on screen) ────────────────────
    // Submit is disabled until orgName, biometricTypes and jurisdictions are
    // non-empty: BiometricChecker.tsx L605 `disabled={!form.orgName.trim() ||
    // form.biometricTypes.length === 0 || form.jurisdictions.length === 0}`.
    { key: "orgName", kind: "text", required: "always" },
    { key: "biometricTypes", kind: "multi-enum", required: "always", options: TYPES },
    // L350 — select with no empty option; defaults to ORG[0], never empty.
    { key: "orgType", kind: "enum", required: "always", options: ORG },
    // L357 — select with no empty option; defaults to PURPOSE[0], never empty.
    { key: "purpose", kind: "enum", required: "always", options: PURPOSE },

    // ── Stage 2 — which regimes apply ────────────────────────────────────
    { key: "jurisdictions", kind: "multi-enum", required: "always", options: JURS },
    // L392-L409 — the "Which state(s)?" input renders ONLY when the
    // "Other US state" jurisdiction is selected. Free text; conditional so
    // the gate never counts it as unanswered on a record that never saw it.
    {
      key: "other_state_names",
      kind: "text",
      required: "conditional",
      requiredWhen: 'the "Other US state" jurisdiction is selected',
      trigger: OTHER_STATE_TRIGGER,
      hiddenValue: "",
    },

    // ── Stage 3 — your practices (L412 `{showPractices && (`) ────────────
    // Every field in this block is presented only when Illinois, Texas or
    // Washington is in scope, so each carries the practices trigger.

    // L419-L426 — "How is the biometric data generated?"
    {
      key: "data_source_description",
      kind: "text",
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L429 — health-care treatment/payment/operations context.
    {
      key: "healthcare_tpo_context",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L430 — State or local government body.
    {
      key: "entity_is_government",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L431 — Gramm-Leach-Bliley financial institution.
    {
      key: "glba_financial_institution",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L436-L442 — notice before collection.
    {
      key: "notice_before_collection",
      kind: "enum",
      options: NOTICE,
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L445-L451 — consent or release artifact.
    {
      key: "consent_artifact_type",
      kind: "enum",
      options: CONSENT_ARTIFACT,
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L454-L460 — describe the release instrument.
    {
      key: "release_artifact_description",
      kind: "narrative",
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L463-L469 — retention schedule as written.
    {
      key: "retention_schedule_text",
      kind: "narrative",
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L472 — retention policy made public.
    {
      key: "retention_policy_public",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L473 — protection parity with other confidential information.
    {
      key: "protection_parity",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L477-L483 — destruction trigger.
    {
      key: "destruction_trigger",
      kind: "text",
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L432 — sold, leased, traded, or otherwise turned to profit.
    {
      key: "sells_or_profits",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L486-L492 — storage and transmission controls.
    {
      key: "security_measures_description",
      kind: "text",
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L495-L501 — disclosure recipients.
    {
      key: "disclosure_recipients",
      kind: "text",
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },
    // L503-L508 — bases relied on for disclosure (checkbox group).
    {
      key: "disclosure_bases",
      kind: "multi-enum",
      options: DISCLOSURE_BASES,
      required: "conditional",
      requiredWhen: "Illinois, Texas or Washington is in scope",
      trigger: PRACTICES_TRIGGER,
    },

    // ── Stage 3a — Texas (L510 `{showTexas && (`) ────────────────────────
    {
      key: "tx_destruction_within_one_year",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Texas (CUBI) is in scope",
      trigger: TEXAS_TRIGGER,
    }, // L515
    {
      key: "tx_longer_retention_required_by_law",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Texas (CUBI) is in scope",
      trigger: TEXAS_TRIGGER,
    }, // L516
    {
      key: "tx_employer_security_collection",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Texas (CUBI) is in scope",
      trigger: TEXAS_TRIGGER,
    }, // L517
    {
      key: "tx_ai_training_use",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Texas (CUBI) is in scope",
      trigger: TEXAS_TRIGGER,
    }, // L518

    // ── Stage 3b — Washington RCW 19.375 (L523 `{showWashington && (`) ───
    {
      key: "wa_enrolls_in_database",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Washington state is in scope",
      trigger: WASHINGTON_TRIGGER,
    }, // L528
    {
      key: "wa_commercial_purpose",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Washington state is in scope",
      trigger: WASHINGTON_TRIGGER,
    }, // L529
    {
      key: "wa_security_purpose_only",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Washington state is in scope",
      trigger: WASHINGTON_TRIGGER,
    }, // L530

    // ── Stage 3c — Washington My Health My Data Act, RCW 19.373 ──────────
    // A DISTINCT authority from RCW 19.375 (form L533-L540 states so in its
    // own block). Same gate: nested inside `{showWashington && (` at L523.
    {
      key: "wa_mhmda_health_inference",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Washington state is in scope",
      trigger: WASHINGTON_TRIGGER,
    }, // L542
    {
      key: "wa_mhmda_privacy_policy_published",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Washington state is in scope",
      trigger: WASHINGTON_TRIGGER,
    }, // L543
    {
      key: "wa_mhmda_collection_consent",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Washington state is in scope",
      trigger: WASHINGTON_TRIGGER,
    }, // L544
    {
      key: "wa_mhmda_share_consent_separate",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Washington state is in scope",
      trigger: WASHINGTON_TRIGGER,
    }, // L545
    {
      key: "wa_mhmda_geofence_health_facility",
      kind: "enum",
      options: TRI,
      required: "conditional",
      requiredWhen: "Washington state is in scope",
      trigger: WASHINGTON_TRIGGER,
    }, // L546

    // ── Stage 4 — approval and review (L557-L588) ────────────────────────
    // ITEM 380 r5c — emptyIsAnswer. The block sits OUTSIDE every conditional
    // (L557, a sibling of the `{showPractices && ...}` block) so all four
    // controls are presented unconditionally, and L559-L561 defines the empty
    // state as a substantive answer:
    //   "Naming an approver turns this assessment into an accountability
    //    record. Left blank, the report states the approval was not recorded
    //    rather than printing an empty signature line."
    // An empty value is therefore the answer "approval was not recorded", not
    // an unanswered ask.
    { key: "approved_by_name", kind: "text", required: "optional", emptyIsAnswer: true },   // L565
    { key: "approved_by_title", kind: "text", required: "optional", emptyIsAnswer: true },  // L571
    { key: "approval_date", kind: "date", required: "optional", emptyIsAnswer: true },      // L577
    { key: "next_review_due", kind: "date", required: "optional", emptyIsAnswer: true },    // L583
  ],
};
