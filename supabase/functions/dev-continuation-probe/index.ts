// Ephemeral probe for the assistant+user-continue continuation path in
// _shared/anthropic-call.ts. Deliberately sets max_tokens=200 so first call
// truncates; asserts stitched result is non-empty, continuation stop is not
// max_tokens (usually 'end_turn'), and overlap guard telemetry ran if any.
// Delete after r1b2.3 continuation-fix verification.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { callAnthropicWithContinuation } from "../_shared/anthropic-call.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const res = await callAnthropicWithContinuation({
      model: "claude-sonnet-4-6",
      system: "You are a helpful writer. Answer in continuous prose, no headings, no lists.",
      user: "Write exactly 220 words of continuous prose about the water cycle. No lists, no headings.",
      maxTokens: 200,
      label: "cont-probe2",
    });
    return new Response(JSON.stringify({
      ok: true,
      stopReason: res.stopReason,
      continued: res.continued,
      outputTokens: res.outputTokens,
      chars: res.text.length,
      head: res.text.slice(0, 220),
      tail: res.text.slice(-220),
    }, null, 2), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
