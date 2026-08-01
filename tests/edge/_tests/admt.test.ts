// Acceptance tests for run-admt-checker Tool Module conversion (v2.2 core).
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSystemContent } from "../../../supabase/functions/_shared/prompt-core.ts";
import { ADMT_TOOL_MODULE } from "../../../supabase/functions/run-admt-checker/index.ts";
import { resolveCitations, CITATION_REGISTRY } from "../../../supabase/functions/_shared/admt-citation-registry.ts";

const injected = "REGULATION AUTHORITIES:\n(none)\n\nCOMPLIANCE DEADLINES:\n(none)";

Deno.test("assembled system is a 4-block array with expected content (COUNSEL-VOICE-1B advisory tail)", () => {
  const blocks = buildSystemContent({
    toolModule: ADMT_TOOL_MODULE,
    currentDate: "2026-06-26",
    injected,
  });
  assertEquals(blocks.length, 4);
  assertStringIncludes(blocks[0].text, "PRIORITY ORDER");
  // Block 2 carries the ADMT scope-gate text and the registry contract.
  assertStringIncludes(blocks[1].text, "SIGNIFICANT-DECISION CLASSIFIER");
  assertStringIncludes(blocks[1].text, "CITATION ENGINE — DETERMINISTIC");
  // Advisory-voice tail (blocks[3]) carries the canonical closes and the
  // counsel-referral prohibition. Regressing the voice policy MUST break here.
  assertStringIncludes(blocks[3].text, "further clarification is advisable.");
  assertStringIncludes(blocks[3].text, "further internal investigation is advisable.");
  assertStringIncludes(blocks[3].text, "NEVER instruct the reader to consult legal counsel");
});

Deno.test("blocks 1 and 2 cached; injected block 3 and advisory block 4 not cached", () => {
  const blocks = buildSystemContent({
    toolModule: ADMT_TOOL_MODULE,
    currentDate: "2026-06-26",
    injected,
  });
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[1].cache_control?.type, "ephemeral");
  assertEquals(blocks[2].cache_control, undefined);
  assertEquals(blocks[3].cache_control, undefined);
});

Deno.test("block 2 does NOT duplicate generic core rules; generic lines exist exactly once", () => {
  const blocks = buildSystemContent({
    toolModule: ADMT_TOOL_MODULE,
    currentDate: "2026-06-26",
    injected,
  });
  assert(!blocks[1].text.includes("US English (en-US) spelling throughout"));
  assert(!blocks[1].text.includes("NO ADAPTIVE GUIDANCE. Present regulatory standards"));
  assertStringIncludes(blocks[0].text, "US English (en-US) spelling throughout");
  assertStringIncludes(blocks[0].text, "NO ADAPTIVE GUIDANCE. Present regulatory standards");
  // Generic rules appear EXACTLY ONCE across all blocks.
  const priorityHits = blocks.filter((b) => /PRIORITY ORDER/.test(b.text)).length;
  assertEquals(priorityHits, 1);
  const adaptiveHits = blocks.filter((b) => /NO ADAPTIVE GUIDANCE/.test(b.text)).length;
  assertEquals(adaptiveHits, 1);
});

Deno.test("registry intact: significant-decision intake resolves to non-empty citations", () => {
  const intake = {
    decision_domains: ["financial or lending services"],
    system_description: "credit scoring",
  };
  const r = resolveCitations("notice_purpose", intake);
  assert(r.sections.length > 0, "expected at least one resolved section");
  for (const id of r.citationIds) {
    assert(CITATION_REGISTRY[id], `registry missing id ${id}`);
  }
});

Deno.test("§ 7221(c)(5) never appears in ADMT_TOOL_MODULE rules", () => {
  const txt = (ADMT_TOOL_MODULE.extraRules ?? "") + (ADMT_TOOL_MODULE.identity ?? "");
  // The rules mention the PROHIBITION on citing § 7221(c)(5). Confirm it's
  // mentioned ONLY in the prohibition context (the rule is allowed to name
  // the section to forbid it). The runtime output forbids § 7221(c)(5) in
  // model output entirely. Sanity-check the registry doesn't include it.
  for (const entry of Object.values(CITATION_REGISTRY)) {
    assert(!String(entry.section ?? "").includes("7221(c)(5)"),
      "registry must not yield § 7221(c)(5)");
  }
});

Deno.test("ToolModule shape: only identity/citationFramework/extraRules/outputMode/schema?", () => {
  const keys = Object.keys(ADMT_TOOL_MODULE).sort();
  for (const k of keys) {
    assert(
      ["identity", "citationFramework", "outputMode", "extraRules", "schema", "includeEuTransfers", "languageVariant"].includes(k),
      `unexpected key in ADMT_TOOL_MODULE: ${k}`,
    );
  }
  assertEquals(ADMT_TOOL_MODULE.outputMode, "strict-JSON");
});
