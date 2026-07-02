// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer (what facts satisfy the law, what answer "passes").
// goodAnswer examples are clearly fictional and illustrate FORM, never a template.
// Voice: imperative, active, plain subject-verb-object, one idea per sentence,
// specific over vague, no ornamental legalese. Layered: coachLead = one line an
// expert acts on instantly; goodAnswer/commonMistake = the expansion for newer users.

// src/components/governance/GovernanceRailEntries.ts
// StatuteRail entries for the Privacy Governance Assessment.
// Governance's intake is entirely enumerated — no coaching authored (goodAnswer stays false in intakePolicy).
// regulationText is drawn verbatim from the ingested GDPR corpus where retrievable;
// entries prefixed "Summary — " are paraphrases pending verified corpus text.

import type { RailEntry } from "@/components/intake/RailEntry";

const GDPR_URL = "https://eur-lex.europa.eu/eli/reg/2016/679/oj";

export const GOVERNANCE_RAIL: Record<string, RailEntry> = {
  jurisdictions: {
    fieldLabel: "Where you operate and whose data you process",
    citation: "GDPR Art. 3",
    citationUrl: GDPR_URL,
    plainSummary: "Territorial scope: GDPR applies to EU-established processing and to offering goods/services to, or monitoring, people in the EU.",
    regulationText: "Summary — Territorial scope: GDPR applies to EU-established processing and to offering goods/services to, or monitoring, people in the EU.",
  },
  euUkData: {
    fieldLabel: "EU/UK personal data",
    citation: "GDPR Art. 3 · UK GDPR Art. 3",
    citationUrl: GDPR_URL,
    plainSummary: "Whether EU or UK personal data is in scope determines which regime's obligations the assessment tests.",
    regulationText: "Summary — Whether EU or UK personal data is in scope determines which regime's obligations the assessment tests.",
  },
  tools: {
    fieldLabel: "Processing tools and vendors",
    citation: "GDPR Art. 28",
    citationUrl: GDPR_URL,
    plainSummary: "Vendors processing personal data on your behalf are processors; Art. 28 requires a binding contract with mandatory terms.",
    regulationText: "Summary — Vendors processing personal data on your behalf are processors; Art. 28 requires a binding contract with mandatory terms.",
  },
  toolInstruction: {
    fieldLabel: "Processor instructions",
    citation: "GDPR Art. 29",
    citationUrl: GDPR_URL,
    plainSummary: "Persons acting under the authority of the controller or processor may process personal data only on the controller's instructions, unless required by Union or Member State law.",
    regulationText: "The processor and any person acting under the authority of the controller or of the processor, who has access to personal data, shall not process those data except on instructions from the controller, unless required to do so by Union or Member State law.",
  },
  dataCategories: {
    fieldLabel: "Categories of personal data",
    citation: "GDPR Art. 5(1)(c)",
    citationUrl: GDPR_URL,
    plainSummary: "Data minimisation: personal data must be adequate, relevant and limited to what is necessary for the purposes.",
    regulationText: "Personal data shall be: … adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed ('data minimisation').",
  },
  specialCategory: {
    fieldLabel: "Special-category data",
    citation: "GDPR Art. 9",
    citationUrl: GDPR_URL,
    plainSummary: "Processing special categories is prohibited unless an Art. 9(2) condition applies, in addition to an Art. 6 basis.",
    regulationText: "Summary — Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited, unless one of the conditions in Art. 9(2) applies.",
  },
  privacyPolicy: {
    fieldLabel: "Privacy policy status",
    citation: "GDPR Art. 12",
    citationUrl: GDPR_URL,
    plainSummary: "Transparent information, communication and modalities for the exercise of the rights of the data subject.",
    regulationText: "The controller shall take appropriate measures to provide any information referred to in Articles 13 and 14 and any communication under Articles 15 to 22 and 34 relating to processing to the data subject in a concise, transparent, intelligible and easily accessible form, using clear and plain language, in particular for any information addressed specifically to a child.",
  },
  privacyNoticeCoverage: {
    fieldLabel: "Notice coverage",
    citation: "GDPR Arts. 13–14",
    citationUrl: GDPR_URL,
    plainSummary: "Art. 13 governs information given when data is collected from the person; Art. 14 where personal data have not been obtained from the data subject.",
    regulationText: "Summary — Art. 13 governs information given when data is collected from the person; Art. 14 where personal data have not been obtained from the data subject.",
  },
  acceptableUse: {
    fieldLabel: "Internal data-use rules",
    citation: "GDPR Art. 24",
    citationUrl: GDPR_URL,
    plainSummary: "The controller must implement appropriate technical and organisational measures to ensure and to be able to demonstrate that processing is performed in accordance with the Regulation.",
    regulationText: "Taking into account the nature, scope, context and purposes of processing as well as the risks of varying likelihood and severity for the rights and freedoms of natural persons, the controller shall implement appropriate technical and organisational measures to ensure and to be able to demonstrate that processing is performed in accordance with this Regulation. Those measures shall be reviewed and updated where necessary.",
  },
  dpoStatus: {
    fieldLabel: "Data Protection Officer",
    citation: "GDPR Art. 37(1)",
    citationUrl: GDPR_URL,
    plainSummary: "A DPO is mandatory in the Art. 37(1) cases (public authority; large-scale regular and systematic monitoring; large-scale special-category processing).",
    regulationText: "Summary — The controller and the processor shall designate a data protection officer in any case where: (a) the processing is carried out by a public authority or body; (b) the core activities of the controller or the processor consist of processing operations which, by virtue of their nature, their scope and/or their purposes, require regular and systematic monitoring of data subjects on a large scale; or (c) the core activities of the controller or the processor consist of processing on a large scale of special categories of data pursuant to Article 9 or of personal data relating to criminal convictions and offences referred to in Article 10.",
  },
  dpiaStatus: {
    fieldLabel: "DPIA practice",
    citation: "GDPR Art. 35(1), (3)",
    citationUrl: GDPR_URL,
    plainSummary: "A DPIA is required where processing is likely to result in a high risk; Art. 35(3) gives examples and is not exhaustive.",
    regulationText: "Where a type of processing in particular using new technologies, and taking into account the nature, scope, context and purposes of the processing, is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data.",
  },
  dpiaAiCoverage: {
    fieldLabel: "DPIA coverage of AI/automated processing",
    citation: "GDPR Art. 35(3)(a)",
    citationUrl: GDPR_URL,
    plainSummary: "Systematic and extensive automated evaluation producing legal or similarly significant effects is an enumerated DPIA trigger.",
    regulationText: "Summary — A data protection impact assessment referred to in paragraph 1 shall in particular be required in the case of: (a) a systematic and extensive evaluation of personal aspects relating to natural persons which is based on automated processing, including profiling, and on which decisions are based that produce legal effects concerning the natural person or similarly significantly affect the natural person.",
  },
  incidentResponse: {
    fieldLabel: "Breach response readiness",
    citation: "GDPR Arts. 33–34",
    citationUrl: GDPR_URL,
    plainSummary: "Notify the supervisory authority without undue delay and where feasible within 72 hours of becoming AWARE of a breach; Art. 34 governs telling affected individuals.",
    regulationText: "Summary — In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority competent in accordance with Article 55, unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons.",
  },
  trainingStatus: {
    fieldLabel: "Staff data-protection training",
    citation: "GDPR Art. 32(4)",
    citationUrl: GDPR_URL,
    plainSummary: "Anyone acting under the controller's or processor's authority must not process personal data except on instructions — training operationalises this.",
    regulationText: "The controller and processor shall take steps to ensure that any natural person acting under the authority of the controller or the processor who has access to personal data does not process them except on instructions from the controller, unless he or she is required to do so by Union or Member State law.",
  },
  dpaStatus: {
    fieldLabel: "Processor contracts (DPAs)",
    citation: "GDPR Art. 28(3)",
    citationUrl: GDPR_URL,
    plainSummary: "The processor contract must contain the Art. 28(3) mandatory terms (documented instructions, confidentiality, security, sub-processing, assistance, deletion/return, audit).",
    regulationText: "Summary — Processing by a processor shall be governed by a contract or other legal act under Union or Member State law, that is binding on the processor with regard to the controller and that sets out the subject-matter and duration of the processing, the nature and purpose of the processing, the type of personal data and categories of data subjects and the obligations and rights of the controller, and stipulates in particular the eight matters listed in Art. 28(3)(a)–(h).",
  },
  transferStatus: {
    fieldLabel: "International transfers",
    citation: "GDPR Ch. V, Arts. 44–46",
    citationUrl: GDPR_URL,
    plainSummary: "Transfers outside the EEA require an Art. 45 adequacy decision or Art. 46 safeguards (SCCs, BCRs).",
    regulationText: "Summary — Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with by the controller and processor (Art. 44). Transfers may take place on the basis of an adequacy decision (Art. 45) or, in its absence, appropriate safeguards (Art. 46).",
  },
  transferMechanism: {
    fieldLabel: "Transfer mechanism in use",
    citation: "GDPR Arts. 45–46",
    citationUrl: GDPR_URL,
    plainSummary: "The mechanism relied on must match the transfer leg — including the EU–US Data Privacy Framework (Commission Implementing Decision (EU) 2023/1795) for certified US importers; verify current certification status at dataprivacyframework.gov.",
    regulationText: "Summary — A transfer of personal data to a third country or an international organisation may take place where the Commission has decided that the third country ensures an adequate level of protection (Art. 45). In the absence of such a decision, a controller or processor may transfer personal data only if the controller or processor has provided appropriate safeguards, and on condition that enforceable data subject rights and effective legal remedies for data subjects are available (Art. 46).",
  },
  technicalControls: {
    fieldLabel: "Technical security controls",
    citation: "GDPR Art. 32(1)",
    citationUrl: GDPR_URL,
    plainSummary: "Security appropriate to the risk, considering the state of the art, costs, and the nature, scope, context and purposes of the processing.",
    regulationText: "Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk.",
  },
  dsrCapability: {
    fieldLabel: "Data-subject request handling",
    citation: "GDPR Arts. 12(3), 15–22",
    citationUrl: GDPR_URL,
    plainSummary: "Requests must be answered without undue delay and within one month, extendable by two for complex or numerous requests.",
    regulationText: "The controller shall provide information on action taken on a request under Articles 15 to 22 to the data subject without undue delay and in any event within one month of receipt of the request. That period may be extended by two further months where necessary, taking into account the complexity and number of the requests.",
  },
  inventoryAudit: {
    fieldLabel: "Records of processing",
    citation: "GDPR Art. 30",
    citationUrl: GDPR_URL,
    plainSummary: "Controllers (and processors) must maintain records of processing activities with the Art. 30 minimum contents.",
    regulationText: "Summary — Each controller and, where applicable, the controller's representative, shall maintain a record of processing activities under its responsibility, containing the information enumerated in Art. 30(1)(a)–(g).",
  },
};
