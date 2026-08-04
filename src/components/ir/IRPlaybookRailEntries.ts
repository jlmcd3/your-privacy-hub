// ITEM 369-IR (Master Spec §4.2) — statutory rail for the IR STANDING-PLAYBOOK
// intake.
//
// WHY THIS EXISTS. The IR intake previously ran with rail: false on the
// reasoning "live incident — speed over law". That reasoning holds for the
// incident worksheet, which is blank and used under time pressure. It does not
// hold for the standing playbook, which is written BEFORE any incident, at
// leisure, and is precisely where statutory framing belongs. The policy is
// therefore flipped to rail: true for ir_playbook.
//
// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer, and it never directs the answer on THIS form. Worked
// examples are clearly fictional and illustrate FORM only.
//
// TEMPLATE DISCIPLINE — NIST SP 800-61r3, the CISA federal IR playbooks and the
// ICO breach-management toolkit are DRAFTING TEMPLATES for the organisation's
// own record. They are never authority: nothing here is cited as a legal basis,
// and the IR corpus resolver (ir-corpus.ts) will not accept them as pins. Only
// GDPR Arts. 33/34 (resolved byte-exact at runtime) and the allow-listed EDPB
// 9/2022 excerpts are authority.

import type { RailEntry } from "@/components/intake/RailEntry";

const NIST_LABEL = "NIST SP 800-61r3, Incident Response Recommendations and Considerations (April 2025)";
const NIST_URL = "https://csrc.nist.gov/pubs/sp/800/61/r3/final";

const CISA_LABEL = "CISA Federal Government Cybersecurity Incident and Vulnerability Response Playbooks";
const CISA_URL = "https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks";

const ICO_LABEL = "ICO Data Protection Audit Framework — personal data breach management toolkit (Oct 2024)";
const ICO_URL = "https://ico.org.uk/for-organisations/advice-and-services/audits/data-protection-audit-framework/";

const EDPB_LABEL = "EDPB Guidelines 9/2022 on personal data breach notification under GDPR";
const EDPB_URL = "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-92022-personal-data-breach-notification-under_en";

const EDPB_TEMPLATE_LABEL = "EDPB Article 33 breach-notification template (draft adopted 8 June 2026)";

/**
 * Keyed by IR standing-playbook intake field. Merged over the live
 * Art.-resolved rail entry in IRPlaybook.tsx, which supplies verbatim
 * statutory text for the Art. 33 / Art. 34 fields.
 */
