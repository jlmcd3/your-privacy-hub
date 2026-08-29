// IR-E PHASE 3d (2026-08-29, doc 104, CEO-approved VERBATIM §3/§4 + the
// DORA-figures follow-up ruling) — SECTORAL OVERLAY DUTIES: SEC Form 8-K
// Item 1.05, NYDFS (23 NYCRR Part 500), and DORA (Regulation (EU)
// 2022/2554). NIS2 deliberately excluded per CEO direction — no defensible
// trigger exists without a new intake field, which is out of bounds.
//
// GATING — all derived from existing intake fields, no new field added:
//   - SEC 8-K: jurisdictions includes "United States (SEC)" — a value that
//     already existed in the intake, unused, sitting next to
//     "United States (HIPAA)". Direct trigger, no proxy.
//   - NYDFS: jurisdictions includes "New York" AND organisationType ===
//     "Financial institution". Proxy, same pattern as HIPAA's
//     organisationType === "Healthcare provider" — NYDFS's actual "covered
//     entity" test is a specific NY license/registration/charter under the
//     Banking Law, Insurance Law, or Financial Services Law (23 NYCRR
//     500.1), narrower than this intake's generic bucket.
//   - DORA: jurisdictions includes an EU/EEA country AND organisationType
//     === "Financial institution". Same proxy pattern — DORA's "financial
//     entity" is a closed, defined list narrower than the generic bucket.
//
// STACKING BY DESIGN (CEO-confirmed 2026-08-29, no new capability needed):
// each trigger above is evaluated independently and appended to the same
// state_notification_duties array the US-state/HIPAA/PIPEDA rows already
// use. A New York financial institution gets New York's existing general
// breach-law row AND the new NYDFS row, because both conditions are
// independently true on the same answers — no exclusivity logic exists or
// is needed.

import type { StateDutySet } from "./us-state-duties.ts";
import { EEA_JURISDICTIONS } from "./elements.ts";

const FINANCIAL_INSTITUTION = "Financial institution";
const SEC_JURISDICTION = "United States (SEC)";
const NEW_YORK = "New York";

function isFinancialInstitution(organisationType: string): boolean {
  return organisationType === FINANCIAL_INSTITUTION;
}

// DORA (Regulation (EU) 2022/2554) is EU-only — it does not extend to the
// UK post-Brexit, which has its own separate financial-sector operational-
// resilience framework (FCA/PRA), not DORA. Gated on EEA_JURISDICTIONS
// only, deliberately excluding UK_JURISDICTION.
function hasEeaJurisdiction(jurisdictions: readonly string[]): boolean {
  return jurisdictions.some((j) => EEA_JURISDICTIONS.includes(j));
}

const SEC_8K_TEXT =
  "file within four business days of determining the incident is material to investors, describing the incident's nature, scope, and timing and its material impact or reasonably likely material impact on the registrant; the materiality determination itself must be made without unreasonable delay after discovery, and a national-security or public-safety delay is available only where the Attorney General notifies the SEC of that determination in writing";

const NYDFS_TEXT =
  "notify the Superintendent of Financial Services electronically as promptly as possible but in no event later than 72 hours after determining that a cybersecurity incident has occurred at the covered entity, its affiliates, or a third-party service provider, with a continuing obligation to update the Superintendent as material changes or new information become available. Where the incident involves an extortion payment, a separate notice is due within 24 hours (§ 500.17(c))";

const DORA_TEXT =
  "report major ICT-related incidents to the relevant competent authority in three stages: an initial notification as early as possible, in any case within 4 hours of classifying the incident as major and no later than 24 hours after becoming aware of it; an intermediate report within 72 hours once the incident's status changes materially; and a final report within one month once the root-cause analysis is complete and actual impact figures replace estimates";

/** Fires whenever either NYDFS or DORA fires — the assumption both proxy-gated duties share. */
export const SECTORAL_PROXY_ASSUMPTION_NOTE =
  "This assessment treats the organisation's recorded type — financial institution — together with the recorded jurisdiction, as sufficient to engage NYDFS's and/or DORA's incident-reporting duties where applicable; both regimes define \"covered entity\"/\"financial entity\" more narrowly than this intake's general category, so the organisation's actual regulatory status under each regime should be confirmed before these duties are relied on.";

export interface SectoralResult {
  readonly duties: readonly StateDutySet[];
  /** Non-empty only when at least one proxy-gated duty (NYDFS or DORA) fired. */
  readonly proxy_assumption_note: string;
}

/**
 * Builds the sectoral-overlay duty rows in the same StateDutySet shape the
 * fleet's existing US-state/HIPAA/PIPEDA clocks use, so every existing
 * state_notification_duties consumer renders them with zero additional
 * wiring. Every trigger below is evaluated independently — see the
 * STACKING note above.
 */
export function buildSectoralDuties(
  jurisdictions: readonly string[],
  organisationType: string,
): SectoralResult {
  const duties: StateDutySet[] = [];
  let proxyFired = false;

  if (jurisdictions.includes(SEC_JURISDICTION)) {
    duties.push({
      jurisdiction: SEC_JURISDICTION,
      state_label: "SEC Form 8-K (Item 1.05)",
      citation: "17 C.F.R. § 229.106; Form 8-K Item 1.05",
      individual_deadline: SEC_8K_TEXT,
      verified: true,
    });
  }

  if (jurisdictions.includes(NEW_YORK) && isFinancialInstitution(organisationType)) {
    duties.push({
      jurisdiction: "NYDFS",
      state_label: "NYDFS (23 NYCRR Part 500)",
      citation: "23 NYCRR § 500.17(a), (c)",
      individual_deadline: NYDFS_TEXT,
      verified: true,
    });
    proxyFired = true;
  }

  if (hasEeaJurisdiction(jurisdictions) && isFinancialInstitution(organisationType)) {
    duties.push({
      jurisdiction: "DORA",
      state_label: "DORA (Regulation (EU) 2022/2554)",
      citation: "DORA Art. 19; RTS (EU) 2025/301, Art. 5",
      individual_deadline: DORA_TEXT,
      verified: true,
    });
    proxyFired = true;
  }

  return {
    duties,
    proxy_assumption_note: proxyFired ? SECTORAL_PROXY_ASSUMPTION_NOTE : "",
  };
}
