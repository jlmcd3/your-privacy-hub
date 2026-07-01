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
};
