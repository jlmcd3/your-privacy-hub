// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer (what facts satisfy the law, what answer "passes").
// goodAnswer examples are clearly fictional and illustrate FORM, never a template.
// Voice: imperative, active, plain subject-verb-object, one idea per sentence,
// specific over vague, no ornamental legalese. Layered: coachLead = one line an
// expert acts on instantly; goodAnswer/commonMistake = the expansion for newer users.

import type { RailEntry } from "@/components/intake/RailEntry";

export const DPIA_RAIL: Record<string, RailEntry> = {
  name: {
    fieldLabel: "Name this processing activity",
    citation: "GDPR Art. 35(1)",
    plainSummary:
      "The activity title. Set once, fixed across your runs — it names the record.",
    regulationText: "…",
    coachLead: "Title the activity, not the project.",
    coachBody:
      "One specific noun phrase for the processing itself — the thing a regulator would recognise. Everything beneath it can change; the title is the record's name.",
    goodAnswer:
      "\u201CEmployee location monitoring via mobile app.\u201D — the processing, the population, the channel.",
    commonMistake:
      "Using the internal project codename. \u201CProject Falcon\u201D names a workstream; the DPIA names a processing activity.",
  },
  description: {
    fieldLabel: "Describe the processing activity in detail",
    citation: "GDPR Art. 35(7)(a)",
    plainSummary:
      "The systematic description the DPIA is built on — flows, access, storage, retention.",
    regulationText: "…",
    coachLead: "Walk the data through the system, start to finish.",
    coachBody:
      "What is collected and from whom; what happens to it at each step; who can see it; where it lives; how long you keep it. If the activity serves several purposes, set each out separately — each is analysed on its own.",
    goodAnswer:
      "\u201CGeolocation pings every 5 minutes during shifts, stored 90 days in EU-hosted storage; access limited to two rostering managers; auto-deleted thereafter.\u201D — cadence, retention, access, location, each stated as a number or a name.",
    commonMistake:
      "Describing the goal (\u201Cimprove shift planning\u201D) instead of the mechanism. The risk analysis works on what happens to the data, not on why you want it.",
  },
  purpose: {
    fieldLabel: "What is the purpose of this processing?",
    citation: "GDPR Art. 35(7)(a)",
    plainSummary:
      "Each distinct purpose is analysed and reported individually.",
    regulationText: "…",
    coachLead: "One purpose per paragraph — data, need, access, retention for each.",
    coachBody:
      "Number the purposes or give each a short paragraph. For every one: what data it involves, why it is needed, who accesses it, where it is stored, how long it is kept.",
    goodAnswer:
      "\u201C(1) Shift-attendance verification — ping data, 90 days\u2026 (2) Route optimisation — aggregated paths only, 12 months\u2026\u201D — separated, each with its own data and retention.",
    commonMistake:
      "Merging purposes into one sentence. Bundled purposes produce a bundled — and weaker — necessity analysis for every one of them.",
  },
  dpia_prepared_by: {
    fieldLabel: "Who prepared this DPIA",
    citation: "GDPR Art. 35(7)",
    plainSummary:
      "The people who did the work, and the role each held. EDPB DPIA template v1.0 (adopted 10 March 2026) \u00a7 0.5 \u00b66.",
    regulationText: "\u2026",
    coachLead: "Name people and roles, one per line.",
    coachBody:
      "A name on its own leaves the reader guessing at authority. Pair every name with the role it acted in \u2014 who ran the assessment, who supplied the technical facts, who was consulted. A RACI split works well where responsibilities were formally allocated.",
    goodAnswer:
      "\u201CA. Okonjo \u2014 Privacy Counsel (Responsible); R. Lindqvist \u2014 Head of Platform Engineering (Consulted); D. Dasher \u2014 DPO (Accountable).\u201D \u2014 one line per person, name and role together.",
    commonMistake:
      "Naming a department instead of people. \u201CThe Privacy Team\u201D records no one; the accountability field asks who actually conducted the assessment.",
  },
  dpia_approval: {
    fieldLabel: "Formal approval of this DPIA",
    citation: "GDPR Art. 35(7)",
    plainSummary:
      "The responsible official who approved the assessment as complete, their title, and the date. EDPB DPIA template v1.0 (adopted 10 March 2026) \u00a7 0.5 \u00b610.",
    regulationText: "\u2026",
    coachLead: "Approval is a person with authority, a title, and a date.",
    coachBody:
      "The official who signs off is the one who can accept the residual-risk position on the organisation's behalf \u2014 typically a Managing Director, CEO or equivalent. All three parts belong on the record together; a date without a name, or a name without a capacity, is not an approval.",
    goodAnswer:
      "\u201CM. Ferrante, Managing Director, 14 April 2026.\u201D \u2014 the person, the capacity they approved in, the date they did it.",
    commonMistake:
      "Recording the day the document was finished as though it were the approval date. Completion and formal validation are two separate events, and the template asks for both.",
  },
  dpia_signoff_basis: {
    fieldLabel: "Basis for sign-off",
    citation: "GDPR Art. 35(7)",
    plainSummary:
      "What the approval rests on \u2014 what was reviewed and what risk position was accepted.",
    regulationText: "\u2026",
    coachLead: "State what was reviewed and what residual risk was accepted.",
    coachBody:
      "The basis is the reasoning behind the signature: which sections the official read, which residual risks they accepted, and any condition attached to proceeding. Conditions belong here in specific terms, tied to the measure that satisfies them.",
    goodAnswer:
      "\u201CApproval rests on Sections 3 and 4 as reviewed on 12 April 2026, acceptance of two moderate residual risks, and the condition that the 30-day raw-frame deletion job is verified in production before launch.\u201D",
    commonMistake:
      "Writing \u201Capproved subject to compliance with GDPR.\u201D That restates the obligation and records no decision \u2014 the basis has to name the risks the official actually accepted.",
  },
};
