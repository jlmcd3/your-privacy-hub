/**
 * LTP Harvest Subordination Guard — T-M3 (Item 223).
 *
 * CEO subordination ruling (verbatim, Item 218 §(b)(4)):
 *   "Engine B should always control. However, where there are any
 *    useful artifacts of Engine A, we should use them SO LONG AS
 *    THEY CANNOT OVERRIDE OR DIMINISH ENGINE B."
 *
 * Engine-A HARVEST artifacts bind to two cppa-risk sections
 * (see section-shards/cppa-risk.ts):
 *
 *   • opening_summary     ← _shared/openings/risk-opening.ts (T7, S0–S6)
 *   • submission_summary  ← _shared/ltp/cyber-audit-schedule.ts + § 7120
 *
 * This module is the SINGLE decision site that accepts or rejects a
 * harvest artifact against the authoritative RenderPlan. On rejection
 * the caller (T-M6 wire-in) omits the harvest artifact and falls
 * through to the reserved-judgment write-around body — NEVER silent
 * suppression. Every decision emits telemetry.
 *
 * Pure module: no I/O, no throws — returns `{accepted, telemetry}`.
 */

import type { RenderPlan } from "../render-plan/schema.ts";
import type { RiskOpeningOutput } from "../openings/risk-opening.ts";
import { LEAK_LEXICON, TRUNCATED_SLOT_VALUE_SET } from "./value-screen.ts";
import { SCHEDULE_MARKER, SCHEDULE_LITERALS } from "./cyber-audit-schedule.ts";

export const HARVEST_GUARD_VERSION = "harvest-guard@2026-07-28-tm3";

export type HarvestKey = "opening_summary" | "submission_summary";

export type RejectionReason =
  | "harvest_missing_or_empty"
  | "harvest_value_screen_hit"
  | "harvest_intake_ref_not_in_plan_ledger"
  | "harvest_criterion_conflicts_plan_propositions"
  | "harvest_missing_schedule_marker"
  | "harvest_states_customer_specific_cohort"
  | "harvest_schedule_literal_tampered"
  | "harvest_kind_unrecognized";

export interface HarvestTelemetry {
  readonly guard_version: string;
  readonly harvest_key: HarvestKey;
  readonly artifact_present: boolean;
  readonly artifact_len: number;
  readonly rejection_reason: RejectionReason | null;
  readonly evidence: readonly string[];
}

export interface HarvestDecision {
  readonly accepted: boolean;
  readonly telemetry: HarvestTelemetry;
}

/** Compact repr of an opening_summary harvest artifact for the guard. */
export interface OpeningHarvestArtifact {
  readonly text: string;
  readonly provenance?: RiskOpeningOutput["provenance"];
  readonly slots?: RiskOpeningOutput["slots"];
}

/** Compact repr of a submission_summary harvest artifact for the guard. */
export interface SubmissionHarvestArtifact {
  readonly text: string;
  readonly stamp?: string;
}

// ---------------------------------------------------------------------
// Shared checks
// ---------------------------------------------------------------------

/** Return the leak-lexicon / truncated-slot needles present in `text`. */
function screenText(text: string): string[] {
  const evidence: string[] = [];
  const trimmed = text.trim();
  if (TRUNCATED_SLOT_VALUE_SET.has(trimmed)) {
    evidence.push(`truncated-slot-value:${trimmed}`);
  }
  const lower = text.toLowerCase();
  for (const needle of LEAK_LEXICON) {
    if (lower.includes(needle.toLowerCase())) {
      evidence.push(`leak-lexicon:${needle}`);
    }
  }
  return evidence;
}

// ---------------------------------------------------------------------
// opening_summary guard
// ---------------------------------------------------------------------

/**
 * Cross-check the T7 artifact's S0 criteria against plan Type-R
 * propositions for § 1798.140(d)(1). If the artifact ASSERTS a
 * criterion (A or B) as engaged but the plan's Type-R proposition for
 * that criterion has polarity="not_applicable" (or "negative" for a
 * covered-business prong), reject — the harvest may not override the
 * plan's applicability conclusion.
 */
