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

/** Self-abort window per call — inside the isolate wall clock. */
export const REVIEW_CALL_TIMEOUT_MS = 300_000;

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
}

function isModelUnavailable(status: number, body: string): boolean {
  if (status === 404) return true;
  return status === 400 && /model|not_found|does not exist|unsupported/i.test(body);
}

function isEffortUnsupported(status: number, body: string): boolean {
  return status === 400 && /effort|output_config|reasoning/i.test(body);
}

// ── Anthropic ───────────────────────────────────────────────────────────────

async function anthropicOnce(opts: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  effort: Effort | null;
  label: string;
}): Promise<{ ok: true; text: string; usage: Record<string, unknown>; elapsedMs: number } | { ok: false; status: number; body: string }> {
  const started = Date.now();
  const body: Record<string, unknown> = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    // PROMPT CACHE: one static block, cache_control on it. Never interpolate
    // per-document text into this block.
    system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: opts.user }],
  };
  if (opts.effort) body.output_config = { effort: opts.effort };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY(),
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REVIEW_CALL_TIMEOUT_MS),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: t.slice(0, 400) };
  }
  const d = await res.json();
  const parts: string[] = [];
  const blockTypes: string[] = [];
  for (const b of Array.isArray(d?.content) ? d.content : []) {
    blockTypes.push(String((b as { type?: string })?.type ?? "unknown"));
    if ((b as { type?: string })?.type === "text" && typeof (b as { text?: string }).text === "string") {
      parts.push((b as { text: string }).text);
    }
  }
  const text = parts.join("");
  if (!text.trim()) {
    return {
      ok: false,
      status: 200,
      body: `no_text_block (blocks: ${blockTypes.join(",") || "none"}; stop_reason: ${d?.stop_reason ?? "?"})`,
    };
  }
  return { ok: true, text, usage: d?.usage ?? {}, elapsedMs: Date.now() - started };
}

export async function callClaude(opts: {
  system: string;
  user: string;
  effort: Effort;
  maxTokens?: number;
  label: string;
  product?: string;
  sourceRowId?: string;
}): Promise<ModelCallResult> {
  if (!ANTHROPIC_KEY()) throw new Error("ANTHROPIC_API_KEY not set");
  const maxTokens = opts.maxTokens ?? 16_000;
  let note: string | null = null;
  let effort: Effort | null = opts.effort;
  let lastErr = "";

  for (let i = 0; i < CLAUDE_REVIEW_MODELS.length; i++) {
    const model = CLAUDE_REVIEW_MODELS[i];
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await anthropicOnce({ model, system: opts.system, user: opts.user, maxTokens, effort, label: opts.label });
      if (r.ok) {
        const u = r.usage as Record<string, number | undefined>;
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
        };
        console.log(`[${opts.label}] claude model=${model} effort=${effort ?? "default"} elapsed=${r.elapsedMs}ms in=${result.inputTokens ?? "?"} out=${result.outputTokens ?? "?"} cache_read=${result.cacheReadTokens ?? "?"} cache_write=${result.cacheCreationTokens ?? "?"}`);
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
      if (effort && isEffortUnsupported(r.status, r.body)) {
        console.warn(`[${opts.label}] effort "${effort}" rejected by ${model} — retrying without output_config`);
        note = `effort level not accepted by ${model}; ran at provider default`;
        effort = null;
        continue; // same model, no effort
      }
      break; // move to next model candidate
    }
    if (!isModelUnavailableFromMessage(lastErr)) break;
    console.warn(`[${opts.label}] claude model ${model} unavailable — trying next candidate`);
  }
  throw new Error(lastErr || "Anthropic call failed");
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
}): Promise<{ ok: true; text: string; usage: Record<string, unknown>; elapsedMs: number } | { ok: false; status: number; body: string }> {
  const started = Date.now();
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      // Static instructions first so the automatic prefix cache can hit.
      instructions: opts.system,
      input: opts.user,
      stream: true,
      reasoning: { effort: opts.effort },
    }),
    signal: AbortSignal.timeout(REVIEW_CALL_TIMEOUT_MS),
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
    signal: AbortSignal.timeout(REVIEW_CALL_TIMEOUT_MS),
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
}): Promise<ModelCallResult> {
  if (!OPENAI_KEY()) throw new Error("OPENAI_API_KEY not set");
  let lastErr = "";
  let note: string | null = null;

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
    const r = await openaiResponsesOnce({ model, system: opts.system, user: opts.user, effort: opts.effort, label: opts.label });
    if (r.ok) {
      if (i > 0) note = `model fell back to ${model}`;
      return finish(model, opts.effort, r, i > 0);
    }
    lastErr = `OpenAI ${r.status}: ${r.body}`;
    if (!isModelUnavailable(r.status, r.body)) break;
    console.warn(`[${opts.label}] openai model ${model} unavailable — trying next candidate`);
  }

  // Last resort: the chat-completions model already proven in this codebase.
  console.warn(`[${opts.label}] falling back to ${OPENAI_CHAT_FALLBACK_MODEL} on chat-completions — ${lastErr}`);
  const r = await openaiChatOnce({
    model: OPENAI_CHAT_FALLBACK_MODEL,
    system: opts.system,
    user: opts.user,
    maxTokens: opts.maxTokens ?? 8_000,
  });
  if (r.ok) {
    note = `no reasoning model available (${lastErr}); ran ${OPENAI_CHAT_FALLBACK_MODEL} without an effort level`;
    return finish(OPENAI_CHAT_FALLBACK_MODEL, null, r, true);
  }
  throw new Error(`${lastErr || "OpenAI call failed"} | fallback ${OPENAI_CHAT_FALLBACK_MODEL}: ${r.status} ${r.body}`);
}

// ── JSON extraction ─────────────────────────────────────────────────────────

/** Parse a model answer that should be a single JSON object. Tolerates code
 *  fences and leading prose; returns null when nothing parses. */
export function parseJsonObject(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
  try {
    const v = JSON.parse(cleaned);
    if (v && typeof v === "object") return v as Record<string, unknown>;
  } catch { /* fall through */ }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const v = JSON.parse(cleaned.slice(start, end + 1));
    return v && typeof v === "object" ? v as Record<string, unknown> : null;
  } catch { return null; }
}
