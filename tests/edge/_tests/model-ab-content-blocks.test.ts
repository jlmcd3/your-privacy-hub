// ITEM 373 — model-agnostic response parsing + per-model output headroom.
//
// claude-fable-5 returns a leading `thinking` content block and bills its
// tokens against max_tokens. The historic parser read content[0].text, which
// returned "" on that shape and made every DPIA unit fail with no usable
// evidence. These tests pin the integration-layer contract.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { extractTextBlocks } from "../../../supabase/functions/_shared/anthropic-call.ts";
import {
  generationMaxTokens,
  DEFAULT_GENERATION_MODEL,
  AB_ALT_GENERATION_MODEL,
  MAX_OUTPUT_TOKENS_CEILING,
} from "../../../supabase/functions/_shared/generation-model.ts";

Deno.test("extractTextBlocks: plain single text block", () => {
  const r = extractTextBlocks([{ type: "text", text: '{"a":1}' }]);
  assertEquals(r.text, '{"a":1}');
  assertEquals(r.blockTypes, ["text"]);
});

Deno.test("extractTextBlocks: tolerates a leading thinking block", () => {
  const r = extractTextBlocks([
    { type: "thinking", thinking: "…", signature: "abc" },
    { type: "text", text: '{"a":1}' },
  ]);
  assertEquals(r.text, '{"a":1}');
  assertEquals(r.blockTypes, ["thinking", "text"]);
});

Deno.test("extractTextBlocks: concatenates multiple text blocks in order", () => {
  const r = extractTextBlocks([
    { type: "thinking", thinking: "…" },
    { type: "text", text: '{"a":' },
    { type: "text", text: "1}" },
  ]);
  assertEquals(r.text, '{"a":1}');
});

Deno.test("extractTextBlocks: no text block → empty text, block types reported", () => {
  const r = extractTextBlocks([{ type: "thinking", thinking: "…" }]);
  assertEquals(r.text, "");
  assertEquals(r.blockTypes, ["thinking"]);
  assert(!r.blockTypes.includes("text"));
});

Deno.test("extractTextBlocks: safe on malformed content", () => {
  assertEquals(extractTextBlocks(undefined).text, "");
  assertEquals(extractTextBlocks(null).blockTypes, []);
});

Deno.test("generationMaxTokens: default model budget untouched", () => {
  assertEquals(generationMaxTokens(DEFAULT_GENERATION_MODEL, 14_000), 14_000);
});

Deno.test("generationMaxTokens: alternate model gets thinking headroom", () => {
  assert(generationMaxTokens(AB_ALT_GENERATION_MODEL, 14_000) > 14_000);
});

Deno.test("generationMaxTokens: never exceeds the single-call ceiling", () => {
  assertEquals(generationMaxTokens(AB_ALT_GENERATION_MODEL, 60_000), MAX_OUTPUT_TOKENS_CEILING);
});
