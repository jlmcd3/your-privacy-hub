// /all-ptest — reviewer model calls (Anthropic + OpenAI), with effort levels,
// prompt caching, model fallback and JSON extraction.
//
// CARRIED FORWARD from the grading path:
//   * Every call self-aborts well inside the isolate wall clock, so a hung
//     provider is reported as THIS call's failure, never a dead batch.
//   * Every text block is read, never content[0] — newer Claude models emit a
//     leading `thinking` block and content[0].text is empty on those (item 373).
//   * An ok-but-textless response is an error, not an empty review.
//   * Spend is metered per call through the existing api_usage path.
//
// PROMPT CACHING
//   Anthropic: the system prompt is sent as one block carrying
//   cache_control: ephemeral. Every call in a batch sends a BYTE-IDENTICAL
//   system block, so calls after the first read the cache instead of paying
//   full input price. The per-document text lives in the user turn, after the
//   cached prefix — the only ordering under which caching works at all.
//   OpenAI: prefix caching is automatic for identical leading input over
//   ~1024 tokens; the same static-prefix/varying-suffix ordering is used.
//
// MODEL FALLBACK
//   The exact reviewer model ids are configuration, and an id the account
//   cannot serve answers 404/400 rather than degrading. Each reviewer has an
//   ordered candidate list; the first id the account serves is used and the
//   id that actually ran is reported back on every result, so a fallback is
//   always visible in the batch output rather than silently assumed.

import { recordApiUsage } from "../api-usage.ts";
import type { JsonSchemaSpec } from "./json-schemas.ts";

export type Effort = "low" | "medium" | "high" | "max";

/** Claude reviewer/arbiter candidates, best first. Sonnet is excluded by CEO
 *  instruction and must never be added to this list. */
export const CLAUDE_REVIEW_MODELS = ["claude-fable-5-1", "claude-fable-5", "claude-opus-4-6"] as const;
/** OpenAI reviewer candidates for the Responses API, best first. */
export const OPENAI_REVIEW_MODELS = ["gpt-6-astra", "gpt-5.4"] as const;
/** Last-resort OpenAI model on the chat-completions API (already proven in
 *  this codebase by grade-single-assessment). */
export const OPENAI_CHAT_FALLBACK_MODEL = "gpt-4o";

const ANTHROPIC_KEY = () => Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const OPENAI_KEY = () => Deno.env.get("OPENAI_API_KEY") ?? "";

/** Self-abort window per call — deliberately INSIDE the isolate wall clock.
 *  A call that runs past this fails as THIS call's own error, recorded on the
 *  job, rather than the isolate being killed with nothing written. Retries are
 *  job attempts, not in-call retries, so the window stays short and honest. */
export const REVIEW_CALL_TIMEOUT_MS = 330_000;

export interface ModelCallResult {
  text: string;
  model: string;
  effort: Effort | null;
  elapsedMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheCreationTokens: number | null;
  /** True when a non-preferred model id had to be used. */
  fellBack: boolean;
  /** Human-readable note about any degradation (model or effort). */
  note: string | null;
  /** Which answer shape the provider actually served (Anthropic only). */
  structured?: StructuredMode | null;
}

function isModelUnavailable(status: number, body: string): boolean {
  if (status === 404) return true;
  return status === 400 && /model|not_found|does not exist|unsupported/i.test(body);
}

function isEffortUnsupported(status: number, body: string): boolean {
  return status === 400 && /effort|output_config|reasoning/i.test(body);
}

// ── Anthropic ───────────────────────────────────────────────────────────────

