// Closed-Loop Quality System — G2 (seed pattern)
// Human-authored biometric golden cases. Intakes use the EXACT jurisdiction
// selection labels the biometric-checker resolver recognises — no bare
// state codes — so the tool never falls back to generic output.
//
// Coverage: IL, TX, WA, CA, VA, EU, UK; single- and multi-jurisdiction;
// strong/weak compliance posture. Split ~60/40 tuning/holdout.

import type { GoldenCase } from "./types.ts";

export const BIOMETRIC_GOLDEN: GoldenCase[] = [
  // ---------- TUNING ----------
  {
    id: "bio-il-fingerprint",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Acme Logistics",
      orgType: "Warehouse",
      biometricTypes: ["fingerprint"],
      purpose: "Workforce time and attendance",
      jurisdictions: ["Illinois, USA (BIPA)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "names BIPA, not generic" },
      { kind: "must_cite", citation: "740 ILCS 14", label: "BIPA cited" },
      { kind: "must_include", pattern: "15\\(b\\)", label: "written release / §15(b)" },
      { kind: "must_include", pattern: "\\$1,000|\\$5,000", label: "statutory damages" },
      { kind: "must_include", pattern: "private right of action|PRA", flags: "i", label: "PRA" },
    ],
  },
  {
    id: "bio-il-facial-retail",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Northbrook Retail Co.",
      orgType: "Retail",
      biometricTypes: ["facial geometry"],
      purpose: "Loss prevention",
      jurisdictions: ["Illinois, USA (BIPA)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "names BIPA, not generic" },
      { kind: "must_cite", citation: "740 ILCS 14", label: "BIPA cited" },
      { kind: "must_include", pattern: "written\\s+release", flags: "i", label: "written release" },
      { kind: "must_include", pattern: "retention\\s+schedule|destruction", flags: "i", label: "retention / destruction" },
    ],
  },
  {
    id: "bio-ca-facial-multitenant",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Bayline Properties",
      orgType: "Property Management",
      biometricTypes: ["facial geometry"],
      purpose: "Physical access control",
      jurisdictions: ["California, USA (CCPA)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "names CCPA/CPRA, not generic" },
      { kind: "must_include", pattern: "sensitive personal information|SPI", flags: "i", label: "CCPA SPI" },
      { kind: "must_include", pattern: "Limit\\s+the\\s+Use", flags: "i", label: "Limit the Use of My SPI link" },
    ],
  },
  {
    id: "bio-wa-voiceprint",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Cascade Telco",
      orgType: "Telecommunications",
      biometricTypes: ["voiceprint"],
      purpose: "Customer authentication",
      jurisdictions: ["Washington, USA"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "names WA biometric statute, not generic" },
      { kind: "must_include", pattern: "RCW\\s*19\\.375", flags: "i", label: "WA RCW 19.375 cited" },
      { kind: "must_include", pattern: "commercial\\s+purpose", flags: "i", label: "commercial-purpose scoping" },
    ],
  },
  {
    id: "bio-va-fingerprint",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Tidewater Health Clinic",
      orgType: "Healthcare",
      biometricTypes: ["fingerprint"],
      purpose: "Patient check-in",
      jurisdictions: ["Virginia, USA"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "VCDPA addressed" },
      { kind: "must_include", pattern: "VCDPA|Virginia Consumer Data Protection Act", flags: "i", label: "VCDPA named" },
      { kind: "must_include", pattern: "sensitive\\s+data|consent", flags: "i", label: "sensitive data / consent" },
    ],
  },
  {
    id: "bio-uk-facial-event",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Albion Events Ltd",
      orgType: "Events & Hospitality",
      biometricTypes: ["facial geometry"],
      purpose: "Ticketless venue entry",
      jurisdictions: ["United Kingdom (UK GDPR)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "UK GDPR named" },
      { kind: "must_include", pattern: "Article\\s*9", flags: "i", label: "Art 9 special category" },
      { kind: "must_include", pattern: "DPIA|data protection impact assessment", flags: "i", label: "DPIA required" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i", label: "no US BIPA in UK section" },
    ],
  },
  {
    id: "bio-multi-eu-uk-facial",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Lufthavn Group",
      orgType: "Aviation",
      biometricTypes: ["facial geometry"],
      purpose: "Border / boarding identity verification",
      jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*9", flags: "i", label: "GDPR Art 9 referenced" },
      { kind: "must_include", pattern: "UK GDPR", flags: "i", label: "UK GDPR distinguished" },
      { kind: "must_not_include", pattern: "do\\s+not\\s+sell", flags: "i", label: "no US 'sale' framing in EU/UK section" },
    ],
  },

  // ---------- HOLDOUT ----------
  {
    id: "bio-tx-handgeometry",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "Lone Star Gym Holdings",
      orgType: "Fitness",
      biometricTypes: ["hand geometry"],
      purpose: "Member access control",
      jurisdictions: ["Texas, USA (CUBI)"],
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "CUBI named, not generic" },
      { kind: "must_cite", citation: "503.001", label: "CUBI § 503.001 cited" },
      { kind: "must_not_include", pattern: "signed\\s+written\\s+release.*statutory\\s+requirement", flags: "i",
        label: "must NOT import BIPA written-release into CUBI" },
      { kind: "must_not_include", pattern: "private\\s+right\\s+of\\s+action", flags: "i",
        label: "no PRA under CUBI" },
    ],
  },
  {
    id: "bio-tx-ca-fingerprint",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "Pacific & Plains Retail",
      orgType: "Retail",
      biometricTypes: ["fingerprint"],
      purpose: "Employee POS authentication",
      jurisdictions: ["Texas, USA (CUBI)", "California, USA (CCPA)"],
    },
    assertions: [
      { kind: "must_cite", citation: "503.001", label: "CUBI cited for TX" },
      { kind: "must_include", pattern: "sensitive personal information|SPI", flags: "i", label: "CCPA SPI for CA" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i", label: "no BIPA when IL not selected" },
    ],
  },
  {
    id: "bio-eu-facial",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "Helvetia Bank EU",
      orgType: "Financial Institution",
      biometricTypes: ["facial geometry"],
      purpose: "KYC remote onboarding",
      jurisdictions: ["EU (GDPR)"],
    },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*9", flags: "i", label: "GDPR Art 9 special category" },
      { kind: "must_include", pattern: "DPIA", flags: "i", label: "DPIA obligation" },
      { kind: "must_not_include", pattern: "do\\s+not\\s+sell", flags: "i", label: "no US 'sale' framing in EU section" },
      { kind: "must_not_include", pattern: "BIPA|740 ILCS", flags: "i", label: "no US BIPA in EU section" },
    ],
  },
  {
    id: "bio-il-wa-iris",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "Midwest-Northwest Logistics",
      orgType: "Logistics",
      biometricTypes: ["iris scan"],
      purpose: "Secure facility access",
      jurisdictions: ["Illinois, USA (BIPA)", "Washington, USA"],
    },
    assertions: [
      { kind: "must_cite", citation: "740 ILCS 14", label: "BIPA cited for IL" },
      { kind: "must_include", pattern: "RCW\\s*19\\.375", flags: "i", label: "WA RCW 19.375 cited" },
      { kind: "must_include", pattern: "private right of action|PRA", flags: "i", label: "PRA in IL section" },
    ],
  },
  {
    id: "bio-ca-employee-weak",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "SunValley Manufacturing",
      orgType: "Manufacturing",
      biometricTypes: ["fingerprint", "facial geometry"],
      purpose: "Employee time tracking",
      jurisdictions: ["California, USA (CCPA)"],
      // weak posture: no written policy, undefined retention
    },
    assertions: [
      { kind: "must_include", pattern: "retention", flags: "i", label: "retention gap flagged" },
      { kind: "must_include", pattern: "notice|written\\s+policy", flags: "i", label: "policy / notice gap flagged" },
      { kind: "must_include", pattern: "Limit\\s+the\\s+Use", flags: "i", label: "Limit the Use of My SPI link" },
    ],
  },
  // ---------- ITEM 317 — "Perfect Data" fixture-unblock ----------
  // These supply every field the Item 317 intake extension added, so the
  // per-duty deliverables are measurable rather than degrading wholesale to
  // record_insufficient. Two states plus a cross-statute divergence.
  {
    id: "bio-perfect-il-tx-wa-record",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      orgName: "Continental Freight Systems, Inc.",
      orgType: "Employer (employee biometrics)",
      biometricTypes: ["Fingerprint / palm print"],
      purpose: "Time & attendance / workforce management",
      jurisdictions: ["Illinois, USA (BIPA)", "Texas, USA (CUBI)", "Washington state, USA"],
      data_source_description:
        "Optical fingerprint readers at dock entrances convert each employee ridge scan to a proprietary numeric template; the raw ridge capture is discarded at once and only the numeric template is stored in the on-premises matching database.",
      healthcare_tpo_context: "No",
      entity_is_government: "No",
      glba_financial_institution: "No",
      notice_before_collection: "Written notice given before collection",
      consent_artifact_type: "Standalone written release signed before collection",
      release_artifact_description:
        "One-page biometric consent form signed at induction, stating the specific purpose (shift clock-in), the term of collection and storage, and naming the retention schedule; countersigned copy retained in the personnel file.",
      retention_schedule_text:
        "Templates are destroyed on the earlier of (i) satisfaction of the initial purpose of collection or (ii) one year after the employee last interacts with the reader.",
      retention_policy_public: "Yes",
      destruction_trigger:
        "Automated purge job runs nightly and deletes any template whose employment record closed more than 30 days earlier.",
      sells_or_profits: "No",
      disclosure_recipients: "None — the matching database is hosted on-premises and no vendor receives templates.",
      disclosure_bases: ["No disclosures are made"],
      security_measures_description:
        "Templates encrypted at rest with AES-256, transmitted only over the internal network segment, access restricted to two named systems administrators under logged break-glass procedure.",
      protection_parity: "Yes",
      tx_destruction_within_one_year: "Yes",
      tx_longer_retention_required_by_law: "No",
      tx_employer_security_collection: "No",
      tx_ai_training_use: "No",
      wa_enrolls_in_database: "Yes",
      wa_commercial_purpose: "No",
      wa_security_purpose_only: "No",
    },
    assertions: [
      { kind: "must_cite", citation: "740 ILCS 14", label: "BIPA cited for IL" },
      { kind: "must_include", pattern: "503\\.001", label: "CUBI cited for TX" },
      { kind: "must_include", pattern: "RCW\\s*19\\.375", flags: "i", label: "RCW 19.375 cited for WA" },
      { kind: "must_include", pattern: "one\\s+year", flags: "i", label: "CUBI one-year clock named" },
    ],
  },
  {
    id: "bio-perfect-il-deficient-record",
    tool: "biometric-checker",
    set: "holdout",
    intake: {
      orgName: "Prairie Fitness Clubs LLC",
      orgType: "Consumer app or platform",
      biometricTypes: ["Facial geometry / facial recognition"],
      purpose: "Customer authentication",
      jurisdictions: ["Illinois, USA (BIPA)"],
      data_source_description:
        "Lobby kiosk cameras compute a facial geometry template for each member at check-in and match it against the stored member gallery.",
      healthcare_tpo_context: "No",
      entity_is_government: "No",
      glba_financial_institution: "No",
      notice_before_collection: "No notice given before collection",
      consent_artifact_type: "Clickwrap or in-product acceptance",
      release_artifact_description:
        "Membership terms of service contain a single sentence permitting 'biometric check-in'; there is no standalone release and no signature specific to biometrics.",
      retention_schedule_text: "",
      retention_policy_public: "No",
      destruction_trigger: "",
      sells_or_profits: "Yes",
      disclosure_recipients: "Templates are shared with an analytics partner that resells aggregate attendance insight.",
      disclosure_bases: [],
      security_measures_description: "Templates stored in the same unencrypted operational database as class bookings.",
      protection_parity: "No",
    },
    assertions: [
      { kind: "must_cite", citation: "740 ILCS 14", label: "BIPA cited" },
      { kind: "must_include", pattern: "15\\(b\\)", label: "written release / \u00a715(b)" },
      { kind: "must_include", pattern: "15\\(c\\)|profit", flags: "i", label: "profit prohibition reached" },
      { kind: "must_include", pattern: "retention", flags: "i", label: "retention schedule reached" },
    ],
  },
];
