// src/components/dpia/EdpbDpiaGuidance.ts
// Completion guidance for the EDPB DPIA template, keyed by the Explainer's
// section numbering (the template body uses letter sub-sections, e.g. "1.1.a";
// the Explainer and TOC use "1.1.1" — we key by the Explainer).
//
// Source: EDPB "Template [2026] for DPIA — Explainer" v1.0 (10 Mar 2026).
// NOTE: this is a PUBLIC-CONSULTATION DRAFT (consultation closed 9 Jun 2026);
// the final text may differ. Guidance below is PARAPHRASED, not verbatim —
// EXCEPT entries that carry `verbatimPropositionKey`, whose `guidance` string
// is the byte-exact `verbatim_quote` from the engine's verified-authority
// registry (supabase/functions/_shared/registry/dpia-verified-authorities.ts,
// WP248-PINNING 2026-08-01). Those entries are reused, never retyped.

import { DPIA_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/dpia-verified-authorities";

export const EDPB_DPIA_SOURCE = {
  label: "EDPB DPIA Template Explainer v1.0 (10 Mar 2026, public-consultation draft)",
  url: "https://www.edpb.europa.eu/public-consultations/edpb-dpia-template_en",
};

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
}


export const EDPB_DPIA_GUIDANCE: Record<string, EdpbGuidanceEntry> = {
  "0.1": {
    sectionRef: "0.1",
    sectionTitle: "Controller(s)",
    guidance:
      "Identify the controller and give full contact details: the internal unit(s) responsible for the processing, the main establishment or representative with a point of contact, and the DPO or similar function. If there are joint controllers, document each one and clearly define each party's obligations and tasks.",
    paraRefs: [0],
  },
  "0.2": {
    sectionRef: "0.2",
    sectionTitle: "Processor(s) and sub-processor(s)",
    guidance:
      "List every processor and sub-processor involved in the processing, and define each one's obligations and tasks unequivocally.",
    paraRefs: [1],
  },
  "0.3": {
    sectionRef: "0.3",
    sectionTitle: "Name of the processing",
    guidance:
      "Give the internal name used for this processing in your record of processing activities. Where possible, note the current version and a short history of any past changes to the processing.",
    paraRefs: [2],
  },
  "0.4": {
    sectionRef: "0.4",
    sectionTitle: "Planning of the processing",
    guidance:
      "Record the estimated launch date. If the processing is temporary — for example tied to a time-limited project — also give the estimated end date or the conditions under which it expires.",
    paraRefs: [3, 4],
  },
  "0.5": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet",
    guidance:
      "Capture the DPIA's own metadata: its version and change log; the team conducting it and their roles (a RACI matrix works well); the guidelines, standards and codes of conduct used; and the completion date plus the formal validation date (approval as complete by a responsible official). Decision-making and review methods should be documented, even if recorded outside this template.",
    paraRefs: [5, 6, 7, 10],
  },
  "0.5.reasons": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet — reasons to conduct",
    guidance:
      "Explain why the DPIA is being done; more than one reason may apply. It may be a legal obligation under Article 35(3) (systematic, extensive evaluation or profiling with significant effects; large-scale special-category or criminal-offence data; or large-scale systematic monitoring of a public area), required under national law or EDPB/national guidance (the WP248 criteria — scoring, automated decisions, sensitive data, large scale, dataset matching, vulnerable subjects, innovative technology), or simply necessary or beneficial (a DPO or data-subject recommendation, a code of conduct, or to manage risk and demonstrate accountability). It may also be an existing high-risk activity whose risk has changed.",
    paraRefs: [8],
  },
  "0.5.scope": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet — scope",
    guidance:
      "State clearly what this DPIA covers and what it deliberately leaves out, and why — the boundaries of the assessment.",
    paraRefs: [9],
  },
  "0.5.publication": {
    sectionRef: "0.5",
    sectionTitle: "DPIA technical sheet — publication / sharing",
    guidance:
      "Note whether the DPIA, or parts of it, will be published or shared externally. Publishing can support transparency, but withhold sensitive detail such as security specifics.",
    paraRefs: [11],
  },
  "1.1.c": {
    sectionRef: "1.1.c",
    sectionTitle: "Secondary or compatible uses",
    guidance:
      "Describe any further use of the data beyond the primary purpose, and explain why each is compatible with the purpose for which the data was originally collected (the Art. 6(4) compatibility test — link to the original purpose, the context, the nature of the data, possible consequences, and any safeguards).",
    paraRefs: [],
  },
  "1.1.d": {
    sectionRef: "1.1.d",
    sectionTitle: "Nature, scope and context of the processing",
    guidance:
      "Set out the nature (what you actually do with the data), the scope (its extent — the volume, variety, geography and duration), and the context (the relationship with the data subjects, their reasonable expectations, any power imbalance, and the wider circumstances of the processing).",
    paraRefs: [],
  },
  "1.2": {
    sectionRef: "1.2",
    sectionTitle: "Functional description",
    guidance:
      "Give a plain, operational description of how the processing works from end to end — the data lifecycle from collection through use, storage, any sharing, and deletion — so a reader can follow what happens to the data at each stage.",
    paraRefs: [],
  },
  "1.3": {
    sectionRef: "1.3",
    sectionTitle: "Means of processing, supporting assets and underlying architecture",
    guidance:
      "Identify the means and supporting assets: the IT systems, applications, infrastructure and sub-processor systems that the processing relies on. These are the assets whose vulnerabilities the risk assessment will later consider.",
    paraRefs: [],
  },
  "1.4": {
    sectionRef: "1.4",
    sectionTitle: "Compliance with approved codes of conduct",
    guidance:
      "Note any approved code of conduct (Art. 40) or certification (Art. 42) the processing adheres to. Adherence can help demonstrate compliance, but does not by itself remove the need for the DPIA.",
    paraRefs: [],
  },
  "2.2.a": {
    sectionRef: "2.2.a",
    sectionTitle: "Data minimisation and retention periods",
    guidance:
      "Justify, for each category of data, that it is adequate, relevant and limited to what is necessary for the purpose (Art. 5(1)(c)), and state the retention period or the criteria used to set it (Art. 5(1)(e)). Flag any data collected that is not strictly necessary as a candidate for minimisation.",
    paraRefs: [],
  },
  "2.2.b": {
    sectionRef: "2.2.b",
    sectionTitle: "Data quality",
    guidance:
      "Describe the measures that keep the data accurate and, where necessary, up to date — and how inaccurate data is corrected or erased without delay (Art. 5(1)(d)). Data quality is especially important where the data feeds decisions about people.",
    paraRefs: [],
  },
  "2.3.b": {
    sectionRef: "2.3.b",
    sectionTitle: "Measures supporting the exercise of data subjects' rights",
    guidance:
      "Describe how data subjects can exercise their rights — information, access, rectification, erasure, restriction, portability, and objection — and how you receive, verify and action those requests within the time limits (Arts. 12–22).",
    paraRefs: [],
  },
  "2.3.d": {
    sectionRef: "2.3.d",
    sectionTitle: "Measures supporting data protection by design and by default",
    guidance:
      "Describe the measures designed into the processing — for example pseudonymisation, data minimisation by default, and access restricted by default — that implement data protection by design and by default (Art. 25).",
    paraRefs: [],
  },
  "5.1": {
    sectionRef: "5.1",
    sectionTitle: "DPO advice",
    guidance:
      "Record whether the DPO was consulted on the DPIA and what advice they gave (Art. 35(2)). Where the controller departs from the DPO's advice, the reasons should be documented.",
    paraRefs: [],
  },
  "5.2": {
    sectionRef: "5.2",
    sectionTitle: "Views of data subjects or their representatives",
    guidance:
      "Record whether the views of data subjects (or their representatives) were sought, how, and what they said (Art. 35(9)). Where their views were not sought, or were not followed, document the justification.",
    paraRefs: [],
  },
};