/**
 * STRUCTURED ANSWERS (doc 263 run 1, 2026-09-17). Claude Fable 5.1 (the
 * first reviewer candidate) rejects forced tool use on every request with a
 * 400 (platform docs, "Response prefill and forced tool use"); the earlier
 * `tool_choice: {type: "tool"}` therefore never ran on it — the 400 matched
 * the "structured output unsupported" fallback and the answer came back as
 * free text, which then failed to parse (batches 90cfff88, 8a8475f8). The
 * modes below are tried in order; the one that served the answer is reported
 * on the result so a degraded call is visible in the batch output.
 *
 *   output_config — structured outputs: output_config.format json_schema; the
 *                   provider validates the JSON and returns it as the text
 *                   block. Supported on every candidate in CLAUDE_REVIEW_MODELS.
 *   tool_strict   — strict tool use with tool_choice auto (forced choice is
 *                   the rejected shape); the user turn asks for the call.
 *   tool_auto     — the same tool without strict validation.
 *   text          — JSON in prose, parsed by parseJsonObject (last resort).
 */
export type StructuredMode = "output_config" | "tool_strict" | "tool_auto" | "text";
export const STRUCTURED_MODES: readonly StructuredMode[] = ["output_config", "tool_strict", "tool_auto", "text"];

const TOOL_CALL_INSTRUCTION = "Answer by calling the tool provided, with the complete result as its input. Do not answer in prose.";

/** Structured outputs and strict tools require `additionalProperties: false`
 *  on every object; the reviewer schemas are authored without it. Pure. */
export function strictSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(strictSchema);
  if (!schema || typeof schema !== "object") return schema;
  const src = schema as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) out[k] = strictSchema(v);
  const isObject = src.type === "object" || (Array.isArray(src.type) && src.type.includes("object")) || typeof src.properties === "object";
  if (isObject && out.additionalProperties === undefined) out.additionalProperties = false;
  return out;
}

/** The request body for one Anthropic call in the given structured mode. Pure. */
export function anthropicBody(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  effort: Effort | null;
  jsonSchema?: JsonSchemaSpec | null;
  mode: StructuredMode;
}): Record<string, unknown> {
  const structured = !!opts.jsonSchema && opts.mode !== "text";
  const askForTool = structured && opts.mode !== "output_config";
  const body: Record<string, unknown> = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    // PROMPT CACHE: one static block, cache_control on it. Never interpolate
    // per-document text into this block.
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: askForTool ? `${opts.user}\n\n${TOOL_CALL_INSTRUCTION}` : opts.user }],
  };
  const outputConfig: Record<string, unknown> = {};
  if (opts.effort) outputConfig.effort = opts.effort;
  if (structured && opts.mode === "output_config") {
    outputConfig.format = { type: "json_schema", schema: strictSchema(opts.jsonSchema!.schema) };
  }
  if (Object.keys(outputConfig).length) body.output_config = outputConfig;
  if (askForTool) {
    const strict = opts.mode === "tool_strict";
    body.tools = [{
      name: opts.jsonSchema!.name,
      description: opts.jsonSchema!.description,
      input_schema: strict ? strictSchema(opts.jsonSchema!.schema) : opts.jsonSchema!.schema,
      ...(strict ? { strict: true } : {}),
    }];
    body.tool_choice = { type: "auto" };
  }
  return body;
}

/** Every text block is read, never content[0]; a tool_use input wins. Pure. */
export function readAnthropicContent(d: unknown): { text: string; viaTool: boolean; blockTypes: string[]; stopReason: string } {
  const msg = (d ?? {}) as { content?: unknown; stop_reason?: unknown };
  const parts: string[] = [];
  const blockTypes: string[] = [];
  let toolJson: string | null = null;
  for (const b of Array.isArray(msg.content) ? msg.content : []) {
    const block = b as { type?: string; text?: string; name?: string; input?: unknown };
    blockTypes.push(String(block?.type ?? "unknown"));
    if (block?.type === "text" && typeof block.text === "string") parts.push(block.text);
    if (block?.type === "tool_use" && block.input && typeof block.input === "object") {
      toolJson = JSON.stringify(block.input);
    }
  }
  return { text: toolJson ?? parts.join(""), viaTool: toolJson !== null, blockTypes, stopReason: String(msg.stop_reason ?? "?") };
}

/** A 400 that names the structured-answer shape (not the model, not the effort). */
export function isStructuredShapeRejected(status: number, body: string): boolean {
  if (status !== 400 || /effort/i.test(body)) return false;
  return /output_config\.format|output_format|json_schema|schema|strict|tool_choice|tools?|input_schema|response_format|text\.format/i.test(body);
}

