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
};
