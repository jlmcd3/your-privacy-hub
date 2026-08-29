// IR-E PHASE 3a (2026-08-29, doc 102, CEO-approved VERBATIM §4/§5) — HIPAA'S
// FOUR BREACH-NOTIFICATION DUTIES (45 C.F.R. Part 164, Subpart D). Every
// citation was pulled fresh from Cornell LII (law.cornell.edu/cfr/text/45/
// 164.4xx) during drafting, not carried over from the old retired prompt's
// text — though that text (index.ts, dead code) turns out to state the same
// four-duty structure and the same 500-per-state media-notice distinction
// correctly; this independently confirms it rather than trusts it.
//
// GATING: fires on EITHER of two existing intake signals — no new field.
// organisationType === "Healthcare provider" is the closest proxy for
// HIPAA covered-entity/business-associate status (doc 100's own framing:
// "conditional on a covered-entity/BA intake signal"). The intake's
// JURISDICTIONS lexicon separately carries a "United States (HIPAA)" value
// the customer can select directly — a PRE-EXISTING signal this module was
// initially built without checking for; ir-skeleton-assemble.ts already
// tests `jurisdictions` for /hipaa/i and, before this fix, printed a now-
// false "HIPAA's operative text is not in this product's verified corpus"
// sentence whenever that jurisdiction was recorded WITHOUT the org-type
// signal also being set. Widened to fire on either, matching the existing
// convention rather than leaving a customer who selects the jurisdiction
// checkbox with a stale, self-contradicting placeholder. The imprecision —
// HIPAA also reaches health plans and clearinghouses by a different route
// the intake does not capture — is stated once, in the assumption note,
// never silently assumed away.
//
// SHAPE REUSE: rides the existing StateDutySet shape/rendering machinery
// (composeJurisdictionActionPlan and every other state_notification_duties
// consumer already wired end-to-end) rather than a parallel HIPAA-specific
// composer — zero new rendering wiring, the same reuse trick Phase 2 used
// for standing_playbook sections. The § 164.412 law-enforcement-delay
// modifier is NOT a fifth duty row (it has no standalone deadline of its
// own); it is appended as a trailing clause on the individual-notice row,
// which always renders whenever HIPAA applies.
//
// affectedCount is a BAND (the intake's COUNTS lexicon), not a precise
// number, and carries no per-state breakdown — so the two 500-threshold
// duties (media notice, Secretary notice) can only be PARTIALLY resolved
// from the record. A band that straddles or does not resolve the line
// degrades honestly to "undetermined on the record", never guesses.

import type { StateDutySet } from "./us-state-duties.ts";

const HEALTHCARE_ORG_TYPE = "Healthcare provider";

/** Bands that unambiguously put the incident at or above 500 affected individuals. */
const COUNTS_AT_LEAST_500: readonly string[] = ["1,000–10,000", "10,000–100,000", "More than 100,000"];
/** Bands that unambiguously put the incident under 500 affected individuals. */
const COUNTS_UNDER_500: readonly string[] = ["Fewer than 100"];

export function isHealthcareOrgType(organisationType: string): boolean {
  return organisationType === HEALTHCARE_ORG_TYPE;
}

/** The pre-existing signal ir-skeleton-assemble.ts already tests jurisdictions for. */
function hasHipaaJurisdiction(jurisdictions: readonly string[]): boolean {
  return jurisdictions.some((j) => /hipaa/i.test(j));
}

export function isHipaaEngaged(organisationType: string, jurisdictions: readonly string[]): boolean {
  return isHealthcareOrgType(organisationType) || hasHipaaJurisdiction(jurisdictions);
}

const INDIVIDUAL_NOTICE_TEXT =
  "notification to each affected individual without unreasonable delay and in no case later than 60 calendar days after discovery of the breach, where discovery runs from the first day the breach was known or, with reasonable diligence, would have been known; under 45 C.F.R. § 164.412, this clock may be delayed on a law-enforcement official's statement that notification would impede a criminal investigation or damage national security — for the period specified where the request is in writing, or for up to 30 days on an oral request unless converted to writing within that window";

