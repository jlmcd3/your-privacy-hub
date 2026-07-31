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
      dataTypes: ["Financial / payment data", "Names and contact details"],
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
      dataTypes: ["Financial / payment data", "Names and contact details"],
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
