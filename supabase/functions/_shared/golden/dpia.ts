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
];
