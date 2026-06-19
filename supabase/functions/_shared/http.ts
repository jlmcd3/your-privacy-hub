export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Standard Anthropic call with an explicit per-call timeout via AbortSignal.
// Returns the raw Response when stream:true (caller reads the stream), else the text.
export async function callClaude(opts: {
  system: string;
  user: string;
  model: string;
  maxTokens: number;
  timeoutMs: number;
  stream?: boolean;
}): Promise<Response | string> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY not configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      ...(opts.stream ? { stream: true } : {}),
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    }),
    signal: AbortSignal.timeout(opts.timeoutMs),
  });
  if (opts.stream) return res;
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const d = await res.json();
  return d.content?.[0]?.text ?? "";
}