function conflictsWithApplicabilityPlan(
  artifact: OpeningHarvestArtifact,
  plan: RenderPlan,
): string[] {
  const evidence: string[] = [];
  const s0 = artifact.provenance?.s0_criteria ?? [];
  if (s0.length === 0) return evidence;

  const R = plan.propositions.filter((p) => p.epistemic_type === "R");
  for (const crit of s0) {
    // pinpoint match — Type-R propositions for (d)(1)(A) / (d)(1)(B)
    // carry anchors that include "(d)(1)(A)" or "(d)(1)(B)".
    const needle = `(d)(1)(${crit})`;
    const matched = R.filter((p) =>
      typeof p.anchor === "object" &&
      typeof (p.anchor as { pinpoint?: string }).pinpoint === "string" &&
      (p.anchor as { pinpoint: string }).pinpoint.includes(needle)
    );
    if (matched.length === 0) continue;
    const negating = matched.find(
      (p) => p.polarity === "not_applicable" || p.polarity === "negative",
    );
    if (negating) {
      evidence.push(
        `conflict:s0_criterion_${crit}_asserted_but_plan_polarity_${negating.polarity}`,
      );
    }
  }
  return evidence;
}

/**
 * Every intake token the T7 artifact draws on MUST resolve to an
 * `intake_field` in plan.intake_ledger. Prevents the harvest from
 * introducing an intake value the plan did not observe.
 */
function intakeRefsGroundedInPlan(
  artifact: OpeningHarvestArtifact,
  plan: RenderPlan,
): string[] {
  const evidence: string[] = [];
  const sources = artifact.provenance?.sources ?? {};
  const ledgerFields = new Set(plan.intake_ledger.map((e) => e.intake_field));
  for (const [slot, src] of Object.entries(sources)) {
    if (!src || typeof src !== "string") continue;
    if (src.startsWith("registry:")) continue; // registry pin, not intake
    // sources use intake field names as of risk-opening provenance
    if (!ledgerFields.has(src)) {
      evidence.push(`ungrounded_intake_ref:${slot}=${src}`);
    }
  }
  return evidence;
}

export function evaluateOpeningHarvest(
  artifact: OpeningHarvestArtifact | null | undefined,
  plan: RenderPlan,
): HarvestDecision {
  const base = {
    guard_version: HARVEST_GUARD_VERSION,
    harvest_key: "opening_summary" as const,
  };

  if (!artifact || typeof artifact.text !== "string" || artifact.text.trim().length === 0) {
    return {
      accepted: false,
      telemetry: {
        ...base,
        artifact_present: false,
        artifact_len: 0,
        rejection_reason: "harvest_missing_or_empty",
        evidence: [],
      },
    };
  }

  const lexHits = screenText(artifact.text);
  if (lexHits.length > 0) {
    return {
      accepted: false,
      telemetry: {
        ...base,
        artifact_present: true,
        artifact_len: artifact.text.length,
        rejection_reason: "harvest_value_screen_hit",
        evidence: lexHits,
      },
    };
  }

  const ungrounded = intakeRefsGroundedInPlan(artifact, plan);
  if (ungrounded.length > 0) {
    return {
      accepted: false,
      telemetry: {
        ...base,
        artifact_present: true,
        artifact_len: artifact.text.length,
        rejection_reason: "harvest_intake_ref_not_in_plan_ledger",
        evidence: ungrounded,
      },
    };
  }

  const conflicts = conflictsWithApplicabilityPlan(artifact, plan);
  if (conflicts.length > 0) {
    return {
      accepted: false,
      telemetry: {
        ...base,
        artifact_present: true,
        artifact_len: artifact.text.length,
        rejection_reason: "harvest_criterion_conflicts_plan_propositions",
        evidence: conflicts,
      },
    };
  }

  return {
    accepted: true,
    telemetry: {
      ...base,
      artifact_present: true,
      artifact_len: artifact.text.length,
      rejection_reason: null,
      evidence: [],
    },
  };
}

