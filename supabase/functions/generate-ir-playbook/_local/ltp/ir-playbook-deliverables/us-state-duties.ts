// SO-FT FIX 3 (2026-08-11) — US STATE BREACH-NOTIFICATION DUTY SETS.
//
// `notification_duties` only ever carried GDPR-family regimes ("eu" | "uk"),
// so the Part One standing summary rendered by `buildDeadlinesProse()` never
// named a US state clock even when the Section 4 incident narrative correctly
// determined one. This module is the parallel state structure: one typed duty
// per recorded US-state jurisdiction, each with its OWN statutory basis and
// its OWN deadline phrasing — never the 72-hour Art. 33 template.
//
// DISCIPLINE: every entry below is a verified state clock. A recorded state
// with no verified entry (including "Other US State") yields a duty whose
// deadline is explicitly to be determined — never an invented figure, and
// never a GDPR figure carried across.

export interface StateDutySet {
  /** Intake jurisdiction label exactly as recorded. */
  readonly jurisdiction: string;
  /** Reader label for the state. */
  readonly state_label: string;
  /** The statutory basis, cited as the state's own code. */
  readonly citation: string;
  /** Individual-notice clock, in that statute's own phrasing. */
  readonly individual_deadline: string;
  /** Regulator-notice clock where the statute creates one. */
  readonly regulator_deadline?: string;
  /** Whether a verified clock backs this entry. */
  readonly verified: boolean;
}

interface StateRule {
  readonly label: string;
  readonly citation: string;
  readonly individual: string;
  readonly regulator?: string;
}

/** Incidents on or after this date fall under California SB 446. */
const CA_SB446_EFFECTIVE = Date.parse("2026-01-01T00:00:00Z");

const CA_PRE_SB446: StateRule = {
  label: "California",
  citation: "Cal. Civ. Code § 1798.82 (pre-SB-446 regime, incidents before 1 Jan 2026)",
  individual:
    "notification to affected California residents in the most expedient time possible and without unreasonable delay, with no fixed outer day-count",
  regulator:
    "a sample copy of the notice to the California Attorney General where more than 500 California residents are notified, with no day-count attached to that filing",
};

const CA_SB446: StateRule = {
  label: "California",
  citation: "Cal. Civ. Code § 1798.82, as amended by SB 446 (effective 1 Jan 2026)",
  individual:
    "notification to affected California residents within 30 calendar days of discovery or notification of the breach",
  regulator:
    "an electronic sample copy to the California Attorney General within 15 calendar days of notifying consumers where more than 500 California residents are notified (§ 1798.82(f))",
};

