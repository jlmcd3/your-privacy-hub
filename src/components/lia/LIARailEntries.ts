// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer (what facts satisfy the law, what answer "passes").
// goodAnswer examples are clearly fictional and illustrate FORM, never a template.
// Voice: imperative, active, plain subject-verb-object, one idea per sentence,
// specific over vague, no ornamental legalese. Layered: coachLead = one line an
// expert acts on instantly; goodAnswer/commonMistake = the expansion for newer users.
//
// LI ASSESSMENT INTAKE MASTER REVIEW (2026-09-15) — F09/F10/F11/F12/F13/F14/F15/F16/F19.
// Placeholder regulationText is gone: every entry now carries either exact
// statutory wording marked `regulationTextKind: "verbatim"`, or an empty string
// that the rail suppresses. Nothing is paraphrased under a verbatim kind. Every
// entry carries a citationUrl for its primary source. Categorical legal outcomes
// the review asked us to qualify — a workable consent route defeating legitimate
// interests, an implied minimum number of alternatives, a blank attestation
// proving non-adoption, an unqualified objection right, a private company
// classified for or against public-authority status — are stated as questions of
// applicable law and recorded facts instead.

import type { RailEntry } from "@/components/intake/RailEntry";

// Verbatim source strings, quoted once and reused so a quotation cannot drift
// between entries. Each is the exact wording of the provision named.
const ART_6_1_F =
  "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child.";
const ART_5_1_C =
  "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed (‘data minimisation’);";
const ART_9_1 =
  "Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, data concerning health or data concerning a natural person’s sex life or sexual orientation shall be prohibited.";
const ART_21_1_FIRST_SENTENCE =
  "The data subject shall have the right to object, on grounds relating to his or her particular situation, at any time to processing of personal data concerning him or her which is based on point (e) or (f) of Article 6(1), including profiling based on those provisions.";
const ART_21_2 =
  "Where personal data are processed for direct marketing purposes, the data subject shall have the right to object at any time to processing of personal data concerning him or her for such marketing, which includes profiling to the extent that it is related to such direct marketing.";
const RECITAL_47_EXPECTATION =
  "At any rate the existence of a legitimate interest would need careful assessment including whether a data subject can reasonably expect at the time and in the context of the collection of the personal data that processing for that purpose may take place.";
const RECITAL_47_OVERRIDE =
  "The interests and fundamental rights of the data subject could in particular override the interest of the data controller where personal data are processed in circumstances where data subjects do not reasonably expect further processing.";

const URL_EU_GDPR = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679";
const URL_UK_GDPR = "https://www.legislation.gov.uk/eur/2016/679/contents";
const URL_EDPB_LI =
  "https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2024/guidelines-12024-processing-personal-data-based_en";
const URL_ICO_LAWFUL_BASIS =
  "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/a-guide-to-lawful-basis/";
const URL_EPRIVACY = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32002L0058";
const URL_PECR = "https://www.legislation.gov.uk/uksi/2003/2426/contents";

/**
 * The source links the 2026-09-15 review fixed for this registry, exported so a
 * consumer resolving a UK-regime citation links to the same text this rail does.
 * No entry currently takes the UK GDPR as its primary citation; the link is here
 * because relatedCitations on several entries point at UK GDPR provisions.
 */
export const LIA_CITATION_URLS = {
  euGdpr: URL_EU_GDPR,
  ukGdpr: URL_UK_GDPR,
  edpbGuidelines1of2024: URL_EDPB_LI,
  icoLawfulBasis: URL_ICO_LAWFUL_BASIS,
  eprivacyDirective: URL_EPRIVACY,
  pecr: URL_PECR,
} as const;

