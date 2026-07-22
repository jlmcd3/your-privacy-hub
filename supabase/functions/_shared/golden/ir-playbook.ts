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
