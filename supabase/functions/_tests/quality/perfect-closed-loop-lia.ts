// LIA L0.5 D1 — LI Assessment closed-loop perfect fixture checker. HARNESS ONLY.
//
// Analog of checkPerfectDpiaIntake (perfect-closed-loop.ts) for the lia
// product. Runs the TWO real, unmodified, shipped typed builders —
// buildLiaDeliverables (ITEM 311: reasonable_expectations, child_factor,
// public_authority_exclusion, lia_determination, automated_decision_analysis)
// and buildLiaUpgrade4 (UPGRADE-4: interest_legitimacy, benefit_and_beneficiary,
// alternatives_considered, relationship_with_individual,
// scale_frequency_duration, potential_harms, opt_out_feasibility,
// attestation_block) — over a candidate intake and rejects it unless every
// insufficiency signal is clear.
//
// REJECT unless: no finding on either builder's output carries
// status === "record_insufficient" — EXCEPT automated_decision_analysis,
// which is carved out below.
//
// THE AUTOMATED_DECISION_ANALYSIS CARVE-OUT (found during L0.5 D2 enumeration,
// 2026-08-25): build.ts's buildAutomatedDecisionAnalysis has a MANDATORY
// DEGRADATION built into it by design — the LIA intake contract carries no
// field for "is a solely automated significant decision taken about these
// data subjects," so whenever the recorded jurisdictions engage the EU or UK
// Art. 22-family regime, status is ALWAYS "record_insufficient", regardless
// of how complete every other field is. This is not a fixture defect; it is
// the honest, correct, by-design output for any EU/UK LIA record. A "perfect"
// LIA fixture therefore cannot mean "zero record_insufficient across all five
// ITEM-311/UPGRADE-4 findings" for a realistic EU/UK record — it means zero
// record_insufficient everywhere EXCEPT this one field, which the checker
// verifies is the CORRECT, EXPECTED "not_engaged"-free degradation (regime
// is "eu", "uk", or "dual"), not an accidental one.
//
// NOT a rejection reason: the substantive OUTCOME (legitimate_interests_
// available / available_only_with_mitigations / legitimate_interests_not_
// available are all legitimate results on a complete record — mirrors the
// DPIA "determination is not a rejection reason" convention exactly).

import { buildLiaDeliverables } from "../../run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { buildLiaUpgrade4 } from "../../run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

export const PERFECT_LIA_CLOSED_LOOP_VERSION = "perfect-lia-closed-loop@l0.5-2026-08-25";

export const CHECKER_BUILD_STAMP = "checkPerfectLiaIntake";

export interface PerfectLiaDeficiency {
  /** "insufficient" | "build" */
  readonly kind: string;
  readonly detail: string;
}

export interface PerfectLiaCheckResult {
  readonly ok: boolean;
  readonly deficiencies: readonly PerfectLiaDeficiency[];
  /**
   * Diagnostic only, never a rejection reason: the regime
   * automated_decision_analysis resolved to on this intake, and whether its
   * (expected, by-design) record_insufficient status was the mandatory
   * EU/UK degradation rather than an accidental one (e.g. no jurisdictions
   * recorded at all, which IS a real gap).
   */
  readonly admRegime?: string;
}

/**
 * Run the TWO PRODUCT builders over the candidate intake and report every
 * insufficiency signal, with the automated_decision_analysis carve-out
 * applied. Pure; no I/O, no model calls.
 */
export function checkPerfectLiaIntake(intake: unknown): PerfectLiaCheckResult {
  const deficiencies: PerfectLiaDeficiency[] = [];

  let core: ReturnType<typeof buildLiaDeliverables>;
  let upgrade4: ReturnType<typeof buildLiaUpgrade4>;
  try {
    core = buildLiaDeliverables(intake);
  } catch (e) {
    return {
      ok: false,
      deficiencies: [{ kind: "build", detail: `buildLiaDeliverables threw: ${(e as Error)?.message ?? String(e)}` }],
    };
  }
  try {
    upgrade4 = buildLiaUpgrade4(intake);
  } catch (e) {
    return {
      ok: false,
      deficiencies: [{ kind: "build", detail: `buildLiaUpgrade4 threw: ${(e as Error)?.message ?? String(e)}` }],
    };
  }

  // ITEM 311 core deliverables — automated_decision_analysis carved out.
  const coreSurfaces: Array<[string, { status?: string; information_needed?: string }]> = [
    ["reasonable_expectations", core.reasonable_expectations],
    ["child_factor", core.child_factor],
    ["public_authority_exclusion", core.public_authority_exclusion],
    ["lia_determination", core.lia_determination],
  ];
  for (const [name, f] of coreSurfaces) {
    if (f?.status === "record_insufficient") {
      deficiencies.push({
        kind: "insufficient",
        detail: `${name}: record_insufficient${f.information_needed ? ` — needs ${f.information_needed}` : ""}`,
      });
    }
  }

  // automated_decision_analysis: record_insufficient is EXPECTED whenever the
  // EU/UK regime is engaged (mandatory degradation, no fixture can close it).
  // It is a REAL deficiency only when the regime is "not_engaged" AND status
  // is still record_insufficient (that path means no jurisdictions at all
  // were recorded — a genuine gap, not the mandatory one).
  const adm = core.automated_decision_analysis;
  if (adm?.status === "record_insufficient" && adm.regime === "not_engaged") {
    deficiencies.push({
      kind: "insufficient",
      detail: `automated_decision_analysis: record_insufficient with regime "not_engaged" — no jurisdictions recorded${
        adm.information_needed ? ` — needs ${adm.information_needed}` : ""
      }`,
    });
  }

  // UPGRADE-4 deliverables — no carve-outs; every one of these eight can
  // reach "analysed" on a fully-supplied intake.
  const upgrade4Surfaces: Array<[string, { status?: string; information_needed?: string }]> = [
    ["interest_legitimacy", upgrade4.interest_legitimacy],
    ["benefit_and_beneficiary", upgrade4.benefit_and_beneficiary],
    ["alternatives_considered", upgrade4.alternatives_considered],
    ["relationship_with_individual", upgrade4.relationship_with_individual],
    ["scale_frequency_duration", upgrade4.scale_frequency_duration],
    ["potential_harms", upgrade4.potential_harms],
    ["opt_out_feasibility", upgrade4.opt_out_feasibility],
    ["attestation_block", upgrade4.attestation_block],
  ];
  for (const [name, f] of upgrade4Surfaces) {
    if (f?.status === "record_insufficient") {
      deficiencies.push({
        kind: "insufficient",
        detail: `${name}: record_insufficient${f.information_needed ? ` — needs ${f.information_needed}` : ""}`,
      });
    }
  }
  // scale_frequency_duration also carries a per-dimension status; a partial
  // recording (1-2 of 3 dimensions) trips the surface-level status above
  // already, so no separate per-dimension check is needed here.

  return { ok: deficiencies.length === 0, deficiencies, admRegime: adm?.regime };
}

/** One-line reasons, deduped, for test output and retry guidance. */
export function deficiencyLines(d: readonly PerfectLiaDeficiency[]): string[] {
  return [...new Set(d.map((x) => `${x.kind}: ${x.detail}`))];
}
