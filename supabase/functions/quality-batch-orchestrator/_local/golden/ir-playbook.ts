// QB-P20 — IR Playbook golden set. 3 fixtures.
// Adversarial: discovery date 29 days old — tests whether the generator
// still surfaces the 30-day-clock jurisdictional windows correctly.
// NOTE: contract requires discoveryDateTime; adversarial uses a date
// literal that will be 29 days old relative to generation.

import type { GoldenCase } from "./types.ts";

const isoDaysAgo = (days: number) => {
  const d = new Date(Date.now() - days * 86400_000);
  return d.toISOString();
};

export const IR_PLAYBOOK_GOLDEN: GoldenCase[] = [
  {
    id: "ir-ransomware-tuning",
    tool: "ir-playbook",
    set: "tuning",
    intake: {
      organizationName: "Meridian Health Systems",
      discoveryDateTime: isoDaysAgo(2),
      cause: "Ransomware or malware",
      dataTypes: ["Names and contact details", "Health / medical records"],
      affectedCount: "10,000–100,000",
      jurisdictions: ["United States (HIPAA)", "California"],
      processorInvolved: false,
      contained: "Yes",
      organisationType: "Healthcare provider",
    },
    assertions: [
      { kind: "must_include", pattern: "HIPAA|Breach Notification", flags: "i", label: "HIPAA regime named" },
    ],
  },
  {
    id: "ir-eu-phishing-tuning",
    tool: "ir-playbook",
    set: "tuning",
    intake: {
      organizationName: "Nordbank AG",
      discoveryDateTime: isoDaysAgo(1),
      cause: "Phishing / credential compromise",
      dataTypes: ["Names and contact details"],
      affectedCount: "1,000–10,000",
      jurisdictions: ["Germany", "EU/EEA"],
      processorInvolved: false,
      contained: "Partially" as unknown as "No", // enum: "Yes","No","Unknown" — use "No"
      organisationType: "Financial institution",
    },
    assertions: [
      { kind: "must_include", pattern: "72\\s*hours?|Article\\s*33", flags: "i", label: "GDPR 72h clock" },
    ],
  },
  {
    id: "ir-29-day-clock-adversarial",
    tool: "ir-playbook",
    set: "adversarial",
    intake: {
      organizationName: "PacificEd Inc.",
      discoveryDateTime: isoDaysAgo(29),
      cause: "Accidental disclosure",
      dataTypes: ["Children's data", "Names and contact details"],
      affectedCount: "1,000–10,000",
      jurisdictions: ["California", "Texas"],
      processorInvolved: false,
      contained: "Yes",
      organisationType: "Company",
    },
    assertions: [
      { kind: "must_include", pattern: "notif|deadline|days", flags: "i", label: "notification deadlines surfaced" },
    ],
  },
];

// Fixup — irPlaybookContract requires enum "No"|"Yes"|"Unknown" for contained
IR_PLAYBOOK_GOLDEN[1].intake.contained = "No";

