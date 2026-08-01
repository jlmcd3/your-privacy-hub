// FORK-R1 R2 — Per-product registry manifest.
//
// Each product declares the registry render functions it injects into its system
// prompt via buildSystemContent's existing `injected` parameter. Facts live ONCE
// in the registries; products pick them up by name. No buildSystemContent change
// needed. A tool with no manifest entry returns "" and is unaffected.

import { renderIcoPenaltyFigures } from "../../../_shared/enforcement-figures-registry.ts";
import {
  renderPraByStatute,
  renderCubiSubsections,
  renderFdbrApplicability,
  renderBipaCitations,
} from "../../../_shared/registry/statutory-rules-registry.ts";

export const PRODUCT_REGISTRY: Record<string, (() => string)[]> = {
  "biometric-checker": [
    renderIcoPenaltyFigures,
    renderBipaCitations,
    renderCubiSubsections,
    renderFdbrApplicability,
    () => renderPraByStatute(["BIPA", "CUBI", "VCDPA", "CPRA"]),
  ],
  "ir-playbook": [renderIcoPenaltyFigures],
  // Add other tools (dpa-generator, governance, dpia, etc.) as each is migrated.
};

export function renderRegistryFor(tool: string): string {
  const fns = PRODUCT_REGISTRY[tool] ?? [];
  return fns
    .map((fn) => {
      try {
        return fn();
      } catch (e) {
        console.warn(`[product-manifest] render failed for ${tool}:`, (e as Error).message);
        return "";
      }
    })
    .filter((s) => s && s.trim().length > 0)
    .join("\n\n");
}
