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

export interface AnthropicCallOpts {
  model: string;
  // Accepts a plain string or the SystemBlock[] array used with prompt-core.
  system: unknown;
  user: string;
  maxTokens: number;
  timeoutMs?: number;
  label: string;
}

export interface AnthropicCallResult {
  text: string;
  stopReason: string | null;
  elapsedMs: number;
  outputTokens: number | null;
  continued: boolean;
}

interface RawCallResult {
  text: string;
  stopReason: string | null;
  outputTokens: number | null;
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
  const outputTokens: number | null = typeof d.usage?.output_tokens === "number" ? d.usage.output_tokens : null;
  return { text, stopReason, outputTokens, elapsedMs };
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
  console.log(`[${opts.label}] stage=callAnthropic model=${opts.model} elapsed=${first.elapsedMs}ms stop=${first.stopReason} output_tokens=${first.outputTokens ?? "?"} chars=${first.text.length}`);

  if (first.stopReason !== "max_tokens") {
    return {
      text: first.text,
      stopReason: first.stopReason,
      elapsedMs: first.elapsedMs,
      outputTokens: first.outputTokens,
      continued: false,
    };
  }

  // Continuation: the Messages API rejects a conversation that ends with an
  // assistant turn (claude-sonnet-4-6 returns 400 on that shape). Send the
  // truncated assistant output followed by an explicit user "continue" turn,
  // then stitch. Overlap guard trims any suffix of first.text that the model
  // re-emitted at the start of the continuation.
  console.warn(`[${opts.label}] stage=callAnthropic truncated at max_tokens — continuing in place (assistant+user-continue continuation)`);
  const CONTINUE_INSTRUCTION = 'Your previous message hit its length limit mid-output. Continue EXACTLY from the character where it stopped. Output ONLY the remaining text — no preamble, no repetition of earlier output, no code fences.';
  const cont = await doOne({
    model: opts.model,
    system: opts.system,
    messages: [
      { role: "user", content: opts.user },
      { role: "assistant", content: first.text },
      { role: "user", content: CONTINUE_INSTRUCTION },
    ],
    maxTokens: opts.maxTokens,
    timeoutMs,
    label: `${opts.label}#cont`,
  });

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

  const combinedText = first.text + contText;
  const combinedTokens = (first.outputTokens ?? 0) + (cont.outputTokens ?? 0);
  const combinedElapsed = first.elapsedMs + cont.elapsedMs;
  console.log(`[${opts.label}#cont] stage=callAnthropic model=${opts.model} elapsed=${cont.elapsedMs}ms stop=${cont.stopReason} output_tokens=${cont.outputTokens ?? "?"} chars=${contText.length} stitched_chars=${combinedText.length}`);

  return {
    text: combinedText,
    stopReason: cont.stopReason, // if still max_tokens, caller handles fallback
    elapsedMs: combinedElapsed,
    outputTokens: combinedTokens || null,
    continued: true,
  };
}
