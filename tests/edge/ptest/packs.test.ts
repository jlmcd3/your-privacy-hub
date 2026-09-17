// /all-ptest v2 (DOC 261, 2026-09-14) — GROUNDING PACKS: drift guard + shape.
//
// The committed packs under _shared/review/packs/ must equal what the builders
// produce from the live registries, spine and engine. A registry row edited
// without rebuilding the packs, or an engine change that moves a factor to a
// different block, fails here — the workers never review against stale law
// or a stale block map.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildAdmtBlockCatalogue,
  buildAdmtRegistryPack,
  buildCyberBlockCatalogue,
  buildCyberRegistryPack,
  buildRiskBlockCatalogue,
  buildRiskRegistryPack,
} from "../../../scripts/ptest/build-packs.ts";
import {
  BLOCK_CATALOGUES,
  REGISTRY_PACKS,
  hydrateLocatorPack,
  registryRowById,
  renderBlockCatalogueText,
  renderRegistryPackText,
} from "../../../supabase/functions/ptest-run-driver/_local/review/packs/index.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts";

type Bag = Record<string, unknown>;

Deno.test("packs — committed registry packs equal a rebuild from the live registries", () => {
  assertEquals(REGISTRY_PACKS["cppa-risk"], buildRiskRegistryPack());
  assertEquals(REGISTRY_PACKS["cppa-admt"], buildAdmtRegistryPack());
  assertEquals(REGISTRY_PACKS["cppa-cyber"], buildCyberRegistryPack());
});

Deno.test("packs — committed block catalogues equal a rebuild over the golden panel (risk from provenance; ADMT and cyber from rendered text)", async () => {
  assertEquals(BLOCK_CATALOGUES["cppa-risk"], await buildRiskBlockCatalogue());
  assertEquals(BLOCK_CATALOGUES["cppa-admt"], buildAdmtBlockCatalogue());
  assertEquals(BLOCK_CATALOGUES["cppa-cyber"], buildCyberBlockCatalogue());
  // ADMT/cyber entries carry observed citations on at least some blocks.
  assert(BLOCK_CATALOGUES["cppa-admt"].entries.some((e) => e.authorities.some((a) => /7220|7221|7222|7001/.test(a))));
  assert(BLOCK_CATALOGUES["cppa-cyber"].entries.some((e) => e.authorities.some((a) => /712[0-4]/.test(a))));
  assert(BLOCK_CATALOGUES["cppa-admt"].entries.every((e) => e.factor_ids.length === 0), "no engine provenance is claimed for ADMT");
});

Deno.test("packs — every risk and ADMT row carries verbatim text; every cyber row is a locator", () => {
  for (const r of REGISTRY_PACKS["cppa-risk"].rows) assert(r.verbatim_quote && r.verbatim_quote.length > 20, r.proposition_key);
  for (const r of REGISTRY_PACKS["cppa-admt"].rows) assert(r.verbatim_quote && r.verbatim_quote.length > 20, r.proposition_key);
  for (const r of REGISTRY_PACKS["cppa-cyber"].rows) {
    assertEquals(r.verbatim_quote, null, r.proposition_key);
    assert(r.locator && r.locator.starts_with.length > 0 && r.locator.ends_with.length > 0, r.proposition_key);
  }
});

Deno.test("packs — the prompt text is static and within the cache budget", () => {
  for (const [product, pack] of Object.entries(REGISTRY_PACKS)) {
    const text = renderRegistryPackText(pack);
    assertStringIncludes(text, `REGISTRY PACK — ${product}`);
    assert(text.length < 60_000, `${product} registry pack text is ${text.length} chars`);
    assert(!/\d{4}-\d{2}-\d{2}T/.test(text), "no timestamps in a cached prefix");
  }
  const cat = renderBlockCatalogueText(BLOCK_CATALOGUES["cppa-risk"]);
  assertStringIncludes(cat, "BLOCK CATALOGUE — cppa-risk");
  assert(cat.length < 60_000, `catalogue text is ${cat.length} chars`);
});

Deno.test("packs — every block key that renders on the PERFECT panel is in the catalogue, and every provenance row names a catalogued block", async () => {
  const cat = BLOCK_CATALOGUES["cppa-risk"];
  const keys = new Set(cat.entries.map((e) => e.block_key));
  for (const c of CPPA_RISK_PERFECT) {
    const gen = await generateCppaRiskReport(c.intake as Bag, {
      buildStamp: "packs-test", pass1: "deterministic", pass2rEnabled: false, refinementEnabled: false, euCorpus: [], reportDate: "2026-09-14",
    });
    const doc = gen.report.skeleton_document as { sections: Array<{ paragraphs: Array<{ key?: string }> }> };
    for (const s of doc.sections) for (const p of s.paragraphs) {
      assert(p.key, `${c.id}: a rendered paragraph carries no block key`);
      assert(keys.has(p.key), `${c.id}: rendered block ${p.key} is not in the catalogue`);
    }
    const prov = (((gen.report._meta as Bag).internal as Bag).factor_provenance ?? []) as Array<{ block_key: string | null; factor_id: string }>;
    assert(prov.length > 20, `${c.id}: provenance persisted (${prov.length} rows)`);
    for (const r of prov) if (r.block_key) assert(keys.has(r.block_key), `${c.id}: provenance block ${r.block_key} (${r.factor_id}) not in catalogue`);
  }
});

Deno.test("packs — registry row lookup and locator hydration", () => {
  const risk = REGISTRY_PACKS["cppa-risk"];
  assert(registryRowById(risk, "ra_when_required")?.subsection === "11 CCR § 7150(a)");
  assertEquals(registryRowById(risk, "no_such_row"), null);

  const cyber = REGISTRY_PACKS["cppa-cyber"];
  const excerpt = [
    "(a) Every business whose processing of consumers' personal information presents significant risk to consumers' security must complete a cybersecurity audit.",
    "(b) A business's processing of consumers' personal information presents significant risk to consumers' security if any of the following is true:",
    "(1) The business meets the threshold set forth in Civil Code section 1798.140, subdivision (d)(1)(C), and the business derived 50 percent or more of its annual revenue in the preceding calendar year; or",
    "(2) The business meets the threshold set forth in Civil Code section 1798.140, subdivision (d)(1)(A); and",
  ].join("\n");
  const { pack, unresolved } = hydrateLocatorPack(cyber, { "cppa-7120": excerpt });
  const a = registryRowById(pack, "cyber_audit_required");
  assert(a?.verbatim_quote?.startsWith("Every business whose process"), a?.verbatim_quote ?? "null");
  assert(a?.verbatim_quote?.endsWith("complete a cybersecurity audit."), a?.verbatim_quote ?? "null");
  const b1 = registryRowById(pack, "cyber_threshold_gross_rev");
  assert(b1?.verbatim_quote?.startsWith("The business meets the thres") && b1.verbatim_quote.endsWith("preceding calendar year; or"), b1?.verbatim_quote ?? "null");
  // Rows for provisions not supplied stay locators and are reported.
  assert(unresolved.includes("cyber_first_audit_deadline"));
  assertEquals(registryRowById(pack, "cyber_first_audit_deadline")?.verbatim_quote, null);
});
