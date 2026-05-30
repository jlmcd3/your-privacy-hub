// Reviews a single test-output payload using Anthropic Claude directly.
// Returns scores (1-5) across five dimensions plus a structured critique.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const MODEL = "claude-3-5-sonnet-20241022";

const SYSTEM_PROMPT = `You are a senior privacy-compliance editor reviewing the output of an automated GDPR/CCPA assessment tool.

Score the supplied test output on a 1-5 scale across exactly these five dimensions:
1. accuracy           — Is the legal/regulatory content factually correct? Are statutes, articles, dates, fines correct?
2. usability          — Would an end-user (DPO, privacy lead, small-business owner) understand and act on this?
3. tone_quality       — Is the writing clear, professional, free of filler, and appropriately confident vs hedged?
4. annotations        — Are citations, precedents, and references real, well-targeted, and correctly formatted?
5. mistakes_to_fix    — Is the output free of factual errors, hallucinations, contradictions, or broken structure?
                        (HIGHER score = FEWER mistakes. 5 = none found. 1 = serious errors throughout.)

Return STRICT JSON, no markdown fences, no commentary. Schema:
{
  "scores": { "accuracy": 1-5, "usability": 1-5, "tone_quality": 1-5, "annotations": 1-5, "mistakes_to_fix": 1-5 },
  "summary": "2-3 sentence overall verdict",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "priority_fixes": [
    { "severity": "critical|high|medium|low", "issue": "...", "suggestion": "..." }
  ]
}`;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: require a logged-in user (admin gate is enforced client-side; this
  // function uses ANTHROPIC credits so don't expose it anonymously).
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResp({ error: "Unauthorized" }, 401);
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) return jsonResp({ error: "Unauthorized" }, 401);

  if (!ANTHROPIC_API_KEY) return jsonResp({ error: "ANTHROPIC_API_KEY not configured" }, 500);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResp({ error: "Invalid JSON" }, 400);
  }

  const { testId, testLabel, output, assertions, log } = body || {};
  if (!testId || !output) {
    return jsonResp({ error: "testId and output are required" }, 400);
  }

  // Trim huge outputs to keep us under context. ~120k chars ≈ 30k tokens.
  const outputStr =
    typeof output === "string" ? output : JSON.stringify(output, null, 2);
  const trimmed = outputStr.length > 120_000 ? outputStr.slice(0, 120_000) + "\n…[truncated]" : outputStr;

  const userMessage = [
    `TEST: ${testLabel || testId} (id=${testId})`,
    "",
    "ASSERTIONS:",
    Array.isArray(assertions) && assertions.length > 0
      ? assertions.map((a: any) => `  ${a.passed ? "PASS" : "FAIL"} — ${a.label}`).join("\n")
      : "  (none)",
    "",
    "EXECUTION LOG (tail):",
    Array.isArray(log) && log.length > 0 ? log.slice(-15).join("\n") : "(none)",
    "",
    "TOOL OUTPUT (JSON):",
    "```json",
    trimmed,
    "```",
    "",
    "Score it now. Return JSON only.",
  ].join("\n");

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch (e) {
    return jsonResp({ error: `Anthropic fetch failed: ${(e as Error).message}` }, 502);
  }

  if (!anthropicRes.ok) {
    const text = await anthropicRes.text();
    return jsonResp(
      { error: `Anthropic ${anthropicRes.status}: ${text.slice(0, 500)}` },
      502,
    );
  }

  const data = await anthropicRes.json();
  const text = data?.content?.[0]?.text || "";

  // Strip accidental markdown fences if Claude added them.
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
  }

  let review: any;
  try {
    review = JSON.parse(cleaned);
  } catch (e) {
    return jsonResp(
      { error: "Claude returned non-JSON", raw: text.slice(0, 1000) },
      500,
    );
  }

  return jsonResp({ ok: true, testId, model: MODEL, review });
});
