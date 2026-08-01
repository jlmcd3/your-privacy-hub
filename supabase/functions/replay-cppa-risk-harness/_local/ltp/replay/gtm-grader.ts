/**
 * ITEM 265 — GO-TO-MARKET GRADER (option 1, team-unanimous).
 *
 * Pure, deterministic classifier over EXISTING harness telemetry. It does
 * NOT modify the frozen C/G quality instruments or the deterministic
 * checks — it CONTEXTUALIZES their scores with a releasability verdict.
 *
 * FAIL-CLOSED: any defect class absent from the materiality register is
 * `unclassified` and forces "block" (never-guess rule applied to release
 * policy).
 *
 * ACTIVE IN OBSERVE/TELEMETRY ONLY until the register is CEO-ratified.
 */
import type { PerDocResult } from "../../../../_shared/ltp/replay/types.ts";
import {
  GTM_MATERIALITY_REGISTER_VERSION,
  lookupMateriality,
} from "./gtm-materiality-register.ts";

export type GtmVerdict = "release" | "release_with_logged_defects" | "block";

export interface GtmResult {
  readonly verdict: GtmVerdict;
  readonly material_defects: readonly string[];
  readonly logged_defects: readonly string[];
  readonly register_version: string;
  readonly unclassified: readonly string[];
}

export interface GtmOptions {
  /** Extra defect classes from sources outside PerDocResult (e.g. deterministic checks). */
  readonly extra_defects?: readonly string[];
}

export function evaluateGtm(
  perDoc: PerDocResult,
  opts?: GtmOptions,
): GtmResult {
  const defects: string[] = [...(perDoc?.hard_failures ?? [])];

  const s = perDoc?.substance;
  if (s?.review_band_low) defects.push("review_band_low");
  if (s?.review_band_high) defects.push("review_band_high");
  for (const d of opts?.extra_defects ?? []) defects.push(d);

  const material: string[] = [];
  const logged: string[] = [];
  const unclassified: string[] = [];

  for (const d of defects) {
    const entry = lookupMateriality(d);
    if (!entry) unclassified.push(d);
    else if (entry.materiality === "material") material.push(d);
    else logged.push(d);
  }

  const verdict: GtmVerdict =
    material.length > 0 || unclassified.length > 0
      ? "block"
      : logged.length > 0
        ? "release_with_logged_defects"
        : "release";

  return {
    verdict,
    material_defects: material,
    logged_defects: logged,
    register_version: GTM_MATERIALITY_REGISTER_VERSION,
    unclassified,
  };
}