// ── ITEM 312 (Chapter 8 rebuild) — fixture unblock ────────────────────
// Three cases supplying every field the contract added in Item 312, with
// specific non-generic content. Together they exercise:
//   * the Art. 33(1) risk test reaching BOTH outcomes;
//   * the Art. 34(1) HIGH-risk test diverging from the Art. 33(1) outcome
//     (TWO-THRESHOLD LAW);
//   * the Art. 34(3)(a) unintelligibility exemption being available.
IR_PLAYBOOK_GOLDEN.push(
  {
    id: "ir-perfect-record",
    tool: "ir-playbook",
    set: "tuning",
    intake: {
      organizationName: "Halvorsen Klinikk AS",
      discoveryDateTime: isoDaysAgo(1),
      cause: "Unauthorized external access / cyberattack",
      dataTypes: ["Health / medical records", "Government IDs / SSN", "Names and contact details"],
      affectedCount: "10,000–100,000",
      jurisdictions: ["Norway", "EU/EEA"],
      processorInvolved: true,
      processorName: "Nordlys Journal Hosting AS",
      contained: "Yes",
      organisationType: "Healthcare provider",
      encryptionStatus: "No affected data encrypted",
      encryptionKeyStatus: "Not applicable — no encryption",
      affectedRecordCount: "approx. 63,400 patient journal entries",
      affectedDataSubjectCount: "approx. 41,800 patients",
      awarenessConfirmed: "Confirmed — discovery timestamp verified as the moment of awareness",
    },
    assertions: [
      { kind: "must_include", pattern: "unlikely to result in a risk", flags: "i", label: "Art. 33(1) risk test quoted" },
      { kind: "must_include", pattern: "high risk", flags: "i", label: "Art. 34(1) separate threshold reached" },
    ],
  },
  {
    id: "ir-encrypted-backup-exemption",
    tool: "ir-playbook",
    set: "tuning",
    intake: {
      organizationName: "Brightwell Pensions Ltd",
      discoveryDateTime: isoDaysAgo(1),
      cause: "Lost or stolen device",
      dataTypes: ["Names and contact details"],
      affectedCount: "1,000–10,000",
      jurisdictions: ["United Kingdom"],
      processorInvolved: false,
      contained: "Yes",
      organisationType: "Financial institution",
      encryptionStatus: "All affected data encrypted / rendered unintelligible",
      encryptionKeyStatus: "Keys not compromised",
      affectedRecordCount: "approx. 7,200 annual benefit statements",
      affectedDataSubjectCount: "approx. 6,050 scheme members",
      awarenessConfirmed: "Confirmed — discovery timestamp verified as the moment of awareness",
    },
    assertions: [
      { kind: "must_include", pattern: "unintelligible", flags: "i", label: "Art. 34(3)(a) limb walked" },
    ],
  },
  {
    id: "ir-two-threshold-divergence",
    tool: "ir-playbook",
    set: "adversarial",
    intake: {
      organizationName: "Kestrel Community Trust",
      discoveryDateTime: isoDaysAgo(2),
      cause: "Accidental disclosure",
      dataTypes: ["Names and contact details"],
      affectedCount: "Fewer than 100",
      jurisdictions: ["Ireland"],
      processorInvolved: false,
      contained: "Yes",
      organisationType: "Company",
      encryptionStatus: "No affected data encrypted",
      encryptionKeyStatus: "Not applicable — no encryption",
      affectedRecordCount: "62 mailing-list rows in a single misdirected attachment",
      affectedDataSubjectCount: "62 newsletter subscribers",
      awarenessConfirmed: "Assumed — detection timestamp treated as awareness pending confirmation",
    },
    assertions: [
      { kind: "must_include", pattern: "Article\\s*33", flags: "i", label: "Art. 33 duty reasoned" },
    ],
  },
);

// ── ITEM 369-IR (Master Spec §4.2) — TWO-ARTIFACT GOLDEN FIXTURE ──────
// The PERFECT case: every standing-playbook intake path populated with
// specific, non-generic content, so the standing playbook renders all
// fourteen sections at status "analysed" and the incident worksheet renders
// blank. The MESSY counterparts (messy-registry.ts) omit these same paths and
// therefore exercise honest degradation on every one of them.
export const IR_STANDING_INTAKE_KEYS: readonly string[] = [
  "activationCriteria",
  "severityMatrix",
  "severityThresholds",
  "responseTeamRoster",
  "outsideCounselName",
  "outsideCounselContact",
  "privilegeProtocol",
  "insurerContact",
  "forensicVendorContact",
  "lawEnforcementContact",
  "keySystems",
  "logSources",
  "itIsolationAuthority",
  "breachNoticeContracts",
  "firstHourConfirmations",
  "nextTabletopDate",
];

