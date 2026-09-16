// COACHING CONTENT RULE — as amended by the Shared Intake Register v1.2 (A5).
// Coaching may be SUBSTANTIVE: it may show a complete model answer with legal
// context, so long as (a) every example is a generic exemplar and never the
// customer's own facts, (b) every claim about what the report will do is true
// of the pipeline, and (c) no legal outcome is promised.
// Voice: second person, present tense, active. One idea per sentence.
// Layered: coachLead = one line an expert acts on instantly; coachBody +
// goodAnswer/commonMistake = the expansion for newer users.

import type { RailEntry } from "@/components/intake/RailEntry";
import { DPIA_VERIFIED_AUTHORITIES } from "../../../supabase/functions/run-dpia-framework/_local/registry/dpia-verified-authorities";

// DPIA INTAKE MASTER REVIEW (2026-09-15) — F14/F17: regulationText below is
// either an exact verbatim quotation of the cited GDPR provision (kind
// "verbatim") or "" where no single verbatim sentence answers the field.
// Never a paraphrase presented under a verbatim heading. Reused directly from
// the engine's hand-verified registry (same registry EdpbDpiaGuidance.ts
// reuses for WP248) wherever a row already exists, so the exact wording is
// pinned in one place; two clauses with no row in that registry (Art. 4(16)(a)
// and Art. 22(1)) are typed here and were independently checked against
// eur-lex/legislation.gov.uk mirrors during this review.
const GDPR_EU_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679";

const ART_35_1 = DPIA_VERIFIED_AUTHORITIES.dpia_when_required.verbatim_quote;
const ART_35_3_C = DPIA_VERIFIED_AUTHORITIES.dpia_mandatory_public_monitoring.verbatim_quote;
const ART_35_7_A = DPIA_VERIFIED_AUTHORITIES.dpia_content_description.verbatim_quote;
const ART_35_9 = DPIA_VERIFIED_AUTHORITIES.consultation_of_data_subjects_35_9.verbatim_quote;
const ART_5_1_E = DPIA_VERIFIED_AUTHORITIES.principle_storage_limitation.verbatim_quote;
// Art. 9(1) — the special-category prohibition, including the "for the purpose
// of uniquely identifying a natural person" qualification on biometric data.
const ART_9_1 = DPIA_VERIFIED_AUTHORITIES.special_categories_prohibition.verbatim_quote;
// Art. 44 — general principle for transfers. The registry row carries the
// first sentence up to "by the controller and processor", so it is presented
// as an EXCERPT, never as the whole article.
const ART_44_EXCERPT = DPIA_VERIFIED_AUTHORITIES.transfers_general_principle_art44.verbatim_quote;
// Art. 4(16)(a) — main establishment; no dedicated row in the registry above.
const ART_4_16_A =
  "as regards a controller with establishments in more than one Member State, the place of its central administration in the Union, unless the decisions on the purposes and means of the processing of personal data are taken in another establishment of the controller in the Union and the latter establishment has the power to have such decisions implemented, in which case the establishment having taken such decisions is to be considered to be the main establishment";
// Art. 22(1) — right not to be subject to a solely-automated decision; no
// dedicated row in the registry above.
const ART_22_1 =
  "The data subject shall have the right not to be subject to a decision based solely on automated processing, including profiling, which produces legal effects concerning him or her or similarly significantly affects him or her.";

