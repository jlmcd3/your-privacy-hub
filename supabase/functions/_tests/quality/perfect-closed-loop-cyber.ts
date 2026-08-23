// Cyber conversion C0.5 D1 — CPPA Cybersecurity closed-loop perfect fixture
// checker. HARNESS ONLY.
//
// Analog of checkPerfectDpiaIntake (_shared/quality/perfect-closed-loop.ts).
// UNLIKE the cppa-risk analog (perfect-closed-loop-risk.ts), this checker
// does NOT invoke the product's edge-function engine — `run-cppa-cybersecurity`
// has no deterministic-Pass-1 mode yet (that is the conversion's C1 landing,
// doc 24a §7.3). Instead it calls `buildCyberDeliverables` DIRECTLY, the same
// way checkPerfectDpiaIntake calls `buildDpiaDeliverables` directly: the ITEM
// 315 deliverables builder is ALREADY a pure, deterministic, intake-only
// function (`buildCyberDeliverables(intake, aggregates?)` — `aggregates` is
// optional and feeds ONLY the secondary, no-statutory-basis
// `mean_score_readability_aid`; every substantive surface —
// `component_coverage`, `evidence_sufficiency`, `program_obligation_findings`,
// `independence_determination`, and the `readiness_determination` conclusion
// itself — is derived from `readCyberFacts(intake)` alone, zero model
// dependency). This is exactly the "closest existing precedent for
// deterministic table+template composition" the C0.5 groundwork research
// identified; this checker exercises it directly rather than waiting for C1.
//
// REJECT unless ALL of:
//   (a) no `component_coverage[]` row carries status "record_insufficient";
//   (b) no `evidence_sufficiency[]` row carries status "record_insufficient";
//   (c) no `program_obligation_findings[]` row carries status
//       "record_insufficient";
//   (d) `independence_determination.status !== "record_insufficient"`;
//   (e) `readiness_determination.status !== "record_insufficient"` AND
//       `readiness_determination.conclusion !== "record_insufficient"`;
//   (f) the builder's own SEPARATION GUARD (`assertSeparation`) does not
//       throw — the mean is never restated in the conclusion prose, and a
//       "ready" conclusion never carries blocking/unassessable components.
//
// NOT a rejection reason: the DETERMINATION itself. `readiness_determination
// .conclusion` of "not_ready" or "ready_subject_to_named_remediation" is a
// legitimate, fully-reasoned conclusion on a COMPLETE record (every question
// answered, every component assessable) — the DPIA/Risk "determination is not
// a rejection reason" analog. Only `status === "record_insufficient"` (the
// record itself was too thin to reason from) is a data defect.

import {
  buildCyberDeliverables,
  assertSeparation,
} from "../../run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import type { CyberDeliverables } from "../../run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/types.ts";

export const PERFECT_CPPA_CYBER_CLOSED_LOOP_VERSION =
  "perfect-cppa-cyber-closed-loop@c0.5-2026-08-23";

export const CHECKER_BUILD_STAMP = "checkPerfectCppaCyberIntake";

export interface PerfectCppaCyberDeficiency {
  readonly kind: string;
  readonly detail: string;
}

export interface PerfectCppaCyberCheckResult {
  readonly ok: boolean;
  readonly deficiencies: readonly PerfectCppaCyberDeficiency[];
}

/**
 * Run the PRODUCT builder (ITEM 315, `buildCyberDeliverables`) over the
 * candidate intake and report every insufficiency signal.
 *
 * Pure: no I/O, no model calls, no DB, no clock.
 */
export function checkPerfectCppaCyberIntake(
  intake: unknown,
): PerfectCppaCyberCheckResult {
  let built: CyberDeliverables;
  try {
    built = buildCyberDeliverables(intake);
  } catch (e) {
    return {
      ok: false,
      deficiencies: [
        { kind: "build", detail: `deliverables builder threw: ${(e as Error)?.message ?? String(e)}` },
      ],
    };
  }

  const deficiencies: PerfectCppaCyberDeficiency[] = [];

  // (a)+(b)+(c) — no finding across the three array surfaces is
  // record_insufficient.
  const surfaces: Array<
    [string, ReadonlyArray<{ status?: string; slug?: string; key?: string; information_needed?: string }>]
  > = [
    ["component_coverage", built.component_coverage],
    ["evidence_sufficiency", built.evidence_sufficiency],
    ["program_obligation_findings", built.program_obligation_findings],
  ];
  for (const [name, rows] of surfaces) {
    for (const r of rows) {
      if (r?.status === "record_insufficient") {
        const id = r.slug ?? r.key ?? "?";
        deficiencies.push({
          kind: "insufficient",
          detail: `${name}: ${id} — record_insufficient${
            r.information_needed ? ` — needs ${r.information_needed}` : ""
          }`,
        });
      }
    }
  }

  // (d) independence determination.
  if (built.independence_determination.status === "record_insufficient") {
    deficiencies.push({
      kind: "insufficient",
      detail: "independence_determination: record_insufficient",
    });
  }

  // (e) readiness determination — status AND conclusion both gate on
  // record_insufficient; a "not_ready"/"ready_subject_to_named_remediation"
  // CONCLUSION is never itself a deficiency.
  if (built.readiness_determination.status === "record_insufficient") {
    deficiencies.push({
      kind: "insufficient",
      detail: "readiness_determination: status record_insufficient",
    });
  }
  if (built.readiness_determination.conclusion === "record_insufficient") {
    deficiencies.push({
      kind: "insufficient",
      detail: "readiness_determination: conclusion record_insufficient",
    });
  }

  // (f) the builder's own separation guard.
  try {
    assertSeparation(built);
  } catch (e) {
    deficiencies.push({
      kind: "separation",
      detail: (e as Error)?.message ?? String(e),
    });
  }

  return { ok: deficiencies.length === 0, deficiencies };
}

/** One-line reasons, deduped, for test output and retry guidance. */
export function deficiencyLines(
  d: readonly PerfectCppaCyberDeficiency[],
): string[] {
  return [...new Set(d.map((x) => `${x.kind}: ${x.detail}`))];
}
