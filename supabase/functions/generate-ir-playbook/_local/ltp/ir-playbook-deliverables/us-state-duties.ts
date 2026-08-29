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

// ═══════════════════════════════════════════════════════════════════════════
// IR-F TRANCHE 2 (2026-08-29) — PER-STATE WALK GATES.
//
// Verified gate content for the four-gate notification walk (tranche 1,
// ir-skeleton-assemble.ts): each entry carries the state's own covered-PI
// element structure, breach-definition character, encryption formulation and
// (where the statute has one) harm-threshold carve-out — every formulation
// condensed FROM THE STATUTE'S OWN TEXT, fetched fresh from the state's
// official code publisher on the verified_on date (California:
// leginfo.legislature.ca.gov § 1798.82; Texas: statutes.capitol.texas.gov
// §§ 521.002/521.053; New York: nysenate.gov GBS § 899-aa). States without
// an entry keep tranche 1's generic walk — the gate is absent, never
// invented. `intake_types` values are EXACT members of the IR intake's
// DATA_TYPES enum (_shared/intake-contracts/ir-playbook.ts).
// ═══════════════════════════════════════════════════════════════════════════

export interface StateGateElementLimb {
  /** IR intake DATA_TYPES labels that engage this limb. */
  readonly intake_types: readonly string[];
  /** The statute's own element description, condensed, with pinpoint. */
  readonly limb: string;
  /** True where the limb reaches items only in combination with the
   *  individual's name. */
  readonly requires_name: boolean;
}

export interface StateWalkGates {
  /** Breach-definition character, in the statute's own frame, with pinpoint. */
  readonly breach_definition: string;
  readonly element_limbs: readonly StateGateElementLimb[];
  /** Data types the statute's element list does NOT reach, stated so the
   *  walk can resolve honest negatives. */
  readonly uncovered_note?: string;
  /** The statute's encryption formulation, with pinpoint. */
  readonly encryption_formulation: string;
  /** Harm-threshold carve-out where the statute has one. */
  readonly harm_carveout?: string;
  readonly verified_on: string;
}