function mediaNoticeText(affectedCount: string): string {
  if (COUNTS_AT_LEAST_500.includes(affectedCount)) {
    return "the recorded scale exceeds 500 individuals in aggregate, so media notice is triggered for any single State or jurisdiction in which more than 500 residents were affected; the record does not break the count down by state, so which jurisdiction(s) cross that threshold must be confirmed before this duty is finalized. No later than 60 calendar days after discovery, to media outlets serving the affected jurisdiction(s)";
  }
  if (COUNTS_UNDER_500.includes(affectedCount)) {
    return "the recorded scale is under the 500-per-jurisdiction threshold, so media notice is not triggered on this record";
  }
  return "media notice triggers only where more than 500 residents of a single State or jurisdiction are affected; the recorded band does not resolve whether that threshold is crossed, so this determination is undetermined on the record";
}

function secretaryNoticeText(affectedCount: string): string {
  if (COUNTS_AT_LEAST_500.includes(affectedCount)) {
    return "the recorded scale is at least 500 individuals, so notice to the HHS Secretary is due contemporaneously with the individual notice";
  }
  if (COUNTS_UNDER_500.includes(affectedCount)) {
    return "the recorded scale is under 500 individuals, so this breach is logged and reported to the HHS Secretary annually, not later than 60 days after the end of the calendar year in which it was discovered, rather than notified contemporaneously";
  }
  return "45 C.F.R. § 164.408 sets a different clock above and below 500 affected individuals; the recorded band does not resolve which side of that line this breach falls on, so this determination is undetermined on the record";
}

export const HIPAA_ASSUMPTION_NOTE =
  "This assessment treats the organisation's recorded type — healthcare provider — as sufficient to engage HIPAA's breach-notification duties; HIPAA also reaches health plans, healthcare clearinghouses, and business associates by a different route, so if the organisation's actual HIPAA status differs from a healthcare-provider covered entity, that should be confirmed before these duties are relied on.";

export interface HipaaResult {
  readonly duties: readonly StateDutySet[];
  /** Present only when `duties` is non-empty. */
  readonly assumption_note: string;
}

/**
 * Builds the HIPAA duty rows in the SAME StateDutySet shape the fleet's
 * existing US-state clocks use, so every existing state_notification_duties
 * consumer renders them with zero additional wiring. Empty when the
 * healthcare-provider signal is not recorded — the same "duty set absent
 * when the regime is not engaged" pattern the GDPR-family regimes array
 * already uses.
 */
export function buildHipaaDuties(
  organisationType: string,
  jurisdictions: readonly string[],
  affectedCount: string,
  processorInvolved: boolean,
  processorName: string,
): HipaaResult {
  if (!isHipaaEngaged(organisationType, jurisdictions)) {
    return { duties: [], assumption_note: "" };
  }
  const duties: StateDutySet[] = [
    {
      jurisdiction: "HIPAA",
      state_label: "HIPAA (individual notice)",
      citation: "45 C.F.R. § 164.404",
      individual_deadline: INDIVIDUAL_NOTICE_TEXT,
      verified: true,
    },
    {
      jurisdiction: "HIPAA",
      state_label: "HIPAA (media notice)",
      citation: "45 C.F.R. § 164.406",
      individual_deadline: mediaNoticeText(affectedCount),
      verified: true,
    },
    {
      jurisdiction: "HIPAA",
      state_label: "HIPAA (notice to the HHS Secretary)",
      citation: "45 C.F.R. § 164.408",
      individual_deadline: secretaryNoticeText(affectedCount),
      verified: true,
    },
  ];
  if (processorInvolved) {
    duties.push({
      jurisdiction: "HIPAA",
      state_label: "HIPAA (business-associate notice)",
      citation: "45 C.F.R. § 164.410",
      individual_deadline: `${processorName || "the recorded processor"} notifies the covered entity without unreasonable delay and no later than 60 calendar days after its own discovery of the breach, identifying each affected individual to the extent possible together with any other information the covered entity needs for its own § 164.404(c) notice`,
      verified: true,
    });
  }
  return { duties, assumption_note: HIPAA_ASSUMPTION_NOTE };
}
