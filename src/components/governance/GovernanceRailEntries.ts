// GOVERNANCE UPGRADE (ITEM 4) — ICO Data Protection Audit Framework
// (Oct 2024) template guidance for the governance intake rail.
//
// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer, and it never directs the answer on THIS form. Worked
// examples are clearly fictional and illustrate FORM only.
//
// ICO DISCIPLINE — the ICO Audit Framework toolkits and trackers are drafting
// guidance for the organisation's own accountability record. They are not
// authority: nothing here is cited as a legal basis, and the corpus resolver
// (governance-corpus.ts) never accepts an ICO reference as a pinned citation.
// Statutory text reaches the rail byte-exact through useGdprRailEntry.

import type { RailEntry } from "@/components/intake/RailEntry";

const ICO_SOURCE_LABEL = "ICO Data Protection Audit Framework (Oct 2024)";
const ICO_SOURCE_URL =
  "https://ico.org.uk/for-organisations/advice-and-services/audits/data-protection-audit-framework/";

// ── Governance Intake Master Review (2026-09-15) — field-level rail ────────
// Citation targets shared across the field-level entries below (F07/F11).
const EU_GDPR_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679";
const UK_GDPR_URL = "https://www.legislation.gov.uk/eur/2016/679/contents";
const EDPB_DPO_URL =
  "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-data-protection-officers-dpos_en";
// ICO's right-to-be-informed page carries its own banner: "Due to changes
// made by the Data (Use and Access) Act, this guidance is under review and
// may be subject to change." (checked 2026-09-16). Any entry citing it notes
// that in its plainSummary rather than presenting the page as settled.
const ICO_RTBI_URL =
  "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/";

// Verbatim GDPR text used by the field-level entries below. Each string was
// checked against the operative EU wording (eur-lex / gdpr-info.eu mirror)
// during the 2026-09-15 review; where a string quotes less than the full
// paragraph it is marked regulationTextKind: "excerpt" at its use site.
const ART_3_1_2 =
  "This Regulation applies to the processing of personal data in the context of the activities of an establishment of a controller or a processor in the Union, regardless of whether the processing takes place in the Union or not. This Regulation applies to the processing of personal data of data subjects who are in the Union by a controller or processor not established in the Union, where the processing activities are related to: (a) the offering of goods or services, irrespective of whether a payment of the data subject is required, to such data subjects in the Union; or (b) the monitoring of their behaviour as far as their behaviour takes place within the Union.";
const ART_3_2 =
  "This Regulation applies to the processing of personal data of data subjects who are in the Union by a controller or processor not established in the Union, where the processing activities are related to: (a) the offering of goods or services, irrespective of whether a payment of the data subject is required, to such data subjects in the Union; or (b) the monitoring of their behaviour as far as their behaviour takes place within the Union.";
const ART_4_1_PERSONAL_DATA =
  "Any information relating to an identified or identifiable natural person ('data subject'); an identifiable natural person is one who can be identified, directly or indirectly, in particular by reference to an identifier such as a name, an identification number, location data, an online identifier or to one or more factors specific to the physical, physiological, genetic, mental, economic, cultural or social identity of that natural person.";
const ART_9_1 =
  "Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person's sex life or sexual orientation shall be prohibited.";
const ART_37_1_ABC =
  "The controller and the processor shall designate a data protection officer in any case where: (a) the processing is carried out by a public authority or body, except for courts acting in their judicial capacity; (b) the core activities of the controller or the processor consist of processing operations which, by virtue of their nature, their scope and/or their purposes, require regular and systematic monitoring of data subjects on a large scale; or (c) the core activities of the controller or the processor consist of processing on a large scale of special categories of data pursuant to Article 9 or personal data relating to criminal convictions and offences referred to in Article 10.";
const ART_13_1_CHAPEAU =
  "Where personal data relating to a data subject are collected from the data subject, the controller shall, at the time when personal data are obtained, provide the data subject with all of the following information:";
const ART_14_3 =
  "The controller shall provide the information referred to in paragraphs 1 and 2: (a) within a reasonable period after obtaining the personal data, but at the latest within one month, having regard to the specific circumstances in which the personal data are processed; (b) if the personal data are to be used for communication with the data subject, at the latest at the time of the first communication to that data subject; or (c) if a disclosure to another recipient is envisaged, at the latest when the personal data are first disclosed.";
const ART_35_1 =
  "Where a type of processing in particular using new technologies, and taking into account the nature, scope, context and purposes of the processing, is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data.";
const ART_33_1_2 =
  "In the case of a personal data breach, the controller shall without undue delay and, where feasible, not later than 72 hours after having become aware of it, notify the personal data breach to the supervisory authority competent in accordance with Article 55, unless the personal data breach is unlikely to result in a risk to the rights and freedoms of natural persons. The processor shall notify the controller without undue delay after becoming aware of a personal data breach.";
// Excerpt: omits Art. 12(3)'s closing sentence on the electronic-means
// delivery format, which is not relevant to the timing point this quote is
// used for.
const ART_12_3_TIMING =
  "The controller shall provide information on action taken on a request under Articles 15 to 22 to the data subject without undue delay and in any event within one month of receipt of the request. That period may be extended by two further months where necessary, taking into account the complexity and number of the requests. The controller shall inform the data subject of any such extension within one month of receipt of the request, together with the reasons for the delay.";
const ART_5_2 =
  "The controller shall be responsible for, and be able to demonstrate compliance with, paragraph 1 ('accountability').";
// Excerpt: a single lettered sub-point of Art. 30(1)'s record-contents list.
const ART_30_1_F =
  "where possible, the envisaged time limits for erasure of the different categories of data;";
const ART_32_4 =
  "The controller and processor shall take steps to ensure that any natural person acting under the authority of the controller or the processor who has access to personal data does not process them except on instructions from the controller, unless he or she is required to do so by Union or Member State law.";
const ART_32_1_CHAPEAU =
  "Taking into account the state of the art, the costs of implementation and the nature, scope, context and purposes of processing as well as the risk of varying likelihood and severity for the rights and freedoms of natural persons, the controller and the processor shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including inter alia as appropriate:";
const ART_24_1 =
  "Taking into account the nature, scope, context and purposes of processing as well as the risks of varying likelihood and severity for the rights and freedoms of natural persons, the controller shall implement appropriate technical and organisational measures to ensure and to be able to demonstrate that processing is performed in accordance with this Regulation. Those measures shall be reviewed and updated where necessary.";
const ART_28_3_CHAPEAU =
  "Processing by a processor shall be governed by a contract or other legal act under Union or Member State law, that is binding on the processor with regard to the controller and that sets out the subject-matter and duration of the processing, the nature and purpose of the processing, the type of personal data and categories of data subjects and the obligations and rights of the controller.";

/**
 * Keyed by governance intake step (1–5) plus the remediation-default fields
 * added by this upgrade. Merged over the live Art.-resolved rail entry in
 * GovernanceAssessment.tsx, which supplies the verbatim statutory text.
 */
