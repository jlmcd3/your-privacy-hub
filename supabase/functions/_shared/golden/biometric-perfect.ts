// ITEM 410 LEG B — BIOMETRIC PERFECT FIXTURE (×1).
//
// A TRULY-COMPLETE-RECORD case for the Biometric Privacy Compliance
// Assessment, authored against the ITEM 408 contract
// (`_shared/intake-contracts/biometric.ts`) and the live item380-r5
// `emptyAskedKeys` semantics:
//
//   * every ASKED field is non-empty (conditional triggers honoured; the four
//     Stage-4 `emptyIsAnswer` approval fields are ANSWERED, not skipped;
//     SYSTEM_KEYS are respected — the contract declares none for this tool);
//   * every answer is SUFFICIENT — named modality and systems, the written
//     policy facts with dates, consent mechanics with the recorded artefact
//     and its timing, a retention schedule with what sets it and how
//     destruction happens, disclosure recipients with their basis, and
//     security measures with named owners and cadences.
//
// PRIMARY JURISDICTION — ILLINOIS / BIPA. The item409 walked renders
// (28583f46-… and d49d9be8-…) are both BIPA-anchored employer records, and
// BIPA is the only regime in the biometric registry with a private right of
// action, so it stays the anchor. Texas (CUBI) and Washington (RCW 19.375 +
// RCW 19.373 MHMDA) are ALSO in scope so that every conditional block the
// contract declares is genuinely asked and genuinely answered; all three
// regimes are covered by verified reference passages in
// `check-biometric-compliance/_local/registry/biometric-verified-authorities.ts`.
//
// FACT-EXEMPT RULE (item409 `BIOMETRIC_FACT_EXEMPT_RULE`): this scenario is
// entirely new. It carries zero `REFERENCE_RENDER_TOKENS` matches — nothing
// from the walked renders is seeded here as record truth.
//
// THE DEGRADED PILOT SOURCES, NAMED (nothing degraded is authored here):
//   * `GOLDEN_BY_TOOL["biometric-checker"] = BIOMETRIC_GOLDEN_EXTRA`
//     (`_shared/golden/biometric-extra.ts`) — five BIO-REG-W1 registry-gating
//     cases whose intakes answer only the four always-required Stage-1/2
//     fields; every Stage-3 practice question is unanswered.
//   * `MESSY_BY_TOOL["biometric-checker"] = [MESSY_BIOMETRIC]`
//     (`_shared/golden/messy-registry.ts` L377) — a deliberately thinned
//     record. Both remain untouched and keep serving the degraded pilot.

import type { GoldenCase } from "./types.ts";

