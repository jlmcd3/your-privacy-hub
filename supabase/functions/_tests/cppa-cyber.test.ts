// Acceptance tests for run-cppa-cybersecurity Tool Module conversion (v2.2 core).
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSystemContent } from "../_shared/prompt-core.ts";
import { CPPA_CYBER_TOOL_MODULE } from "../run-cppa-cybersecurity/index.ts";

Deno.test("assembled system is a 2-block array with expected content", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_CYBER_TOOL_MODULE,
    currentDate: "2026-06-26",
  });
  assertEquals(blocks.length, 2);
  assertStringIncludes(blocks[0].text, "PRIORITY ORDER");
  assertStringIncludes(blocks[1].text, "PHASE-IN");
  assertStringIncludes(blocks[1].text, "AUDIT vs CERTIFICATION");
});

Deno.test("both blocks carry ephemeral cache_control", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_CYBER_TOOL_MODULE,
    currentDate: "2026-06-26",
  });
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[1].cache_control?.type, "ephemeral");
});

Deno.test("no generic rules duplicated into block 2", () => {
  const blocks = buildSystemContent({
    toolModule: CPPA_CYBER_TOOL_MODULE,
    currentDate: "2026-06-26",
  });
  assert(!blocks[1].text.includes("American English"));
  assert(!blocks[1].text.includes("NO ADAPTIVE GUIDANCE"));
  // …but they appear in the core (block 1).
  assertStringIncludes(blocks[0].text, "American English");
  assertStringIncludes(blocks[0].text, "NO ADAPTIVE GUIDANCE");
});

Deno.test("tool module forbids inventing control citations", () => {
  assertStringIncludes(
    CPPA_CYBER_TOOL_MODULE.citationFramework,
    "never invent, alter, or reorder a control citation",
  );
});

Deno.test("extra rules require Insufficient information for ungathered controls", () => {
  const rules = CPPA_CYBER_TOOL_MODULE.extraRules ?? "";
  assertStringIncludes(rules, "Insufficient information");
});