export const GOVERNANCE_RAIL: Record<string, RailEntry> = {
  step1_scope: {
    fieldLabel: "Territorial scope and processing footprint",
    citation: "GDPR Art. 3 · Art. 5(2)",
    plainSummary:
      "Scope answers set the perimeter every later finding is measured inside. The accountability standard runs across everything inside that perimeter.",
    regulationText: "…",
    coachLead: "Describe the footprint by where the people are, not where the company sits.",
    coachBody:
      "Give jurisdictions, categories of individuals, and the systems that touch them as separate dimensions. A perimeter stated at one level of detail cannot be tested at another.",
    goodAnswer:
      "A fictional courier with no EU entity records EU consignee data across three member states and one monitoring platform — three dimensions, each stated separately.",
    commonMistake:
      "Recording a head-office country as if it were the processing footprint. The two answer different questions.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Accountability toolkit — scope of the privacy programme",
      guidance:
        "The ICO accountability toolkit opens by fixing the scope of the programme: which entities, jurisdictions and processing operations the record covers. Record each as its own line so the tracker can be reviewed operation by operation.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  step2_records: {
    fieldLabel: "Data categories, special categories and the record of processing",
    citation: "GDPR Art. 30 · Art. 9",
    plainSummary:
      "The record of processing is the evidence base. Categories recorded loosely produce findings that cannot be tested against Art. 30(1)(a)–(g).",
    regulationText: "…",
    coachLead: "List categories as they exist in the systems, including derived ones.",
    coachBody:
      "Separate the categories held from the categories inferred, and keep special categories distinct from ordinary ones. The Art. 30 element walk reads each dimension separately.",
    goodAnswer:
      "A fictional retailer records order history and support transcripts, and separately records a derived 'mobility-aid buyer' segment as a health-revealing inference.",
    commonMistake:
      "Recording only the fields on an intake form. Inferences and enrichment data are processing too, and they belong in the same record.",
    templateGuidance: {
      sectionRef: "Records management and security",
      sectionTitle: "Records of processing tracker — Art. 30 element coverage",
      guidance:
        "The ICO records tracker walks the record element by element: purposes, categories of individuals, categories of data, recipients, transfers, retention and security measures. An element left blank is reported as an unmet element rather than inferred from another.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  step3_dpo: {
    fieldLabel: "DPO designation, position and tasks",
    citation: "GDPR Arts. 37–39",
    plainSummary:
      "Designation, position and tasks are three separate duties. A record that answers only the first cannot demonstrate the other two.",
    regulationText: "…",
    coachLead: "Answer designation, independence and tasks as three separate facts.",
    coachBody:
      "Say who holds the role, who they report to, what other duties they hold, and what resources they have. Each of those is a different question in the Art. 38 analysis.",
    goodAnswer:
      "A fictional insurer records a named DPO reporting to the board, with a second role in claims operations flagged for conflict review — designation and position answered separately.",
    commonMistake:
      "Treating a job title as the whole answer. Arts. 38–39 test reporting lines, resourcing and conflicting duties, not nomenclature.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "DPO tracker — designation, independence, resourcing, tasks",
      guidance:
        "The ICO accountability tracker records the DPO across four dimensions: appointment, reporting line, resources, and the tasks actually performed. Recording them separately is what lets the position be reviewed rather than assumed.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  step4_measures: {
    fieldLabel: "Technical and organisational measures, training and review",
    citation: "GDPR Art. 24 · Art. 32",
    plainSummary:
      "Art. 24 asks whether measures are calibrated to the nature, scope, context and purposes of the processing — and whether they are reviewed and updated.",
    regulationText: "…",
    coachLead: "Record what is running today, and when it was last reviewed.",
    coachBody:
      "State the measure, its coverage, and the date of last review as three separate facts. A measure with no review date cannot support the review-and-update limb.",
    goodAnswer:
      "A fictional lab records endpoint encryption across all managed devices, annual role-based training with tracked completion, and a last review date — coverage and currency both stated.",
    commonMistake:
      "Recording an approved policy as an implemented measure. Art. 24 tests what is in operation and kept current.",
    templateGuidance: {
      sectionRef: "Training and awareness",
      sectionTitle: "Training and measures tracker — coverage, currency, evidence",
      guidance:
        "The ICO training and awareness toolkit records coverage (who receives it), currency (when it was last delivered or reviewed) and evidence (how completion is demonstrated). The tracker treats these as three columns, not one narrative.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  step5_processors: {
    fieldLabel: "Processor contracts and international transfers",
    citation: "GDPR Art. 28 · Chapter V",
    plainSummary:
      "Each processor and each transfer route is a separate duty. Coverage is counted, not generalised from the largest vendor.",
    regulationText: "…",
    coachLead: "Answer from a counted vendor list, not from the main supplier.",
    coachBody:
      "Give the number of processors, how many hold contracts, and the transfer routes with their mechanisms. Counting is what turns an impression into a record.",
    goodAnswer:
      "A fictional publisher records eleven processors, nine with signed contracts, and two transfer routes each mapped to a named mechanism — counted, then attributed.",
    commonMistake:
      "Generalising from the primary cloud provider. The duty attaches per processor and per transfer route.",
    templateGuidance: {
      sectionRef: "Records management and security",
      sectionTitle: "Processor and transfer tracker — per-vendor coverage",
      guidance:
        "The ICO tracker records processors one row per vendor, with contract status and transfer route on the same row. Per-row recording is what allows a partial-coverage finding instead of a single programme-level verdict.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  // ── Remediation defaults (new intake fields on this upgrade) ────────────
  remediation_default_owner: {
    fieldLabel: "Who is accountable for remediation?",
    citation: "GDPR Art. 5(2) · Art. 24(1)",
    plainSummary:
      "An action with no named owner cannot be tracked, and an untracked action cannot demonstrate accountability.",
    regulationText: "…",
    coachLead: "Name a role that exists on the org chart, not a committee.",
    coachBody:
      "One accountable role per default, stated the way it appears internally. A shared owner in the record becomes an unowned action in practice.",
    goodAnswer:
      "A fictional charity records 'Head of Information Governance' — a single standing role a reviewer can locate months later.",
    commonMistake:
      "Recording a department. Accountability lands on a role that can be asked for the update.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Remediation tracker — accountable owner column",
      guidance:
        "Every ICO tracker row carries an accountable owner. The framework treats an owner-less action as an open risk rather than a plan.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  remediation_default_target_date: {
    fieldLabel: "Default target date for remediation",
    citation: "GDPR Art. 24(1)",
    plainSummary:
      "A default date gives every generated action a review horizon; individual actions can still carry their own.",
    regulationText: "…",
    coachLead: "Give a real calendar date, not a duration.",
    coachBody:
      "A date the organisation can be held to, aligned to an existing planning cycle. Durations drift; dates are testable.",
    goodAnswer:
      "A fictional co-operative records the end of its next audit cycle as the default horizon — one fixed date, applied consistently.",
    commonMistake:
      "Recording an open-ended horizon. Without a date the review-and-update limb of Art. 24 has nothing to test.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Remediation tracker — target date column",
      guidance:
        "The ICO tracker pairs each action with a target date so progress can be reviewed at a set point rather than on discovery.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  remediation_default_priority: {
    fieldLabel: "Default remediation priority",
    citation: "GDPR Art. 24(1)",
    plainSummary:
      "Priority is a sequencing aid for the organisation's own plan. It is a management label, never a statutory severity.",
    regulationText: "…",
    coachLead: "Set the default that reflects normal cadence, not the worst case.",
    coachBody:
      "The default applies to every generated action; individual findings can be raised above it. A default set at the extreme flattens the ordering it is meant to create.",
    goodAnswer:
      "A fictional manufacturer records a middle default and reserves the top band for actions its risk committee escalates — the ordering stays usable.",
    commonMistake:
      "Reading a priority label as a legal severity. It orders work; it does not grade compliance.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Remediation tracker — priority column",
      guidance:
        "The ICO tracker records priority purely to sequence work. The framework keeps it distinct from any assessment of whether a requirement is met.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },

  remediation_default_validation_method: {
    fieldLabel: "How will remediation be validated?",
    citation: "GDPR Art. 5(2) · Art. 24(1)",
    plainSummary:
      "Validation is the evidence step: how completion will be demonstrated, distinct from the action itself.",
    regulationText: "…",
    coachLead: "Say what artefact will prove the action was done.",
    coachBody:
      "Name the evidence and who reviews it. 'Completed' asserts; an artefact and a reviewer demonstrate.",
    goodAnswer:
      "A fictional university records that its internal audit team samples the tracker each quarter and retains the sampling note — evidence plus reviewer.",
    commonMistake:
      "Recording self-attestation as validation. Art. 5(2) turns on demonstrability, which needs something a reviewer can inspect.",
    templateGuidance: {
      sectionRef: "Accountability and governance",
      sectionTitle: "Remediation tracker — validation and assurance column",
      guidance:
        "The ICO tracker closes each row with how completion is assured — the artefact retained and the function that checks it.",
      sourceLabel: ICO_SOURCE_LABEL,
      sourceUrl: ICO_SOURCE_URL,
    },
  },
};

/** Step-indexed view used by the governance intake rail. */
export const GOVERNANCE_RAIL_BY_STEP: Record<number, RailEntry> = {
  1: GOVERNANCE_RAIL.step1_scope,
  2: GOVERNANCE_RAIL.step2_records,
  3: GOVERNANCE_RAIL.step3_dpo,
  4: GOVERNANCE_RAIL.step4_measures,
  5: GOVERNANCE_RAIL.step5_processors,
};

// ── Field-level rail entries (Governance Intake Master Review, F07) ───────
// Keyed by the buildIntake() payload key (src/pages/GovernanceAssessment.tsx)
// so a future field-focus handler can select field-specific guidance instead
// of only the step-level fallback in GOVERNANCE_RAIL_BY_STEP above. Four
// review-named keys do not exist verbatim in buildIntake; the actual payload
// key is used instead and noted here:
//   "special_categories" (review)      -> special_categories_list (payload)
//   "core_activity" (review)           -> sc_core_activity (payload)
//   "inventory_status" (review)        -> inventory_audit (payload)
//   "data_submission_instruction" (review) -> tool_instruction (payload)
const GOVERNANCE_RAIL_FIELDS: Record<string, RailEntry> = {
  organization_name: {
    fieldLabel: "Organisation being assessed",
    citation: "GDPR Art. 3 — assessment scope",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "The legal entity whose privacy programme this assessment evaluates. GDPR obligations attach to the controller or processor entity actually carrying out the processing, not automatically to its parent group.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A named operating subsidiary, not its parent holding company, is usually the entity whose processing decisions the rest of the assessment describes — unless the group itself genuinely makes those decisions.",
    commonMistake:
      "Naming a parent or group brand when a different subsidiary is the actual controller or processor for the processing being assessed.",
    coachLead: "Name the entity whose decisions and systems the rest of this assessment actually describes.",
    coachBody:
      "State a single legal entity, not a group brand, unless the group itself makes the relevant processing decisions.",
  },

  sector: {
    fieldLabel: "Primary sector",
    citation: "Assessment risk context",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "The sector of the operations being assessed sets the risk context later findings are weighed against; it is not itself a GDPR classification.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "Where more than one sector materially affects the assessment — for example a retailer that also operates a health clinic — naming the closest single sector and describing the rest separately keeps both accurate.",
    commonMistake:
      "Selecting a sector that describes only part of the operation while leaving a materially different activity unrecorded anywhere in the assessment.",
    coachLead: "Pick the closest sector, and put anything it can't capture elsewhere.",
    coachBody:
      "A single selection cannot describe every activity. Note materially different lines of business separately rather than letting the sector choice imply more than it can.",
  },

  org_size: {
    fieldLabel: "Number of employees",
    citation: "Assessment context — not a DPO test",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Headcount describes the organisation being assessed. GDPR does not set a headcount threshold for whether a DPO, a DPIA, or any other accountability measure is required; those tests turn on the processing itself.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A ten-person organisation whose core activity is large-scale health-data processing can meet the Art. 37(1)(c) test on the same facts as a thousand-person organisation with the same processing; headcount does not decide it either way.",
    commonMistake:
      "Treating a small headcount as proof that no accountability obligation applies, or a large headcount as proof that one does, instead of testing the processing itself.",
    coachLead: "State headcount as a fact about the organisation, not as an answer to any legal test.",
    coachBody:
      "Employee count helps describe the organisation. It does not by itself establish or rule out any GDPR obligation.",
  },

  jurisdictions: {
    fieldLabel: "Jurisdictions where you operate or process personal data",
    citation: "GDPR Art. 3 — territorial scope",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "GDPR's territorial scope is not limited to where an organisation is established. It also reaches organisations with no EU establishment at all where they offer goods or services to, or monitor the behaviour of, people in the Union.",
    regulationText: ART_3_1_2,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 3(1)-(2) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A retailer incorporated outside the EU that ships to French customers and runs EU-targeted advertising is in scope under Art. 3(2) even with no EU office; the test is the offering and monitoring, not incorporation or residence.",
    commonMistake:
      "Answering from where the organisation is incorporated or headquartered rather than from where the affected people are, and what the organisation does in relation to them.",
    coachLead: "Answer from where the data subjects and the relevant activity are, not from where the company is incorporated.",
    coachBody:
      "List every jurisdiction where an establishment, offering, or monitoring fact actually exists. Unlisted regimes belong in Additional context, not in a guess.",
  },

  eu_uk_data: {
    fieldLabel: "Do you process personal data of EU or UK residents?",
    citation: "GDPR Art. 3(2) — extra-territorial scope",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Offering goods or services to people in the EU or UK, or monitoring their behaviour, can bring an organisation into scope regardless of where it is established. Residence of the data subject is one relevant fact; it is not, by itself, a complete territorial-scope test.",
    regulationText: ART_3_2,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 3(2) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "An organisation with no EU or UK establishment that runs a website targeted at EU/UK customers and fulfils their orders is answering a question about offering and monitoring facts, not only about where its data subjects happen to live.",
    commonMistake:
      "Treating this as settled purely by data-subject residence, without checking whether an establishment, offering, or monitoring fact under Art. 3 is also present.",
    coachLead: "Answer the factual question, then check it against establishment, offering, and monitoring facts separately.",
    coachBody:
      "Residence of the people concerned is relevant but not conclusive. Record uncertainty here rather than guessing if the underlying facts have not been checked.",
  },

  tools: {
    fieldLabel: "Technology tools that process personal data",
    citation: "Processing inventory",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Each tool that processes personal data is part of the processing the rest of the assessment describes, whether centrally procured or adopted by an individual team.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A tool adopted informally by one team without going through procurement still processes personal data if it does so — its absence from a central inventory does not remove it from the assessment.",
    commonMistake:
      "Listing only centrally sanctioned tools and omitting ones adopted informally, which leaves part of the actual processing unrecorded.",
    coachLead: "List what actually touches personal data, not only what was formally approved.",
    coachBody:
      "Include every tool actually in use, and identify any known gap in coverage rather than presenting a partial list as complete.",
  },

  data_categories: {
    fieldLabel: "Categories of personal data processed",
    citation: "GDPR Art. 4(1) — personal data",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Personal data includes information relating to an identified or identifiable natural person, including data a system derives or infers, not only fields collected directly on a form.",
    regulationText: ART_4_1_PERSONAL_DATA,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 4(1) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "A fictional retailer records order history and support transcripts, and separately records a derived 'frequent-returns' segment — the inferred segment is processing personal data just as much as the underlying order record.",
    commonMistake:
      "Recording only the fields visible on an intake form and omitting inferred or enrichment data that also relates to an identifiable person.",
    coachLead: "List categories as they exist in the systems, including ones the systems derive.",
    coachBody:
      "Separate categories actually held from categories inferred, and keep special categories distinct from ordinary ones.",
  },

  special_category: {
    fieldLabel: "Do you process health, biometric, or other special category data?",
    citation: "GDPR Art. 9(1) — special categories",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Processing that reveals a special category is prohibited unless one of the Art. 9(2) conditions applies. Data can reveal a special category through inference, not only through an explicit field asking for it, and biometric data is defined by the purpose of unique identification, not by the data type alone.",
    regulationText: ART_9_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 9(1) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "A wellness app that never asks a medical question can still process health data if the sleep and heart-rate metrics it collects reveal information about a person's health.",
    commonMistake:
      "Answering only from what a form explicitly asks for, and not checking whether held or derived data reveals a special category by inference.",
    coachLead: "Check what the data reveals, including by inference, against the Art. 9 list.",
    coachBody:
      "Biometric data is special-category only where it is processed for the purpose of uniquely identifying a person; do not infer special-category status from the label alone. Record uncertainty rather than guessing.",
  },

  // Review key "special_categories" -> payload key "special_categories_list".
  special_categories_list: {
    fieldLabel: "Which special categories?",
    citation: "GDPR Art. 9(1) — special categories",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Each special category listed in Art. 9(1) is a distinct basis for the prohibition; a data set can reveal more than one at once.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A single record can reveal both health data and religious belief at once — for example dietary requirements recorded for both medical and religious reasons — and both should be recorded, not just the first one noticed.",
    commonMistake:
      "Selecting only the most obvious special category and overlooking a second one the same data also reveals.",
    coachLead: "Select every category the data actually reveals, not just the most obvious one.",
    coachBody:
      "If the fixed list does not fully describe the data, explain the gap in Additional context rather than forcing an inexact fit.",
  },

  // Review key "core_activity" -> payload key "sc_core_activity".
  sc_core_activity: {
    fieldLabel: "Is this special-category processing a core activity?",
    citation: "GDPR Art. 37(1)(b)-(c) — core activities",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "'Core activities' is not limited to an organisation's headline business description. Processing that is inextricably part of delivering an organisation's principal products or services can be a core activity even where it is not itself that organisation's headline activity; an ancillary function such as internal payroll or IT support is not a core activity merely because the organisation is large.",
    regulationText: ART_37_1_ABC,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 37(1) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "A hospital's core activity is providing healthcare, but the health-record processing needed to deliver that care is inextricably part of the same core activity, not an ancillary support function, even though the hospital's mission statement never mentions data processing.",
    commonMistake:
      "Treating 'core activity' as equivalent only to the organisation's marketed business description, and missing that closely and necessarily connected processing can be core even when it is not the headline activity.",
    coachLead: "Judge the actual activity and its connection to delivery, not the department name or mission statement.",
    coachBody:
      "Ask whether the processing is a principal activity or so bound up with delivering the principal service that the service could not be delivered without it. Use Uncertain and explain why if the facts are not established.",
  },

  sc_data_subjects_count: {
    fieldLabel: "Approximately how many individuals does this involve per year?",
    citation: "EDPB DPO guidelines — large-scale factors",
    citationUrl: EDPB_DPO_URL,
    plainSummary:
      "The EDPB's guidelines on Data Protection Officers identify the number of data subjects concerned as one of several factors relevant to whether special-category processing is 'large scale' for the Art. 37(1)(c) designation test; it is not itself a fixed statutory threshold.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A count of the distinct individuals affected in a year is more informative for this factor than a count of records, since the same person can appear in many records.",
    commonMistake:
      "Supplying a record count instead of a count of distinct individuals, or guessing a number rather than leaving the field blank and explaining the gap.",
    coachLead: "Count distinct individuals, not records, and say how you estimated it.",
    coachBody:
      "State the period and population the count covers. If unknown, leave it blank and explain in Additional context how the count could be established, rather than inventing a figure.",
  },

  sc_population_proportion: {
    fieldLabel: "Is that a significant proportion of the relevant population?",
    citation: "EDPB DPO guidelines — large-scale factors",
    citationUrl: EDPB_DPO_URL,
    plainSummary:
      "Proportion of a relevant population is one lens on the number-of-data-subjects factor the EDPB's DPO guidelines describe as relevant to the 'large scale' test; it depends on an identified comparison population, not a number viewed in isolation.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "The same count of individuals can be a large share of a small regional customer base or a negligible share of a national one; the population being compared against has to be named for the proportion to mean anything.",
    commonMistake:
      "Giving a Yes/No/Unsure answer without identifying what population it was measured against.",
    coachLead: "Name the population you are comparing against before answering the proportion.",
    coachBody:
      "State the denominator and how it was estimated in Additional context or the core-activity explanation. Use Unsure where the comparison has not actually been made.",
  },

  sc_data_volume: {
    fieldLabel: "What volume and range of special-category data is involved?",
    citation: "EDPB DPO guidelines — large-scale factors",
    citationUrl: EDPB_DPO_URL,
    plainSummary:
      "Volume and range of data items processed is one of the factors the EDPB's DPO guidelines describe as relevant to whether processing is 'large scale'; a small number of highly detailed records and a large number of minimal records answer this factor differently.",
    regulationText: "",
    goodAnswerKind: "example",
    goodAnswer:
      "A description that distinguishes a complete clinical record including diagnoses and prescriptions from a single yes/no vaccination-status flag gives this factor something to actually test, whereas 'health data' alone does not.",
    commonMistake:
      "Describing only the category of data (for example 'health data') without describing how much of it, or how detailed it is, per individual.",
    coachLead: "Describe both how much data and how detailed it is, not only its category.",
    coachBody:
      "State material differences in volume or detail across groups or services, and note where the range is not fully known.",
  },

  sc_duration: {
    fieldLabel: "How long does the processing run?",
    citation: "EDPB DPO guidelines — large-scale factors",
    citationUrl: EDPB_DPO_URL,
    plainSummary:
      "Duration or permanence of the processing activity is one of the factors the EDPB's DPO guidelines describe as relevant to the 'large scale' test.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "Processing that runs continuously for as long as a relationship lasts answers this factor differently from a single one-off collection, even where the data categories involved are otherwise identical.",
    commonMistake:
      "Selecting a duration pattern that does not match the actual processing merely to move past the question, rather than describing a mixed or unknown pattern.",
    coachLead: "Select the pattern that actually describes the processing, not the one that is easiest to answer.",
    coachBody:
      "Explain a mixed, finite, or unknown duration in Additional context rather than forcing it into a single category.",
  },

  sc_geographic_scope: {
    fieldLabel: "What is the geographical scope of the processing?",
    citation: "EDPB DPO guidelines — large-scale factors",
    citationUrl: EDPB_DPO_URL,
    plainSummary:
      "Geographical extent of the processing activity is one of the factors the EDPB's DPO guidelines describe as relevant to the 'large scale' test; it concerns where the processing activity itself reaches, not only where the organisation's headquarters sits.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A processing activity run from a single national office can still have a broader geographical scope if the individuals whose data it processes are spread across several countries.",
    commonMistake:
      "Answering based on the location of the organisation's offices rather than the actual reach of the processing activity.",
    coachLead: "Describe where the processing activity reaches, not where the organisation is based.",
    coachBody:
      "Name the countries or regions involved in Additional context where that level of detail matters. If the extent is unknown, record that rather than defaulting to a smaller scope.",
  },

  privacy_policy: {
    fieldLabel: "Documented privacy policy or notice",
    citation: "GDPR Art. 13(1) — direct-collection timing",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Article 13 governs information given when personal data are collected directly from the data subject; it requires the listed information at the time of collection. A different timing rule under Art. 14 applies where data are obtained from another source (see the notice-coverage question).",
    regulationText: ART_13_1_CHAPEAU,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 13(1) GDPR (verbatim, chapeau)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A notice reviewed two years ago that still accurately describes today's processing is answering a different question from a notice reviewed last month that omits a tool adopted since. Currency of review and accuracy of content are two separate facts.",
    commonMistake:
      "Treating recency of review alone as proof of accuracy, or an older review date alone as proof the notice is wrong, without checking either against actual current processing.",
    coachLead: "Check accuracy against current processing, and record when it was last checked.",
    coachBody:
      "State the review status the evidence actually supports. A defined review band used by this assessment is a product criterion for testing currency, not a universal GDPR expiry rule.",
  },

  privacy_notice_coverage: {
    fieldLabel: "Does your notice describe all current processing, recipients, transfers, retention, and rights?",
    citation: "GDPR Arts. 13-14 — transparency information",
    citationUrl: ICO_RTBI_URL,
    plainSummary:
      "Article 13 sets a single timing rule for data collected directly from the data subject: at the time the data are obtained. Article 14(3) sets a different timing rule for data obtained from another source: within a reasonable period and at the latest within one month, or at first communication with the data subject, or at first disclosure to another recipient, whichever occurs first. Both routes require the source of the data to be disclosed where it was not collected from the data subject, alongside the other listed information. The ICO's guidance on the right to be informed is under review following the Data (Use and Access) Act 2025 and may change.",
    regulationText: ART_14_3,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 14(3) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A notice that covers recipients and retention accurately but has not been updated for a tool adopted last quarter answers Partial, not Yes, because Arts. 13-14 list each information element separately and a gap in one does not average out against accuracy in the others.",
    commonMistake:
      "Treating substantial accuracy across most listed elements as equivalent to full coverage, when a single missing element such as a new recipient or transfer route leaves that element unmet.",
    coachLead: "Check every listed element separately against current processing, recipients, and tools.",
    coachBody:
      "Choose Partial or Unsure where the evidence is incomplete, and identify which specific element is missing rather than giving one overall impression.",
  },

  dpo_status: {
    fieldLabel: "Is a data protection officer or equivalent designated?",
    citation: "GDPR Art. 37(1) — DPO designation",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Designation is mandatory under any one of three separate limbs: public-authority processing, large-scale regular and systematic monitoring as a core activity, or large-scale special-category or criminal-offence processing as a core activity. Each limb has its own test; headcount is not itself a designation criterion under any of them. Position, independence, and resourcing (Arts. 38-39) are separate questions from designation itself.",
    regulationText: ART_37_1_ABC,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 37(1)(a)-(c) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "An ad-tech firm whose product is behavioural tracking can meet the large-scale-monitoring limb; a small bakery that happens to run CCTV for security is answering a different, ancillary-activity question even though both use similar-sounding technology.",
    commonMistake:
      "Checking only one limb (most often the special-category limb) and concluding no DPO is required without separately testing the public-authority and large-scale-monitoring limbs, or treating a job title alone as satisfying the position and independence requirements of Arts. 38-39.",
    coachLead: "Test each of the three limbs separately, then test position and independence apart from designation.",
    coachBody:
      "Record which limb, if any, applies and why, and note reporting line, independence, resourcing, and any conflicting duties as separate facts from the designation decision itself.",
  },

  dpia_status: {
    fieldLabel: "Has any data protection impact assessment been conducted?",
    citation: "GDPR Art. 35(1) — DPIA trigger",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "A DPIA is required, prior to the processing, where a type of processing is likely to result in a high risk to the rights and freedoms of natural persons, taking into account its nature, scope, context and purposes. Whether one is required depends on the processing and the risk it presents; it is not decided by staff headcount alone.",
    regulationText: ART_35_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 35(1) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "Two organisations of very different sizes running the same high-risk processing face the same DPIA trigger; two organisations of the same size running processing of different risk can face different answers.",
    commonMistake:
      "Treating the absence of a DPIA as automatically a breach, or a small organisation's size as automatically ruling one out, instead of testing the processing and its likely risk.",
    coachLead: "Check whether a DPIA is required: this depends on the processing and likely risk, not staff headcount alone.",
    coachBody:
      "Count completed DPIAs within the assessment's scope, not planned ones, and use Unsure where records are incomplete rather than guessing either way.",
  },

  dpia_ai_coverage: {
    fieldLabel: "Do those assessments cover your current AI and high-risk tools?",
    citation: "GDPR Art. 35(1) — DPIA scope and currency",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "A DPIA properly carried out before a tool's launch is not, by itself, evidence that the tool is uncovered; what matters is whether the assessment's scope, the tool's actual use, and any material change since are still aligned. A DPIA dated before a tool was adopted is not, on its own, a coverage failure.",
    regulationText: ART_35_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 35(1) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "An assessment written before a tool's deployment, whose stated scope and risk analysis still match how the tool is actually used today, covers that tool; the same assessment would not cover a materially different later use it never analysed.",
    commonMistake:
      "Concluding a tool is uncovered from its assessment's date alone, without checking the assessment's actual scope, version, and whether the tool's use has materially changed since.",
    coachLead: "Compare assessed scope and version against actual deployment and any material change, not just the date.",
    coachBody:
      "Explain partial coverage or uncertain records rather than inferring a gap from timing alone.",
  },

  incident_response: {
    fieldLabel: "Incident response plan covering personal data breaches",
    citation: "GDPR Art. 33(1)-(2) — breach notification",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "The controller's notification duty runs from awareness, applies without undue delay and, where feasible, within 72 hours, and does not apply where the breach is unlikely to result in a risk to the rights and freedoms of natural persons. A processor's separate duty is to notify the controller without undue delay after becoming aware of a breach. Neither duty is triggered merely because an organisation processes EU or UK data; the facts of the breach and its risk decide it.",
    regulationText: ART_33_1_2,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 33(1)-(2) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A tested plan that has actually run a breach exercise in the last year answers a different question from an untested plan that exists only as a document; both can be truthfully described, but they support different conclusions about whether the 72-hour clock could actually be met.",
    commonMistake:
      "Treating any personal-data incident as automatically notifiable regardless of its actual risk, or treating an untested plan as equivalent to a tested one.",
    coachLead: "Assess whether the facts trigger notification and the applicable deadline.",
    coachBody:
      "State the actual documented and tested capability, including testing dates and scope, rather than the capability the plan describes on paper.",
  },

  dsr_capability: {
    fieldLabel: "If someone asked for their data, could you find it, hand it over, or delete it?",
    citation: "GDPR Art. 12(3) — response timing",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "The controller must act on a data-subject-rights request without undue delay and within one month of receipt; that period may be extended by two further months where necessary given the request's complexity or number, provided the data subject is told of the extension and the reasons within one month of receipt. Availability of a right also depends on the conditions and exceptions applicable to that right.",
    regulationText: ART_12_3_TIMING,
    regulationTextKind: "excerpt",
    regulationTextHeading: "Art. 12(3) GDPR (excerpt)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A written procedure that has never actually been run end-to-end, including coordination with vendors that hold copies of the same data, answers a different question from a process that has been tested that way.",
    commonMistake:
      "Treating a written procedure as equivalent to a tested capability, or overlooking data held by vendors and cloud tools when assessing whether a request could actually be fulfilled.",
    coachLead: "Assess actual, tested capability across every system and vendor that holds the data, not the written procedure alone.",
    coachBody:
      "Record gaps and uncertainty; the conditions and exceptions applicable to each right still need case-by-case review before any request is answered.",
  },

  dsr_rights_tested: {
    fieldLabel: "Which rights have you tested end-to-end?",
    citation: "GDPR Art. 12(3) — response timing",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Testing one right end-to-end, from receipt through verification and completion, does not establish that a different listed right has also been tested; each is a separate process with its own conditions.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "Testing erasure end-to-end, including checking that vendor copies were actually removed, is a different fact from testing access, even where both draw on the same underlying data map.",
    commonMistake:
      "Inferring that all four listed rights were tested from a single general procedure, or from having tested only one of them.",
    coachLead: "Select only the specific rights actually tested end-to-end, not the ones a general procedure implies.",
    coachBody:
      "State the test date, scope, and evidence for each right claimed, and note any other right tested that the fixed list does not name.",
  },

  // Review key "inventory_status" -> payload key "inventory_audit".
  inventory_audit: {
    fieldLabel: "Is your processing inventory audited, with an approval route for new tools?",
    citation: "GDPR Art. 5(2) — accountability",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "The controller is responsible for, and must be able to demonstrate, compliance with the data-protection principles; a record of processing and a route for approving new tools before they touch personal data are part of how that demonstration is maintained. Inventory existence, auditing against reality, and approval of new tools are three separable facts.",
    regulationText: ART_5_2,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 5(2) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "An inventory that lists tools but is never checked against what staff actually use answers a different question from one that is both accurate and gated by an approval step before a new tool is adopted.",
    commonMistake:
      "Selecting the option closest to 'yes' when only one of the three facts — existence, auditing, approval — is actually true, rather than describing the mixed state.",
    coachLead: "Treat existence, auditing against reality, and new-tool approval as three separate facts.",
    coachBody:
      "Explain a mixed state, such as an audited inventory without a formal approval route, rather than rounding up to the closest option.",
  },

  retention_schedule_status: {
    fieldLabel: "Are retention periods documented for each category of personal data?",
    citation: "GDPR Art. 30(1)(f) — records of processing",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "The record of processing must state, where possible, the envisaged time limits for erasure of each category of data. The 'where possible' qualification means the record should reflect the actual factual position, not a period invented to complete the form.",
    regulationText: ART_30_1_F,
    regulationTextKind: "excerpt",
    regulationTextHeading: "Art. 30(1)(f) GDPR (excerpt)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A record that states a documented period for some categories and honestly marks the rest as not yet determined is more useful, and more accurate, than one that assigns an unverified period to every category just to select 'Yes'.",
    commonMistake:
      "Recording an estimated or invented retention period for a category where none has actually been decided, rather than recording the gap.",
    coachLead: "Record the actual documented position for each category, including any gap.",
    coachBody:
      "Select Partial or Unsure where coverage is incomplete or unverified, and identify which categories still lack a documented period.",
  },

  training_status: {
    fieldLabel: "Privacy and data protection training",
    citation: "GDPR Art. 32(4) — instruction duty",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Article 32(4) requires the controller to take steps ensuring that anyone acting under its authority who accesses personal data does so only on its instructions. It is an instruction duty, not itself a training mandate; training is one common way organisations satisfy it, but the statute does not fix a training format or schedule.",
    regulationText: ART_32_4,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 32(4) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "Onboarding training plus tracked annual refreshers reaching every data-touching role answers a different question from a policy document that was circulated once and never followed up, even though both could be called 'training' in casual conversation.",
    commonMistake:
      "Counting an approved training policy or slide deck as evidence of delivered training, when Art. 32(4) is tested by what staff actually received and process on, not by what a document says should happen.",
    coachLead: "Explain how staff receive and follow data-processing instructions, including relevant training.",
    coachBody:
      "Answer on coverage and cadence together: who actually received the material, and how often. Distinguish delivered training from a planned programme.",
  },

  training_ai_coverage: {
    fieldLabel: "Does training cover prohibited use of AI tools and data-submission risk?",
    citation: "GDPR Art. 32(4) — instruction duty",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "General data-handling training and training that specifically names AI tools and the data staff must not submit to them answer different questions; Art. 32(4)'s instruction duty is only evidenced by material that actually addresses the risk being asked about.",
    regulationText: ART_32_4,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 32(4) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A confidentiality module that never mentions AI tools by name answers 'generally covers data handling', not 'explicitly covers AI tools', even if staff who took it would also, in practice, be more careful.",
    commonMistake:
      "Selecting the AI-specific option because a general training programme exists, without checking whether the material actually names AI tools and the submission risk.",
    coachLead: "Check what the material actually names, not what a general programme implies.",
    coachBody:
      "Select General only where the AI-specific and data-submission risks are not explicitly covered, and Unsure where the material has not been checked.",
  },

  // Review key "data_submission_instruction" -> payload key "tool_instruction".
  tool_instruction: {
    fieldLabel: "Instruction on what data may and may not be submitted to external technology tools",
    citation: "GDPR Art. 32(4) — instruction duty",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Article 32(4) requires the controller to ensure that anyone processing personal data under its authority does so only on its instructions. A written prohibition that names specific data and tools evidences that instruction differently from unwritten verbal guidance, and both are different again from no instruction at all.",
    regulationText: ART_32_4,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 32(4) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A written policy that names the specific categories staff must not paste into an external chat tool is something a reviewer could be shown; a general instruction to 'be careful with data' is not the same evidenced fact even if it was actually said.",
    commonMistake:
      "Equating verbal guidance that was actually given with having no instruction at all, or equating an unwritten expectation with a documented policy.",
    coachLead: "Show a brief example of a specific submission rule and where staff can find it.",
    coachBody:
      "Distinguish a written policy with specific prohibitions from verbal guidance that was actually given. If instructions vary by team or tool, explain that rather than picking one answer for all of them.",
  },

  technical_controls: {
    fieldLabel: "Do technical controls stop prohibited personal data reaching AI and cloud tools?",
    citation: "GDPR Art. 32(1) — security of processing",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Article 32(1) requires appropriate technical and organisational measures appropriate to the risk. It tests what is actually implemented and operating; an approved policy that nothing technically enforces is an organisational measure at most, not a technical control.",
    regulationText: ART_32_1_CHAPEAU,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 32(1) GDPR (verbatim, chapeau)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "Content filtering that actively blocks a category of data from reaching an external tool is a technical control; a policy telling staff not to paste that same data is a different, organisational, kind of measure, even though both can appropriately coexist.",
    commonMistake:
      "Describing an unenforced written policy as a technical control, or dismissing organisational measures such as instructions and training as if they had no value merely because they are not technical.",
    coachLead: "Answer for what is technically enforced today, separately from what policy or training instructs.",
    coachBody:
      "Use Partial where coverage differs by tool or category, and explain the limits in Additional context rather than implying uniform coverage.",
  },

  measures_review_cadence: {
    fieldLabel: "How often is the set of technical and organisational measures reviewed?",
    citation: "GDPR Art. 24(1) — review and update",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Article 24(1) requires measures to be reviewed and updated where necessary, calibrated to the processing's nature, scope, context and purposes. It does not set a fixed statutory interval; a defined periodic cadence and a review triggered by material change answer different, both potentially valid, questions.",
    regulationText: ART_24_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 24(1) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "An organisation that reviews measures on a fixed annual cycle and also reviews them after a material system change is describing two complementary practices, not one that must be picked over the other.",
    commonMistake:
      "Treating a periodic review cycle as automatically sufficient regardless of intervening material changes, or treating an event-triggered review as equivalent to having no defined cadence at all.",
    coachLead: "Distinguish a regular cycle from an event-triggered review, and record both if both exist.",
    coachBody:
      "Select the option that matches the schedule actually used, and explain any change-triggered review separately in Additional context.",
  },

  measures_last_review_date: {
    fieldLabel: "Date the measures were last reviewed",
    citation: "GDPR Art. 24(1) — review and update",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Article 24(1) requires measures to be reviewed and updated where necessary. A recorded review date is evidence the review-and-update limb was actually exercised at that point; a blank date means currency cannot be tested from this answer, not that no review occurred.",
    regulationText: ART_24_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 24(1) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A date tied to an actual completed review or approval is a fact a reviewer could check; a planned future review date is a different fact and should not be recorded in its place.",
    commonMistake:
      "Entering the next planned review date instead of the date of the last completed one, or leaving the field blank without explaining what is known elsewhere.",
    coachLead: "Enter the date of the latest completed review, not the next planned one.",
    coachBody:
      "If the exact date is unknown, leave it blank and explain what is known in Additional context rather than estimating a date that cannot be substantiated.",
  },

  processing_nature: {
    fieldLabel: "Nature of the processing",
    citation: "GDPR Art. 24(1) — calibration factors",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Article 24(1) calibrates required measures against the nature, scope, context and purposes of the processing. Nature concerns what is actually done to the data — for example collection, profiling, monitoring, automated decision-making, or disclosure — as distinct operations.",
    regulationText: ART_24_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 24(1) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "Describing 'collects support tickets, profiles them for churn risk, and discloses a summary to a partner' states three distinct operations; describing the same activity only as 'customer support' does not give this factor anything to test.",
    commonMistake:
      "Describing the business purpose or department instead of the actual operations performed on the data.",
    coachLead: "State each operation performed on the data separately.",
    coachBody:
      "List operations such as collection, profiling, monitoring, automated decisions, and disclosure as distinct facts rather than one summary label.",
  },

  processing_scope: {
    fieldLabel: "Scope of the processing",
    citation: "GDPR Art. 24(1) — calibration factors",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Scope concerns how much processing actually occurs — the volume and range of data, number of data subjects, frequency, geography, and retention period — stated as measurable facts rather than general adjectives.",
    regulationText: ART_24_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 24(1) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "An estimate such as 'roughly 40,000 customers annually across three countries, records kept for six years' is testable; 'a large amount of data' is not, even where both describe the same underlying facts.",
    commonMistake:
      "Substituting overall employee headcount for the actual scale of the processing being described.",
    coachLead: "State measurable facts about volume, frequency, geography, and retention, using estimates where exact numbers are unavailable.",
    coachBody:
      "Identify estimates as estimates, and explain meaningful differences between activities rather than giving one figure for all of them.",
  },

  processing_context: {
    fieldLabel: "Context of the processing",
    citation: "GDPR Art. 24(1) — calibration factors",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Context concerns the relationship between the organisation and the people whose data it processes — what they would reasonably expect, any imbalance of power, and any vulnerability — which can differ materially between groups such as employees and anonymous visitors.",
    regulationText: ART_24_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 24(1) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "Employees processed under an employment relationship and anonymous website visitors sit in different contexts even where the same tool processes both, because the relationship, expectation, and power balance differ.",
    commonMistake:
      "Describing context only in terms of the organisation's industry, without describing the actual relationship and expectations of the people affected.",
    coachLead: "Describe the relationship, expectation, and any power imbalance for the people actually affected.",
    coachBody:
      "Note differences between groups, such as employees and visitors, and any factor that changes the risk to them specifically.",
  },

  processing_purposes: {
    fieldLabel: "Purposes of the processing",
    citation: "GDPR Art. 24(1) — calibration factors",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Purposes must be specific enough to test necessity against. A broad label such as 'business purposes' does not identify what outcome the processing is meant to achieve; a named purpose does. This field does not itself establish a lawful basis under Art. 6.",
    regulationText: ART_24_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 24(1) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "'Detect fraudulent returns before refunding' states an outcome that can be tested for necessity; 'business operations' does not, even if both are technically true of the same activity.",
    commonMistake:
      "Naming a broad category such as 'business purposes' or 'service improvement' instead of the specific outcome the processing is meant to achieve.",
    coachLead: "State the specific outcome sought, connected to the relevant operation.",
    coachBody:
      "Identify additional or changing purposes separately, and keep purposes distinct from the lawful-basis question, which this field does not answer.",
  },

  dpa_status: {
    fieldLabel: "Data processing agreements signed with relevant vendors",
    citation: "GDPR Art. 28(3) — processor contract",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Processing by a processor must be governed by a binding contract meeting the Art. 28(3) requirements. The duty attaches per processor; coverage of the largest or best-known vendor does not establish coverage of the rest.",
    regulationText: ART_28_3_CHAPEAU,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 28(3) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "A company that counts nine of eleven processors as covered and names the two that are not is answering from a counted list; stating 'covered' because the main cloud provider has a signed agreement is answering a different, incomplete question.",
    commonMistake:
      "Generalising coverage from the largest or most visible vendor instead of checking the full list of processors actually in use.",
    coachLead: "Count coverage across the actual processor list before selecting a status.",
    coachBody:
      "State the total number of processors, how many are covered, and identify any uncovered ones in Additional context rather than rounding up from the main supplier.",
  },

  dpa_art28_verified: {
    fieldLabel: "Have those agreements been verified against the Art. 28(3) mandatory clauses?",
    citation: "GDPR Art. 28(3)(a)-(h) — mandatory clauses",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Art. 28(3) names eight required terms, including documented instructions, confidentiality, security, sub-processor authorisation, data-subject-rights assistance, breach assistance, deletion or return, and audit rights. A signed contract using a vendor's standard template is not itself verification; verification means someone has actually checked the signed text against that list.",
    regulationText: ART_28_3_CHAPEAU,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 28(3) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A review that checks each signed agreement against the eight required terms and records which agreements are missing which term supports Verified or Partially; a signature alone, without that check, does not.",
    commonMistake:
      "Treating a signed agreement as verified without anyone having actually checked its terms against the Art. 28(3) list.",
    coachLead: "Answer whether the agreements were actually checked against the required terms, not whether they were signed.",
    coachBody:
      "Select Partially where the review is incomplete or covers only some agreements, and identify the missing terms and agreements in Additional context.",
  },

  transfer_status: {
    fieldLabel: "Cross-border transfers outside the EU or UK",
    citation: "GDPR Chapter V — international transfers",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "A transfer can occur through remote access, backups, or vendor support, not only through where data is primarily stored. Chapter V provides more than one lawful basis for a transfer once identified: an adequacy decision (Art. 45), appropriate safeguards such as SCCs or binding corporate rules (Art. 46), or a specific derogation (Art. 49); selecting that data is stored in the EU/UK does not, on its own, rule out other transfer routes such as remote support access.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A vendor whose data is stored in the EU but whose support staff access it remotely from outside the EU is still describing a transfer route, even though the storage location alone would suggest otherwise.",
    commonMistake:
      "Selecting the EU/UK-storage option as if it rules out every other route, without separately checking remote access, backups, and support arrangements.",
    coachLead: "Check storage, backups, remote support, and other access separately before selecting a status.",
    coachBody:
      "Record each destination and route in Additional context, including any that rely on an adequacy decision, and use Unsure where the routes have not actually been checked.",
  },

  transfer_mechanism: {
    fieldLabel: "Which transfer mechanism is in place for those transfers?",
    citation: "GDPR Chapter V — transfer mechanisms",
    citationUrl: UK_GDPR_URL,
    plainSummary:
      "Chapter V provides three distinct bases for a transfer: an adequacy decision (Art. 45), appropriate safeguards such as Standard Contractual Clauses or binding corporate rules (Art. 46), or a specific derogation for particular situations (Art. 49). Which basis applies depends on the destination and the facts of the route, not a single default. UK GDPR uses its own adequacy regulations and the ICO's International Data Transfer Agreement or UK Addendum in place of the EU mechanisms.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A route to a country covered by an adequacy decision or regulations needs no separate safeguard, while a route to a country without one typically relies on Standard Contractual Clauses or an equivalent instrument; identifying which applies to each route is the actual task, not assuming one mechanism covers every destination.",
    commonMistake:
      "Assuming every transfer outside the EEA or UK needs the same safeguard mechanism, rather than checking whether an adequacy decision or a derogation applies to a given route before defaulting to a contractual safeguard.",
    coachLead: "Identify the applicable Chapter V basis for each transfer.",
    coachBody:
      "Where routes rely on different mechanisms, answer for the one covering most of them and list the rest, with their own basis, in Additional context.",
  },

  additional_context: {
    fieldLabel: "Anything material to your privacy programme not captured above",
    citation: "Assessment catch-all — optional",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "This optional field is read alongside the fixed answers above. Facts that do not fit a fixed choice, including exceptions, unknowns, vendor counts, and specific transfer routes, belong here rather than being left unrecorded.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A change in reporting line for the person accountable for data protection, a known sub-processor gap already under review, or a specific regulator query are the kinds of facts that would otherwise have nowhere to go among the fixed choices above.",
    commonMistake:
      "Leaving this blank when a fixed choice above could not fully describe the actual facts, rather than using it to record the gap.",
    coachLead: "Use this field for facts the fixed choices above could not capture, not as the only place to record anything important.",
    coachBody:
      "Separate confirmed facts, planned changes, and open questions, and identify which activity or tool each note relates to.",
  },

  // ── Governance master review (2026-09-15) — the seven fields the review
  // added to the page: explanatory "Other" inputs (F06), the Art. 3 facts
  // (F10) and the optional processor / transfer detail (F08).
  sector_other: {
    fieldLabel: "Describe the sector",
    citation: "Assessment risk context — Other sector",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Asked only when the sector list does not name yours. The description sets the risk context the report weighs findings against; it is not a GDPR classification.",
    regulationText: "",
    goodAnswerKind: "example",
    goodAnswer:
      "'Specialist logistics for clinical-trial samples, serving pharmaceutical sponsors in the EU and UK' tells the report both the activity and whose data it touches.",
    commonMistake:
      "Writing a company name or a one-word label that leaves the report to guess what the organisation actually does with personal data.",
    coachLead: "Say what the organisation does and whose personal data that involves.",
    coachBody:
      "One or two sentences on the activity, the customers or people served, and any regulated dimension (health, finance, children) is enough.",
  },

  jurisdictions_other: {
    fieldLabel: "Name the other jurisdiction(s)",
    citation: "GDPR Art. 3 — territorial scope (other regimes noted)",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Asked only when 'Other' is selected among the jurisdictions. The report grades GDPR and UK GDPR accountability; other regimes are recorded so the scope of what was and was not assessed is explicit.",
    regulationText: "",
    goodAnswerKind: "explanation",
    goodAnswer:
      "Naming the country or regime (for example 'Switzerland — FADP' or 'Brazil — LGPD') lets the report state that those regimes were outside its grading rather than silently omitted.",
    commonMistake:
      "Listing every country where a customer happens to live; the question is which legal regimes the organisation is subject to, not where every data subject is.",
    coachLead: "Name the regime, not the customer list.",
    coachBody:
      "Record each additional law or country the organisation is subject to. The report states that it did not grade them.",
  },

  territorial_scope_basis: {
    fieldLabel: "Which of these apply to your organisation? (Art. 3 facts)",
    citation: "GDPR Art. 3(1)–(2) — territorial scope",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Whether the GDPR or UK GDPR applies turns on Art. 3: an establishment in the EU/EEA or the UK (Art. 3(1)), or, for an organisation established elsewhere, offering goods or services to people there or monitoring their behaviour (Art. 3(2)). Where the data subjects live is a fact that feeds this test; it is not the test itself. 'None of these' and 'Unsure' are complete answers.",
    regulationText: ART_3_2,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 3(2) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "A US company with no EU office that sells subscriptions priced in euros to customers in Germany selects 'We offer goods or services to people in the EU or UK'; a UK company with a Dublin subsidiary selects both establishment options.",
    commonMistake:
      "Selecting 'None of these' because the organisation has no European office, when its website targets EU customers or its analytics track visitors in the EU.",
    coachLead: "Test each Art. 3 limb on the facts: establishment, offering, monitoring.",
    coachBody:
      "Select every fact that applies. The GDPR-specific questions stay in scope while any positive fact, an EU/UK jurisdiction, or a Yes to the residents question is recorded.",
  },

  data_categories_other: {
    fieldLabel: "Describe the other category of personal data",
    citation: "GDPR Art. 4(1) — personal data",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Asked only when 'Other' is selected among the data categories. Any information relating to an identified or identifiable person is personal data (Art. 4(1)); the description tells the report what the fixed list could not.",
    regulationText: ART_4_1_PERSONAL_DATA,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 4(1) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "'Vehicle telematics — location traces and driving-behaviour scores linked to a named driver' names the data and why it is personal data.",
    commonMistake:
      "Describing a system ('our CRM') rather than the category of information about people that it holds.",
    coachLead: "Name the information about people, not the system that holds it.",
    coachBody:
      "If the category could reveal a special category (health, beliefs, sexual orientation), say so here and answer the special-category question accordingly.",
  },

  processor_count: {
    fieldLabel: "How many processors are in scope?",
    citation: "GDPR Art. 28(3) — processor contract (per processor)",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Optional. The Art. 28(3) duty attaches to each processor separately, so the report can only count coverage where the intake tells it how many processors exist. A number, or an honest 'not counted', both help; the report never infers a count.",
    regulationText: ART_28_3_CHAPEAU,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 28(3) GDPR (verbatim)",
    goodAnswerKind: "explanation",
    goodAnswer:
      "A figure taken from the processor inventory, with a note if sub-processors are excluded, lets the report state coverage as a fraction rather than a status word.",
    commonMistake:
      "Guessing a round number, or counting only the large cloud providers while omitting marketing, HR and support tools that also process personal data.",
    coachLead: "Take the number from the inventory, or say it has not been counted.",
    coachBody:
      "Say whether sub-processors are included. If there is no inventory, 'not counted' is the accurate answer and the report records it as such.",
  },

  uncovered_vendors: {
    fieldLabel: "Which vendors have no signed agreement?",
    citation: "GDPR Art. 28(3) — processor contract",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Optional, asked when coverage is less than all vendors. Naming the uncovered processors turns a status word into a finding the remediation plan can act on.",
    regulationText: ART_28_3_CHAPEAU,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 28(3) GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "'Acme Support Desk (ticketing, EU customer data) — vendor terms only, no Art. 28 clauses; Beta Analytics — agreement drafted, unsigned' gives the report two actionable items.",
    commonMistake:
      "Writing 'a few smaller tools' — the report cannot plan remediation for processors it cannot name.",
    coachLead: "One vendor per line, with what it processes.",
    coachBody:
      "Include the status of any agreement in progress. Where a vendor is disputed as a processor at all, say so; the report records the question rather than deciding it.",
  },

  transfer_routes: {
    fieldLabel: "Describe the transfer routes",
    citation: "GDPR Art. 44 — general principle for transfers",
    citationUrl: EU_GDPR_URL,
    plainSummary:
      "Optional, asked when any transfer is reported. Chapter V applies to each transfer separately: each route needs its own basis (adequacy under Art. 45, appropriate safeguards under Art. 46, or a derogation under Art. 49), and the UK GDPR has its own routes. The report can assess only the routes the intake describes.",
    regulationText:
      "Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with by the controller and processor, including for onward transfers of personal data from the third country or an international organisation to another third country or to another international organisation. All provisions in this Chapter shall be applied in order to ensure that the level of protection of natural persons guaranteed by this Regulation is not undermined.",
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 44 GDPR (verbatim)",
    goodAnswerKind: "example",
    goodAnswer:
      "'Payroll — US vendor, EU SCCs (2021 modules) with transfer impact assessment, 2025; group HR system — Indian parent company, no mechanism yet' gives the report a route, a destination and a basis (or gap) for each.",
    commonMistake:
      "Naming only the primary storage location while omitting remote support access, backups and group-company access from outside the EU/UK, each of which is a transfer.",
    coachLead: "One route per line: who, to which country, on what basis.",
    coachBody:
      "Include remote access and backups. Where the basis is unknown or absent, say so; the report records the gap rather than assuming a mechanism.",
  },
};

/**
 * Field-indexed view keyed by the buildIntake() payload key (F07). Includes
 * the four remediation-default entries above, which previously had no
 * direct field binding (G06-G09) even though their registry keys already
 * match the payload keys the page reads. Each is spread into a fresh copy
 * with citationUrl added and the "…" placeholder cleared (there is no
 * single verbatim GDPR clause about a remediation owner/date/priority/
 * validation method as such) — GOVERNANCE_RAIL.remediation_default_* itself
 * is left byte-for-byte unchanged.
 */
export const GOVERNANCE_RAIL_BY_FIELD: Record<string, RailEntry> = {
  ...GOVERNANCE_RAIL_FIELDS,
  remediation_default_owner: {
    ...GOVERNANCE_RAIL.remediation_default_owner,
    regulationText: "",
    citationUrl: EU_GDPR_URL,
  },
  remediation_default_target_date: {
    ...GOVERNANCE_RAIL.remediation_default_target_date,
    regulationText: "",
    citationUrl: EU_GDPR_URL,
  },
  remediation_default_priority: {
    ...GOVERNANCE_RAIL.remediation_default_priority,
    regulationText: "",
    citationUrl: EU_GDPR_URL,
  },
  remediation_default_validation_method: {
    ...GOVERNANCE_RAIL.remediation_default_validation_method,
    regulationText: "",
    citationUrl: EU_GDPR_URL,
  },
};