async function anthropicOnce(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  effort: Effort | null;
  label: string;
  jsonSchema?: JsonSchemaSpec | null;
  mode: StructuredMode;
  /** Per-call override of REVIEW_CALL_TIMEOUT_MS (doc 263 W-LAW chunking). */
  timeoutMs?: number;
}): Promise<{ ok: true; text: string; viaTool: boolean; usage: Record<string, unknown>; elapsedMs: number } | { ok: false; status: number; body: string }> {
  const started = Date.now();
  const body = anthropicBody(opts);
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY(),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? REVIEW_CALL_TIMEOUT_MS),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: t.slice(0, 400) };
  }
  const d = await res.json();
  const read = readAnthropicContent(d);
  if (!read.text.trim()) {
    return {
      ok: false,
      status: 200,
      body: `no_text_block (blocks: ${read.blockTypes.join(",") || "none"}; stop_reason: ${read.stopReason})`,
    };
  }
  return { ok: true, text: read.text, viaTool: read.viaTool, usage: (d as { usage?: Record<string, unknown> })?.usage ?? {}, elapsedMs: Date.now() - started };
}

/** A model that will not take the structured-output shape must still be able
 *  to answer: the call is retried once as plain JSON-in-text. */
function isStructuredOutputUnsupported(status: number, body: string): boolean {
  return status === 400 && /tool|tool_choice|input_schema|json_schema|response_format|text\.format/i.test(body);
}

/** Failed calls are metered too: elapsed time and reason, same table. */
function meterFailure(opts: {
  label: string; product?: string; sourceRowId?: string; model: string | null;
  elapsedMs: number; error: string;
}) {
  recordApiUsage({
    function_name: opts.label,
    product: opts.product ?? null,
    model: opts.model,
    input_tokens: null,
    output_tokens: null,
    duration_ms: opts.elapsedMs,
    source_row_id: opts.sourceRowId ?? null,
    error: opts.error.slice(0, 1000),
  });
}

