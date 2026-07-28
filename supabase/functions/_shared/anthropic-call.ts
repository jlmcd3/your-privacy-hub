// Shared Anthropic Messages API helper with:
//   1. Continuation-on-truncation: on stop_reason=max_tokens, send the truncated
//      text back as an assistant-prefill turn and continue in place; stitch and
//      return the combined text. A second truncation after continuation is
//      surfaced as { stopReason: "max_tokens" } for the caller to handle.
//   2. Self-reporting 330s abort: default timeout is 330_000 ms — safely below
//      the ~400s isolate wall-clock ceiling — so the generator can throw and
//      report its own death instead of the isolate being killed silently.
//   3. Uniform telemetry: single log line per call with elapsed + output_tokens
//      + stop_reason + chars, so latency distributions are extractable from
//      edge-function logs.
//
// This is the single call site all product generators MUST use for their
// long-output Claude calls. Do NOT hand-roll fetch() to the Messages API in
// product generators.
//
// Introduced as the DPIA/Risk generation-latency courier (2026-07-12) after
// the 60% (6/10) dpia generator wall-clock death rate was traced to output-
// length variance, not the R1 prompt rules.

export const ANTHROPIC_ABORT_MS = 330_000;

export class AnthropicTimeoutError extends Error {
  code = "generation_timeout_330s";
  elapsedMs: number;
  constructor(elapsedMs: number, label: string) {
    super(`generation_timeout_330s: ${label} aborted after ${elapsedMs}ms (limit ${ANTHROPIC_ABORT_MS}ms)`);
    this.name = "AnthropicTimeoutError";
    this.elapsedMs = elapsedMs;
  }
}

import { recordApiUsage } from "./api-usage.ts";

export interface AnthropicCallOpts {
  model: string;
  system: unknown;
  user: string;
  maxTokens: number;
  timeoutMs?: number;
  label: string;
  // RC-A A7 spend metering — optional; when provided we insert an api_usage
  // row per API call (fire-and-forget). `label` is used as function_name if
  // callerName is absent.
  callerName?: string;
  product?: string;
  sourceRowId?: string;
  // T-M9 (Item 230): OUTER abort signal — every fetch leg (first + all
  // continuation legs) must respect this signal so a caller-owned
  // AbortController can terminate the whole call within a bounded window.
  // Without this, the continuation loop could outlive the caller's timeout
  // (root cause of the T-M8 silent hang).
  abortSignal?: AbortSignal;
}

export interface AnthropicCallResult {
  text: string;
  stopReason: string | null;
  elapsedMs: number;
  outputTokens: number | null;
  continued: boolean;
  firstOutputTokens?: number | null;
  firstStopReason?: string | null;
  contOutputTokens?: number | null;
  contStopReason?: string | null;
  contElapsedMs?: number | null;
  stitchedChars?: number | null;
  contRetried?: boolean;
  // RC-A A7 — full usage exposed for callers that want it inline.
  inputTokens?: number | null;
  cacheReadTokens?: number | null;
  cacheCreationTokens?: number | null;
}

interface RawCallResult {
  text: string;
  stopReason: string | null;
  outputTokens: number | null;
  inputTokens: number | null;
  cacheReadTokens: number | null;
  cacheCreationTokens: number | null;
  elapsedMs: number;
}

async function doOne(opts: {
  model: string;
  system: unknown;
  messages: Array<{ role: string; content: string }>;
  maxTokens: number;
  timeoutMs: number;
  label: string;
}): Promise<RawCallResult> {
  const startedAt = Date.now();
  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: opts.messages,
      }),
      signal: AbortSignal.timeout(opts.timeoutMs),
    });
  } catch (e) {
    const elapsedMs = Date.now() - startedAt;
    const isAbort = (e instanceof DOMException && e.name === "TimeoutError")
      || (e instanceof Error && /abort|timeout/i.test(e.message));
    if (isAbort) {
      console.error(`[${opts.label}] stage=callAnthropic ABORT elapsed=${elapsedMs}ms limit=${opts.timeoutMs}ms`);
      throw new AnthropicTimeoutError(elapsedMs, opts.label);
    }
    throw e;
  }
  const elapsedMs = Date.now() - startedAt;
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const d = await res.json();
  const text = d.content?.[0]?.text ?? "";
  const stopReason: string | null = d.stop_reason ?? null;
  const u = d.usage ?? {};
  const outputTokens: number | null = typeof u.output_tokens === "number" ? u.output_tokens : null;
  const inputTokens: number | null = typeof u.input_tokens === "number" ? u.input_tokens : null;
  const cacheReadTokens: number | null = typeof u.cache_read_input_tokens === "number" ? u.cache_read_input_tokens : null;
  const cacheCreationTokens: number | null = typeof u.cache_creation_input_tokens === "number" ? u.cache_creation_input_tokens : null;
  return { text, stopReason, outputTokens, inputTokens, cacheReadTokens, cacheCreationTokens, elapsedMs };
}