const STATE_RULES: Record<string, StateRule> = {
  "Texas": {
    label: "Texas",
    citation: "Tex. Bus. & Com. Code § 521.053",
    individual:
      "notification to affected individuals without unreasonable delay and not later than 60 days after determining that the breach occurred (§ 521.053(b))",
    regulator:
      "notification to the Texas Attorney General as soon as practicable and not later than 30 days after that determination where the breach involves at least 250 Texas residents (§ 521.053(i))",
  },
  "New York": {
    label: "New York",
    citation:
      "N.Y. Gen. Bus. Law § 899-aa, as amended by S2659B (Chapter 647 of 2024, signed 21 Dec 2024)",
    individual:
      "notification to affected New York residents in the most expedient time possible and not later than 30 calendar days after discovery, with delay permitted only for legitimate law-enforcement needs",
    regulator:
      "notice to the state agencies listed at § 899-aa(8)(a) whenever any New York resident is notified, irrespective of the number affected",
  },
  "Colorado": {
    label: "Colorado",
    citation: "Colo. Rev. Stat. § 6-1-716",
    individual:
      "notification to affected Colorado residents in the most expedient time possible and not later than 30 days after determining that a security breach occurred",
    regulator:
      "notice to the Colorado Attorney General not later than 30 days after that determination where 500 or more Colorado residents are affected",
  },
  "Florida": {
    label: "Florida",
    citation: "Fla. Stat. § 501.171",
    individual:
      "notification to affected Florida residents as expeditiously as practicable and not later than 30 days after determination of the breach",
    regulator:
      "notice to the Florida Department of Legal Affairs within 30 days where 500 or more Florida residents are affected",
  },
  "Washington": {
    label: "Washington",
    citation: "RCW 19.255.010",
    individual:
      "notification to affected Washington residents in the most expedient time possible and not later than 30 calendar days after discovery",
    regulator:
      "notice to the Washington Attorney General within the same 30-day period where more than 500 Washington residents are affected",
  },
  "Connecticut": {
    label: "Connecticut",
    citation: "Conn. Gen. Stat. § 36a-701b",
    individual:
      "notification to affected Connecticut residents without unreasonable delay and not later than 60 days after discovery",
    regulator: "notice to the Connecticut Attorney General not later than the time of individual notice",
  },
  "Oregon": {
    label: "Oregon",
    citation: "ORS 646A.604",
    individual:
      "notification to affected Oregon consumers in the most expeditious manner possible and not later than 45 days after discovery",
    regulator:
      "notice to the Oregon Attorney General within the same period where more than 250 Oregon consumers are affected",
  },
  "Illinois": {
    label: "Illinois",
    citation: "815 ILCS 530/10",
    individual:
      "notification to affected Illinois residents in the most expedient time possible and without unreasonable delay, with no fixed outer day-count",
  },
  "Massachusetts": {
    label: "Massachusetts",
    citation: "Mass. Gen. Laws ch. 93H, § 3",
    individual:
      "notification to affected Massachusetts residents as soon as practicable and without unreasonable delay",
    regulator:
      "notice to the Massachusetts Attorney General and the Office of Consumer Affairs and Business Regulation on the same footing",
  },
  "Virginia": {
    label: "Virginia",
    citation: "Va. Code § 18.2-186.6",
    individual:
      "notification to affected Virginia residents without unreasonable delay",
    regulator:
      "notice to the Virginia Attorney General where more than 1,000 Virginia residents are notified",
  },
};

/** The intake labels this module recognises as US states. */
export function isUsStateJurisdiction(j: string): boolean {
  return j === "California" || j === "Other US State" || Object.prototype.hasOwnProperty.call(STATE_RULES, j);
}

function californiaRule(incidentDateIso: string): StateRule {
  const t = Date.parse(incidentDateIso || "");
  // Undated records take the current (SB 446) regime; a pre-2026 date takes
  // the pre-SB-446 regime. The date decides — never the other way round.
  if (Number.isFinite(t) && t < CA_SB446_EFFECTIVE) return CA_PRE_SB446;
  return CA_SB446;
}

/**
 * One duty per recorded US-state jurisdiction, in the order recorded.
 * `incidentDateIso` drives the California regime split only.
 */
export function buildStateNotificationDuties(
  jurisdictions: readonly string[],
  incidentDateIso: string,
): StateDutySet[] {
  const out: StateDutySet[] = [];
  const seen = new Set<string>();
  for (const j of jurisdictions) {
    if (!isUsStateJurisdiction(j) || seen.has(j)) continue;
    seen.add(j);
    if (j === "Other US State") {
      out.push({
        jurisdiction: j,
        state_label: "the other US state recorded",
        citation: "[statutory reference to be confirmed]",
        individual_deadline:
          "notification on that state's own breach-notification statute, whose clock must be confirmed before the timeline is relied on",
        verified: false,
      });
      continue;
    }
    const rule = j === "California" ? californiaRule(incidentDateIso) : STATE_RULES[j];
    out.push({
      jurisdiction: j,
      state_label: rule.label,
      citation: rule.citation,
      individual_deadline: rule.individual,
      regulator_deadline: rule.regulator,
      verified: true,
    });
  }
  return out;
}