export async function callClaude(opts: {
  system: string;
  user: string;
  effort: Effort;
  maxTokens?: number;
  label: string;
  product?: string;
  sourceRowId?: string;
  /** When set, the answer is returned as a schema-validated tool call. */
  jsonSchema?: JsonSchemaSpec | null;
  /** Per-call override of REVIEW_CALL_TIMEOUT_MS (doc 263 W-LAW chunking). */
  timeoutMs?: number;
}): Promise<ModelCallResult> {
  if (!ANTHROPIC_KEY()) throw new Error("ANTHROPIC_API_KEY not set");
  // Long CPPA Risk/Cyber reviews were stopping at exactly 16,000 output tokens
  // and arriving as truncated (unparseable) JSON.
  const maxTokens = opts.maxTokens ?? 32_000;
  const callStarted = Date.now();
  let note: string | null = null;
  let effort: Effort | null = opts.effort;
  const schema: JsonSchemaSpec | null = opts.jsonSchema ?? null;
  let lastErr = "";
  let lastModel: string | null = null;

  for (let i = 0; i < CLAUDE_REVIEW_MODELS.length; i++) {
    const model = CLAUDE_REVIEW_MODELS[i];
    lastModel = model;
    const modes: readonly StructuredMode[] = schema ? STRUCTURED_MODES : ["text"];
    let modeIx = 0;
    let emptyRetries = 0;
    for (let attempt = 0; attempt < 8 && modeIx < modes.length; attempt++) {
      const mode = modes[modeIx];
      const r = await anthropicOnce({ model, system: opts.system, user: opts.user, maxTokens, effort, label: opts.label, jsonSchema: schema, mode, timeoutMs: opts.timeoutMs });
      if (r.ok) {
        const u = r.usage as Record<string, number | undefined>;
        const served: StructuredMode = schema ? (mode === "output_config" ? mode : (r.viaTool ? mode : "text")) : "text";
        if (schema && served !== "output_config") {
          note = `${note ? note + "; " : ""}structured answer served as ${served}`;
        }
        const result: ModelCallResult = {
          text: r.text,
          model,
          effort,
          elapsedMs: r.elapsedMs,
          inputTokens: u.input_tokens ?? null,
          outputTokens: u.output_tokens ?? null,
          cacheReadTokens: u.cache_read_input_tokens ?? null,
          cacheCreationTokens: u.cache_creation_input_tokens ?? null,
          fellBack: i > 0,
          note: i > 0 ? `${note ? note + "; " : ""}model fell back to ${model}` : note,
          structured: served,
        };
        console.log(`[${opts.label}] claude model=${model} effort=${effort ?? "default"} mode=${served} elapsed=${r.elapsedMs}ms in=${result.inputTokens ?? "?"} out=${result.outputTokens ?? "?"}`);
        recordApiUsage({
          function_name: opts.label,
          product: opts.product ?? null,
          model,
          input_tokens: result.inputTokens,
          output_tokens: result.outputTokens,
          cache_read_tokens: result.cacheReadTokens,
          cache_creation_tokens: result.cacheCreationTokens,
          duration_ms: r.elapsedMs,
          source_row_id: opts.sourceRowId ?? null,
        });
        return result;
      }
      lastErr = `Anthropic ${r.status}: ${r.body}`;
      if (schema && mode !== "text" && isStructuredShapeRejected(r.status, r.body)) {
        console.warn(`[${opts.label}] ${model} rejected structured mode ${mode} (${r.body.slice(0, 160)}) — trying ${modes[modeIx + 1]}`);
        modeIx += 1;
        continue; // same model, next answer shape
      }
      if (effort && isEffortUnsupported(r.status, r.body)) {
        console.warn(`[${opts.label}] effort "${effort}" rejected by ${model} — retrying without output_config.effort`);
        note = `effort level not accepted by ${model}; ran at provider default`;
        effort = null;
        continue; // same model, same mode, no effort
      }
      if (r.status === 200 && r.body.startsWith("no_text_block") && emptyRetries < 1) {
        // A thinking-only turn: ask once more in the same shape before moving on.
        emptyRetries += 1;
        console.warn(`[${opts.label}] ${model} answered with no text or tool block — retrying once`);
        continue;
      }
      if (r.status === 200 && r.body.startsWith("no_text_block") && schema && mode !== "text") {
        modeIx += 1;
        emptyRetries = 0;
        continue;
      }
      break; // move to next model candidate
    }
    if (!isModelUnavailableFromMessage(lastErr)) break;
    console.warn(`[${opts.label}] claude model ${model} unavailable — trying next candidate`);
  }
  const failure = lastErr || "Anthropic call failed";
  meterFailure({
    label: opts.label, product: opts.product, sourceRowId: opts.sourceRowId,
    model: lastModel, elapsedMs: Date.now() - callStarted, error: failure,
  });
  throw new Error(failure);
}

function isModelUnavailableFromMessage(msg: string): boolean {
  const m = /Anthropic (\d+): ([\s\S]*)/.exec(msg) ?? /OpenAI (\d+): ([\s\S]*)/.exec(msg);
  if (!m) return false;
  return isModelUnavailable(Number(m[1]), m[2]);
}

// ── OpenAI ──────────────────────────────────────────────────────────────────

/**
 * Responses API, streamed. Reasoning models routinely run for minutes; a
 * buffered call holds one silent connection open and dies on a platform
 * timeout, so the deltas are accumulated from the SSE stream instead.
 */
