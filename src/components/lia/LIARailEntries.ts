// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer (what facts satisfy the law, what answer "passes").
// goodAnswer examples are clearly fictional and illustrate FORM, never a template.
// Voice: imperative, active, plain subject-verb-object, one idea per sentence,
// specific over vague, no ornamental legalese. Layered: coachLead = one line an
// expert acts on instantly; goodAnswer/commonMistake = the expansion for newer users.

import type { RailEntry } from "@/components/intake/RailEntry";

export const LIA_RAIL: Record<string, RailEntry> = {
  subject_anchor: {
    fieldLabel: "In one line — what does this assessment cover?",
    citation: "GDPR Art. 6(1)(f)",
    plainSummary:
      "One assessment covers one legitimate interest. This line names it and fixes it for all your revision runs.",
    regulationText: "…",
    coachLead: "Name one interest, in one line.",
    coachBody:
      "State the single purpose this assessment will test. If you have two purposes, run two assessments — bundling weakens the balancing test for both.",
    goodAnswer:
      "\u201CFraud screening of new account signups.\u201D — one interest, one line, nothing bundled.",
    commonMistake:
      "Naming a category (\u201Cmarketing\u201D) instead of an interest. The balancing test needs a specific purpose to weigh, not a department.",
  },
  processing_description: {
    fieldLabel: "What processing are you considering?",
    citation: "GDPR Art. 6(1)(f)",
    plainSummary:
      "The detailed account of the processing behind the locked interest above. Fully editable across your runs.",
    regulationText: "…",
    coachLead: "Walk it end to end: the data, the operation, the output, who benefits.",
    coachBody:
      "Describe the actual mechanism — what data is used, what is done to it, what it produces, and the benefit it delivers. Specifics carry the necessity and balancing analysis; summaries flatten it.",
    goodAnswer:
      "\u201CNew signups are scored against device, velocity and address-mismatch signals; accounts over the risk threshold are held for manual review before activation.\u201D — the operation, the inputs, the output, and where it bites.",
    commonMistake:
      "Restating the interest instead of describing the processing. The interest says why; this field says what actually happens to whose data.",
  },
  relationship: {
    fieldLabel: "Your relationship with the data subjects",
    citation: "GDPR Recital 47",
    plainSummary:
      "Reasonable expectations turn on the relationship — customer, employee, prospect, or none.",
    regulationText: "…",
    coachLead: "Name the real relationship — and when it started.",
    coachBody:
      "Say who these people are to you and how the relationship arose. An existing customer expects different processing than someone whose data you obtained from a third party.",
    goodAnswer:
      "\u201CActive account holders; the relationship begins at signup and the processing starts the same day.\u201D — who, since when, and how the processing meets them.",
    commonMistake:
      "Choosing the closest-sounding category without stating when and how the relationship arose — timing drives the expectations analysis.",
  },

  // ── UPGRADE-4 (ITEM 5) — one entry per new intake field. Citations point at
  // EDPB Guidelines 1/2024 paragraphs and ICO LIA template sections. Coaching
  // describes the SHAPE of a complete answer only; regulationText is left as a
  // placeholder rather than paraphrasing law (byte-exact article text reaches
  // the rail through useGdprRailEntry on the section rail).
  specific_benefit: {
    fieldLabel: "What specific benefit does this processing deliver?",
    citation: "EDPB Guidelines 1/2024, §§ 18–21 (interest must be real and present)",
    plainSummary:
      "An interest only counts if it is lawful, clearly articulated, and real and present. A named benefit is what makes it real rather than speculative.",
    regulationText: "…",
    coachLead: "Name the outcome, not the activity.",
    coachBody:
      "State what measurably changes because the processing happens. An activity restated as a benefit (\u201Cwe analyse the data\u201D) leaves the interest unevidenced.",
    goodAnswer:
      "\u201CChargeback losses on new accounts fall because high-risk signups are held before activation.\u201D — an outcome, attributable to the processing.",
    commonMistake:
      "Describing a future or hoped-for benefit. A speculative benefit is not \u201Creal and present\u201D.",
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
    plainSummary:
      "Article 6(1)(f) covers interests pursued by the controller or by a third party. Naming the beneficiary class fixes whose interest is being weighed.",
    regulationText: "…",
    coachLead: "Say whose interest is on the scale.",
    coachBody:
      "Pick the class that actually receives the benefit. Where individuals also benefit, that belongs on the record — but it does not replace the controller's own interest.",
    commonMistake:
      "Claiming the individual as beneficiary to soften the balance, where the practical benefit runs to the business.",
  },
  alternatives_rationale: {
    fieldLabel: "For each alternative, why would it not achieve the purpose?",
    citation: "EDPB Guidelines 1/2024, §§ 26–29 (necessity)",
    plainSummary:
      "Necessity fails if a less intrusive route reaches the same result. The record must show each alternative was tested, not just listed.",
    regulationText: "…",
    coachLead: "One alternative per line, each with the outcome it would miss.",
    coachBody:
      "For every option named, state the specific result it would not deliver. A list without reasons shows consideration but not necessity.",
    goodAnswer:
      "\u201CAggregate reporting — would not identify the individual account to hold.\u201D — alternative, then the shortfall.",
    commonMistake:
      "Rejecting alternatives as \u201Cimpractical\u201D or \u201Ctoo costly\u201D without saying what outcome is lost. Cost alone rarely carries necessity.",
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
    plainSummary:
      "Recital 47 makes the relationship an express input to reasonable expectations. Stating it keeps the analysis from inferring it.",
    regulationText: "…",
    coachLead: "Choose the relationship as it stands today, not as it began.",
    coachBody:
      "Former customers and lapsed contacts are not current customers. Where several classes are in scope, choose the weakest — the balance is set by the least-connected group.",
    commonMistake:
      "Selecting the strongest relationship in the population and letting it speak for everyone in it.",
  },
  scale_frequency_duration: {
    fieldLabel: "Scale, frequency and duration",
    citation: "EDPB Guidelines 1/2024, §§ 51–54 (impact on data subjects)",
    plainSummary:
      "Impact scales with how many people are affected, how often, and for how long. These three dimensions are weighed separately.",
    regulationText: "…",
    coachLead: "Give three numbers, not one adjective.",
    coachBody:
      "Approximate headcount, how often the processing runs against a given person, and how long the data is held for this purpose. Approximations are acceptable; ranges are better than silence.",
    goodAnswer:
      "\u201C~40,000 signups a year; scored once at signup and re-scored on address change; scores retained 24 months.\u201D",
    commonMistake:
      "Answering \u201Congoing\u201D or \u201Cas needed\u201D. Neither can be weighed against an individual's interests.",
  },
  potential_harms: {
    fieldLabel: "Which harms could this processing cause?",
    citation: "EDPB Guidelines 1/2024, §§ 51–58 (likely impact)",
    plainSummary:
      "The balance turns on the harms actually in play — material and non-material — not on a single severity label.",
    regulationText: "…",
    coachLead: "Select every harm in play, including the ones you mitigate.",
    coachBody:
      "A mitigated harm is still a harm on the record; mitigation is weighed after it is named. Selecting only unmitigated harms understates the impact side of the balance.",
    commonMistake:
      "Treating an existing safeguard as a reason not to list the harm it addresses.",
  },
  opt_out_available: {
    fieldLabel: "Can individuals opt out of this processing?",
    citation: "GDPR Art. 21 · Recital 47 (right to object)",
    plainSummary:
      "Article 21 gives an unconditional right to object to direct marketing, and a qualified right otherwise. Whether an opt-out exists, and on what terms, is a balancing factor in its own right.",
    regulationText: "…",
    coachLead: "State the terms, not just the existence, of the opt-out.",
    coachBody:
      "An opt-out that is conditional, reviewed, or costs the individual something weighs differently from one honoured on request. Say which this is.",
    commonMistake:
      "Recording \u201Cyes\u201D where the opt-out is discretionary or applies only to part of the processing.",
  },
  attestation_dpo_review: {
    fieldLabel: "DPO or privacy-lead review",
    citation: "GDPR Art. 39(1)(a)–(b) (DPO tasks: advice and monitoring)",
    plainSummary:
      "Where a DPO is appointed, their advisory and monitoring role is documented on the assessment itself. Who reviewed it, and when.",
    regulationText: "…",
    coachLead: "Name a person and a date, or say it has not happened yet.",
    coachBody:
      "A role title with no name and no date does not evidence review. \u201CPlanned\u201D is an accurate answer where the review is scheduled.",
    commonMistake:
      "Recording the author of the assessment as its reviewer. Review is a second pair of eyes.",
  },
  attestation_approver: {
    fieldLabel: "Approved by",
    citation: "GDPR Art. 5(2) (accountability)",
    plainSummary:
      "Accountability requires the controller to demonstrate the assessment was adopted, not merely drafted. The approver carries that.",
    regulationText: "…",
    coachLead: "Record the person who can accept the residual risk.",
    coachBody:
      "Name, position, and date of approval. The position matters: it shows the decision sat at a level able to authorise the processing.",
    commonMistake:
      "Leaving approval to be added later and shipping the assessment unsigned.",
  },
  attestation_review_triggers: {
    fieldLabel: "What would trigger a re-review?",
    citation: "GDPR Art. 5(2) · EDPB Guidelines 1/2024 § 76 (ongoing assessment)",
    plainSummary:
      "An LIA is a point-in-time judgement. Naming the events that invalidate it is what keeps it current.",
    regulationText: "…",
    coachLead: "List events, not a calendar date.",
    coachBody:
      "Changes to purpose, data categories, recipients, retention, or a rise in objections each unsettle the balance. A scheduled date can sit alongside them, never instead of them.",
    commonMistake:
      "Recording \u201Cannual review\u201D alone. A material change six weeks in leaves the assessment stale for ten months.",
  },

  // ── DISPATCH 3 (INTAKE GOLD STANDARD, register v1.2 · A5) — substantive
  // coaching for the narrative and judgment fields. Model answers carry legal
  // context because the LIA prompt reads these fields verbatim; identity and
  // format fields stay hint-only per A2.
  interest_statement: {
    fieldLabel: "In your own words, what is the legitimate interest you are relying on?",
    citation: "GDPR Art. 6(1)(f) \u00b7 EDPB Guidelines 1/2024 \u00a7\u00a7 18\u201321",
    plainSummary:
      "An interest qualifies only if it is lawful, precisely articulated, and real and present rather than speculative. This field is the articulation.",
    regulationText: "\u2026",
    coachLead: "State the interest itself \u2014 not the notice wording, not the department.",
    coachBody:
      "Write the interest as a purpose a regulator could weigh: what you are pursuing and why it matters to the business now. Two interests bundled into one sentence produce a balance that resolves neither.",
    goodAnswer:
      "\u201CPreventing payment fraud on newly opened accounts, where losses in the first 30 days after signup account for most of our chargeback exposure.\u201D \u2014 one interest, present tense, and the reason it is real today.",
    commonMistake:
      "Writing the privacy-notice sentence here. The notice describes the processing to individuals; this field states the interest being weighed.",
  },
  stated_purpose: {
    fieldLabel: "How would you state this purpose to data subjects in a privacy notice?",
    citation: "GDPR Arts. 13\u201314 \u00b7 Recital 47 (reasonable expectations)",
    plainSummary:
      "Reasonable expectations are formed by what individuals were told. The notice wording is therefore evidence in the balance, not decoration.",
    regulationText: "\u2026",
    coachLead: "Write the sentence a reader would actually meet in your notice.",
    coachBody:
      "Plain language, active voice, and the same scope as the interest above. A notice that is broader than the interest weakens the balance; one that is narrower leaves processing undisclosed.",
    goodAnswer:
      "\u201CWe check new account signups for signs of fraud, using device and address information, and may hold an account for manual review before it is activated.\u201D \u2014 what happens, what data, what consequence.",
    commonMistake:
      "Reusing an internal purpose label. \u201CRisk management\u201D tells an individual nothing they could form an expectation from.",
  },
  alternatives: {
    fieldLabel: "What alternatives have you considered?",
    citation: "EDPB Guidelines 1/2024, \u00a7\u00a7 26\u201329 (necessity)",
    plainSummary:
      "Necessity means no less intrusive route reaches the same result. The record must show the routes that were examined.",
    regulationText: "\u2026",
    coachLead: "List the routes you tested, one per line.",
    coachBody:
      "Include the options a regulator would expect you to have considered \u2014 consent, less data, aggregation, a manual process, doing nothing \u2014 even where you rejected them quickly. The reasons belong in the next field.",
    goodAnswer:
      "\u201CConsent at signup; aggregate-only risk reporting; manual review of every application; a shorter retention window for scores.\u201D \u2014 four distinct routes, each testable.",
    commonMistake:
      "Naming a single alternative and rejecting it. One comparison rarely evidences that this processing is the least intrusive route available.",
  },
  why_consent_not_used: {
    fieldLabel: "Why is consent not appropriate here?",
    citation: "GDPR Art. 7 \u00b7 Recital 43 \u00b7 EDPB Guidelines 1/2024 \u00a7\u00a7 26\u201329",
    plainSummary:
      "Where consent is workable, legitimate interests is generally the wrong basis. Explaining why consent fails is part of the necessity record.",
    regulationText: "\u2026",
    coachLead: "Say what breaks if consent is the basis \u2014 in operational terms.",
    coachBody:
      "Freely given, specific, informed and unambiguous are the tests. Point at the one that cannot be met here: an imbalance of power, a purpose defeated by notice, or a population you cannot reach before processing begins.",
    goodAnswer:
      "\u201CFraud screening runs before the account exists, so there is no party able to give informed consent at that moment; asking after activation would let the loss occur first.\u201D",
    commonMistake:
      "Answering that consent would reduce coverage. Inconvenience is not a reason consent is unavailable \u2014 name the element of valid consent that cannot be satisfied.",
  },
  data_minimised: {
    fieldLabel: "How have you minimised the data used?",
    citation: "GDPR Art. 5(1)(c) (data minimisation)",
    plainSummary:
      "Minimisation is tested against the purpose: adequate, relevant, and limited to what is necessary. The record shows the limits you actually set.",
    regulationText: "\u2026",
    coachLead: "Name what you excluded, not only what you kept.",
    coachBody:
      "Fields dropped, windows shortened, enrichment declined, populations carved out. A limit you can state is a limit a regulator can verify.",
    goodAnswer:
      "\u201CDevice and address-mismatch signals only; no demographic enrichment, no third-party credit data, and transaction history limited to the last 12 months.\u201D",
    commonMistake:
      "Asserting that only necessary data is used without saying what was left out. The claim carries no weight without the exclusions.",
  },
  collection_context: {
    fieldLabel: "When and in what setting was this data collected?",
    citation: "GDPR Recital 47 (time and context of collection)",
    plainSummary:
      "Recital 47 fixes expectations at the moment of collection, in its context \u2014 not at the moment of use.",
    regulationText: "\u2026",
    coachLead: "Describe the moment: who was present, what was being done, what was said.",
    coachBody:
      "Where collection happens more than once, describe each occasion. A relationship formed in a branch and one formed through a third-party list produce different expectations from identical data.",
    goodAnswer:
      "\u201CCollected at account opening in branch, with the fraud check described in the account terms; refreshed at each transaction the customer initiates.\u201D",
    commonMistake:
      "Describing what the privacy notice says instead of the circumstances. The notice is one input to expectations, not the whole context.",
  },
  reasonable_expectation_detail: {
    fieldLabel: "Why would (or would not) data subjects expect this?",
    citation: "GDPR Recital 47 \u00b7 EDPB Guidelines 1/2024 \u00a7\u00a7 47\u201350",
    plainSummary:
      "The selected expectation level is a conclusion. This field carries the reasoning behind it, which is what the balance weighs.",
    regulationText: "\u2026",
    coachLead: "Give the evidence \u2014 the relationship, the disclosure, the norm.",
    coachBody:
      "Point at what would put a reasonable person on notice: the terms they accepted, the sector norm, the visibility of the control. Where expectation is weak, say so; an honest weak answer is weighed properly, an overstated one is not.",
    goodAnswer:
      "\u201CFraud screening is described in the account terms and is a standard feature of retail banking, so a new customer would expect it; the re-scoring on address change is less visible and may not be anticipated.\u201D",
    commonMistake:
      "Treating the existence of a privacy notice as proof of expectation. Buried disclosure rarely forms a reasonable expectation on its own.",
  },
  safeguards: {
    fieldLabel: "Which safeguards are in place?",
    citation: "EDPB Guidelines 1/2024, \u00a7\u00a7 59\u201365 (mitigating measures)",
    plainSummary:
      "Safeguards are weighed after the harms are named. Measures the GDPR already requires are baseline compliance rather than weight on the scale.",
    regulationText: "\u2026",
    coachLead: "Select what is running today, not what is planned.",
    coachBody:
      "A safeguard in a roadmap does not reduce present impact. Anything not yet live belongs in the mitigations narrative with its status stated.",
    commonMistake:
      "Selecting the full list because each measure exists somewhere in the organisation. The question is what protects this processing.",
  },
  additional_mitigations: {
    fieldLabel: "What measures reduce the impact beyond what the law already requires?",
    citation: "EDPB Guidelines 1/2024, \u00a7\u00a7 59\u201365 (measures that can tip the balance)",
    plainSummary:
      "Only measures going beyond existing obligations can shift the balance. Encryption, access control and retention limits are duties, not mitigations.",
    regulationText: "\u2026",
    coachLead: "Name the measure you were free not to offer.",
    coachBody:
      "An unconditional opt-out, a human review you are not required to provide, a shorter retention than the purpose would allow, a population excluded voluntarily. State the measure and who it protects.",
    goodAnswer:
      "\u201CAny customer held for review can request human re-examination within one working day, and we exclude accounts flagged as belonging to under-18s from automated holds entirely.\u201D",
    commonMistake:
      "Listing baseline security controls here. They are already assumed, so they add nothing to the individual\u2019s side of the balance.",
  },
  additional_context: {
    fieldLabel: "Anything else about this processing to weigh?",
    citation: "GDPR Art. 5(2) (accountability)",
    plainSummary:
      "The balance is a record of what was actually considered. Material context left out of the record cannot be shown to have been weighed.",
    regulationText: "\u2026",
    coachLead: "Add the constraint a reviewer would ask about.",
    coachBody:
      "Sector rules, a pending change to the processing, a prior complaint, a supervisory authority contact, a dependency on a processor. Silence here reads as nothing further to consider.",
    commonMistake:
      "Repeating answers already given above. Restatement adds length to the record without adding anything to weigh.",
  },
  opt_out_mechanism: {
    fieldLabel: "How can data subjects object or opt out?",
    citation: "GDPR Art. 21(1)\u2013(3) (right to object) \u00b7 Art. 12(2)",
    plainSummary:
      "Article 21 gives an unconditional right to object, and Article 12 requires the controller to facilitate its exercise. The mechanism is what makes the right real.",
    regulationText: "\u2026",
    coachLead: "Describe the route, the effort it costs, and the response time.",
    coachBody:
      "Where the objection lands, what the individual has to do, how quickly processing stops, and whether anything continues afterwards. A mechanism without a timescale cannot be assessed.",
    goodAnswer:
      "\u201COne-click unsubscribe in every message, plus an account-level toggle; objections received at privacy@ are actioned within five working days and suppression is permanent.\u201D",
    commonMistake:
      "Naming an inbox with no service standard. An unmonitored channel is not a facilitated right to object.",
  },
  attestation_block: {
    fieldLabel: "Attestation and review",
    citation: "GDPR Art. 5(2) (accountability) \u00b7 EDPB Guidelines 1/2024 \u00a7 76",
    plainSummary:
      "Accountability turns on adoption. An assessment that names no reviewer and no approver records a draft rather than a decision.",
    regulationText: "\u2026",
    coachLead: "Sign it, or it commits no one.",
    coachBody:
      "Reviewer, approver, dates, and the events that would send it back for re-examination. Left blank, the report states on its face that the assessment was not adopted.",
    commonMistake:
      "Deferring sign-off until after the processing starts. The record then shows the decision was taken without the assessment.",
  },
};
