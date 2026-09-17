// doc 263 run 1 (2026-09-17) — /all-ptest Claude calls answer through
// structured outputs, with strict / auto tool use and text as ordered
// fallbacks. Claude Fable 5.1 rejects forced tool use on every request
// (platform docs, "Response prefill and forced tool use"), which is how
// batches 90cfff88 and 8a8475f8 lost W-RECORD and classifier answers to
// unparseable free text. Pure helpers only; no network.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  anthropicBody,
  escapeControlCharsInStrings,
  isStructuredShapeRejected,
  parseJsonObject,
  readAnthropicContent,
  STRUCTURED_MODES,
  strictSchema,
} from "../../../../supabase/functions/_shared/review/model-calls.ts";

const SCHEMA = {
  name: "submit_findings",
  description: "Return the findings.",
  schema: {
    type: "object",
    properties: {
      findings: { type: "array", items: { type: "object", properties: { id: { type: "string" }, note: { type: ["string", "null"] } }, required: ["id"] } },
      double_check: { type: ["string", "null"] },
    },
    required: ["findings"],
  },
};

Deno.test("strictSchema — additionalProperties:false on every object, input untouched", () => {
  const out = strictSchema(SCHEMA.schema) as Record<string, unknown>;
  assertEquals(out.additionalProperties, false);
  const items = ((out.properties as Record<string, unknown>).findings as Record<string, unknown>).items as Record<string, unknown>;
  assertEquals(items.additionalProperties, false);
  assertEquals((SCHEMA.schema as Record<string, unknown>).additionalProperties, undefined, "the authored schema is not mutated");
  assertEquals(items.required, ["id"], "optional properties stay optional");
});

Deno.test("anthropicBody — output_config mode: format json_schema, effort kept, no tools, user turn unchanged", () => {
  const b = anthropicBody({ model: "claude-fable-5-1", system: "S", user: "U", maxTokens: 100, effort: "high", jsonSchema: SCHEMA, mode: "output_config" });
  const oc = b.output_config as Record<string, unknown>;
  assertEquals(oc.effort, "high");
  assertEquals((oc.format as Record<string, unknown>).type, "json_schema");
  assertEquals(((oc.format as Record<string, unknown>).schema as Record<string, unknown>).additionalProperties, false);
  assertEquals(b.tools, undefined);
  assertEquals(b.tool_choice, undefined);
  assertEquals((b.messages as Array<{ content: string }>)[0].content, "U");
});

Deno.test("anthropicBody — tool_strict mode: strict tool, tool_choice auto (never forced), call asked for in the user turn", () => {
  const b = anthropicBody({ model: "claude-fable-5-1", system: "S", user: "U", maxTokens: 100, effort: "medium", jsonSchema: SCHEMA, mode: "tool_strict" });
  const tool = (b.tools as Array<Record<string, unknown>>)[0];
  assertEquals(tool.name, "submit_findings");
  assertEquals(tool.strict, true);
  assertEquals((tool.input_schema as Record<string, unknown>).additionalProperties, false);
  assertEquals(b.tool_choice, { type: "auto" });
  assertEquals((b.output_config as Record<string, unknown>).format, undefined);
  assert(String((b.messages as Array<{ content: string }>)[0].content).startsWith("U\n\nAnswer by calling the tool"));
});

Deno.test("anthropicBody — tool_auto has no strict flag; text mode has no tools and no format", () => {
  const auto = anthropicBody({ model: "m", system: "S", user: "U", maxTokens: 100, effort: null, jsonSchema: SCHEMA, mode: "tool_auto" });
  assertEquals((auto.tools as Array<Record<string, unknown>>)[0].strict, undefined);
  assertEquals(auto.output_config, undefined, "no effort and no format ⇒ no output_config at all");
  const text = anthropicBody({ model: "m", system: "S", user: "U", maxTokens: 100, effort: "low", jsonSchema: SCHEMA, mode: "text" });
  assertEquals(text.tools, undefined);
  assertEquals((text.output_config as Record<string, unknown>).format, undefined);
  assertEquals((text.messages as Array<{ content: string }>)[0].content, "U");
});

Deno.test("STRUCTURED_MODES — structured outputs first, text last", () => {
  assertEquals([...STRUCTURED_MODES], ["output_config", "tool_strict", "tool_auto", "text"]);
});

Deno.test("readAnthropicContent — tool_use input wins, every text block is read, thinking-only is empty", () => {
  const tool = readAnthropicContent({ content: [{ type: "thinking", thinking: "" }, { type: "tool_use", name: "submit_findings", input: { findings: [] } }], stop_reason: "tool_use" });
  assertEquals(tool.text, JSON.stringify({ findings: [] }));
  assertEquals(tool.viaTool, true);
  const text = readAnthropicContent({ content: [{ type: "thinking", thinking: "" }, { type: "text", text: "{\"a\":" }, { type: "text", text: "1}" }], stop_reason: "end_turn" });
  assertEquals(text.text, "{\"a\":1}");
  assertEquals(text.viaTool, false);
  const empty = readAnthropicContent({ content: [{ type: "thinking", thinking: "" }], stop_reason: "end_turn" });
  assertEquals(empty.text, "");
  assertEquals(empty.blockTypes, ["thinking"]);
  assertEquals(empty.stopReason, "end_turn");
});

Deno.test("isStructuredShapeRejected — the Fable forced-tool 400 and a schema 400 advance the mode; an effort 400 does not", () => {
  assert(isStructuredShapeRejected(400, '{"type":"error","error":{"type":"invalid_request_error","message":"tool_choice: forced tool use is not supported on this model"}}'));
  assert(isStructuredShapeRejected(400, "output_config.format.schema: additionalProperties must be false"));
  assert(!isStructuredShapeRejected(400, "output_config.effort: unsupported value"));
  assert(!isStructuredShapeRejected(404, "model not found"));
});

Deno.test("parseJsonObject — fenced block followed by prose, raw newlines inside a quoted string, leading prose", () => {
  assertEquals(parseJsonObject('Here is the result:\n```json\n{"findings": []}\n```\nLet me know if you need more.'), { findings: [] });
  const rawNewline = '{"findings": [{"id": "f1", "quote": "line one\nline two\ttabbed"}]}';
  assertEquals(parseJsonObject(rawNewline), { findings: [{ id: "f1", quote: "line one\nline two\ttabbed" }] });
  assertEquals(parseJsonObject('Sure. {"a": {"b": 1}} — done.'), { a: { b: 1 } });
  assertEquals(parseJsonObject("no json here"), null);
  assertEquals(parseJsonObject("[1,2]"), null, "an array is not the object the workers promise");
});

Deno.test("escapeControlCharsInStrings — touches only characters inside string literals; keeps existing escapes", () => {
  assertEquals(escapeControlCharsInStrings('{"a":"x\ny"}'), '{"a":"x\\ny"}');
  assertEquals(escapeControlCharsInStrings('{"a":"x\\ny"}'), '{"a":"x\\ny"}');
  assertEquals(escapeControlCharsInStrings('{\n"a":\n"b"\n}'), '{\n"a":\n"b"\n}');
  assertEquals(escapeControlCharsInStrings('{"a":"say \\"hi\\"\n"}'), '{"a":"say \\"hi\\"\\n"}');
});
