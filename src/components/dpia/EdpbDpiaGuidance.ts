// src/components/dpia/EdpbDpiaGuidance.ts
// Paraphrased completion guidance for the EDPB DPIA template, keyed by the
// Explainer's section numbering (the template body uses letter sub-sections,
// e.g. "1.1.a"; the Explainer and TOC use "1.1.1" — we key by the Explainer).
//
// Source: EDPB "Template [2026] for DPIA — Explainer" v1.0 (10 Mar 2026).
// NOTE: this is a PUBLIC-CONSULTATION DRAFT (consultation closed 9 Jun 2026);
// the final text may differ. Guidance below is PARAPHRASED, not verbatim.

export const EDPB_DPIA_SOURCE = {
  label: "EDPB DPIA Template Explainer v1.0 (10 Mar 2026, public-consultation draft)",
  url: "https://www.edpb.europa.eu/public-consultations/edpb-dpia-template_en",
};

export interface EdpbGuidanceEntry {
  sectionRef: string;     // Explainer numbering, e.g. "0.5"
  sectionTitle: string;
  guidance: string;       // paraphrased plain-language guidance
  paraRefs: number[];     // Explainer paragraph numbers, for traceability
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
};