export const IR_PLAYBOOK_RAIL: Record<string, RailEntry> = {
  activationCriteria: {
    fieldLabel: "Activation criteria",
    citation: "GDPR Art. 33(1)",
    citationUrl: "https://gdpr-info.eu/art-33-gdpr/",
    plainSummary:
      "Activation criteria decide when the playbook starts running. Because the Art. 33 clock runs from awareness rather than from confirmation, criteria written too tightly delay activation past the point the clock has already started.",
    regulationText: "…",
    coachLead: "Write each criterion as an observable event, not as a conclusion.",
    coachBody:
      "An observable event can be recognised by whoever sees it first, at the moment they see it. A conclusion — that data 'has been breached' — can only be reached after an investigation the criterion is meant to trigger. Keep the two apart and give each criterion its own line.",
    goodAnswer:
      "A fictional logistics operator lists 'any supplier telling us they have lost our consignee data' as one line and 'any ransomware detection on a depot server' as another — each an event someone can observe, each stated separately.",
    commonMistake:
      "Treating activation as a synonym for notification. Activation begins the internal response; the Art. 33 duty is assessed once the response has established the facts, and the two are different moments governed by different standards.",
    templateGuidance: {
      sectionRef: "Preparation",
      sectionTitle: "Declaring an incident",
      guidance:
        "NIST SP 800-61r3 frames incident declaration as a preparation-phase artifact: the criteria are agreed in advance so that declaration is a recognition task rather than a judgement call made under pressure.",
      sourceLabel: NIST_LABEL,
      sourceUrl: NIST_URL,
    },
    relatedCitations: [
      { citation: "EDPB Guidelines 9/2022", label: "When a controller becomes 'aware' of a breach" },
    ],
  },

  severityMatrix: {
    fieldLabel: "Severity matrix and thresholds",
    citation: "GDPR Art. 33(1) · Art. 34(1)",
    citationUrl: "https://gdpr-info.eu/art-34-gdpr/",
    plainSummary:
      "The severity matrix drives internal escalation. It is an operational instrument and sits alongside — never in place of — the two statutory thresholds, which are assessed on their own terms.",
    regulationText: "…",
    coachLead: "Give each severity level a definition, and give each definition an escalation consequence.",
    coachBody:
      "A level with no consequence attached is a label. State, for each level, what is true of the incident and who must be told within what period. Keep the internal levels separate from the statutory risk tests so neither is mistaken for the other.",
    goodAnswer:
      "A fictional mutual defines its top level as 'member financial data confirmed exfiltrated, or the core platform unavailable beyond four hours', and attaches 'board notified within one hour' to it — a definition and a consequence on the same line.",
    commonMistake:
      "Assuming the internal top severity level and the Art. 34(1) high-risk threshold are the same test. They are not, and an incident can reach one without reaching the other.",
    templateGuidance: {
      sectionRef: "Detection and Analysis",
      sectionTitle: "Incident prioritisation",
      guidance:
        "The NIST arc prioritises on functional impact, information impact and recoverability. The CISA playbooks add a fixed escalation consequence per level, so the matrix answers 'who is told, and by when' rather than only 'how bad is it'.",
      sourceLabel: CISA_LABEL,
      sourceUrl: CISA_URL,
    },
  },

  responseTeamRoster: {
    fieldLabel: "Response team and alternates",
    citation: "GDPR Art. 33(3)(b)",
    citationUrl: "https://gdpr-info.eu/art-33-gdpr/",
    plainSummary:
      "Art. 33(3)(b) requires the notification to give a contact point from whom more information can be obtained. A roster with no named alternate produces a single point of failure on exactly the day it is relied on.",
    regulationText: "…",
    coachLead: "Name a person for every role, then name a second person for every role.",
    coachBody:
      "Record role, primary and alternate as three separate fields. A named individual with a title is testable; a team mailbox is not, because no one is answerable for it at three in the morning.",
    goodAnswer:
      "A fictional building society records 'Incident Lead — H. Okonkwo, Head of Operational Risk' with 'R. Vasilev, Operational Risk Manager' as alternate: a role, a person, and a fallback person.",
    commonMistake:
      "Recording a department in place of a person. The contact point in Art. 33(3)(b) is someone the supervisory authority can reach and question, not an internal routing address.",
    templateGuidance: {
      sectionRef: "Preparation",
      sectionTitle: "Response team composition",
      guidance:
        "The ICO breach-management toolkit records the breach-response roles and the named holders of each as a standing part of the accountability record, reviewed rather than reconstructed after an incident.",
      sourceLabel: ICO_LABEL,
      sourceUrl: ICO_URL,
    },
  },

  keyContacts: {
    fieldLabel: "Outside counsel, privilege protocol, insurer, forensics, law enforcement",
    citation: "GDPR Art. 33(1) · Art. 33(3)(b)",
    plainSummary:
      "The external contacts are the ones that cannot be found under time pressure. Each carries its own deadline, and an insurer's notification condition is a contractual clock that runs independently of the statutory one.",
    regulationText: "…",
    coachLead: "Record each external contact with the route to reach them out of hours and the deadline they impose.",
    coachBody:
      "Name, reference number and out-of-hours route are three separate facts, and a contact recorded without all three is not reachable in the hour it matters. Where the relationship carries its own deadline — an insurance notification condition, a retainer callout window — record that deadline against the contact.",
    goodAnswer:
      "A fictional society records its cyber policy as 'MSC-88214, notification condition 72 hours from discovery', and its forensic vendor as 'master services agreement GF-2025-07, four-hour callout' — each with reference and clock.",
    commonMistake:
      "Assuming a privilege protocol is established simply because counsel is retained. Whether investigative material attracts privilege depends on how the engagement and reporting lines are structured before the work begins, which is why the protocol is a preparation artifact.",
    templateGuidance: {
      sectionRef: "Preparation",
      sectionTitle: "External coordination",
      guidance:
        "The CISA playbooks treat external coordination — counsel, insurer, forensics, law enforcement — as a preparation deliverable with contacts and thresholds fixed in advance of any incident.",
      sourceLabel: CISA_LABEL,
      sourceUrl: CISA_URL,
    },
  },

  keySystems: {
    fieldLabel: "Key systems and log sources",
    citation: "GDPR Art. 33(5)",
    citationUrl: "https://gdpr-info.eu/art-33-gdpr/",
    plainSummary:
      "Art. 33(5) requires the controller to document the facts of the breach, its effects and the remedial action taken. Evidence that has already rotated out of a log cannot be documented afterwards.",
    regulationText: "…",
    coachLead: "List the systems that hold personal data and, separately, the logs that would evidence access to them.",
    coachBody:
      "A system and its evidence source are two different records, and retention differs between them. State each log source with the period it retains, because the retention window is what determines how quickly preservation must be ordered.",
    goodAnswer:
      "A fictional operator lists 'identity provider sign-in logs' and 'perimeter firewall flow logs' as separate sources from the systems they cover, each with its retention period noted.",
    commonMistake:
      "Listing systems and treating logging as implied. A system can hold personal data and produce no usable record of who read it, and that shortfall is only discoverable before the incident.",
    templateGuidance: {
      sectionRef: "Detection and Analysis",
      sectionTitle: "Evidence acquisition and retention",
      guidance:
        "NIST SP 800-61r3 pairs each in-scope system with the data sources that would evidence activity on it, and treats retention periods as a preparation-phase constraint rather than an incident-time discovery.",
      sourceLabel: NIST_LABEL,
      sourceUrl: NIST_URL,
    },
  },

  itIsolationAuthority: {
    fieldLabel: "IT isolation authority",
    citation: "GDPR Art. 32(1) · Art. 33(3)(d)",
    plainSummary:
      "Art. 33(3)(d) asks what measures were taken or proposed to address the breach, including to mitigate its adverse effects. Containment delayed while authority is located is containment delayed on the record.",
    regulationText: "…",
    coachLead: "Name the person who may disconnect a production system, and name who acts if they cannot be reached.",
    coachBody:
      "State the role, the named holder, and the period after which the fallback takes over. Authority described without a timeout is authority that stalls the first time the holder is on a flight.",
    goodAnswer:
      "A fictional insurer records 'Head of Information Security, or the Infrastructure Lead where the former is unreachable for thirty minutes' — holder, fallback and the trigger between them.",
    commonMistake:
      "Recording the authority as sitting with an executive who is not routinely contactable out of hours. The record then describes a decision that cannot in practice be taken at the time it is needed.",
    templateGuidance: {
      sectionRef: "Containment, Eradication and Recovery",
      sectionTitle: "Containment decision authority",
      guidance:
        "The CISA playbooks fix the containment decision-maker in advance, on the reasoning that the containment window is short and the decision is disruptive enough to stall without pre-agreed authority.",
      sourceLabel: CISA_LABEL,
      sourceUrl: CISA_URL,
    },
  },

  breachNoticeContracts: {
    fieldLabel: "Contracts carrying breach-notice obligations",
    citation: "GDPR Art. 28(3)(f) · Art. 33(2)",
    citationUrl: "https://gdpr-info.eu/art-33-gdpr/",
    plainSummary:
      "Art. 33(2) obliges a processor to notify its controller without undue delay. Commercial contracts routinely impose shorter, fixed deadlines than the statute, and those deadlines run in parallel.",
    regulationText: "…",
    coachLead: "Record counterparty, deadline and clause reference as three separate columns.",
    coachBody:
      "A deadline with no clause reference cannot be checked when it is disputed, and a clause reference with no deadline cannot be acted on at speed. Where a contract states a period in hours, keep it in hours rather than converting it to a general standard.",
    goodAnswer:
      "A fictional society records 'Ashcombe Core Banking Services Ltd — within 24 hours of awareness — MSA schedule 4, clause 8.3' as one row and its card-scheme sponsor as another.",
    commonMistake:
      "Assuming the statutory clock is the binding one. A twelve-hour contractual notice deadline expires long before the seventy-two-hour supervisory-authority period, and breaching it is a contractual matter the statute does not excuse.",
    templateGuidance: {
      sectionRef: "Breach management",
      sectionTitle: "Contractual notification obligations",
      guidance:
        "The ICO breach-management toolkit keeps a standing register of the contracts that impose notification duties, so the obligations are known before the incident rather than reconstructed from agreements during it.",
      sourceLabel: ICO_LABEL,
      sourceUrl: ICO_URL,
    },
  },

  notificationContent: {
    fieldLabel: "Notification content and owners",
    citation: "GDPR Art. 33(3)(a)–(d)",
    citationUrl: "https://gdpr-info.eu/art-33-gdpr/",
    plainSummary:
      "Art. 33(3) fixes four content elements the notification must at least contain. Each element has a different owner inside the organisation, and the notification stalls on whichever one has no owner.",
    regulationText: "…",
    coachLead: "Treat the four Art. 33(3) elements as four separately owned deliverables.",
    coachBody:
      "The nature and categories in (a), the contact point in (b), the likely consequences in (c) and the measures taken in (d) are produced by different functions on different timescales. Recording them as one task hides the dependency that actually delays the filing.",
    goodAnswer:
      "A fictional controller assigns approximate record and data-subject counts to its forensics lead, likely consequences to its DPO, and remedial measures to its remediation owner — one owner per element.",
    commonMistake:
      "Withholding notification until every element is complete. Art. 33(4) permits information to be provided in phases where it cannot all be provided at the same time, so incompleteness is not a reason to let the period expire.",
    templateGuidance: {
      sectionRef: "Notification form fields",
      sectionTitle: "Article 33 notification template",
      guidance:
        "The EDPB notification template arranges the Art. 33(3) elements as discrete form fields, with the phased-notification route recorded on the form itself rather than handled as an exception to it.",
      sourceLabel: EDPB_TEMPLATE_LABEL,
      sourceUrl: EDPB_URL,
    },
    relatedCitations: [
      { citation: "GDPR Art. 33(4)", label: "Information may be provided in phases" },
      { citation: "EDPB Guidelines 9/2022", label: "Content of the notification" },
    ],
  },

  nextTabletopDate: {
    fieldLabel: "Testing and training",
    citation: "GDPR Art. 32(1)(d)",
    plainSummary:
      "Art. 32(1)(d) requires a process for regularly testing, assessing and evaluating the effectiveness of the measures. A playbook that has never been exercised is an untested measure.",
    regulationText: "…",
    coachLead: "Record a cadence and a next date, not an intention.",
    coachBody:
      "A cadence states how often, a date states when next. Only the second is evidence, because only the second can be shown to have passed or not passed.",
    goodAnswer:
      "A fictional trust records 'annual tabletop, next exercise 19 November 2026', which can be evidenced on any later date as met or missed.",
    commonMistake:
      "Reading the Art. 32(1)(d) testing duty as satisfied by having written the procedure. The duty is to test the effectiveness of the measure, which the existence of the document does not do.",
    templateGuidance: {
      sectionRef: "Preparation",
      sectionTitle: "Exercises and continuous improvement",
      guidance:
        "NIST SP 800-61r3 places exercises and lessons-learned in the continuous-improvement loop, with the after-action findings feeding back into the playbook itself rather than sitting as a separate record.",
      sourceLabel: NIST_LABEL,
      sourceUrl: NIST_URL,
    },
    relatedCitations: [
      { citation: EDPB_LABEL, label: EDPB_URL },
    ],
  },
};

export default IR_PLAYBOOK_RAIL;