/**
 * Call Anthropic Messages with automatic continuation on max_tokens truncation.
 * Uses a 330s abort by default so the generator self-reports timeout rather
 * than being killed silently by the isolate wall-clock.
 */
export async function callAnthropicWithContinuation(opts: AnthropicCallOpts): Promise<AnthropicCallResult> {
  const timeoutMs = opts.timeoutMs ?? ANTHROPIC_ABORT_MS;
  const first = await doOne({
    model: opts.model,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    maxTokens: opts.maxTokens,
    timeoutMs,
    label: opts.label,
  });
  console.log(`[${opts.label}] stage=callAnthropic model=${opts.model} elapsed=${first.elapsedMs}ms stop=${first.stopReason} output_tokens=${first.outputTokens ?? "?"} input_tokens=${first.inputTokens ?? "?"} cache_read=${first.cacheReadTokens ?? "?"} cache_creation=${first.cacheCreationTokens ?? "?"} chars=${first.text.length}`);
  // RC-A A7 — fire-and-forget spend metering per API call (first leg).
  recordApiUsage({
    function_name: opts.callerName ?? opts.label,
    product: opts.product ?? null,
    model: opts.model,
    input_tokens: first.inputTokens,
    output_tokens: first.outputTokens,
    cache_read_tokens: first.cacheReadTokens,
    cache_creation_tokens: first.cacheCreationTokens,
    duration_ms: first.elapsedMs,
    source_row_id: opts.sourceRowId ?? null,
  });

  if (first.stopReason !== "max_tokens") {
    return {
      text: first.text,
      stopReason: first.stopReason,
      elapsedMs: first.elapsedMs,
      outputTokens: first.outputTokens,
      continued: false,
      firstOutputTokens: first.outputTokens,
      firstStopReason: first.stopReason,
      stitchedChars: first.text.length,
      inputTokens: first.inputTokens,
      cacheReadTokens: first.cacheReadTokens,
      cacheCreationTokens: first.cacheCreationTokens,
    };
  }

  // Continuation: the Messages API rejects a conversation that ends with an
  // assistant turn (claude-sonnet-4-6 returns 400 on that shape). Send the
  // truncated assistant output followed by an explicit user "continue" turn,
  // then stitch. Overlap guard trims any suffix of first.text that the model
  // re-emitted at the start of the continuation.
  console.warn(`[${opts.label}] stage=callAnthropic truncated at max_tokens — continuing in place (assistant+user-continue continuation)`);
  const CONTINUE_INSTRUCTION = 'Your previous message hit its length limit mid-output. Continue EXACTLY from the character where it stopped. Output ONLY the remaining text — no preamble, no repetition of earlier output, no code fences.';
  const contMessages = [
    { role: "user", content: opts.user },
    { role: "assistant", content: first.text },
    { role: "user", content: CONTINUE_INSTRUCTION },
  ];
  // r1b2.3 fix (b2): degenerate-continuation guard. If the continuation call
  // returns fewer than DEGENERATE_MIN_TOKENS while the first call clearly hit
  // max_tokens, retry ONCE (bounded ~60s) before stitching. This addresses
  // the actual #69 trigger: the originals' continuation lasted ~5s and
  // returned near-empty content → stitched into unparseable text. One retry
  // only — no unbounded loop.
  const DEGENERATE_MIN_TOKENS = 200;
  const DEGENERATE_RETRY_TIMEOUT_MS = 60_000;
  let cont = await doOne({
    model: opts.model,
    system: opts.system,
    messages: contMessages,
    maxTokens: opts.maxTokens,
    timeoutMs,
    label: `${opts.label}#cont`,
  });
  // RC-A A7 — meter the continuation leg (before any degenerate retry).
  recordApiUsage({
    function_name: opts.callerName ?? opts.label,
    product: opts.product ?? null,
    model: opts.model,
    input_tokens: cont.inputTokens,
    output_tokens: cont.outputTokens,
    cache_read_tokens: cont.cacheReadTokens,
    cache_creation_tokens: cont.cacheCreationTokens,
    duration_ms: cont.elapsedMs,
    source_row_id: opts.sourceRowId ?? null,
  });
  let contRetried = false;
  if ((cont.outputTokens ?? 0) < DEGENERATE_MIN_TOKENS) {
    console.warn(`[${opts.label}#cont] DEGENERATE (output_tokens=${cont.outputTokens ?? "?"} < ${DEGENERATE_MIN_TOKENS}) — retrying continuation once`);
    contRetried = true;
    const retry = await doOne({
      model: opts.model,
      system: opts.system,
      messages: contMessages,
      maxTokens: opts.maxTokens,
      timeoutMs: DEGENERATE_RETRY_TIMEOUT_MS,
      label: `${opts.label}#cont2`,
    });
    console.log(`[${opts.label}#cont2] stage=callAnthropic retry elapsed=${retry.elapsedMs}ms stop=${retry.stopReason} output_tokens=${retry.outputTokens ?? "?"} chars=${retry.text.length}`);
    recordApiUsage({
      function_name: opts.callerName ?? opts.label,
      product: opts.product ?? null,
      model: opts.model,
      input_tokens: retry.inputTokens,
      output_tokens: retry.outputTokens,
      cache_read_tokens: retry.cacheReadTokens,
      cache_creation_tokens: retry.cacheCreationTokens,
      duration_ms: retry.elapsedMs,
      source_row_id: opts.sourceRowId ?? null,
    });
    if ((retry.outputTokens ?? 0) > (cont.outputTokens ?? 0)) {
      cont = { ...retry, elapsedMs: cont.elapsedMs + retry.elapsedMs };
    } else {
      cont = { ...cont, elapsedMs: cont.elapsedMs + retry.elapsedMs };
    }
  }

  // Overlap guard: strip leading whitespace, then find the largest suffix of
  // first.text that is a prefix of contText (scan last ~200 chars) and trim.
  let contText = cont.text.replace(/^\s+/, "");
  const tailWindow = first.text.slice(-200);
  let overlapLen = 0;
  const maxCheck = Math.min(tailWindow.length, contText.length);
  for (let n = maxCheck; n > 0; n--) {
    if (first.text.endsWith(contText.slice(0, n))) { overlapLen = n; break; }
  }
  if (overlapLen > 0) {
    console.log(`[${opts.label}#cont] stage=callAnthropic overlap_guard trimmed=${overlapLen} chars`);
    contText = contText.slice(overlapLen);
  }

  // r1b2.3 fix (b): stitch preamble-strip. Drop any non-structural prose that
  // precedes the first structural JSON token at the join. Structural tokens:
  // `"` `{` `}` `[` `]` `,` `:` and digit / `-` / `t` / `f` / `n` (for
  // true/false/null). Only strips when the first non-whitespace char is a
  // letter that ISN'T a legal JSON literal start (i.e. an actual preamble
  // like "Continuing:\n") — mid-string continuations start with the string
  // content itself and are left alone.
  {
    const head = contText.slice(0, 200);
    const firstChar = head.replace(/^\s*/, "").charAt(0);
    const isStructural = /["\{\}\[\],:\-0-9tfn]/.test(firstChar);
    if (!isStructural && firstChar) {
      // Look for the first structural marker within the head window.
      const structIdx = head.search(/["\{\[]/);
      if (structIdx > 0) {
        console.log(`[${opts.label}#cont] stage=callAnthropic preamble_strip trimmed=${structIdx} chars head=${JSON.stringify(head.slice(0, structIdx))}`);
        contText = contText.slice(structIdx);
      }
    }
  }

  const combinedText = first.text + contText;
  const combinedTokens = (first.outputTokens ?? 0) + (cont.outputTokens ?? 0);
  const combinedElapsed = first.elapsedMs + cont.elapsedMs;
  console.log(`[${opts.label}#cont] stage=callAnthropic model=${opts.model} elapsed=${cont.elapsedMs}ms stop=${cont.stopReason} output_tokens=${cont.outputTokens ?? "?"} chars=${contText.length} stitched_chars=${combinedText.length} retried=${contRetried}`);

  return {
    text: combinedText,
    stopReason: cont.stopReason,
    elapsedMs: combinedElapsed,
    outputTokens: combinedTokens || null,
    continued: true,
    firstOutputTokens: first.outputTokens,
    firstStopReason: first.stopReason,
    contOutputTokens: cont.outputTokens,
    contStopReason: cont.stopReason,
    contElapsedMs: cont.elapsedMs,
    stitchedChars: combinedText.length,
    contRetried,
    inputTokens: (first.inputTokens ?? 0) + (cont.inputTokens ?? 0) || null,
    cacheReadTokens: (first.cacheReadTokens ?? 0) + (cont.cacheReadTokens ?? 0) || null,
    cacheCreationTokens: (first.cacheCreationTokens ?? 0) + (cont.cacheCreationTokens ?? 0) || null,
  };
}
