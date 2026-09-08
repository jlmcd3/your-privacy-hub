// DOC 224 §3 — THE TWO LEGS' MODEL CALLERS. Mirrors the grading tool's own
// code and keys (run-quality-batch / grade-single-assessment, the
// /admin/all-products-test cross-review the CEO named as the pattern):
//
//   Claude  — POST https://api.anthropic.com/v1/messages, `x-api-key` =
//             ANTHROPIC_API_KEY, `anthropic-version: 2023-06-01`, structured
//             output via `output_config.format.json_schema`, NO temperature /
//             top_p (D7 / B4-7 drift rules); the reply's text blocks are
//             WALKED (a thinking-first model may emit a `thinking` block
//             before `text` — the item-373 lesson), never `content[0]`.
//   GPT-4o  — POST https://api.openai.com/v1/chat/completions, bearer
//             OPENAI_API_KEY, `response_format` = strict json_schema, a
//             `finish_reason === "length"` truncation logged loudly
//             (GRADER-SYM-1), 120 s timeout.
//
// Copied, not imported: an edge function may not import a sibling function
// directory (deploy hygiene), and `_shared/anthropic-call.ts` is the long-
// output generator helper (continuation, 330 s abort) — the wrong shape for
// a bounded structured-output leg. Both callers return the raw text only;
// verification of what the model said is code (`_shared/corpus/
// hook-selection.ts`, `_local/merge.ts`), never trust.

export const PRIMARY_MODEL = "claude-sonnet-5";
/** DOC 224 §3 — the second leg is cross-vendor (doc 212 §0's own argument:
 *  two Claude calls share misreadings). Both ids are part of every decision
 *  key, so changing either is a version bump, never a silent re-read. */
export const SECOND_MODEL = "gpt-4o";

export interface ModelJsonCall {
  readonly model: string;
  readonly system: string;
  readonly user: string;
  readonly schema: Record<string, unknown>;
  /** Name for OpenAI's json_schema wrapper; ignored by Claude. */
  readonly schemaName?: string;
  readonly maxTokens?: number;
  readonly timeoutMs?: number;
}

export interface ModelJsonResult {
  readonly text: string;
  readonly model: string;
  readonly input_tokens: number | null;
  readonly output_tokens: number | null;
  readonly elapsed_ms: number;
  readonly finish: string | null;
}

const ANTHROPIC_API_KEY = () => Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const OPENAI_API_KEY = () => Deno.env.get("OPENAI_API_KEY") ?? "";

export function isOpenAiModel(model: string): boolean {
  return /^(gpt-|o[0-9])/i.test(model);
}

/** Claude, structured output, NO temperature / top_p, every text block. */
export async function callClaudeJson(call: ModelJsonCall): Promise<ModelJsonResult> {
  const key = ANTHROPIC_API_KEY();
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  const started = Date.now();
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: call.model,
      max_tokens: call.maxTokens ?? 8_000,
      output_config: { format: { type: "json_schema", schema: call.schema } },
      system: call.system,
      messages: [{ role: "user", content: call.user }],
    }),
    signal: AbortSignal.timeout(call.timeoutMs ?? 180_000),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const body = await r.json();
  const blocks: unknown[] = Array.isArray(body?.content) ? body.content : [];
  const parts: string[] = [];
  const types: string[] = [];
  for (const b of blocks) {
    const t = (b as { type?: unknown })?.type;
    types.push(typeof t === "string" ? t : "unknown");
    if (t === "text" && typeof (b as { text?: unknown }).text === "string") parts.push((b as { text: string }).text);
  }
  const text = parts.join("");
  if (text.length === 0) {
    throw new Error(`Anthropic (${call.model}) returned no text block (blocks=[${types.join(",") || "none"}])`);
  }
  const u = body?.usage ?? {};
  return {
    text,
    model: call.model,
    input_tokens: typeof u.input_tokens === "number" ? u.input_tokens : null,
    output_tokens: typeof u.output_tokens === "number" ? u.output_tokens : null,
    elapsed_ms: Date.now() - started,
    finish: typeof body?.stop_reason === "string" ? body.stop_reason : null,
  };
}

/** GPT-4o, strict json_schema response, the grader's endpoint and key. */
export async function callOpenAiJson(call: ModelJsonCall): Promise<ModelJsonResult> {
  const key = OPENAI_API_KEY();
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const started = Date.now();
  const maxTokens = call.maxTokens ?? 8_000;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: call.model,
      max_tokens: maxTokens,
      response_format: {
        type: "json_schema",
        json_schema: { name: call.schemaName ?? "structured_output", schema: call.schema, strict: true },
      },
      messages: [{ role: "system", content: call.system }, { role: "user", content: call.user }],
    }),
    signal: AbortSignal.timeout(call.timeoutMs ?? 120_000),
  });
  if (!r.ok) throw new Error(`${call.model} ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const finish = d?.choices?.[0]?.finish_reason ?? null;
  if (finish === "length") {
    console.warn(`[classify-propositions] ${call.model} response truncated finish_reason=length max_tokens=${maxTokens}`);
  }
  const text = d?.choices?.[0]?.message?.content ?? "";
  if (typeof text !== "string" || text.length === 0) {
    throw new Error(`${call.model} returned no content (finish=${finish})`);
  }
  const u = d?.usage ?? {};
  return {
    text,
    model: call.model,
    input_tokens: typeof u.prompt_tokens === "number" ? u.prompt_tokens : null,
    output_tokens: typeof u.completion_tokens === "number" ? u.completion_tokens : null,
    elapsed_ms: Date.now() - started,
    finish,
  };
}

/** Dispatch by vendor. */
export function callModelJson(call: ModelJsonCall): Promise<ModelJsonResult> {
  return isOpenAiModel(call.model) ? callOpenAiJson(call) : callClaudeJson(call);
}
