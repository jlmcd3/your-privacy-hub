// QB-P20 — DPIA golden set. 3 fixtures (2 tuning + 1 adversarial).
// Adversarial: multi-establishment ambiguity (controller_country vs
// central_administration_country conflict) — see learnings entry on GDPR
// Main Establishment logic.
import type { GoldenCase } from "./types.ts";

const base = {
  organization_name: "Acme Health SA",
  processing_activity_name: "Patient portal analytics",
  description: "Analytics on the patient portal to improve care pathways.",
  purpose: "Improve care pathways for chronic patients.",
  data_categories: ["Health or medical data", "Contact details"],
  data_subjects: "Adult patients enrolled in chronic-care programmes.",
  volume_frequency: "50,000 records; daily ingest.",
  jurisdictions: ["EU (GDPR)"],
  legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
  article_9_condition: "Preventive/occupational medicine, health or social care (Art. 9(2)(h))",
  necessity_proportionality: "Data minimised to portal events; alternatives (aggregated telemetry) rejected because they do not surface cohort-level care gaps.",
  retention_period: "24 months rolling.",
};

export const DPIA_GOLDEN: GoldenCase[] = [
  {
    id: "dpia-eu-health-tuning",
    tool: "dpia",
    set: "tuning",
    intake: { ...base },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*9\\(2\\)\\(h\\)", flags: "i", label: "Art 9(2)(h) selected" },
      { kind: "must_include", pattern: "necessity|proportionality", flags: "i", label: "necessity/proportionality" },
      // W3-T1 — provenance-typed rows in section_1_description
      { kind: "must_include", pattern: "\"intake_field\"", label: "row source.intake_field present" },
      { kind: "must_include", pattern: "\"basis\"\\s*:\\s*\"(stated|inferred)\"", label: "row source.basis is stated|inferred" },
    ],
  },
  {
    id: "dpia-uk-hr-tuning",
    tool: "dpia",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Britannia HR Ltd",
      processing_activity_name: "Workforce sentiment analytics",
      description: "Sentiment analysis over internal collaboration tool posts.",
      purpose: "Detect burnout indicators.",
      data_categories: ["Employee records", "Communications content"],
      data_subjects: "UK-based employees.",
      volume_frequency: "3,000 employees; weekly.",
      jurisdictions: ["United Kingdom (UK GDPR)"],
      legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
      article_9_condition: "Employment, social security & social protection law (Art. 9(2)(b))",
    },
    assertions: [
      { kind: "must_include", pattern: "UK GDPR", flags: "i", label: "UK GDPR named" },
      { kind: "must_not_include", pattern: "BIPA", flags: "i", label: "no US BIPA" },
      { kind: "must_include", pattern: "\"intake_field\"", label: "row source.intake_field present" },
      { kind: "must_include", pattern: "\"basis\"\\s*:\\s*\"(stated|inferred)\"", label: "row source.basis is stated|inferred" },
    ],
  },
  {
    id: "dpia-multi-establishment-ambiguity",
    tool: "dpia",
    set: "adversarial",
    intake: {
      ...base,
      organization_name: "Nordic Retail AB",
      processing_activity_name: "Cross-border loyalty programme",
      description: "Loyalty scheme operated across EU stores; controller registered in Sweden, central administration in Germany.",
      purpose: "Personalised loyalty offers.",
      data_categories: ["Customer records", "Contact details"],
      data_subjects: "EU-resident loyalty members.",
      volume_frequency: "1.2M members; continuous.",
      jurisdictions: ["EU (GDPR)"],
      legal_basis_proposed: "Contract (Art. 6(1)(b))",
      article_9_condition: "",
      // R-TURN-1 item 8 — retail override: prevent healthcare "cohort-level
      // care gaps" language from base.necessity_proportionality leaking into
      // this retail-loyalty fixture via the ...base spread.
      necessity_proportionality: "Loyalty data limited to purchase and offer-engagement events; alternatives (aggregate market-basket analytics) rejected because they cannot personalise offers at member level.",
      retention_period: "Duration of membership; deleted 24 months after the last transaction.",
      controller_country: "Sweden",
      central_administration_country: "Germany",
    },
    assertions: [
      { kind: "must_include", pattern: "main\\s+establishment|central administration", flags: "i",
        label: "Main Establishment analysis surfaces" },
      { kind: "must_include", pattern: "\"intake_field\"", label: "row source.intake_field present" },
      { kind: "must_include", pattern: "\"basis\"\\s*:\\s*\"(stated|inferred)\"", label: "row source.basis is stated|inferred" },
    ],
  },
  // ITEM 310 — "Perfect Data" case. Supplies every field the Item 310 intake
  // extension added (alternatives_considered, Art. 35(9) views status, DPO
  // advice) with specific, non-generic content, so the four analytic
  // deliverables run on the ANALYSED path rather than degrading. This is the
  // measurability unblock for dpia (same role Item 309 played for cppa-admt).
  {
    id: "dpia-perfect-record",
    tool: "dpia",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Helvetia Occupational Health AG",
      processing_activity_name: "Occupational-health absence triage",
      description:
        "Triage of employee sickness-absence certificates by the occupational-health team to schedule return-to-work assessments and adjust duties.",
      purpose:
        "Schedule return-to-work assessments and set temporary duty adjustments for employees on certified sickness absence.",
      data_categories: ["Health or medical data", "Employee records", "Contact details"],
      data_subjects: "Employees of the controller who submit a sickness-absence certificate.",
      volume_frequency: "1,400 employees; roughly 60 certificates per month.",
      jurisdictions: ["EU (GDPR)"],
      legal_basis_proposed: "Legal obligation (Art. 6(1)(c))",
      article_9_condition:
        "Preventive/occupational medicine, health or social care (Art. 9(2)(h))",
      necessity_proportionality:
        "The occupational-health team needs the certified diagnosis category to set duty adjustments; the processing is intrusive because it exposes an employee's health condition to a team inside their own employer, and employees cannot avoid it if they wish to be paid during absence. That impact on the data subjects is confined by holding the diagnosis category only within the occupational-health team and releasing only a fitness verdict to line management.",
      data_minimisation_justification:
        "Only the diagnosis category, certified dates and prescribed restrictions are recorded; free-text clinical notes are not transcribed into the HR system.",
      retention_period: "18 months from the end of the absence, then deleted.",
      existing_safeguards: [
        "Encryption at rest",
        "Encryption in transit",
        "Access controls",
        "Data minimisation",
        "Pseudonymisation",
        "Staff training",
        "DPA signed with processor",
        "Contractual restrictions",
      ],
      third_party_processors: ["Other: Occupational-health provider (Arbeitsmedizin Zürich AG)"],
      reasons_to_conduct: [
        "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
        "Sensitive or highly personal data",
      ],
      alternatives_considered: [
        {
          processing_operation: "",
          alternative: "Accept a fit-note carrying only start and end dates, with no diagnosis category",
          rejection_reason:
            "Without the diagnosis category the occupational-health physician cannot determine which duties are contraindicated, so the purpose of setting safe duty adjustments would not be achieved at all.",
        },
        {
          processing_operation: "",
          alternative: "Have the treating physician send duty restrictions directly to line management, bypassing occupational health",
          rejection_reason:
            "This does not reduce the intrusion, it widens it: line managers would receive clinical restrictions that presently stop at the occupational-health team, so the alternative would not achieve the purpose with less impact on the employee.",
        },
      ],
      dpo_advice:
        "The DPO advised that the diagnosis category must not be replicated into the HR case-management system and that access be limited to the two named occupational-health physicians; both points were implemented before this assessment was finalised.",
      data_subjects_views_sought: "Yes — views sought",
      data_subjects_views:
        "The works council surveyed 120 employees in March; the principal concern raised was line-management visibility of diagnosis, which the access restriction described above addresses.",
      controller_country: "DE",
      controller_land: "Bavaria",
      controller_sector: "private",
      central_administration_country: "DE",
      // DPIA UPGRADE ITEM 6 — the two structural fields, supplied in full so
      // the attestation deliverables run on the ANALYSED path here (this is
      // the "perfect data" case). The other fixtures deliberately omit them
      // and exercise the record_insufficient degradation.
      dpia_prepared_by:
        "A. Okonjo \u2014 Privacy Counsel (Responsible); Dr. R. Lindqvist \u2014 Occupational-Health Physician (Consulted); D. Dasher \u2014 Data Protection Officer (Accountable)",
      dpia_approved_by_name: "M. Ferrante",
      dpia_approved_by_title: "Managing Director",
      dpia_approval_date: "2026-04-14",
      dpia_signoff_basis:
        "Sections 3 and 4 as reviewed on 12 April 2026, acceptance of two moderate residual risks, and the condition that access to the diagnosis category remains limited to the two named occupational-health physicians.",
    },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*9\\(2\\)\\(h\\)", flags: "i", label: "Art 9(2)(h) selected" },
      { kind: "must_include", pattern: "necessity|proportionality", flags: "i", label: "necessity/proportionality" },
      { kind: "must_include", pattern: "\"intake_field\"", label: "row source.intake_field present" },
      { kind: "must_include", pattern: "\"basis\"\\s*:\\s*\"(stated|inferred)\"", label: "row source.basis is stated|inferred" },
      // DPIA UPGRADE ITEM 6 — presence-only: the two structural fields and the
      // authority exhibit must ship. Content is asserted in the edge suite.
      { kind: "must_include", pattern: "\"assessment_team\"", label: "assessment_team emitted" },
      { kind: "must_include", pattern: "\"validation_approval\"", label: "validation_approval emitted" },
      { kind: "must_include", pattern: "\"attested\"\\s*:\\s*true", label: "attestation on the analysed path" },
      { kind: "must_include", pattern: "\"authority_exhibit\"", label: "authority exhibit emitted" },
    ],
  },
];


