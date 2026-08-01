// Paraphrase faithfulness check via Claude Sonnet 4.6.
// Compares corpus paraphrase (A = key_compliance_failure) against source (B).

const SONNET_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT = `You are assessing whether a paraphrase of a regulator's enforcement finding is faithful to the source document.

Strict rules:
1. Quote only from the source document (B). Never paraphrase B in your output.
2. Your supporting_quote MUST be a verbatim substring of B (max 300 characters). If you cannot quote evidence from B that supports A, return verdict "drifts_from_source".
3. Judge fidelity, not eloquence. A short, simple paraphrase that captures the main finding is "faithful" even if it omits detail.

Verdicts:
- "faithful": every factual claim in A is supported by B
- "partially_faithful": the main claim is supported but A includes details not present in B, or omits material context from B
- "drifts_from_source": A's main claim is loosely related to B but significantly recharacterises the finding
- "contradicts_source": A asserts something B directly contradicts

Output JSON:
{
  "verdict": "faithful|partially_faithful|drifts_from_source|contradicts_source",
  "supporting_quote": "verbatim substring of B, max 300 chars",
  "concerns": "string or null — only populate when verdict is not 'faithful'"
}

Respond with the JSON object only. No prose before or after.`;

export type ParaphraseResult = {
  verdict: "faithful" | "partially_faithful" | "drifts_from_source" | "contradicts_source" | "parse_error";
  supporting_quote: string | null;
  concerns: string | null;
  confidence: "high" | "medium" | "low" | "failed";
  downgrade_reason?: string;
  parse_error?: string;
  usage: { input_tokens: number; output_tokens: number };
};

function substringMatch(doc: string, q: string): boolean {
  return !!q && doc.toLowerCase().includes(q.toLowerCase().trim());
}

// Item 332 FIX 2 — models sometimes preface their JSON with prose
// ("Looking at the source document, ..."). Extract the first well-formed
// top-level JSON object by brace matching (string- and escape-aware) rather
// than assuming the whole response is JSON.
export function extractFirstJsonObject(raw: string): string | null {
  if (!raw) return null;
  const text = raw.replace(/```(?:json)?/gi, "").trim();
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const candidate = text.slice(start, i + 1);
        try {
          JSON.parse(candidate);
          return candidate;
        } catch {
          start = -1;
        }
      }
      if (depth < 0) depth = 0;
    }
  }
  return null;
}

async function callAnthropic(apiKey: string, body: Record<string, unknown>) {
  let attempt = 0;
  const backoffs = [5_000, 20_000, 60_000];
  while (true) {
    attempt++;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60_000);
    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const text = await res.text();
      if (res.status === 429 && attempt <= 3) {
        await new Promise((r) => setTimeout(r, backoffs[attempt - 1] ?? 60_000));
        continue;
      }
      if (res.status >= 500 && attempt <= 2) {
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }
      return { res, text };
    } catch (e) {
      clearTimeout(t);
      if (attempt <= 2) {
        await new Promise((r) => setTimeout(r, 10_000));
        continue;
      }
      throw e;
    }
  }
}

const VERDICT_LADDER = [
  "faithful",
  "partially_faithful",
  "drifts_from_source",
  "contradicts_source",
] as const;

function downgrade(v: string): typeof VERDICT_LADDER[number] {
  const i = VERDICT_LADDER.indexOf(v as any);
  if (i < 0) return "drifts_from_source";
  return VERDICT_LADDER[Math.min(i + 1, VERDICT_LADDER.length - 1)];
}

function verdictToConfidence(v: string): "high" | "medium" | "low" | "failed" {
  switch (v) {
    case "faithful":
      return "high";
    case "partially_faithful":
      return "medium";
    case "drifts_from_source":
      return "low";
    default:
      return "failed";
  }
}

export async function paraphraseFaithfulness(args: {
  apiKey: string;
  paraphraseA: string;
  sourceB: string;
}): Promise<ParaphraseResult> {
  const { apiKey, paraphraseA, sourceB } = args;
  if (!paraphraseA || paraphraseA.trim().length < 10) {
    // Nothing to check
    return {
      verdict: "faithful",
      supporting_quote: null,
      concerns: "key_compliance_failure missing — paraphrase check skipped",
      confidence: "medium",
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  }
  const truncated = sourceB.slice(0, 60_000);
  const userPrompt = `A (corpus paraphrase being assessed):
${paraphraseA}

B (source document):
${truncated}`;

  const { res, text } = await callAnthropic(apiKey, {
    model: SONNET_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  let usage = { input_tokens: 0, output_tokens: 0 };
  if (!res.ok) {
    return {
      verdict: "parse_error",
      supporting_quote: null,
      concerns: null,
      confidence: "failed",
      parse_error: `http_${res.status}: ${text.slice(0, 200)}`,
      usage,
    };
  }
  let parsed: any;
  try {
    parsed = JSON.parse(text);
    usage = {
      input_tokens: parsed?.usage?.input_tokens ?? 0,
      output_tokens: parsed?.usage?.output_tokens ?? 0,
    };
    const content = parsed?.content?.[0]?.text ?? "";
    const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return {
      verdict: "parse_error",
      supporting_quote: null,
      concerns: null,
      confidence: "failed",
      parse_error: `json_parse: ${(e as Error).message}`,
      usage,
    };
  }

  let verdict = typeof parsed.verdict === "string" ? parsed.verdict : "drifts_from_source";
  if (!VERDICT_LADDER.includes(verdict)) verdict = "drifts_from_source";
  const supporting_quote: string | null =
    typeof parsed.supporting_quote === "string" ? parsed.supporting_quote : null;
  const concerns: string | null = typeof parsed.concerns === "string" ? parsed.concerns : null;

  let downgrade_reason: string | undefined;
  if (verdict !== "drifts_from_source" && verdict !== "contradicts_source") {
    if (!supporting_quote || !substringMatch(truncated, supporting_quote)) {
      const newV = downgrade(verdict);
      downgrade_reason = `supporting_quote_not_substring_of_source (was ${verdict})`;
      verdict = newV;
    }
  }

  return {
    verdict: verdict as ParaphraseResult["verdict"],
    supporting_quote,
    concerns,
    confidence: verdictToConfidence(verdict),
    downgrade_reason,
    usage,
  };
}

export const SONNET_MODEL_ID = SONNET_MODEL;
