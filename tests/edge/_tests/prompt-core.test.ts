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
} from "../../../supabase/functions/_shared/prompt-core.ts";

const toolModule: ToolModule = {
  identity: "You are a test specialist.",
  citationFramework: "Test Code §1; format §1(a); never cite §999.",
  outputMode: "strict-JSON",
  schema: "{ \"foo\": \"bar\" }",
  extraRules: "Tool-specific rules here.",
};

Deno.test("version is a semver-shaped string (moves forward under change control)", () => {
  // Post-COUNSEL-VOICE-1 the stamp is `3.9.3-counsel-voice-1`; assert the
  // shape rather than pinning the literal so routine version bumps do not
  // trip this baseline test.
  assert(/^[0-9]+\.[0-9]+(?:\.[0-9]+)?(?:-[A-Za-z0-9._-]+)?$/.test(PROMPT_CORE_VERSION));
});

Deno.test("v3.7 META rules present in prompt core", () => {
  const blocks = buildSystemContent({ toolModule });
  const b1 = blocks[0].text;
  assertStringIncludes(b1, "CANONICAL FORMS CARRY NO FROZEN TIME FACTS");
  assertStringIncludes(b1, "TEMPORAL FRAMING RULE");
});


Deno.test("languageVariant: british emits British English instruction; american emits US English", () => {
  const british = buildSystemContent({
    toolModule: { ...toolModule, languageVariant: "british" },
  });
  assertStringIncludes(british[0].text, "British English");
  assert(!british[0].text.includes("US English (en-US) spelling throughout"));

  const american = buildSystemContent({
    toolModule: { ...toolModule, languageVariant: "american" },
  });
  // The american rule now anchors on "US English (en-US) spelling throughout"
  // rather than the earlier "American English" phrasing.
  assertStringIncludes(american[0].text, "US English (en-US) spelling throughout");
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
  assertStringIncludes(b1, "US English (en-US)");
  assertStringIncludes(b1, "INTERPRETATION & ARGUMENT");
  assertStringIncludes(b1, "ARGUMENT MAPPING");
  assertStringIncludes(b1, "HIERARCHY OF AUTHORITY");
  assertStringIncludes(b1, "APPLICABILITY GATE");
  assert(!b1.includes("[["), "no placeholders should remain in block 1");
  assertStringIncludes(b1, "strict-JSON");
  assertStringIncludes(b1, "Test Code §1");
  assertStringIncludes(b1, "2026-06-26");

  // Cache: blocks 1 & 2 cached, injected block 3 and advisory block 4 not.
  assertEquals(blocks[0].cache_control?.type, "ephemeral");
  assertEquals(blocks[0].cache_control?.ttl, "1h");
  assertEquals(blocks[1].cache_control?.ttl, "1h");
  assertEquals(blocks[2].cache_control, undefined);
  // COUNSEL-VOICE-1B — advisory tail appended as an uncached 4th block.
  assertEquals(blocks.length, 4);
  assertEquals(blocks[3].cache_control, undefined);
  assertStringIncludes(blocks[3].text, "further clarification is advisable.");
  assertStringIncludes(blocks[3].text, "further internal investigation is advisable.");
  assertStringIncludes(blocks[3].text, "NEVER instruct the reader to consult legal counsel");

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
  // Advisory tail is always uncached regardless of `cache` option.
  assertEquals(blocks[blocks.length - 1].cache_control, undefined);
});

Deno.test("no injected block when empty; advisory tail still appended", () => {
  const blocks = buildSystemContent({ toolModule, injected: "  " });
  // COUNSEL-VOICE-1B — [core, tool, advisory] when no injected content.
  assertEquals(blocks.length, 3);
  assertStringIncludes(blocks[2].text, "further clarification is advisable.");
});

Deno.test("block 2 contains identity, extraRules, schema", () => {
  const blocks = buildSystemContent({ toolModule });
  const b2 = blocks[1].text;
  assertStringIncludes(b2, "You are a test specialist.");
  assertStringIncludes(b2, "Tool-specific rules here.");
  assertStringIncludes(b2, "\"foo\"");
});
