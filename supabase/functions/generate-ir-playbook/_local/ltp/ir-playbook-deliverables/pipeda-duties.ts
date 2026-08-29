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
// govern for provincially-regulated organisations — full duty text for
// those is separate, out-of-scope legal research (doc 103 §2). Those four
// provinces get the SAME honest "to be confirmed" fallback
// us-state-duties.ts already uses for "Other US State", closing a gap where
// they previously got silent treatment on this record (no verified clock,
// but also no honest acknowledgment that the clock is unconfirmed).
//
// DESIGN: PIPEDA's trigger ("real risk of significant harm") is
// QUALITATIVE (data sensitivity x probability of misuse), unlike HIPAA's
// numeric 500-person threshold — the intake has no comparable banded signal
// to classify it against. Each duty states its trigger AS LAW, never
// adjudicated against this record — the same register CPPA Risk's
// submission-postures.ts already uses for exactly this situation, and the
// same register HIPAA's individual-notice duty already uses (stated
// unconditionally once the regime applies, not adjudicated).

import type { StateDutySet } from "./us-state-duties.ts";

const PIPEDA_JURISDICTION = "Canada (PIPEDA)";

/** Canadian provincial jurisdictions this module does not carry verified duty text for. */
const UNVERIFIED_CANADIAN_PROVINCES: readonly string[] = [
  "Quebec (Law 25)",
  "Alberta (PIPA)",
  "British Columbia (PIPA)",
  "Ontario (PHIPA)",
];

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

/** Strips the trailing parenthetical for a readable sentence label: "Quebec (Law 25)" -> "Quebec". */
function provinceLabel(jurisdiction: string): string {
  return jurisdiction.replace(/\s*\([^)]*\)\s*$/, "").trim() || jurisdiction;
}

/**
 * Builds PIPEDA's four duty rows plus, independently, one honest-fallback
 * row per recorded-but-unverified Canadian provincial jurisdiction. Rides
 * the same StateDutySet shape the fleet's existing US-state clocks use, so
 * every existing state_notification_duties consumer renders them with zero
 * additional wiring.
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
    if (!UNVERIFIED_CANADIAN_PROVINCES.includes(j) || seen.has(j)) continue;
    seen.add(j);
    duties.push({
      jurisdiction: j,
      state_label: provinceLabel(j),
      citation: "[statutory reference to be confirmed]",
      individual_deadline:
        "notification on that province's own breach-notification statute, whose clock must be confirmed before the timeline is relied on",
      verified: false,
    });
  }
  return duties;
}
