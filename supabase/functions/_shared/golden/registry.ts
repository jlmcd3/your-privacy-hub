// QB-P20 — Golden registry. Maps tool key → GoldenCase[]. Consumed by the
// orchestrator seed path (buildSeedRow → intakes) and by the pinned_rerun
// admin action.
//
// Coverage: every tool referenced by CONTRACT_BY_TOOL plus non-contract
// tools that ship goldens (registration). Contract-only tools whose
// existing goldens don't conform to the current contract (biometric) use
// the *extra* fixture until the legacy set is re-ratified.

import type { GoldenCase } from "./types.ts";
import { DPIA_GOLDEN } from "./dpia.ts";
import { CPPA_CYBER_GOLDEN } from "./cppa-cyber.ts";
import { DPA_GOLDEN } from "./dpa.ts";
import { IR_PLAYBOOK_GOLDEN } from "./ir-playbook.ts";
import { REGISTRATION_GOLDEN } from "./registration.ts";
import { CPPA_ADMT_GOLDEN } from "./cppa-admt.ts";
import { GOVERNANCE_GOLDEN } from "./governance.ts";
import { LIA_GOLDEN } from "./lia.ts";
import { CPPA_RISK_GOLDEN } from "./cppa-risk.ts";
import { BIOMETRIC_GOLDEN_EXTRA } from "./biometric-extra.ts";

export const GOLDEN_BY_TOOL: Record<string, GoldenCase[]> = {
  "dpia":              DPIA_GOLDEN,
  "cppa-cyber":        CPPA_CYBER_GOLDEN,
  "dpa-generator":     DPA_GOLDEN,
  "ir-playbook":       IR_PLAYBOOK_GOLDEN,
  "registration":      REGISTRATION_GOLDEN,
  "cppa-admt":         CPPA_ADMT_GOLDEN,
  "governance":        GOVERNANCE_GOLDEN,
  "lia":               LIA_GOLDEN,
  "cppa-risk":         CPPA_RISK_GOLDEN,
  "biometric-checker": BIOMETRIC_GOLDEN_EXTRA,
};

/** Return golden intake payloads for pinning (positions 0..N-1). */
export function goldenIntakes(tool: string): unknown[] {
  return (GOLDEN_BY_TOOL[tool] ?? []).map(c => c.intake);
}

/**
 * R-TURN-1 item 6 — resolve the golden fixture set (tuning/holdout/adversarial)
 * for a given tool + intake by deep-equal comparison against the tool's
 * GoldenCase[] intakes. Returns null when the intake is not a pinned golden
 * (generated intakes never carry a fixture-set label). Used by
 * run-quality-batch and grade-single-assessment to thread the label into
 * the grader payload header.
 */
export function matchFixtureSet(tool: string, intake: unknown): string | null {
  const cases = GOLDEN_BY_TOOL[tool] ?? [];
  if (!cases.length || intake == null) return null;
  let needle = "";
  try { needle = JSON.stringify(intake); } catch { return null; }
  for (const c of cases) {
    let hay = "";
    try { hay = JSON.stringify(c.intake); } catch { continue; }
    if (hay === needle) return c.set;
  }
  return null;
}

// ─── ITEM 325 — variant-aware pin resolution ────────────────────────────────
// `/admin/final-test` selects a fixture VARIANT per tool.
//
// "perfect" now means TRULY-COMPLETE-RECORD cases where a tool has authored
// them: PERFECT_BY_TOOL holds intakes that fill every contract key a real
// organisation could supply, so an A/B batch labelled "perfect" grades
// perfect-record WRITING rather than degraded-record behaviour. Where a tool
// has no perfect set authored, "perfect" falls back to GOLDEN_BY_TOOL — the
// exact legacy behaviour, unchanged.
//
// "messy" resolves to the (as yet unpopulated) MESSY_BY_TOOL set and returns
// an empty array when no messy fixture has been authored — callers MUST treat
// empty as a loud failure, never as "fall back to perfect".
//
// variant === null remains the legacy, unlabelled path: GOLDEN_BY_TOOL.

import type { FixtureVariant } from "../quality/fixture-variant.ts";
import { MESSY_BY_TOOL } from "./messy-registry.ts";
import { DPIA_PERFECT } from "./dpia.ts";

/** Truly-complete-record fixtures, per tool. Empty/absent ⇒ legacy fallback. */
export const PERFECT_BY_TOOL: Record<string, GoldenCase[]> = {
  "dpia": DPIA_PERFECT,
};

export function casesForVariant(tool: string, variant: FixtureVariant | null): GoldenCase[] {
  if (variant === "messy") return MESSY_BY_TOOL[tool] ?? [];
  if (variant === "perfect") {
    const perfect = PERFECT_BY_TOOL[tool];
    if (perfect && perfect.length) return perfect;
  }
  return GOLDEN_BY_TOOL[tool] ?? [];
}


/** Variant-aware sibling of goldenIntakes(). variant=null ⇒ legacy behaviour. */
export function intakesForVariant(tool: string, variant: FixtureVariant | null): unknown[] {
  return casesForVariant(tool, variant).map((c) => c.intake);
}
