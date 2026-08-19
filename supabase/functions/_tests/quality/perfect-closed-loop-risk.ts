// RK0.5 D1 — CPPA Risk Assessment closed-loop perfect fixture checker. HARNESS ONLY.
//
// Analog of checkPerfectDpiaIntake (perfect-closed-loop.ts) for the cppa-risk product.
//
// REJECT unless computeRecordComplete returns value:true on the deterministic
// engine output. The gate requires ALL FOUR conditions:
//   (a) contract_incomplete clear — every ASKED intake key answered, including
//       optional-but-presented fields (ITEM 380 r5 rule)
//   (b) coverage_orphans clear — risk_coverage matrix present, not crashed,
//       orphans = 0
//   (c) csc_false_absence clear — zero unrepaired r1/r2 CSC violations
//       (r3/r4 never gate)
//   (d) risk_record_needs_missing_data clear — computeRecordNeeds missing_data
//       count = 0 (reserved_decision kind never gates)
//
// NOT a rejection reason: the § 7152(a)(7) reserved initiation decision.
// On perfect data the engine classifies it as a reserved_decision action_item,
// which does not count toward missing_data. The gate therefore opens on perfect
// data while carrying action_item:1 — this is the DPIA "determination is not a
// rejection reason" analog (documented in doc 28 §4).
//
// Engine is invoked deterministic-Pass-1 / no refinementDeps / EMPTY_RISK_CORPUS:
// zero model calls, zero DB access, pure function of the intake.

import { generateCppaRiskReport } from "../../run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../run-cppa-risk-assessment-v2/_local/ltp/risk-corpus.ts";

export const PERFECT_CPPA_RISK_CLOSED_LOOP_VERSION =
  "perfect-cppa-risk-closed-loop@rk0.5-2026-08-17";

export const CHECKER_BUILD_STAMP = "checkPerfectCppaRiskIntake";

export interface PerfectCppaRiskDeficiency {
  readonly kind: string;
  readonly detail: string;
}

export interface PerfectCppaRiskCheckResult {
  readonly ok: boolean;
  readonly deficiencies: readonly PerfectCppaRiskDeficiency[];
}

const CONDITION_DETAIL: Record<string, string> = {
  contract_incomplete:
    "contract_incomplete: one or more asked intake keys are empty (optional-but-presented fields count; untriggered conditionals do not)",
  coverage_orphans:
    "coverage_orphans: risk_coverage matrix absent, crashed, or orphans > 0",
  csc_false_absence:
    "csc_false_absence: one or more unrepaired r1/r2 CSC violations present (false-absence claim against the record)",
  risk_record_needs_missing_data:
    "risk_record_needs_missing_data: one or more record_needs of kind 'missing_data' — the record does not supply a required input",
  gate_error:
    "gate_error: computeRecordComplete threw inside the engine — check engine logs",
};

/**
 * Run the PRODUCT engine (deterministic Pass-1, no model calls, no DB) over
 * the candidate intake and report every gate failure.
 *
 * Pure-ish: no I/O, no model calls.  The engine is async because it may await
 * corpus fetches, but with no `db` and `EMPTY_RISK_CORPUS` injected those
 * branches are skipped.
 */
export async function checkPerfectCppaRiskIntake(
  intake: unknown,
): Promise<PerfectCppaRiskCheckResult> {
  let result: Awaited<ReturnType<typeof generateCppaRiskReport>>;
  try {
    result = await generateCppaRiskReport(intake, {
      pass1: "deterministic",
      riskCorpus: EMPTY_RISK_CORPUS,
      buildStamp: CHECKER_BUILD_STAMP,
      mode: "enforce",
      // No refinementDeps → engine records "missing_refinement_dependencies"
      // telemetry and skips the refinement pass entirely (no model spend).
      // No db → corpus fetches are skipped.
    });
  } catch (e) {
    return {
      ok: false,
      deficiencies: [
        {
          kind: "build",
          detail: `engine threw: ${(e as Error)?.message ?? String(e)}`,
        },
      ],
    };
  }

  const internal = (
    (result.report._meta as Record<string, unknown> | undefined)
      ?.internal
  ) as Record<string, unknown> | undefined;

  const rc = internal?.record_complete as
    | {
        value?: boolean;
        failed_conditions?: string[];
        empty_required_keys?: string[];
        counts?: Record<string, number>;
      }
    | undefined;

  if (!rc) {
    return {
      ok: false,
      deficiencies: [
        {
          kind: "build",
          detail: "record_complete telemetry absent from engine output",
        },
      ],
    };
  }

  if (rc.value === true) {
    return { ok: true, deficiencies: [] };
  }

  const deficiencies: PerfectCppaRiskDeficiency[] = (
    rc.failed_conditions ?? []
  ).map((fc) => {
    // Enrich contract_incomplete with the specific empty keys so the caller
    // knows exactly which fields to fill.
    if (fc === "contract_incomplete" && (rc.empty_required_keys?.length ?? 0) > 0) {
      return {
        kind: fc,
        detail: `contract_incomplete: empty asked keys (${rc.empty_required_keys!.length}): ${
          rc.empty_required_keys!.join(", ")
        }`,
      };
    }
    // Enrich missing-data with the count for actionability.
    if (fc === "risk_record_needs_missing_data") {
      const n = rc.counts?.record_needs_missing_data;
      return {
        kind: fc,
        detail: n != null
          ? `risk_record_needs_missing_data: ${n} record_need(s) of kind 'missing_data'`
          : CONDITION_DETAIL[fc],
      };
    }
    return {
      kind: fc,
      detail: CONDITION_DETAIL[fc] ?? fc,
    };
  });

  return { ok: deficiencies.length === 0, deficiencies };
}

/** One-line reasons, deduped, for test output and retry guidance. */
export function deficiencyLines(
  d: readonly PerfectCppaRiskDeficiency[],
): string[] {
  return [...new Set(d.map((x) => `${x.kind}: ${x.detail}`))];
}