async function openaiResponsesOnce(opts: {
  model: string;
  system: string;
  user: string;
  effort: Effort;
  label: string;
  jsonSchema?: JsonSchemaSpec | null;
  /** Per-call override of REVIEW_CALL_TIMEOUT_MS (doc 263 W-LAW chunking). */
  timeoutMs?: number;
}): Promise<{ ok: true; text: string; usage: Record<string, unknown>; elapsedMs: number } | { ok: false; status: number; body: string }> {
  const started = Date.now();
  const payload: Record<string, unknown> = {
    model: opts.model,
    // Static instructions first so the automatic prefix cache can hit.
    instructions: opts.system,
    input: opts.user,
    stream: true,
    reasoning: { effort: opts.effort },
  };
  // STRUCTURED OUTPUT: the provider validates the object, so an answer that is
  // not valid JSON cannot reach the parser.
  if (opts.jsonSchema) {
    payload.text = {
      format: {
        type: "json_schema",
        name: opts.jsonSchema.name,
        schema: opts.jsonSchema.schema,
        strict: false,
      },
    };
  }
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(opts.timeoutMs ?? REVIEW_CALL_TIMEOUT_MS),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: t.slice(0, 400) };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let usage: Record<string, unknown> = {};
  let streamError: string | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let evt: Record<string, unknown>;
      try { evt = JSON.parse(payload); } catch { continue; }
      const type = String(evt.type ?? "");
      if (type === "response.output_text.delta" && typeof evt.delta === "string") {
        text += evt.delta;
      } else if (type === "response.completed") {
        const r = (evt.response ?? {}) as Record<string, unknown>;
        usage = (r.usage ?? {}) as Record<string, unknown>;
        if (!text && typeof r.output_text === "string") text = r.output_text;
      } else if (type === "response.failed" || type === "error") {
        const r = (evt.response ?? evt) as Record<string, unknown>;
        const err = (r.error ?? {}) as Record<string, unknown>;
        streamError = String(err.message ?? JSON.stringify(err).slice(0, 300));
      }
    }
  }
  if (streamError) return { ok: false, status: 500, body: streamError };
  if (!text.trim()) return { ok: false, status: 200, body: "no_output_text" };
  return { ok: true, text, usage, elapsedMs: Date.now() - started };
}

async function openaiChatOnce(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  /** Per-call override of REVIEW_CALL_TIMEOUT_MS (doc 263 W-LAW chunking). */
  timeoutMs?: number;
}): Promise<{ ok: true; text: string; usage: Record<string, unknown>; elapsedMs: number } | { ok: false; status: number; body: string }> {
  const started = Date.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? REVIEW_CALL_TIMEOUT_MS),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: t.slice(0, 400) };
  }
  const d = await res.json();
  const text = d?.choices?.[0]?.message?.content ?? "";
  if (!String(text).trim()) return { ok: false, status: 200, body: "no_output_text" };
  return { ok: true, text, usage: d?.usage ?? {}, elapsedMs: Date.now() - started };
}

