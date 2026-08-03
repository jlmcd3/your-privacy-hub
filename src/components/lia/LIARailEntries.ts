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
};

