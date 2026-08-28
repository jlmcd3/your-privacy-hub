// COACHING CONTENT RULE — as amended by the Shared Intake Register v1.2 (A5).
// Coaching may be SUBSTANTIVE: it may show a complete model answer with legal
// context, so long as (a) every example is a generic exemplar and never the
// customer's own facts, (b) every claim about what the report will do is true
// of the pipeline, and (c) no legal outcome is promised.
// Voice: second person, present tense, active. One idea per sentence.
// Layered: coachLead = one line an expert acts on instantly; coachBody +
// goodAnswer/commonMistake = the expansion for newer users.

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

  // ── INTAKE GOLD STANDARD (register v1.2) — coaching for the fields that
  // carried no rail before. A5: substantive model answers permitted.
  data_subjects: {
    fieldLabel: "Who are the people whose data you are using?",
    citation: "GDPR Art. 35(7)(a)",
    plainSummary:
      "The population, its size and anything about it that raises the stakes — children, employees, patients, people in a dependent relationship with you.",
    regulationText: "\u2026",
    coachLead: "Name the group, its size, and whether anyone in it is vulnerable.",
    coachBody:
      "Your risk analysis weighs severity against the people affected. A group that cannot easily refuse — staff, children, patients, benefit claimants — carries more weight than a general adult audience, and the assessment can only say so if the record says who they are.",
    goodAnswer:
      "A strong answer names the group, the number and the sensitivity: \u201CAround 250 delivery drivers employed in the UK and Ireland, all adults, in an employment relationship with us, plus roughly 40 agency staff.\u201D",
    commonMistake:
      "Writing \u201Ccustomers\u201D or \u201Cusers\u201D alone. That population could be four people or four million, and the severity appraisal has nothing to work with.",
  },
  volume_frequency: {
    fieldLabel: "How much data, and how often?",
    citation: "GDPR Art. 35(7)(a)",
    plainSummary:
      "Scale and cadence together. Both feed the appraisal of how intrusive the processing is.",
    regulationText: "\u2026",
    coachLead: "One answer, two parts: how many, and how often.",
    coachBody:
      "Scale drives the large-scale question under Art. 35(3); cadence drives the systematic-monitoring question. A complete answer carries both, with numbers rather than adjectives.",
    goodAnswer:
      "A strong answer quantifies both: \u201CAround 250 staff, one location ping every five minutes during rostered shifts, roughly 24,000 records a day.\u201D",
    commonMistake:
      "Answering \u201Chigh volume, continuous\u201D. Adjectives cannot be compared against the regulator's thresholds; numbers can.",
  },
  retention_period: {
    fieldLabel: "How long do you keep this data, and why that long?",
    citation: "GDPR Art. 5(1)(e)",
    plainSummary:
      "Storage limitation. A period without a reason is a number the assessment cannot test.",
    regulationText: "\u2026",
    coachLead: "Give the period, the reason for it, and what happens at the end.",
    coachBody:
      "The test is whether the period is no longer than necessary for the purpose. That is only assessable when the record ties the number to something \u2014 an audit cycle, a limitation period, a statutory schedule \u2014 and says what happens when it expires.",
    goodAnswer:
      "A strong answer names the period and ties it to a reason: \u201C24 months, matching our audit cycle, then automatic deletion; aggregated statistics with no identifiers are kept indefinitely.\u201D",
    commonMistake:
      "\u201CAs long as necessary.\u201D That restates the article instead of answering it, and the assessment records the period as undetermined.",
  },
  controller_country: {
    fieldLabel: "Where your organisation is established",
    citation: "GDPR Art. 4(16), Art. 56",
    plainSummary:
      "Establishment decides which supervisory authority oversees this processing, and whether the one-stop-shop is available to you.",
    regulationText: "\u2026",
    coachLead: "Establishment drives the regulator, so the answer must match reality.",
    coachBody:
      "Under Art. 4(16)(a) the main establishment is where the controller's central administration in the Union sits \u2014 unless decisions on the purposes and means are actually taken by another establishment that can have them implemented, in which case that one governs. The assessment names your lead authority from what you record here and nowhere else.",
    goodAnswer:
      "A strong answer reflects where the work actually happens: an organisation headquartered in Dublin with a German engineering site that owns no decisions records Ireland as both establishment and central administration.",
    commonMistake:
      "Recording the country of incorporation when the decisions are taken somewhere else. Art. 4(16) follows decision-making authority, not the registry.",
  },
  central_administration_country: {
    fieldLabel: "Where decisions about this processing are made",
    citation: "GDPR Art. 4(16)(a)",
    plainSummary:
      "The place of central administration in the Union. Where it sits in the EEA, the one-stop-shop can apply and one lead authority handles the file.",
    regulationText: "\u2026",
    coachLead: "Name the place where the purposes and means are actually decided.",
    coachBody:
      "This is the seat that sets what the processing is for and how it is done \u2014 not the largest office and not the busiest data centre. When it sits outside the EEA and no EU establishment holds decision authority, the one-stop-shop is unavailable and every affected authority may act.",
    goodAnswer:
      "A strong answer is the single country where the decision sits: \u201CIreland \u2014 the Dublin leadership team sets the purpose, the retention rule and the vendor.\u201D",
    commonMistake:
      "Naming the country with the most staff. Headcount does not decide main establishment; decision-making authority does.",
  },
  eu_decision_establishment_country: {
    fieldLabel: "EU office that decides how this processing runs",
    citation: "GDPR Art. 4(16)(a)",
    plainSummary:
      "Where an EU establishment other than the central administration takes the decisions and can have them implemented, that establishment becomes the main establishment.",
    regulationText: "\u2026",
    coachLead: "Answer only where an EU office genuinely holds the decision.",
    coachBody:
      "This field exists for the second limb of Art. 4(16)(a). It applies when a non-EU parent leaves the purposes and means genuinely to an EU establishment that can implement them \u2014 not when the EU office merely carries out instructions.",
    goodAnswer:
      "A strong answer is left empty unless the power is real: a US parent whose Amsterdam entity independently sets the purpose and can implement it records the Netherlands.",
    commonMistake:
      "Recording an EU office that only executes head-office instructions. Implementation is not decision authority, and the one-stop-shop does not follow it.",
  },
  dpia_scope_note: {
    fieldLabel: "What this assessment covers and what it leaves out",
    citation: "GDPR Art. 35(1)",
    plainSummary:
      "The boundary of the assessment. Anything outside it is not assessed, and the report says so.",
    regulationText: "\u2026",
    coachLead: "Draw the boundary, and say what sits outside it.",
    coachBody:
      "A DPIA covers a set of processing operations. Naming the exclusions protects you later: it shows the omission was a considered scope decision rather than an oversight, and it tells the reader where a further assessment is owed.",
    goodAnswer:
      "A strong answer states both sides: \u201CCovers location capture, storage and rostering use. Excludes the separate payroll integration, which is assessed under its own record.\u201D",
    commonMistake:
      "Leaving the scope open. An unbounded scope makes every unmentioned operation look unassessed.",
  },
  data_subjects_views: {
    fieldLabel: "Views of the people whose data you are using",
    citation: "GDPR Art. 35(9)",
    plainSummary:
      "Where appropriate, the controller seeks the views of data subjects or their representatives on the intended processing.",
    regulationText: "\u2026",
    coachLead: "Either what they said, or why asking was not appropriate.",
    coachBody:
      "Art. 35(9) treats consultation as the norm and non-consultation as the thing that needs a reason. Both routes are answerable: a summary of what came back, or a specific justification such as commercial confidentiality or disproportionate effort.",
    goodAnswer:
      "A strong answer summarises the exchange and its effect: \u201CConsulted the works council in March 2026. Two objections on out-of-hours tracking led to geofencing limited to rostered shifts.\u201D",
    commonMistake:
      "Treating consultation as optional and saying nothing. Silence reads as an unexplained omission of an express Art. 35(9) step.",
  },
};

