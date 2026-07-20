// Acceptance tests for run-dpia-framework Tool Module conversion (v2.2 core).
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSystemContent } from "../_shared/prompt-core.ts";
import { DPIA_TOOL_MODULE } from "../run-dpia-framework/index.ts";
import {
  resolveDpiaJurisdiction,
  renderResolvedBlock,
  type DpiaIntakeFacts,
} from "../_shared/dpia-jurisdiction-registry.ts";

const today = "2026-06-26";

Deno.test("DPIA system: block 1 contains PRIORITY ORDER; block 2 does not duplicate core lines", () => {
  const blocks = buildSystemContent({ toolModule: DPIA_TOOL_MODULE, currentDate: today });
  assert(Array.isArray(blocks));
  assert(blocks.length >= 2);
  assertStringIncludes(blocks[0].text, "PRIORITY ORDER");
  // Block 2 should NOT redundantly contain core-only phrases.
  assert(!/American English/.test(blocks[1].text), "block 2 must not duplicate 'American English'");
  assert(!/NO ADAPTIVE GUIDANCE/.test(blocks[1].text), "block 2 must not duplicate 'NO ADAPTIVE GUIDANCE'");
});

Deno.test("DPIA injected (resolved-jurisdiction) block has no cache_control; advisory tail present", () => {
  const blocks = buildSystemContent({
    toolModule: DPIA_TOOL_MODULE,
    currentDate: today,
    injected: "RESOLVED JURISDICTION:\n(test)",
  });
  // COUNSEL-VOICE-1B — advisory-voice block is appended as a 4th uncached tail.
  assertEquals(blocks.length, 4);
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[1].cache_control?.type, "ephemeral");
  assertEquals(blocks[2].cache_control, undefined);
  assertEquals(blocks[3].cache_control, undefined);
  assertStringIncludes(blocks[3].text, "further clarification is advisable.");
  assertStringIncludes(blocks[3].text, "NEVER instruct the reader to consult legal counsel");
});

Deno.test("Hardcoded 'Germany → BfDI' mapping is removed from the assembled prompt", () => {
  const blocks = buildSystemContent({ toolModule: DPIA_TOOL_MODULE, currentDate: today });
  const all = blocks.map((b) => b.text).join("\n");
  assert(!/Germany\s*→\s*Bundesbeauftragte/i.test(all),
    "must not contain the hardcoded 'Germany → BfDI' mapping");
  assert(!/Germany\s*→\s*BfDI/i.test(all),
    "must not contain the hardcoded 'Germany → BfDI' shorthand");
});

Deno.test("Bavaria private-sector controller resolves to BayLDA; BfDI is not the competent authority", () => {
  const facts: DpiaIntakeFacts = {
    controllerSites: [{ country: "DE", land: "Bavaria", sector: "private" }],
    centralAdministrationCountry: "DE",
    euEstablishmentWithDecisionAuthority: null,
    transferFlows: [],
  };
  const resolved = resolveDpiaJurisdiction(facts);
  const competentNames = resolved.sites.map((s) => s.competentSA.name).join(" | ");
  assertStringIncludes(competentNames, "BayLDA");
  assert(!/BfDI/i.test(competentNames),
    "private-sector Bavarian controller must NOT have BfDI as competent authority");
  const block = renderResolvedBlock(resolved);
  assertStringIncludes(block, "BayLDA");
});

Deno.test("DPF-certified US importer → EU-US DPF (2023/1795); no SCCs / no TIA", () => {
  const facts: DpiaIntakeFacts = {
    controllerSites: [{ country: "DE", land: "Bavaria", sector: "private" }],
    centralAdministrationCountry: "DE",
    euEstablishmentWithDecisionAuthority: null,
    transferFlows: [{ originRegime: "EU", destinationCountry: "US", importerDpfCertified: true }],
  };
  const resolved = resolveDpiaJurisdiction(facts);
  assertEquals(resolved.transfers.length, 1);
  const t = resolved.transfers[0].resolved;
  assertStringIncludes(t.mechanism, "Data Privacy Framework");
  assertStringIncludes(t.citation, "2023/1795");
  assertEquals(t.tiaRequired, false);
});

Deno.test("Non-DPF US importer → SCCs and TIA", () => {
  const facts: DpiaIntakeFacts = {
    controllerSites: [{ country: "DE", land: "Bavaria", sector: "private" }],
    centralAdministrationCountry: "DE",
    euEstablishmentWithDecisionAuthority: null,
    transferFlows: [{ originRegime: "EU", destinationCountry: "US", importerDpfCertified: false }],
  };
  const resolved = resolveDpiaJurisdiction(facts);
  const t = resolved.transfers[0].resolved;
  assertStringIncludes(t.mechanism.toLowerCase(), "standard contractual clauses");
  assertEquals(t.tiaRequired, true);
});

Deno.test("Swiss adequacy cited as Commission Decision 2000/518/EC (no '(EU)' / 'Implementing')", () => {
  const facts: DpiaIntakeFacts = {
    controllerSites: [{ country: "DE", land: "Bavaria", sector: "private" }],
    centralAdministrationCountry: "DE",
    euEstablishmentWithDecisionAuthority: null,
    transferFlows: [{ originRegime: "EU", destinationCountry: "CH" }],
  };
  const resolved = resolveDpiaJurisdiction(facts);
  const t = resolved.transfers[0].resolved;
  assertStringIncludes(t.citation, "Commission Decision 2000/518/EC");
  assert(!/Commission Implementing Decision/.test(t.citation),
    "Swiss adequacy must NOT be cited as an 'Implementing' decision");
  assert(!/\(EU\)\s*2000\/518/.test(t.citation),
    "Swiss adequacy citation must NOT include '(EU)' marker");
});

Deno.test("Citation framework explicitly routes SA/transfers through the resolved block", () => {
  const blocks = buildSystemContent({ toolModule: DPIA_TOOL_MODULE, currentDate: today });
  const all = blocks.map((b) => b.text).join("\n");
  assertStringIncludes(all, "RESOLVED JURISDICTION");
  assertStringIncludes(all, "Do not name a supervisory authority");
});
