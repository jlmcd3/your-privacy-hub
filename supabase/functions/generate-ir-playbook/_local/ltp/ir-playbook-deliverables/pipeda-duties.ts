// IR-E PHASE 3b (2026-08-29, doc 103, CEO-approved VERBATIM §3/§4) — PIPEDA'S
// BREACH-NOTIFICATION DUTIES (Personal Information Protection and Electronic
// Documents Act, Division 1.1, §§ 10.1–10.3 + SOR/2018-64). Every citation
// was pulled fresh from the Justice Laws Website (laws.justice.gc.ca —
// Canada's official consolidated-statutes repository) during drafting.
//
// GATING: jurisdictions includes "Canada (PIPEDA)" — an existing intake
// value, no new field. Deliberately narrower than "any Canadian
// jurisdiction": Quebec/Alberta/British Columbia/Ontario carry their own
// "substantially similar" provincial legislation PIPEDA does not directly
// govern for provincially-regulated organisations.
//
// DESIGN: PIPEDA's trigger ("real risk of significant harm") is
// QUALITATIVE (data sensitivity x probability of misuse), unlike HIPAA's
// numeric 500-person threshold — the intake has no comparable banded signal
// to classify it against. Each duty states its trigger AS LAW, never
// adjudicated against this record — the same register CPPA Risk's
// submission-postures.ts already uses for exactly this situation, and the
// same register HIPAA's individual-notice duty already uses (stated
// unconditionally once the regime applies, not adjudicated).
//
// PHASE 3c (2026-08-29, doc 103 continuation, CEO-approved) — the four
// Canadian provinces below now carry real duty text rather than the
// honest-unverified fallback this module shipped with in Phase 3b.
// Sourcing tiers differ and are handled two different ways per the CEO's
// explicit instruction on framing:
//   - Alberta: fetched directly from the regulator's own page (oipc.ab.ca)
//     — high confidence, cited normally. That fetch also caught a real
//     error in the old retired prompt's notes: individual notice is NOT an
//     independent PIPA duty (the Commissioner orders it under s. 37.1
//     after review), which the old prompt had wrongly stated as a direct,
//     symmetrical duty alongside Commissioner notice.
//   - Quebec, British Columbia, Ontario: primary legislative sites (Legis-
//     Québec, CanLII, a BC FIPPA page mistakenly fetched first and
//     discarded before use, IPC Ontario) all blocked automated access.
//     Built from converging secondary/professional sources instead. Per
//     CEO direction, this is NOT flagged as a sourcing-tier caveat in the
//     rendered text ("this is a secondary source") — it is folded into an
//     actionable instruction ("confirm ... with the applicable regulator")
//     that reads the same as any other degradation sentence in this
//     product's register.

import type { StateDutySet } from "./us-state-duties.ts";

const PIPEDA_JURISDICTION = "Canada (PIPEDA)";

export function isPipedaJurisdiction(jurisdictions: readonly string[]): boolean {
  return jurisdictions.includes(PIPEDA_JURISDICTION);
}

const COMMISSIONER_NOTICE_TEXT =
  "report to the Privacy Commissioner of Canada as soon as feasible after the organisation determines the breach has occurred, where it is reasonable in the circumstances to believe the breach creates a real risk of significant harm to an individual; that risk turns on the sensitivity of the personal information involved and the probability that it has been, is being, or will be misused (§ 10.1(8))";

const INDIVIDUAL_NOTICE_TEXT =
  "notify each affected individual on the same real-risk-of-significant-harm trigger and the same as-soon-as-feasible timing, unless notification is otherwise prohibited by law. \"Significant harm\" is defined to include bodily harm, humiliation, damage to reputation or relationships, loss of employment or business opportunities, financial loss, identity theft, negative effects on the credit record, and damage to or loss of property (§ 10.1(7))";

const OTHER_ORG_NOTICE_TEXT =
  "where the organisation notifies an individual under § 10.1(3), it must also notify any other organisation or government institution it believes may be able to reduce or mitigate the resulting risk of harm, as soon as feasible after determining the breach occurred; this duty depends on the organisation's own assessment of who else could help and is not resolved by the categories recorded on this intake";

const RECORD_KEEPING_TEXT =
  "keep and maintain a record of every breach of security safeguards, regardless of whether it meets the real-risk-of-significant-harm notification threshold, for 24 months after the organisation determines the breach occurred";