export const DPIA_RAIL: Record<string, RailEntry> = {
  name: {
    fieldLabel: "Name this processing activity",
    citation: "GDPR Art. 35(1)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "The activity title. Set once, fixed across your runs — it names the record.",
    regulationText: ART_35_1,
    regulationTextKind: "verbatim",
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
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "The systematic description the DPIA is built on — flows, access, storage, retention.",
    regulationText: ART_35_7_A,
    regulationTextKind: "verbatim",
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
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Each distinct purpose is analysed and reported individually.",
    regulationText: ART_35_7_A,
    regulationTextKind: "verbatim",
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
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "The people who did the work, and the role each held. EDPB DPIA template v1.0 (adopted 10 March 2026 for public consultation) \u00a7 0.5 \u00b66.",
    regulationText: "",
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
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "The responsible official who approved the assessment as complete, their title, and the date. EDPB DPIA template v1.0 (adopted 10 March 2026 for public consultation) \u00a7 0.5 \u00b610.",
    regulationText: "",
    coachLead: "Approval is a person with authority, a title, and a date \u2014 or a record that none exists yet.",
    coachBody:
      // DPIA INTAKE MASTER REVIEW (2026-09-15, F17/G05) \u2014 the MD/CEO
      // sign-off expectation is the EDPB template's own practice, not a
      // universal GDPR rule; a blank approval field is not itself proof
      // that no decision was taken.
      "The EDPB template expects sign-off by someone able to accept the residual-risk position on the organisation's behalf \u2014 typically a Managing Director, CEO or equivalent \u2014 but that is the template's own expectation, not a GDPR requirement. Record the actual approval status: if approval is planned or has not yet happened, say so. Do not enter the completion date as the approval date, and do not treat a blank as proof that no decision occurred.",
    goodAnswer:
      "\u201CM. Ferrante, Managing Director, 14 April 2026.\u201D \u2014 the person, the capacity they approved in, the date they did it.",
    commonMistake:
      "Recording the day the document was finished as though it were the approval date. Completion and formal validation are two separate events, and the template asks for both.",
  },
  dpia_signoff_basis: {
    fieldLabel: "Basis for sign-off",
    citation: "GDPR Art. 35(7)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "What the approval rests on \u2014 what was reviewed and what risk position was accepted.",
    regulationText: "",
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
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "The population, its size and anything about it that raises the stakes — children, employees, patients, people in a dependent relationship with you.",
    regulationText: ART_35_7_A,
    regulationTextKind: "verbatim",
    coachLead: "Name the group, its size, and whether anyone in it is vulnerable.",
    coachBody:
      "Your risk analysis weighs severity against the people affected. A group that cannot easily refuse — staff, children, patients, benefit claimants — carries more weight than a general adult audience, and the assessment can only say so if the record says who they are.",
    goodAnswer:
      "A strong answer names the group, the number and the sensitivity: \u201CAround 250 delivery drivers employed in the UK and Ireland, all adults, in an employment relationship with us, plus roughly 40 agency staff.\u201D",
    commonMistake:
      "Writing \u201Ccustomers\u201D or \u201Cusers\u201D alone. That population could be four people or four million, and the severity appraisal has nothing to work with.",
  },
  // DOC 160 (2026-09-03) — the imagery-capture typed facts (GDPR Art. 35(3)(c)).
  imagery_capture: {
    fieldLabel: "Does the activity capture imagery or video of identifiable people?",
    citation: "GDPR Art. 35(3)(c)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Whether people can be recognised in any image or video the activity produces, and whether they are its subject or simply in the frame.",
    regulationText: ART_35_3_C,
    regulationTextKind: "verbatim",
    coachLead: "Answer for the footage, not the intention.",
    coachBody:
      // DPIA INTAKE MASTER REVIEW (2026-09-15, F17/G08) \u2014 being identifiable
      // is one fact; scale and systematic character are separate facts and
      // are not established by this answer alone.
      "If a face, a number plate or a name badge can be read from what is captured, the person is identifiable. \u201CSubjects\u201D means the people are what the camera is there for; \u201Cincidentally\u201D means they pass through a frame pointed at something else. This fact feeds the Article 35(3)(c) assessment together with where the imagery is captured, how systematically, and at what scale \u2014 being identifiable, on its own, does not establish every trigger condition.",
    goodAnswer:
      "A warehouse safety camera that records staff at work: \u201Csubjects\u201D. A dashboard camera that records the road and, with it, other drivers: \u201Cincidentally\u201D.",
    commonMistake:
      "Answering \u201Cno imagery\u201D because the footage is not used to identify anyone. Identifiability is about what the recording contains, not what you do with it.",
  },
  imagery_capture_spaces: {
    fieldLabel: "Where is the imagery captured?",
    citation: "GDPR Art. 35(3)(c)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Whether the recorded spaces are open to the public. Article 35(3)(c) makes an assessment mandatory for large-scale systematic monitoring of a publicly accessible area.",
    regulationText: ART_35_3_C,
    regulationTextKind: "verbatim",
    coachLead: "Ask who can walk into the space, not who owns it.",
    coachBody:
      // DPIA INTAKE MASTER REVIEW (2026-09-15, F17/G09) \u2014 Art. 35(3)(c) is
      // systematic monitoring of a publicly accessible area on a LARGE
      // SCALE; a publicly accessible space alone does not engage it.
      "A privately owned shop floor, forecourt or car park is publicly accessible if the public can enter it. Staff-only areas, private offices and homes are controlled premises. Choose \u201CBoth\u201D when cameras cover each kind. Public access decides this answer, not ownership. Article 35(3)(c) itself requires systematic monitoring of a publicly accessible area on a large scale \u2014 record the scale and the monitoring pattern as separate facts in the surrounding answers; a publicly accessible space alone does not establish the mandatory trigger.",
    goodAnswer:
      "\u201CPublicly accessible spaces\u201D for cameras over a station concourse; \u201CPrivate or controlled premises\u201D for cameras inside a staff-only server room.",
    commonMistake:
      "Choosing \u201CPrivate or controlled premises\u201D because the building is privately owned. Ownership does not decide the question; public access does.",
  },
  imagery_capture_detail: {
    fieldLabel: "Anything the reader should know about the imagery?",
    citation: "GDPR Art. 35(3)(c)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Optional context about the cameras, the retention of footage, blurring or redaction, and who can view it. Quoted as context; it does not decide the Article 35(3)(c) finding.",
    regulationText: ART_35_3_C,
    regulationTextKind: "verbatim",
    coachLead: "State the facts a regulator would ask for first.",
    coachBody:
      "Number and position of cameras, whether recording is continuous or triggered, how long footage is kept, whether faces or plates are blurred before review, and who can view or export it. Your assessment quotes this passage in the Article 35(3)(c) analysis as the Company\u2019s own account; the finding itself also depends on the subject, space, scale and cadence facts recorded in the other answers, not on this passage alone.",
    goodAnswer:
      "\u201CFour fixed cameras over the public entrance and forecourt, continuous recording, footage kept 30 days, faces blurred before any review, viewing limited to two security supervisors.\u201D",
    commonMistake:
      "Writing the policy intention (\u201Cfootage is handled in line with our CCTV policy\u201D) instead of the facts. The reader needs the cameras, the period and the access, not the policy\u2019s name.",
  },
  volume_frequency: {
    fieldLabel: "How much data, and how often?",
    citation: "GDPR Art. 35(7)(a)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Scale and cadence together. Both feed the appraisal of how intrusive the processing is.",
    regulationText: ART_35_7_A,
    regulationTextKind: "verbatim",
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
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Storage limitation. A period without a reason is a number the assessment cannot test.",
    regulationText: ART_5_1_E,
    regulationTextKind: "verbatim",
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
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Establishment decides which supervisory authority oversees this processing, and whether the one-stop-shop is available to you.",
    regulationText: ART_4_16_A,
    regulationTextKind: "verbatim",
    coachLead: "Establishment drives the regulator, so the answer must match reality.",
    coachBody:
      // DPIA INTAKE MASTER REVIEW (2026-09-15, F17/G13) \u2014 a country recorded
      // here is one of several facts the lead-authority/one-stop-shop
      // resolution depends on, not the sole determinant.
      "Under Art. 4(16)(a) the main establishment is where the controller's central administration in the Union sits \u2014 unless decisions on the purposes and means are actually taken by another establishment that can have them implemented, in which case that one governs. Record this establishment's decision-making role together with any other relevant establishment and its territorial scope; a single country recorded here does not by itself establish the lead authority or confirm the one-stop-shop applies.",
    goodAnswer:
      "A strong answer reflects where the work actually happens: an organisation headquartered in Dublin with a German engineering site that owns no decisions records Ireland as both establishment and central administration.",
    commonMistake:
      "Recording the country of incorporation when the decisions are taken somewhere else. Art. 4(16) follows decision-making authority, not the registry.",
  },
  central_administration_country: {
    fieldLabel: "Where decisions about this processing are made",
    citation: "GDPR Art. 4(16)(a)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "The place of central administration in the Union. Where it sits in the EEA, the one-stop-shop can apply and one lead authority handles the file.",
    regulationText: ART_4_16_A,
    regulationTextKind: "verbatim",
    coachLead: "Name the place where the purposes and means are actually decided.",
    coachBody:
      // DPIA INTAKE MASTER REVIEW (2026-09-15, F17/G14) \u2014 the one-stop-shop
      // conclusion depends on this fact together with whether another
      // eligible EU establishment holds decision authority; it is not an
      // automatic consequence of this field alone.
      "This is the seat that sets what the processing is for and how it is done \u2014 not the largest office and not the busiest data centre. State where the purposes and means are actually decided and implemented, and whether another eligible EU establishment holds that authority instead \u2014 the lead-authority and one-stop-shop conclusions depend on those facts together, not on this field alone.",
    goodAnswer:
      "A strong answer is the single country where the decision sits: \u201CIreland \u2014 the Dublin leadership team sets the purpose, the retention rule and the vendor.\u201D",
    commonMistake:
      "Naming the country with the most staff. Headcount does not decide main establishment; decision-making authority does.",
  },
  eu_decision_establishment_country: {
    fieldLabel: "EU office that decides how this processing runs",
    citation: "GDPR Art. 4(16)(a)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Where an EU establishment other than the central administration takes the decisions and can have them implemented, that establishment becomes the main establishment.",
    regulationText: ART_4_16_A,
    regulationTextKind: "verbatim",
    coachLead: "Answer only where an EU office genuinely holds the decision.",
    coachBody:
      // DPIA INTAKE MASTER REVIEW (2026-09-15, F17/G15) \u2014 distinguish a
      // checked "No" from an unanswered field.
      "This field exists for the second limb of Art. 4(16)(a). It applies when a non-EU parent leaves the purposes and means genuinely to an EU establishment that can implement them \u2014 not when the EU office merely carries out instructions. Record No only once you have checked; where it is genuinely unknown, use Not assessed rather than leaving the question unanswered.",
    goodAnswer:
      "A strong answer confirms this after checking: a US parent whose Amsterdam entity independently sets the purpose and can implement it records the Netherlands; where no EU establishment holds that power, record No rather than leaving the field blank.",
    commonMistake:
      "Recording an EU office that only executes head-office instructions. Implementation is not decision authority, and the one-stop-shop does not follow it.",
  },
  dpia_scope_note: {
    fieldLabel: "What this assessment covers and what it leaves out",
    citation: "GDPR Art. 35(1)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "The boundary of the assessment. Anything outside it is not assessed, and the report says so.",
    regulationText: ART_35_1,
    regulationTextKind: "verbatim",
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
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Where appropriate, the controller seeks the views of data subjects or their representatives on the intended processing.",
    regulationText: ART_35_9,
    regulationTextKind: "verbatim",
    coachLead: "State whether consultation was appropriate, and separately, what happened.",
    coachBody:
      // DPIA INTAKE MASTER REVIEW (2026-09-15, F17/G17) \u2014 preserve the
      // statute's "where appropriate" qualification rather than treating
      // consultation as an unconditional default.
      "Art. 35(9) only requires seeking views \u201cwhere appropriate\u201d \u2014 record that appropriateness judgment explicitly, then say whether views were sought, how, what came back, and its effect. Where it was not appropriate, not sought, or not followed, record the actual reason rather than a general justification.",
    goodAnswer:
      "A strong answer summarises the exchange and its effect: \u201CConsulted the works council in March 2026. Two objections on out-of-hours tracking led to geofencing limited to rostered shifts.\u201D",
    commonMistake:
      "Treating consultation as optional and saying nothing. Silence reads as an unexplained omission of an express Art. 35(9) step.",
  },
  // DPIA INTAKE MASTER REVIEW (2026-09-15, F13) — dedicated entry for the
  // automated-decision-nature field (data-rail-key "automated_decision_nature"
  // in DPIAFramework.tsx), previously unmapped in either registry. Every
  // automated processing step is NOT an Art. 22 decision: the article needs
  // BOTH a solely-automated decision AND a legal or similarly significant
  // effect. "No significant effects" is a complete, legitimate answer.
  automated_decision_nature: {
    fieldLabel:
      "Are decisions based solely on automated processing, with legal or similarly significant effects?",
    citation: "GDPR Art. 22; Art. 35(3)(a)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Whether a decision is taken by automated means alone, without a person with authority to change the outcome reviewing it first, and whether that decision produces a legal effect or a similarly significant one. “No significant effects identified” is itself a complete, recorded answer, not a step left undone.",
    regulationText: ART_22_1,
    regulationTextKind: "verbatim",
    coachLead: "State whether a person can change the outcome before it takes effect, then state the effect.",
    coachBody:
      "Article 22 needs two things together — a decision based solely on automated processing, and a legal or similarly significant effect. Record each condition separately. Where a person with authority reviews and can alter the outcome first, or where the decision has no such effect, say so and record “no significant effect identified” as your answer, not a question you skipped.",
    goodAnswer:
      "A complete answer separates the two conditions Art. 22 sets: whether a person with authority to change the outcome reviews the decision before it takes effect, and whether the decision produces a legal or similarly significant effect. Where either condition is absent, “no significant effects” is a complete and legitimate finding, not an unanswered question.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Treating any automated step in the process as an automatic Art. 22 trigger. The article asks about a decision that is both solely automated and legally or similarly significantly effective — meeting only one condition does not engage it.",
  },

  // ── DPIA INTAKE MASTER REVIEW (2026-09-15, F21) — rail entries for the six
  // questions the review added to the page (F08 biometric purpose and the
  // "Other" category, F10 other measures, F11 transfer presence and processing
  // duration, F06 industry). F14/F17 discipline: regulationText is the
  // registry's verbatim wording or "", never a paraphrase under a verbatim
  // heading; the enum questions carry explanations rather than worked examples
  // so no entry instructs an answer on this form.
  biometric_unique_identification: {
    fieldLabel: "Is the biometric data used to uniquely identify individuals?",
    citation: "GDPR Art. 9(1)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Biometric data is special-category data only where it is processed for the purpose of uniquely identifying a natural person. The purpose decides the classification, not the sensor that captures the measurement.",
    regulationText: ART_9_1,
    regulationTextKind: "verbatim",
    regulationTextHeading: "Art. 9(1) GDPR (verbatim)",
    coachLead: "Answer for the purpose the measurement serves, not for the technology.",
    coachBody:
      "A complete answer says what the biometric measurement is used for — matching a person against a stored template, or something that recognises no one — and states the position as it stands today. Where the purpose is genuinely open, the report records the classification as still to be confirmed rather than settling it for you.",
    goodAnswer:
      "Art. 9(1) attaches to biometric data only where it is processed “for the purpose of uniquely identifying a natural person”. Face or fingerprint matching against a stored template meets that purpose; a heart-rate, gait or attention measurement that recognises no individual is personal data, and the Art. 9 prohibition — with the Art. 9(2) conditions that lift it — does not come into play for it.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Treating every measurement taken from the body as special-category data because of where it comes from. Art. 9(1) turns on the identification purpose; the mirror error is calling a face-matching system ordinary personal data because no person ever looks at the images, which misreads the same words.",
  },
  transfer_presence: {
    fieldLabel: "Does the data leave the EEA or the UK?",
    citation: "GDPR Art. 44",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Whether any personal data reaches a third country or an international organisation at all. Yes, No and Not yet assessed are three different records, and the report carries the one you state.",
    regulationText: ART_44_EXCERPT,
    regulationTextKind: "excerpt",
    regulationTextHeading: "Art. 44 GDPR (excerpt)",
    coachLead: "Trace where the data can be reached from, not only where it is stored.",
    coachBody:
      "A complete answer accounts for remote support access, backups, disaster-recovery copies and your own group companies, and treats a flow between the EEA and the UK as a transfer in its own right. Each route recorded with a recipient, a destination and an origin is what lets the report name the Chapter V basis for it.",
    goodAnswer:
      "Chapter V engages on the transfer itself rather than on the commercial purpose behind it: an engineer in a third country who can open a support session against EEA-hosted data is a transfer, and so is a backup replicated outside the region. Recording the point as not yet assessed states that the question is still open — a different fact from a stated position that nothing leaves.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Reading an empty list of transfer routes as a settled “no”. An empty list records that no route has been described, which is not the same as a stated position that all processing stays within the EEA and the UK.",
  },
  processing_end_status: {
    fieldLabel: "Is the processing ongoing or temporary?",
    citation: "GDPR Art. 35(7)(a)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "How long the processing runs, as a stated fact — ongoing, temporary, or not yet decided. The report records the status you state and never infers one from a blank end date.",
    regulationText: "",
    coachLead: "State the duration you have actually settled, and say so where it is open.",
    coachBody:
      "A complete answer pairs the status with the thing that ends the processing — a date, or the event that closes it, such as the end of a pilot. Where no decision has been taken, the report records the duration as undecided rather than reading silence as permanence.",
    goodAnswer:
      "Duration belongs to the scope the assessment describes: how long the processing runs bears on the storage-limitation position and on whether the measures you rely on hold for the whole period. A temporary activity that names the event closing it can be tested against that event, while an unstated status leaves nothing to test and is recorded as not supplied.",
    goodAnswerKind: "explanation",
    commonMistake:
      "Leaving the end date blank and expecting the reader to take that as “ongoing”. A blank is an absence of information, not a statement of duration, and the report keeps it as not supplied.",
  },
  controller_industry: {
    fieldLabel: "Industry",
    citation: "GDPR Art. 35(7)(a)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "The sector your organisation works in, recorded as context for the reader. It is not the regulator-routing answer: the separate kind-of-organisation question — private company, public body, national government body, telecoms provider, postal provider — is the one the report reads to identify the competent authority.",
    regulationText: "",
    coachLead: "Name the industry in the plainest word you would use for it.",
    coachBody:
      "One or two words carry this answer; its value is that the reader can see the setting the processing sits in. It is context in the report and does not change which supervisory authority the report names.",
    goodAnswer:
      "A company insuring commercial fleets records “motor insurance”; a haulier running its own depots records “logistics”. Short, recognisable, and about the business rather than the project.",
    goodAnswerKind: "example",
    commonMistake:
      "Putting the regulator-routing category here — public body, telecoms, postal. Those belong to the kind-of-organisation question the report reads for the competent authority, and an industry word recorded there is treated as private-sector routing with the word kept as the industry.",
  },
  safeguards_other: {
    fieldLabel: "Other measures in place",
    citation: "GDPR Art. 35(7)(d)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "Protective measures the fixed list does not name. They are recorded alongside the listed ones, and a measure recorded here is not assumed to reduce the severity of any risk.",
    regulationText: "",
    coachLead: "Name each measure and the harm it addresses, one per line.",
    coachBody:
      "A complete entry says what the measure does, how it works and which risk it bears on, and covers what is live today rather than what is planned. The report records each measure beside the risks it is offered against and states the residual position; it does not assume a measure lowers severity.",
    goodAnswer:
      "“Rate-limited export — a bulk download of more than 500 records needs a second approver, which addresses mass extraction by an authorised user.” The measure, the mechanism, and the harm it bears on, in one line.",
    goodAnswerKind: "example",
    commonMistake:
      "Recording an intention as a measure — “tokenisation is planned for the next release”. The question is about what protects the data today, and a control that is not yet live cannot be weighed as protection already in place.",
  },
  data_categories_other: {
    fieldLabel: "Describe the other category",
    citation: "GDPR Art. 35(7)(a)",
    citationUrl: GDPR_EU_URL,
    plainSummary:
      "The kind of information about people that the fixed list does not name. The report records it as a category to classify, so the description has to be specific enough to be classified.",
    regulationText: "",
    coachLead: "Describe the information itself, not the system it sits in.",
    coachBody:
      "Name the record type and the fields it carries in plain words, and say whether it could reveal anything from the Art. 9(1) list — racial or ethnic origin, political opinions, religious or philosophical beliefs, trade-union membership, genetic data, health, sex life or sexual orientation. The report records what you describe as a category to classify, so a system name gives it nothing to work on.",
    goodAnswer:
      "“Vehicle telematics — harsh-braking and speeding events for each driver, with the depot the event was recorded at.” The record type, the fields it carries, and the person each one attaches to.",
    goodAnswerKind: "example",
    commonMistake:
      "Naming the source system instead of the data — “everything in the Atlas platform”. A platform can hold anything, so the category stays unidentified and the report carries it as still to be classified.",
  },
};

