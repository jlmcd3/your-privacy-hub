// Central copy for the mid-intake account gate (2026-09-04, CEO-approved).
//
// Policy:
// - Gate one step before the review/summary step, never earlier.
// - Decision is made in-session: we do NOT promise "come back later" and we
//   do not offer save-for-later as a fallback.
// - Never mention model training.
//
// Tier A = generation is included/entitled → free account.
// Tier B = generation is paid/premium → subscribe, account still required.

export interface IntakeGateCopy {
  heading: string;
  body: string;
  footnote: string;
  /** Slug for /samples/:toolSlug — shown as "See a finished sample". */
  sampleSlug: string;
}

const SESSION_NOTE =
  "Finish in this session — your answers are not held for a later visit.";
const SUBSCRIBER_NOTE =
  "Intelligence subscribers receive subscriber pricing on every tool.";

const TIER_A_HEADING = "Create a free account to continue";
const TIER_B_HEADING = "Continue to the full assessment";

function tierA(line: string, sampleSlug: string): IntakeGateCopy {
  return {
    heading: TIER_A_HEADING,
    body: `${line} Creating a free account takes a few seconds, and your report is saved to your account and emailed to you.`,
    footnote: SESSION_NOTE,
    sampleSlug,
  };
}

function tierB(line: string, sampleSlug: string): IntakeGateCopy {
  return {
    heading: TIER_B_HEADING,
    body: `${line} Subscribe to continue — Intelligence is $35/mo or $350/yr — or create a free account to buy this report on its own.`,
    footnote: SUBSCRIBER_NOTE,
    sampleSlug,
  };
}

export const INTAKE_GATE_COPY = {
  cppa_risk: tierA(
    "One section left — the risk-specific questions that drive your Cal. Civ. Code § 1798.185 assessment.",
    "cppa_risk",
  ),
  cppa_cyber: tierA(
    "Your audit answers are ready to run against the CPPA cybersecurity regulations.",
    "cppa_cyber",
  ),
  cppa_admt: tierA(
    "One step left before we evaluate your automated decision-making against the ADMT rules.",
    "cppa_admt",
  ),
  governance: tierA(
    "One section left before your governance assessment is ready to generate.",
    "governance",
  ),
  dpia: tierA(
    "Your DPIA inputs are complete and ready to assess.",
    "dpia",
  ),
  dpa: tierA(
    "One step left before your data processing agreement is ready.",
    "dpa",
  ),
  registration: tierA(
    "Next you'll select jurisdictions — that's what drives every filing conclusion in your report.",
    "registration",
  ),
  li_assessment: tierB(
    "Step 2 works through the EDPB's three-part test — purpose, necessity, and balancing — and produces the assessment record.",
    "li_assessment",
  ),
  biometric: tierB(
    "Your screening is complete. The full checker returns a jurisdiction-by-jurisdiction determination across BIPA, CCPA, and the state biometric provisions.",
    "biometric",
  ),
  ir_playbook: tierB(
    "The full playbook covers notification clocks, regulator contacts, and escalation paths for every regime you operate under.",
    "ir_playbook",
  ),
} satisfies Record<string, IntakeGateCopy>;

export type IntakeGateKey = keyof typeof INTAKE_GATE_COPY;

export function intakeGate(key: IntakeGateKey): IntakeGateCopy {
  return INTAKE_GATE_COPY[key];
}