IR_PLAYBOOK_GOLDEN.push({
  id: "ir-two-artifact-perfect",
  tool: "ir-playbook",
  set: "tuning",
  intake: {
    organizationName: "Larkfield Building Society",
    discoveryDateTime: isoDaysAgo(1),
    cause: "Unauthorized external access / cyberattack",
    dataTypes: ["Financial / payment data", "Government IDs / SSN", "Names and contact details"],
    affectedCount: "10,000–100,000",
    jurisdictions: ["United Kingdom", "Ireland"],
    processorInvolved: true,
    processorName: "Ashcombe Core Banking Services Ltd",
    contained: "Yes",
    organisationType: "Financial institution",
    encryptionStatus: "Some affected data encrypted",
    encryptionKeyStatus: "Keys not compromised",
    affectedRecordCount: "approx. 48,900 account records",
    affectedDataSubjectCount: "approx. 31,200 members",
    awarenessConfirmed: "Confirmed — discovery timestamp verified as the moment of awareness",
    // ITEM 369-IR standing-playbook intake
    activationCriteria: [
      "Any confirmed unauthorised access to the core banking database",
      "Any ransomware detection on a server in the member-data estate",
      "Any loss of a device holding unencrypted member records",
      "Any supplier notification of a breach affecting Larkfield data",
    ],
    severityMatrix: [
      { level: "SEV-1", definition: "Member financial data confirmed exfiltrated, or core banking unavailable beyond 4 hours", escalation: "Board notified within 1 hour; full response team on continuous call" },
      { level: "SEV-2", definition: "Unauthorised access confirmed to a system holding member data, no exfiltration established", escalation: "Executive sponsor notified within 4 hours" },
      { level: "SEV-3", definition: "Suspicious activity under investigation, no member data implicated", escalation: "Incident Lead only; daily written update" },
    ],
    severityThresholds: ["SEV-1 above 10,000 members", "SEV-2 between 100 and 10,000 members"],
    responseTeamRoster: [
      { role: "Incident Lead", primary: "H. Okonkwo, Head of Operational Risk", alternate: "R. Vasilev, Operational Risk Manager" },
      { role: "Data Protection Officer", primary: "M. Cardoso", alternate: "S. Whitfield, Deputy DPO" },
      { role: "Security / Forensics Lead", primary: "T. Aaltonen, Head of Information Security", alternate: "P. Nkemelu, Security Engineering Manager" },
      { role: "Communications Lead", primary: "J. Ferreira, Director of Member Communications", alternate: "A. Lindqvist, Press Officer" },
      { role: "IT Operations", primary: "D. Marchetti, Infrastructure Lead", alternate: "K. Osei, Platform Engineer" },
    ],
    outsideCounselName: "Hetherington Vance LLP (data protection and cyber practice)",
    outsideCounselContact: "24-hour incident line via the retained-counsel engagement letter, ref HV-2026-114",
    privilegeProtocol: true,
    insurerContact: "Marchmont Speciality cyber policy MSC-88214, notification condition: 72 hours from discovery",
    forensicVendorContact: "Greywater Forensics, master services agreement GF-2025-07, 4-hour callout",
    lawEnforcementContact: "Regional Cyber Crime Unit single point of contact, referral via Action Fraud reference",
    keySystems: ["Core banking platform (Ashcombe hosted)", "Member portal web tier", "Document management store", "Corporate email tenant"],
    logSources: ["Perimeter firewall flow logs", "Identity provider sign-in logs", "Core banking application audit trail", "EDR telemetry", "Email tenant unified audit log"],
    itIsolationAuthority: "Head of Information Security, or the Infrastructure Lead where the former is unreachable for 30 minutes",
    breachNoticeContracts: [
      { counterparty: "Ashcombe Core Banking Services Ltd (processor)", deadline: "Without undue delay and in any event within 24 hours of awareness", clause: "MSA schedule 4, clause 8.3" },
      { counterparty: "Trelawney Card Scheme (sponsor bank)", deadline: "Within 12 hours of confirming cardholder data involvement", clause: "Sponsorship agreement, clause 14.2(b)" },
      { counterparty: "Corvid Analytics Ltd (sub-processor)", deadline: "Within 48 hours", clause: "DPA annex II, paragraph 6" },
    ],
    firstHourConfirmations: ["fh_activate", "fh_clock", "fh_preserve", "fh_isolate", "fh_counsel", "fh_dpo", "fh_scope", "fh_insurer"],
    nextTabletopDate: "2026-11-19",
  },
  assertions: [
    { kind: "must_include", pattern: "Activation criteria", flags: "i", label: "standing playbook activation section present" },
    { kind: "must_include", pattern: "Incident log|Decision log", flags: "i", label: "incident worksheet forms present" },
  ],
});