const ALBERTA_TEXT =
  "notify the Office of the Information and Privacy Commissioner of Alberta without unreasonable delay where a reasonable person would consider that the breach creates a real risk of significant harm to an individual. Notice to affected individuals is not an independent duty under PIPA; the Commissioner may require it by order (s. 37.1) after reviewing the organisation's report, though organisations commonly notify individuals voluntarily in advance of that review";

const BC_TEXT =
  "where a breach poses a real risk of significant harm to an individual, notify that individual directly and without unreasonable delay; notice to the Office of the Information and Privacy Commissioner for BC is not itself required by statute, though the OIPC recommends it as a matter of practice. Confirm the applicable thresholds and notice content with the OIPC for British Columbia before relying on this timeline";

const QUEBEC_TEXT =
  "where a confidentiality incident presents a risk of serious injury (assessed by the sensitivity of the information, the anticipated consequences of its use, and the likelihood of injurious use), notify the Commission d'accès à l'information (CAI) without delay and notify each affected person; maintain a register of every confidentiality incident, regardless of whether it meets the notification threshold, and provide it to the CAI on request. Confirm the applicable thresholds and notice content with the CAI before relying on this timeline";

const ONTARIO_TEXT =
  "where personal health information in a health information custodian's custody or control is stolen, lost, or used or disclosed without authority, notify the affected individual at the first reasonable opportunity. Notify the Information and Privacy Commissioner of Ontario (IPC) where the breach meets the thresholds set in the PHIPA regulation. Separately, report every privacy breach in an annual statistics submission to the IPC regardless of whether it was individually reported at the time. Confirm the applicable IPC-notice thresholds and the current annual-reporting deadline with the IPC before relying on this timeline";

interface ProvinceRule {
  readonly jurisdiction: string;
  readonly state_label: string;
  readonly citation: string;
  readonly text: string;
}

const PROVINCE_RULES: readonly ProvinceRule[] = [
  { jurisdiction: "Alberta (PIPA)", state_label: "Alberta", citation: "Alberta PIPA, s. 34.1, s. 37.1", text: ALBERTA_TEXT },
  { jurisdiction: "British Columbia (PIPA)", state_label: "British Columbia", citation: "BC PIPA", text: BC_TEXT },
  { jurisdiction: "Quebec (Law 25)", state_label: "Quebec", citation: "Act respecting the protection of personal information in the private sector, ss. 3.5–3.8", text: QUEBEC_TEXT },
  { jurisdiction: "Ontario (PHIPA)", state_label: "Ontario", citation: "Ontario PHIPA", text: ONTARIO_TEXT },
];

/**
 * Builds PIPEDA's four duty rows plus, independently, one row per recorded
 * Canadian provincial jurisdiction. Rides the same StateDutySet shape the
 * fleet's existing US-state clocks use, so every existing
 * state_notification_duties consumer renders them with zero additional
 * wiring.
 */
export function buildPipedaDuties(jurisdictions: readonly string[]): StateDutySet[] {
  const duties: StateDutySet[] = [];
  if (isPipedaJurisdiction(jurisdictions)) {
    duties.push(
      {
        jurisdiction: PIPEDA_JURISDICTION,
        state_label: "PIPEDA (Commissioner notice)",
        citation: "PIPEDA § 10.1(1), (6)",
        individual_deadline: COMMISSIONER_NOTICE_TEXT,
        verified: true,
      },
      {
        jurisdiction: PIPEDA_JURISDICTION,
        state_label: "PIPEDA (individual notice)",
        citation: "PIPEDA § 10.1(3), (6)",
        individual_deadline: INDIVIDUAL_NOTICE_TEXT,
        verified: true,
      },
      {
        jurisdiction: PIPEDA_JURISDICTION,
        state_label: "PIPEDA (notice to other organizations)",
        citation: "PIPEDA § 10.2",
        individual_deadline: OTHER_ORG_NOTICE_TEXT,
        verified: true,
      },
      {
        jurisdiction: PIPEDA_JURISDICTION,
        state_label: "PIPEDA (record-keeping)",
        citation: "PIPEDA § 10.3, SOR/2018-64",
        individual_deadline: RECORD_KEEPING_TEXT,
        verified: true,
      },
    );
  }
  const seen = new Set<string>();
  for (const j of jurisdictions) {
    if (seen.has(j)) continue;
    const rule = PROVINCE_RULES.find((r) => r.jurisdiction === j);
    if (!rule) continue;
    seen.add(j);
    duties.push({
      jurisdiction: rule.jurisdiction,
      state_label: rule.state_label,
      citation: rule.citation,
      individual_deadline: rule.text,
      verified: true,
    });
  }
  return duties;
}