// ─── TRULY-PERFECT DPIA FIXTURES ────────────────────────────────────────────
// DPIA_PERFECT holds complete-record cases: every contract key an organisation
// could reasonably fill is filled, so an A/B batch labelled "perfect" grades
// perfect-record WRITING rather than degraded-record behaviour. These cases are
// additive — DPIA_GOLDEN above is unchanged and remains the legacy set.
export const DPIA_PERFECT: GoldenCase[] = [
  {
    id: "dpia-perfect-eu-complete",
    tool: "dpia",
    set: "tuning",
    intake: {
      organization_name: "Helvetia Occupational Health AG",
      processing_activity_name: "Occupational-health absence triage",
      description:
        "Triage of employee sickness-absence certificates by the occupational-health team to schedule return-to-work assessments and adjust duties. All systems are hosted in the controller's Munich data centre; no personal data leaves Germany.",
      purpose:
        "Schedule return-to-work assessments and set temporary duty adjustments for employees on certified sickness absence.",
      data_categories: ["Health or medical data", "Employee records", "Contact details"],
      data_subjects: "Employees of the controller who submit a sickness-absence certificate.",
      volume_frequency: "1,400 employees; roughly 60 certificates per month.",
      jurisdictions: ["EU (GDPR)"],
      legal_basis_proposed: "Legal obligation (Art. 6(1)(c))",
      article_9_condition: "Preventive/occupational medicine, health or social care (Art. 9(2)(h))",
      necessity_proportionality:
        "The occupational-health team needs the certified diagnosis category to set duty adjustments; the processing is intrusive because it exposes an employee's health condition to a team inside their own employer, and employees cannot avoid it if they wish to be paid during absence. That impact on the data subjects is confined by holding the diagnosis category only within the occupational-health team and releasing only a fitness verdict to line management.",
      data_minimisation_justification:
        "Only the diagnosis category, certified dates and prescribed restrictions are recorded; free-text clinical notes are not transcribed into the HR system.",
      retention_period: "18 months from the end of the absence, then deleted.",
      existing_safeguards: [
        "Encryption at rest",
        "Encryption in transit",
        "Access controls",
        "Data minimisation",
        "Pseudonymisation",
        "Staff training",
        "DPA signed with processor",
        "Contractual restrictions",
      ],
      third_party_processors: ["Other: Occupational-health provider (Arbeitsmedizin München GmbH)"],
      reasons_to_conduct: [
        "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
        "Sensitive or highly personal data",
      ],
      alternatives_considered: [
        {
          processing_operation: "",
          alternative: "Accept a fit-note carrying only start and end dates, with no diagnosis category",
          rejection_reason:
            "Without the diagnosis category the occupational-health physician cannot determine which duties are contraindicated, so the purpose of setting safe duty adjustments would not be achieved at all.",
        },
        {
          processing_operation: "",
          alternative: "Have the treating physician send duty restrictions directly to line management, bypassing occupational health",
          rejection_reason:
            "This does not reduce the intrusion, it widens it: line managers would receive clinical restrictions that presently stop at the occupational-health team, so the alternative would not achieve the purpose with less impact on the employee.",
        },
      ],
      dpo_advice:
        "The DPO advised that the diagnosis category must not be replicated into the HR case-management system and that access be limited to the two named occupational-health physicians; both points were implemented before this assessment was finalised.",
      data_subjects_views_sought: "Yes — views sought",
      data_subjects_views:
        "The works council surveyed 120 employees in March; the principal concern raised was line-management visibility of diagnosis, which the access restriction described above addresses.",
      controller_country: "DE",
      controller_land: "Bavaria",
      controller_sector: "private",
      central_administration_country: "DE",
      eu_decision_establishment_country: "DE",
      controller_contact:
        "Helvetia Occupational Health AG, Ridlerstraße 31, 80339 Munich, Germany — privacy@helvetia-oh.example",
      dpo_info: "D. Dasher, Data Protection Officer — dpo@helvetia-oh.example, +49 89 5550 0",
      processor_obligations:
        "Art. 28 data-processing agreement with Arbeitsmedizin München GmbH: processing on documented instructions only, staff confidentiality undertakings, no sub-processors without prior written approval, processing within Germany only, audit rights, and deletion of all case data within 30 days of contract end.",
      processing_version: "2.1",
      estimated_launch_date: "2026-05-01",
      estimated_end_date: "2028-05-01",
      dpia_team:
        "A. Okonjo, Privacy Counsel (lead drafter); Dr. R. Lindqvist and Dr. S. Baumann, occupational-health physicians; H. Vogel, HR systems owner; D. Dasher, Data Protection Officer (advisory).",
      reference_materials:
        "EDPB Guidelines on Data Protection Impact Assessment (WP248 rev.01); BayLDA guidance on employee health data; ISO 27001 certificate of Arbeitsmedizin München GmbH (2025 surveillance audit); internal Occupational-Health Data Handling Standard v3.",
      dpia_scope_note:
        "Covers the triage of sickness-absence certificates for all German sites of the controller. The separate voluntary wellness-app programme is out of scope and is assessed in its own DPIA. This assessment is reviewed every 24 months or on material change; the end date above is the scheduled review boundary, not a termination of the processing.",
      publication_intent: "Internal document; a summary is available to the works council on request.",
      secondary_uses:
        "None. Certificate data is not used for any purpose beyond return-to-work scheduling and duty adjustment; statistical absence reporting uses only aggregated counts that carry no diagnosis category.",
      nature_scope_context:
        "Nature: collection of certified sickness-absence data, structured recording by a physician, access-restricted storage, and scheduled deletion. Scope: about 60 certificates per month across 1,400 employees; the recorded items are the diagnosis category, certified dates, and prescribed restrictions. Context: processing occurs inside an employment relationship with an acknowledged power imbalance; the works council was consulted and its concern about line-management visibility is addressed by the access restriction; all systems are hosted in the Munich data centre and no data leaves Germany.",
      functional_description:
        "A certificate arrives in the occupational-health inbox; a physician records the diagnosis category, certified dates and prescribed restrictions in the occupational-health module; the module issues only a fitness verdict and duty adjustments to the line manager; a scheduled job deletes each case 18 months after the absence ends.",
      supporting_assets:
        "Occupational-health case module of the PersonalSuite HR platform (on-premises, Munich data centre); encrypted document store for certificate scans; clinical system of Arbeitsmedizin München GmbH under the Art. 28 agreement.",
      codes_of_conduct:
        "No approved Art. 40 code of conduct applies. The controller follows the BayLDA employee-health-data guidance, and the processor holds ISO 27001 certification.",
      data_quality_measures:
        "Diagnosis category and dates are entered by a physician from the certificate itself; open absence cases are reconciled quarterly against the HR absence ledger; corrections requested through the occupational-health inbox are applied by the recording physician.",
      data_subject_rights_mechanisms:
        "Access, rectification and erasure requests via privacy@helvetia-oh.example, answered within one month; objection may be raised directly with the DPO or through the works council; an information notice accompanies every certificate acknowledgement.",
      dp_by_design_measures:
        "Diagnosis category held only in the occupational-health module under two named physician accounts; only the fitness verdict is released to line management; scheduling uses pseudonymised case identifiers; an automated job enforces the 18-month deletion; access logs are reviewed quarterly by the DPO.",
      transfer_flows: [],
      retention_record_type: "Retention schedule entry OH-07 in the corporate records-retention register.",
      dpia_prepared_by:
        "A. Okonjo — Privacy Counsel (Responsible); Dr. R. Lindqvist — Occupational-Health Physician (Consulted); D. Dasher — Data Protection Officer (Accountable)",
      dpia_approved_by_name: "M. Ferrante",
      dpia_approved_by_title: "Managing Director",
      dpia_approval_date: "2026-04-14",
      dpia_signoff_basis:
        "Sections 3 and 4 as reviewed on 12 April 2026, acceptance of two moderate residual risks, and the condition that access to the diagnosis category remains limited to the two named occupational-health physicians.",
    },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*9\\(2\\)\\(h\\)", flags: "i", label: "Art 9(2)(h) selected" },
      { kind: "must_include", pattern: "necessity|proportionality", flags: "i", label: "necessity/proportionality" },
      { kind: "must_include", pattern: "\"intake_field\"", label: "row source.intake_field present" },
      { kind: "must_include", pattern: "\"basis\"\\s*:\\s*\"(stated|inferred)\"", label: "row source.basis is stated|inferred" },
      { kind: "must_include", pattern: "\"assessment_team\"", label: "assessment_team emitted" },
      { kind: "must_include", pattern: "\"validation_approval\"", label: "validation_approval emitted" },
      { kind: "must_include", pattern: "\"attested\"\\s*:\\s*true", label: "attestation on the analysed path" },
      { kind: "must_include", pattern: "\"authority_exhibit\"", label: "authority exhibit emitted" },
    ],
  },
  {
    id: "dpia-perfect-uk-complete",
    tool: "dpia",
    set: "tuning",
    intake: {
      organization_name: "Britannia HR Ltd",
      processing_activity_name: "Workforce sentiment analytics",
      description:
        "Weekly aggregate sentiment analysis over internal collaboration-tool posts to detect team-level burnout risk. Individual-level flags are generated only for the two occupational-health advisers; line managers receive team-level trends for teams of eight or more. All processing and hosting are within the United Kingdom.",
      purpose:
        "Detect emerging burnout risk so occupational-health support can be offered early, and rebalance workload at team level.",
      data_categories: ["Employee records", "Communications content", "Health or medical data"],
      data_subjects: "UK-based employees of Britannia HR Ltd (3,000 people).",
      volume_frequency: "3,000 employees; one scoring run per week.",
      jurisdictions: ["United Kingdom (UK GDPR)"],
      legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
      article_9_condition: "Preventive/occupational medicine, health or social care (Art. 9(2)(h))",
      necessity_proportionality:
        "Early detection of burnout requires a signal that is timely and does not depend on self-reporting, which the annual survey cannot provide. The intrusion — inference of a health-adjacent state from workplace posts — is confined by discarding raw text within 48 hours, releasing individual flags only to the two occupational-health advisers, and showing line managers nothing below team level with a minimum team size of eight. The benefit accrues to the employees flagged: an offer of support they would otherwise receive only after absence begins.",
      data_minimisation_justification:
        "Only message metadata and computed sentiment scores are retained; raw post text is discarded within 48 hours of scoring; individual flags carry a pseudonymised identifier resolvable only by the occupational-health advisers.",
      retention_period: "Team-level trends 12 months; individual flags deleted 90 days after the occupational-health case closes.",
      existing_safeguards: [
        "Encryption at rest",
        "Encryption in transit",
        "Access controls",
        "Data minimisation",
        "Pseudonymisation",
        "Staff training",
        "Contractual restrictions",
      ],
      third_party_processors: ["Other: Sentiment-analysis provider (Clearwater Analytics UK Ltd, London)"],
      reasons_to_conduct: [
        "Sensitive or highly personal data",
        "Evaluation or scoring (incl. profiling / prediction)",
        "Data processed on a large scale",
      ],
      alternatives_considered: [
        {
          processing_operation: "",
          alternative: "Rely on the annual engagement survey with a burnout module",
          rejection_reason:
            "The survey is self-reported and annual; burnout risk emerges over weeks. The alternative cannot achieve early detection, which is the purpose.",
        },
        {
          processing_operation: "",
          alternative: "Train line managers to identify burnout in one-to-one meetings without any analytics",
          rejection_reason:
            "Manager judgement is inconsistent across 300 teams and requires the employee to disclose to the very person the power imbalance discourages disclosing to; the alternative does not achieve the purpose with less impact.",
        },
      ],
      dpo_advice:
        "The DPO advised raising the minimum team size for manager-visible trends from five to eight and shortening the raw-text discard window from seven days to 48 hours; both were implemented before launch. The DPO's advice is recorded in section 4 of the assessment file.",
      data_subjects_views_sought: "Yes — views sought",
      data_subjects_views:
        "A staff-forum consultation and a survey of 240 employees in April raised two concerns: manager visibility of individual results, and reuse for performance management. The team-size threshold addresses the first; the annexed purpose-limitation policy, which prohibits use in performance management, discipline or redundancy selection, addresses the second.",
      controller_country: "GB",
      controller_land: "",
      controller_sector: "private",
      central_administration_country: "GB",
      eu_decision_establishment_country: "",
      controller_contact: "Britannia HR Ltd, 40 Finsbury Pavement, London EC2A 1NT — privacy@britanniahr.example",
      dpo_info: "P. Novak, Data Protection Officer — dpo@britanniahr.example, +44 20 7946 0810",
      processor_obligations:
        "UK GDPR Art. 28 agreement with Clearwater Analytics UK Ltd: processing on documented instructions only, UK-only hosting, staff confidentiality, no sub-processors without prior written approval, security measures reviewed annually, deletion of all data within 30 days of contract end.",
      processing_version: "1.3",
      estimated_launch_date: "2026-06-01",
      estimated_end_date: "2027-06-01",
      dpia_team:
        "J. Whitfield, Head of Privacy (lead drafter); Dr. E. Mensah, Occupational-Health Adviser; T. Osei, People Analytics lead; P. Novak, Data Protection Officer (advisory).",
      reference_materials:
        "ICO employment practices guidance; ICO DPIA guidance; EDPB Guidelines on Data Protection Impact Assessment (WP248 rev.01) as persuasive authority; Clearwater Analytics ISO 27001 certificate; internal Workforce Analytics Purpose-Limitation Policy v2 (annexed).",
      dpia_scope_note:
        "Covers the twelve-month workforce sentiment analytics pilot for UK employees on the internal collaboration platform. Email, telephone and non-UK subsidiaries are out of scope. The pilot ends on the end date above, when this assessment is re-run before any continuation.",
      publication_intent: "Internal document; a summary is shared with the staff forum.",
      secondary_uses:
        "None. The annexed purpose-limitation policy prohibits use of any output for performance management, discipline, or redundancy selection, and output separation enforces it: the systems that hold sentiment outputs expose no interface to HR case management.",
      nature_scope_context:
        "Nature: automated scoring of collaboration-tool posts, aggregation to team level, restricted individual flagging, scheduled deletion. Scope: 3,000 employees, one weekly run, roughly 400,000 posts scored per week, raw text held under 48 hours. Context: an employment relationship with an acknowledged power imbalance; the staff forum was consulted twice; individual outputs reach only the two occupational-health advisers; the processing is a pilot with a fixed end date and a re-assessment gate.",
      functional_description:
        "The collaboration platform's export API delivers posts to Clearwater's scoring service in its London data centre; scores return to the People Analytics workspace where raw text is deleted within 48 hours; team-level trends (teams of eight or more) render on the manager dashboard; individual-level flags route only to the occupational-health case system; deletion jobs enforce the 90-day and 12-month limits.",
      supporting_assets:
        "Internal collaboration platform export API; Clearwater Analytics scoring service (London data centre); People Analytics workspace; occupational-health case system; manager dashboard.",
      codes_of_conduct:
        "No approved UK GDPR code of conduct applies. The controller follows the ICO employment practices guidance; the processor holds ISO 27001 certification.",
      data_quality_measures:
        "Model output is benchmarked quarterly against the engagement-survey burnout module; the occupational-health advisers review every individual flag before any outreach, and false positives are recorded and fed back to the quarterly model review; employees can correct team-assignment errors through the privacy portal.",
      data_subject_rights_mechanisms:
        "Access, rectification and erasure via the employee privacy portal, answered within one month; objection is honoured by excluding the individual from individual-level flagging while their posts continue to count only toward team aggregates; the transparency notice was issued to all staff before launch and is linked from the collaboration platform.",
      dp_by_design_measures:
        "Pseudonymised identifiers throughout the scoring pipeline; raw-text discard within 48 hours; minimum team size of eight for any manager-visible output; role separation between People Analytics and occupational health; access logging with monthly review; automated deletion enforcing both retention limits.",
      transfer_flows: [],
      retention_record_type: "Retention schedule reference HR-22 (workforce analytics) in the corporate retention register.",
      dpia_prepared_by:
        "J. Whitfield — Head of Privacy (Responsible); Dr. E. Mensah — Occupational-Health Adviser (Consulted); P. Novak — Data Protection Officer (Accountable)",
      dpia_approved_by_name: "S. Cartwright",
      dpia_approved_by_title: "Chief People Officer",
      dpia_approval_date: "2026-05-20",
      dpia_signoff_basis:
        "Sections 3 and 4 as reviewed on 18 May 2026, acceptance of one moderate residual risk (small-team re-identification, mitigated by the minimum team size of eight), and the condition that the purpose-limitation policy is reviewed annually.",
    },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*9\\(2\\)\\(h\\)", flags: "i", label: "Art 9(2)(h) selected" },
      { kind: "must_include", pattern: "necessity|proportionality", flags: "i", label: "necessity/proportionality" },
      { kind: "must_include", pattern: "\"intake_field\"", label: "row source.intake_field present" },
      { kind: "must_include", pattern: "\"basis\"\\s*:\\s*\"(stated|inferred)\"", label: "row source.basis is stated|inferred" },
      { kind: "must_include", pattern: "\"assessment_team\"", label: "assessment_team emitted" },
      { kind: "must_include", pattern: "\"validation_approval\"", label: "validation_approval emitted" },
      { kind: "must_include", pattern: "\"attested\"\\s*:\\s*true", label: "attestation on the analysed path" },
      { kind: "must_include", pattern: "\"authority_exhibit\"", label: "authority exhibit emitted" },
    ],
  },
];