export const BIOMETRIC_PERFECT: GoldenCase[] = [
  {
    id: "biometric-multistate-distribution-employer-perfect",
    tool: "biometric-checker",
    set: "tuning",
    intake: {
      // ── Stage 1 — what is captured ───────────────────────────────────
      // Named legal entity: the assessment's subject anchor.
      orgName: "Cascade Ridge Logistics Group, Inc.",
      // Named modalities, both verbatim contract options; the record states
      // exactly which identifiers are captured, not "biometrics" generally.
      biometricTypes: [
        "Fingerprint / palm print",
        "Facial geometry / facial recognition",
      ],
      // Verbatim ORG option — an employer processing employee biometrics,
      // which is the posture BIPA §15(b) and CUBI §503.001(b) both address.
      orgType: "Employer (employee biometrics)",
      // Verbatim PURPOSE option — the single operational purpose, which fixes
      // the retention trigger and the §15(d) disclosure analysis.
      purpose: "Time & attendance / workforce management",

      // ── Stage 2 — regimes in scope ───────────────────────────────────
      // Three named regimes; BIPA is the anchor. "Other US state" is NOT
      // selected, so `other_state_names` is never asked (skip-logic honoured).
      jurisdictions: [
        "Illinois, USA (BIPA)",
        "Texas, USA (CUBI)",
        "Washington state, USA",
      ],

      // ── Stage 3 — practices (Illinois / Texas / Washington in scope) ──
      // Names the systems, the vendor, the template stored and where it sits —
      // enough to characterise the identifier under 740 ILCS 14/10.
      data_source_description:
        "Palm-vein templates are generated at 41 Kronos InTouch DX time clocks installed in the Joliet, Illinois; Fort Worth, Texas; and Kent, Washington distribution centres. Each clock captures a near-infrared palm image at enrolment, converts it on-device to a 512-byte irreversible mathematical template, and discards the source image before transmission; the raw image is never written to disk. Facial geometry templates are generated separately at the six secure-cage doors in Joliet by a Genetec Synergis reader using a Cognitec FaceVACS encoder. Both template types are stored in the Aurora, Illinois data centre in a dedicated SQL Server instance (BIO-PRD-01) that holds no other personal data, keyed to the employee number issued by Workday.",
      // Answered "No": the employer is a logistics business, so the BIPA
      // §10 health-care-treatment exclusion is not in play — the record says so
      // rather than leaving the exclusion open.
      healthcare_tpo_context: "No",
      // Answered "No": a private corporation, so the CUBI §503.001(e) and
      // RCW 19.375.040 governmental-body exclusions do not apply.
      entity_is_government: "No",
      // Answered "No": no GLBA institution status, so the BIPA §25(c)
      // financial-institution exemption is affirmatively out of scope.
      glba_financial_institution: "No",
      // Verbatim NOTICE option, and the strongest one: written notice before
      // collection is the §15(b)(1)-(2) predicate.
      notice_before_collection: "Written notice given before collection",
      // Verbatim CONSENT_ARTIFACT option: a standalone written release signed
      // before collection is the §15(b)(3) predicate, executed as its own
      // instrument rather than buried in onboarding paperwork.
      consent_artifact_type: "Standalone written release signed before collection",
      // The release instrument described with its title, version, date, the
      // disclosures it makes, how it is executed and where it is retained.
      release_artifact_description:
        "The instrument is the two-page \"Biometric Information Notice, Consent and Release (Rev. 3)\", adopted 14 January 2025 and issued in English and Spanish. It is a standalone document: it is not part of the offer letter, the handbook acknowledgement, or any onboarding packet, and it is presented at the enrolment kiosk after the notice is read but before the first palm scan is taken. It states the specific identifiers collected (palm-vein template; facial geometry template for cage access only), the specific purpose (time and attendance recording; controlled-substance cage access), the retention period and destruction trigger, and the fact that no template is sold, leased or traded. Employees sign on paper before a supervisor witness; the signed original is scanned into the Workday personnel file within one business day and the paper original is filed at the site HR office. As of 30 June 2026, 3,412 of 3,412 enrolled employees have a signed release on file, verified by the quarterly enrolment-to-release reconciliation run by the HRIS team.",
      // The schedule as written, with the retention period, the outer bound,
      // the destruction cadence and who runs it — the §15(a) elements.
      biometric_consent_withdrawal:
        "An employee withdraws consent by submitting the one-page \"Biometric Withdrawal Request\" to site HR, by email to privacy@, or verbally to any supervisor, who logs it the same day; no reason is required and no adverse action follows. On receipt, the HRIS team suspends the template from matching within one business day and permanently destroys it — template and all backups — within 30 days, with the destruction certificate filed against the personnel record. The employee is moved to badge-and-PIN clock-in for the remainder of employment, and the withdrawal is confirmed in writing within five business days.",
      retention_schedule_text:
        "Policy HR-119 \"Biometric Identifier Retention and Destruction Schedule\", version 2.1, approved 14 January 2025 and published on the employee intranet and at each site notice board, states: biometric templates are retained only while the individual remains an active employee or contractor, and in every case are permanently destroyed no later than 30 days after the earlier of (i) the date the purpose for collection is satisfied — that is, the individual's final scheduled shift — or (ii) three years after the individual's last interaction with the company. The schedule is executed by an automated nightly job (BIO-PURGE) at 02:00 CT that reads the Workday termination feed, and by a monthly manual sweep on the first Tuesday of each month for contractor records that do not flow through Workday.",
      // Answered "Yes": the schedule is published, which is the §15(a)
      // publicly-available-guidelines requirement, not merely the existence
      // of an internal schedule.
      retention_policy_public: "Yes",
      // Answered "Yes": templates are protected to at least the standard used
      // for other confidential and sensitive information (§15(e)(2)).
      protection_parity: "Yes",
      // Names the trigger event, the mechanism, the timing and the evidence
      // left behind — so destruction is auditable, not asserted.
      destruction_trigger:
        "The trigger is the employee's or contractor's final scheduled shift, recorded as the Workday termination-effective date; the three-year last-interaction outer bound applies to anyone whose record never receives a termination date. On trigger, the BIO-PURGE job cryptographically erases the template row and its encrypted backup shard, writes an immutable destruction certificate (employee number, template type, trigger date, purge timestamp, job run id) to the WORM audit log, and emails the certificate reference to the Director of HR Operations. The destruction certificate, not the absence of the record, is the evidence retained.",
      // Answered "No": no sale, lease, trade or other profit — the §15(c)
      // prohibition is squarely answered.
      sells_or_profits: "No",
      // Security measures with named controls, named owners and cadences.
      security_measures_description:
        "Templates are encrypted at rest with AES-256 using keys held in AWS KMS (key alias bio-prd-cmk, automatic annual rotation, last rotated 3 March 2026) and in transit with TLS 1.3 between clock, reader and BIO-PRD-01; no template ever leaves the Aurora data centre in plaintext. Access to BIO-PRD-01 is limited to four named engineers under a break-glass procedure requiring dual approval, is logged to a WORM store, and is recertified quarterly by the Director of Information Security, Priya Raghunathan, most recently on 15 June 2026. Phishing-resistant FIDO2 authentication is enforced for all four accounts. The clocks are on an isolated VLAN with no outbound internet route; firmware is patched monthly by the Facilities Systems Manager, Devin Okonkwo. An annual penetration test scoped to the biometric estate was completed by an external firm on 22 April 2026 with two medium findings, both remediated by 30 May 2026. Backups are encrypted, held 35 days, and restore-tested semi-annually (last test 11 February 2026).",
      // Names each recipient, what it receives and why — so the §15(d) and
      // §503.001(c) analyses run against facts, not "vendors".
      disclosure_recipients:
        "Two recipients, both processors and neither a sale. (1) UKG Kronos Workforce Central (UKG Inc.), the timekeeping platform, receives the palm-vein template hash for match verification under a 12 March 2025 data processing addendum that forbids further disclosure and requires deletion within 30 days of contract end. (2) Genetec Inc., the access-control platform, receives the facial geometry template for the Joliet cage doors only, under an addendum with identical terms dated 4 April 2025. No template is disclosed to any staffing agency, insurer, background-check provider or law-enforcement body; two subpoenas received in 2025 sought timekeeping records only and no template was produced.",
      // Verbatim DISCLOSURE_BASES options, and the ones the facts above
      // actually support: subject consent plus the service-necessity and
      // contractual-no-further-disclosure bases.
      disclosure_bases: [
        "Subject consent to the disclosure",
        "Necessary to provide a product or service the subject requested",
        "Third party contractually promises no further disclosure",
      ],

      // ── Stage 3a — Texas, CUBI ───────────────────────────────────────
      // "Yes": destruction within a reasonable time and no later than the
      // first anniversary of the purpose expiring (§503.001(c-2)) — the
      // 30-day schedule above is well inside it.
      tx_destruction_within_one_year: "Yes",
      // "No": no statute or court order requires longer retention, so the
      // §503.001(c-2) extension is affirmatively not relied on.
      tx_longer_retention_required_by_law: "No",
      // "Yes": the Fort Worth capture is by an employer for security purposes,
      // which engages the §503.001(c-2) employer timing rule.
      tx_employer_security_collection: "Yes",
      // "No": no template is used to train or develop any AI system, so the
      // §503.001(f) subsequent-commercial-use provision is answered.
      tx_ai_training_use: "No",

      // ── Stage 3b — Washington, RCW 19.375 ────────────────────────────
      // "Yes": templates are enrolled in a database, which is the RCW
      // 19.375.020(1) trigger — the record does not dodge it.
      wa_enrolls_in_database: "Yes",
      // "No": enrolment is for workforce management, not a commercial purpose
      // as RCW 19.375.010(7) defines it.
      wa_commercial_purpose: "No",
      // "Yes": the Kent capture is for security and timekeeping only, which
      // is the RCW 19.375.020(2) posture the analysis needs.
      wa_security_purpose_only: "Yes",

      // ── Stage 3c — Washington My Health My Data Act, RCW 19.373 ──────
      // "No": no template is used to infer any health condition, so the
      // consumer-health-data definition in RCW 19.373.010 is not engaged —
      // answered rather than left silent.
      wa_mhmda_health_inference: "No",
      // "Yes": a consumer health data privacy policy is published at
      // cascaderidge.example/privacy/health, satisfying RCW 19.373.020 in
      // any event.
      wa_mhmda_privacy_policy_published: "Yes",
      // "Yes": collection consent is obtained separately from the release,
      // covering RCW 19.373.030(1).
      wa_mhmda_collection_consent: "Yes",
      // "Yes": sharing consent is captured as a separate signature, covering
      // RCW 19.373.030(2).
      wa_mhmda_share_consent_separate: "Yes",
      // "No": no geofence is operated around any health-care facility, so
      // RCW 19.373.080 is answered.
      wa_mhmda_geofence_health_facility: "No",

      // ── Stage 4 — approval and review (emptyIsAnswer fields, ANSWERED) ─
      // A named approver turns the assessment into an accountability record;
      // a perfect record names one rather than relying on the empty-is-answer
      // reading.
      approved_by_name: "Marisol Duarte-Whitfield",
      // The title establishes the approver's authority to accept the record.
      approved_by_title: "Vice President, People Operations and Compliance",
      // A concrete approval date, consistent with the policy dates above.
      approval_date: "2026-07-02",
      // A concrete next-review date twelve months on, so the review cadence
      // is a fact in the record rather than an inference.
      next_review_due: "2027-07-02",
    },
    assertions: [
      { kind: "jurisdiction_resolved", label: "resolves to BIPA/CUBI/RCW, not the generic fallback" },
      { kind: "must_include", pattern: "740 ILCS 14/15\\(b\\)", label: "cites BIPA §15(b)" },
      { kind: "must_include", pattern: "740 ILCS 14/15\\(a\\)", label: "cites BIPA §15(a) retention schedule" },
      { kind: "must_include", pattern: "503\\.001", label: "cites Tex. Bus. & Com. Code § 503.001" },
      { kind: "must_include", pattern: "RCW\\s*19\\.375", label: "cites RCW 19.375" },
      {
        kind: "must_not_include",
        pattern: "\\[TO (COMPLETE|BE (ASSESSED|COMPLETED))",
        flags: "i",
        label: "a complete record leaves no completion placeholder",
      },
      {
        kind: "must_not_include",
        pattern: "the record does not state whether a written release",
        flags: "i",
        label: "no false absence about the release the record supplies",
      },
    ],
  },
];