export const LIA_RAIL: Record<string, RailEntry> = {
  subject_anchor: {
    fieldLabel: "In one line — what does this assessment cover?",
    citation: "GDPR Art. 6(1)(f)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "One assessment covers one legitimate interest. This line names it and fixes it once you generate.",
    regulationText: ART_6_1_F,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 6(1)(f) (verbatim)",
    coachLead: "Name one interest, in one line.",
    coachBody:
      "State the single purpose this assessment will test. If you have two purposes, run two assessments — bundling weakens the balancing test for both.",
    goodAnswer:
      "“Fraud screening of new account signups.” — one interest, one line, nothing bundled.",
    commonMistake:
      "Naming a category (“marketing”) instead of an interest. The balancing test needs a specific purpose to weigh, not a department.",
    relatedCitations: [
      { citation: "GDPR Recital 47", label: "Reasonable expectations at the time and in the context of collection" },
      { citation: "EDPB Guidelines 1/2024, §§ 18–21", label: "An interest must be lawful, clearly articulated, and real and present" },
    ],
  },
  processing_description: {
    fieldLabel: "What processing are you considering?",
    citation: "GDPR Art. 6(1)(f)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "The detailed account of the processing behind the locked interest above. Fully editable across your runs.",
    regulationText: ART_6_1_F,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 6(1)(f) (verbatim)",
    coachLead: "Walk it end to end: the data, the operation, the output, who benefits.",
    coachBody:
      "Describe the actual mechanism — what data is used, what is done to it, what it produces, and the benefit it delivers. Specifics carry the necessity and balancing analysis; summaries flatten it.",
    goodAnswer:
      "“New signups are scored against device, velocity and address-mismatch signals; accounts over the risk threshold are held for manual review before activation.” — the operation, the inputs, the output, and where it bites.",
    commonMistake:
      "Restating the interest instead of describing the processing. The interest says why; this field says what actually happens to whose data.",
    relatedCitations: [
      { citation: "GDPR Art. 5(1)(c)", label: "Minimisation is tested against the processing as described" },
      { citation: "EDPB Guidelines 1/2024, §§ 26–29", label: "Necessity is assessed against the actual operation" },
    ],
  },
  relationship: {
    fieldLabel: "Your relationship with the data subjects",
    citation: "GDPR Recital 47",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Reasonable expectations turn on the relationship — customer, employee, prospect, or none. More than one relationship can be in scope at once, and the record can say so.",
    regulationText: RECITAL_47_EXPECTATION,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Recital 47 (verbatim)",
    coachLead: "Name the real relationship — and when it started.",
    coachBody:
      "Say who these people are to you and how the relationship arose. A long-standing account holder and someone whose details came from a third-party list sit at different points on the expectations analysis, and a single population can contain both.",
    goodAnswer:
      "“Active account holders; the relationship begins at signup and the processing starts the same day.” — who, since when, and how the processing meets them.",
    commonMistake:
      "Reading the relationship as one label that has to fit everyone. Where the population is mixed, or the origin of some records is not established, the expectations analysis is served better by saying so than by forcing the closest-sounding category.",
    relatedCitations: [
      { citation: "GDPR Art. 6(1)(f)", label: "The balancing test the relationship feeds" },
      { citation: "EDPB Guidelines 1/2024, §§ 47–50", label: "Relationship as an input to reasonable expectations" },
    ],
  },

  // ── UPGRADE-4 (ITEM 5) — one entry per new intake field. Citations point at
  // EDPB Guidelines 1/2024 paragraphs and ICO LIA template sections. Coaching
  // describes the SHAPE of a complete answer only. Byte-exact article text also
  // reaches the rail through useGdprRailEntry on the section rail.
  // ── DOC 161 (2026-09-03) — the verdict-driving enum questions had no coach
  // entry. Every claim about what the assessment does is true of the
  // deterministic path (lia-deliverables/build.ts, build-upgrade4.ts).
  controller_is_public_authority: {
    fieldLabel: "Is your organisation a public authority?",
    citation: "GDPR Art. 6(1)(f), second subparagraph",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Legitimate interests is not available to a public authority for processing carried out in the performance of its tasks. Whether an organisation is a public authority is settled by the law of the country whose rules apply, so the answer is recorded here rather than derived.",
    regulationText: "",
    coachLead: "Answer for your legal character under the law that applies to you.",
    coachBody:
      "Public-authority status, the tasks conferred on the body, and the legal foundation for those tasks are three separate facts, each decided under national law. Your assessment does not infer the answer from your name or sector: unanswered, it records the availability of the basis as pending and lists this question among the information required.",
    goodAnswer:
      "Article 6(1)(f) withholds legitimate interests from public authorities processing in performance of their tasks. National law defines which bodies are public authorities and what their tasks are; some regimes extend the definition to bodies exercising public functions, and an organisation delivering a public service under contract may or may not fall inside it. The classification is a legal question about the organisation, not a question about the sector it works in.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Treating the question as self-evident from the organisation's name, ownership or funding. The definition sits in national law, and until it is applied to this organisation the lawful-basis decision stays pending.",
    relatedCitations: [
      { citation: "GDPR Art. 6(1)(e)", label: "The basis to assess where processing is performance of a public task" },
      { citation: "UK GDPR Art. 6(1)(f) and DPA 2018 s. 7", label: "The UK definition of a public authority for this purpose" },
    ],
  },
  public_task_processing: {
    fieldLabel: "Is this processing carried out in the performance of your public tasks?",
    citation: "GDPR Art. 6(1)(f), second subparagraph",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "The exclusion is drawn to the tasks, not to the body. A public authority may rely on legitimate interests for processing that falls outside the performance of its tasks.",
    regulationText: "",
    coachLead: "Say whether this processing sits inside the tasks conferred on you, and name the task.",
    coachBody:
      "Record the task and its legal foundation separately from the organisation's status: which instrument confers the task, and whether this processing is done in performing it. “Not applicable” records that the controller is not a public authority, so the exclusion does not arise.",
    goodAnswer:
      "The second subparagraph turns on the processing, not the organisation. Where the processing is carried out in performing a task conferred on the body, legitimate interests is unavailable and Article 6(1)(e) is the basis to assess; where the activity sits outside those tasks, the basis remains open. Which tasks are conferred, and by what instrument, is a question of national law about this body.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Assuming that administrative or support work falls outside the conferred tasks because it is administrative. Administration carried out in performing a conferred function will ordinarily still count as performance of that task, and where the line falls is read from the instrument conferring it.",
    relatedCitations: [
      { citation: "GDPR Art. 6(1)(e) and Art. 6(3)", label: "Public-task processing and its basis in law" },
      { citation: "GDPR Recital 45", label: "The legal foundation for processing necessary for a public task" },
    ],
  },
  reasonable_expectation: {
    fieldLabel: "Would data subjects reasonably expect this processing?",
    citation: "GDPR Recital 47 (time and context of collection)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Recital 47 asks what the individual could reasonably expect at the time and in the context of collection, taking account of their relationship with you. Your selection states a conclusion; the fields beneath it supply the facts the assessment weighs.",
    regulationText: RECITAL_47_EXPECTATION,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Recital 47 (verbatim)",
    coachLead: "Answer for the moment the data were collected, and say how sure you are.",
    coachBody:
      "The scale runs from expected to not expected, and the middle of it is where genuine uncertainty belongs. Partly-expected answers sit on the individuals' side of the balance without defeating it; not-expected answers weigh against you and call for a mitigation. The assessment runs the test on the collection context and the reasoning given below; without them it records the answer but does not assess it.",
    goodAnswer:
      "Expectation is assessed at the time and in the context of collection, not at the time of use, and it is built from the relationship, the setting and what the individual was told. A processing operation can be expected by one part of a population and unanticipated by another, and the recital treats an honest statement of uncertainty as a fact to weigh rather than a gap.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Reading the existence of a privacy notice as proof of expectation. The Guidelines treat a notice on its own as insufficient; the expectation has to arise from the relationship and the setting as well.",
    relatedCitations: [
      { citation: "EDPB Guidelines 1/2024, §§ 47–50", label: "How reasonable expectations are assessed" },
      { citation: "GDPR Arts. 13–14", label: "Information given at collection, one input to expectations" },
    ],
  },
  children_data_subjects: {
    fieldLabel: "Are any data subjects children?",
    citation: "GDPR Art. 6(1)(f) (“in particular where the data subject is a child”)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Article 6(1)(f) names the child as the case in which the individual's interests are most likely to override yours. A general answer here engages that clause; the age range is recorded as its own question, because no age band follows from a Yes.",
    regulationText: ART_6_1_F,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 6(1)(f) (verbatim)",
    coachLead: "Answer for who is actually in the data, not who the service is aimed at.",
    coachBody:
      "Where people under 18 can be among the data subjects, the follow-up questions ask which age range is in scope — Under 13, 13 to 15, 16 to 17, Mixed ages, or Not known — and how you know. “Unknown” leaves the clause open and the balance is stated subject to it; the assessment does not read an age band out of the general answer.",
    goodAnswer:
      "Two different rules mention children and they do different work. The Article 8 age of consent for information-society services, which member states set between 13 and 16, governs when a child can consent in their own right. The clause in Article 6(1)(f) is broader: it applies to children generally and raises the weight of their interests in the balance whatever their age. A general statement that children are in scope therefore establishes the second without settling the first, and the age range has to be established from what the controller actually knows.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Reading an age from a general answer — inferring that “children” means under 16, or that terms saying adults only rule children out when nothing checks it. Age in scope is a factual finding about the population, and “Not known” is an accurate one where it has not been established.",
    relatedCitations: [
      { citation: "GDPR Art. 8", label: "Conditions for a child's consent to information-society services" },
      { citation: "GDPR Recital 38", label: "Children merit specific protection" },
    ],
  },
  potential_harm: {
    fieldLabel: "If something went wrong, what's the worst-case impact on data subjects?",
    citation: "GDPR Art. 6(1)(f) · EDPB Guidelines 1/2024, Section II.C (impact on data subjects)",
    citationUrl: URL_EDPB_LI,
    plainSummary:
      "The worst realistic outcome for the people affected, on a graded scale with an explicit “Not assessed”. Significant and severe impacts weigh materially against your interest and call for measures answering them.",
    regulationText: "",
    coachLead: "Rate the worst realistic case, then describe its pathway below.",
    coachBody:
      "The band describes what would actually happen to a person if the processing miscarried, not how likely that is. Your assessment weighs significant and severe impacts as material. “Not assessed” is an honest answer: the report records the impact as an open item rather than treating it as negligible, and the description beneath the rating is what the balance is struck against.",
    goodAnswer:
      "Severity and likelihood are separate dimensions, and this one is severity. The Guidelines look at what an individual stands to lose — money, a service, standing, autonomy, safety — if the processing goes wrong, and at whether that loss can be undone. Existing safeguards are weighed afterwards, against a harm that has already been named, so an unassessed or unknown impact is recorded as open rather than resolved in the controller's favour.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Rating the harm as negligible because safeguards exist. The rating is for the harm itself; the safeguards are recorded separately and credited separately.",
    relatedCitations: [
      { citation: "GDPR Recital 75", label: "Types of risk to rights and freedoms" },
      { citation: "EDPB Guidelines 1/2024, §§ 51–58", label: "Likely impact on data subjects" },
    ],
  },
  specific_benefit: {
    fieldLabel: "What specific benefit does this processing deliver?",
    citation: "EDPB Guidelines 1/2024, §§ 18–21 (interest must be real and present)",
    citationUrl: URL_EDPB_LI,
    plainSummary:
      "An interest only counts if it is lawful, clearly articulated, and real and present. A named benefit is what makes it real rather than speculative.",
    regulationText: "",
    coachLead: "Name the outcome, not the activity.",
    coachBody:
      "State what measurably changes because the processing happens. An activity restated as a benefit (“we analyse the data”) leaves the interest unevidenced.",
    goodAnswer:
      "“Chargeback losses on new accounts fall because high-risk signups are held before activation.” — an outcome, attributable to the processing.",
    commonMistake:
      "Describing a benefit that is hoped for rather than in prospect. An interest that is only speculative is not “real and present” on the Guidelines' test.",
    relatedCitations: [
      { citation: "GDPR Art. 6(1)(f)", label: "The interest the benefit evidences" },
      { citation: "GDPR Recital 47", label: "Legitimate interests must be weighed against the individual's" },
    ],
    templateGuidance: {
      sectionRef: "1",
      sectionTitle: "Purpose test — what are you trying to achieve?",
      guidance:
        "The ICO template asks what benefit the processing delivers and how important it is. Answer both dimensions: what the benefit is, and its weight.",
      sourceLabel: "ICO Legitimate Interests Assessment template",
      sourceUrl:
        "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/how-do-we-apply-legitimate-interests-in-practice/",
    },
  },
  beneficiary: {
    fieldLabel: "Who receives that benefit?",
    citation: "GDPR Art. 6(1)(f) · EDPB Guidelines 1/2024 §§ 18–21",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Article 6(1)(f) covers interests pursued by the controller or by a third party. Naming the beneficiary class fixes whose interest is being weighed.",
    regulationText: ART_6_1_F,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 6(1)(f) (verbatim)",
    coachLead: "Say whose interest is on the scale.",
    coachBody:
      "Identify the class that actually receives the benefit. Where individuals also benefit, that belongs on the record — alongside the controller's own interest rather than in place of it.",
    goodAnswer:
      "The provision is drawn to interests pursued by the controller or by a third party, so the beneficiary is part of what the balance weighs, not a presentational detail. Where a benefit runs to more than one class, the Guidelines expect each to be identified, because an interest shared with the individuals concerned is weighed differently from one that runs only to the business or to a third party.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Claiming the individual as beneficiary to soften the balance, where the practical benefit runs to the business.",
    relatedCitations: [
      { citation: "GDPR Recital 47", label: "Third-party interests within the balancing test" },
      { citation: "EDPB Guidelines 1/2024, §§ 18–21", label: "Identifying the interest and who pursues it" },
    ],
  },
  alternatives_rationale: {
    fieldLabel: "For each alternative, why would it not achieve the purpose?",
    citation: "EDPB Guidelines 1/2024, §§ 26–29 (necessity)",
    citationUrl: URL_EDPB_LI,
    plainSummary:
      "Necessity asks whether a less intrusive route reaches the same result. The record shows how each route compared — what it would achieve and where it falls short.",
    regulationText: "",
    coachLead: "One alternative per line, with what it achieves and what it misses.",
    coachBody:
      "For every route named, say how far it gets and what it would not deliver. Where a route does reach the purpose, that is a finding in its own right and belongs on the record; so does a route you have not yet been able to test.",
    goodAnswer:
      "“Aggregate reporting — surfaces the overall trend, but would not identify the individual account to hold.” — the alternative, what it delivers, and the shortfall.",
    commonMistake:
      "Rejecting a route as “impractical” or “too costly” without saying what outcome is lost. Cost on its own says little about whether the route is less intrusive and equally effective.",
    relatedCitations: [
      { citation: "GDPR Art. 5(1)(c)", label: "Data minimisation as the companion to necessity" },
      { citation: "CJEU C-708/18", label: "Necessity read strictly where a less intrusive route exists" },
    ],
    templateGuidance: {
      sectionRef: "2",
      sectionTitle: "Necessity test — is the processing necessary?",
      guidance:
        "The ICO template pairs each less-intrusive alternative with the reason it was rejected. Both halves belong in the record.",
      sourceLabel: "ICO Legitimate Interests Assessment template",
      sourceUrl:
        "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/lawful-basis/legitimate-interests/how-do-we-apply-legitimate-interests-in-practice/",
    },
  },
  relationship_category: {
    fieldLabel: "What is your relationship with these individuals?",
    citation: "GDPR Recital 47 · EDPB Guidelines 1/2024 §§ 47–50",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Recital 47 makes the relationship an express input to reasonable expectations. Stating it keeps the analysis from inferring it, and the list carries a mixed option and an other option so a varied population can be described as it is.",
    regulationText: RECITAL_47_EXPECTATION,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Recital 47 (verbatim)",
    coachLead: "Describe the relationship as it stands today, not as it began.",
    coachBody:
      "Former customers and lapsed contacts are not current customers. Where several classes are in scope, the mixed option keeps that visible, and the narrative fields carry which groups they are and how they differ.",
    goodAnswer:
      "The recital treats the relationship as context for what a person could expect, so the analysis is sharper the closer the stated relationship sits to the real population. Where a population spans several relationships, the weakest-connected group ordinarily has the least reason to expect the processing, which is why a mixed population is described rather than reduced to its strongest member.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Letting the strongest relationship in the population speak for everyone in it, when a weaker-connected group is also in scope.",
    relatedCitations: [
      { citation: "GDPR Art. 6(1)(f)", label: "The balancing test the relationship feeds" },
      { citation: "GDPR Recital 47", label: "Relationship between controller and data subject" },
    ],
  },
  scale_frequency_duration: {
    fieldLabel: "Scale, frequency and duration",
    citation: "EDPB Guidelines 1/2024, §§ 51–54 (impact on data subjects)",
    citationUrl: URL_EDPB_LI,
    plainSummary:
      "Impact scales with how many people are affected, how often, and for how long. These three dimensions are weighed separately.",
    regulationText: "",
    coachLead: "Give three numbers, not one adjective.",
    coachBody:
      "Approximate headcount, how often the processing runs against a given person, and how long the data is held for this purpose. Approximations are acceptable; ranges are better than silence.",
    goodAnswer:
      "“~40,000 signups a year; scored once at signup and re-scored on address change; scores retained 24 months.”",
    commonMistake:
      "Answering “ongoing” or “as needed”. Neither can be weighed against an individual's interests.",
    relatedCitations: [
      { citation: "GDPR Art. 5(1)(e)", label: "Storage limitation, which the duration answer engages" },
      { citation: "EDPB Guidelines 1/2024, §§ 51–58", label: "Scale and duration within the impact analysis" },
    ],
  },
  potential_harms: {
    fieldLabel: "Which harms could this processing cause?",
    citation: "EDPB Guidelines 1/2024, §§ 51–58 (likely impact)",
    citationUrl: URL_EDPB_LI,
    plainSummary:
      "The balance turns on the harms actually in play — material and non-material — rather than on a single severity label. “None identified” and “Unknown” are answers in their own right, recorded as open findings.",
    regulationText: "",
    coachLead: "Capture every harm in play, including the ones you already mitigate.",
    coachBody:
      "A mitigated harm is still a harm on the record; mitigation is weighed after it is named. Where the analysis has found no harm, or has not reached one, the report says so instead of showing an empty list.",
    goodAnswer:
      "The Guidelines look at material and non-material consequences together, from financial loss and exclusion from a service through to distress and loss of control over one's data. Naming a harm does not concede that it will occur; it sets out what the safeguards are then weighed against. A finding of no identified harm, or of an impact not yet established, is a statement about the analysis and is recorded as such.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Treating an existing safeguard as a reason not to list the harm it addresses, so the impact side of the balance is never stated.",
    relatedCitations: [
      { citation: "GDPR Recital 75", label: "Material and non-material damage to rights and freedoms" },
      { citation: "GDPR Art. 6(1)(f)", label: "Interests and fundamental rights that may override" },
    ],
  },
  opt_out_available: {
    fieldLabel: "Can individuals opt out of this processing?",
    citation: "GDPR Art. 21 · Recital 47 (right to object)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Article 21(2) lets a person object to processing for direct marketing at any time; objections under Article 21(1) rest on the person's particular situation and the controller may continue only on compelling legitimate grounds. Whether an opt-out exists here, and on what terms, is a balancing factor in its own right.",
    regulationText: ART_21_2,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 21(2) (verbatim)",
    coachLead: "State the terms, not just the existence, of the opt-out.",
    coachBody:
      "Record which objection rights apply to this processing and what the controller offers in practice. An opt-out that is conditional, reviewed, or costs the individual something weighs differently from one honoured on request, and an honest “no opt-out is available” is a fact the balance needs.",
    goodAnswer:
      "Two distinct rights sit behind this question. For direct marketing, Article 21(2) allows an objection at any time and processing for that purpose must stop. For other processing under Article 6(1)(f), Article 21(1) allows an objection on grounds relating to the person's particular situation, and the controller may continue only where it demonstrates compelling legitimate grounds that override their interests, rights and freedoms, or for legal claims. An offer the controller makes voluntarily is separate again, and is weighed as a measure rather than as compliance with the right.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Collapsing the two rights into one, so a marketing opt-out is offered as the answer to every objection, or an Article 21(1) objection is described as something the controller can always refuse or must always accept.",
    relatedCitations: [
      { citation: "GDPR Art. 21(1)", label: "Objection on grounds relating to the particular situation" },
      { citation: "GDPR Art. 12(2)", label: "The controller shall facilitate the exercise of the right" },
    ],
  },
  attestation_dpo_review: {
    fieldLabel: "DPO or privacy-lead review",
    citation: "GDPR Art. 39(1)(a)–(b) (DPO tasks: advice and monitoring)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Where a DPO is appointed, their advisory and monitoring role can be documented on the assessment itself: who reviewed it, and when. Whether a DPO is required, and what their involvement in an assessment looks like, depends on the organisation and the applicable rules.",
    regulationText: "",
    coachLead: "Record a person and a date, or the status of a review still to come.",
    coachBody:
      "A role title with no name and no date does not evidence a review. Completed, planned and not-yet-determined are all accurate states. Where nothing is entered, the report says that review or approval details were not provided.",
    goodAnswer:
      "Article 39 gives the data protection officer, where one is appointed, the tasks of advising the controller and monitoring compliance. Recording who advised on an assessment and when is how that involvement becomes visible later; it is evidence of the advisory step, not a certification that the conclusion is correct. Whether a DPO must be appointed at all is governed by Article 37 and by national rules.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Reading the author of the assessment as its reviewer. Review is a second pair of eyes, and where the same person does both the record should show that rather than imply otherwise.",
    relatedCitations: [
      { citation: "GDPR Art. 37", label: "When a data protection officer must be designated" },
      { citation: "GDPR Art. 38(3)", label: "Independence of the DPO in performing their tasks" },
    ],
  },
  attestation_approver: {
    fieldLabel: "Approved by",
    citation: "GDPR Art. 5(2) (accountability)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Accountability asks the controller to be able to demonstrate how a decision was taken. The approver is the person who accepts the residual risk on the organisation's behalf.",
    regulationText: "",
    coachLead: "Record the person who can accept the residual risk, or the current approval status.",
    coachBody:
      "Name, position, and date of approval. The position matters, because it shows the level at which the decision sat. Approved, approval pending, not yet submitted and not applicable are each a real state; left empty, the report states that review or approval details were not provided.",
    goodAnswer:
      "Article 5(2) makes the controller responsible for demonstrating compliance, which is why assessments carry a provenance record. What that record shows is who signed and when. An assessment with no approver recorded is an assessment whose approval details are not on file — which is a gap in the evidence, and is reported as such rather than as a finding that the processing was never authorised.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Treating the approval line as a formality to be completed at some point after the processing starts, so the record cannot show when — or whether — the decision was taken.",
    relatedCitations: [
      { citation: "GDPR Art. 24(1)", label: "Controller's responsibility to implement and demonstrate measures" },
      { citation: "EDPB Guidelines 1/2024, § 76", label: "Documenting and keeping the assessment under review" },
    ],
  },
  attestation_review_triggers: {
    fieldLabel: "What would trigger a re-review?",
    citation: "GDPR Art. 5(2) · EDPB Guidelines 1/2024 § 76 (ongoing assessment)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "An assessment is a point-in-time judgement. Naming the events that would unsettle it is what keeps it current.",
    regulationText: "",
    coachLead: "List events, not a calendar date.",
    coachBody:
      "Changes to purpose, data categories, recipients, retention, or a rise in objections each unsettle the balance. A scheduled date can sit alongside them, rather than in place of them.",
    goodAnswer:
      "“Any new data category added to the model; any new recipient outside the group; a retention extension; a sustained rise in objections; plus an annual review each June.” — events first, with the calendar date as a backstop.",
    commonMistake:
      "Recording an annual review alone. A material change six weeks in leaves the assessment stale for the rest of the year.",
    relatedCitations: [
      { citation: "GDPR Art. 35(11)", label: "Review where the risk presented by processing changes" },
      { citation: "GDPR Art. 24(1)", label: "Measures reviewed and updated where necessary" },
    ],
  },

  // ── DISPATCH 3 (INTAKE GOLD STANDARD, register v1.2 · A5) — substantive
  // coaching for the narrative and judgment fields. Model answers carry legal
  // context because the LIA prompt reads these fields verbatim; identity and
  // format fields stay hint-only per A2.
  interest_statement: {
    fieldLabel: "In your own words, what is the legitimate interest you are relying on?",
    citation: "GDPR Art. 6(1)(f) · EDPB Guidelines 1/2024 §§ 18–21",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "An interest qualifies only if it is lawful, precisely articulated, and real and present rather than speculative. This field is the articulation.",
    regulationText: ART_6_1_F,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 6(1)(f) (verbatim)",
    coachLead: "State the interest itself — not the notice wording, not the department.",
    coachBody:
      "Write the interest as a purpose a regulator could weigh: what you are pursuing and why it matters to the business now. Two interests bundled into one sentence produce a balance that resolves neither.",
    goodAnswer:
      "“Preventing payment fraud on newly opened accounts, where losses in the first 30 days after signup account for most of our chargeback exposure.” — one interest, present tense, and the reason it is real today.",
    commonMistake:
      "Writing the privacy-notice sentence here. The notice describes the processing to individuals; this field states the interest being weighed.",
    relatedCitations: [
      { citation: "GDPR Recital 47", label: "Legitimate interests weighed against the individual's" },
      { citation: "EDPB Guidelines 1/2024, §§ 18–21", label: "Lawful, clearly articulated, real and present" },
    ],
  },
  stated_purpose: {
    fieldLabel: "How would you state this purpose to data subjects in a privacy notice?",
    citation: "GDPR Arts. 13–14 · Recital 47 (reasonable expectations)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Reasonable expectations are formed by what individuals were told, so notice wording is evidence in the balance. This field holds the wording itself — published or proposed — and its publication status is recorded as a separate question.",
    regulationText: "",
    coachLead: "Write the sentence a reader would actually meet in your notice.",
    coachBody:
      "Plain language, active voice, and the same scope as the interest above. Where the wording is a draft rather than live text, the status question is what records that, so the analysis quotes it for what it is.",
    goodAnswer:
      "“We check new account signups for signs of fraud, using device and address information, and may hold an account for manual review before it is activated.” — what happens, what data, what consequence.",
    commonMistake:
      "Reusing an internal purpose label. “Risk management” tells an individual nothing they could form an expectation from.",
    relatedCitations: [
      { citation: "GDPR Art. 12(1)", label: "Concise, transparent, intelligible and easily accessible form" },
      { citation: "GDPR Art. 13(1)(d)", label: "Where Art. 6(1)(f) applies, the legitimate interests pursued" },
    ],
  },
  alternatives: {
    fieldLabel: "What alternatives have you considered?",
    citation: "EDPB Guidelines 1/2024, §§ 26–29 (necessity)",
    citationUrl: URL_EDPB_LI,
    plainSummary:
      "Necessity asks whether a less intrusive route reaches the same result. The record shows which routes were examined and how they compared.",
    regulationText: "",
    coachLead: "List the routes you tested, one per line.",
    coachBody:
      "Include the options a regulator would expect to see examined — consent, less data, aggregation, a manual process, doing nothing — and any you have not yet been able to test. The comparison between them belongs in the next field.",
    goodAnswer:
      "“Consent at signup; aggregate-only risk reporting; manual review of every application; a shorter retention window for scores.” — four distinct routes, each testable.",
    commonMistake:
      "Treating the field as a formality and listing routes that were never examined. The value is in the comparison, and a route that does reach the purpose is a finding to record rather than a result to avoid.",
    relatedCitations: [
      { citation: "GDPR Art. 5(1)(c)", label: "Data minimisation as the companion to necessity" },
      { citation: "CJEU C-708/18", label: "Necessity read strictly where a less intrusive route exists" },
    ],
  },
  why_consent_not_used: {
    fieldLabel: "Why is consent not appropriate here?",
    citation: "ICO — A guide to lawful basis (no hierarchy of lawful bases) · GDPR Art. 7 · Recital 43 · EDPB Guidelines 1/2024 §§ 26–29",
    citationUrl: URL_ICO_LAWFUL_BASIS,
    plainSummary:
      "The ICO's guide is explicit that no lawful basis ranks above another; the question is which basis fits these facts. This field records what was considered and why legitimate interests is the proposed basis, and it leaves any separate consent requirement — under ePrivacy or PECR rules, for example — standing on its own.",
    regulationText: "",
    coachLead: "Explain what was considered, and why the proposed basis fits these facts.",
    coachBody:
      "Consent must be freely given, specific, informed and unambiguous, and withdrawable as easily as it is given. Where those conditions are difficult here, say which and why; where consent is workable but another basis fits the processing better, say that instead. A separate rule that requires consent in its own right is recorded alongside, not displaced by this answer.",
    goodAnswer:
      "“Fraud screening runs before the account exists, so there is no established party able to give informed consent at that moment, and consent withdrawn mid-check would leave the screening half-complete; the ePrivacy consent needed for the device signals is obtained separately and is unaffected by this analysis.” — what was considered, why the proposed basis fits, and the separate requirement kept in view.",
    commonMistake:
      "Reading the field as a demand for a defect in consent. The lawful bases are alternatives rather than a ranked list, so the record is asking which fits and why — and any consent obligation that arises under other rules continues to apply whatever is written here.",
    relatedCitations: [
      { citation: "GDPR Art. 7(3)", label: "Withdrawal of consent must be as easy as giving it" },
      { citation: "ePrivacy Directive 2002/58/EC Art. 5(3) · PECR 2003 reg. 6", label: "Consent requirements that stand independently of the Art. 6 basis" },
    ],
  },
  data_minimised: {
    fieldLabel: "How have you minimised the data used?",
    citation: "GDPR Art. 5(1)(c) (data minimisation)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Minimisation is tested against the purpose: adequate, relevant, and limited to what is necessary. The record shows the limits you actually set.",
    regulationText: ART_5_1_C,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 5(1)(c) (verbatim)",
    coachLead: "Name what you excluded, not only what you kept.",
    coachBody:
      "Fields dropped, windows shortened, enrichment declined, populations carved out. A limit you can state is a limit a regulator can verify.",
    goodAnswer:
      "“Device and address-mismatch signals only; no demographic enrichment, no third-party credit data, and transaction history limited to the last 12 months.”",
    commonMistake:
      "Asserting that only necessary data is used without saying what was left out. The claim carries no weight without the exclusions.",
    relatedCitations: [
      { citation: "GDPR Art. 25(2)", label: "Data protection by default" },
      { citation: "GDPR Art. 6(1)(f)", label: "The necessity limb minimisation supports" },
    ],
  },
  collection_context: {
    fieldLabel: "When and in what setting was this data collected?",
    citation: "GDPR Recital 47 (time and context of collection)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Recital 47 fixes expectations at the moment of collection, in its context — not at the moment of use.",
    regulationText: RECITAL_47_EXPECTATION,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Recital 47 (verbatim)",
    coachLead: "Describe the moment: who was present, what was being done, what was said.",
    coachBody:
      "Where collection happens more than once, describe each occasion. A relationship formed in a branch and one formed through a third-party list produce different expectations from identical data.",
    goodAnswer:
      "“Collected at account opening in branch, with the fraud check described in the account terms; refreshed at each transaction the customer initiates.”",
    commonMistake:
      "Describing what the privacy notice says instead of the circumstances. The notice is one input to expectations, not the whole context.",
    relatedCitations: [
      { citation: "GDPR Art. 14", label: "Information duties where data were not obtained from the data subject" },
      { citation: "EDPB Guidelines 1/2024, §§ 47–50", label: "Context of collection in the expectations analysis" },
    ],
  },
  reasonable_expectation_detail: {
    fieldLabel: "Why would (or would not) data subjects expect this?",
    citation: "GDPR Recital 47 · EDPB Guidelines 1/2024 §§ 47–50",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "The selected expectation level is a conclusion. This field carries the reasoning behind it, which is what the balance weighs.",
    regulationText: RECITAL_47_OVERRIDE,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Recital 47 (verbatim)",
    coachLead: "Give the evidence — the relationship, the disclosure, the norm.",
    coachBody:
      "Point at what would put a reasonable person on notice: the terms they accepted, the sector norm, the visibility of the control. Where expectation is weak or uneven across the population, saying so lets it be weighed properly; an overstated one cannot be.",
    goodAnswer:
      "“Fraud screening is described in the account terms and is a standard feature of retail banking, so a new customer would expect it; the re-scoring on address change is less visible and may not be anticipated.”",
    commonMistake:
      "Treating the existence of a privacy notice as proof of expectation. Buried disclosure rarely forms a reasonable expectation on its own.",
    relatedCitations: [
      { citation: "GDPR Art. 6(1)(f)", label: "Interests that may be overridden where expectation is absent" },
      { citation: "GDPR Recital 47", label: "Reasonable expectations of the data subject" },
    ],
  },
  safeguards: {
    fieldLabel: "Which safeguards are in place?",
    citation: "EDPB Guidelines 1/2024, §§ 59–65 (mitigating measures)",
    citationUrl: URL_EDPB_LI,
    plainSummary:
      "Safeguards are weighed after the harms are named. The Guidelines distinguish measures that go beyond what is already required from the compliance baseline, so how a measure is implemented here matters as much as its label.",
    regulationText: "",
    coachLead: "Record what is running today, and say what is only planned.",
    coachBody:
      "A safeguard on a roadmap does not reduce present impact. Anything not yet live belongs in the mitigations narrative with its status stated, and “None in place yet” is an accurate entry where that is the position.",
    goodAnswer:
      "Article 32 and Articles 5 and 25 already require security, minimisation and protection by design, so the Guidelines treat those duties as the baseline against which additional measures are assessed. That does not put a labelled measure permanently out of account: a control implemented further than the duty requires can still weigh on the individual's side, and what decides it is the detail of what was done rather than the name of the control.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Reading a control as protecting this processing because it exists somewhere in the organisation. The question is what protects the processing described in this assessment.",
    relatedCitations: [
      { citation: "GDPR Art. 32", label: "Security of processing" },
      { citation: "GDPR Art. 25", label: "Data protection by design and by default" },
    ],
  },
  additional_mitigations: {
    fieldLabel: "What measures reduce the impact beyond what the law already requires?",
    citation: "EDPB Guidelines 1/2024, §§ 59–65 (measures that can tip the balance)",
    citationUrl: URL_EDPB_LI,
    plainSummary:
      "The Guidelines separate additional mitigating measures from baseline compliance, because a duty already owed cannot by itself shift the balance. Whether a particular measure goes beyond the baseline depends on what was implemented, not on the label it carries.",
    regulationText: "",
    coachLead: "Name the measure and say how far it goes past the duty it sits next to.",
    coachBody:
      "An objection route offered where none is required, a human review you are not obliged to provide, a retention period shorter than the purpose would allow, a population excluded voluntarily. State the measure, who it protects, and what it adds to the underlying obligation.",
    goodAnswer:
      "“Any customer held for review can request human re-examination within one working day, and accounts recorded as belonging to under-18s are excluded from automated holds entirely.” — each measure stated with who it protects and what it adds.",
    commonMistake:
      "Listing a control by name and leaving it there. Encryption, access control and retention limits are already required, so what carries weight is the part of the implementation that goes further than the duty — and that part has to be described to be weighed.",
    relatedCitations: [
      { citation: "GDPR Art. 6(1)(f)", label: "The balance the measures are weighed within" },
      { citation: "EDPB Guidelines 1/2024, §§ 51–58", label: "The impact these measures are set against" },
    ],
  },
  additional_context: {
    fieldLabel: "Anything else about this processing to weigh?",
    citation: "GDPR Art. 5(2) (accountability)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "The balance is a record of what was actually considered. Material context left out of the record cannot be shown to have been weighed.",
    regulationText: "",
    coachLead: "Add the constraint a reviewer would ask about.",
    coachBody:
      "Sector rules, a pending change to the processing, a prior complaint, a supervisory authority contact, a dependency on a processor. Silence here reads as nothing further raised for consideration.",
    goodAnswer:
      "“The scoring model is due to be retrained next quarter on a wider signal set; a 2025 complaint about a delayed activation was closed by the supervisory authority with no action; the screening runs on a processor under Art. 28 terms.” — the pending change, the history, the dependency.",
    commonMistake:
      "Repeating answers already given above. Restatement adds length to the record without adding anything to weigh.",
    relatedCitations: [
      { citation: "GDPR Art. 28", label: "Processor arrangements that belong in the record" },
      { citation: "GDPR Art. 35", label: "Where the processing may also call for a DPIA" },
    ],
  },
  opt_out_mechanism: {
    fieldLabel: "How can data subjects object or opt out?",
    citation: "GDPR Art. 21(1)–(3) (right to object) · Art. 12(2)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Article 21 provides two objection rights on different terms — one for direct marketing, one on grounds relating to the person's particular situation — and Article 12(2) requires the controller to facilitate their exercise. The mechanism is what makes a right usable.",
    regulationText: ART_21_1_FIRST_SENTENCE,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 21(1), first sentence (verbatim)",
    coachLead: "Describe the route, the effort it costs, and the response time.",
    coachBody:
      "Describe how people can exercise applicable objection rights, including where to send a request, who handles it and what happens next. Distinguish direct-marketing objections from other Article 21 objections; explain any applicable conditions rather than calling every objection unconditional.",
    goodAnswer:
      "“One-click unsubscribe in every message and an account-level marketing toggle, both actioned on receipt; objections to the fraud screening go to privacy@, are assessed by the DPO against the compelling-grounds test within five working days, and the outcome is given in writing with the reasons.” — two routes, each with its own handler, timescale and conditions.",
    commonMistake:
      "Naming an inbox with no service standard, or describing one route as though it answered both rights. An unmonitored channel does not facilitate the exercise of the right, and a marketing unsubscribe does not dispose of an objection made on grounds relating to a person's particular situation.",
    relatedCitations: [
      { citation: "GDPR Art. 21(2)", label: "Objection to processing for direct marketing purposes" },
      { citation: "GDPR Art. 12(3)", label: "Time limits for responding to a request" },
    ],
  },
  attestation_block: {
    fieldLabel: "Attestation and review",
    citation: "GDPR Art. 5(2) (accountability) · EDPB Guidelines 1/2024 § 76",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Accountability asks the controller to be able to demonstrate how the decision was taken. This block is the provenance record: who reviewed it, who approved it, and when.",
    regulationText: "",
    coachLead: "Record the reviewer, the approver and the dates you have.",
    coachBody:
      "Reviewer, approver, dates, and the events that would send the assessment back for re-examination. Where these are left empty, the report states that review or approval details were not provided, and reports the status as unknown rather than drawing a conclusion from the blank.",
    goodAnswer:
      "The provenance record and the legal effect of the assessment are different things. Article 5(2) governs what a controller must be able to show; whether an assessment was adopted, and by whom, is a fact about the organisation's own governance. An empty block therefore establishes that the details are not on file, and that is what a reader can take from it.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Treating sign-off as an administrative step to be caught up after the processing begins, so the record cannot show when the decision was taken or on what information.",
    relatedCitations: [
      { citation: "GDPR Art. 24(1)", label: "Demonstrating that processing is performed in accordance with the Regulation" },
      { citation: "GDPR Art. 30", label: "Records of processing activities alongside the assessment" },
    ],
  },

  // ── LI ASSESSMENT INTAKE MASTER REVIEW (2026-09-15, F08) — the seven focused
  // fields the page already scrolls the rail to, which had no registry entry.
  // DOC 189 (device access) and DOC 206E (N1/N4/N4b/N6). The EU and UK regimes
  // are kept separate throughout: an ePrivacy Directive article is not a PECR
  // regulation, and which applies is a jurisdiction question.
  device_access: {
    fieldLabel:
      "Does this processing store information on, or read information from, people's phones, computers or browsers?",
    citation: "ePrivacy Directive 2002/58/EC Art. 5(3) (EU) · PECR 2003 reg. 6 (UK)",
    citationUrl: URL_EPRIVACY,
    plainSummary:
      "Storing information on, or gaining access to information already stored in, a user's terminal equipment is governed by rules that sit alongside the GDPR rather than inside it — Article 5(3) of the ePrivacy Directive as implemented in each EU member state, and regulation 6 of PECR in the UK. Article 6(1)(f) does not displace them.",
    regulationText: "",
    coachLead: "Answer for the storage and access this processing performs, not for the site as a whole.",
    coachBody:
      "Cookies, pixels and web beacons, SDK and advertising identifiers, and device or browser fingerprinting are all within the rules, whether or not the person notices. Which regime applies — an implementing law of the ePrivacy Directive, PECR, or both for a controller operating in both markets — is a jurisdiction question the record should make explicit.",
    goodAnswer:
      "Article 5(3) and PECR regulation 6 are drawn to the act of storing or accessing information on terminal equipment, so they bite on the technique rather than on whether the information is personal data. Both regimes require information to be given and, in the general case, consent to be obtained, subject to the exemptions each sets out. They operate in addition to the Article 6 lawful basis, which is why an assessment can need both an answer here and a lawful basis for the processing that follows.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Reading the question as asking whether personal data is involved. The rules are engaged by the storage of or access to information on a person's device, so a technique that reads a device identifier is in scope even where the controller treats the identifier as non-personal.",
    relatedCitations: [
      { citation: "ePrivacy Directive 2002/58/EC Art. 5(3)", label: "EU rule on storing or accessing information on terminal equipment" },
      { citation: "PECR 2003 reg. 6", label: "UK rule on storage of and access to information on terminal equipment" },
    ],
  },
  device_access_strictly_necessary: {
    fieldLabel:
      "Is that device access limited to what is strictly necessary to provide a service the person has asked for?",
    citation: "ePrivacy Directive 2002/58/EC Art. 5(3) (EU) · PECR 2003 reg. 6 (UK) — strictly-necessary exemption",
    citationUrl: URL_PECR,
    plainSummary:
      "Both regimes exempt storage or access that is strictly necessary to provide a service explicitly requested by the user, and the EU rule also exempts what is required solely to carry out a transmission. The UK rules carry further exceptions of their own, so the answer is jurisdiction-specific.",
    regulationText: "",
    coachLead: "Answer against the service the person actually asked for, and name the jurisdiction you are answering under.",
    coachBody:
      "Keeping someone signed in, remembering a basket and protecting their account are the kind of purposes the exemption is written around; analytics, advertising, personalisation and audience measurement are ordinarily outside it. Where the EU and UK positions differ for the same technique, the record should say which regime it is answering under rather than giving one answer for both.",
    goodAnswer:
      "The exemption is read narrowly in both regimes: the test is not whether a purpose is useful to the controller, but whether the service the user explicitly requested could be provided without that storage or access. The UK regime contains additional exceptions beyond the EU wording, and the ICO's finalised guidance on storage of and access to information (29 April 2026) sets out how it reads them, so a technique exempt in one jurisdiction is not automatically exempt in the other. “Not sure” records an open question rather than an exemption.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Treating a purpose as strictly necessary because the business could not operate the product commercially without it. The exemption is measured against the service the user requested, and a single implementation can mix exempt and non-exempt purposes, in which case the non-exempt part still needs its own treatment.",
    relatedCitations: [
      { citation: "ICO guidance on storage of and access to information (29 April 2026)", label: "UK regulator's reading of the exceptions in PECR reg. 6" },
      { citation: "EDPB Guidelines 2/2023 on Art. 5(3) ePrivacy Directive", label: "EU reading of the technical scope of Art. 5(3)" },
    ],
  },
  marketing_channels: {
    fieldLabel: "Which channels does the direct marketing use?",
    citation: "ePrivacy Directive 2002/58/EC Art. 13 (EU) · PECR 2003 regs. 21–22 (UK)",
    citationUrl: URL_EPRIVACY,
    plainSummary:
      "The rules on unsolicited direct marketing are channel-specific. Article 13 of the ePrivacy Directive sets the EU position; in the UK, regulation 21 covers live and automated calls and regulation 22 covers electronic mail, which includes SMS. Naming the channels is what identifies which rules apply on top of Article 6(1)(f).",
    regulationText: "",
    coachLead: "Record every channel this activity actually uses.",
    coachBody:
      "Automated calls, live calls, electronic mail and SMS, post and online advertising each sit under different requirements, and a campaign that runs across several is governed by each of them. “None of these” is an accurate entry where the processing is not direct marketing at all.",
    goodAnswer:
      "Article 13 and PECR regulations 21 to 22 attach different conditions to different channels: automated calling systems and electronic mail generally require prior consent, live calls turn on the applicable objection or preference-service rules, and postal marketing sits outside these instruments and is governed by the GDPR alone. Because the conditions differ by channel, listing the channels is what determines which overlay the assessment has to consider — and the GDPR lawful basis is still needed for the underlying processing in every case.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Assuming one permission answers every channel. A permission obtained for one channel does not carry across to another with different conditions, and an assessment covering a multi-channel campaign has to address each.",
    relatedCitations: [
      { citation: "PECR 2003 regs. 21–22", label: "UK rules on calls and electronic mail marketing" },
      { citation: "GDPR Recital 47", label: "Direct marketing may be regarded as a legitimate interest" },
    ],
  },
  marketing_consent_basis: {
    fieldLabel: "For e-mail or SMS marketing to individuals, what permission has been obtained?",
    citation: "PECR 2003 reg. 22(3) (UK, soft opt-in) · ePrivacy Directive 2002/58/EC Art. 13(2) (EU)",
    citationUrl: URL_PECR,
    plainSummary:
      "Electronic mail marketing to individual subscribers generally requires prior consent. Both regimes provide a limited exception for contact details obtained in the course of a sale to an existing customer, for the organisation's own similar products or services, with an opt-out offered at collection and in every message — regulation 22(3) in the UK and Article 13(2) in the EU.",
    regulationText: "",
    coachLead: "Record the permission actually held, and say which regime it was obtained under.",
    coachBody:
      "Consent for these purposes takes its meaning from the GDPR. The soft opt-in is narrower than it is often read: it depends on how the details were obtained, on the similarity of what is being marketed, and on an opt-out having been offered throughout. The charity variant is a separate UK provision. “None” and “Not yet assessed” are recorded as open items.",
    goodAnswer:
      "The exception is conditional in both regimes and the conditions do the work. The contact details must have been obtained in the course of a sale or negotiations for a sale to that person; the marketing must be of the same organisation's own similar products or services; and a simple means of refusing must have been given when the details were collected and in each message. The UK provision is regulation 22(3) of PECR and the EU provision is Article 13(2) of the ePrivacy Directive, and a controller active in both markets cannot assume the two are interchangeable in every respect.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Reading the soft opt-in as covering any existing customer. It is tied to how the details were obtained, to similar products or services from the same organisation, and to an opt-out offered at every stage — and it says nothing about whether the underlying processing has a GDPR lawful basis.",
    relatedCitations: [
      { citation: "ePrivacy Directive 2002/58/EC Art. 13(2)", label: "EU exception for an existing customer relationship" },
      { citation: "GDPR Art. 4(11) and Art. 7", label: "What consent means for these rules" },
    ],
  },
  achievable_without_personal_data: {
    fieldLabel: "Could this purpose be achieved without personal data, or with anonymised or synthetic data?",
    citation: "GDPR Art. 5(1)(c) (data minimisation) · Art. 6(1)(f) (necessity limb)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Necessity under Article 6(1)(f) and minimisation under Article 5(1)(c) ask the same question from two directions: whether the purpose can be reached with less, or with no, personal data. This answer records where that question landed.",
    regulationText: ART_5_1_C,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 5(1)(c) (verbatim)",
    coachLead: "Answer for the purpose as stated above, not for the system as built.",
    coachBody:
      "A route that reaches the purpose without personal data is a finding the assessment records and works with; it does not have to be avoided. “Not assessed” is honest where the comparison has not been run, and the report carries it as an open item.",
    goodAnswer:
      "Necessity is not the same as convenience. The Court of Justice has read the necessity limb strictly, asking whether the purpose could reasonably be achieved by other means that are less intrusive (see CJEU C-708/18). Where truly anonymous or synthetic data would deliver the same result, the processing of personal data is hard to describe as necessary; where it would not, the reason is itself part of the necessity record.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Reading the question as asking whether the current system happens to use personal data. It asks whether the stated purpose could be achieved another way — and pseudonymised data is still personal data, so replacing identifiers with tokens does not on its own answer it.",
    relatedCitations: [
      { citation: "GDPR Recital 26", label: "When data are anonymous and outside the Regulation" },
      { citation: "CJEU C-708/18", label: "Necessity read strictly where a less intrusive route exists" },
    ],
  },
  achievable_without_personal_data_rationale: {
    fieldLabel: "Why is personal data required for this purpose?",
    citation: "GDPR Art. 6(1)(f) (necessity limb) · Art. 5(1)(c)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Where the purpose cannot be reached without personal data, the reason is the substance of the necessity finding. This field carries it.",
    regulationText: ART_5_1_C,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 5(1)(c) (verbatim)",
    coachLead: "Say what the purpose needs the identifiable individual for.",
    coachBody:
      "Name the step that fails without identification — an action taken against a particular account, a duty owed to a named person, a decision that has to attach to someone. Where anonymisation was tested and fell short, say what it lost.",
    goodAnswer:
      "“The outcome is an action on one account — holding it before activation — so the score has to attach to an identified signup; aggregate risk rates were tested and show the overall trend but cannot say which account to hold.” — the step that needs identification, and what the tested alternative lost.",
    commonMistake:
      "Restating that the data is needed without saying what it is needed for. A necessity finding rests on the step that fails without identification, not on the assertion that identification is required.",
    relatedCitations: [
      { citation: "GDPR Recital 26", label: "When data are anonymous and outside the Regulation" },
      { citation: "EDPB Guidelines 1/2024, §§ 26–29", label: "The necessity assessment this answer feeds" },
    ],
  },
  art9_condition: {
    fieldLabel: "Which Article 9(2) condition applies to the special-category data?",
    citation: "GDPR Art. 9(1) · Art. 9(2)(a)–(j)",
    citationUrl: URL_EU_GDPR,
    plainSummary:
      "Article 9(1) prohibits the processing of special categories of personal data unless one of the conditions in Article 9(2)(a) to (j) applies. A lawful basis under Article 6(1)(f) does not satisfy Article 9 on its own; an additional Article 9(2) condition is needed as well.",
    regulationText: ART_9_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "GDPR Art. 9(1) (verbatim)",
    coachLead: "Record the condition you are relying on, or the fact that one has not been identified.",
    coachBody:
      "Several of the conditions also require a basis in Union or member state law, or in UK law, so the condition and its legal foundation are separate facts. “None identified” and “Not yet assessed” are honest answers: the report records them as open items rather than as defects, and they leave the original category selection intact.",
    goodAnswer:
      "Article 6 and Article 9 operate in layers. Article 6(1)(f) can supply the lawful basis while Article 9(1) still prohibits the processing unless a condition in Article 9(2) applies, so both have to be satisfied. The scope of Article 9(1) is also narrower than it first reads for one category: biometric data falls inside it only where it is processed for the purpose of uniquely identifying a natural person, so the same data used for another purpose may sit outside Article 9 while remaining subject to the rest of the Regulation.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Reading Article 6(1)(f) as carrying special-category data by itself, or treating any processing of biometric data as automatically within Article 9(1). The Article 9(2) condition is a separate requirement, and the biometric limb turns on whether the purpose is unique identification.",
    relatedCitations: [
      { citation: "GDPR Art. 9(2)(a)–(j)", label: "The conditions that lift the Art. 9(1) prohibition" },
      { citation: "UK GDPR Art. 9 and DPA 2018 Sch. 1", label: "UK conditions and the associated appropriate-policy requirements" },
    ],
  },
};
