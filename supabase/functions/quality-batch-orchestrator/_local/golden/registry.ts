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
// FIXTURE-LABEL LAW — the same byte-equality lookup as matchFixtureSet,
// returning the case id alongside the set so the orchestrator can persist
// BOTH onto the seed row. run-quality-batch and grade-single-assessment read
// those persisted labels instead of importing this registry.
export function matchFixtureCase(tool: string, intake: unknown): { set: string; id: string } | null {
  const cases = GOLDEN_BY_TOOL[tool] ?? [];
  if (!cases.length || intake == null) return null;
  let needle = "";
  try { needle = JSON.stringify(intake); } catch { return null; }
  for (const c of cases) {
    let hay = "";
    try { hay = JSON.stringify(c.intake); } catch { continue; }
    if (hay === needle) return { set: c.set, id: c.id };
  }
  return null;
}

export function matchFixtureSet(tool: string, intake: unknown): string | null {
  return matchFixtureCase(tool, intake)?.set ?? null;
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

import type { FixtureVariant } from "../../../_shared/quality/fixture-variant.ts";
import { MESSY_BY_TOOL } from "./messy-registry.ts";
import { DPIA_PERFECT } from "./dpia.ts";
import { CPPA_RISK_PERFECT } from "./cppa-risk.ts";
// ITEM 383 leg 1 — LIA perfect fixture (×1).
import { LIA_PERFECT } from "./lia-perfect.ts";
// ITEM 393 leg B — ADMT perfect fixture (×1), plus 4 pathway-coverage
// additions (2026-08-21, CEO-requested) spliced in from CPPA_ADMT_GOLDEN.
import { ADMT_PERFECT } from "./cppa-admt.ts";
// ITEM 401 leg B — governance perfect fixture (×1).
import { GOVERNANCE_PERFECT } from "./governance-perfect.ts";
// ITEM 405 leg B — CPPA cybersecurity perfect fixture (×1).
import { CYBER_PERFECT } from "./cppa-cyber.ts";
// ITEM 410 leg B — biometric perfect fixture (×1). NOTE THE SLUG: the golden
// registry, the messy registry, RUN_QUALITY_BATCH_SLUGS and
// dispatchGeneration all key this product as "biometric-checker" (the
// contract's own `tool_type` is the distinct value "biometric_checker", used
// only for entitlements/metering).
import { BIOMETRIC_PERFECT } from "./biometric-perfect.ts";
// ITEM 415 leg B — IR playbook perfect fixture (×1). The slug is
// "ir-playbook" everywhere: golden registry, RUN_QUALITY_BATCH_SLUGS,
// dispatchGeneration and the item414 spine product name all agree, so unlike
// biometric there is no slug/product split on this product.
import { IR_PERFECT } from "./ir-perfect.ts";
// PROMPT 9G leg 1 — the two CEO-pinned, verification-proven dpia perfect
// fixtures. Additive: DPIA_PERFECT (the 8-series authored pair) is untouched
// and stays first, so existing positions 0..1 are stable.
import { DPIA_PERFECT_PINNED } from "./dpia-perfect-pinned.ts";

/** The full dpia perfect-variant pinned set: authored pair + 9G pinned pair. */
export const DPIA_PERFECT_SET: GoldenCase[] = [...DPIA_PERFECT, ...DPIA_PERFECT_PINNED];

/** Truly-complete-record fixtures, per tool. Empty/absent ⇒ legacy fallback. */
export const PERFECT_BY_TOOL: Record<string, GoldenCase[]> = {
  "dpia": DPIA_PERFECT_SET,
  "cppa-risk": CPPA_RISK_PERFECT,
  "lia": LIA_PERFECT,
  "cppa-admt": ADMT_PERFECT,
  "governance": GOVERNANCE_PERFECT,
  "cppa-cyber": CYBER_PERFECT,
  "biometric-checker": BIOMETRIC_PERFECT,
  "ir-playbook": IR_PERFECT,
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
