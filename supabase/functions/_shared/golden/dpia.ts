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
    },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*9\\(2\\)\\(h\\)", flags: "i", label: "Art 9(2)(h) selected" },
      { kind: "must_include", pattern: "necessity|proportionality", flags: "i", label: "necessity/proportionality" },
      { kind: "must_include", pattern: "\"intake_field\"", label: "row source.intake_field present" },
      { kind: "must_include", pattern: "\"basis\"\\s*:\\s*\"(stated|inferred)\"", label: "row source.basis is stated|inferred" },
    ],
  },
];

