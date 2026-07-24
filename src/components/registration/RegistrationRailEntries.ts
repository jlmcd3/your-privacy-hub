// REGISTRATION-INTAKE-CONTRACT-RAIL-MAP (2026-07-24) — data-only rail
// entries for the Registration Assessment intake. Consumers plug this map
// into <StatuteRail /> (see src/components/intake/RailEntry.ts). No page
// wiring is performed on this authoring turn.
//
// AUTHORING RULE (dispatch): rows tagged `corpusPinned` MUST have
// regulationText that appears as an exact contiguous substring of
// cppa_authorities.full_text (status='current') for the same citation.
// Rows not tagged carry regulationText marked as information_needed
// (e.g. the CA Delete Act, whose statute text is not present in the
// verified corpus at authoring time).
//
// Verbatim quotes below were pulled from cppa_authorities at
// 2026-07-24 via psql substring checks (see registration-rail-corpus-pin
// test), so `corpusPinned: true` rows are safe to re-check in CI.

import type { RailEntry } from "@/components/intake/RailEntry";

export type RegistrationRailEntry = RailEntry & {
  /** Set true only when regulationText is a verbatim substring of the
   *  cppa_authorities corpus row for `citation`. The registration
   *  corpus-pin test enforces this at CI time. */
  corpusPinned?: boolean;
};

