// Tests for shared prompt-core module (v2.2)
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildSystemContent,
  PROMPT_CORE_VERSION,
  type ToolModule,
} from "../_shared/prompt-core.ts";

const toolModule: ToolModule = {
  identity: "You are a test specialist.",
  citationFramework: "Test Code §1; format §1(a); never cite §999.",
  outputMode: "strict-JSON",
  schema: "{ \"foo\": \"bar\" }",
  extraRules: "Tool-specific rules here.",
};

Deno.test("version is 3.7", () => {
  assertEquals(PROMPT_CORE_VERSION, "3.7");
});

Deno.test("v3.7 META rules present in prompt core", () => {
  const blocks = buildSystemContent({ toolModule });
  const b1 = blocks[0].text;
  assertStringIncludes(b1, "CANONICAL FORMS CARRY NO FROZEN TIME FACTS");
  assertStringIncludes(b1, "TEMPORAL FRAMING RULE");
});


Deno.test("languageVariant: british emits British English instruction; american the American one", () => {
  const british = buildSystemContent({
    toolModule: { ...toolModule, languageVariant: "british" },
  });
  assertStringIncludes(british[0].text, "British English");
  assert(!british[0].text.includes("Use American English throughout this document"));

  const american = buildSystemContent({
    toolModule: { ...toolModule, languageVariant: "american" },
  });
  assertStringIncludes(american[0].text, "American English");
  assert(!american[0].text.includes("Use British English throughout this document"));
});

Deno.test("languageVariant: jurisdiction-conditional emits the conditional rule", () => {
  const blocks = buildSystemContent({
    toolModule: { ...toolModule, languageVariant: "jurisdiction-conditional" },
  });
  assertStringIncludes(blocks[0].text, "American English for US-law outputs");
  assertStringIncludes(blocks[0].text, "British English for UK/EU outputs");
});


Deno.test("full variant: blocks, placeholders, content", () => {
  const blocks = buildSystemContent({
    toolModule,
    currentDate: "2026-06-26",
    injected: "INJECTED CORPUS TEXT",
    ttl: "1h",
  });
  assert(blocks.length >= 2);
  const b1 = blocks[0].text;
  assertStringIncludes(b1, "PRIORITY ORDER");
  assertStringIncludes(b1, "American English");
  assertStringIncludes(b1, "INTERPRETATION & ARGUMENT");
  assertStringIncludes(b1, "ARGUMENT MAPPING");
  assertStringIncludes(b1, "HIERARCHY OF AUTHORITY");
  assertStringIncludes(b1, "APPLICABILITY GATE");
  assert(!b1.includes("[["), "no placeholders should remain in block 1");
  assertStringIncludes(b1, "strict-JSON");
  assertStringIncludes(b1, "Test Code §1");
  assertStringIncludes(b1, "2026-06-26");

  // Cache: blocks 1 & 2 cached, block 3 not.
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[0].cache_control?.ttl, "1h");
  assertEquals(blocks[1].cache_control?.ttl, "1h");
  assertEquals(blocks[2].cache_control, undefined);

  // Cache minimum: Claude Sonnet 4.6 prefix ≥ 1024 tokens (~4 chars/token).
  assert(b1.length / 4 >= 1024, `block1 too short for cache: ${b1.length} chars`);
});

Deno.test("lean variant excludes citation protocol block, keeps key rules", () => {
  const blocks = buildSystemContent({ toolModule, variant: "lean" });
  const b1 = blocks[0].text;
  assert(!b1.includes("CITATION & GROUNDING PROTOCOL"));
  assertStringIncludes(b1, "NO FABRICATION");
  assertStringIncludes(b1, "NO ADAPTIVE GUIDANCE");
});

Deno.test("cache:false strips cache_control", () => {
  const blocks = buildSystemContent({ toolModule, cache: false });
  assertEquals(blocks[0].cache_control, undefined);
  assertEquals(blocks[1].cache_control, undefined);
});

Deno.test("no injected block when empty", () => {
  const blocks = buildSystemContent({ toolModule, injected: "  " });
  assertEquals(blocks.length, 2);
});

Deno.test("block 2 contains identity, extraRules, schema", () => {
  const blocks = buildSystemContent({ toolModule });
  const b2 = blocks[1].text;
  assertStringIncludes(b2, "You are a test specialist.");
  assertStringIncludes(b2, "Tool-specific rules here.");
  assertStringIncludes(b2, "\"foo\"");
});
