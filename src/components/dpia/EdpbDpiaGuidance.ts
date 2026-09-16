// src/components/dpia/EdpbDpiaGuidance.ts
// Completion guidance for the EDPB DPIA template, keyed by the Explainer's
// section numbering (the template body uses letter sub-sections, e.g. "1.1.a";
// the Explainer and TOC use "1.1.1" — we key by the Explainer).
//
// Source: EDPB "Template [2026] for DPIA — Explainer" v1.0, adopted 10 March
// 2026 FOR PUBLIC CONSULTATION (published 14 April 2026). DPIA INTAKE MASTER
// REVIEW (2026-09-15, F16): the official version history records adoption
// for public consultation, not a finalised text; the consultation feedback
// period closed 9 June 2026, and finalisation was not established as of
// 15 September 2026. Keep the date and version; do not present this as an
// adopted-without-qualification final text.
//
// SECTION-REF AUDIT (DPIA UPGRADE ITEM 3, verified against the adopted v1.0
// table of contents). The adopted Explainer numbers third-level headings
// NUMERICALLY (1.1.1 … 4.1.3); this file previously carried the template
// body's LETTERED sub-sections for six entries. The `sectionRef` values below
// are now the adopted numbering. Record keys are unchanged because they are
// also the `data-rail-key` values wired into DPIAFramework.tsx. Mapping:
//   1.1.c -> 1.1.3 Secondary or compatible uses
//   1.1.d -> 1.1.4 Nature, scope and context of the processing
//   2.2.a -> 2.2.1 Data minimisation and retention periods
//   2.2.b -> 2.2.2 Data quality
//   2.3.b -> 2.3.2 Measures supporting the exercise of data subjects' rights
//   2.3.d -> 2.3.4 Measures supporting data protection by design and by default
//   4.1.c -> 4.1.3 Inherent risk assessment
// Sections 0.1-0.5, 1.2-1.4, 5.1 and 5.2 are unchanged in the adopted text.
// "0.5.reasons" / "0.5.scope" / "0.5.publication" / "0.5.team" /
// "0.5.validation" are HOUSE sub-keys for distinct paragraphs of § 0.5; they
// are not template numbering and all carry sectionRef "0.5".
//
// Guidance below is PARAPHRASED, not verbatim —
// EXCEPT entries that carry `verbatimPropositionKey`, whose `guidance` string
// is the byte-exact `verbatim_quote` from the engine's verified-authority
// registry (supabase/functions/run-dpia-framework/_local/registry/dpia-verified-authorities.ts,
// WP248-PINNING 2026-08-01). Those entries are reused, never retyped.

import { DPIA_VERIFIED_AUTHORITIES } from "../../../supabase/functions/run-dpia-framework/_local/registry/dpia-verified-authorities";

export const EDPB_DPIA_SOURCE = {
  label:
    "EDPB DPIA Template Explainer v1.0 — adopted 10 March 2026 for public consultation (not yet finalised)",
  // The adopted-for-consultation v1.0 document has no separate canonical EDPB
  // permalink; it is published on (and reached via) this template page.
  url: "https://www.edpb.europa.eu/public-consultations/template-for-data-protection-impact-assessment_en",
};

// DPIA INTAKE MASTER REVIEW (2026-09-15, F16): this template's guidance is
// paraphrased completion advice for a consultation-version document, not
// statutory text, and the GDPR provision itself is always shown separately.
export const EDPB_GUIDANCE_STATUS_NOTE =
  "Template guidance is the EDPB's paraphrased completion advice for a consultation-version template, not the regulation text; the GDPR provision is shown separately.";

/** WP248 rev.01 rows reused verbatim from the engine registry. */
const WP248_CRITERIA = DPIA_VERIFIED_AUTHORITIES.high_risk_criteria_edpb_wp248;
const WP248_SEVERITY = DPIA_VERIFIED_AUTHORITIES.risk_severity_edpb_wp248;

export const WP248_GUIDANCE_SOURCE = {
  label: "EDPB (endorsed) Guidelines on DPIA (WP248 rev.01) — verbatim",
  url: WP248_CRITERIA.primary_source_url,
};