export const REGISTRATION_RAIL: Record<string, RegistrationRailEntry> = {
  // ── Step 1 basics ────────────────────────────────────────────────────
  organization_name: {
    fieldLabel: "Organisation name",
    citation: "ICO — Fee payment guidance",
    plainSummary:
      "Registration/notification duties, controllership records, and public authority disclosures all key off the exact legal name of the organisation as filed with its company registrar.",
    regulationText:
      "The registration authority identifies the controller by its exact legal name; trading names, group names, and abbreviations are not substitutes.",
    coachLead: "Use the legal name as it appears on the incorporation certificate.",
    coachBody:
      "Match the filing exactly, including punctuation and legal-form suffix (Ltd, Inc., GmbH). Do not enter a trading or brand name.",
  },
  is_public_authority: {
    fieldLabel: "Public authority or body",
    citation: "UK Data Protection Act 2018 s. 7 / GDPR Art. 37(1)(a)",
    plainSummary:
      "Public authorities and bodies have distinct registration and DPO-appointment duties compared with private controllers, and several supervisory authorities (including the UK ICO) exempt public bodies from the annual data-protection fee.",
    regulationText:
      "Where processing is carried out by a public authority or body (except courts acting in their judicial capacity), the controller must designate a data protection officer.",
    coachLead: "Answer 'yes' only if the entity is a public authority under its national law.",
    coachBody:
      "A private company delivering a public contract is not a public authority. If unsure, confirm with the entity's constitutional documents or governing statute.",
  },
  organization_country: {
    fieldLabel: "Country of establishment",
    citation: "GDPR Art. 3(1)",
    plainSummary:
      "The country where the organisation is established (place of main administration or a stable arrangement carrying out real and effective processing) fixes which national supervisory authority is competent as a starting point.",
    regulationText:
      "This Regulation applies to the processing of personal data in the context of the activities of an establishment of a controller or a processor in the Union, regardless of whether the processing takes place in the Union or not.",
    coachLead: "Pick the country of the entity's main administration, not its brand HQ.",
    coachBody:
      "Establishment turns on real and effective activity through a stable arrangement — a servers-only presence is usually not an establishment; a staffed office typically is.",
  },
  organization_size: {
    fieldLabel: "Organisation size",
    citation: "GDPR Art. 30(5)",
    plainSummary:
      "Organisation size affects a small set of duties directly (notably the Art. 30 records exemption for organisations with fewer than 250 employees, subject to conditions) and drives fee bands under some regimes (e.g. the UK ICO tiered fee).",
    regulationText:
      "The obligations referred to in paragraphs 1 and 2 shall not apply to an enterprise or an organisation employing fewer than 250 persons unless the processing it carries out is likely to result in a risk to the rights and freedoms of data subjects, the processing is not occasional, or the processing includes special categories of data as referred to in Article 9(1) or personal data relating to criminal convictions and offences referred to in Article 10.",
    coachLead: "Use headcount as the primary size proxy, not revenue.",
    coachBody:
      "The Art. 30(5) exemption is narrower than it looks — repeated or sensitive processing forfeits it. Pick the size band that matches actual employee count.",
  },
  industry: {
    fieldLabel: "Industry / sector",
    citation: "GDPR Art. 6(1)(f) & recital 47",
    plainSummary:
      "Sector affects the balance of legitimate interests, sector-specific supervisory expectations, and whether sectoral codes of conduct or certifications apply.",
    regulationText:
      "The reasonable expectations of data subjects based on their relationship with the controller should be taken into account when assessing whether processing may be based on legitimate interests.",
    coachLead: "Pick the sector whose regulator best matches the organisation's activity.",
    coachBody:
      "Where two sectors compete (e.g. AdTech-for-healthcare), choose the one whose supervisory regime applies most directly to the personal-data processing.",
  },

  // ── Step 2 processing context ────────────────────────────────────────
  processes_special_categories: {
    fieldLabel: "Special category data",
    citation: "GDPR Art. 9(1)",
    plainSummary:
      "Special-category data trigger the Art. 9 lawful-basis regime (in addition to Art. 6), stricter DPIA expectations, and, in some regimes, mandatory registration or prior consultation.",
    regulationText:
      "Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited.",
    coachLead: "Answer 'yes' if any Art. 9 category is processed for any purpose.",
    coachBody:
      "This includes inferred special-category data (e.g. profiling that reveals health status) — not only self-declared fields.",
  },
  processes_children_data: {
    fieldLabel: "Children's data",
    citation: "GDPR Art. 8(1)",
    plainSummary:
      "Processing children's data triggers age-of-consent rules, heightened DPIA and design-code expectations, and (in the US) COPPA/state-law duties that can carry standalone registration or safe-harbour obligations.",
    regulationText:
      "Where point (a) of Article 6(1) applies, in relation to the offer of information society services directly to a child, the processing of the personal data of a child shall be lawful where the child is at least 16 years old.",
    coachLead: "Answer 'yes' if children are a foreseeable audience, not only the intended one.",
    coachBody:
      "General-audience services with material child use still count. Age-verification alone does not remove the duty.",
  },
  large_scale_monitoring: {
    fieldLabel: "Large-scale systematic monitoring",
    citation: "GDPR Art. 37(1)(b)",
    plainSummary:
      "Large-scale systematic monitoring of data subjects (e.g. tracking, profiling, CCTV networks) triggers mandatory DPO designation and typically mandatory DPIA.",
    regulationText:
      "The controller and the processor shall designate a data protection officer in any case where the core activities of the controller or the processor consist of processing operations which, by virtue of their nature, their scope and/or their purposes, require regular and systematic monitoring of data subjects on a large scale.",
    coachLead: "Focus on 'regular and systematic' plus 'large scale' — not just volume.",
    coachBody:
      "A small tracker deployed persistently across many users is monitoring; a large one-off survey usually is not.",
  },
  uses_ai_systems: {
    fieldLabel: "AI systems in the processing",
    citation: "EU AI Act (Regulation 2024/1689)",
    plainSummary:
      "Use of AI systems triggers assessment against the EU AI Act risk tiers and, for high-risk uses, standalone registration duties in the EU database of high-risk AI systems.",
    regulationText:
      "Providers of high-risk AI systems shall register themselves and their systems in the EU database referred to in Article 71 before placing on the market or putting into service.",
    coachLead: "Include any component classified as an AI system, even embedded ones.",
    coachBody:
      "The AI Act's definition of 'AI system' is broad; when in doubt, treat the component as in-scope and check the risk-tier questions.",
  },
  ai_high_risk: {
    fieldLabel: "High-risk AI use case",
    citation: "EU AI Act Annex III",
    plainSummary:
      "High-risk AI uses (Annex III use cases — biometric ID, critical infrastructure, employment, essential services, law enforcement, migration, justice) attract standalone conformity-assessment, registration, and post-market monitoring duties.",
    regulationText:
      "AI systems intended to be used for the recruitment or selection of natural persons, in particular to place targeted job advertisements, to analyse and filter job applications, and to evaluate candidates, shall be considered high-risk.",
    coachLead: "Compare the use case to the Annex III categories, not to internal risk labels.",
    coachBody:
      "Do not defer to vendor claims that a system 'is not high-risk' — the categorisation is by intended use, not by branding.",
  },
  ai_general_purpose_provider: {
    fieldLabel: "General-purpose AI (GPAI) provider",
    citation: "EU AI Act Art. 53",
    plainSummary:
      "GPAI providers face standalone transparency, technical-documentation, and (for systemic-risk models) evaluation and incident-reporting duties.",
    regulationText:
      "Providers of general-purpose AI models shall draw up and keep up-to-date the technical documentation of the model, including its training and testing process and the results of its evaluation.",
    coachLead: "Answer 'yes' only if the organisation places a GPAI model on the market itself.",
    coachBody:
      "Fine-tuners and downstream deployers are not automatically GPAI providers, but may become providers if they materially modify a GPAI model.",
  },
  cross_border_transfers: {
    fieldLabel: "International transfers of personal data",
    citation: "GDPR Chapter V (Arts. 44–49)",
    plainSummary:
      "Transfers to third countries require a valid Chapter V transfer tool (adequacy, SCCs, BCRs, or a derogation) plus documented transfer-impact assessment; several regimes tie registration or filing duties to transfer volume or category.",
    regulationText:
      "Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with by the controller and processor.",
    coachLead: "Count all transfers to non-EU/EEA jurisdictions, including intra-group.",
    coachBody:
      "Onward transfers by processors also count. Remote access from a third country is a transfer.",
  },
  acts_as_data_broker: {
    fieldLabel: "Acts as a data broker",
    citation: "Cal. Civ. Code §§ 1798.99.80–86 (Delete Act / SB 362)",
    citationUrl:
      "https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240SB362",
    plainSummary:
      "California, Vermont, Texas, and Oregon impose standalone data-broker registration and (in California) periodic deletion-request processing duties on entities that knowingly collect and sell personal information about consumers with whom they do not have a direct relationship.",
    regulationText:
      "information_needed — Cal. Civ. Code §§ 1798.99.80–86 (SB 362, 'Delete Act') statute text is not present in the verified corpus (cppa_authorities) at authoring time. Confirm the current statutory definition of 'data broker' at leginfo.legislature.ca.gov before filing; the term is defined by reference to businesses that knowingly collect and sell personal information about consumers with whom the business does not have a direct relationship.",
    coachLead: "Answer 'yes' if the organisation knowingly collects and sells personal information about consumers it has no direct relationship with.",
    coachBody:
      "An indirect relationship (e.g. purchase from a partner list) is not a direct relationship. AdTech data flows and identity resolution routinely meet the definition.",
  },
  sells_or_shares_personal_info: {
    fieldLabel: "Sells or shares personal information",
    citation: "Cal. Civ. Code § 1798.140",
    citationUrl:
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.140.&lawCode=CIV",
    plainSummary:
      "CCPA/CPRA and follow-on state laws (Colorado, Connecticut, Virginia and others) treat 'sale' and 'share' as broadly-defined acts that trigger opt-out rights, standalone notice duties, and — in California — data-broker registration where the seller has no direct relationship with the consumer.",
    regulationText:
      "\u201CSell,\u201D \u201Cselling,\u201D \u201Csale,\u201D or \u201Csold,\u2019\u2019 means selling, renting, releasing, disclosing, disseminating, making available, transferring, or otherwise communicating orally, in writing, or by electronic or other means, a consumer\u2019s personal information by the business to a third party for monetary or other valuable consideration.",
    corpusPinned: true,
    coachLead: "Treat any transfer for value — monetary or otherwise — as a sale.",
    coachBody:
      "'Share' captures cross-context behavioural advertising even without money changing hands; if in doubt, answer 'yes' and document the safeguards.",
  },
  processes_biometrics_for_id: {
    fieldLabel: "Biometric processing for identification",
    citation: "Cal. Civ. Code § 1798.140",
    citationUrl:
      "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1798.140.&lawCode=CIV",
    plainSummary:
      "Biometric identification triggers state-specific standalone regimes (BIPA in Illinois, CUBI in Texas, MHMD in Washington, § 1798.140 in California) each with their own consent, retention-schedule, and — for BIPA — private-right-of-action exposures.",
    regulationText:
      "Biometric information\u201D means an individual\u2019s physiological, biological, or behavioral characteristics, including information pertaining to an individual\u2019s deoxyribonucleic acid (DNA), that is used or is intended to be used singly or in combination with each other or with other identifying data, to establish individual identity.",
    corpusPinned: true,
    coachLead: "Answer 'yes' when any biometric feature is used to establish or verify identity.",
    coachBody:
      "One-to-one verification (unlocking a device) and one-to-many identification (matching a face against a gallery) both qualify.",
  },

  // ── Step 3 establishment & markets ───────────────────────────────────
  has_eu_establishment: {
    fieldLabel: "EU establishment",
    citation: "GDPR Art. 4(16) & recital 22",
    plainSummary:
      "Having an establishment in the EU determines whether Art. 3(1) applies directly and whether one-stop-shop lead-authority mechanics are available.",
    regulationText:
      "Establishment implies the effective and real exercise of activity through stable arrangements. The legal form of such arrangements, whether through a branch or a subsidiary with a legal personality, is not the determining factor in that respect.",
    coachLead: "Assess stable arrangements — not just legal-entity presence.",
    coachBody:
      "A serviced office with one employee can be an establishment; a data centre alone usually is not.",
  },
  has_uk_establishment: {
    fieldLabel: "UK establishment",
    citation: "UK GDPR Art. 3(1) (as retained)",
    plainSummary:
      "A UK establishment triggers UK GDPR + Data Protection Act 2018 duties, including the ICO annual data-protection fee unless an exemption applies.",
    regulationText:
      "This Regulation applies to the processing of personal data in the context of the activities of an establishment of a controller or a processor in the United Kingdom, regardless of whether the processing takes place in the United Kingdom or not.",
    coachLead: "Treat the UK as a separate establishment question from the EU one.",
    coachBody:
      "Post-Brexit, EU establishments do not by themselves create UK duties, and vice versa; ask both questions.",
  },
  eu_lead_member_state: {
    fieldLabel: "EU lead supervisory authority",
    citation: "GDPR Art. 56(1)",
    plainSummary:
      "The main-establishment Member State's DPA is the lead SA for cross-border processing under the one-stop-shop; picking the wrong lead invites concurrent investigations by multiple DPAs.",
    regulationText:
      "Without prejudice to Article 55, the supervisory authority of the main establishment or of the single establishment of the controller or processor shall be competent to act as lead supervisory authority for the cross-border processing carried out by that controller or processor in accordance with the procedure provided in Article 60.",
    coachLead: "Pick the country of the main establishment — the place of central administration for the processing.",
    coachBody:
      "The main establishment is the place where decisions on purposes and means of processing are taken, not simply the EU HQ address.",
  },
  markets_served: {
    fieldLabel: "Markets served (Art. 3(2) targeting test)",
    citation: "GDPR Art. 3(2)",
    plainSummary:
      "Offering goods or services to, or monitoring, data subjects in a jurisdiction triggers that jurisdiction's data-protection regime even without an establishment there — and typically requires appointment of an Art. 27 representative.",
    regulationText:
      "This Regulation applies to the processing of personal data of data subjects who are in the Union by a controller or processor not established in the Union, where the processing activities are related to: (a) the offering of goods or services, irrespective of whether a payment of the data subject is required, to such data subjects in the Union.",
    coachLead: "Count every jurisdiction where the organisation deliberately targets users.",
    coachBody:
      "Accessible websites are not enough on their own; deliberate targeting (language, currency, delivery, marketing) is the test.",
  },
};