export async function callOpenAI(opts: {
  system: string;
  user: string;
  effort: Effort;
  maxTokens?: number;
  label: string;
  product?: string;
  sourceRowId?: string;
  /** When set, the answer is returned as a schema-validated JSON response. */
  jsonSchema?: JsonSchemaSpec | null;
  /** Per-call override of REVIEW_CALL_TIMEOUT_MS (doc 263 W-LAW chunking). */
  timeoutMs?: number;
}): Promise<ModelCallResult> {
  if (!OPENAI_KEY()) throw new Error("OPENAI_API_KEY not set");
  const callStarted = Date.now();
  let lastErr = "";
  let lastModel: string | null = null;
  let note: string | null = null;
  let schema: JsonSchemaSpec | null = opts.jsonSchema ?? null;

  const finish = (
    model: string,
    effort: Effort | null,
    r: { text: string; usage: Record<string, unknown>; elapsedMs: number },
    fellBack: boolean,
  ): ModelCallResult => {
    const u = r.usage as Record<string, number | undefined> & {
      input_tokens_details?: { cached_tokens?: number };
      prompt_tokens_details?: { cached_tokens?: number };
    };
    const result: ModelCallResult = {
      text: r.text,
      model,
      effort,
      elapsedMs: r.elapsedMs,
      inputTokens: u.input_tokens ?? u.prompt_tokens ?? null,
      outputTokens: u.output_tokens ?? u.completion_tokens ?? null,
      cacheReadTokens: u.input_tokens_details?.cached_tokens ?? u.prompt_tokens_details?.cached_tokens ?? null,
      cacheCreationTokens: null,
      fellBack,
      note,
    };
    console.log(`[${opts.label}] openai model=${model} effort=${effort ?? "n/a"} elapsed=${r.elapsedMs}ms in=${result.inputTokens ?? "?"} out=${result.outputTokens ?? "?"} cached=${result.cacheReadTokens ?? "?"}`);
    recordApiUsage({
      function_name: opts.label,
      product: opts.product ?? null,
      model,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      cache_read_tokens: result.cacheReadTokens,
      cache_creation_tokens: null,
      duration_ms: r.elapsedMs,
      source_row_id: opts.sourceRowId ?? null,
    });
    return result;
  };

  for (let i = 0; i < OPENAI_REVIEW_MODELS.length; i++) {
    const model = OPENAI_REVIEW_MODELS[i];
    lastModel = model;
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await openaiResponsesOnce({ model, system: opts.system, user: opts.user, effort: opts.effort, label: opts.label, jsonSchema: schema, timeoutMs: opts.timeoutMs });
      if (r.ok) {
        if (i > 0) note = `${note ? note + "; " : ""}model fell back to ${model}`;
        return finish(model, opts.effort, r, i > 0);
      }
      lastErr = `OpenAI ${r.status}: ${r.body}`;
      if (schema && isStructuredOutputUnsupported(r.status, r.body)) {
        console.warn(`[${opts.label}] ${model} rejected the structured-output schema — retrying as JSON text`);
        note = `structured output not accepted by ${model}; answered as JSON text`;
        schema = null;
        continue; // same model, no schema
      }
      break;
    }
    if (!isModelUnavailableFromMessage(lastErr)) break;
    console.warn(`[${opts.label}] openai model ${model} unavailable — trying next candidate`);
  }

  // Last resort: the chat-completions model already proven in this codebase.
  console.warn(`[${opts.label}] falling back to ${OPENAI_CHAT_FALLBACK_MODEL} on chat-completions — ${lastErr}`);
  const r = await openaiChatOnce({
    model: OPENAI_CHAT_FALLBACK_MODEL,
    system: opts.system,
    user: opts.user,
    maxTokens: opts.maxTokens ?? 8_000,
    timeoutMs: opts.timeoutMs,
  });
  if (r.ok) {
    note = `no reasoning model available (${lastErr}); ran ${OPENAI_CHAT_FALLBACK_MODEL} without an effort level`;
    return finish(OPENAI_CHAT_FALLBACK_MODEL, null, r, true);
  }
  const failure = `${lastErr || "OpenAI call failed"} | fallback ${OPENAI_CHAT_FALLBACK_MODEL}: ${r.status} ${r.body}`;
  meterFailure({
    label: opts.label, product: opts.product, sourceRowId: opts.sourceRowId,
    model: lastModel, elapsedMs: Date.now() - callStarted, error: failure,
  });
  throw new Error(failure);
}

// ── JSON extraction ─────────────────────────────────────────────────────────

/** Parse a model answer that should be a single JSON object. Tolerates code
 *  fences and leading prose; returns null when nothing parses. */
export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const candidates = [fenced ? fenced[1] : null, raw.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim()];
  for (const c of candidates) {
    if (c === null) continue;
    const cleaned = c.trim();
    const tries = [cleaned];
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) tries.push(cleaned.slice(start, end + 1));
    for (const t of tries) {
      for (const text of [t, escapeControlCharsInStrings(t)]) {
        try {
          const v = JSON.parse(text);
          if (v && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
        } catch { /* next candidate */ }
      }
    }
  }
  return null;
}

/** A free-text JSON answer often carries raw newlines/tabs inside quoted
 *  strings (verbatim document quotes); JSON.parse rejects them. Escapes the
 *  control characters that sit inside string literals and nothing else. Pure. */
export function escapeControlCharsInStrings(text: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (const ch of text) {
    if (inString) {
      if (escaped) { out += ch; escaped = false; continue; }
      if (ch === "\\") { out += ch; escaped = true; continue; }
      if (ch === "\"") { out += ch; inString = false; continue; }
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
      out += ch;
      continue;
    }
    if (ch === "\"") inString = true;
    out += ch;
  }
  return out;
}