export const STATE_WALK_GATES: Record<string, StateWalkGates> = {
  "California": {
    breach_definition:
      "the duty runs to a resident whose personal information was, or is reasonably believed to have been, acquired by an unauthorized person (Cal. Civ. Code § 1798.82(a)(1)) — an acquisition standard",
    element_limbs: [
      {
        intake_types: ["Government IDs / SSN"],
        limb:
          "social security number, and driver's license, state identification card, tax identification, passport, military identification or other government-issued unique identification numbers (§ 1798.82(h)(1)(A)–(B))",
        requires_name: true,
      },
      {
        intake_types: ["Financial / payment data"],
        limb:
          "account, credit or debit card numbers in combination with any required security code, access code or password permitting access to the financial account (§ 1798.82(h)(1)(C))",
        requires_name: true,
      },
      {
        intake_types: ["Health / medical records"],
        limb: "medical information and health insurance information (§ 1798.82(h)(1)(D)–(E))",
        requires_name: true,
      },
      {
        intake_types: ["Biometric data"],
        limb:
          "unique biometric data used to authenticate a specific individual (§ 1798.82(h)(1)(F))",
        requires_name: true,
      },
      {
        intake_types: ["Passwords / credentials"],
        limb:
          "a username or email address in combination with a password or security question and answer permitting access to an online account (§ 1798.82(h)(2))",
        requires_name: false,
      },
    ],
    uncovered_note:
      "location data and other types outside § 1798.82(h)'s element list do not, by themselves, constitute covered personal information under this section",
    encryption_formulation:
      "the duty attaches to unencrypted personal information, or to encrypted personal information where the encryption key or security credential was also acquired and could render the information readable or usable (§ 1798.82(a)(1)); \"encrypted\" means rendered unusable, unreadable, or indecipherable through a generally accepted security technology or methodology (§ 1798.82(i)(4))",
    verified_on: "2026-08-29",
  },
  "Texas": {
    breach_definition:
      "\"breach of system security\" means unauthorized acquisition of computerized data that compromises the security, confidentiality, or integrity of sensitive personal information, including encrypted data where the person accessing it has the decryption key; good-faith acquisition by an employee or agent for the person's purposes is excluded unless used or disclosed without authorization (Tex. Bus. & Com. Code § 521.053(a))",
    element_limbs: [
      {
        intake_types: ["Government IDs / SSN"],
        limb:
          "social security number, and driver's license or other government-issued identification numbers (§ 521.002(a)(2)(A)(i)–(ii))",
        requires_name: true,
      },
      {
        intake_types: ["Financial / payment data"],
        limb:
          "account, credit or debit card numbers in combination with any required security code, access code or password permitting access to the financial account (§ 521.002(a)(2)(A)(iii))",
        requires_name: true,
      },
      {
        intake_types: ["Health / medical records"],
        limb:
          "information that identifies an individual and relates to physical or mental health, the provision of health care, or payment for health care (§ 521.002(a)(2)(B))",
        requires_name: false,
      },
    ],
    uncovered_note:
      "§ 521.002(a)(2) carries no standalone biometric or online-credential limb, so biometric data and passwords or credentials do not, by themselves, constitute sensitive personal information under this chapter",
    encryption_formulation:
      "the name-plus-element limbs reach items only if the name and the items are not encrypted (§ 521.002(a)(2)(A)), while acquisition of encrypted data is nonetheless a breach where the person accessing it has the decryption key (§ 521.053(a))",
    verified_on: "2026-08-29",
  },
  "New York": {
    breach_definition:
      "\"breach of the security of the system\" means unauthorized access to, or acquisition of, computerized data compromising the security, confidentiality, or integrity of private information — access alone can suffice, and the statute lists factors for both determinations; good-faith access by an employee or agent for business purposes is excluded absent misuse or unauthorized disclosure (N.Y. Gen. Bus. Law § 899-aa(1)(c))",
    element_limbs: [
      {
        intake_types: ["Government IDs / SSN"],
        limb:
          "social security number, and driver's license or non-driver identification card numbers (§ 899-aa(1)(b)(i)(1)–(2))",
        requires_name: true,
      },
      {
        intake_types: ["Financial / payment data"],
        limb:
          "account, credit or debit card numbers with a required code or password — or alone, where the number could be used to access the financial account without additional information (§ 899-aa(1)(b)(i)(3)–(4))",
        requires_name: true,
      },
      {
        intake_types: ["Biometric data"],
        limb:
          "biometric information used to authenticate or ascertain the individual's identity (§ 899-aa(1)(b)(i)(5))",
        requires_name: true,
      },
      {
        intake_types: ["Health / medical records"],
        limb:
          "medical information and health insurance information (§ 899-aa(1)(b)(i)(6)–(7))",
        requires_name: true,
      },
      {
        intake_types: ["Passwords / credentials"],
        limb:
          "a username or email address in combination with a password or security question and answer permitting access to an online account (§ 899-aa(1)(b)(ii))",
        requires_name: false,
      },
    ],
    uncovered_note:
      "location data and other types outside § 899-aa(1)(b)'s element list do not, by themselves, constitute private information under this section",
    encryption_formulation:
      "elements count where the data element, or the combination with personal information, is not encrypted — or is encrypted with an encryption key that has also been accessed or acquired (§ 899-aa(1)(b))",
    harm_carveout:
      "notice is not required where the exposure was an inadvertent disclosure by persons authorized to access the information and the business reasonably determines it will not likely result in misuse, financial harm, or (for online credentials) emotional harm — a determination that must be documented in writing, kept five years, and filed with the Attorney General within ten days where more than five hundred New York residents are affected (§ 899-aa(2)(a))",
    verified_on: "2026-08-29",
  },
};