export interface EdpbGuidanceEntry {
  sectionRef: string;     // Explainer numbering, e.g. "0.5"
  sectionTitle: string;
  guidance: string;       // paraphrased plain-language guidance, unless verbatimPropositionKey is set
  paraRefs: number[];     // Explainer paragraph numbers, for traceability
  /** Registry proposition this entry reproduces verbatim (WP248-PINNING). */
  verbatimPropositionKey?: string;
  /** Pinpoint citation shown with a verbatim entry. */
  citation?: string;
  /** Source label/url override for verbatim entries. */
  sourceLabel?: string;
  sourceUrl?: string;
  /**
   * DPIA INTAKE MASTER REVIEW (2026-09-15, F12): coachLead is ONE imperative
   * sentence of completion advice; coachBody is one or two sentences of
   * elaboration. Both describe the SHAPE of a complete answer (which facts,
   * how separated) and never the content of a compliant one, and never
   * "tick/select X" — same discipline as RailEntry's coachLead/coachBody.
   */
  coachLead?: string;
  coachBody?: string;
}


export const EDPB_DPIA_GUIDANCE: Record<string, EdpbGuidanceEntry> = {
  "0.1": {
    sectionRef: "0.1",
    sectionTitle: "Controller(s)",
    guidance:
      "Identify the controller and give full contact details: the internal unit(s) responsible for the processing, the main establishment or representative with a point of contact, and the DPO or similar function. If there are joint controllers, document each one and clearly define each party's obligations and tasks.",
    paraRefs: [0],
    coachLead: "List every controller with a named contact, not just an entity name.",
    coachBody:
      "Give a point of contact for the main establishment or representative and for the DPO function. Where controllers are joint, record each one separately with its own obligations and tasks.",
  },
  "0.2": {
    sectionRef: "0.2",
    sectionTitle: "Processor(s) and sub-processor(s)",
    guidance:
      "List every processor and sub-processor involved in the processing, and define each one's obligations and tasks unequivocally.",
    paraRefs: [1],
    coachLead: "List each processor and sub-processor as its own line, not a category.",
    coachBody:
      "For every one, state its obligations and tasks unequivocally — what it is permitted to do with the data, not just that it “processes” it.",
  },
  "0.3": {
    sectionRef: "0.3",
    sectionTitle: "Name of the processing",
    guidance:
      "Give the internal name used for this processing in your record of processing activities. Where possible, note the current version and a short history of any past changes to the processing.",
    paraRefs: [2],
    coachLead: "Give the record name, its version, and what changed since the last one.",
    coachBody:
      "State the name used in your record of processing activities, the current version number, and a short history of prior changes — three separate facts, not one label.",
  },
  "0.4": {
    sectionRef: "0.4",
    sectionTitle: "Planning of the processing",
    guidance:
      "Record the estimated launch date. If the processing is temporary — for example tied to a time-limited project — also give the estimated end date or the conditions under which it expires.",
    paraRefs: [3, 4],
    coachLead: "State the launch date, and separately whether the processing has an end.",
    coachBody:
      "Give the estimated launch date. If the processing is temporary, add the estimated end date or the specific condition that ends it — do not leave a time-limited activity looking open-ended.",
  },
  "0.5": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet",
    guidance:
      "Capture the DPIA's own metadata: its version and change log; the team conducting it and their roles (a RACI matrix works well); the guidelines, standards and codes of conduct used; and the completion date plus the formal validation date (approval as complete by a responsible official). Decision-making and review methods should be documented, even if recorded outside this template.",
    paraRefs: [5, 6, 7, 10],
    coachLead:
      "Treat this as four separate facts: version history, the team and roles, the standards used, and the two sign-off dates.",
    coachBody:
      "Record the DPIA's own version and change log, who conducted it and in what role, which guidelines or codes were used, and both the completion date and the formal validation date. Note the decision-making method even if it lives outside this template.",
  },
  // WP248-PINNING (2026-08-01) — verbatim, reused from the engine registry.
  "0.5.reasons": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet — reasons to conduct",
    guidance: WP248_CRITERIA.verbatim_quote,
    paraRefs: [8],
    verbatimPropositionKey: WP248_CRITERIA.proposition_key,
    citation: WP248_CRITERIA.citation,
    sourceLabel: WP248_GUIDANCE_SOURCE.label,
    sourceUrl: WP248_CRITERIA.primary_source_url,
    coachLead: "State which of the quoted criteria apply to this processing, and how many.",
    coachBody:
      "The quoted text is the EDPB's own list of high-risk criteria. Record which specific ones are met here and the fact that triggered each, rather than a general reference to “high risk.”",
  },
  // WP248-PINNING (2026-08-01) — § 4.1.3 inherent-risk severity appraisal.
  "4.1.c": {
    sectionRef: "4.1.3",
    sectionTitle: "Inherent risk assessment — severity appraisal",
    guidance: WP248_SEVERITY.verbatim_quote,
    paraRefs: [],
    verbatimPropositionKey: WP248_SEVERITY.proposition_key,
    citation: WP248_SEVERITY.citation,
    sourceLabel: WP248_GUIDANCE_SOURCE.label,
    sourceUrl: WP248_SEVERITY.primary_source_url,
    coachLead: "Rate severity using the quoted scale, and record the specific harms behind the rating.",
    coachBody:
      "State which harms to data subjects support the rating you choose, and keep that reasoning separate from your assessment of likelihood.",
  },

  "0.5.scope": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet — scope",
    guidance:
      "State clearly what this DPIA covers and what it deliberately leaves out, and why — the boundaries of the assessment.",
    paraRefs: [9],
    coachLead: "State what is covered, what is excluded, and why the exclusion was chosen.",
    coachBody:
      "A boundary has two sides — name both the operations this DPIA assesses and the related ones it deliberately leaves out, with the reason for each exclusion.",
  },
  "0.5.publication": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet — publication / sharing",
    guidance:
      "Note whether the DPIA, or parts of it, will be published or shared externally. Publishing can support transparency, but withhold sensitive detail such as security specifics.",
    paraRefs: [11],
    coachLead: "State the publication decision, and separately name what, if anything, is withheld.",
    coachBody:
      "Say whether the DPIA (or a version of it) will be published or shared, and if so, name any sensitive detail — such as security specifics — that is withheld from that version.",
  },
  "1.1.c": {
    sectionRef: "1.1.3",
    sectionTitle: "Secondary or compatible uses",
    guidance:
      "Describe any further use of the data beyond the primary purpose, and explain why each is compatible with the purpose for which the data was originally collected (the Art. 6(4) compatibility test — link to the original purpose, the context, the nature of the data, possible consequences, and any safeguards).",
    paraRefs: [],
    coachLead: "For each secondary use, run the compatibility test explicitly, not by assertion.",
    coachBody:
      "Name each further use beyond the primary purpose, then address the Art. 6(4) factors in turn — the link to the original purpose, the context, the nature of the data, the possible consequences, and any safeguards in place.",
  },
  "1.1.d": {
    sectionRef: "1.1.4",
    sectionTitle: "Nature, scope and context of the processing",
    guidance:
      "Set out the nature (what you actually do with the data), the scope (its extent — the volume, variety, geography and duration), and the context (the relationship with the data subjects, their reasonable expectations, any power imbalance, and the wider circumstances of the processing).",
    paraRefs: [],
    coachLead: "Address nature, scope and context as three separate facts, not one description.",
    coachBody:
      "State what is actually done with the data (nature), its extent in volume, variety, geography and duration (scope), and the relationship, expectations and any power imbalance with data subjects (context).",
  },
  "1.2": {
    sectionRef: "1.2",
    sectionTitle: "Functional description",
    guidance:
      "Give a plain, operational description of how the processing works from end to end — the data lifecycle from collection through use, storage, any sharing, and deletion — so a reader can follow what happens to the data at each stage.",
    paraRefs: [],
    coachLead: "Trace the data through every stage, in order.",
    coachBody:
      "Describe collection, use, storage, any sharing, and deletion as separate stages, so a reader can follow the data's path without guessing at a missing step.",
  },
  "1.3": {
    sectionRef: "1.3",
    sectionTitle: "Means of processing, supporting assets and underlying architecture",
    guidance:
      "Identify the means and supporting assets: the IT systems, applications, infrastructure and sub-processor systems that the processing relies on. These are the assets whose vulnerabilities the risk assessment will later consider.",
    paraRefs: [],
    coachLead: "List the systems and assets that carry the processing, not the business function they support.",
    coachBody:
      "Name the IT systems, applications, infrastructure and sub-processor systems involved — these are the assets the later risk assessment will test for vulnerabilities.",
  },
  "1.4": {
    sectionRef: "1.4",
    sectionTitle: "Compliance with approved codes of conduct",
    guidance:
      "Note any approved code of conduct (Art. 40) or certification (Art. 42) the processing adheres to. Adherence can help demonstrate compliance, but does not by itself remove the need for the DPIA.",
    paraRefs: [],
    coachLead: "Name the specific code or certification, or state plainly that none applies.",
    coachBody:
      "Cite the approved code of conduct or certification by name if one is followed, and state that adherence does not by itself remove the need for this DPIA.",
  },
  "2.2.a": {
    sectionRef: "2.2.1",
    sectionTitle: "Data minimisation and retention periods",
    guidance:
      "Justify, for each category of data, that it is adequate, relevant and limited to what is necessary for the purpose (Art. 5(1)(c)), and state the retention period or the criteria used to set it (Art. 5(1)(e)). Flag any data collected that is not strictly necessary as a candidate for minimisation.",
    paraRefs: [],
    coachLead: "Justify necessity and state a retention period for each data category separately.",
    coachBody:
      "For every category, say why it is adequate, relevant and limited to what is necessary, then give the retention period or the criterion that sets it. Flag anything collected beyond that need.",
  },
  "2.2.b": {
    sectionRef: "2.2.2",
    sectionTitle: "Data quality",
    guidance:
      "Describe the measures that keep the data accurate and, where necessary, up to date — and how inaccurate data is corrected or erased without delay (Art. 5(1)(d)). Data quality is especially important where the data feeds decisions about people.",
    paraRefs: [],
    coachLead: "State how accuracy is maintained, and separately how errors get corrected.",
    coachBody:
      "Describe the ongoing measures that keep the data accurate and current, and the process that corrects or erases inaccurate data without delay — two distinct mechanisms, not one assurance.",
  },
  "2.3.b": {
    sectionRef: "2.3.2",
    sectionTitle: "Measures supporting the exercise of data subjects' rights",
    guidance:
      "Describe how data subjects can exercise their rights — information, access, rectification, erasure, restriction, portability, and objection — and how you receive, verify and action those requests within the time limits (Arts. 12–22).",
    paraRefs: [],
    coachLead: "Cover each right in turn, and state how requests are verified and actioned in time.",
    coachBody:
      "Address information, access, rectification, erasure, restriction, portability and objection individually, then describe the process that receives, verifies and actions a request within the statutory time limits.",
  },
  "2.3.d": {
    sectionRef: "2.3.4",
    sectionTitle: "Measures supporting data protection by design and by default",
    guidance:
      "Describe the measures designed into the processing — for example pseudonymisation, data minimisation by default, and access restricted by default — that implement data protection by design and by default (Art. 25).",
    paraRefs: [],
    coachLead: "Name the specific design measures, not the principle they serve.",
    coachBody:
      "List concrete measures — such as pseudonymisation, default data minimisation, or access restricted by default — that actually implement data protection by design and by default in this processing.",
  },
  "5.1": {
    sectionRef: "5.1",
    sectionTitle: "DPO advice",
    guidance:
      "Record whether the DPO was consulted on the DPIA and what advice they gave (Art. 35(2)). Where the controller departs from the DPO's advice, the reasons should be documented.",
    paraRefs: [],
    coachLead: "State whether the DPO was consulted, what they advised, and any departure from it.",
    coachBody:
      "Record whether consultation happened and the advice given. Where the controller did not follow that advice, document the reason separately from the advice itself.",
  },
  "5.2": {
    sectionRef: "5.2",
    sectionTitle: "Views of data subjects or their representatives",
    guidance:
      "Record whether the views of data subjects (or their representatives) were sought, how, and what they said (Art. 35(9)). Where their views were not sought, or were not followed, document the justification.",
    paraRefs: [],
    coachLead: "State whether views were sought, how, what came back, and any departure from it.",
    coachBody:
      "If views were sought, say how and summarise what was said. If they were not sought, or were not followed, record the specific justification rather than leaving the step silent.",
  },
  // DPIA UPGRADE ITEM 3 — the two structural accountability fields.
  "0.5.team": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet — team conducting the DPIA",
    guidance:
      "Identify the team involved in conducting this DPIA, with each person's role, tasks and responsibilities. A RACI matrix (Responsible, Accountable, Consulted, Informed) is one way to record it. The people who did the work are part of the accountability record, not administrative trim.",
    paraRefs: [6],
    coachLead: "Name each person on the DPIA team with their role, not a department.",
    coachBody:
      "List who did the work and the task or responsibility each held — a RACI split works well where responsibilities were formally allocated.",
  },
  "0.5.validation": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet — completion and formal validation",
    guidance:
      "Record the completion date and the formal validation date. The DPIA must be formally approved as complete and finished by a responsible official — a Managing Director, CEO or equivalent — and the record should say who approved it, in what capacity, on what date, and what the approval rests on. The template may carry a seal and signature.",
    paraRefs: [10],
    coachLead: "Record the completion date and the approval separately, each with its own detail.",
    coachBody:
      "The completion date is not the approval. Separately state who approved the DPIA, in what capacity, on what date, and what the approval rests on.",
  },
};