// ---------------------------------------------------------------------
// submission_summary guard (§ 7121(a) phase-in schedule + § 7120)
// ---------------------------------------------------------------------

/**
 * Item-204 design law: the schedule surface STATES THE LAW and MUST
 * NOT compute a customer-specific tier. Reject if the artifact
 * contains a customer-cohort attribution pattern.
 */
const CUSTOMER_COHORT_PATTERNS: readonly RegExp[] = [
  /\byour (?:cohort|tier|deadline|audit period)\b/i,
  /\bthe (?:company|business)['’]s (?:cohort|tier)\b/i,
  /\byou (?:fall in|are in|belong to) tier\b/i,
] as const;

export function evaluateSubmissionHarvest(
  artifact: SubmissionHarvestArtifact | null | undefined,
  _plan: RenderPlan,
): HarvestDecision {
  const base = {
    guard_version: HARVEST_GUARD_VERSION,
    harvest_key: "submission_summary" as const,
  };

  if (!artifact || typeof artifact.text !== "string" || artifact.text.trim().length === 0) {
    return {
      accepted: false,
      telemetry: {
        ...base,
        artifact_present: false,
        artifact_len: 0,
        rejection_reason: "harvest_missing_or_empty",
        evidence: [],
      },
    };
  }

  const lexHits = screenText(artifact.text);
  if (lexHits.length > 0) {
    return {
      accepted: false,
      telemetry: {
        ...base,
        artifact_present: true,
        artifact_len: artifact.text.length,
        rejection_reason: "harvest_value_screen_hit",
        evidence: lexHits,
      },
    };
  }

  if (!artifact.text.includes(SCHEDULE_MARKER)) {
    return {
      accepted: false,
      telemetry: {
        ...base,
        artifact_present: true,
        artifact_len: artifact.text.length,
        rejection_reason: "harvest_missing_schedule_marker",
        evidence: [`missing:${SCHEDULE_MARKER}`],
      },
    };
  }

  // Every tier's corpus-pinned deadline must be present verbatim (tampering guard).
  const tamperEvidence: string[] = [];
  for (const tierName of ["tier1", "tier2", "tier3"] as const) {
    const deadline = SCHEDULE_LITERALS[tierName].deadline;
    if (!artifact.text.includes(deadline)) {
      tamperEvidence.push(`missing_deadline:${tierName}=${deadline}`);
    }
  }
  if (tamperEvidence.length > 0) {
    return {
      accepted: false,
      telemetry: {
        ...base,
        artifact_present: true,
        artifact_len: artifact.text.length,
        rejection_reason: "harvest_schedule_literal_tampered",
        evidence: tamperEvidence,
      },
    };
  }

  for (const re of CUSTOMER_COHORT_PATTERNS) {
    const m = artifact.text.match(re);
    if (m) {
      return {
        accepted: false,
        telemetry: {
          ...base,
          artifact_present: true,
          artifact_len: artifact.text.length,
          rejection_reason: "harvest_states_customer_specific_cohort",
          evidence: [`pattern_hit:${m[0]}`],
        },
      };
    }
  }

  return {
    accepted: true,
    telemetry: {
      ...base,
      artifact_present: true,
      artifact_len: artifact.text.length,
      rejection_reason: null,
      evidence: [],
    },
  };
}

// ---------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------

export function evaluateHarvest(
  key: HarvestKey,
  artifact: OpeningHarvestArtifact | SubmissionHarvestArtifact | null | undefined,
  plan: RenderPlan,
): HarvestDecision {
  if (key === "opening_summary") {
    return evaluateOpeningHarvest(artifact as OpeningHarvestArtifact | null, plan);
  }
  if (key === "submission_summary") {
    return evaluateSubmissionHarvest(artifact as SubmissionHarvestArtifact | null, plan);
  }
  return {
    accepted: false,
    telemetry: {
      guard_version: HARVEST_GUARD_VERSION,
      harvest_key: key,
      artifact_present: !!artifact,
      artifact_len: 0,
      rejection_reason: "harvest_kind_unrecognized",
      evidence: [String(key)],
    },
  };
}
