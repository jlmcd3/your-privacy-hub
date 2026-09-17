// /all-ptest v2 (DOC 261, 2026-09-14) — write the grounding packs.
//
//   deno run --allow-read --allow-write --allow-env scripts/ptest/export-packs.ts
//
// Regenerates supabase/functions/ptest-run-driver/_local/review/packs/*.pack.ts from the
// product registries and the risk engine (golden panel). Run after any change
// to a verified-authority registry, the risk spine, or the engine's
// provenance; the drift test fails until the committed packs are rebuilt.

import {
  buildAdmtBlockCatalogue,
  buildAdmtRegistryPack,
  buildCyberBlockCatalogue,
  buildCyberRegistryPack,
  buildDpiaRegistryPack,
  buildGovernanceRegistryPack,
  buildLiaRegistryPack,
  buildGoldenPanelPack,
  buildRiskBlockCatalogue,
  buildRiskRegistryPack,
  packModuleSource,
} from "./build-packs.ts";

const OUT = new URL("../../supabase/functions/ptest-run-driver/_local/review/packs/", import.meta.url);

const files: Array<[string, string, string, unknown]> = [
  ["risk-registry.pack.ts", "RISK_REGISTRY_PACK", "RegistryPack", buildRiskRegistryPack()],
  ["admt-registry.pack.ts", "ADMT_REGISTRY_PACK", "RegistryPack", buildAdmtRegistryPack()],
  ["cyber-registry.pack.ts", "CYBER_REGISTRY_PACK", "RegistryPack", buildCyberRegistryPack()],
  ["dpia-registry.pack.ts", "DPIA_REGISTRY_PACK", "RegistryPack", buildDpiaRegistryPack()],
  ["lia-registry.pack.ts", "LIA_REGISTRY_PACK", "RegistryPack", buildLiaRegistryPack()],
  ["governance-registry.pack.ts", "GOVERNANCE_REGISTRY_PACK", "RegistryPack", buildGovernanceRegistryPack()],
  ["risk-block-catalogue.pack.ts", "RISK_BLOCK_CATALOGUE", "BlockCatalogue", await buildRiskBlockCatalogue()],
  ["admt-block-catalogue.pack.ts", "ADMT_BLOCK_CATALOGUE", "BlockCatalogue", buildAdmtBlockCatalogue()],
  ["cyber-block-catalogue.pack.ts", "CYBER_BLOCK_CATALOGUE", "BlockCatalogue", buildCyberBlockCatalogue()],
  ["golden-panel.pack.ts", "GOLDEN_PANEL_PACK", "GoldenPanelPack", buildGoldenPanelPack()],
];

for (const [name, exportName, typeName, value] of files) {
  const src = packModuleSource(exportName, typeName, value);
  await Deno.writeTextFile(new URL(name, OUT), src);
  console.log(`wrote ${name} (${src.length} chars)`);
}
